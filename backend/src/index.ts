import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { SessionManager } from './sessionManager';
import { DeviceController } from './deviceController';
import { MockDeviceController } from './mockDeviceController';
import { ControlAlgorithm } from './controlAlgorithm';
import { logger } from './logger';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath));
  
  // Serve index.html for all routes (SPA support)
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const sessionManager = new SessionManager();
const deviceController = DEBUG_MODE ? new MockDeviceController() : new DeviceController();

// Map to store ControlAlgorithm instances per session
const algorithmInstances = new Map<string, ControlAlgorithm>();

if (DEBUG_MODE) {
  logger.debug('DEBUG MODE ENABLED');
  (deviceController as MockDeviceController).setPositionUpdateCallback((position, speed) => {
    // Broadcast position updates to all connected clients
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'debug_position',
          position,
          speed
        }));
      }
    });
  });
}

// WebSocket connections map
const connections = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  const sessionId = generateSessionId();
  connections.set(sessionId, ws);

  logger.info(`Client connected: ${sessionId}`);

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      await handleMessage(sessionId, data, ws);
    } catch (error) {
      logger.error('Message handling error', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    logger.info(`Client disconnected: ${sessionId}`);
    const session = sessionManager.getSession(sessionId);
    if (session) {
      const algorithm = algorithmInstances.get(sessionId);
      if (algorithm) {
        algorithm.destroy();
        algorithmInstances.delete(sessionId);
      }
      deviceController.stop(session.connectionString);
      sessionManager.deleteSession(sessionId);
    }
    connections.delete(sessionId);
  });

  // Send session ID to client
  ws.send(JSON.stringify({ 
    type: 'connected', 
    sessionId,
    debugMode: DEBUG_MODE 
  }));
});

async function handleMessage(sessionId: string, data: any, ws: WebSocket): Promise<void> {
  switch (data.type) {
    case 'connect_device':
      await handleHandyConnection(
        sessionId, 
        data.deviceKey, 
        data.duration || 'medium',
        data.phaseSpeedConfig,
        data.potEnabled !== undefined ? data.potEnabled : true,
        ws
      );
      break;

    case 'start_session':
      await handleStartSession(sessionId, ws);
      break;

    case 'limit_button':
      await handleLimitButton(sessionId, ws);
      break;

    case 'climax_button':
      await handleClimaxButton(sessionId, data.activate, ws);
      break;

    case 'disconnect':
      await handleDisconnect(sessionId, ws);
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

async function handleHandyConnection(
  sessionId: string, 
  deviceKey: string, 
  duration: string,
  phaseSpeedConfig: any,
  potEnabled: boolean,
  ws: WebSocket
): Promise<void> {
  const connected = await deviceController.connect(deviceKey);
  
  if (connected) {
    const session = sessionManager.createSession(
      sessionId, 
      deviceKey, 
      deviceKey, 
      duration as any,
      phaseSpeedConfig,
      potEnabled
    );
    ws.send(JSON.stringify({ 
      type: 'device_connected', 
      success: true,
      edgeTarget: session.edgeTarget,
      duration: session.duration
    }));
  } else {
    ws.send(JSON.stringify({ 
      type: 'device_connected', 
      success: false, 
      message: 'Failed to connect to the handy, check connection key.' 
    }));
  }
}

async function handleStartSession(sessionId: string, ws: WebSocket): Promise<void> {
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
    return;
  }

  // Reset session state when starting
  session.isClimaxMode = false;
  session.isPunishmentMode = false;
  session.punishmentEndTime = 0;
  
  // Set the session start time when the session actually starts
  session.sessionStartTime = Date.now();

  // Create new algorithm instance for this session
  const algorithm = new ControlAlgorithm(
    session, 
    deviceController as any,
    (phase) => {
      // Send phase change to frontend
      ws.send(JSON.stringify({
        type: 'phase_changed',
        phase,
        limitCount: session.limitCount
      }));
    }
  );
  algorithmInstances.set(sessionId, algorithm);
  
  // Start algorithm in background (don't await - it runs continuously)
  algorithm.start().catch(err => {
    logger.error('Algorithm error', err);
  });
  
  // Send confirmation immediately
  ws.send(JSON.stringify({ 
    type: 'session_started',
    phase: session.phase,
    limitCount: session.limitCount,
    sessionStartTime: session.sessionStartTime,
    isClimaxMode: session.isClimaxMode,
    isPunishmentMode: session.isPunishmentMode,
    punishmentEndTime: session.punishmentEndTime
  }));
}

async function handleLimitButton(sessionId: string, ws: WebSocket): Promise<void> {
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
    return;
  }

  const algorithm = algorithmInstances.get(sessionId);
  if (!algorithm) {
    ws.send(JSON.stringify({ type: 'error', message: 'Algorithm not initialized' }));
    return;
  }

  await algorithm.handleLimitButton();
  
  ws.send(JSON.stringify({ 
    type: 'limit_registered',
    phase: session.phase,
    limitCount: session.limitCount,
    edgeTarget: session.edgeTarget,
    goalpostMoved: session.goalpostMoved,
    speedEscalated: session.speedEscalated
  }));
}

async function handleClimaxButton(sessionId: string, activate: boolean, ws: WebSocket): Promise<void> {
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
    return;
  }

  const algorithm = algorithmInstances.get(sessionId);
  if (!algorithm) {
    ws.send(JSON.stringify({ type: 'error', message: 'Algorithm not initialized' }));
    return;
  }

  await algorithm.handleClimaxMode(activate);
  
  ws.send(JSON.stringify({ 
    type: 'climax_mode',
    active: activate,
    phase: session.phase,
    isPunishmentMode: session.isPunishmentMode,
    punishmentEndTime: session.punishmentEndTime
  }));
}

async function handleDisconnect(sessionId: string, ws: WebSocket): Promise<void> {
  const session = sessionManager.getSession(sessionId);
  if (session) {
    const algorithm = algorithmInstances.get(sessionId);
    if (algorithm) {
      algorithm.destroy();
      algorithmInstances.delete(sessionId);
    }
    await deviceController.stop(session.connectionString);
    sessionManager.deleteSession(sessionId);
  }
  ws.send(JSON.stringify({ type: 'disconnected' }));
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(Number(PORT), HOST, () => {
  logger.info(`Server started on ${HOST}:${PORT}`);
  console.log(`Server listening on ${HOST}:${PORT}`);
});

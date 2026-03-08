import { useEffect, useState, useCallback } from 'react';
import type { SessionState, Message, DurationLevel, PhaseSpeedConfig } from './types';

// Use current hostname for WebSocket connection (works for localhost and network IP)
// In production, use wss:// and same origin (no explicit port needed)
const getWebSocketUrl = () => {
  if (import.meta.env.PROD) {
    // Production: use wss:// and current host (Railway, etc)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  } else {
    // Development: connect to local backend
    return `ws://${window.location.hostname}:3001`;
  }
};
const WS_URL = getWebSocketUrl();
const WS_KEEPALIVE_INTERVAL = 30000; // 30 second keepalive

export function useWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: null,
    deviceConnected: false,
    sessionActive: false,
    phase: 'INITIAL',
    limitCount: 0,
    sessionDuration: 0,
    sessionStartTime: 0,
    isClimaxMode: false,
    duration: 'medium',
    difficulty: 'medium',
    edgeTarget: 0,
    goalpostMoved: false,
    speedEscalated: false,
    isPunishmentMode: false,
    punishmentEndTime: 0
  });
  const [connected, setConnected] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugPosition, setDebugPosition] = useState(0);
  const [debugSpeed, setDebugSpeed] = useState(0);

  useEffect(() => {
    const websocket = new WebSocket(WS_URL);

    websocket.onopen = () => {
      setConnected(true);

      setInterval(() => {
        if(websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({type: 'ping'}));
          console.log('sent ping');
        }
      }, WS_KEEPALIVE_INTERVAL);
    };

    websocket.onmessage = (event) => {
      const message: Message = JSON.parse(event.data);
      handleMessage(message);
    };

    websocket.onclose = () => {
      setConnected(false);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const handleMessage = (message: Message) => {
    switch (message.type) {
      case 'connected':
        setSessionState(prev => ({ ...prev, sessionId: message.sessionId }));
        if (message.debugMode) {
          setDebugMode(true);
        }
        break;

      case 'debug_position':
        setDebugPosition(message.position);
        setDebugSpeed(message.speed);
        break;

      case 'device_connected':
        if (message.success) {
          setSessionState(prev => ({ 
            ...prev, 
            deviceConnected: true,
            edgeTarget: message.edgeTarget || 0,
            duration: message.duration || 'medium'
          }));
        } else {
          alert(message.message || 'Failed to connect to device');
        }
        break;

      case 'session_started':
        setSessionState(prev => ({
          ...prev,
          sessionActive: true,
          phase: message.phase,
          limitCount: message.limitCount,
          sessionStartTime: message.sessionStartTime || Date.now(),
          isClimaxMode: message.isClimaxMode || false,
          isPunishmentMode: message.isPunishmentMode || false,
          punishmentEndTime: message.punishmentEndTime || 0
        }));
        break;

      case 'limit_registered':
        setSessionState(prev => ({
          ...prev,
          phase: message.phase,
          limitCount: message.limitCount,
          edgeTarget: message.edgeTarget || prev.edgeTarget,
          goalpostMoved: message.goalpostMoved || prev.goalpostMoved,
          speedEscalated: message.speedEscalated || prev.speedEscalated
        }));
        break;

      case 'phase_changed':
        setSessionState(prev => ({
          ...prev,
          phase: message.phase,
          limitCount: message.limitCount
        }));
        break;

      case 'climax_mode':
        setSessionState(prev => ({
          ...prev,
          isClimaxMode: message.active,
          phase: message.phase,
          isPunishmentMode: message.isPunishmentMode || false,
          punishmentEndTime: message.punishmentEndTime || 0
        }));
        break;

      case 'pong':
        console.log('pong received');
        break;

      case 'error':
        console.error('Server error:', message.message);
        alert(message.message);
        break;
    }
  };

  const connectDevice = useCallback((
    deviceKey: string, 
    duration: DurationLevel,
    phaseSpeedConfig: PhaseSpeedConfig,
    potEnabled: boolean = true
  ) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'connect_device', 
        deviceKey, 
        duration, 
        phaseSpeedConfig,
        potEnabled
      }));
    }
  }, [ws]);

  const startSession = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'start_session' }));
    }
  }, [ws]);

  const pressLimitButton = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'limit_button' }));
    }
  }, [ws]);

  const toggleClimaxMode = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const activate = !sessionState.isClimaxMode;
      ws.send(JSON.stringify({ type: 'climax_button', activate }));
    }
  }, [ws, sessionState.isClimaxMode]);

  const ping = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, [ws]);

  const disconnect = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'disconnect' }));
    }
    // Reset session state
    setSessionState(prev => ({
      ...prev,
      deviceConnected: false,
      sessionActive: false,
      limitCount: 0,
      sessionDuration: 0,
      sessionStartTime: 0,
      isClimaxMode: false,
      phase: 'INITIAL'
    }));
  }, [ws]);

  return {
    connected,
    sessionState,
    connectDevice,
    startSession,
    pressLimitButton,
    toggleClimaxMode,
    ping,
    disconnect,
    debugMode,
    debugPosition,
    debugSpeed
  };
}

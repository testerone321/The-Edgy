import { useEffect, useState, useCallback } from 'react';
import type { SessionState, Message, DurationLevel, PhaseSpeedConfig, GameMode } from './types';

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
    punishmentEndTime: 0,
    gameMode: 'classic',
    survivalTensionLevel: 0,
    survivalPressureSpike: 0,
    survivalEdgeCount: 0,
    survivalIsPaused: false,
    survivalPauseEndsAt: 0,
  });
  const [connected, setConnected] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugPosition, setDebugPosition] = useState(0);
  const [debugSpeed, setDebugSpeed] = useState(0);

  useEffect(() => {
    const websocket = new WebSocket(WS_URL);

    websocket.onopen = () => {
      setConnected(true);
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
            duration: message.duration || 'medium',
            gameMode: message.gameMode || 'classic',
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

      case 'error':
        console.error('Server error:', message.message);
        alert(message.message);
        break;

      // Survival mode messages
      case 'survival_update':
        setSessionState(prev => ({
          ...prev,
          survivalTensionLevel: message.tensionLevel ?? prev.survivalTensionLevel,
          survivalPressureSpike: message.pressureSpike ?? prev.survivalPressureSpike,
          survivalEdgeCount: message.edgeCount ?? prev.survivalEdgeCount,
          sessionStartTime: message.survivalStartTime || prev.sessionStartTime,
        }));
        break;

      case 'survival_pause_start':
        setSessionState(prev => ({
          ...prev,
          survivalIsPaused: true,
          survivalPauseEndsAt: message.pauseEndsAt || (Date.now() + (message.pauseDuration || 0)),
          survivalEdgeCount: message.edgeCount ?? prev.survivalEdgeCount,
          survivalPressureSpike: message.pressureSpike ?? prev.survivalPressureSpike,
        }));
        break;

      case 'survival_pause_end':
        setSessionState(prev => ({
          ...prev,
          survivalIsPaused: false,
          survivalPauseEndsAt: 0,
          survivalEdgeCount: message.edgeCount ?? prev.survivalEdgeCount,
        }));
        break;

      case 'survival_spike':
        setSessionState(prev => ({
          ...prev,
          survivalPressureSpike: message.pressureSpike ?? prev.survivalPressureSpike,
        }));
        break;
    }
  };

  const connectDevice = useCallback((
    deviceKey: string, 
    duration: DurationLevel,
    phaseSpeedConfig: PhaseSpeedConfig,
    potEnabled: boolean = true,
    gameMode: GameMode = 'classic'
  ) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'connect_device', 
        deviceKey, 
        duration, 
        phaseSpeedConfig,
        potEnabled,
        gameMode,
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
      phase: 'INITIAL',
      survivalIsPaused: false,
      survivalPauseEndsAt: 0,
      survivalEdgeCount: 0,
      survivalPressureSpike: 0,
      survivalTensionLevel: 0,
    }));
  }, [ws]);

  const sendSetTension = useCallback((tension: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'set_tension', tension }));
    }
  }, [ws]);

  return {
    connected,
    sessionState,
    connectDevice,
    startSession,
    pressLimitButton,
    toggleClimaxMode,
    sendSetTension,
    disconnect,
    debugMode,
    debugPosition,
    debugSpeed
  };
}

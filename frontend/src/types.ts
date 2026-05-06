export type DurationLevel = 'short' | 'medium' | 'long' | 'insane';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'insane' | 'custom';
export type GameMode = 'classic' | 'survival';

export interface PhaseSpeedConfig {
  initialMin: number;
  initialMax: number;
  firstLimitMin: number;
  firstLimitMax: number;
  multipleLimitsMin: number;
  multipleLimitsMax: number;
  minStrokePosition: number;
  maxStrokePosition: number;
}

export interface SessionState {
  sessionId: string | null;
  deviceConnected: boolean;
  sessionActive: boolean;
  phase: string;
  limitCount: number;
  sessionDuration: number;
  sessionStartTime: number;
  isClimaxMode: boolean;
  // Gamification features
  duration: DurationLevel;
  difficulty: DifficultyLevel;
  edgeTarget: number;
  goalpostMoved: boolean;
  speedEscalated: boolean;
  // Punishment mode
  isPunishmentMode: boolean;
  punishmentEndTime: number;
  // Game mode
  gameMode: GameMode;
  // Survival mode state
  survivalTensionLevel: number; // 0-100
  survivalPressureSpike: number; // additive speed bonus %
  survivalEdgeCount: number;
  survivalIsPaused: boolean;
  survivalPauseEndsAt: number; // timestamp
}

export interface Message {
  type: string;
  [key: string]: any;
}

export type DurationLevel = 'short' | 'medium' | 'long' | 'insane';

export interface PhaseSpeedConfig {
  initialMin: number;
  initialMax: number;
  firstLimitMin: number;
  firstLimitMax: number;
  multipleLimitsMin: number;
  multipleLimitsMax: number;
}

export interface SessionData {
  sessionId: string;
  deviceKey: string;
  connectionString: string;
  phase: ControlPhase;
  limitCount: number;
  sessionStartTime: number;
  lastLimitTime: number;
  isClimaxMode: boolean;
  isActive: boolean;
  // Gamification features
  duration: DurationLevel;
  phaseSpeedConfig: PhaseSpeedConfig; // Speed configuration from client
  edgeTarget: number;
  goalpostMoved: boolean; // Track if moving goalpost was already triggered
  speedEscalated: boolean; // Track if speed escalation was already triggered
  // Punishment mode
  isPunishmentMode: boolean;
  punishmentEndTime: number; // Timestamp when punishment ends
  potEnabled: boolean; // POT (Punishment On Target) feature enabled
}

export enum ControlPhase {
  INITIAL = 'INITIAL',
  FIRST_LIMIT = 'FIRST_LIMIT',
  MULTIPLE_LIMITS = 'MULTIPLE_LIMITS',
  NEAR_THRESHOLD = 'NEAR_THRESHOLD',
  CLIMAX = 'CLIMAX'
}

export interface StrokeCommand {
  minPosition: number; // 0-100 (lower bound)
  maxPosition: number; // 0-100 (upper bound)
  speed: number; // 0-100
  duration?: number; // milliseconds
}

export interface LimitButtonEvent {
  sessionId: string;
  timestamp: number;
}

export interface ClimaxButtonEvent {
  sessionId: string;
  timestamp: number;
  activate: boolean;
}

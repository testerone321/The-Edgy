import { SessionData, ControlPhase, DurationLevel, PhaseSpeedConfig, GameMode } from './types';
import { logger } from './logger';

export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();

  createSession(
    sessionId: string, 
    deviceKey: string, 
    connectionString: string,
    duration: DurationLevel,
    phaseSpeedConfig: PhaseSpeedConfig,
    potEnabled: boolean = true,
    gameMode: GameMode = 'classic'
  ): SessionData {
    const edgeTarget = this.calculateEdgeTarget(duration);
    
    const session: SessionData = {
      sessionId,
      deviceKey,
      connectionString,
      phase: ControlPhase.INITIAL,
      limitCount: 0,
      sessionStartTime: 0,
      lastLimitTime: 0,
      isClimaxMode: false,
      isActive: true,
      duration,
      phaseSpeedConfig,
      edgeTarget,
      goalpostMoved: false,
      speedEscalated: false,
      isPunishmentMode: false,
      punishmentEndTime: 0,
      potEnabled,
      gameMode,
      survivalTensionLevel: 0,
      survivalPressureSpike: 0,
      survivalEdgeCount: 0,
      survivalStartTime: 0,
    };
    this.sessions.set(sessionId, session);
    logger.info(`Session created: ${sessionId}; Duration: ${duration}; Target: ${edgeTarget} edges; POT: ${potEnabled}`);
    return session;
  }

  private calculateEdgeTarget(duration: DurationLevel): number {
    const ranges: Record<DurationLevel, [number, number]> = {
      short: [10, 12],
      medium: [12, 20],
      long: [20, 30],
      insane: [30, 50]
    };
    
    const [min, max] = ranges[duration];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getSession(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<SessionData>): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info(`Session deleted: ${sessionId}`);
  }

  getAllActiveSessions(): SessionData[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }
}

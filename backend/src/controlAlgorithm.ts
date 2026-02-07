import { SessionData, ControlPhase, StrokeCommand } from './types';
import { DeviceController } from './deviceController';
import { PatternRegistry } from './patterns';
import { logger } from './logger';

export class ControlAlgorithm {

  private static readonly PATTERN_CHANCE_INITIAL = 15;
  private static readonly PATTERN_CHANCE_FIRST_LIMIT = 12;
  private static readonly PATTERN_CHANCE_MULTIPLE_LIMITS = 7;

  // Stroke length (used across all phases)
  private static readonly STROKE_MIN = 30;
  private static readonly STROKE_MAX = 100;

  // INITIAL Phase
  private static readonly INITIAL_HOLD_DURATION_MIN = 4000; // how long to keep same speed/position
  private static readonly INITIAL_HOLD_DURATION_MAX = 8000;

  // FIRST_LIMIT Phase (Limit 1-10)
  private static readonly FIRST_LIMIT_INITIAL_PAUSE_MIN = 15000;
  private static readonly FIRST_LIMIT_INITIAL_PAUSE_MAX = 25000;
  private static readonly FIRST_LIMIT_HOLD_DURATION_MIN = 8000;
  private static readonly FIRST_LIMIT_HOLD_DURATION_MAX = 15000;
  private static readonly FIRST_LIMIT_PAUSE_BETWEEN_CYCLES_MIN = 2000;
  private static readonly FIRST_LIMIT_PAUSE_BETWEEN_CYCLES_MAX = 8000;

  // MULTIPLE_LIMITS Phase (Limit > 10)
  private static readonly MULTIPLE_LIMITS_INITIAL_PAUSE_MIN = 20000;
  private static readonly MULTIPLE_LIMITS_INITIAL_PAUSE_MAX = 35000;
  private static readonly MULTIPLE_LIMITS_HOLD_DURATION_MIN = 6000;
  private static readonly MULTIPLE_LIMITS_HOLD_DURATION_MAX = 10000;
  private static readonly MULTIPLE_LIMITS_PAUSE_BETWEEN_CYCLES_MIN = 5000;
  private static readonly MULTIPLE_LIMITS_PAUSE_BETWEEN_CYCLES_MAX = 12000;

  // NEAR_THRESHOLD Phase
  private static readonly NEAR_THRESHOLD_COOLDOWN_DURATION = 30000;
  private static readonly NEAR_THRESHOLD_TRIGGER_THRESHOLD = 60000; // trigger if limit within 60s

  // Phase Thresholds
  private static readonly LIMIT_THRESHOLD_FIRST_TO_MULTIPLE = 10; // Switch from FIRST_LIMIT to MULTIPLE_LIMITS after this many limits

  // CLIMAX Mode
  private static readonly CLIMAX_SPEED_MIN = 80;
  private static readonly CLIMAX_SPEED_MAX = 100;
  private static readonly CLIMAX_STROKE_MIN = 40;
  private static readonly CLIMAX_STROKE_MAX = 100;
  private static readonly CLIMAX_CHANGE_INTERVAL_MIN = 3000;
  private static readonly CLIMAX_CHANGE_INTERVAL_MAX = 8000;

  // Gamification thresholds
  private static readonly MOVING_GOALPOST_THRESHOLD = 0.9; // 90%
  private static readonly MOVING_GOALPOST_CHANCE = 0.25; // 25%
  private static readonly MOVING_GOALPOST_INCREMENT = 3; // +3 edges
  private static readonly SPEED_ESCALATION_THRESHOLD = 0.8; // 80%
  private static readonly SPEED_ESCALATION_REDUCTION = 0.3; // 70% reduction
  private static readonly PUNISHMENT_DURATION_PER_EDGE = 20000; // 20 seconds per missing edge

  // Desperation Timer
  private static readonly DESPERATION_INTERVAL = 60000; // 1 minute
  private static readonly DESPERATION_SPEED_BONUS = 20; // +20 speed per interval

  private session: SessionData;
  private deviceController: DeviceController;
  private onPhaseChange?: (phase: ControlPhase) => void;
  private currentTimer: NodeJS.Timeout | null = null;
  private shouldStop: boolean = false;
  private isPatternRunning: boolean = false;
  private patternShouldStop: boolean = false; // Separate flag for pattern interruption

  constructor(
    session: SessionData,
    deviceController: DeviceController,
    onPhaseChange?: (phase: ControlPhase) => void
  ) {
    this.session = session;
    this.deviceController = deviceController;
    this.onPhaseChange = onPhaseChange;
    logger.info(`[${session.sessionId}] Edging started`, { duration: session.duration, edgeTarget: session.edgeTarget, potEnabled: session.potEnabled, phaseSpeedConfig: session.phaseSpeedConfig });
  }

  async start(): Promise<void> {
    this.session.phase = ControlPhase.INITIAL;
    this.shouldStop = false;
    await this.runInitialPhase();
  }

  async handleLimitButton(): Promise<void> {
    const now = Date.now();
    const timeSinceLastLimit = this.session.lastLimitTime ? now - this.session.lastLimitTime : Infinity;

    this.session.limitCount++;
    this.session.lastLimitTime = now;
    logger.info(`[${this.session.sessionId}] Edge ${this.session.limitCount}/${this.session.edgeTarget} reached; Time since last limit: ${timeSinceLastLimit / 1000}s`);

    this.checkMovingGoalpost();

    if (!this.session.speedEscalated) {
      const progress = this.session.limitCount / this.session.edgeTarget;
      if (progress >= ControlAlgorithm.SPEED_ESCALATION_THRESHOLD) {
        this.session.speedEscalated = true;
        logger.debug('⚡ SPEED ESCALATION! Hold durations and pauses reduced by 50%');
      }
    }

    await this.stopAndWait();

    if (timeSinceLastLimit < ControlAlgorithm.NEAR_THRESHOLD_TRIGGER_THRESHOLD) {
      this.session.phase = ControlPhase.NEAR_THRESHOLD;
      this.runNearThresholdPhase(); // Run in background
    } else if (this.session.limitCount <= ControlAlgorithm.LIMIT_THRESHOLD_FIRST_TO_MULTIPLE) {
      this.session.phase = ControlPhase.FIRST_LIMIT;
      this.runLimitPhase(); // Run in background
    } else {
      this.session.phase = ControlPhase.MULTIPLE_LIMITS;
      this.runLimitPhase(); // Run in background
    }
  }

  async handleClimaxMode(activate: boolean): Promise<void> {
    if (activate && this.session.potEnabled && this.session.limitCount < this.session.edgeTarget) {
      const missingEdges = this.session.edgeTarget - this.session.limitCount;
      const punishmentDuration = Math.min(missingEdges * ControlAlgorithm.PUNISHMENT_DURATION_PER_EDGE, 120000); // Max 120 seconds
      this.session.isPunishmentMode = true;
      this.session.punishmentEndTime = Date.now() + punishmentDuration;
      logger.debug(`⚠️ PUNISHMENT MODE ACTIVATED: ${missingEdges} edges missing, ${punishmentDuration / 1000}s punishment - STARTING CLIMAX MODE`);

      setTimeout(() => {
        if (this.session.isPunishmentMode) {
          logger.debug('✅ Punishment completed, climax mode can now be stopped');
          this.session.isPunishmentMode = false;
        }
      }, punishmentDuration);
    }

    this.session.isClimaxMode = activate;
    await this.stopAndWait();

    if (activate) {
      logger.info(`[${this.session.sessionId}] Orgasm reached: (${this.session.limitCount}/${this.session.edgeTarget}); POT enabled: ${this.session.potEnabled}`);
      this.session.phase = ControlPhase.CLIMAX;
      this.runClimaxMode(); // Run in background
    } else {
      logger.info(`[${this.session.sessionId}] Orgasm mode deactivated by user`);
      await this.deviceController.stop(this.session.connectionString);
    }
  }

  stop(): void {
    this.shouldStop = true;
    this.patternShouldStop = true; // Also stop any running pattern
    if (this.currentTimer) {
      clearTimeout(this.currentTimer);
      this.currentTimer = null;
    }
  }

  destroy(): void {
    this.stop();
    this.deviceController.stop(this.session.connectionString);
  }

  private async runInitialPhase(): Promise<void> {
    this.shouldStop = false;

    while (!this.shouldStop && this.session.isActive && !this.session.isClimaxMode) {
      const usePattern = Math.random() < (ControlAlgorithm.PATTERN_CHANCE_INITIAL / 100);

      if (usePattern) {
        const interrupted = await this.runPattern();
        if (interrupted || this.shouldStop) break;
      } else {
        await this.stroke(
          this.getSpeedMin(ControlPhase.INITIAL),
          this.getSpeedMax(ControlPhase.INITIAL),
          ControlAlgorithm.INITIAL_HOLD_DURATION_MIN,
          ControlAlgorithm.INITIAL_HOLD_DURATION_MAX
        );
      }

      if (this.shouldStop) break;
    }
  }

  private async runLimitPhase(): Promise<void> {
    this.shouldStop = false;

    const isFirstLimit = this.session.phase === ControlPhase.FIRST_LIMIT;

    const config = isFirstLimit ? {
      initialPauseMin: ControlAlgorithm.FIRST_LIMIT_INITIAL_PAUSE_MIN,
      initialPauseMax: ControlAlgorithm.FIRST_LIMIT_INITIAL_PAUSE_MAX,
      holdDurationMin: ControlAlgorithm.FIRST_LIMIT_HOLD_DURATION_MIN,
      holdDurationMax: ControlAlgorithm.FIRST_LIMIT_HOLD_DURATION_MAX,
      pauseBetweenMin: ControlAlgorithm.FIRST_LIMIT_PAUSE_BETWEEN_CYCLES_MIN,
      pauseBetweenMax: ControlAlgorithm.FIRST_LIMIT_PAUSE_BETWEEN_CYCLES_MAX,
      patternChance: ControlAlgorithm.PATTERN_CHANCE_FIRST_LIMIT
    } : {
      initialPauseMin: ControlAlgorithm.MULTIPLE_LIMITS_INITIAL_PAUSE_MIN,
      initialPauseMax: ControlAlgorithm.MULTIPLE_LIMITS_INITIAL_PAUSE_MAX,
      holdDurationMin: ControlAlgorithm.MULTIPLE_LIMITS_HOLD_DURATION_MIN,
      holdDurationMax: ControlAlgorithm.MULTIPLE_LIMITS_HOLD_DURATION_MAX,
      pauseBetweenMin: ControlAlgorithm.MULTIPLE_LIMITS_PAUSE_BETWEEN_CYCLES_MIN,
      pauseBetweenMax: ControlAlgorithm.MULTIPLE_LIMITS_PAUSE_BETWEEN_CYCLES_MAX,
      patternChance: ControlAlgorithm.PATTERN_CHANCE_MULTIPLE_LIMITS
    };

    // Initial pause after limit
    let pauseMin = config.initialPauseMin;
    let pauseMax = config.initialPauseMax;
    if (this.session.speedEscalated) {
      pauseMin *= ControlAlgorithm.SPEED_ESCALATION_REDUCTION;
      pauseMax *= ControlAlgorithm.SPEED_ESCALATION_REDUCTION;
    }
    const initialPause = this.randomInt(pauseMin, pauseMax);
    logger.debug(`⏸️  Pausing for ${initialPause / 1000}s...`);
    await this.sleep(initialPause);
    if (this.shouldStop) return;

    // Stroke-pause cycles
    while (!this.shouldStop && this.session.isActive && !this.session.isClimaxMode) {
      const usePattern = Math.random() < (config.patternChance / 100);

      if (usePattern) {
        const interrupted = await this.runPattern();
        if (interrupted || this.shouldStop) break;
      } else {
        await this.stroke(
          this.getSpeedMin(this.session.phase),
          this.getSpeedMax(this.session.phase),
          config.holdDurationMin,
          config.holdDurationMax
        );
      }

      if (this.shouldStop) break;

      let pauseMin = config.pauseBetweenMin;
      let pauseMax = config.pauseBetweenMax;
      if (this.session.speedEscalated) {
        pauseMin *= ControlAlgorithm.SPEED_ESCALATION_REDUCTION;
        pauseMax *= ControlAlgorithm.SPEED_ESCALATION_REDUCTION;
      }
      const pauseTime = this.randomInt(pauseMin, pauseMax);
      logger.debug(`⏸️  Pausing for ${pauseTime / 1000}s...`);
      await this.deviceController.stop(this.session.connectionString);
      await this.sleep(pauseTime);
    }
  }

  private async runNearThresholdPhase(): Promise<void> {
    this.shouldStop = false;

    // Cooldown duration with speed escalation
    let cooldownDuration = ControlAlgorithm.NEAR_THRESHOLD_COOLDOWN_DURATION;
    if (this.session.speedEscalated) {
      cooldownDuration *= ControlAlgorithm.SPEED_ESCALATION_REDUCTION;
    }
    logger.debug(`⏸️  Starting ${cooldownDuration / 1000}s cooldown...`);
    await this.sleep(cooldownDuration);

    if (this.shouldStop || !this.session.isActive || this.session.isClimaxMode) return;

    logger.debug('✅ Cooldown complete, resuming...');

    // Resume with appropriate phase
    if (this.session.limitCount <= ControlAlgorithm.LIMIT_THRESHOLD_FIRST_TO_MULTIPLE) {
      this.session.phase = ControlPhase.FIRST_LIMIT;
      this.onPhaseChange?.(ControlPhase.FIRST_LIMIT);
      this.runLimitPhase(); // Run in background
    } else {
      this.session.phase = ControlPhase.MULTIPLE_LIMITS;
      this.onPhaseChange?.(ControlPhase.MULTIPLE_LIMITS);
      this.runLimitPhase(); // Run in background
    }
  }

  private async runClimaxMode(): Promise<void> {
    this.shouldStop = false;

    while (!this.shouldStop && this.session.isClimaxMode && this.session.isActive) {
      // Chaotic maximum intensity
      const strokeLength = this.randomInt(
        ControlAlgorithm.CLIMAX_STROKE_MIN,
        ControlAlgorithm.CLIMAX_STROKE_MAX
      );
      const maxStartPosition = 100 - strokeLength;
      const startPosition = this.randomInt(0, maxStartPosition);

      const command: StrokeCommand = {
        minPosition: startPosition,
        maxPosition: startPosition + strokeLength,
        speed: this.randomInt(ControlAlgorithm.CLIMAX_SPEED_MIN, ControlAlgorithm.CLIMAX_SPEED_MAX)
      };

      logger.debug(`[CLIMAX] Chaos Mode - Range: ${command.minPosition}%-${command.maxPosition}% (${strokeLength}% stroke), Speed: ${command.speed}%`);

      await this.deviceController.stroke(this.session.connectionString, command);

      // Change every 3-5 seconds
      const changeInterval = this.randomInt(
        ControlAlgorithm.CLIMAX_CHANGE_INTERVAL_MIN,
        ControlAlgorithm.CLIMAX_CHANGE_INTERVAL_MAX
      );
      await this.sleep(changeInterval);
    }
  }

  private async waitForPatternToStop(): Promise<void> {
    let waitCount = 0;
    while (this.isPatternRunning && waitCount < 50) {
      await new Promise(resolve => setTimeout(resolve, 20));
      waitCount++;
    }
  }

  private async stopAndWait(): Promise<void> {
    this.stop();
    await this.deviceController.stop(this.session.connectionString);
    await this.waitForPatternToStop();
    await this.deviceController.stop(this.session.connectionString);
  }

  private async stroke(
    speedMin: number,
    speedMax: number,
    holdMin: number,
    holdMax: number
  ): Promise<void> {
    if (this.shouldStop) return;

    // Generate random stroke parameters
    const strokeLength = this.randomInt(ControlAlgorithm.STROKE_MIN, ControlAlgorithm.STROKE_MAX);
    const maxStartPosition = 100 - strokeLength;
    const startPosition = this.randomInt(0, maxStartPosition);

    const minPosition = startPosition;
    const maxPosition = startPosition + strokeLength;
    const speed = this.randomInt(speedMin, speedMax);
    const boostedSpeed = this.applyDesperationBonus(speed);
    const holdDuration = this.getHoldDuration(holdMin, holdMax);

    logger.debug(`[${this.session.phase}] Range: ${minPosition}%-${maxPosition}% (${strokeLength}% stroke), Speed: ${boostedSpeed}% (holding for ${holdDuration / 1000}s)`);

    await this.deviceController.stroke(this.session.connectionString, {
      minPosition,
      maxPosition,
      speed: boostedSpeed
    });

    // Hold this configuration
    await this.sleep(holdDuration);
  }

  private async runPattern(): Promise<boolean> {
    const pattern = PatternRegistry.getRandomPattern();
    this.isPatternRunning = true;
    this.patternShouldStop = false; // Reset pattern interrupt flag

    logger.debug(`[${this.session.phase}] 🎨 Starting Pattern: ${pattern.name} (${pattern.duration}ms)`);

    let wasInterrupted = false;

    const onStroke = async (command: StrokeCommand) => {
      if (!this.patternShouldStop) {
        const strokeLength = command.maxPosition - command.minPosition;
        logger.debug(`[${this.session.phase}] Pattern "${pattern.name}" - Range: ${command.minPosition}%-${command.maxPosition}% (${strokeLength}% stroke), Speed: ${command.speed}%`);
        await this.deviceController.stroke(this.session.connectionString, command);
      }
    };

    const onStop = async () => {
      if (!this.patternShouldStop) {
        await this.deviceController.stop(this.session.connectionString);
      }
    };

    const isInterrupted = () => this.patternShouldStop;

    await pattern.execute(onStroke, onStop, isInterrupted);

    wasInterrupted = this.patternShouldStop;

    if (wasInterrupted) {
      logger.debug(`[${this.session.phase}] ⚠️ Pattern "${pattern.name}" interrupted by Limit button`);
    } else {
      logger.debug(`[${this.session.phase}] ✅ Pattern "${pattern.name}" completed`);
    }

    this.isPatternRunning = false;

    return wasInterrupted;
  }

  private checkMovingGoalpost(): void {
    // Only trigger once and only if we're at 90%
    if (this.session.goalpostMoved) return;

    const progress = this.session.limitCount / this.session.edgeTarget;
    if (progress >= ControlAlgorithm.MOVING_GOALPOST_THRESHOLD) {
      const roll = Math.random();
      if (roll < ControlAlgorithm.MOVING_GOALPOST_CHANCE) {
        this.session.edgeTarget += ControlAlgorithm.MOVING_GOALPOST_INCREMENT;
        this.session.goalpostMoved = true;
        logger.debug(`🎯 MOVING GOALPOST! Target increased to ${this.session.edgeTarget} edges`);
      }
    }
  }

  private getHoldDuration(baseMin: number, baseMax: number): number {
    return this.randomInt(baseMin, baseMax);
  }

  private getDesperationLevel(): number {
    if (!this.session.lastLimitTime) return 0;
    const timeSinceLastEdge = Date.now() - this.session.lastLimitTime;
    return Math.floor(timeSinceLastEdge / ControlAlgorithm.DESPERATION_INTERVAL);
  }

  private applyDesperationBonus(speed: number): number {
    const desperationLevel = this.getDesperationLevel();
    if (desperationLevel > 0) {
      const bonus = desperationLevel * ControlAlgorithm.DESPERATION_SPEED_BONUS;
      const boostedSpeed = Math.min(speed + bonus, 100);
      logger.debug(`🔥 DESPERATION LEVEL ${desperationLevel}: Speed boosted from ${speed}% to ${boostedSpeed}% (+${bonus})`);
      return boostedSpeed;
    }
    return speed;
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.currentTimer = setTimeout(() => {
        this.currentTimer = null;
        resolve();
      }, ms);
    });
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getSpeedMin(phase: ControlPhase): number {
    if (phase === ControlPhase.INITIAL) return this.session.phaseSpeedConfig.initialMin;
    if (phase === ControlPhase.FIRST_LIMIT) return this.session.phaseSpeedConfig.firstLimitMin;
    return this.session.phaseSpeedConfig.multipleLimitsMin;
  }

  private getSpeedMax(phase: ControlPhase): number {
    if (phase === ControlPhase.INITIAL) return this.session.phaseSpeedConfig.initialMax;
    if (phase === ControlPhase.FIRST_LIMIT) return this.session.phaseSpeedConfig.firstLimitMax;
    return this.session.phaseSpeedConfig.multipleLimitsMax;
  }

}

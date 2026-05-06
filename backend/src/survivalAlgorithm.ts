import { SessionData, StrokeCommand } from './types';
import { DeviceController } from './deviceController';
import { randomStrokeRange, randomInt } from './strokeUtils';
import { logger } from './logger';

type SendFn = (data: object) => void;

export class SurvivalAlgorithm {
  // Speed envelope: at 0% tension, strokes vary in [FAST_MIN, FAST_MAX]
  // at 100% tension, strokes vary in [CRAWL_MIN, CRAWL_MAX]
  private static readonly FAST_MIN = 50;
  private static readonly FAST_MAX = 80;
  private static readonly CRAWL_MIN = 1;
  private static readonly CRAWL_MAX = 5;

  // Pressure spike: fires every 60s without an edge, adds SPIKE_STEP to spikeLevel
  private static readonly SPIKE_INTERVAL_MS = 60_000;
  private static readonly SPIKE_STEP = 5; // percentage points per tick

  // Edge pause: starts at 30s, decreases by 2s each edge, floor 5s
  private static readonly PAUSE_INITIAL_MS = 10_000;
  private static readonly PAUSE_DECREMENT_MS = 2_000;
  private static readonly PAUSE_FLOOR_MS = 5_000;

  // Stroke hold duration: how long to keep a command before sending the next
  private static readonly HOLD_MIN_MS = 5_000;
  private static readonly HOLD_MAX_MS = 10_000;

  private session: SessionData;
  private deviceController: DeviceController;
  private send: SendFn;

  private shouldStop = false;
  private isPaused = false;
  private pauseResolve: (() => void) | null = null;

  private spikeTimer: NodeJS.Timeout | null = null;
  private loopTimer: NodeJS.Timeout | null = null;

  constructor(session: SessionData, deviceController: DeviceController, send: SendFn) {
    this.session = session;
    this.deviceController = deviceController;
    this.send = send;
    logger.info(`[${session.sessionId}] SurvivalAlgorithm created`);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.shouldStop = false;
    this.isPaused = false;
    this.session.survivalStartTime = Date.now();
    this.session.survivalEdgeCount = 0;
    this.session.survivalPressureSpike = 0;

    this.resetSpikeTimer();
    await this.runLoop();
  }

  /** Called when the user presses the EDGE button */
  async handleEdge(): Promise<void> {
    this.session.survivalEdgeCount++;
    logger.info(`[${this.session.sessionId}] Survival edge ${this.session.survivalEdgeCount}`);

    // Reset pressure spike
    this.session.survivalPressureSpike = 0;
    this.resetSpikeTimer();

    // Pause the loop first, then stop the device.
    // Setting isPaused before stop prevents new strokes, and the runLoop
    // will re-issue stop if a hamp/start landed after our stop call.
    this.isPaused = true;
    await this.deviceController.stop(this.session.connectionString);

    const pauseDuration = this.calcPauseDuration();
    const pauseEndsAt = Date.now() + pauseDuration;

    this.send({
      type: 'survival_pause_start',
      pauseDuration,
      pauseEndsAt,
      edgeCount: this.session.survivalEdgeCount,
      pressureSpike: this.session.survivalPressureSpike,
    });

    logger.info(`[${this.session.sessionId}] Survival pause ${pauseDuration / 1000}s`);

    // Wait for the pause to finish
    await this.sleep(pauseDuration);

    if (this.shouldStop) return;

    this.isPaused = false;
    this.send({
      type: 'survival_pause_end',
      edgeCount: this.session.survivalEdgeCount,
    });

    // Send current state update
    this.emitUpdate();
  }

  /** Called when the frontend moves the tension slider */
  updateTension(tension: number): void {
    this.session.survivalTensionLevel = Math.max(0, Math.min(100, tension));
    logger.debug(`[${this.session.sessionId}] Tension updated to ${this.session.survivalTensionLevel}%`);

    // Immediately apply the new speed without waiting for the next loop tick
    if (!this.isPaused && !this.shouldStop) {
      const speed = this.calcSpeed();
      this.deviceController.setSpeed(this.session.connectionString, speed).catch(err =>
        logger.error(`[${this.session.sessionId}] Tension speed update failed: ${err}`)
      );
    }

    this.emitUpdate();
  }

  destroy(): void {
    this.shouldStop = true;
    this.isPaused = false;
    if (this.spikeTimer) clearInterval(this.spikeTimer);
    if (this.loopTimer) clearTimeout(this.loopTimer);
    logger.info(`[${this.session.sessionId}] SurvivalAlgorithm destroyed`);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async runLoop(): Promise<void> {
    while (!this.shouldStop) {
      if (this.isPaused) {
        // While paused, just yield; handleEdge controls the resume via sleep + flag
        await this.sleep(100);
        continue;
      }

      const command = this.buildStrokeCommand();
      await this.deviceController.stroke(this.session.connectionString, command);

      // If we were paused or stopped during the stroke, re-issue stop to override
      // any hamp/start that landed after handleEdge's stop call.
      if (this.isPaused || this.shouldStop) {
        await this.deviceController.stop(this.session.connectionString);
        continue;
      }

      const hold = this.rand(SurvivalAlgorithm.HOLD_MIN_MS, SurvivalAlgorithm.HOLD_MAX_MS);
      await this.sleep(hold);
    }
  }

  private buildStrokeCommand(): StrokeCommand {
    const { minPosition, maxPosition } = randomStrokeRange(this.session.phaseSpeedConfig);
    return { minPosition, maxPosition, speed: this.calcSpeed() };
  }

  private calcSpeed(): number {
    const t = this.session.survivalTensionLevel / 100; // 0..1
    const spike = this.session.survivalPressureSpike;

    const rawMin = SurvivalAlgorithm.FAST_MIN + (SurvivalAlgorithm.CRAWL_MIN - SurvivalAlgorithm.FAST_MIN) * t + spike;
    const rawMax = SurvivalAlgorithm.FAST_MAX + (SurvivalAlgorithm.CRAWL_MAX - SurvivalAlgorithm.FAST_MAX) * t + spike;

    const speedMin = Math.max(1, Math.min(100, Math.round(rawMin)));
    const speedMax = Math.max(speedMin, Math.min(100, Math.round(rawMax)));
    return this.rand(speedMin, speedMax);
  }

  private calcPauseDuration(): number {
    // Each subsequent edge reduces the pause by PAUSE_DECREMENT_MS, floor at PAUSE_FLOOR_MS
    const reduction = (this.session.survivalEdgeCount - 1) * SurvivalAlgorithm.PAUSE_DECREMENT_MS;
    return Math.max(SurvivalAlgorithm.PAUSE_FLOOR_MS, SurvivalAlgorithm.PAUSE_INITIAL_MS - reduction);
  }

  private resetSpikeTimer(): void {
    if (this.spikeTimer) clearInterval(this.spikeTimer);
    this.spikeTimer = setInterval(() => {
      if (this.shouldStop) return;
      this.session.survivalPressureSpike += SurvivalAlgorithm.SPIKE_STEP;
      logger.debug(`[${this.session.sessionId}] Pressure spike now +${this.session.survivalPressureSpike}%`);
      this.send({
        type: 'survival_spike',
        pressureSpike: this.session.survivalPressureSpike,
      });
      this.emitUpdate();
    }, SurvivalAlgorithm.SPIKE_INTERVAL_MS);
  }

  private emitUpdate(): void {
    this.send({
      type: 'survival_update',
      tensionLevel: this.session.survivalTensionLevel,
      pressureSpike: this.session.survivalPressureSpike,
      edgeCount: this.session.survivalEdgeCount,
      survivalStartTime: this.session.survivalStartTime,
    });
  }

  private rand(min: number, max: number): number {
    return randomInt(min, max);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.loopTimer = setTimeout(resolve, ms);
    });
  }
}

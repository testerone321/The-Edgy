import { StrokeCommand } from './types';
import { logger } from './logger';

export class MockDeviceController {
  private currentPosition: number = 0;
  private currentSpeed: number = 0;
  private minPosition: number = 0;
  private maxPosition: number = 100;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private positionUpdateCallback?: (position: number, speed: number) => void;

  async connect(connectionKey: string): Promise<boolean> {
    return true;
  }

  async setMode(connectionKey: string, mode: string): Promise<void> {
  }

  async stroke(connectionKey: string, command: StrokeCommand): Promise<void> {
    const wasRunning = this.isRunning;
    const speedChanged = command.speed !== this.currentSpeed;
    const rangeChanged = command.minPosition !== this.minPosition || command.maxPosition !== this.maxPosition;

    this.currentSpeed = command.speed;
    this.minPosition = command.minPosition;
    this.maxPosition = command.maxPosition;
    this.isRunning = true;

    if (!wasRunning) {
      logger.debug(`[MOCK] Stroke started — speed: ${command.speed}%, range: [${command.minPosition}, ${command.maxPosition}]`);
    } else if (speedChanged || rangeChanged) {
      logger.debug(`[MOCK] Stroke updated — speed: ${command.speed}%${rangeChanged ? `, range: [${command.minPosition}, ${command.maxPosition}]` : ''}`);
    }

    // Set initial position to min
    this.currentPosition = command.minPosition;

    // Start animation loop if not already running
    if (!this.intervalId) {
      this.startAnimation();
    }
  }

  async stop(connectionKey: string): Promise<void> {
    if (this.isRunning) {
      logger.debug(`[MOCK] Stroke stopped — last position: ${this.currentPosition.toFixed(1)}, last speed: ${this.currentSpeed}%`);
    }
    this.isRunning = false;
    this.currentSpeed = 0;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.notifyPositionUpdate();
  }

  async setSpeed(connectionKey: string, speed: number): Promise<void> {
    this.currentSpeed = speed;
    logger.debug(`[MOCK] Speed updated — speed: ${speed}%`);
  }

  setPositionUpdateCallback(callback: (position: number, speed: number) => void): void {
    this.positionUpdateCallback = callback;
  }

  private startAnimation(): void {
    // Update position based on speed (higher speed = faster updates)
    const updateInterval = 50; // 50ms = 20 updates per second
    let direction = 1; // 1 = up, -1 = down
    
    this.intervalId = setInterval(() => {
      if (!this.isRunning) {
        return;
      }

      // Calculate position change based on speed
      const positionChange = (this.currentSpeed / 100) * 5; // Scale factor
      
      this.currentPosition += positionChange * direction;
      
      // Bounce at boundaries (within min/max range)
      if (this.currentPosition >= this.maxPosition) {
        this.currentPosition = this.maxPosition;
        direction = -1;
      } else if (this.currentPosition <= this.minPosition) {
        this.currentPosition = this.minPosition;
        direction = 1;
      }
      
      this.notifyPositionUpdate();
    }, updateInterval);
  }

  private notifyPositionUpdate(): void {
    if (this.positionUpdateCallback) {
      this.positionUpdateCallback(this.currentPosition, this.currentSpeed);
    }
  }

  getCurrentPosition(): number {
    return this.currentPosition;
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }
}

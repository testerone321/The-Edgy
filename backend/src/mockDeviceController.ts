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
    
    this.currentSpeed = command.speed;
    this.minPosition = command.minPosition;
    this.maxPosition = command.maxPosition;
    this.isRunning = true;
    
    // Set initial position to min
    this.currentPosition = command.minPosition;
    
    // Start animation loop if not already running
    if (!this.intervalId) {
      this.startAnimation();
    }
  }

  async stop(connectionKey: string): Promise<void> {
    this.isRunning = false;
    this.currentSpeed = 0;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.notifyPositionUpdate();
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

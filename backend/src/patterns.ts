import { StrokeCommand } from './types';

export interface StrokePattern {
  name: string;
  duration: number; // Total duration in milliseconds
  execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void>;
}

// Wave Pattern - Gradually increasing then decreasing speed
export class WavePattern implements StrokePattern {
  name = 'Wave';
  duration = 15000; // 15 seconds

  async execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void> {
    const steps = 15;
    const stepDuration = this.duration / steps;
    
    for (let i = 0; i < steps; i++) {
      if (isInterrupted()) break;
      
      // Create wave: 0 -> peak -> 0
      const progress = i / steps;
      const wave = Math.sin(progress * Math.PI);
      const speed = Math.floor(wave * 50 + 10); // 10-60%
      
      const strokeLength = this.randomInt(30, 80);
      const startPos = this.randomInt(0, 100 - strokeLength);
      
      await onStroke({
        minPosition: startPos,
        maxPosition: startPos + strokeLength,
        speed
      });
      
      await this.sleep(stepDuration);
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Pulse Pattern - Short intense bursts
export class PulsePattern implements StrokePattern {
  name = 'Pulse';
  duration = 12000; // 12 seconds

  async execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void> {
    const pulses = 6;
    
    for (let i = 0; i < pulses; i++) {
      if (isInterrupted()) break;
      
      // Intense burst
      const strokeLength = this.randomInt(50, 80);
      const startPos = this.randomInt(0, 100 - strokeLength);
      
      await onStroke({
        minPosition: startPos,
        maxPosition: startPos + strokeLength,
        speed: this.randomInt(40, 70)
      });
      
      await this.sleep(800); // 800ms burst
      
      if (isInterrupted()) break;
      
      // Brief pause
      await onStop();
      await this.sleep(1200); // 1200ms pause
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Escalation Pattern - Gradually increasing intensity
export class EscalationPattern implements StrokePattern {
  name = 'Escalation';
  duration = 20000; // 20 seconds

  async execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void> {
    const steps = 20;
    const stepDuration = this.duration / steps;
    
    for (let i = 0; i < steps; i++) {
      if (isInterrupted()) break;
      
      const progress = i / steps;
      const speed = Math.floor(5 + progress * 55); // 5% -> 60%
      
      const strokeLength = this.randomInt(30, 90);
      const startPos = this.randomInt(0, 100 - strokeLength);
      
      await onStroke({
        minPosition: startPos,
        maxPosition: startPos + strokeLength,
        speed
      });
      
      await this.sleep(stepDuration);
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Tease Pattern - Slow with sudden fast movements
export class TeasePattern implements StrokePattern {
  name = 'Tease';
  duration = 18000; // 18 seconds

  async execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void> {
    const cycles = 6;
    
    for (let i = 0; i < cycles; i++) {
      if (isInterrupted()) break;
      
      // Slow tease - small stroke
      const slowStrokeLength = this.randomInt(20, 40);
      const slowStartPos = this.randomInt(0, 100 - slowStrokeLength);
      
      await onStroke({
        minPosition: slowStartPos,
        maxPosition: slowStartPos + slowStrokeLength,
        speed: this.randomInt(5, 15)
      });
      
      await this.sleep(2000); // 2s slow
      
      if (isInterrupted()) break;
      
      // Sudden fast stroke - larger stroke
      const fastStrokeLength = this.randomInt(60, 90);
      const fastStartPos = this.randomInt(0, 100 - fastStrokeLength);
      
      await onStroke({
        minPosition: fastStartPos,
        maxPosition: fastStartPos + fastStrokeLength,
        speed: this.randomInt(35, 55)
      });
      
      await this.sleep(1000); // 1s fast
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Random Chaos Pattern - Completely unpredictable
export class ChaosPattern implements StrokePattern {
  name = 'Chaos';
  duration = 15000; // 15 seconds

  async execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void> {
    const changes = 30;
    
    for (let i = 0; i < changes; i++) {
      if (isInterrupted()) break;
      
      const strokeLength = this.randomInt(20, 100);
      const startPos = this.randomInt(0, 100 - strokeLength);
      
      await onStroke({
        minPosition: startPos,
        maxPosition: startPos + strokeLength,
        speed: this.randomInt(5, 70)
      });
      
      await this.sleep(this.randomInt(300, 700));
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// The Teasing Ghost Pattern - Extremely slow movement from 0 to 100 and back
export class TeasingGhostPattern implements StrokePattern {
  name = 'The Teasing Ghost';
  duration = 30000; // 30 seconds

  async execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void> {
    // Move from 0 to 100 over 15 seconds
    for (let pos = 0; pos <= 100; pos += 1) {
      if (isInterrupted()) break;
      
      await onStroke({
        minPosition: pos,
        maxPosition: pos,
        speed: 1 // Extremely slow speed
      });
      
      await this.sleep(150); // 150ms per position = 15 seconds for 100 positions
    }
    
    if (isInterrupted()) return;
    
    // Move from 100 back to 0 over 15 seconds
    for (let pos = 100; pos >= 0; pos -= 1) {
      if (isInterrupted()) break;
      
      await onStroke({
        minPosition: pos,
        maxPosition: pos,
        speed: 1 // Extremely slow speed
      });
      
      await this.sleep(150); // 150ms per position = 15 seconds for 100 positions
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// The Inchworm Pattern (Der Spanner) - Small stroke slowly crawling across the entire range
export class InchwormPattern implements StrokePattern {
  name = 'The Inchworm';
  duration = 40000; // 40 seconds (20s up, 20s down)

  async execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void> {
    const strokeLength = 5; // 5% length
    const stepSize = 5; // Move 5% every second
    const stepDuration = 1000; // 1 second per step
    
    // Crawl up from 0 to 95 (so the 5% stroke reaches 100)
    for (let pos = 0; pos <= 95; pos += stepSize) {
      if (isInterrupted()) break;
      
      await onStroke({
        minPosition: pos,
        maxPosition: pos + strokeLength,
        speed: 1 // Very slow speed
      });
      
      await this.sleep(stepDuration);
    }
    
    if (isInterrupted()) return;
    
    // Crawl back down from 95 to 0
    for (let pos = 95; pos >= 0; pos -= stepSize) {
      if (isInterrupted()) break;
      
      await onStroke({
        minPosition: pos,
        maxPosition: pos + strokeLength,
        speed: 5 // Very slow speed
      });
      
      await this.sleep(stepDuration);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// The Fake-Out Exit Pattern (Das vorgetäuschte Ende) - Psychological trick with fake ending
export class FakeOutExitPattern implements StrokePattern {
  name = 'The Fake-Out Exit';
  duration = 20000; // ~20 seconds

  async execute(
    onStroke: (command: StrokeCommand) => Promise<void>,
    onStop: () => Promise<void>,
    isInterrupted: () => boolean
  ): Promise<void> {
    const slowdownSteps = 10;
    
    // Gradually slow down
    for (let i = 0; i < slowdownSteps; i++) {
      if (isInterrupted()) break;
      
      const speed = 40 - (i * 3); // From 40% down to ~10%
      const strokeLength = this.randomInt(40, 70);
      const startPos = this.randomInt(0, 100 - strokeLength);
      
      await onStroke({
        minPosition: startPos,
        maxPosition: startPos + strokeLength,
        speed: Math.max(5, speed)
      });
      
      await this.sleep(500);
    }
    
    if (isInterrupted()) return;
    
    // Complete stop - fake ending
    await onStop();
    await this.sleep(3000); // 3 seconds of "relief"
    
    if (isInterrupted()) return;
    
    // SURPRISE! 3 extremely fast full strokes
    for (let i = 0; i < 3; i++) {
      if (isInterrupted()) break;
      
      await onStroke({
        minPosition: 0,
        maxPosition: 100,
        speed: 100 // Maximum speed!
      });
      
      await this.sleep(2000); // Quick succession
    }
    
    // Stop again
    await onStop();
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Pattern Registry - Easy to add new patterns
export class PatternRegistry {
  private static patterns: StrokePattern[] = [
    new WavePattern(),
    new PulsePattern(),
    new EscalationPattern(),
    new TeasePattern(),
    new ChaosPattern(),
    // new TeasingGhostPattern(),
    new InchwormPattern(),
    new FakeOutExitPattern()
  ];

  static getRandomPattern(): StrokePattern {
    const index = Math.floor(Math.random() * this.patterns.length);
    return this.patterns[index];
  }

  static getAllPatterns(): StrokePattern[] {
    return this.patterns;
  }

  static addPattern(pattern: StrokePattern): void {
    this.patterns.push(pattern);
  }
}

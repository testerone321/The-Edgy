import { PhaseSpeedConfig } from './types';

/** Uniform random integer in [min, max] inclusive. */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random stroke window that fits within the configured position range.
 * @param config      The session's phaseSpeedConfig (provides min/maxStrokePosition).
 * @param widthFactor Fraction of the total range used as the *minimum* stroke length.
 *                    0.33 = normal, 0.5 = climax (wider strokes).
 */
export function randomStrokeRange(
  config: PhaseSpeedConfig,
  widthFactor: number = 0.33
): { minPosition: number; maxPosition: number } {
  const totalRange = config.maxStrokePosition - config.minStrokePosition;
  const strokeLengthMin = Math.floor(totalRange * widthFactor);
  const strokeLength = randomInt(strokeLengthMin, totalRange);
  const maxStartPosition = config.maxStrokePosition - strokeLength;
  const minPosition = randomInt(config.minStrokePosition, maxStartPosition);
  const maxPosition = minPosition + strokeLength;
  return { minPosition, maxPosition };
}

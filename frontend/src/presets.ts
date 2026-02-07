import type { PhaseSpeedConfig, DifficultyLevel } from './types';

// Difficulty presets with speed configurations
export const DIFFICULTY_PRESETS: Record<DifficultyLevel, PhaseSpeedConfig> = {
  easy: {
    initialMin: 10,
    initialMax: 40,
    firstLimitMin: 1,
    firstLimitMax: 20,
    multipleLimitsMin: 1,
    multipleLimitsMax: 10,
  },
  medium: {
    initialMin: 20,
    initialMax: 50,
    firstLimitMin: 1,
    firstLimitMax: 30,
    multipleLimitsMin: 1,
    multipleLimitsMax: 20,
  },
  hard: {
    initialMin: 40,
    initialMax: 80,
    firstLimitMin: 20,
    firstLimitMax: 60,
    multipleLimitsMin: 10,
    multipleLimitsMax: 40,
  },
  insane: {
    initialMin: 60,
    initialMax: 90,
    firstLimitMin: 50,
    firstLimitMax: 80,
    multipleLimitsMin: 40,
    multipleLimitsMax: 80,
  },
  custom: {
    // Custom starts with medium preset values
    initialMin: 20,
    initialMax: 50,
    firstLimitMin: 1,
    firstLimitMax: 30,
    multipleLimitsMin: 1,
    multipleLimitsMax: 20,
  },
};

/**
 * Get preset configuration for a difficulty level
 */
export function getPresetForDifficulty(difficulty: DifficultyLevel): PhaseSpeedConfig {
  return { ...DIFFICULTY_PRESETS[difficulty] };
}

/**
 * Check if a config matches any preset (excluding custom)
 */
export function detectPresetFromConfig(config: PhaseSpeedConfig): DifficultyLevel {
  const presets: DifficultyLevel[] = ['easy', 'medium', 'hard', 'insane'];
  
  for (const preset of presets) {
    const presetConfig = DIFFICULTY_PRESETS[preset];
    if (
      config.initialMin === presetConfig.initialMin &&
      config.initialMax === presetConfig.initialMax &&
      config.firstLimitMin === presetConfig.firstLimitMin &&
      config.firstLimitMax === presetConfig.firstLimitMax &&
      config.multipleLimitsMin === presetConfig.multipleLimitsMin &&
      config.multipleLimitsMax === presetConfig.multipleLimitsMax
    ) {
      return preset;
    }
  }
  
  return 'custom';
}

/**
 * Check if two configs are different
 */
export function hasConfigChanged(config1: PhaseSpeedConfig, config2: PhaseSpeedConfig): boolean {
  return (
    config1.initialMin !== config2.initialMin ||
    config1.initialMax !== config2.initialMax ||
    config1.firstLimitMin !== config2.firstLimitMin ||
    config1.firstLimitMax !== config2.firstLimitMax ||
    config1.multipleLimitsMin !== config2.multipleLimitsMin ||
    config1.multipleLimitsMax !== config2.multipleLimitsMax
  );
}

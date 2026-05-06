import { useState, useCallback } from 'react';
import type { DurationLevel, DifficultyLevel, PhaseSpeedConfig, GameMode } from './types';
import { getPresetForDifficulty } from './presets';

const STORAGE_KEY = 'edgy_settings_v1';

export interface PersistedSettings {
  deviceKey: string;
  duration: DurationLevel;
  difficulty: DifficultyLevel;
  gameMode: GameMode;
  potEnabled: boolean;
  phaseSpeedConfig: PhaseSpeedConfig;
}

const DEFAULTS: PersistedSettings = {
  deviceKey: '',
  duration: 'medium',
  difficulty: 'medium',
  gameMode: 'classic',
  potEnabled: true,
  phaseSpeedConfig: getPresetForDifficulty('medium'),
};

function load(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function persist(s: PersistedSettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState<PersistedSettings>(load);

  const update = useCallback((patch: Partial<PersistedSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  return { settings, update };
}

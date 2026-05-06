import { useState } from 'react';
import type { PhaseSpeedConfig, DifficultyLevel, GameMode } from './types';
import { detectPresetFromConfig, hasConfigChanged } from './presets';
import './ConfigScreen.css';

interface ConfigScreenProps {
  onSave: (difficulty: DifficultyLevel, config: PhaseSpeedConfig) => void;
  onBack: () => void;
  initialDifficulty: DifficultyLevel;
  initialConfig: PhaseSpeedConfig;
  gameMode?: GameMode;
}

export function ConfigScreen({ onSave, onBack, initialDifficulty, initialConfig, gameMode = 'classic' }: ConfigScreenProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [config, setConfig] = useState<PhaseSpeedConfig>(initialConfig);

  const handleSave = () => {
    // If config changed from initial, set difficulty to custom (unless it matches a preset)
    const configChanged = hasConfigChanged(config, initialConfig);
    const finalDifficulty = configChanged ? detectPresetFromConfig(config) : difficulty;
    onSave(finalDifficulty, config);
  };

  const updateConfig = (configType: 'initial' | 'firstLimit' | 'multipleLimits' | 'strokePosition', type: 'min' | 'max', value: number) => {
    const newConfig = { ...config };
    
    if (configType === 'initial') {
      if (type === 'min') {
        newConfig.initialMin = Math.min(value, newConfig.initialMax - 1);
      } else {
        newConfig.initialMax = Math.max(value, newConfig.initialMin + 1);
      }
    } else if (configType === 'firstLimit') {
      if (type === 'min') {
        newConfig.firstLimitMin = Math.min(value, newConfig.firstLimitMax - 1);
      } else {
        newConfig.firstLimitMax = Math.max(value, newConfig.firstLimitMin + 1);
      }
    } else if (configType === 'multipleLimits') {
      if (type === 'min') {
        newConfig.multipleLimitsMin = Math.min(value, newConfig.multipleLimitsMax - 1);
      } else {
        newConfig.multipleLimitsMax = Math.max(value, newConfig.multipleLimitsMin + 1);
      }
    } else if (configType === 'strokePosition') {
      if (type === 'min') {
        newConfig.minStrokePosition = Math.min(value, newConfig.maxStrokePosition - 1);
      } else {
        newConfig.maxStrokePosition = Math.max(value, newConfig.minStrokePosition + 1);
      }
    }
    
    setConfig(newConfig);
    
    // Auto-detect if config matches a preset or set to custom
    const detectedPreset = detectPresetFromConfig(newConfig);
    setDifficulty(detectedPreset);
  };

  return (
    <div className="config-screen">
      <div className="config-container">
        <h1 className="config-title">Speed Configuration</h1>
        <p className="config-subtitle">
          {gameMode === 'survival'
            ? 'Stroke Length Configuration'
            : <>Current preset: <strong>{difficulty === 'custom' ? 'Custom' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</strong></>}
        </p>

        <div className="phase-config">
          {gameMode === 'classic' && (
            <>
          <div className="phase-section">
            <h3 className="phase-title">Before the Edge</h3>
            <p className="phase-description">The Handy will start with this settings</p>
            
            <div className="slider-group">
              <label>Minimum Speed: {config.initialMin}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={config.initialMin}
                onChange={(e) => updateConfig('initial', 'min', parseInt(e.target.value))}
                className="speed-slider"
              />
            </div>
            
            <div className="slider-group">
              <label>Maximum Speed: {config.initialMax}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={config.initialMax}
                onChange={(e) => updateConfig('initial', 'max', parseInt(e.target.value))}
                className="speed-slider"
              />
            </div>
          </div>

          <div className="phase-section">
            <h3 className="phase-title">First Edges (1-10)</h3>
            <p className="phase-description">Settings for the first few edges</p>
            
            <div className="slider-group">
              <label>Minimum Speed: {config.firstLimitMin}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={config.firstLimitMin}
                onChange={(e) => updateConfig('firstLimit', 'min', parseInt(e.target.value))}
                className="speed-slider"
              />
            </div>
            
            <div className="slider-group">
              <label>Maximum Speed: {config.firstLimitMax}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={config.firstLimitMax}
                onChange={(e) => updateConfig('firstLimit', 'max', parseInt(e.target.value))}
                className="speed-slider"
              />
            </div>
          </div>

          <div className="phase-section">
            <h3 className="phase-title">Final Edges (10+)</h3>
            <p className="phase-description">Settings for the final edges</p>
            
            <div className="slider-group">
              <label>Minimum Speed: {config.multipleLimitsMin}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={config.multipleLimitsMin}
                onChange={(e) => updateConfig('multipleLimits', 'min', parseInt(e.target.value))}
                className="speed-slider"
              />
            </div>
            
            <div className="slider-group">
              <label>Maximum Speed: {config.multipleLimitsMax}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={config.multipleLimitsMax}
                onChange={(e) => updateConfig('multipleLimits', 'max', parseInt(e.target.value))}
                className="speed-slider"
              />
            </div>
          </div>
            </>
          )}

          <div className="phase-section">
            <h3 className="phase-title">Position</h3>
            <p className="phase-description">Settings for stroke length</p>
            
            <div className="slider-group">
              <label>Minimum Position: {config.minStrokePosition}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.minStrokePosition}
                onChange={(e) => updateConfig('strokePosition', 'min', parseInt(e.target.value))}
                className="speed-slider"
              />
            </div>
            
            <div className="slider-group">
              <label>Maximum Position: {config.maxStrokePosition}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={config.maxStrokePosition}
                onChange={(e) => updateConfig('strokePosition', 'max', parseInt(e.target.value))}
                className="speed-slider"
              />
            </div>
          </div>

        </div>

        <div className="config-buttons">
          <button onClick={onBack} className="back-button-config">
            Back
          </button>
          <button onClick={handleSave} className="save-button">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

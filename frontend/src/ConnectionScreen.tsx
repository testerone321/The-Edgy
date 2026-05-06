import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { DurationLevel, DifficultyLevel, PhaseSpeedConfig, GameMode } from './types';
import { getPresetForDifficulty } from './presets';
import classicInfoContent from './classic-info.md?raw';
import survivalInfoContent from './survival-info.md?raw';
import './ConnectionScreen.css';

interface ConnectionScreenProps {
  // Controlled fields (persisted in parent)
  deviceKey: string;
  onDeviceKeyChange: (key: string) => void;
  duration: DurationLevel;
  onDurationChange: (d: DurationLevel) => void;
  difficulty: DifficultyLevel;
  onDifficultyChange: (d: DifficultyLevel) => void;
  phaseSpeedConfig: PhaseSpeedConfig;
  potEnabled: boolean;
  onPotEnabledChange: (v: boolean) => void;
  gameMode: GameMode;
  onGameModeChange: (m: GameMode) => void;
  // Actions
  onConnect: () => void;
  onConfigure: () => void;
}

export function ConnectionScreen({
  deviceKey,
  onDeviceKeyChange,
  duration,
  onDurationChange,
  difficulty,
  onDifficultyChange,
  potEnabled,
  onPotEnabledChange,
  gameMode,
  onGameModeChange,
  onConnect,
  onConfigure,
}: ConnectionScreenProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Sync preset when difficulty changes (skip 'custom' — user-defined)
  useEffect(() => {
    if (difficulty !== 'custom') {
      // parent will call onDifficultyChange which triggers a phaseSpeedConfig update
    }
  }, [difficulty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deviceKey.trim()) {
      onConnect();
    }
  };

  return (
    <div className="connection-screen">
      <div className="connection-container">
        <div className="header-with-info">
          <h1 className="app-title">The Edgy</h1>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="info-button"
            title="How it works"
          >
            ℹ️
          </button>
        </div>
        <p className="subtitle">The Handy Edging Experience</p>

        <form onSubmit={handleSubmit} className="connection-form">
          {/* Mode selection */}
          <div className="mode-selector">
            <button
              type="button"
              className={`mode-card ${gameMode === 'classic' ? 'mode-card--active' : ''}`}
              onClick={() => onGameModeChange('classic')}
            >
              <span className="mode-card__title">Classic</span>
              <span className="mode-card__desc">Full edging experience</span>
            </button>
            <button
              type="button"
              className={`mode-card ${gameMode === 'survival' ? 'mode-card--active' : ''}`}
              onClick={() => onGameModeChange('survival')}
            >
              <span className="mode-card__title">Survival</span>
              <span className="mode-card__desc">How far can you go?</span>
            </button>
          </div>

          {/* Device key — shared between modes */}
          <div className="input-group">
            <label htmlFor="deviceKey">The Handy Key</label>
            <input
              id="deviceKey"
              type="text"
              value={deviceKey}
              onChange={(e) => onDeviceKeyChange(e.target.value)}
              placeholder="Enter your connection key"
              className="key-input"
              autoComplete="off"
            />
          </div>

          {/* Classic-only settings */}
          {gameMode === 'classic' && (
            <>
              <div className="input-group">
                <label htmlFor="duration">Duration</label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => onDurationChange(e.target.value as DurationLevel)}
                  className="duration-select"
                >
                  <option value="short">Short (10-12 Edges)</option>
                  <option value="medium">Medium (12-20 Edges)</option>
                  <option value="long">Long (20-30 Edges)</option>
                  <option value="insane">Insane (30-50 Edges)</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="difficulty">Difficulty</label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => onDifficultyChange(e.target.value as DifficultyLevel)}
                  className="difficulty-select"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="insane">Insane</option>
                  <option value="custom">Custom</option>
                </select>
                <button
                  type="button"
                  onClick={onConfigure}
                  className="configure-link"
                >
                  ⚙️ Configure Settings
                </button>
              </div>

              <div className="input-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={potEnabled}
                    onChange={(e) => onPotEnabledChange(e.target.checked)}
                    className="pot-checkbox"
                  />
                  <span className="checkbox-text">POT (Post Orgasm Torture)</span>
                </label>
                <p className="checkbox-description">Enables POT mode if orgasm before reaching the edge target</p>
              </div>
            </>
          )}

          {/* Survival-only settings */}
          {gameMode === 'survival' && (
            <div className="input-group">
              <button
                type="button"
                onClick={onConfigure}
                className="configure-link"
              >
                ⚙️ Configure Settings
              </button>
            </div>
          )}

          <button
            type="submit"
            className="connect-button"
            disabled={!deviceKey.trim()}
          >
            Connect
          </button>
        </form>
      </div>

      {/* Info Dialog */}
      {showInfo && (
        <div className="info-overlay" onClick={() => setShowInfo(false)}>
          <div className="info-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="info-header">
              <button className="close-button" onClick={() => setShowInfo(false)}>×</button>
            </div>
            <div className="info-content">
              <ReactMarkdown>{gameMode === 'survival' ? survivalInfoContent : classicInfoContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


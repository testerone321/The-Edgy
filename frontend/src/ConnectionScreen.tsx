import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { DurationLevel, DifficultyLevel, PhaseSpeedConfig } from './types';
import { getPresetForDifficulty } from './presets';
import infoDialogContent from './info-dialog-content.md?raw';
import './ConnectionScreen.css';

interface ConnectionScreenProps {
  onConnect: (deviceKey: string, duration: DurationLevel, difficulty: DifficultyLevel, phaseSpeedConfig: PhaseSpeedConfig, potEnabled: boolean) => void;
  onConfigure: (currentDifficulty: DifficultyLevel, currentConfig: PhaseSpeedConfig) => void;
  initialDifficulty: DifficultyLevel;
  initialConfig: PhaseSpeedConfig;
}

export function ConnectionScreen({ onConnect, onConfigure, initialDifficulty, initialConfig }: ConnectionScreenProps) {
  const [deviceKey, setHandyKey] = useState('');
  const [duration, setDuration] = useState<DurationLevel>('medium');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [phaseSpeedConfig, setPhaseSpeedConfig] = useState<PhaseSpeedConfig>(initialConfig);
  const [potEnabled, setPotEnabled] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  // Update local state when initial values change (e.g., after saving config)
  useEffect(() => {
    setDifficulty(initialDifficulty);
    setPhaseSpeedConfig(initialConfig);
  }, [initialDifficulty, initialConfig]);

  // Update config when difficulty changes
  useEffect(() => {
    if (difficulty !== 'custom') {
      setPhaseSpeedConfig(getPresetForDifficulty(difficulty));
    }
  }, [difficulty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deviceKey.trim()) {
      onConnect(deviceKey.trim(), duration, difficulty, phaseSpeedConfig, potEnabled);
    }
  };

  const handleConfigure = () => {
    onConfigure(difficulty, phaseSpeedConfig);
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
          <div className="input-group">
            <label htmlFor="deviceKey">The Handy Key</label>
            <input
              id="deviceKey"
              type="text"
              value={deviceKey}
              onChange={(e) => setHandyKey(e.target.value)}
              placeholder="Enter your connection key"
              className="key-input"
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label htmlFor="duration">Duration</label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value as DurationLevel)}
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
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
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
              onClick={handleConfigure}
              className="configure-link"
            >
              ⚙️ Configure Speed Settings
            </button>
          </div>

          <div className="input-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={potEnabled}
                onChange={(e) => setPotEnabled(e.target.checked)}
                className="pot-checkbox"
              />
              <span className="checkbox-text">POT (Post Orgasm Torture)</span>
            </label>
            <p className="checkbox-description">Enables POT mode if orgasm before reaching the edge target</p>
          </div>
          
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
              <ReactMarkdown>{infoDialogContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

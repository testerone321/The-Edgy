import { useState, useEffect } from 'react';
import type { SessionState } from './types';
import './MainScreen.css';

interface MainScreenProps {
  sessionState: SessionState;
  onStartSession: () => void;
  onLimitButton: () => void;
  onClimaxButton: () => void;
  onBack: () => void;
}

export function MainScreen({ 
  sessionState, 
  onStartSession, 
  onLimitButton, 
  onClimaxButton,
  onBack
}: MainScreenProps) {
  const [redgifsUrl, setRedgifsUrl] = useState('https://www.redgifs.com/');
  const [showVideo, setShowVideo] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [punishmentTimeLeft, setPunishmentTimeLeft] = useState(0);

  // Timer that runs continuously
  useEffect(() => {
    if (!sessionState.sessionActive || !sessionState.sessionStartTime) {
      setCurrentDuration(0);
      return;
    }

    // Update every 100ms for smooth updates
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionState.sessionStartTime;
      setCurrentDuration(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [sessionState.sessionActive, sessionState.sessionStartTime]);

  // Punishment timer
  useEffect(() => {
    if (!sessionState.sessionActive || !sessionState.isPunishmentMode || !sessionState.punishmentEndTime) {
      setPunishmentTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, sessionState.punishmentEndTime - Date.now());
      setPunishmentTimeLeft(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [sessionState.sessionActive, sessionState.isPunishmentMode, sessionState.punishmentEndTime]);

  const handleLoadVideo = () => {
    if (redgifsUrl.trim()) {
      setShowVideo(true);
      if (!sessionState.sessionActive) {
        onStartSession();
      }
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (sessionState.edgeTarget === 0) return 0;
    return Math.min(100, (sessionState.limitCount / sessionState.edgeTarget) * 100);
  };

  const getClimaxButtonText = () => {
    if (sessionState.isPunishmentMode && punishmentTimeLeft > 0) {
      return formatDuration(punishmentTimeLeft);
    }
    return sessionState.isClimaxMode ? 'STOP' : 'ORGASM';
  };

  return (
    <div className="main-screen">
      {/* Content Area */}
      <div className="content-area">
        {/* Stats Overlay */}
        <div className="header-stats">
          <div className="stat edges-stat">
            <span className="stat-label">Edges</span>
            <span className="stat-value limit-count">
              {sessionState.limitCount}/{sessionState.edgeTarget}
            </span>
          </div>
          <div className="stat progress-stat">
            <button className="back-button" onClick={onBack} title="Back to connection">
              ⚙
            </button>
            <span className="stat-label">
              Progress {sessionState.goalpostMoved && '🎯'} {sessionState.speedEscalated && '⚡'}
            </span>
            <span className="stat-value">
              {getProgress().toFixed(0)}% • {formatDuration(currentDuration)}
            </span>
          </div>
        </div>

        {/* Content */}
        {!showVideo ? (
          <div className="video-input-container">
            <input
              type="text"
              value={redgifsUrl}
              onChange={(e) => setRedgifsUrl(e.target.value)}
              placeholder="Enter RedGifs URL or category"
              className="video-input"
            />
            <button 
              onClick={handleLoadVideo} 
              className="load-button"
              disabled={!redgifsUrl.trim()}
            >
              Load Content
            </button>
          </div>
        ) : (
          <div className="video-container">
            <iframe
              src={redgifsUrl}
              title="content"
              className="video-frame"
              allow="autoplay"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="control-buttons">
        <button 
          className={`climax-button ${sessionState.isClimaxMode ? 'active' : ''} ${sessionState.isPunishmentMode ? 'punishment' : ''}`}
          onClick={onClimaxButton}
          disabled={!sessionState.sessionActive || (sessionState.isPunishmentMode && punishmentTimeLeft > 0)}
        >
          {getClimaxButtonText()}
        </button>
        
        <button 
          className="limit-button"
          onClick={onLimitButton}
          disabled={!sessionState.sessionActive || sessionState.isClimaxMode}
        >
          EDGE
        </button>
      </div>
    </div>
  );
}

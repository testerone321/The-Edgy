import { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionState } from './types';
import './MainScreen.css';
import './SurvivalScreen.css';

interface SurvivalScreenProps {
  sessionState: SessionState;
  onStartSession: () => void;
  onEdgeButton: () => void;
  onSetTension: (tension: number) => void;
  onBack: () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SurvivalScreen({
  sessionState,
  onStartSession,
  onEdgeButton,
  onSetTension,
  onBack,
}: SurvivalScreenProps) {
  const [redgifsUrl, setRedgifsUrl] = useState('https://www.redgifs.com/');
  const [showVideo, setShowVideo] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(0);
  const [localTension, setLocalTension] = useState(0);
  const [secondsSinceSpike, setSecondsSinceSpike] = useState(0);
  const lastSpikeResetRef = useRef(Date.now());

  // Elapsed timer
  useEffect(() => {
    if (!sessionState.sessionActive || !sessionState.sessionStartTime) {
      setElapsedSeconds(0);
      return;
    }
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionState.sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionState.sessionActive, sessionState.sessionStartTime]);

  // Pause countdown
  useEffect(() => {
    if (!sessionState.survivalIsPaused || !sessionState.survivalPauseEndsAt) {
      setPauseSecondsLeft(0);
      return;
    }
    const tick = () =>
      setPauseSecondsLeft(Math.max(0, Math.ceil((sessionState.survivalPauseEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sessionState.survivalIsPaused, sessionState.survivalPauseEndsAt]);

  // Reset spike timer reference when an edge is registered (spike resets to 0)
  useEffect(() => {
    if (sessionState.survivalPressureSpike === 0) {
      lastSpikeResetRef.current = Date.now();
      setSecondsSinceSpike(0);
    }
  }, [sessionState.survivalPressureSpike]);

  // Seconds-since-last-spike counter
  useEffect(() => {
    if (!sessionState.sessionActive) return;
    const id = setInterval(() => {
      setSecondsSinceSpike(Math.floor((Date.now() - lastSpikeResetRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionState.sessionActive]);

  const handleLoadVideo = () => {
    if (redgifsUrl.trim()) {
      setShowVideo(true);
      if (!sessionState.sessionActive) {
        onStartSession();
      }
    }
  };

  const handleTensionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalTension(val);
    onSetTension(val);
  }, [onSetTension]);

  const spikeWarning = sessionState.sessionActive && secondsSinceSpike >= 50;

  return (
    <div className="main-screen">
      <div className="content-area">

        {/* Header stats — identical structure to MainScreen */}
        <div className="header-stats">
          <div className="stat edges-stat">
            <span className="stat-label">Edges</span>
            <span className="stat-value limit-count">{sessionState.survivalEdgeCount}</span>
          </div>
          <div className="stat progress-stat">
            <button className="back-button" onClick={onBack} title="Back to connection">⚙</button>
            <span className="stat-label">
              Time {sessionState.survivalPressureSpike > 0 && (
                <span className="survival-spike-badge">⚡+{sessionState.survivalPressureSpike}%{spikeWarning ? ' ⚠' : ''}</span>
              )}
            </span>
            <span className="stat-value">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Content — same as MainScreen */}
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
              {sessionState.sessionActive ? 'Load Content' : 'Start & Load Content'}
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

      {/* Control buttons — same row structure as MainScreen */}
      <div className="control-buttons">

        {/* Tension control — occupies the climax-button slot */}
        <div className={`survival-tension-control ${!sessionState.sessionActive ? 'survival-tension-control--inactive' : ''}`}>
          <span className="survival-tension-top-label">Tension</span>
          <input
            type="range"
            min={0}
            max={100}
            value={localTension}
            onChange={handleTensionChange}
            disabled={!sessionState.sessionActive || sessionState.survivalIsPaused}
            className="survival-tension-slider"
          />
        </div>

        {/* Edge button — same slot as limit-button */}
        <button
          className="limit-button"
          onClick={onEdgeButton}
          disabled={!sessionState.sessionActive || sessionState.survivalIsPaused}
        >
          {sessionState.survivalIsPaused ? `${pauseSecondsLeft}s` : 'EDGE'}
        </button>

      </div>
    </div>
  );
}

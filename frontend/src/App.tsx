import { useState } from 'react';
import { ConnectionScreen } from './ConnectionScreen';
import { ConfigScreen } from './ConfigScreen';
import { MainScreen } from './MainScreen';
import { SurvivalScreen } from './SurvivalScreen';
import { useWebSocket } from './useWebSocket';
import { useSettings } from './useSettings';
import { getPresetForDifficulty } from './presets';
import type { DifficultyLevel } from './types';
import './App.css';

type Screen = 'connection' | 'config' | 'main';

function App() {
  const {
    connected,
    sessionState,
    connectDevice,
    startSession,
    pressLimitButton,
    toggleClimaxMode,
    sendSetTension,
    disconnect
  } = useWebSocket();

  const { settings, update } = useSettings();
  const [currentScreen, setCurrentScreen] = useState<Screen>('connection');

  if (!connected) {
    return (
      <div className="app">
        <div className="loading">Connecting to server...</div>
      </div>
    );
  }

  if (currentScreen === 'config') {
    return (
      <div className="app">
        <ConfigScreen
          onSave={(newDifficulty, newConfig) => {
            update({ difficulty: newDifficulty, phaseSpeedConfig: newConfig });
            setCurrentScreen('connection');
          }}
          onBack={() => setCurrentScreen('connection')}
          initialDifficulty={settings.difficulty}
          initialConfig={settings.phaseSpeedConfig}
          gameMode={settings.gameMode}
        />
      </div>
    );
  }

  if (!sessionState.deviceConnected) {
    return (
      <div className="app">
        <ConnectionScreen
          deviceKey={settings.deviceKey}
          onDeviceKeyChange={(key) => update({ deviceKey: key })}
          duration={settings.duration}
          onDurationChange={(d) => update({ duration: d })}
          difficulty={settings.difficulty}
          onDifficultyChange={(d: DifficultyLevel) => {
            const config = d !== 'custom' ? getPresetForDifficulty(d) : settings.phaseSpeedConfig;
            update({ difficulty: d, phaseSpeedConfig: config });
          }}
          phaseSpeedConfig={settings.phaseSpeedConfig}
          potEnabled={settings.potEnabled}
          onPotEnabledChange={(v) => update({ potEnabled: v })}
          gameMode={settings.gameMode}
          onGameModeChange={(m) => update({ gameMode: m })}
          onConnect={() => {
            connectDevice(
              settings.deviceKey.trim(),
              settings.duration,
              settings.phaseSpeedConfig,
              settings.potEnabled,
              settings.gameMode
            );
          }}
          onConfigure={() => setCurrentScreen('config')}
        />
      </div>
    );
  }

  if (sessionState.gameMode === 'survival') {
    return (
      <div className="app">
        <SurvivalScreen
          sessionState={sessionState}
          onStartSession={startSession}
          onEdgeButton={pressLimitButton}
          onSetTension={sendSetTension}
          onBack={() => {
            disconnect();
            setCurrentScreen('connection');
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <MainScreen
        sessionState={sessionState}
        onStartSession={startSession}
        onLimitButton={pressLimitButton}
        onClimaxButton={toggleClimaxMode}
        onBack={() => {
          disconnect();
          setCurrentScreen('connection');
        }}
      />
    </div>
  );
}

export default App;

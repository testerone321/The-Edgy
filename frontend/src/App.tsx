import { useState } from 'react';
import { ConnectionScreen } from './ConnectionScreen';
import { ConfigScreen } from './ConfigScreen';
import { MainScreen } from './MainScreen';
import { useWebSocket } from './useWebSocket';
import type { PhaseSpeedConfig, DifficultyLevel } from './types';
import { getPresetForDifficulty } from './presets';
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
    disconnect
  } = useWebSocket();

  const [currentScreen, setCurrentScreen] = useState<Screen>('connection');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [phaseSpeedConfig, setPhaseSpeedConfig] = useState<PhaseSpeedConfig>(
    getPresetForDifficulty('medium')
  );

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
            setDifficulty(newDifficulty);
            setPhaseSpeedConfig(newConfig);
            setCurrentScreen('connection');
          }}
          onBack={() => setCurrentScreen('connection')}
          initialDifficulty={difficulty}
          initialConfig={phaseSpeedConfig}
        />
      </div>
    );
  }

  if (!sessionState.deviceConnected) {
    return (
      <div className="app">
        <ConnectionScreen
          onConnect={(deviceKey, duration, newDifficulty, newConfig, potEnabled) => {
            setDifficulty(newDifficulty);
            setPhaseSpeedConfig(newConfig);
            connectDevice(deviceKey, duration, newConfig, potEnabled);
          }}
          onConfigure={(currentDifficulty, currentConfig) => {
            setDifficulty(currentDifficulty);
            setPhaseSpeedConfig(currentConfig);
            setCurrentScreen('config');
          }}
          initialDifficulty={difficulty}
          initialConfig={phaseSpeedConfig}
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

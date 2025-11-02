import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { Game } from './components/Game'
import { GameView } from './components/game/GameView'
import { CombatViewRoute } from './components/combat/CombatViewRoute'
import { TitleScreen } from './components/TitleScreen'
import { DevRoute } from './components/DevRoute'
import { FirstPersonView } from './components/firstperson/FirstPersonView'
import { loadAllGameData } from './data/DataLoader'
import './App.css'

function App() {
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // Load game data on mount
    loadAllGameData().then(() => {
      setDataLoaded(true);
    }).catch((error) => {
      console.error('Failed to load game data:', error);
      setDataLoaded(true); // Continue anyway
    });
  }, []);

  if (!dataLoaded) {
    return <div>Loading game data...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Main game route - now using GameView orchestrator */}
        <Route path="/" element={
          <GameView
            initialMapId="event-demo-map"
            autoLoadSave={true}
            onGameReady={() => console.log('[App] Game ready')}
          />
        } />

        {/* Legacy Game component (for backwards compatibility during migration) */}
        {import.meta.env.DEV && (
          <Route path="/legacy" element={<Game />} />
        )}

        {/* Development-only routes */}
        {import.meta.env.DEV && (
          <>
            <Route path="/combat/:encounterId" element={<CombatViewRoute />} />
            <Route path="/title" element={<TitleScreen />} />
          </>
        )}

        {/* Development-only route for developer panel */}
        {import.meta.env.DEV && (
          <Route path="/dev" element={<DevRoute />} />
        )}

        {/* Development-only route for testing first-person exploration */}
        {import.meta.env.DEV && (
          <Route path="/dev/test/:mapId" element={<FirstPersonTestRoute />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Route component for first-person test mode
 */
function FirstPersonTestRoute() {
  const { mapId } = useParams<{ mapId: string }>();

  if (!mapId) {
    return <div style={{ color: 'white', padding: '20px' }}>Error: No map ID provided</div>;
  }

  return <FirstPersonView mapId={mapId} />;
}

export default App

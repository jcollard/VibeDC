import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Game } from './components/Game'
import { CombatViewRoute } from './components/combat/CombatViewRoute'
import { TitleScreen } from './components/TitleScreen'
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
        {/* Main game route */}
        <Route path="/" element={<Game />} />

        {/* Development-only routes */}
        {import.meta.env.DEV && (
          <>
            <Route path="/combat/:encounterId" element={<CombatViewRoute />} />
            <Route path="/title" element={<TitleScreen />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App

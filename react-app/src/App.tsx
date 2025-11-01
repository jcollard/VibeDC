import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Game } from './components/Game'
import { CombatViewRoute } from './components/combat/CombatViewRoute'
import { DevRoute } from './components/DevRoute'
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

        {/* Development-only route for testing combat encounters */}
        {import.meta.env.DEV && (
          <Route path="/combat/:encounterId" element={<CombatViewRoute />} />
        )}

        {/* Development-only route for developer panel */}
        {import.meta.env.DEV && (
          <Route path="/dev" element={<DevRoute />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App

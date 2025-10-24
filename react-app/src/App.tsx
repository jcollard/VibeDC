import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Game } from './components/Game'
import { CombatViewRoute } from './components/combat/CombatViewRoute'
import { loadAllGameData } from './data/DataLoader'
import './App.css'

function App() {
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // Load game data on mount
    loadAllGameData();
    setDataLoaded(true);
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
      </Routes>
    </BrowserRouter>
  );
}

export default App

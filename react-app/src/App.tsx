import { useEffect, useState } from 'react'
import { Game } from './components/Game'
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

  return <Game />
}

export default App

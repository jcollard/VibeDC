import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FirstPersonView } from './FirstPersonView';
import { DebugPanel } from './DebugPanel';
import { parseMap } from '../utils/mapParser';
import { UserInputConfig, type PlayerAction } from '../models/UserInputConfig';
import { Player, type Direction } from '../models/Player';
import './Game.css';

interface SinglePlayerState {
  grid: string[];
  player: Player;
}

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<SinglePlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Light control state
  const [lightIntensity, setLightIntensity] = useState<number>(2.0);
  const [lightDistance, setLightDistance] = useState<number>(4);

  // Initialize input configuration
  const inputConfig = useMemo(() => UserInputConfig.load(), []);

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      try {
        // Load map
        const response = await fetch('/test.map');
        const mapText = await response.text();
        const { grid, width, height } = parseMap(mapText);

        // Find spawn point (first '.' in the grid)
        let spawnX = 1;
        let spawnY = 1;

        for (let y = 0; y < grid.length; y++) {
          for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === '.') {
              spawnX = x;
              spawnY = y;
              break;
            }
          }
          if (grid[spawnY][spawnX] === '.') break;
        }

        // Create single player
        const player = new Player('player', spawnX, spawnY, 'North', 'Player');

        setGameState({
          grid,
          player
        });

        setLoading(false);
      } catch (err) {
        console.error('Error initializing game:', err);
        setError('Failed to initialize game: ' + (err as Error).message);
        setLoading(false);
      }
    };

    initGame();
  }, []);

  // Check if a tile is walkable
  const isWalkable = useCallback((x: number, y: number, grid: string[]): boolean => {
    // Check bounds
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) {
      return false;
    }

    // Check tile type
    return grid[y][x] === '.';
  }, []);

  // Handle player action
  const handleAction = useCallback((action: PlayerAction) => {
    if (!gameState) return;

    const { player, grid } = gameState;
    let newX = player.x;
    let newY = player.y;
    let newDirection = player.direction;

    switch (action) {
      case 'moveForward': {
        const pos = player.moveForward();
        newX = pos.x;
        newY = pos.y;
        break;
      }
      case 'moveBackward': {
        const pos = player.moveBackward();
        newX = pos.x;
        newY = pos.y;
        break;
      }
      case 'strafeLeft': {
        const pos = player.strafeLeft();
        newX = pos.x;
        newY = pos.y;
        break;
      }
      case 'strafeRight': {
        const pos = player.strafeRight();
        newX = pos.x;
        newY = pos.y;
        break;
      }
      case 'turnLeft':
        newDirection = player.turnLeft();
        break;
      case 'turnRight':
        newDirection = player.turnRight();
        break;
    }

    // Validate movement (only for position changes)
    if (newX !== player.x || newY !== player.y) {
      if (!isWalkable(newX, newY, grid)) {
        return; // Invalid move, don't update state
      }
    }

    // Update player state
    const updatedPlayer = new Player(
      player.id,
      newX,
      newY,
      newDirection,
      player.name
    );

    setGameState({
      grid,
      player: updatedPlayer
    });
  }, [gameState, isWalkable]);

  // Handle keyboard input using UserInputConfig
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = inputConfig.getAction(e.key);

      if (action) {
        e.preventDefault();
        handleAction(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction, inputConfig]);

  if (loading) {
    return <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#fff'
    }}>Loading...</div>;
  }

  if (error) {
    return <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#f00'
    }}>{error}</div>;
  }

  if (!gameState) {
    return <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#fff'
    }}>Initializing...</div>;
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000'
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        maxWidth: '177.78vh', // 16:9 aspect ratio (16/9 * 100vh)
        maxHeight: '56.25vw', // 16:9 aspect ratio (9/16 * 100vw)
        position: 'relative'
      }}>
        <FirstPersonView
          playerX={gameState.player.x}
          playerY={gameState.player.y}
          direction={gameState.player.direction}
          grid={gameState.grid}
          cameraOffset={0.3}
          lightIntensity={lightIntensity}
          lightDistance={lightDistance}
        />

        <DebugPanel
          playerX={gameState.player.x}
          playerY={gameState.player.y}
          direction={gameState.player.direction}
          grid={gameState.grid}
        />
      </div>
    </div>
  );
};

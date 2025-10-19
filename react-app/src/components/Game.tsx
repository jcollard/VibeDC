import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, ensureAuth } from '../firebase';
import type { GameState } from '../types';
import { GameBoard } from './GameBoard';
import { FirstPersonView } from './FirstPersonView';
import { LightControl } from './LightControl';
import { parseMap } from '../utils/mapParser';
import { UserInputConfig, type PlayerAction } from '../models/UserInputConfig';
import './Game.css';

const GAME_ID = 'test-game';

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [movementError, setMovementError] = useState<string>('');

  // Light control state
  const [lightIntensity, setLightIntensity] = useState<number>(2.0);
  const [lightDistance, setLightDistance] = useState<number>(4);

  // Initialize input configuration
  const inputConfig = useMemo(() => UserInputConfig.load(), []);

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      try {
        // Ensure user is authenticated
        const uid = await ensureAuth();
        setPlayerId(uid);

        // Load map
        const response = await fetch('/test.map');
        const mapText = await response.text();
        const { grid, width, height } = parseMap(mapText);

        // Try to create game via Cloud Function
        const createGameFn = httpsCallable(functions, 'createGame');
        const createResult = await createGameFn({
          gameId: GAME_ID,
          grid,
          gridWidth: width,
          gridHeight: height
        });

        const createData = createResult.data as { success: boolean; alreadyExists: boolean };

        // If game already exists, join it
        if (createData.alreadyExists) {
          const joinGameFn = httpsCallable(functions, 'joinGame');
          await joinGameFn({ gameId: GAME_ID });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error initializing game:', err);
        setError('Failed to initialize game: ' + (err as Error).message);
        setLoading(false);
      }
    };

    initGame();
  }, []);

  // Subscribe to game state
  useEffect(() => {
    if (!playerId) return;

    const gameRef = doc(db, 'games', GAME_ID);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setGameState(snapshot.data() as GameState);
      }
    }, (err) => {
      console.error('Error listening to game state:', err);
      setError('Failed to connect to game');
    });

    return () => unsubscribe();
  }, [playerId]);

  // Handle player action
  const handleAction = useCallback(async (action: PlayerAction) => {
    if (!playerId || !gameState) return;

    setMovementError('');

    try {
      const performAction = httpsCallable(functions, 'performAction');
      await performAction({ gameId: GAME_ID, action });
    } catch (err: any) {
      console.error('Action error:', err);
      const errorMessage = err.message || 'Failed to perform action';
      setMovementError(errorMessage);

      // Clear error after 2 seconds
      setTimeout(() => setMovementError(''), 2000);
    }
  }, [playerId, gameState]);

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
    return <div className="game-container">Loading...</div>;
  }

  if (error) {
    return <div className="game-container error">{error}</div>;
  }

  if (!gameState) {
    return <div className="game-container">Waiting for game state...</div>;
  }

  const currentPlayer = gameState.players[playerId];

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
          playerX={currentPlayer.x}
          playerY={currentPlayer.y}
          direction={currentPlayer.direction}
          grid={gameState.grid}
          cameraOffset={0.3}
          lightIntensity={lightIntensity}
          lightDistance={lightDistance}
        />
      </div>
    </div>
  );
};

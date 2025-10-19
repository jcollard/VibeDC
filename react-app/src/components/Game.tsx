import React, { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, ensureAuth } from '../firebase';
import type { GameState, MovementDirection } from '../types';
import { GameBoard } from './GameBoard';
import { parseMap } from '../utils/mapParser';
import './Game.css';

const GAME_ID = 'test-game';

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [movementError, setMovementError] = useState<string>('');

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

  // Handle movement
  const handleMove = useCallback(async (direction: MovementDirection) => {
    if (!playerId || !gameState) return;

    setMovementError('');

    try {
      const makeMove = httpsCallable(functions, 'makeMove');
      await makeMove({ gameId: GAME_ID, direction });
    } catch (err: any) {
      console.error('Movement error:', err);
      const errorMessage = err.message || 'Failed to move';
      setMovementError(errorMessage);

      // Clear error after 2 seconds
      setTimeout(() => setMovementError(''), 2000);
    }
  }, [playerId, gameState]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleMove('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleMove('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleMove('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleMove('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

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
    <div className="game-container">
      <div className="game-header">
        <h1>VibeDC Prototype</h1>
        <div className="player-info">
          <p>Player: {currentPlayer?.name || 'Unknown'}</p>
          <p>Position: ({currentPlayer?.x}, {currentPlayer?.y})</p>
          <p>Facing: {currentPlayer?.direction || 'Unknown'}</p>
          <p className="controls">Use Arrow Keys or WASD to move</p>
        </div>
        {movementError && (
          <div className="movement-error">{movementError}</div>
        )}
      </div>

      <GameBoard gameState={gameState} currentPlayerId={playerId} />

      <div className="game-footer">
        <p>Players online: {Object.keys(gameState.players).length}</p>
      </div>
    </div>
  );
};

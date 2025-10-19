import React from 'react';
import type { GameState } from '../types';
import { gridTo2D } from '../utils/mapParser';
import './GameBoard.css';

interface GameBoardProps {
  gameState: GameState;
  currentPlayerId: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, currentPlayerId }) => {
  const { grid, players } = gameState;

  // Convert grid to 2D array for rendering
  const grid2D = gridTo2D(grid);

  // Create a map of positions to player IDs for quick lookup
  const positionMap = new Map<string, string>();
  Object.entries(players).forEach(([id, player]) => {
    const key = `${player.position.x},${player.position.y}`;
    positionMap.set(key, id);
  });

  return (
    <div className="game-board">
      {grid2D.map((row, y) => (
        <div key={y} className="grid-row">
          {row.map((tile, x) => {
            const posKey = `${x},${y}`;
            const playerId = positionMap.get(posKey);
            const isCurrentPlayer = playerId === currentPlayerId;

            return (
              <div
                key={x}
                className={`tile ${tile === '#' ? 'wall' : 'floor'} ${playerId ? 'has-player' : ''}`}
              >
                {playerId && (
                  <div className={`player ${isCurrentPlayer ? 'current-player' : 'other-player'}`}>
                    {isCurrentPlayer ? '😊' : '🧑'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

import React from 'react';
import type { GameState, CardinalDirection } from '../types';
import { gridTo2D } from '../utils/mapParser';
import './GameBoard.css';

interface GameBoardProps {
  gameState: GameState;
  currentPlayerId: string;
}

// Direction arrow symbols
const DIRECTION_ARROWS: Record<CardinalDirection, string> = {
  'North': '↑',
  'East': '→',
  'South': '↓',
  'West': '←'
};

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, currentPlayerId }) => {
  const { grid, players } = gameState;

  // Convert grid to 2D array for rendering
  const grid2D = gridTo2D(grid);

  // Create a map of positions to player data for quick lookup
  const positionMap = new Map<string, { id: string; direction: CardinalDirection }>();
  Object.entries(players).forEach(([id, player]) => {
    const key = `${player.x},${player.y}`;
    positionMap.set(key, { id, direction: player.direction });
  });

  return (
    <div className="game-board">
      {grid2D.map((row, y) => (
        <div key={y} className="grid-row">
          {row.map((tile, x) => {
            const posKey = `${x},${y}`;
            const playerData = positionMap.get(posKey);
            const isCurrentPlayer = playerData?.id === currentPlayerId;

            return (
              <div
                key={x}
                className={`tile ${tile === '#' ? 'wall' : 'floor'} ${playerData ? 'has-player' : ''}`}
              >
                {playerData && (
                  <div
                    className={`player ${isCurrentPlayer ? 'current-player' : 'other-player'}`}
                    title={`${players[playerData.id].name} facing ${playerData.direction}`}
                  >
                    <span className="player-emoji">{isCurrentPlayer ? '😊' : '🧑'}</span>
                    <span className="player-direction">{DIRECTION_ARROWS[playerData.direction]}</span>
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

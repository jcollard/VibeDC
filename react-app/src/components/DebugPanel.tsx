import React from 'react';

interface DebugPanelProps {
  playerX: number;
  playerY: number;
  direction: 'North' | 'South' | 'East' | 'West';
  grid: string[];
}

/**
 * Debug panel that shows player position and a minimap
 */
export const DebugPanel: React.FC<DebugPanelProps> = ({
  playerX,
  playerY,
  direction,
  grid
}) => {
  const dirSymbol = { North: '↑', South: '↓', East: '→', West: '←' };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '2px solid #666',
      padding: '10px',
      borderRadius: '4px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Debug Info</div>
      <div>Player: ({playerX}, {playerY})</div>
      <div>Facing: {direction}</div>
      <div style={{ marginTop: '8px' }}>
        {grid.map((row, y) => (
          <div key={y} style={{ display: 'flex', lineHeight: '14px' }}>
            {row.split('').map((cell, x) => {
              const isPlayer = x === playerX && y === playerY;
              return (
                <span
                  key={x}
                  style={{
                    width: '14px',
                    height: '14px',
                    display: 'inline-block',
                    textAlign: 'center',
                    background: isPlayer ? '#4CAF50' : (cell === '#' ? '#333' : '#666'),
                    color: isPlayer ? '#fff' : '#888',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '10px',
                    lineHeight: '14px'
                  }}
                >
                  {isPlayer ? dirSymbol[direction] : ''}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

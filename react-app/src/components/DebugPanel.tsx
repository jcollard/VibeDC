import React, { useEffect, useRef } from 'react';
import { getTileTextureMapping } from '../utils/tileTextureConfig';

interface DebugPanelProps {
  playerX: number;
  playerY: number;
  direction: 'North' | 'South' | 'East' | 'West';
  grid: string[];
}

/**
 * Debug panel that shows player position and a minimap with sprite textures
 */
export const DebugPanel: React.FC<DebugPanelProps> = ({
  playerX,
  playerY,
  direction,
  grid
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteSheetRef = useRef<HTMLImageElement | null>(null);
  const dirSymbol = { North: '↑', South: '↓', East: '→', West: '←' };

  const SPRITE_SIZE = 12; // Size of each sprite in the spritesheet
  const MINIMAP_TILE_SIZE = 14; // Size of each tile in the minimap

  // Load the spritesheet
  useEffect(() => {
    const img = new Image();
    img.src = '/tiles/world-tiles.png';
    img.onload = () => {
      spriteSheetRef.current = img;
      renderMinimap();
    };
  }, []);

  // Render the minimap whenever dependencies change
  useEffect(() => {
    renderMinimap();
  }, [playerX, playerY, direction, grid]);

  const renderMinimap = () => {
    const canvas = canvasRef.current;
    const spriteSheet = spriteSheetRef.current;
    if (!canvas || !spriteSheet || !spriteSheet.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Disable image smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false;

    // Render each tile
    grid.forEach((row, y) => {
      row.split('').forEach((cell, x) => {
        const tileMapping = getTileTextureMapping(cell);

        // Determine which sprite to use for the minimap
        // Use wallFront for walls/doors, floor for everything else
        const sprite = tileMapping.wallFront || tileMapping.floor;

        if (sprite) {
          // Calculate source coordinates in the spritesheet
          const sx = sprite.x * SPRITE_SIZE;
          const sy = sprite.y * SPRITE_SIZE;

          // Calculate destination coordinates in the minimap
          const dx = x * MINIMAP_TILE_SIZE;
          const dy = y * MINIMAP_TILE_SIZE;

          // Draw the sprite
          ctx.drawImage(
            spriteSheet,
            sx, sy, SPRITE_SIZE, SPRITE_SIZE,
            dx, dy, MINIMAP_TILE_SIZE, MINIMAP_TILE_SIZE
          );
        }
      });
    });

    // Draw player indicator on top
    const playerScreenX = playerX * MINIMAP_TILE_SIZE;
    const playerScreenY = playerY * MINIMAP_TILE_SIZE;

    // Draw semi-transparent green background for player
    ctx.fillStyle = 'rgba(76, 175, 80, 0.6)';
    ctx.fillRect(playerScreenX, playerScreenY, MINIMAP_TILE_SIZE, MINIMAP_TILE_SIZE);

    // Draw direction arrow
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      dirSymbol[direction],
      playerScreenX + MINIMAP_TILE_SIZE / 2,
      playerScreenY + MINIMAP_TILE_SIZE / 2
    );
  };

  const gridWidth = grid[0]?.length || 0;
  const gridHeight = grid.length;

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
        <canvas
          ref={canvasRef}
          width={gridWidth * MINIMAP_TILE_SIZE}
          height={gridHeight * MINIMAP_TILE_SIZE}
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            imageRendering: 'pixelated',
            imageRendering: 'crisp-edges'
          }}
        />
      </div>
    </div>
  );
};

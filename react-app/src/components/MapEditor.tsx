import React, { useEffect, useRef } from 'react';
import { getTileTextureMapping } from '../utils/tileTextureConfig';

interface MapEditorProps {
  grid: string[];
  onClose?: () => void;
}

/**
 * Map editor panel for creating and editing maps
 */
export const MapEditor: React.FC<MapEditorProps> = ({ grid, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteSheetRef = useRef<HTMLImageElement | null>(null);

  const CELL_SIZE = 24; // 24x24 pixels per cell
  const SPRITE_SIZE = 12; // Size of each sprite in the spritesheet (12x12 grid)
  const gridWidth = grid[0]?.length || 0;
  const gridHeight = grid.length;

  // Load sprite sheet
  useEffect(() => {
    const img = new Image();
    img.src = '/tiles/world-tiles.png';
    img.onload = () => {
      spriteSheetRef.current = img;
      drawMap();
    };
  }, []);

  // Redraw map when grid changes
  useEffect(() => {
    if (spriteSheetRef.current) {
      drawMap();
    }
  }, [grid]);

  const drawMap = () => {
    const canvas = canvasRef.current;
    const spriteSheet = spriteSheetRef.current;
    if (!canvas || !spriteSheet) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Draw each cell
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const tileType = grid[y][x];
        const textureMapping = getTileTextureMapping(tileType);

        // Determine which sprite to use for the map editor
        // Use wallFront for walls/doors, floor for everything else
        const spriteCoord = textureMapping.wallFront || textureMapping.floor;

        if (!spriteCoord) continue; // Skip if no sprite mapping found

        // Calculate source coordinates in the spritesheet
        const sx = spriteCoord.x * SPRITE_SIZE;
        const sy = spriteCoord.y * SPRITE_SIZE;

        // Calculate destination coordinates in the map editor
        const dx = x * CELL_SIZE;
        const dy = y * CELL_SIZE;

        // Draw the sprite
        ctx.drawImage(
          spriteSheet,
          sx, sy, SPRITE_SIZE, SPRITE_SIZE,  // Source position and size
          dx, dy, CELL_SIZE, CELL_SIZE       // Destination position and size
        );
      }
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '2px solid #666',
      padding: '10px',
      borderRadius: '4px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '300px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold' }}>Map Editor</div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            title="Close map editor"
          >
            ×
          </button>
        )}
      </div>

      <div style={{
        maxHeight: '70vh',
        overflow: 'auto',
        padding: '10px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px'
      }}>
        <canvas
          ref={canvasRef}
          width={gridWidth * CELL_SIZE}
          height={gridHeight * CELL_SIZE}
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            imageRendering: 'pixelated'
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

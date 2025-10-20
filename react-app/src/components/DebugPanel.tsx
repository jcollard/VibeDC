import React, { useEffect, useRef } from 'react';
import { getTileTextureMapping } from '../utils/tileTextureConfig';

interface DebugPanelProps {
  playerX: number;
  playerY: number;
  direction: 'North' | 'South' | 'East' | 'West';
  grid: string[];
  lightIntensity?: number;
  lightDistance?: number;
  lightYOffset?: number;
  lightDecay?: number;
  lightColor?: string;
  onLightIntensityChange?: (value: number) => void;
  onLightDistanceChange?: (value: number) => void;
  onLightYOffsetChange?: (value: number) => void;
  onLightDecayChange?: (value: number) => void;
  onLightColorChange?: (value: string) => void;
}

/**
 * Debug panel that shows player position and a minimap with sprite textures
 */
export const DebugPanel: React.FC<DebugPanelProps> = ({
  playerX,
  playerY,
  direction,
  grid,
  lightIntensity = 2.0,
  lightDistance = 4,
  lightYOffset = 0,
  lightDecay = 2,
  lightColor = '#ffddaa',
  onLightIntensityChange,
  onLightDistanceChange,
  onLightYOffsetChange,
  onLightDecayChange,
  onLightColorChange
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

      {/* Light Controls */}
      {(onLightIntensityChange || onLightDistanceChange || onLightYOffsetChange || onLightDecayChange || onLightColorChange) && (
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #666' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Light Controls</div>

          {onLightIntensityChange && (
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                Intensity: {lightIntensity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={lightIntensity}
                onChange={(e) => onLightIntensityChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {onLightDistanceChange && (
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                Distance: {lightDistance.toFixed(1)} tiles
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={lightDistance}
                onChange={(e) => onLightDistanceChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {onLightDecayChange && (
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                Decay: {lightDecay.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={lightDecay}
                onChange={(e) => onLightDecayChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {onLightColorChange && (
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                Color: {lightColor}
              </label>
              <input
                type="color"
                value={lightColor}
                onChange={(e) => onLightColorChange(e.target.value)}
                style={{ width: '100%', height: '30px', cursor: 'pointer' }}
              />
            </div>
          )}

          {onLightYOffsetChange && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                Y Offset: {lightYOffset.toFixed(1)}
              </label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={lightYOffset}
                onChange={(e) => onLightYOffsetChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

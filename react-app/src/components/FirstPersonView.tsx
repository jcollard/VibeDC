import React, { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import type { CardinalDirection } from '../types';
import { Cell } from './Cell';
import { SpriteSheetLoader } from '../utils/SpriteSheetLoader';
import { getTileTextureMapping } from '../utils/tileTextureConfig';
import './FirstPersonView.css';

interface FirstPersonViewProps {
  playerX: number;
  playerY: number;
  direction: CardinalDirection;
  grid: string[];
  cameraOffset?: number; // Offset in the forward direction (0 = centered, -0.3 = back, 0.3 = forward)
  lightIntensity?: number; // Player light intensity (0 = off, 1 = normal, 2 = bright)
  lightDistance?: number; // How far the player's light reaches (in tiles)
}

/**
 * First-person 3D viewport showing the world from the player's perspective
 */
export const FirstPersonView: React.FC<FirstPersonViewProps> = ({
  playerX,
  playerY,
  direction,
  grid,
  cameraOffset = 0.3, // Default: slightly forward in the tile
  lightIntensity = 2.0, // Default: bright light
  lightDistance = 4 // Default: 4 tiles range
}) => {
  // Spritesheet loader state
  const [spriteSheetLoader, setSpriteSheetLoader] = useState<SpriteSheetLoader | null>(null);
  const [texturesLoaded, setTexturesLoaded] = useState<boolean>(false);

  // Load spritesheet on mount
  useEffect(() => {
    const loader = new SpriteSheetLoader('/tiles/world-tiles.png', 12, 12);
    loader.load()
      .then(() => {
        setSpriteSheetLoader(loader);
        setTexturesLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load spritesheet:', error);
        // Continue without textures (will use solid colors)
        setTexturesLoaded(true);
      });

    // Cleanup on unmount
    return () => {
      if (loader) {
        loader.dispose();
      }
    };
  }, []);

  // Calculate camera position offset based on direction
  const cameraPosition = useMemo(() => {
    // Camera is offset in the Z direction (forward/backward from player perspective)
    // Positive Z offset = camera is behind center (looking forward more)
    // Negative Z offset = camera is ahead of center (looking backward more)
    return [0, 0, cameraOffset] as [number, number, number];
  }, [cameraOffset]);

  // Calculate visible cells based on player position and direction
  const visibleCells = useMemo(() => {
    const cells: Array<{ x: number; z: number; tileType: string }> = [];
    const viewDistance = 8; // How far ahead to render
    const viewWidth = 6; // How wide the view is

    for (let depth = 0; depth <= viewDistance; depth++) {
      for (let lateral = -viewWidth; lateral <= viewWidth; lateral++) {
        const gridPos = getGridPosition(playerX, playerY, direction, depth, lateral);

        // Check bounds
        if (gridPos.y < 0 || gridPos.y >= grid.length ||
            gridPos.x < 0 || gridPos.x >= grid[gridPos.y].length) {
          // Out of bounds - treat as wall
          cells.push({ x: lateral, z: depth, tileType: '#' });
          continue;
        }

        const tileType = grid[gridPos.y][gridPos.x];
        cells.push({ x: lateral, z: depth, tileType });
      }
    }

    return cells;
  }, [playerX, playerY, direction, grid]);

  // Don't render until textures are loaded (or failed to load)
  if (!texturesLoaded) {
    return (
      <div className="first-person-view" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        Loading textures...
      </div>
    );
  }

  return (
    <div className="first-person-view">
      <Canvas gl={{ antialias: false }}>
        {/* Camera offset from tile center based on facing direction */}
        <PerspectiveCamera makeDefault position={cameraPosition} fov={75} />

        {/* Ambient light - base lighting for entire scene */}
        <ambientLight intensity={0.3} />

        {/* Directional light from above - simulates sunlight/general lighting */}
        <directionalLight position={[0, 5, 2]} intensity={0.5} />

        {/* Player's light source - adjustable torch/flashlight effect */}
        <pointLight
          position={cameraPosition}
          intensity={lightIntensity}
          distance={lightDistance}
          decay={2}
          color="#ffddaa"
        />

        {/* Additional spot light for focused forward illumination */}
        {lightIntensity > 0 && (
          <spotLight
            position={cameraPosition}
            target-position={[0, 0, -5]}
            angle={Math.PI / 4}
            penumbra={0.5}
            intensity={lightIntensity * 0.8}
            distance={lightDistance * 1.5}
            decay={2}
            color="#ffddaa"
          />
        )}

        {/* Render all visible cells */}
        {visibleCells.map((cell, index) => {
          // Get texture mapping for this tile type
          const textureMapping = getTileTextureMapping(cell.tileType);
          const textures = spriteSheetLoader ? spriteSheetLoader.getTileTextures(textureMapping) : undefined;

          return (
            <Cell
              key={`${cell.x}-${cell.z}-${index}`}
              x={cell.x}
              z={cell.z}
              tileType={cell.tileType}
              textures={textures}
            />
          );
        })}

        {/* Fog for depth effect */}
        <fog attach="fog" args={['#0a0a0a', 2, 10]} />
      </Canvas>

      {/* Crosshair overlay */}
      <div className="crosshair">
        <div className="crosshair-horizontal"></div>
        <div className="crosshair-vertical"></div>
      </div>
    </div>
  );
};

/**
 * Get grid position based on relative distance and lateral offset
 */
function getGridPosition(
  playerX: number,
  playerY: number,
  direction: CardinalDirection,
  depth: number,
  lateral: number
): { x: number; y: number } {
  let gridX = playerX;
  let gridY = playerY;

  switch (direction) {
    case 'North':
      gridY -= depth;
      gridX += lateral;
      break;
    case 'South':
      gridY += depth;
      gridX -= lateral;
      break;
    case 'East':
      gridX += depth;
      gridY += lateral;
      break;
    case 'West':
      gridX -= depth;
      gridY -= lateral;
      break;
  }

  return { x: gridX, y: gridY };
}

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

  // Calculate camera position and rotation based on player position and direction
  const cameraTransform = useMemo(() => {
    // Convert grid position to world position (each tile is 1 unit)
    let worldX = playerX;
    let worldZ = playerY; // Grid Y maps directly to world Z

    // Calculate rotation (in radians) based on cardinal direction
    let rotationY = 0;
    let offsetX = 0;
    let offsetZ = 0;

    switch (direction) {
      case 'North':
        rotationY = 0; // Looking in -Z direction (North is negative grid Y)
        offsetZ = -cameraOffset; // Offset forward
        break;
      case 'South':
        rotationY = Math.PI; // Looking in +Z direction (South is positive grid Y)
        offsetZ = cameraOffset; // Offset forward
        break;
      case 'East':
        rotationY = -Math.PI / 2; // Looking in +X direction (East is positive grid X)
        offsetX = cameraOffset; // Offset forward
        break;
      case 'West':
        rotationY = Math.PI / 2; // Looking in -X direction (West is negative grid X)
        offsetX = -cameraOffset; // Offset forward
        break;
    }

    return {
      position: [worldX + offsetX, 0, worldZ + offsetZ] as [number, number, number],
      rotation: [0, rotationY, 0] as [number, number, number]
    };
  }, [playerX, playerY, direction, cameraOffset]);

  // Calculate visible cells based on player position
  // Cells are now positioned in absolute world coordinates
  const visibleCells = useMemo(() => {
    const cells: Array<{ worldX: number; worldZ: number; tileType: string }> = [];
    const viewDistance = 8; // How far in each direction to render
    const viewWidth = 6; // How wide the view is

    // Render a rectangular area around the player
    for (let gridY = playerY - viewDistance; gridY <= playerY + viewDistance; gridY++) {
      for (let gridX = playerX - viewWidth; gridX <= playerX + viewWidth; gridX++) {
        // Check bounds
        if (gridY < 0 || gridY >= grid.length ||
            gridX < 0 || gridX >= grid[gridY].length) {
          // Out of bounds - treat as wall
          cells.push({
            worldX: gridX,
            worldZ: gridY, // Grid Y maps directly to world Z
            tileType: '#'
          });
          continue;
        }

        const tileType = grid[gridY][gridX];
        cells.push({
          worldX: gridX,
          worldZ: gridY, // Grid Y maps directly to world Z
          tileType
        });
      }
    }

    return cells;
  }, [playerX, playerY, grid]);

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
        {/* Camera positioned at player's world location and rotated to face direction */}
        <PerspectiveCamera
          makeDefault
          position={cameraTransform.position}
          rotation={cameraTransform.rotation}
          fov={75}
        />

        {/* Ambient light - base lighting for entire scene */}
        <ambientLight intensity={0.3} />

        {/* Directional light from above - simulates sunlight/general lighting */}
        <directionalLight
          position={[cameraTransform.position[0], cameraTransform.position[1] + 5, cameraTransform.position[2]]}
          intensity={0.5}
        />

        {/* Player's light source - adjustable torch/flashlight effect */}
        <pointLight
          position={cameraTransform.position}
          intensity={lightIntensity}
          distance={lightDistance}
          decay={2}
          color="#ffddaa"
        />

        {/* Additional spot light for focused forward illumination */}
        {lightIntensity > 0 && (
          <spotLight
            position={cameraTransform.position}
            rotation={cameraTransform.rotation}
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
              key={`${cell.worldX}-${cell.worldZ}-${index}`}
              worldX={cell.worldX}
              worldZ={cell.worldZ}
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


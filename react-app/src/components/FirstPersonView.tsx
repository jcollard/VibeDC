import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import type { CardinalDirection } from '../types';
import { Cell } from './Cell';
import { AnimatedPerspectiveCamera, type CameraAnimationHandle } from './AnimatedPerspectiveCamera';
import { CameraLights } from './CameraLights';
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
  lightYOffset?: number; // Y offset for the light source (0 = camera height, positive = above)
  lightDecay?: number; // Light decay rate (0 = no decay, 1 = linear, 2 = inverse square)
  lightColor?: string; // Light color (hex format)
  movementDuration?: number; // Duration of camera movement animation in seconds
  rotationDuration?: number; // Duration of camera rotation animation in seconds
  onAnimationComplete?: () => void; // Callback when camera animation completes
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
  lightDistance = 4, // Default: 4 tiles range
  lightYOffset = 0, // Default: at camera height
  lightDecay = 2, // Default: inverse square falloff
  lightColor = '#ffddaa', // Default: warm torch color
  movementDuration = 0.2, // Default: 0.2 seconds
  rotationDuration = 0.1, // Default: 0.1 seconds
  onAnimationComplete
}) => {
  // Spritesheet loader state
  const [spriteSheetLoader, setSpriteSheetLoader] = useState<SpriteSheetLoader | null>(null);
  const [texturesLoaded, setTexturesLoaded] = useState<boolean>(false);

  // Camera animation ref
  const cameraRef = useRef<CameraAnimationHandle>(null);

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

  // Update camera target when player position or direction changes
  useEffect(() => {
    if (!cameraRef.current) return;

    // Simply update the target - camera will smoothly animate toward it
    cameraRef.current.updateTarget(
      cameraTransform.position,
      cameraTransform.rotation,
      movementDuration,
      rotationDuration
    );
  }, [playerX, playerY, direction, cameraTransform, movementDuration, rotationDuration]);

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
        {/* Animated camera that smoothly moves to player's position */}
        <AnimatedPerspectiveCamera
          ref={cameraRef}
          targetPosition={cameraTransform.position}
          targetRotation={cameraTransform.rotation}
          fov={75}
          onAnimationComplete={onAnimationComplete}
        />

        {/* Lights that follow the camera's animated position */}
        <CameraLights lightIntensity={lightIntensity} lightDistance={lightDistance} lightYOffset={lightYOffset} lightDecay={lightDecay} lightColor={lightColor} />

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


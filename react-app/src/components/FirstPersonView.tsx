import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
  movementDuration?: number; // Duration in seconds for movement animation (0 = instant)
}

interface CameraAnimation {
  cancel: () => void;
}

/**
 * Animated scene component that handles camera movement animation
 */
interface AnimatedSceneProps {
  targetPlayerX: number;
  targetPlayerY: number;
  direction: CardinalDirection;
  grid: string[];
  cameraOffset: number;
  lightIntensity: number;
  lightDistance: number;
  movementDuration: number;
  spriteSheetLoader: SpriteSheetLoader | null;
}

const AnimatedScene: React.FC<AnimatedSceneProps> = ({
  targetPlayerX,
  targetPlayerY,
  direction,
  grid,
  cameraOffset,
  lightIntensity,
  lightDistance,
  movementDuration,
  spriteSheetLoader
}) => {
  const cameraRef = useRef<any>(null);
  const pointLightRef = useRef<any>(null);
  const spotLightRef = useRef<any>(null);
  const currentAnimationRef = useRef<CameraAnimation | null>(null);
  const currentPositionRef = useRef({ x: targetPlayerX, y: targetPlayerY });
  const animationTicksRef = useRef<Array<{ animate: (delta: number) => void }>>([]);

  /**
   * Creates a camera animation that lerps from start to end position over duration
   */
  const createCameraAnimation = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number
  ): CameraAnimation => {
    let cancelled = false;
    let elapsed = 0;

    const animate = (delta: number) => {
      if (cancelled) return;

      elapsed += delta;
      const t = Math.min(elapsed / duration, 1);

      // Linear interpolation (no easing)
      // Lerp position
      currentPositionRef.current.x = startX + (endX - startX) * t;
      currentPositionRef.current.y = startY + (endY - startY) * t;

      // Update camera position based on current position and direction
      if (cameraRef.current) {
        updateCameraPosition();

        // Update light positions to follow camera
        if (pointLightRef.current) {
          pointLightRef.current.position.copy(cameraRef.current.position);
        }
        if (spotLightRef.current) {
          spotLightRef.current.position.copy(cameraRef.current.position);
        }
      }

      // Cancel animation when complete
      if (t >= 1) {
        cancelled = true;
        const index = animationTicksRef.current.indexOf(tickHandler);
        if (index > -1) {
          animationTicksRef.current.splice(index, 1);
        }
      }
    };

    // Register animation tick
    const tickHandler = { animate };
    animationTicksRef.current.push(tickHandler);

    return {
      cancel: () => {
        cancelled = true;
        const index = animationTicksRef.current.indexOf(tickHandler);
        if (index > -1) {
          animationTicksRef.current.splice(index, 1);
        }
      }
    };
  };

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;

    const offsetX = currentPositionRef.current.x - targetPlayerX;
    const offsetY = currentPositionRef.current.y - targetPlayerY;

    // Convert grid offset to world position offset based on direction
    // offsetX/offsetY represent how far the current animated position is from the target
    // We need to move the camera in the opposite direction
    let worldOffsetX = 0;
    let worldOffsetZ = 0;

    switch (direction) {
      case 'North':
        // Facing North: +X is right, +Y is forward
        worldOffsetX = -offsetX;  // Grid X maps to world -X
        worldOffsetZ = offsetY;   // Grid Y maps to world Z
        break;
      case 'South':
        // Facing South: +X is left, +Y is backward
        worldOffsetX = offsetX;   // Grid X maps to world X
        worldOffsetZ = -offsetY;  // Grid Y maps to world -Z
        break;
      case 'East':
        // Facing East: +X is forward, +Y is left
        worldOffsetX = offsetY;   // Grid Y maps to world X
        worldOffsetZ = offsetX;   // Grid X maps to world Z
        break;
      case 'West':
        // Facing West: +X is backward, +Y is right
        worldOffsetX = -offsetY;  // Grid Y maps to world -X
        worldOffsetZ = -offsetX;  // Grid X maps to world -Z
        break;
    }

    cameraRef.current.position.x = worldOffsetX;
    cameraRef.current.position.z = cameraOffset + worldOffsetZ;
  };

  // Handle position changes - cancel previous animation and start new one
  useEffect(() => {
    // Cancel previous animation
    if (currentAnimationRef.current) {
      currentAnimationRef.current.cancel();
      currentAnimationRef.current = null;
    }

    // Start new animation from current animated position to target position
    const startX = currentPositionRef.current.x;
    const startY = currentPositionRef.current.y;


    // Only animate if there's a difference between current and target
    if (startX === targetPlayerX && startY === targetPlayerY) {
      return;
    }

    currentAnimationRef.current = createCameraAnimation(
      startX,
      startY,
      targetPlayerX,
      targetPlayerY,
      movementDuration
    );

    // Cleanup on unmount
    return () => {
      if (currentAnimationRef.current) {
        currentAnimationRef.current.cancel();
        currentAnimationRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPlayerX, targetPlayerY, movementDuration]);

  // Animation loop
  useFrame((_state, delta) => {
    // Run all active animations
    animationTicksRef.current.forEach(tick => tick.animate(delta));
  });

  // Calculate camera position for lights
  const cameraPosition = useMemo(() => {
    return [0, 0, cameraOffset] as [number, number, number];
  }, [cameraOffset]);

  // Calculate visible cells based on TARGET position (not animated position)
  // The camera moves, but the world stays static
  // Include 1 row behind player to prevent seeing empty space during animation
  const visibleCells = useMemo(() => {
    const cells: Array<{ x: number; z: number; tileType: string }> = [];
    const viewDistance = 8;
    const viewWidth = 6;

    // Start from -1 to include one row behind the player
    for (let depth = -1; depth <= viewDistance; depth++) {
      for (let lateral = -viewWidth; lateral <= viewWidth; lateral++) {
        const gridPos = getGridPosition(targetPlayerX, targetPlayerY, direction, depth, lateral);

        if (gridPos.y < 0 || gridPos.y >= grid.length ||
            gridPos.x < 0 || gridPos.x >= grid[gridPos.y].length) {
          cells.push({ x: lateral, z: depth, tileType: '#' });
          continue;
        }

        const tileType = grid[gridPos.y][gridPos.x];
        cells.push({ x: lateral, z: depth, tileType });
      }
    }

    return cells;
  }, [targetPlayerX, targetPlayerY, direction, grid]);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={cameraPosition} fov={75} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[0, 5, 2]} intensity={0.5} />

      <pointLight
        ref={pointLightRef}
        position={cameraPosition}
        intensity={lightIntensity}
        distance={lightDistance}
        decay={2}
        color="#ffddaa"
      />

      {lightIntensity > 0 && (
        <spotLight
          ref={spotLightRef}
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

      {visibleCells.map((cell, index) => {
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

      <fog attach="fog" args={['#0a0a0a', 2, 10]} />
    </>
  );
};

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
  movementDuration = 0.2 // DEBUG: Set to 2 seconds for debugging
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
        <AnimatedScene
          targetPlayerX={playerX}
          targetPlayerY={playerY}
          direction={direction}
          grid={grid}
          cameraOffset={cameraOffset}
          lightIntensity={lightIntensity}
          lightDistance={lightDistance}
          movementDuration={movementDuration}
          spriteSheetLoader={spriteSheetLoader}
        />
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

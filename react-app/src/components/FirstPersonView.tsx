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


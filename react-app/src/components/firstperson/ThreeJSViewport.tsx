import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import type { CardinalDirection } from '../../types';
import { Cell } from '../Cell';
import { AnimatedPerspectiveCamera, type CameraAnimationHandle } from '../AnimatedPerspectiveCamera';
import { CameraLights } from '../CameraLights';
import { SpriteSheetLoader } from '../../utils/SpriteSheetLoader';
import { getTileTextureMapping } from '../../utils/tileTextureConfig';
import type { AreaMap } from '../../models/area/AreaMap';

interface ThreeJSViewportProps {
  areaMap: AreaMap;
  playerX: number;
  playerY: number;
  direction: CardinalDirection;
  width: number; // Render width in pixels
  height: number; // Render height in pixels
  onAnimationComplete?: () => void;
}

/**
 * 3D first-person viewport using React Three Fiber
 * Renders within a constrained region (Map Panel)
 */
export const ThreeJSViewport: React.FC<ThreeJSViewportProps> = ({
  areaMap,
  playerX,
  playerY,
  direction,
  width,
  height,
  onAnimationComplete
}) => {
  // Sprite sheet loader
  const [spriteSheetLoader, setSpriteSheetLoader] = React.useState<SpriteSheetLoader | null>(null);
  const [texturesLoaded, setTexturesLoaded] = React.useState<boolean>(false);

  // Camera ref
  const cameraRef = useRef<CameraAnimationHandle>(null);

  // Load sprite sheet (tileset sprites)
  useEffect(() => {
    // TODO: Load tileset sprites based on areaMap.tilesetId
    const loader = new SpriteSheetLoader('/tiles/world-tiles.png', 12, 12);
    loader.load()
      .then(() => {
        setSpriteSheetLoader(loader);
        setTexturesLoaded(true);
      })
      .catch((error) => {
        console.error('[ThreeJSViewport] Failed to load spritesheet:', error);
        setTexturesLoaded(true); // Continue without textures
      });

    return () => {
      if (loader) {
        loader.dispose();
      }
    };
  }, [areaMap.tilesetId]);

  // Calculate camera transform
  const cameraTransform = useMemo(() => {
    const cameraOffset = 0.3; // Slightly forward in tile
    let worldX = playerX;
    let worldZ = playerY;

    let rotationY = 0;
    let offsetX = 0;
    let offsetZ = 0;

    switch (direction) {
      case 'North':
        rotationY = 0;
        offsetZ = -cameraOffset;
        break;
      case 'South':
        rotationY = Math.PI;
        offsetZ = cameraOffset;
        break;
      case 'East':
        rotationY = -Math.PI / 2;
        offsetX = cameraOffset;
        break;
      case 'West':
        rotationY = Math.PI / 2;
        offsetX = -cameraOffset;
        break;
    }

    return {
      position: [worldX + offsetX, 0, worldZ + offsetZ] as [number, number, number],
      rotation: [0, rotationY, 0] as [number, number, number]
    };
  }, [playerX, playerY, direction]);

  // Update camera target when player moves
  useEffect(() => {
    if (!cameraRef.current) return;

    cameraRef.current.updateTarget(
      cameraTransform.position,
      cameraTransform.rotation,
      0.2, // movement duration
      0.1  // rotation duration
    );
  }, [playerX, playerY, direction, cameraTransform]);

  // Calculate visible cells from AreaMap
  const visibleCells = useMemo(() => {
    const cells: Array<{ worldX: number; worldZ: number; tileType: string }> = [];
    const viewDistance = 8;
    const viewWidth = 6;

    for (let gridY = playerY - viewDistance; gridY <= playerY + viewDistance; gridY++) {
      for (let gridX = playerX - viewWidth; gridX <= playerX + viewWidth; gridX++) {
        // Get tile from AreaMap
        const tile = areaMap.getTile(gridX, gridY);

        if (!tile) {
          // Out of bounds - render as wall
          cells.push({ worldX: gridX, worldZ: gridY, tileType: '#' });
          continue;
        }

        // Map tile behavior to character for texture lookup
        // Use behavior to determine tile type
        let tileType = '.'; // Default floor

        if (!tile.passable) {
          tileType = '#'; // Wall
        } else if (tile.behavior === 'door') {
          tileType = '+'; // Door
        } else if (tile.walkable) {
          tileType = '.'; // Floor
        }

        cells.push({ worldX: gridX, worldZ: gridY, tileType });
      }
    }

    return cells;
  }, [playerX, playerY, areaMap]);

  if (!texturesLoaded) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }}>
        Loading textures...
      </div>
    );
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      <Canvas gl={{ antialias: false }} style={{ width: '100%', height: '100%' }}>
        <AnimatedPerspectiveCamera
          ref={cameraRef}
          targetPosition={cameraTransform.position}
          targetRotation={cameraTransform.rotation}
          fov={75}
          onAnimationComplete={onAnimationComplete}
        />

        <CameraLights
          lightIntensity={2.0}
          lightDistance={4}
          lightYOffset={0}
          lightDecay={2}
          lightColor="#ffddaa"
        />

        {visibleCells.map((cell, index) => {
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

        <fog attach="fog" args={['#0a0a0a', 2, 10]} />
      </Canvas>

      {/* Crosshair overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute',
          width: '16px',
          height: '2px',
          background: 'rgba(255, 255, 255, 0.7)',
          left: '-8px',
          top: '-1px'
        }} />
        <div style={{
          position: 'absolute',
          width: '2px',
          height: '16px',
          background: 'rgba(255, 255, 255, 0.7)',
          left: '-1px',
          top: '-8px'
        }} />
      </div>
    </div>
  );
};

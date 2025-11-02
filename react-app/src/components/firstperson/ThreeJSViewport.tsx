import React, { useRef, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import type { CardinalDirection } from '../../types';
import { Cell } from '../Cell';
import { AnimatedPerspectiveCamera, type CameraAnimationHandle } from '../AnimatedPerspectiveCamera';
import { CameraLights } from '../CameraLights';
import { SpriteSheetLoader } from '../../utils/SpriteSheetLoader';
import type { TileTextureMapping, SpriteCoordinates } from '../../utils/SpriteSheetLoader';
import { TileSetTextureMapper } from '../../utils/TileSetTextureMapper';
import { AreaMapTileSetRegistry } from '../../utils/AreaMapTileSetRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
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

export interface ThreeJSViewportHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

/**
 * 3D first-person viewport using React Three Fiber
 * Renders to an offscreen canvas that can be composited onto the main canvas
 */
export const ThreeJSViewport = forwardRef<ThreeJSViewportHandle, ThreeJSViewportProps>(({
  areaMap,
  playerX,
  playerY,
  direction,
  width,
  height,
  onAnimationComplete
}, ref) => {
  // Sprite sheet loader
  const [spriteSheetLoader, setSpriteSheetLoader] = React.useState<SpriteSheetLoader | null>(null);
  const [texturesLoaded, setTexturesLoaded] = React.useState<boolean>(false);

  // Camera offset state (for developer adjustment)
  const [cameraOffset, setCameraOffset] = React.useState<number>(-0.3);

  // Camera ref
  const cameraRef = useRef<CameraAnimationHandle>(null);

  // Container ref to access the canvas
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose getCanvas method to parent
  useImperativeHandle(ref, () => ({
    getCanvas: () => {
      // Find the canvas element created by React Three Fiber
      const canvas = containerRef.current?.querySelector('canvas');
      return canvas || null;
    }
  }));

  // Load sprite sheet and texture mappings from tileset
  useEffect(() => {
    const loadTilesetAssets = async () => {
      // Get the tileset from registry
      const tileset = AreaMapTileSetRegistry.getById(areaMap.tilesetId);
      if (!tileset) {
        console.error(`[ThreeJSViewport] Tileset '${areaMap.tilesetId}' not found in registry`);
        setTexturesLoaded(true); // Continue without textures
        return;
      }

      // Get sprite sheet path from tileset
      const spriteSheetPath = TileSetTextureMapper.getSpriteSheetPath(tileset);
      console.log(`[ThreeJSViewport] Loading sprite sheet: ${spriteSheetPath} for tileset: ${tileset.name}`);

      // Load sprite sheet
      const loader = new SpriteSheetLoader(spriteSheetPath, 12, 12);
      try {
        await loader.load();
        setSpriteSheetLoader(loader);
        setTexturesLoaded(true);
        console.log(`[ThreeJSViewport] Successfully loaded sprite sheet for tileset: ${tileset.name}`);
      } catch (error) {
        console.error('[ThreeJSViewport] Failed to load spritesheet:', error);
        setTexturesLoaded(true); // Continue without textures
      }
    };

    loadTilesetAssets();

    return () => {
      if (spriteSheetLoader) {
        spriteSheetLoader.dispose();
      }
    };
  }, [areaMap.tilesetId]);

  // Calculate camera transform
  const cameraTransform = useMemo(() => {
    let worldX = playerX;
    let worldZ = playerY;

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

  // Expose developer function to window
  useEffect(() => {
    // @ts-ignore - Developer function
    window.setOffset = (n: number) => {
      console.log(`[ThreeJSViewport] Setting camera offset to ${n}`);
      setCameraOffset(n);
    };

    return () => {
      // @ts-ignore
      delete window.setOffset;
    };
  }, []);

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
    const cells: Array<{ worldX: number; worldZ: number; spriteId: string; behavior: string }> = [];
    const viewDistance = 8;
    const viewWidth = 6;

    for (let gridY = playerY - viewDistance; gridY <= playerY + viewDistance; gridY++) {
      for (let gridX = playerX - viewWidth; gridX <= playerX + viewWidth; gridX++) {
        // Get tile from AreaMap
        const tile = areaMap.getTile(gridX, gridY);

        if (!tile) {
          // Out of bounds - use default wall sprite from first wall tile in tileset
          // This will be handled in the rendering section
          cells.push({ worldX: gridX, worldZ: gridY, spriteId: 'out-of-bounds', behavior: 'wall' });
          continue;
        }

        // Use the tile's spriteId and behavior from AreaMap
        cells.push({
          worldX: gridX,
          worldZ: gridY,
          spriteId: tile.spriteId,
          behavior: tile.behavior
        });
      }
    }

    return cells;
  }, [playerX, playerY, areaMap]);

  if (!texturesLoaded) {
    return (
      <div ref={containerRef} style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', position: 'absolute', left: '-9999px' }}>
        Loading textures...
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width, height, position: 'absolute', left: '-9999px', top: 0 }}>
      <Canvas gl={{ antialias: false }} style={{ width: '100%', height: '100%', display: 'block' }}>
        <AnimatedPerspectiveCamera
          ref={cameraRef}
          targetPosition={cameraTransform.position}
          targetRotation={cameraTransform.rotation}
          fov={75}
          onAnimationComplete={onAnimationComplete}
        />

        <CameraLights
          lightIntensity={3.0}
          lightDistance={6}
          lightYOffset={0}
          lightDecay={0.5}
          lightColor="#ffddaa"
        />

        {visibleCells.map((cell, index) => {
          // Get sprite coordinates from spriteId
          let textureMapping: TileTextureMapping | undefined;

          if (cell.spriteId === 'out-of-bounds') {
            // Use first wall tile from tileset for out-of-bounds tiles
            const tileset = AreaMapTileSetRegistry.getById(areaMap.tilesetId);
            const wallTile = tileset?.tileTypes.find(t => t.behavior === 'wall');
            if (wallTile) {
              textureMapping = TileSetTextureMapper.createMappingForTile(tileset!, wallTile.char);
            }
          } else {
            // Look up sprite in SpriteRegistry
            const sprite = SpriteRegistry.getById(cell.spriteId);
            if (sprite) {
              const spriteCoords: SpriteCoordinates = { x: sprite.x, y: sprite.y };

              // Create texture mapping based on tile behavior
              textureMapping = {
                floor: spriteCoords,
                ceiling: spriteCoords,
              };

              // Walls get wall textures on all 4 sides
              if (cell.behavior === 'wall') {
                textureMapping.wallFront = spriteCoords;
                textureMapping.wallBack = spriteCoords;
                textureMapping.wallLeft = spriteCoords;
                textureMapping.wallRight = spriteCoords;
              }
            }
          }

          const textures = spriteSheetLoader && textureMapping
            ? spriteSheetLoader.getTileTextures(textureMapping)
            : undefined;

          return (
            <Cell
              key={`${cell.worldX}-${cell.worldZ}-${index}`}
              worldX={cell.worldX}
              worldZ={cell.worldZ}
              tileType={cell.behavior}
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
});

ThreeJSViewport.displayName = 'ThreeJSViewport';

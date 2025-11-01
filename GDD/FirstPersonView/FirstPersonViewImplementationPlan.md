# First Person View - Implementation Plan

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [FirstPersonViewOverview.md](./FirstPersonViewOverview.md), [AreaMapSystemOverview.md](./AreaMap/AreaMapSystemOverview.md), [CombatView.tsx](../../react-app/src/components/combat/CombatView.tsx), [GeneralGuidelines.md](../../GeneralGuidelines.md)

---

## Purpose

This document provides a detailed, step-by-step implementation plan for the First Person View mode - a grid-based first-person dungeon exploration system that uses the same UI layout structure as the combat system but with a 3D viewport for navigation.

## Goals

1. **Reuse combat layout system** - Use CombatLayoutManager's 5-panel structure
2. **Integrate 3D viewport** - Port existing FirstPersonView.tsx 3D rendering into Map Panel region
3. **Connect to AreaMap system** - Use AreaMap for navigation, collision, interactive objects
4. **Follow project patterns** - Adhere to GeneralGuidelines.md for rendering, state management, performance
5. **Create test route** - Add `/dev/test/:mapId` for testing individual maps

## Prerequisites

**✅ Already Complete:**
- Area Map System (AreaMap, AreaMapTileSet, registries, YAML loaders, visual editor)
- Combat layout system (CombatLayoutManager with 5 regions)
- Existing 3D viewport prototype (FirstPersonView.tsx with React Three Fiber)
- Sprite loading system (SpriteAssetLoader)
- Font rendering system (FontAtlasRenderer)

**📋 Required for This Implementation:**
- First person input handler (WASD movement, rotation)
- First person state management (player position, direction, explored tiles)
- Minimap renderer (top-down view with fog of war)
- Player stats panel renderer
- Interaction system (doors, chests, NPCs)

---

## Architecture Overview

### Component Structure

```
FirstPersonView.tsx (main container, equivalent to CombatView.tsx)
├── State Management
│   ├── FirstPersonState (player position, direction, map, inventory, etc.)
│   └── FirstPersonInputHandler (keyboard input processing)
│
├── Rendering Pipeline
│   ├── Canvas (384×216, double buffered)
│   ├── FirstPersonLayoutManager (5 panel regions, reuses CombatLayoutManager pattern)
│   ├── ThreeJSViewportRenderer (3D map viewport in Map Panel region)
│   ├── MinimapRenderer (top-down view in Top Info Panel)
│   ├── PlayerStatsPanel (HP/MP/level in Bottom Info Panel)
│   └── CombatLogManager (reused from combat system)
│
└── Systems
    ├── MovementValidator (collision detection using AreaMap)
    ├── InteractionHandler (doors, chests, NPCs)
    └── EncounterTriggerSystem (transition to combat)
```

### Data Flow

```
User Input (WASD/E)
  → FirstPersonInputHandler
  → MovementValidator (checks AreaMap.isPassable/isWalkable)
  → Update FirstPersonState (position, direction)
  → ThreeJSViewportRenderer (animate camera)
  → MinimapRenderer (update explored tiles)
  → CombatLogManager (log movement messages)
```

---

## Implementation Tasks

### Phase 1: Core State & Input (Foundation)

**Goal:** Establish state management and basic input handling without rendering.

#### Task 1.1: Create FirstPersonState Interface
**File:** `react-app/src/models/firstperson/FirstPersonState.ts`

**Changes:**
```typescript
import type { AreaMap } from '../area/AreaMap';
import type { CardinalDirection } from '../../types';
import type { CombatUnit } from '../combat/CombatUnit';

/**
 * First person navigation state
 */
export interface FirstPersonState {
  /**
   * Player position on the grid (X coordinate)
   */
  playerX: number;

  /**
   * Player position on the grid (Y coordinate)
   */
  playerY: number;

  /**
   * Player facing direction
   */
  direction: CardinalDirection;

  /**
   * Current area map being explored
   */
  map: AreaMap;

  /**
   * Set of explored tile coordinates "x,y"
   * Used for minimap fog of war
   */
  exploredTiles: Set<string>;

  /**
   * Player stats (HP, MP, level, XP)
   */
  stats: PlayerStats;

  /**
   * Player inventory items
   */
  inventory: InventoryItem[];

  /**
   * Active bottom panel mode
   */
  activePanel: 'stats' | 'inventory' | 'interaction';

  /**
   * Currently targeted interactive object (if any)
   */
  targetedObject: InteractiveObject | null;
}

/**
 * Player stats for display
 */
export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  experience: number;
  experienceToNext: number;
  statusEffects: StatusEffect[];
}

/**
 * Inventory item
 */
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  spriteId: string;
}

/**
 * Status effect
 */
export interface StatusEffect {
  id: string;
  name: string;
  duration: number; // turns remaining
  spriteId: string;
}
```

**Rationale:** Defines the core state structure for first-person navigation. Follows combat system's state pattern.

---

#### Task 1.2: Create FirstPersonInputHandler
**File:** `react-app/src/services/FirstPersonInputHandler.ts`

**Changes:**
```typescript
import type { CardinalDirection } from '../types';

/**
 * Input command types
 */
export const InputCommand = {
  MoveForward: 'move-forward',
  MoveBackward: 'move-backward',
  TurnLeft: 'turn-left',
  TurnRight: 'turn-right',
  Interact: 'interact',
  ToggleInventory: 'toggle-inventory',
} as const;

export type InputCommand = typeof InputCommand[keyof typeof InputCommand];

/**
 * Input handler for first-person navigation
 */
export class FirstPersonInputHandler {
  private inputBlocked: boolean = false;

  /**
   * Process keyboard input and return command (if any)
   */
  processKeyDown(event: KeyboardEvent): InputCommand | null {
    if (this.inputBlocked) return null;

    const key = event.key.toLowerCase();

    // Movement
    if (key === 'w' || key === 'arrowup') return InputCommand.MoveForward;
    if (key === 's' || key === 'arrowdown') return InputCommand.MoveBackward;
    if (key === 'a' || key === 'arrowleft') return InputCommand.TurnLeft;
    if (key === 'd' || key === 'arrowright') return InputCommand.TurnRight;

    // Interaction
    if (key === ' ' || key === 'e') return InputCommand.Interact;

    // Inventory
    if (key === 'i') return InputCommand.ToggleInventory;

    return null;
  }

  /**
   * Block input (during animations, cinematics)
   */
  blockInput(): void {
    this.inputBlocked = true;
  }

  /**
   * Unblock input
   */
  unblockInput(): void {
    this.inputBlocked = false;
  }

  /**
   * Check if input is blocked
   */
  isInputBlocked(): boolean {
    return this.inputBlocked;
  }

  /**
   * Calculate new direction after turning
   */
  static calculateNewDirection(current: CardinalDirection, turn: 'left' | 'right'): CardinalDirection {
    const directions: CardinalDirection[] = ['North', 'East', 'South', 'West'];
    const currentIndex = directions.indexOf(current);

    if (turn === 'left') {
      return directions[(currentIndex + 3) % 4]; // -1 with wrap
    } else {
      return directions[(currentIndex + 1) % 4]; // +1 with wrap
    }
  }

  /**
   * Calculate target position after moving forward/backward
   */
  static calculateTargetPosition(
    x: number,
    y: number,
    direction: CardinalDirection,
    moveForward: boolean
  ): { x: number; y: number } {
    const multiplier = moveForward ? 1 : -1;

    switch (direction) {
      case 'North':
        return { x, y: y - multiplier }; // North is negative Y
      case 'South':
        return { x, y: y + multiplier }; // South is positive Y
      case 'East':
        return { x: x + multiplier, y }; // East is positive X
      case 'West':
        return { x: x - multiplier, y }; // West is negative X
    }
  }
}
```

**Rationale:** Handles keyboard input and provides utility functions for movement/rotation calculations. Follows CombatInputHandler pattern.

---

#### Task 1.3: Create MovementValidator
**File:** `react-app/src/services/MovementValidator.ts`

**Changes:**
```typescript
import type { AreaMap } from '../models/area/AreaMap';
import type { CardinalDirection } from '../types';
import { InteractiveObjectType } from '../models/area/InteractiveObject';

/**
 * Movement validation result
 */
export interface MovementResult {
  success: boolean;
  reason?: string;
  finalX?: number;
  finalY?: number;
  passThroughDoor?: boolean;
  doorX?: number;
  doorY?: number;
  interactiveObject?: any; // InteractiveObject type
}

/**
 * Validates player movement on AreaMap
 */
export class MovementValidator {
  /**
   * Validate if player can move from current position in given direction
   */
  static validateMovement(
    areaMap: AreaMap,
    currentX: number,
    currentY: number,
    direction: CardinalDirection
  ): MovementResult {
    // Calculate target position
    const [dx, dy] = this.getDirectionOffset(direction);
    const targetX = currentX + dx;
    const targetY = currentY + dy;

    // Check if target is in bounds
    if (!areaMap.isInBounds(targetX, targetY)) {
      return {
        success: false,
        reason: 'Out of bounds',
      };
    }

    // Check if target is passable
    if (!areaMap.isPassable(targetX, targetY)) {
      // Check for closed door that can be opened
      const obj = areaMap.getInteractiveObjectAt(targetX, targetY);
      if (obj?.type === InteractiveObjectType.ClosedDoor) {
        return {
          success: false,
          reason: 'Door is closed',
          interactiveObject: obj,
        };
      }

      return {
        success: false,
        reason: 'Tile is not passable',
      };
    }

    // Check if target is a door tile (auto-continue)
    if (areaMap.isDoorTile(targetX, targetY)) {
      // Player moves through door and continues to next tile
      const nextX = targetX + dx;
      const nextY = targetY + dy;

      // Validate next tile after door
      if (!areaMap.isInBounds(nextX, nextY)) {
        return {
          success: false,
          reason: 'Door leads out of bounds',
        };
      }

      if (!areaMap.isWalkable(nextX, nextY)) {
        return {
          success: false,
          reason: 'Cannot stop after passing through door',
        };
      }

      // Success: Move through door to next tile
      return {
        success: true,
        finalX: nextX,
        finalY: nextY,
        passThroughDoor: true,
        doorX: targetX,
        doorY: targetY,
      };
    }

    // Normal floor tile - can stop here
    if (areaMap.isWalkable(targetX, targetY)) {
      return {
        success: true,
        finalX: targetX,
        finalY: targetY,
        passThroughDoor: false,
      };
    }

    // Fallback: not walkable
    return {
      success: false,
      reason: 'Tile is not walkable',
    };
  }

  private static getDirectionOffset(direction: CardinalDirection): [number, number] {
    switch (direction) {
      case 'North': return [0, -1];
      case 'South': return [0, 1];
      case 'East': return [1, 0];
      case 'West': return [-1, 0];
    }
  }
}
```

**Rationale:** Encapsulates movement validation logic using AreaMap tile behaviors. Handles door auto-continuation.

---

### Phase 2: Layout & Rendering Structure

**Goal:** Set up the canvas rendering pipeline and layout system.

#### Task 2.1: Create FirstPersonLayoutManager
**File:** `react-app/src/models/firstperson/layouts/FirstPersonLayoutManager.ts`

**Changes:**
```typescript
import { CombatLayoutManager } from '../../combat/layouts/CombatLayoutManager';

/**
 * Layout manager for first-person view
 * Reuses CombatLayoutManager's 5-panel structure
 */
export class FirstPersonLayoutManager extends CombatLayoutManager {
  constructor() {
    super();
    // Inherits all layout regions from CombatLayoutManager:
    // - Top Panel (location name, dungeon level)
    // - Map Panel (3D viewport)
    // - Combat Log
    // - Top Info Panel (minimap)
    // - Bottom Info Panel (player stats / inventory / interaction prompt)
  }

  /**
   * Override getMapClipRegion if needed for first-person viewport
   * (May need slightly different clipping for 3D canvas)
   */
  // ... (implement overrides only if needed)
}
```

**Rationale:** Reuses combat layout system for consistency. Only overrides if first-person needs different behavior.

---

#### Task 2.2: Create FirstPersonView Component (Skeleton)
**File:** `react-app/src/components/firstperson/FirstPersonView.tsx`

**Changes:**
```typescript
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { FirstPersonState } from '../../models/firstperson/FirstPersonState';
import type { AreaMap } from '../../models/area/AreaMap';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { FirstPersonInputHandler } from '../../services/FirstPersonInputHandler';
import { MovementValidator } from '../../services/MovementValidator';
import { CombatConstants } from '../../models/combat/CombatConstants';
import { SpriteAssetLoader } from '../../services/SpriteAssetLoader';
import { FontAtlasLoader } from '../../services/FontAtlasLoader';
import { CombatLogManager } from '../../models/combat/CombatLogManager';
import { FirstPersonLayoutManager } from '../../models/firstperson/layouts/FirstPersonLayoutManager';
import { UISettings } from '../../config/UISettings';

interface FirstPersonViewProps {
  mapId: string; // AreaMap ID to load
}

const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH; // 384
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT; // 216
const TILE_SIZE = CombatConstants.TILE_SIZE; // 12

/**
 * First Person View component for dungeon exploration
 * Uses same UI layout as CombatView but with 3D viewport in map panel
 */
export const FirstPersonView: React.FC<FirstPersonViewProps> = ({ mapId }) => {
  // Load area map
  const areaMap = useMemo(() => {
    const map = AreaMapRegistry.getById(mapId);
    if (!map) {
      console.error(`[FirstPersonView] Area map '${mapId}' not found`);
      return null;
    }
    return map;
  }, [mapId]);

  // Initialize state
  const [firstPersonState, setFirstPersonState] = useState<FirstPersonState | null>(() => {
    if (!areaMap) return null;

    return {
      playerX: areaMap.playerSpawn.x,
      playerY: areaMap.playerSpawn.y,
      direction: areaMap.playerSpawn.direction,
      map: areaMap,
      exploredTiles: new Set([`${areaMap.playerSpawn.x},${areaMap.playerSpawn.y}`]),
      stats: {
        hp: 50,
        maxHp: 50,
        mp: 20,
        maxMp: 20,
        level: 1,
        experience: 0,
        experienceToNext: 100,
        statusEffects: [],
      },
      inventory: [],
      activePanel: 'stats',
      targetedObject: null,
    };
  });

  // Input handler
  const inputHandler = useMemo(() => new FirstPersonInputHandler(), []);

  // Sprite/font loaders
  const spriteLoader = useMemo(() => new SpriteAssetLoader(), []);
  const fontLoader = useMemo(() => new FontAtlasLoader(), []);

  // Combat log manager (reused)
  const combatLogManager = useMemo(() => new CombatLogManager({
    maxMessages: 100,
    bufferLines: 21,
    lineHeight: 8,
    defaultColor: '#ffffff',
  }), []);

  // Layout manager
  const layoutManager = useMemo(() => new FirstPersonLayoutManager(), []);

  // Canvas refs
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Track loaded sprites/fonts
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Animation timing
  const lastFrameTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Track window size for scaling
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track canvas display style for integer scaling
  const [canvasDisplayStyle, setCanvasDisplayStyle] = useState<{ width: string; height: string }>({
    width: '100%',
    height: '100%',
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate canvas display dimensions based on integer scaling
  useEffect(() => {
    const updateCanvasStyle = () => {
      const containerRef = displayCanvasRef.current?.parentElement;
      if (!containerRef) {
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
        return;
      }

      const scaledDimensions = UISettings.getIntegerScaledDimensions(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        containerRef.clientWidth,
        containerRef.clientHeight
      );

      if (scaledDimensions) {
        setCanvasDisplayStyle({
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
        });
      } else {
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
      }
    };

    updateCanvasStyle();
    requestAnimationFrame(updateCanvasStyle);
  }, [windowSize.width, windowSize.height]);

  // Load sprites and fonts
  useEffect(() => {
    if (!areaMap) return;

    const loadAssets = async () => {
      // Load sprites (tileset sprites)
      // TODO: Load sprites for the current tileset
      setSpritesLoaded(true);

      // Load fonts
      await fontLoader.loadAll(['7px-04b03', '15px-dungeonslant']);
    };

    loadAssets().catch(console.error);
  }, [areaMap, spriteLoader, fontLoader]);

  // Render frame function
  const renderFrame = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas || !spritesLoaded || !firstPersonState) {
      return;
    }

    // Create or get the buffer canvas
    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
    }
    const bufferCanvas = bufferCanvasRef.current;

    bufferCanvas.width = CANVAS_WIDTH;
    bufferCanvas.height = CANVAS_HEIGHT;
    displayCanvas.width = CANVAS_WIDTH;
    displayCanvas.height = CANVAS_HEIGHT;

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // TODO: Render 3D viewport in map panel region
    // TODO: Render minimap in top info panel
    // TODO: Render player stats in bottom info panel
    // TODO: Render combat log
    // TODO: Render top panel (location name)

    // Copy buffer to display
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      displayCtx.imageSmoothingEnabled = false;
      displayCtx.drawImage(bufferCanvas, 0, 0);
    }
  }, [spritesLoaded, firstPersonState]);

  // Animation loop
  useEffect(() => {
    if (!spritesLoaded || !firstPersonState) return;

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      // Update combat log animations
      combatLogManager.update(deltaTime);

      // Render frame
      renderFrame();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [spritesLoaded, firstPersonState, renderFrame, combatLogManager]);

  // Handle keyboard input
  useEffect(() => {
    if (!firstPersonState) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const command = inputHandler.processKeyDown(event);
      if (!command) return;

      // TODO: Process commands (movement, rotation, interaction)
      console.log('[FirstPersonView] Command:', command);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [firstPersonState, inputHandler]);

  // Show error if map not found
  if (!areaMap || !firstPersonState) {
    return (
      <div style={{ color: 'white', padding: '20px' }}>
        Error: Area map '{mapId}' not found
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '177.78vh',
          maxHeight: '56.25vw',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <canvas
          ref={displayCanvasRef}
          style={{
            ...canvasDisplayStyle,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            cursor: 'default',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};
```

**Rationale:** Creates the main component structure following CombatView.tsx patterns. Skeleton for now - will add rendering systems in later phases.

---

### Phase 3: 3D Viewport Integration

**Goal:** Integrate React Three Fiber 3D rendering into the Map Panel region.

#### Task 3.1: Create ThreeJSViewportRenderer (Wrapper Component)
**File:** `react-app/src/components/firstperson/ThreeJSViewport.tsx`

**Changes:**
```typescript
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import type { CardinalDirection } from '../../types';
import { Cell } from '../Cell'; // Reuse existing Cell component
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

  // Calculate visible cells
  const visibleCells = useMemo(() => {
    const cells: Array<{ worldX: number; worldZ: number; tileType: string }> = [];
    const viewDistance = 8;
    const viewWidth = 6;
    const grid = areaMap.grid; // FIXME: AreaMap doesn't expose grid directly - need to add getter

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
        // FIXME: Need to expose tile character from AreaMap or store in AreaMapTile
        const tileType = '#'; // Placeholder - will need proper mapping
        cells.push({ worldX: gridX, worldZ: gridY, tileType });
      }
    }

    return cells;
  }, [playerX, playerY, areaMap]);

  if (!texturesLoaded) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
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
```

**Rationale:** Wraps existing FirstPersonView.tsx 3D rendering in a component that can be embedded in the Map Panel. Reuses Cell, AnimatedPerspectiveCamera, and CameraLights components.

**FIXME Notes:**
1. AreaMap doesn't expose grid directly - need to add `getGrid()` method or expose tile characters
2. AreaMapTile needs to store original character or provide mapping back to character for texture lookup

---

### Phase 4: Minimap & Player Stats Panels

**Goal:** Implement minimap and player stats panel renderers.

#### Task 4.1: Create MinimapRenderer
**File:** `react-app/src/models/firstperson/rendering/MinimapRenderer.ts`

**Changes:**
```typescript
import type { AreaMap } from '../../area/AreaMap';
import type { CardinalDirection } from '../../../types';

/**
 * Renders top-down minimap with fog of war
 */
export class MinimapRenderer {
  /**
   * Render minimap in the given region
   */
  static render(
    ctx: CanvasRenderingContext2D,
    areaMap: AreaMap,
    playerX: number,
    playerY: number,
    direction: CardinalDirection,
    exploredTiles: Set<string>,
    regionX: number,
    regionY: number,
    regionWidth: number,
    regionHeight: number
  ): void {
    ctx.save();

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(regionX, regionY, regionWidth, regionHeight);

    // Calculate tile size for minimap
    const mapWidth = areaMap.width;
    const mapHeight = areaMap.height;
    const tileSize = Math.min(
      Math.floor(regionWidth / mapWidth),
      Math.floor(regionHeight / mapHeight)
    );

    // Center the map in the region
    const mapPixelWidth = mapWidth * tileSize;
    const mapPixelHeight = mapHeight * tileSize;
    const offsetX = regionX + Math.floor((regionWidth - mapPixelWidth) / 2);
    const offsetY = regionY + Math.floor((regionHeight - mapPixelHeight) / 2);

    // Render explored tiles
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileKey = `${x},${y}`;

        // Only render explored tiles
        if (!exploredTiles.has(tileKey)) {
          continue; // Fog of war - leave black
        }

        const tile = areaMap.getTile(x, y);
        if (!tile) continue;

        // Choose color based on tile type
        let color = '#333333'; // Default: dark grey

        if (!tile.walkable) {
          color = '#666666'; // Wall: light grey
        } else if (tile.behavior === 'door') {
          color = '#ffaa00'; // Door: orange
        } else {
          color = '#222222'; // Floor: very dark grey
        }

        const pixelX = offsetX + (x * tileSize);
        const pixelY = offsetY + (y * tileSize);

        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
      }
    }

    // Render player icon (triangle pointing in facing direction)
    const playerPixelX = offsetX + (playerX * tileSize) + Math.floor(tileSize / 2);
    const playerPixelY = offsetY + (playerY * tileSize) + Math.floor(tileSize / 2);

    ctx.fillStyle = '#00ff00'; // Green
    ctx.beginPath();

    const arrowSize = Math.max(2, Math.floor(tileSize / 2));

    switch (direction) {
      case 'North':
        ctx.moveTo(playerPixelX, playerPixelY - arrowSize);
        ctx.lineTo(playerPixelX - arrowSize, playerPixelY + arrowSize);
        ctx.lineTo(playerPixelX + arrowSize, playerPixelY + arrowSize);
        break;
      case 'South':
        ctx.moveTo(playerPixelX, playerPixelY + arrowSize);
        ctx.lineTo(playerPixelX - arrowSize, playerPixelY - arrowSize);
        ctx.lineTo(playerPixelX + arrowSize, playerPixelY - arrowSize);
        break;
      case 'East':
        ctx.moveTo(playerPixelX + arrowSize, playerPixelY);
        ctx.lineTo(playerPixelX - arrowSize, playerPixelY - arrowSize);
        ctx.lineTo(playerPixelX - arrowSize, playerPixelY + arrowSize);
        break;
      case 'West':
        ctx.moveTo(playerPixelX - arrowSize, playerPixelY);
        ctx.lineTo(playerPixelX + arrowSize, playerPixelY - arrowSize);
        ctx.lineTo(playerPixelX + arrowSize, playerPixelY + arrowSize);
        break;
    }

    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
```

**Rationale:** Renders top-down minimap with fog of war. Shows explored tiles only.

---

#### Task 4.2: Create PlayerStatsPanel
**File:** `react-app/src/models/firstperson/rendering/PlayerStatsPanel.ts`

**Changes:**
```typescript
import type { PlayerStats } from '../FirstPersonState';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

/**
 * Renders player stats panel (HP/MP/level/XP)
 */
export class PlayerStatsPanel {
  /**
   * Render player stats in the given region
   */
  static render(
    ctx: CanvasRenderingContext2D,
    stats: PlayerStats,
    regionX: number,
    regionY: number,
    regionWidth: number,
    regionHeight: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    ctx.save();

    const lineHeight = 8;
    let currentY = regionY + 4;

    // HP Bar
    FontAtlasRenderer.renderText(
      ctx,
      `HP: ${stats.hp}/${stats.maxHp}`,
      regionX + 4,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += lineHeight;

    // HP bar visualization
    const barWidth = regionWidth - 8;
    const barHeight = 4;
    const hpPercent = stats.hp / stats.maxHp;

    ctx.fillStyle = '#333333';
    ctx.fillRect(regionX + 4, currentY, barWidth, barHeight);

    ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(regionX + 4, currentY, Math.floor(barWidth * hpPercent), barHeight);

    currentY += barHeight + 4;

    // MP Bar
    FontAtlasRenderer.renderText(
      ctx,
      `MP: ${stats.mp}/${stats.maxMp}`,
      regionX + 4,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += lineHeight;

    // MP bar visualization
    const mpPercent = stats.mp / stats.maxMp;

    ctx.fillStyle = '#333333';
    ctx.fillRect(regionX + 4, currentY, barWidth, barHeight);

    ctx.fillStyle = '#0088ff';
    ctx.fillRect(regionX + 4, currentY, Math.floor(barWidth * mpPercent), barHeight);

    currentY += barHeight + 4;

    // Level
    FontAtlasRenderer.renderText(
      ctx,
      `Level: ${stats.level}`,
      regionX + 4,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += lineHeight;

    // XP Bar
    FontAtlasRenderer.renderText(
      ctx,
      `XP: ${stats.experience}/${stats.experienceToNext}`,
      regionX + 4,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += lineHeight;

    // XP bar visualization
    const xpPercent = stats.experience / stats.experienceToNext;

    ctx.fillStyle = '#333333';
    ctx.fillRect(regionX + 4, currentY, barWidth, barHeight);

    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(regionX + 4, currentY, Math.floor(barWidth * xpPercent), barHeight);

    ctx.restore();
  }
}
```

**Rationale:** Renders player stats with HP/MP/XP bars. Uses FontAtlasRenderer for text.

---

### Phase 5: Movement & Interaction Systems

**Goal:** Implement player movement, rotation, and interaction logic.

#### Task 5.1: Add Movement Processing to FirstPersonView
**File:** `react-app/src/components/firstperson/FirstPersonView.tsx` (update)

**Changes:**
```typescript
// In handleKeyDown callback:

const handleKeyDown = (event: KeyboardEvent) => {
  const command = inputHandler.processKeyDown(event);
  if (!command) return;

  if (command === InputCommand.MoveForward || command === InputCommand.MoveBackward) {
    // Calculate target position
    const target = FirstPersonInputHandler.calculateTargetPosition(
      firstPersonState.playerX,
      firstPersonState.playerY,
      firstPersonState.direction,
      command === InputCommand.MoveForward
    );

    // Validate movement
    const result = MovementValidator.validateMovement(
      areaMap,
      firstPersonState.playerX,
      firstPersonState.playerY,
      firstPersonState.direction
    );

    if (result.success && result.finalX !== undefined && result.finalY !== undefined) {
      // Block input during animation
      inputHandler.blockInput();

      // Update state
      setFirstPersonState(prev => ({
        ...prev!,
        playerX: result.finalX!,
        playerY: result.finalY!,
        exploredTiles: new Set([...prev!.exploredTiles, `${result.finalX},${result.finalY}`])
      }));

      // Log movement
      if (result.passThroughDoor) {
        combatLogManager.addMessage('You pass through the doorway.');
      } else {
        combatLogManager.addMessage('You move forward.');
      }

      // Unblock input after animation completes (handled in ThreeJSViewport callback)
    } else {
      // Movement blocked
      combatLogManager.addMessage(result.reason || 'You cannot move that way.');
    }
  } else if (command === InputCommand.TurnLeft || command === InputCommand.TurnRight) {
    // Calculate new direction
    const newDirection = FirstPersonInputHandler.calculateNewDirection(
      firstPersonState.direction,
      command === InputCommand.TurnLeft ? 'left' : 'right'
    );

    // Block input during rotation
    inputHandler.blockInput();

    // Update state
    setFirstPersonState(prev => ({
      ...prev!,
      direction: newDirection
    }));

    // Unblock input after rotation completes
  } else if (command === InputCommand.Interact) {
    // TODO: Implement interaction system
    console.log('[FirstPersonView] Interact');
  } else if (command === InputCommand.ToggleInventory) {
    // TODO: Toggle inventory panel
    console.log('[FirstPersonView] Toggle inventory');
  }
};
```

**Rationale:** Processes movement and rotation commands. Uses MovementValidator to check AreaMap walkability. Blocks input during animations.

---

#### Task 5.2: Add Animation Complete Callback
**File:** `react-app/src/components/firstperson/FirstPersonView.tsx` (update)

**Changes:**
```typescript
// Pass callback to ThreeJSViewport to unblock input after animation
const handleAnimationComplete = useCallback(() => {
  inputHandler.unblockInput();
}, [inputHandler]);

// In render:
<ThreeJSViewport
  areaMap={firstPersonState.map}
  playerX={firstPersonState.playerX}
  playerY={firstPersonState.playerY}
  direction={firstPersonState.direction}
  width={mapPanelWidth}
  height={mapPanelHeight}
  onAnimationComplete={handleAnimationComplete}
/>
```

**Rationale:** Ensures input is blocked during camera animations and unblocked when complete.

---

### Phase 6: Test Route & Integration

**Goal:** Create `/dev/test/:mapId` route for testing.

#### Task 6.1: Add Route to App.tsx
**File:** `react-app/src/components/App.tsx` (update)

**Changes:**
```typescript
import { FirstPersonView } from './firstperson/FirstPersonView';

// In routing section:
<Route path="/dev/test/:mapId" element={<FirstPersonTestRoute />} />

// Component to extract mapId from route params
function FirstPersonTestRoute() {
  const { mapId } = useParams<{ mapId: string }>();

  if (!mapId) {
    return <div style={{ color: 'white', padding: '20px' }}>Error: No map ID provided</div>;
  }

  return <FirstPersonView mapId={mapId} />;
}
```

**Rationale:** Creates test route for loading individual maps.

---

## Testing Plan

### Manual Testing

1. **Load test map**: Navigate to `/dev/test/dungeon-room-1`
2. **Test movement**: Press W/S to move forward/backward
3. **Test rotation**: Press A/D to turn left/right
4. **Test collision**: Walk into walls, verify blocked
5. **Test doors**: Walk through open doorways, verify auto-continuation
6. **Test minimap**: Verify explored tiles show up, fog of war works
7. **Test player stats**: Verify HP/MP bars render correctly
8. **Test combat log**: Verify movement messages appear

### Automated Testing

**TODO**: Add Jest tests for:
- MovementValidator (collision detection, door logic)
- FirstPersonInputHandler (command processing, direction calculation)
- MinimapRenderer (fog of war, player icon)

---

## File Structure Summary

### New Files to Create

```
react-app/src/
├── models/firstperson/
│   ├── FirstPersonState.ts
│   ├── layouts/
│   │   └── FirstPersonLayoutManager.ts
│   └── rendering/
│       ├── MinimapRenderer.ts
│       └── PlayerStatsPanel.ts
│
├── services/
│   ├── FirstPersonInputHandler.ts
│   └── MovementValidator.ts
│
└── components/firstperson/
    ├── FirstPersonView.tsx
    └── ThreeJSViewport.tsx
```

### Files to Modify

```
react-app/src/
├── components/App.tsx (add route)
└── models/area/AreaMap.ts (add grid getter if needed)
```

---

## Success Criteria

This implementation is complete when:

1. ✅ `/dev/test/:mapId` route loads and displays first-person view
2. ✅ 3D viewport renders in Map Panel region
3. ✅ WASD movement works with collision detection
4. ✅ A/D rotation works with smooth camera animation
5. ✅ Minimap shows explored tiles with fog of war
6. ✅ Player stats panel displays HP/MP/level/XP
7. ✅ Combat log shows movement messages
8. ✅ Input is blocked during animations
9. ✅ Door auto-continuation works (two-tile movement)
10. ✅ All GeneralGuidelines.md patterns are followed

---

## Estimated Complexity

**Time Estimate**: 25-35 hours
- Phase 1 (State & Input): 4-5 hours
- Phase 2 (Layout & Skeleton): 4-5 hours
- Phase 3 (3D Viewport): 6-8 hours
- Phase 4 (Minimap & Stats): 4-5 hours
- Phase 5 (Movement & Interaction): 5-7 hours
- Phase 6 (Test Route): 1-2 hours
- Testing & Polish: 4-5 hours

**Complexity Rating**: Medium-High
**Risk Level**: Medium

**Risks**:
- 3D viewport performance in constrained region
- React Three Fiber integration with canvas rendering
- Camera animation timing coordination with input blocking

**Dependencies**:
- ✅ Area Map System (complete)
- ✅ Combat layout system (complete)
- ✅ Existing 3D viewport prototype (complete)
- ⚠️ AreaMap grid exposure (minor - add getter method)

---

## Next Steps After Completion

1. **Interaction System**: Add door opening, chest looting, NPC dialogue
2. **Inventory System**: Implement inventory panel with item management
3. **Encounter System**: Add encounter triggers and combat transitions
4. **Save/Load**: Integrate with combat save/load system
5. **Additional Maps**: Create more test maps using AreaMap visual editor

---

**End of Implementation Plan**

# Area Map System - Implementation Plan

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [AreaMapSystemOverview.md](./AreaMapSystemOverview.md), [FirstPersonViewOverview.md](../FirstPersonViewOverview.md)

## Purpose

This document provides a detailed, step-by-step implementation plan for building the Area Map System. It breaks down each phase into specific tasks with code examples, testing checkpoints, and validation steps.

## Prerequisites

Before starting implementation:
- ✅ Read [AreaMapSystemOverview.md](./AreaMapSystemOverview.md) completely
- ✅ Understand the three tile behaviors (Wall, Floor, Door)
- ✅ Understand the door auto-continuation mechanic
- ✅ Review existing CombatMap and TilesetRegistry patterns
- ✅ Familiarize with biomes sprite sheet sprite IDs
- ✅ **Read [GeneralGuidelines.md](../../../GeneralGuidelines.md) sections:**
  - "State Management" - Immutable updates, const object pattern
  - "Performance Patterns" - Caching, object pooling
  - "Common Pitfalls" - Real-world bugs to avoid

## Guidelines Compliance Notes

This implementation follows key patterns from [GeneralGuidelines.md](../../../GeneralGuidelines.md):

### ✅ Const Object Pattern (Not Enums)
All type definitions use `const` objects with `as const` instead of TypeScript enums for `erasableSyntaxOnly` compliance:
```typescript
export const TileBehavior = { Wall: "wall", Floor: "floor", Door: "door" } as const;
export type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];
```

### ✅ Immutable State Updates
All state-modifying methods return NEW objects instead of mutating existing state:
- `updateObjectState()` returns new AreaMap with updated objects
- `openDoor()` returns new AreaMap with updated grid and objects
- Never mutates `this.grid` or `this.interactiveObjects` directly

### ✅ Type Guards
Boolean type guards for runtime validation:
```typescript
export function isTileBehavior(value: string): value is TileBehavior
```

### ✅ WeakMap Pattern (Future)
Interactive objects use `Map<string, InteractiveObject>` for now, but could use WeakMap for object-to-ID mapping if needed for memory management (see GeneralGuidelines.md "WeakMap for Animation Data").

### ⚠️ Performance Considerations
When integrating with FirstPersonView rendering:
- Cache stateful UI components (see "UI Component State" in guidelines)
- Use off-screen canvas for complex rendering (see "Color Tinting with Off-Screen Canvas")
- Round all coordinates for pixel-perfect rendering
- Disable image smoothing: `ctx.imageSmoothingEnabled = false`

## Implementation Order

The system should be built in this order to minimize dependencies and enable incremental testing:

```
Phase 1: Core Type Definitions (no dependencies)
    ↓
Phase 2: AreaMap Class (depends on Phase 1)
    ↓
Phase 3: Tileset Registry (depends on Phase 1)
    ↓
Phase 4: ASCII Parser (depends on Phases 1, 2, 3)
    ↓
Phase 5: Movement Validator (depends on Phase 2)
    ↓
Phase 6: Area Map Registry (depends on Phase 2)
    ↓
Phase 7: Data Loaders (depends on all previous phases)
    ↓
Phase 8: Integration Testing (depends on all phases)
```

---

## Phase 1: Core Type Definitions

**Goal:** Create all TypeScript interfaces and types with no implementation logic.

**Duration:** 1-2 hours

**Dependencies:** None

### Step 1.1: Create TileBehavior Enum

**File:** `react-app/src/models/area/TileBehavior.ts`

```typescript
/**
 * Tile behavior types for first-person navigation.
 * Determines how players interact with tiles.
 */
export const TileBehavior = {
  /**
   * Wall: Not walkable, blocks movement completely
   */
  Wall: "wall",

  /**
   * Floor: Walkable and stoppable (normal tile)
   */
  Floor: "floor",

  /**
   * Door: Passable but not stoppable (auto-continue through)
   */
  Door: "door",
} as const;

export type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];

/**
 * Type guard to check if a string is a valid TileBehavior
 */
export function isTileBehavior(value: string): value is TileBehavior {
  return Object.values(TileBehavior).includes(value as TileBehavior);
}
```

**Testing Checkpoint:**
```typescript
// Quick REPL test
import { TileBehavior, isTileBehavior } from './TileBehavior';

console.assert(TileBehavior.Wall === 'wall');
console.assert(TileBehavior.Floor === 'floor');
console.assert(TileBehavior.Door === 'door');
console.assert(isTileBehavior('wall') === true);
console.assert(isTileBehavior('invalid') === false);
```

### Step 1.2: Create AreaMapTile Interface

**File:** `react-app/src/models/area/AreaMapTile.ts`

```typescript
import type { TileBehavior } from './TileBehavior';

/**
 * Represents a single tile in an area map.
 * Contains all properties needed for navigation and rendering.
 */
export interface AreaMapTile {
  /**
   * The behavior type of this tile (wall, floor, door)
   */
  behavior: TileBehavior;

  /**
   * Whether units can walk ON this tile and stop here.
   * - Wall: false (cannot enter)
   * - Floor: true (can enter and stop)
   * - Door: false (can enter but auto-continue, cannot stop)
   */
  walkable: boolean;

  /**
   * Whether units can pass THROUGH this tile.
   * - Wall: false (blocks passage)
   * - Floor: true (allows passage)
   * - Door: true (allows passage, forces continuation)
   */
  passable: boolean;

  /**
   * Sprite ID for rendering this tile in 3D viewport.
   * References sprite from tileset sprite sheet (e.g., 'biomes-8').
   */
  spriteId: string;

  /**
   * Optional terrain type for gameplay effects (future use).
   * Examples: 'stone', 'water', 'lava', 'ice', 'grass', 'dirt'
   */
  terrainType?: string;

  /**
   * Optional interactive object ID placed on this tile.
   * References InteractiveObject (chest, NPC, item, etc.)
   */
  interactiveObjectId?: string;
}
```

**Testing Checkpoint:**
```typescript
// Create a test tile
const testTile: AreaMapTile = {
  behavior: TileBehavior.Floor,
  walkable: true,
  passable: true,
  spriteId: 'biomes-92',
  terrainType: 'stone',
};

console.assert(testTile.behavior === 'floor');
console.assert(testTile.walkable === true);
```

### Step 1.3: Create AreaMapTileDefinition Interface

**File:** `react-app/src/models/area/AreaMapTileDefinition.ts`

```typescript
import type { TileBehavior } from './TileBehavior';

/**
 * Defines a tile type for ASCII map parsing.
 * Maps a single character to a tile configuration.
 */
export interface AreaMapTileDefinition {
  /**
   * ASCII character representing this tile in map grids.
   * Example: '#' for walls, '.' for floors, 'D' for doors
   */
  char: string;

  /**
   * The behavior of this tile type
   */
  behavior: TileBehavior;

  /**
   * Whether this tile is walkable (can stop here)
   */
  walkable: boolean;

  /**
   * Whether this tile is passable (can move through)
   */
  passable: boolean;

  /**
   * Sprite ID for rendering (e.g., 'biomes-8')
   */
  spriteId: string;

  /**
   * Optional terrain type
   */
  terrainType?: string;

  /**
   * Human-readable name for this tile type
   */
  name?: string;

  /**
   * Description of this tile type
   */
  description?: string;
}
```

### Step 1.4: Create AreaMapTileSet Interface

**File:** `react-app/src/models/area/AreaMapTileSet.ts`

```typescript
import type { AreaMapTileDefinition } from './AreaMapTileDefinition';

/**
 * A collection of tile definitions for reuse across multiple maps.
 * Similar to combat system's TilesetDefinition but for first-person areas.
 */
export interface AreaMapTileSet {
  /**
   * Unique identifier for this tileset
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of this tileset's theme/purpose
   */
  description?: string;

  /**
   * Collection of tile type definitions
   */
  tileTypes: AreaMapTileDefinition[];

  /**
   * Sprite sheet ID for this tileset.
   * All spriteIds reference sprites from this sheet.
   * Example: 'biomes'
   */
  spriteSheet?: string;

  /**
   * Tags for categorizing tilesets (dungeon, outdoor, cave, etc.)
   */
  tags?: string[];
}
```

### Step 1.5: Create InteractiveObject Types

**File:** `react-app/src/models/area/InteractiveObject.ts`

```typescript
/**
 * Interactive object types
 */
export const InteractiveObjectType = {
  ClosedDoor: "closed-door",
  Chest: "chest",
  NPC: "npc",
  Item: "item",
  Stairs: "stairs",
  Switch: "switch",
  Sign: "sign",
} as const;

export type InteractiveObjectType = typeof InteractiveObjectType[keyof typeof InteractiveObjectType];

/**
 * State of an interactive object
 */
export const ObjectState = {
  Closed: "closed",
  Open: "open",
  Locked: "locked",
  Active: "active",
  Inactive: "inactive",
} as const;

export type ObjectState = typeof ObjectState[keyof typeof ObjectState];

/**
 * Cardinal direction facing
 */
export type CardinalDirection = 'North' | 'South' | 'East' | 'West';

/**
 * Type-specific data for interactive objects
 */
export interface InteractiveObjectData {
  // Closed Door data
  keyRequired?: string;           // Key item ID needed to unlock
  opensTo?: string;               // Tile char to replace with when opened (default: 'D')

  // Chest data
  lootTable?: string;             // Loot table ID
  items?: string[];               // Specific item IDs
  gold?: number;                  // Gold amount
  trapped?: boolean;              // Whether chest is trapped

  // NPC data
  npcId?: string;                 // NPC definition ID
  dialogueTree?: string;          // Dialogue tree ID
  shopInventory?: string[];       // Shop item IDs
  questId?: string;               // Quest ID

  // Item data
  itemId?: string;                // Item definition ID
  quantity?: number;              // Stack size

  // Stairs data
  destinationAreaId?: string;     // Target area map ID
  destinationX?: number;          // Spawn X in destination
  destinationY?: number;          // Spawn Y in destination
  destinationDirection?: CardinalDirection; // Spawn facing direction

  // Switch data
  triggerId?: string;             // Trigger event ID
  toggleable?: boolean;           // Can be switched on/off

  // Sign data
  text?: string;                  // Sign text content
}

/**
 * Represents an interactive object on the map
 */
export interface InteractiveObject {
  /**
   * Unique identifier for this object instance
   */
  id: string;

  /**
   * Type of interactive object
   */
  type: InteractiveObjectType;

  /**
   * Grid position X coordinate
   */
  x: number;

  /**
   * Grid position Y coordinate
   */
  y: number;

  /**
   * Current state of the object
   */
  state: ObjectState;

  /**
   * Sprite ID for rendering this object
   */
  spriteId: string;

  /**
   * Type-specific data (loot, dialogue, etc.)
   */
  data?: InteractiveObjectData;
}
```

### Step 1.6: Create SpawnPoint and EncounterZone Types

**File:** `react-app/src/models/area/SpawnPoint.ts`

```typescript
import type { CardinalDirection } from './InteractiveObject';

/**
 * Spawn point for player or NPCs
 */
export interface SpawnPoint {
  x: number;
  y: number;
  direction: CardinalDirection;
  id?: string; // Optional identifier (e.g., "player-start", "npc-guard-1")
}
```

**File:** `react-app/src/models/area/EncounterZone.ts`

```typescript
/**
 * Encounter zone definition for combat triggers
 */
export interface EncounterZone {
  id: string;
  x: number;
  y: number;
  encounterId: string; // References CombatEncounter ID
  triggerType: 'enter' | 'interact' | 'random';
  triggerChance?: number; // For random encounters (0.0-1.0)
  oneTime?: boolean; // If true, encounter only triggers once
  triggered?: boolean; // Tracks if one-time encounter has been triggered
}
```

### Step 1.7: Create Index Export File

**File:** `react-app/src/models/area/index.ts`

```typescript
export * from './TileBehavior';
export * from './AreaMapTile';
export * from './AreaMapTileDefinition';
export * from './AreaMapTileSet';
export * from './InteractiveObject';
export * from './SpawnPoint';
export * from './EncounterZone';
```

### Phase 1 Validation

✅ All type files compile without errors
✅ No circular dependencies
✅ Can import types from index file
✅ Type guards work correctly

**Test Command:**
```bash
npm run build
```

---

## Phase 2: AreaMap Class Implementation

**Goal:** Implement the AreaMap class with all core methods.

**Duration:** 3-4 hours

**Dependencies:** Phase 1

### Step 2.1: Create AreaMap Class Skeleton

**File:** `react-app/src/models/area/AreaMap.ts`

```typescript
import type { AreaMapTile } from './AreaMapTile';
import type { InteractiveObject, ObjectState, InteractiveObjectType } from './InteractiveObject';
import type { SpawnPoint } from './SpawnPoint';
import type { EncounterZone } from './EncounterZone';
import { TileBehavior } from './TileBehavior';

/**
 * Represents a navigable area map for first-person exploration.
 *
 * ⚠️ GUIDELINE COMPLIANCE: Immutable state pattern (GeneralGuidelines.md)
 * - State-modifying methods return NEW AreaMap instances
 * - Grid is private to prevent external mutation
 * - All readonly fields except grid (which is managed immutably via methods)
 */
export class AreaMap {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly width: number;
  readonly height: number;
  private grid: AreaMapTile[][];
  readonly tilesetId: string;
  readonly interactiveObjects: Map<string, InteractiveObject>;
  readonly playerSpawn: SpawnPoint;
  readonly npcSpawns: SpawnPoint[];
  readonly encounterZones?: EncounterZone[];

  constructor(
    id: string,
    name: string,
    description: string,
    width: number,
    height: number,
    grid: AreaMapTile[][],
    tilesetId: string,
    playerSpawn: SpawnPoint,
    interactiveObjects?: InteractiveObject[],
    npcSpawns?: SpawnPoint[],
    encounterZones?: EncounterZone[]
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.width = width;
    this.height = height;
    this.grid = grid;
    this.tilesetId = tilesetId;
    this.playerSpawn = playerSpawn;
    this.npcSpawns = npcSpawns ?? [];
    this.encounterZones = encounterZones;

    // Build interactive objects map
    this.interactiveObjects = new Map();
    if (interactiveObjects) {
      for (const obj of interactiveObjects) {
        this.interactiveObjects.set(obj.id, obj);
      }
    }
  }

  // Methods will be added in following steps
}
```

### Step 2.2: Implement Basic Tile Access Methods

Add to `AreaMap` class:

```typescript
  /**
   * Gets the tile at the specified position.
   * Returns undefined if out of bounds.
   */
  getTile(x: number, y: number): AreaMapTile | undefined {
    if (!this.isInBounds(x, y)) {
      return undefined;
    }
    return this.grid[y][x];
  }

  /**
   * Sets the tile at the specified position.
   * Returns true if successful, false if out of bounds.
   */
  setTile(x: number, y: number, tile: AreaMapTile): boolean {
    if (!this.isInBounds(x, y)) {
      return false;
    }
    this.grid[y][x] = tile;
    return true;
  }

  /**
   * Checks if a position is within the map bounds.
   */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
```

**Testing Checkpoint:**
```typescript
// Create a simple 3x3 test map
const testGrid: AreaMapTile[][] = [
  [wallTile, wallTile, wallTile],
  [wallTile, floorTile, wallTile],
  [wallTile, wallTile, wallTile],
];

const testMap = new AreaMap(
  'test-1',
  'Test Map',
  'A test map',
  3,
  3,
  testGrid,
  'test-tileset',
  { x: 1, y: 1, direction: 'North' }
);

console.assert(testMap.getTile(1, 1)?.behavior === TileBehavior.Floor);
console.assert(testMap.getTile(0, 0)?.behavior === TileBehavior.Wall);
console.assert(testMap.getTile(10, 10) === undefined);
console.assert(testMap.isInBounds(1, 1) === true);
console.assert(testMap.isInBounds(-1, 0) === false);
```

### Step 2.3: Implement Navigation Methods

Add to `AreaMap` class:

```typescript
  /**
   * Checks if a unit can walk on the tile at the specified position.
   * A tile is walkable if:
   * - It exists (in bounds)
   * - Its walkable property is true (Floor tiles only)
   */
  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile?.walkable ?? false;
  }

  /**
   * Checks if a unit can pass through the tile at the specified position.
   * A tile is passable if:
   * - It exists (in bounds)
   * - Its passable property is true (Floor and Door tiles)
   */
  isPassable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile?.passable ?? false;
  }

  /**
   * Checks if a tile is a door tile (passable but not stoppable).
   * Used to determine if player should auto-continue through.
   */
  isDoorTile(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile?.behavior === TileBehavior.Door;
  }
```

**Testing Checkpoint:**
```typescript
// Test with floor tile
console.assert(testMap.isWalkable(1, 1) === true);
console.assert(testMap.isPassable(1, 1) === true);
console.assert(testMap.isDoorTile(1, 1) === false);

// Test with wall tile
console.assert(testMap.isWalkable(0, 0) === false);
console.assert(testMap.isPassable(0, 0) === false);

// Test with door tile (add door to test grid first)
// ... door tile tests
```

### Step 2.4: Implement Interactive Object Methods

Add to `AreaMap` class:

```typescript
  /**
   * Gets an interactive object at the specified position.
   */
  getInteractiveObjectAt(x: number, y: number): InteractiveObject | undefined {
    for (const obj of this.interactiveObjects.values()) {
      if (obj.x === x && obj.y === y) {
        return obj;
      }
    }
    return undefined;
  }

  /**
   * Updates an interactive object's state.
   * Returns a NEW AreaMap instance with the updated object state (immutable pattern).
   *
   * ⚠️ GUIDELINE COMPLIANCE: Immutable state updates (GeneralGuidelines.md)
   * Always create new objects with spread operator instead of mutating existing state.
   * This ensures React change detection works correctly.
   */
  updateObjectState(objectId: string, newState: ObjectState): AreaMap | null {
    const obj = this.interactiveObjects.get(objectId);
    if (!obj) {
      return null;
    }

    // Create new interactive object with updated state
    const updatedObject: InteractiveObject = {
      ...obj,
      state: newState,
    };

    // Create new interactive objects array with updated object
    const updatedObjects = Array.from(this.interactiveObjects.values()).map(o =>
      o.id === objectId ? updatedObject : o
    );

    // Return new AreaMap instance with updated objects
    return new AreaMap(
      this.id,
      this.name,
      this.description,
      this.width,
      this.height,
      this.grid,
      this.tilesetId,
      this.playerSpawn,
      updatedObjects,
      this.npcSpawns,
      this.encounterZones
    );
  }
```

### Step 2.5: Implement Door Opening Logic

Add to `AreaMap` class (this requires the AreaMapTileSetRegistry from Phase 3, so we'll come back to this):

```typescript
  /**
   * Opens a closed door at the specified position.
   * Returns a NEW AreaMap instance with door tile replaced and object updated (immutable pattern).
   *
   * ⚠️ GUIDELINE COMPLIANCE: Immutable state updates (GeneralGuidelines.md)
   * NOTE: This method depends on AreaMapTileSetRegistry being available.
   * It will be fully functional after Phase 3.
   */
  openDoor(x: number, y: number): AreaMap | null {
    const obj = this.getInteractiveObjectAt(x, y);
    if (!obj || obj.type !== InteractiveObjectType.ClosedDoor) {
      return null;
    }

    // Check if door is locked
    if (obj.state === ObjectState.Locked) {
      // TODO: Check player inventory for key
      return null; // For now, locked doors cannot be opened
    }

    // This will be implemented after Phase 3 when registry is available
    // For now, we'll just update the object state
    return this.updateObjectState(obj.id, ObjectState.Open);
  }
```

### Step 2.6: Implement Serialization Methods

Add to `AreaMap` class:

```typescript
  /**
   * Converts the area map to a JSON-serializable format.
   */
  toJSON(): AreaMapJSON {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      width: this.width,
      height: this.height,
      grid: this.grid,
      tilesetId: this.tilesetId,
      playerSpawn: this.playerSpawn,
      interactiveObjects: Array.from(this.interactiveObjects.values()),
      npcSpawns: this.npcSpawns,
      encounterZones: this.encounterZones,
    };
  }

  /**
   * Creates an AreaMap from a JSON representation.
   */
  static fromJSON(json: AreaMapJSON): AreaMap {
    return new AreaMap(
      json.id,
      json.name,
      json.description,
      json.width,
      json.height,
      json.grid,
      json.tilesetId,
      json.playerSpawn,
      json.interactiveObjects,
      json.npcSpawns,
      json.encounterZones
    );
  }
```

Add interface after the class:

```typescript
/**
 * JSON representation of an AreaMap for serialization
 */
export interface AreaMapJSON {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  grid: AreaMapTile[][];
  tilesetId: string;
  playerSpawn: SpawnPoint;
  interactiveObjects: InteractiveObject[];
  npcSpawns: SpawnPoint[];
  encounterZones?: EncounterZone[];
}
```

### Phase 2 Validation

Create a test file: `react-app/src/models/area/__tests__/AreaMap.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { AreaMap } from '../AreaMap';
import { TileBehavior } from '../TileBehavior';
import type { AreaMapTile } from '../AreaMapTile';
import type { InteractiveObject } from '../InteractiveObject';
import { InteractiveObjectType, ObjectState } from '../InteractiveObject';

describe('AreaMap', () => {
  // Test fixtures
  const createWallTile = (): AreaMapTile => ({
    behavior: TileBehavior.Wall,
    walkable: false,
    passable: false,
    spriteId: 'biomes-8',
  });

  const createFloorTile = (): AreaMapTile => ({
    behavior: TileBehavior.Floor,
    walkable: true,
    passable: true,
    spriteId: 'biomes-92',
  });

  const createDoorTile = (): AreaMapTile => ({
    behavior: TileBehavior.Door,
    walkable: false,
    passable: true,
    spriteId: 'biomes-21',
  });

  const createTestMap = (): AreaMap => {
    const grid: AreaMapTile[][] = [
      [createWallTile(), createWallTile(), createWallTile()],
      [createWallTile(), createFloorTile(), createWallTile()],
      [createWallTile(), createDoorTile(), createWallTile()],
    ];

    return new AreaMap(
      'test-map',
      'Test Map',
      'A test map',
      3,
      3,
      grid,
      'test-tileset',
      { x: 1, y: 1, direction: 'North' }
    );
  };

  describe('getTile', () => {
    it('should return tile at valid position', () => {
      const map = createTestMap();
      const tile = map.getTile(1, 1);
      expect(tile?.behavior).toBe(TileBehavior.Floor);
    });

    it('should return undefined for out of bounds', () => {
      const map = createTestMap();
      expect(map.getTile(-1, 0)).toBeUndefined();
      expect(map.getTile(10, 10)).toBeUndefined();
    });
  });

  describe('setTile', () => {
    it('should update tile at valid position', () => {
      const map = createTestMap();
      const newTile = createWallTile();
      expect(map.setTile(1, 1, newTile)).toBe(true);
      expect(map.getTile(1, 1)?.behavior).toBe(TileBehavior.Wall);
    });

    it('should return false for out of bounds', () => {
      const map = createTestMap();
      expect(map.setTile(-1, 0, createFloorTile())).toBe(false);
    });
  });

  describe('isInBounds', () => {
    it('should return true for valid positions', () => {
      const map = createTestMap();
      expect(map.isInBounds(0, 0)).toBe(true);
      expect(map.isInBounds(2, 2)).toBe(true);
    });

    it('should return false for out of bounds', () => {
      const map = createTestMap();
      expect(map.isInBounds(-1, 0)).toBe(false);
      expect(map.isInBounds(0, -1)).toBe(false);
      expect(map.isInBounds(3, 0)).toBe(false);
      expect(map.isInBounds(0, 3)).toBe(false);
    });
  });

  describe('isWalkable', () => {
    it('should return true for floor tiles', () => {
      const map = createTestMap();
      expect(map.isWalkable(1, 1)).toBe(true);
    });

    it('should return false for wall tiles', () => {
      const map = createTestMap();
      expect(map.isWalkable(0, 0)).toBe(false);
    });

    it('should return false for door tiles', () => {
      const map = createTestMap();
      expect(map.isWalkable(1, 2)).toBe(false);
    });
  });

  describe('isPassable', () => {
    it('should return true for floor tiles', () => {
      const map = createTestMap();
      expect(map.isPassable(1, 1)).toBe(true);
    });

    it('should return true for door tiles', () => {
      const map = createTestMap();
      expect(map.isPassable(1, 2)).toBe(true);
    });

    it('should return false for wall tiles', () => {
      const map = createTestMap();
      expect(map.isPassable(0, 0)).toBe(false);
    });
  });

  describe('isDoorTile', () => {
    it('should return true for door tiles', () => {
      const map = createTestMap();
      expect(map.isDoorTile(1, 2)).toBe(true);
    });

    it('should return false for non-door tiles', () => {
      const map = createTestMap();
      expect(map.isDoorTile(0, 0)).toBe(false);
      expect(map.isDoorTile(1, 1)).toBe(false);
    });
  });

  describe('interactive objects', () => {
    it('should find object at position', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createFloorTile()],
        [createFloorTile(), createFloorTile()],
      ];

      const chest: InteractiveObject = {
        id: 'chest-1',
        type: InteractiveObjectType.Chest,
        x: 1,
        y: 1,
        state: ObjectState.Closed,
        spriteId: 'biomes-76',
        data: { gold: 50 },
      };

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        2,
        2,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' },
        [chest]
      );

      const found = map.getInteractiveObjectAt(1, 1);
      expect(found?.id).toBe('chest-1');
    });

    it('should update object state (immutably)', () => {
      const grid: AreaMapTile[][] = [[createFloorTile()]];
      const door: InteractiveObject = {
        id: 'door-1',
        type: InteractiveObjectType.ClosedDoor,
        x: 0,
        y: 0,
        state: ObjectState.Closed,
        spriteId: 'biomes-21',
      };

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        1,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' },
        [door]
      );

      // Should return NEW AreaMap instance
      const updatedMap = map.updateObjectState('door-1', ObjectState.Open);
      expect(updatedMap).not.toBeNull();
      expect(updatedMap).not.toBe(map); // Different instance
      expect(updatedMap?.interactiveObjects.get('door-1')?.state).toBe(ObjectState.Open);

      // Original map should be unchanged
      expect(map.interactiveObjects.get('door-1')?.state).toBe(ObjectState.Closed);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const map = createTestMap();
      const json = map.toJSON();
      const restored = AreaMap.fromJSON(json);

      expect(restored.id).toBe(map.id);
      expect(restored.width).toBe(map.width);
      expect(restored.height).toBe(map.height);
      expect(restored.getTile(1, 1)?.behavior).toBe(TileBehavior.Floor);
    });
  });
});
```

**Run Tests:**
```bash
npm test -- AreaMap.test.ts
```

---

## Phase 3: Tileset Registry

**Goal:** Create the registry for managing tileset definitions.

**Duration:** 1-2 hours

**Dependencies:** Phase 1

### Step 3.1: Create AreaMapTileSetRegistry

**File:** `react-app/src/utils/AreaMapTileSetRegistry.ts`

```typescript
import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';

/**
 * Global registry for area map tilesets.
 * Follows the same pattern as TilesetRegistry but for first-person areas.
 */
export class AreaMapTileSetRegistry {
  private static registry: Map<string, AreaMapTileSet> = new Map();

  /**
   * Register a tileset definition
   */
  static register(tileset: AreaMapTileSet): void {
    if (this.registry.has(tileset.id)) {
      console.warn(`AreaMapTileSet with id '${tileset.id}' is already registered. Overwriting.`);
    }
    this.registry.set(tileset.id, tileset);
  }

  /**
   * Register multiple tileset definitions at once
   */
  static registerAll(tilesets: AreaMapTileSet[]): void {
    for (const tileset of tilesets) {
      this.register(tileset);
    }
  }

  /**
   * Get a tileset definition by ID
   */
  static getById(id: string): AreaMapTileSet | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all tilesets with a specific tag
   */
  static getByTag(tag: string): AreaMapTileSet[] {
    return Array.from(this.registry.values())
      .filter(tileset => tileset.tags?.includes(tag));
  }

  /**
   * Get all registered tileset IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered tilesets
   */
  static getAll(): AreaMapTileSet[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if a tileset ID is registered
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Remove a tileset from the registry
   */
  static unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all registered tilesets
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered tilesets
   */
  static get count(): number {
    return this.registry.size;
  }
}
```

### Step 3.2: Update AreaMap.openDoor() Method

Now that we have the registry, go back to `AreaMap.ts` and complete the `openDoor()` method:

```typescript
import { AreaMapTileSetRegistry } from '../../utils/AreaMapTileSetRegistry';

// Inside AreaMap class, replace the openDoor method:

  /**
   * Opens a closed door at the specified position.
   * Returns a NEW AreaMap instance with door tile replaced and object updated (immutable pattern).
   *
   * ⚠️ GUIDELINE COMPLIANCE: Immutable state updates (GeneralGuidelines.md)
   * Always create new objects with spread operator instead of mutating existing state.
   */
  openDoor(x: number, y: number): AreaMap | null {
    const obj = this.getInteractiveObjectAt(x, y);
    if (!obj || obj.type !== InteractiveObjectType.ClosedDoor) {
      return null;
    }

    // Check if door is locked
    if (obj.state === ObjectState.Locked) {
      // TODO: Check player inventory for key
      return null; // For now, locked doors cannot be opened
    }

    // Get the tile definition for open doors (default: 'D')
    const openChar = obj.data?.opensTo ?? 'D';
    const tileset = AreaMapTileSetRegistry.getById(this.tilesetId);
    if (!tileset) {
      console.error(`Tileset '${this.tilesetId}' not found`);
      return null;
    }

    const openTileDef = tileset.tileTypes.find(t => t.char === openChar);
    if (!openTileDef) {
      console.error(`Open door tile '${openChar}' not found in tileset '${this.tilesetId}'`);
      return null;
    }

    // Create new tile with door properties
    const doorTile: AreaMapTile = {
      behavior: openTileDef.behavior,
      walkable: openTileDef.walkable,
      passable: openTileDef.passable,
      spriteId: openTileDef.spriteId,
      terrainType: openTileDef.terrainType,
    };

    // Create new grid with updated tile (immutable)
    const newGrid = this.grid.map((row, rowIndex) =>
      rowIndex === y
        ? row.map((tile, colIndex) => (colIndex === x ? doorTile : tile))
        : row
    );

    // Update object state and get new map with updated objects
    const mapWithUpdatedObject = this.updateObjectState(obj.id, ObjectState.Open);
    if (!mapWithUpdatedObject) {
      return null;
    }

    // Return new AreaMap instance with updated grid
    return new AreaMap(
      this.id,
      this.name,
      this.description,
      this.width,
      this.height,
      newGrid,
      this.tilesetId,
      this.playerSpawn,
      Array.from(mapWithUpdatedObject.interactiveObjects.values()),
      this.npcSpawns,
      this.encounterZones
    );
  }
```

### Phase 3 Validation

Create test file: `react-app/src/utils/__tests__/AreaMapTileSetRegistry.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AreaMapTileSetRegistry } from '../AreaMapTileSetRegistry';
import type { AreaMapTileSet } from '../../models/area/AreaMapTileSet';
import { TileBehavior } from '../../models/area/TileBehavior';

describe('AreaMapTileSetRegistry', () => {
  beforeEach(() => {
    AreaMapTileSetRegistry.clearRegistry();
  });

  const createTestTileset = (): AreaMapTileSet => ({
    id: 'test-tileset',
    name: 'Test Tileset',
    description: 'A test tileset',
    tileTypes: [
      {
        char: '#',
        behavior: TileBehavior.Wall,
        walkable: false,
        passable: false,
        spriteId: 'biomes-8',
      },
      {
        char: '.',
        behavior: TileBehavior.Floor,
        walkable: true,
        passable: true,
        spriteId: 'biomes-92',
      },
    ],
    tags: ['test', 'dungeon'],
  });

  describe('register', () => {
    it('should register a tileset', () => {
      const tileset = createTestTileset();
      AreaMapTileSetRegistry.register(tileset);
      expect(AreaMapTileSetRegistry.has('test-tileset')).toBe(true);
    });

    it('should warn when overwriting existing tileset', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const tileset = createTestTileset();

      AreaMapTileSetRegistry.register(tileset);
      AreaMapTileSetRegistry.register(tileset);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getById', () => {
    it('should retrieve registered tileset', () => {
      const tileset = createTestTileset();
      AreaMapTileSetRegistry.register(tileset);

      const retrieved = AreaMapTileSetRegistry.getById('test-tileset');
      expect(retrieved?.id).toBe('test-tileset');
    });

    it('should return undefined for missing tileset', () => {
      expect(AreaMapTileSetRegistry.getById('missing')).toBeUndefined();
    });
  });

  describe('getByTag', () => {
    it('should find tilesets by tag', () => {
      AreaMapTileSetRegistry.register(createTestTileset());

      const dungeonSets = AreaMapTileSetRegistry.getByTag('dungeon');
      expect(dungeonSets.length).toBe(1);
      expect(dungeonSets[0].id).toBe('test-tileset');
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(AreaMapTileSetRegistry.count).toBe(0);
      AreaMapTileSetRegistry.register(createTestTileset());
      expect(AreaMapTileSetRegistry.count).toBe(1);
    });
  });
});
```

---

## Phase 4: ASCII Parser

**Goal:** Implement ASCII grid parsing to convert YAML map strings into AreaMap instances.

**Duration:** 2-3 hours

**Dependencies:** Phases 1, 2, 3

### Step 4.1: Create Parser Function

**File:** `react-app/src/utils/AreaMapParser.ts`

```typescript
import { AreaMap } from '../models/area/AreaMap';
import type { AreaMapTile } from '../models/area/AreaMapTile';
import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';
import type { InteractiveObject } from '../models/area/InteractiveObject';
import type { SpawnPoint } from '../models/area/SpawnPoint';
import type { EncounterZone } from '../models/area/EncounterZone';

/**
 * YAML structure for area map definitions
 */
export interface AreaMapYAML {
  id: string;
  name: string;
  description: string;
  tilesetId: string;
  grid: string;
  playerSpawn: SpawnPoint;
  interactiveObjects?: InteractiveObject[];
  npcSpawns?: SpawnPoint[];
  encounterZones?: EncounterZone[];
}

/**
 * Parses an ASCII grid string into an AreaMap.
 * Uses the specified tileset to map characters to tiles.
 *
 * @param areaData The area map YAML data
 * @param tileset The tileset to use for character mapping
 * @returns A new AreaMap instance
 * @throws Error if grid is invalid or contains unknown characters
 */
export function parseAreaMapFromYAML(
  areaData: AreaMapYAML,
  tileset: AreaMapTileSet
): AreaMap {
  // Create character-to-tile lookup map
  const tileMap = new Map(
    tileset.tileTypes.map(tileDef => [tileDef.char, tileDef])
  );

  // Parse grid string into rows
  const rows = areaData.grid
    .split('\n')
    .map(line => line.trimEnd()) // Keep leading spaces, trim trailing
    .filter(line => line.length > 0);

  if (rows.length === 0) {
    throw new Error(`Area map '${areaData.id}' has empty grid`);
  }

  const height = rows.length;
  const width = Math.max(...rows.map(row => row.length));

  // Validate player spawn position
  if (!isValidPosition(areaData.playerSpawn.x, areaData.playerSpawn.y, width, height)) {
    throw new Error(
      `Player spawn position (${areaData.playerSpawn.x}, ${areaData.playerSpawn.y}) ` +
      `is out of bounds for map '${areaData.id}' (${width}x${height})`
    );
  }

  // Build the tile grid
  const grid: AreaMapTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: AreaMapTile[] = [];
    for (let x = 0; x < width; x++) {
      const char = rows[y][x] ?? ' '; // Default to space if row is shorter
      const tileDef = tileMap.get(char);

      if (!tileDef) {
        throw new Error(
          `Unknown tile character '${char}' at position (${x}, ${y}) ` +
          `in area '${areaData.id}'. Available characters: ${Array.from(tileMap.keys()).join(', ')}`
        );
      }

      row.push({
        behavior: tileDef.behavior,
        walkable: tileDef.walkable,
        passable: tileDef.passable,
        spriteId: tileDef.spriteId,
        terrainType: tileDef.terrainType,
      });
    }
    grid.push(row);
  }

  // Validate that player spawn is on a walkable tile
  const spawnTile = grid[areaData.playerSpawn.y][areaData.playerSpawn.x];
  if (!spawnTile.walkable) {
    throw new Error(
      `Player spawn position (${areaData.playerSpawn.x}, ${areaData.playerSpawn.y}) ` +
      `is not on a walkable tile in map '${areaData.id}'`
    );
  }

  // Validate interactive objects are within bounds
  if (areaData.interactiveObjects) {
    for (const obj of areaData.interactiveObjects) {
      if (!isValidPosition(obj.x, obj.y, width, height)) {
        throw new Error(
          `Interactive object '${obj.id}' at position (${obj.x}, ${obj.y}) ` +
          `is out of bounds for map '${areaData.id}' (${width}x${height})`
        );
      }
    }
  }

  // Create AreaMap instance
  return new AreaMap(
    areaData.id,
    areaData.name,
    areaData.description,
    width,
    height,
    grid,
    areaData.tilesetId,
    areaData.playerSpawn,
    areaData.interactiveObjects,
    areaData.npcSpawns,
    areaData.encounterZones
  );
}

/**
 * Helper function to validate position is within bounds
 */
function isValidPosition(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}
```

### Phase 4 Validation

Create test file: `react-app/src/utils/__tests__/AreaMapParser.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { parseAreaMapFromYAML, type AreaMapYAML } from '../AreaMapParser';
import { AreaMapTileSetRegistry } from '../AreaMapTileSetRegistry';
import type { AreaMapTileSet } from '../../models/area/AreaMapTileSet';
import { TileBehavior } from '../../models/area/TileBehavior';

describe('AreaMapParser', () => {
  beforeEach(() => {
    AreaMapTileSetRegistry.clearRegistry();
  });

  const createTestTileset = (): AreaMapTileSet => ({
    id: 'test-tileset',
    name: 'Test Tileset',
    tileTypes: [
      {
        char: '#',
        behavior: TileBehavior.Wall,
        walkable: false,
        passable: false,
        spriteId: 'biomes-8',
      },
      {
        char: '.',
        behavior: TileBehavior.Floor,
        walkable: true,
        passable: true,
        spriteId: 'biomes-92',
      },
      {
        char: 'D',
        behavior: TileBehavior.Door,
        walkable: false,
        passable: true,
        spriteId: 'biomes-21',
      },
    ],
  });

  it('should parse simple grid correctly', () => {
    const tileset = createTestTileset();
    AreaMapTileSetRegistry.register(tileset);

    const areaData: AreaMapYAML = {
      id: 'test-area',
      name: 'Test Area',
      description: 'A test area',
      tilesetId: 'test-tileset',
      grid: `###
#.#
###`,
      playerSpawn: { x: 1, y: 1, direction: 'North' },
    };

    const map = parseAreaMapFromYAML(areaData, tileset);

    expect(map.width).toBe(3);
    expect(map.height).toBe(3);
    expect(map.getTile(1, 1)?.behavior).toBe(TileBehavior.Floor);
    expect(map.getTile(0, 0)?.behavior).toBe(TileBehavior.Wall);
  });

  it('should handle variable-width rows', () => {
    const tileset = createTestTileset();
    const areaData: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: `###
#.
###`,
      playerSpawn: { x: 1, y: 1, direction: 'North' },
    };

    const map = parseAreaMapFromYAML(areaData, tileset);
    expect(map.width).toBe(3);
    expect(map.getTile(2, 1)?.behavior).toBe(TileBehavior.Wall); // Padded with space -> wall
  });

  it('should throw error for unknown character', () => {
    const tileset = createTestTileset();
    const areaData: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: `###
#X#
###`,
      playerSpawn: { x: 1, y: 1, direction: 'North' },
    };

    expect(() => parseAreaMapFromYAML(areaData, tileset)).toThrow(/Unknown tile character 'X'/);
  });

  it('should throw error for empty grid', () => {
    const tileset = createTestTileset();
    const areaData: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '',
      playerSpawn: { x: 0, y: 0, direction: 'North' },
    };

    expect(() => parseAreaMapFromYAML(areaData, tileset)).toThrow(/empty grid/);
  });

  it('should throw error for spawn on non-walkable tile', () => {
    const tileset = createTestTileset();
    const areaData: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: `###
#.#
###`,
      playerSpawn: { x: 0, y: 0, direction: 'North' }, // Wall tile
    };

    expect(() => parseAreaMapFromYAML(areaData, tileset)).toThrow(/not on a walkable tile/);
  });
});
```

**Continue in next response due to length...**

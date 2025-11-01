# Area Map System - Implementation Plan (Part 2)

**Continuation of:** [AreaMapImplementationPlan.md](./AreaMapImplementationPlan.md)

---

## Guidelines Compliance (Part 2)

This section continues following patterns from [GeneralGuidelines.md](../../../GeneralGuidelines.md):

### ✅ Discriminated Union Results
Movement validation uses type-safe discriminated unions:
```typescript
export type MovementResult =
  | { success: true; finalX: number; finalY: number; ... }
  | { success: false; reason: string; ... };
```

### ✅ No Object Creation in Hot Paths
Movement validation avoids creating objects in loops:
- Direction offset calculations use tuple returns `[number, number]`
- Results are constructed once at return points, not in iterations

### ✅ Registry Pattern
AreaMapRegistry follows established combat system patterns:
- Static methods for global access
- Warning on duplicate registrations
- Consistent API with TilesetRegistry and CombatEncounterRegistry

---

## Phase 5: Movement Validation

**Goal:** Implement movement validation with door auto-continuation logic.

**Duration:** 2-3 hours

**Dependencies:** Phase 2

### Step 5.1: Create Movement Validator

**File:** `react-app/src/utils/MovementValidator.ts`

```typescript
import type { AreaMap } from '../models/area/AreaMap';
import type { CardinalDirection, InteractiveObject } from '../models/area/InteractiveObject';
import { InteractiveObjectType } from '../models/area/InteractiveObject';

/**
 * Result of movement validation using discriminated union pattern
 *
 * ⚠️ GUIDELINE COMPLIANCE: Type-safe result pattern (GeneralGuidelines.md)
 * Use discriminated unions for results with different data based on success/failure.
 */
export type MovementResult =
  | {
      success: true;
      finalX: number;
      finalY: number;
      passThroughDoor: boolean;
      doorX?: number;
      doorY?: number;
    }
  | {
      success: false;
      reason: string;
      interactiveObject?: InteractiveObject;
    };

/**
 * Validates if player can move from current position to target position.
 * Returns movement result including any auto-continuation through door tiles.
 *
 * @param areaMap The area map
 * @param currentX Current player X position
 * @param currentY Current player Y position
 * @param direction Movement direction
 * @returns MovementResult with success status and final position
 */
export function validateMovement(
  areaMap: AreaMap,
  currentX: number,
  currentY: number,
  direction: CardinalDirection
): MovementResult {
  // Calculate target position
  const [dx, dy] = getDirectionOffset(direction);
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

    // Check for adjacent door tiles (would create infinite loop)
    if (areaMap.isDoorTile(nextX, nextY)) {
      return {
        success: false,
        reason: 'Adjacent door tiles detected (would create movement loop)',
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

/**
 * Converts cardinal direction to grid offset
 */
export function getDirectionOffset(direction: CardinalDirection): [number, number] {
  switch (direction) {
    case 'North': return [0, -1];
    case 'South': return [0, 1];
    case 'East': return [1, 0];
    case 'West': return [-1, 0];
  }
}

/**
 * Rotates direction left (counter-clockwise)
 */
export function rotateLeft(direction: CardinalDirection): CardinalDirection {
  switch (direction) {
    case 'North': return 'West';
    case 'West': return 'South';
    case 'South': return 'East';
    case 'East': return 'North';
  }
}

/**
 * Rotates direction right (clockwise)
 */
export function rotateRight(direction: CardinalDirection): CardinalDirection {
  switch (direction) {
    case 'North': return 'East';
    case 'East': return 'South';
    case 'South': return 'West';
    case 'West': return 'North';
  }
}
```

### Phase 5 Validation

Create test file: `react-app/src/utils/__tests__/MovementValidator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateMovement, getDirectionOffset, rotateLeft, rotateRight } from '../MovementValidator';
import { AreaMap } from '../../models/area/AreaMap';
import type { AreaMapTile } from '../../models/area/AreaMapTile';
import { TileBehavior } from '../../models/area/TileBehavior';

describe('MovementValidator', () => {
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

  describe('validateMovement', () => {
    it('should allow movement to walkable floor tile', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createFloorTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        2,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(true);
      expect(result.finalX).toBe(1);
      expect(result.finalY).toBe(0);
      expect(result.passThroughDoor).toBe(false);
    });

    it('should block movement to wall tile', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createWallTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        2,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('not passable');
    });

    it('should block movement out of bounds', () => {
      const grid: AreaMapTile[][] = [[createFloorTile()]];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        1,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'North');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Out of bounds');
    });

    it('should auto-continue through door tile', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createDoorTile(), createFloorTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        3,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(true);
      expect(result.finalX).toBe(2); // Skip door, land on next tile
      expect(result.finalY).toBe(0);
      expect(result.passThroughDoor).toBe(true);
      expect(result.doorX).toBe(1);
      expect(result.doorY).toBe(0);
    });

    it('should block door leading to wall', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createDoorTile(), createWallTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        3,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Cannot stop after passing through door');
    });

    it('should block door leading out of bounds', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createDoorTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        2,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Door leads out of bounds');
    });

    it('should block adjacent door tiles', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createDoorTile(), createDoorTile(), createFloorTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        4,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Adjacent door tiles');
    });
  });

  describe('getDirectionOffset', () => {
    it('should return correct offsets', () => {
      expect(getDirectionOffset('North')).toEqual([0, -1]);
      expect(getDirectionOffset('South')).toEqual([0, 1]);
      expect(getDirectionOffset('East')).toEqual([1, 0]);
      expect(getDirectionOffset('West')).toEqual([-1, 0]);
    });
  });

  describe('rotateLeft', () => {
    it('should rotate counter-clockwise', () => {
      expect(rotateLeft('North')).toBe('West');
      expect(rotateLeft('West')).toBe('South');
      expect(rotateLeft('South')).toBe('East');
      expect(rotateLeft('East')).toBe('North');
    });
  });

  describe('rotateRight', () => {
    it('should rotate clockwise', () => {
      expect(rotateRight('North')).toBe('East');
      expect(rotateRight('East')).toBe('South');
      expect(rotateRight('South')).toBe('West');
      expect(rotateRight('West')).toBe('North');
    });
  });
});
```

---

## Phase 6: Area Map Registry

**Goal:** Create the registry for managing area map instances.

**Duration:** 1 hour

**Dependencies:** Phase 2

### Step 6.1: Create AreaMapRegistry

**File:** `react-app/src/utils/AreaMapRegistry.ts`

```typescript
import type { AreaMap } from '../models/area/AreaMap';

/**
 * Global registry for area maps.
 * Similar to CombatEncounter registry.
 */
export class AreaMapRegistry {
  private static registry: Map<string, AreaMap> = new Map();

  /**
   * Register an area map
   */
  static register(areaMap: AreaMap): void {
    if (this.registry.has(areaMap.id)) {
      console.warn(`AreaMap with id '${areaMap.id}' is already registered. Overwriting.`);
    }
    this.registry.set(areaMap.id, areaMap);
  }

  /**
   * Register multiple area maps at once
   */
  static registerAll(areaMaps: AreaMap[]): void {
    for (const areaMap of areaMaps) {
      this.register(areaMap);
    }
  }

  /**
   * Get an area map by ID
   */
  static getById(id: string): AreaMap | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all registered area map IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered area maps
   */
  static getAll(): AreaMap[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if an area map ID is registered
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Remove an area map from the registry
   */
  static unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all registered area maps
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered area maps
   */
  static get count(): number {
    return this.registry.size;
  }
}
```

### Phase 6 Validation

Simple test to verify registry works:

```typescript
import { AreaMapRegistry } from '../utils/AreaMapRegistry';
import { AreaMap } from '../models/area/AreaMap';

// Create test map
const testMap = new AreaMap(/* ... */);

// Register
AreaMapRegistry.register(testMap);
console.assert(AreaMapRegistry.has('test-map-id'));
console.assert(AreaMapRegistry.count === 1);

// Retrieve
const retrieved = AreaMapRegistry.getById('test-map-id');
console.assert(retrieved?.id === 'test-map-id');

// Clear
AreaMapRegistry.clearRegistry();
console.assert(AreaMapRegistry.count === 0);
```

---

## Phase 7: Data Loaders and YAML Files

**Goal:** Create YAML database files and data loaders.

**Duration:** 3-4 hours

**Dependencies:** All previous phases

### Step 7.1: Create Tileset Database YAML

**File:** `react-app/src/data/area-tileset-database.yaml`

```yaml
# Area Map Tileset Database
# Defines reusable tile type collections for first-person navigation

tilesets:
  # Grey stone dungeon (classic dungeon crawl aesthetic)
  - id: dungeon-grey-stone
    name: Grey Stone Dungeon
    description: Classic grey stone dungeon with walls, floors, and doorways
    spriteSheet: biomes
    tileTypes:
      # Wall tile - blocks movement completely
      - char: '#'
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-8
        name: Grey Stone Wall
        description: Solid grey stone wall

      # Floor tile - normal walkable floor
      - char: .
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-92
        terrainType: stone
        name: Patterned Grey Floor
        description: Patterned grey stone floor

      # Alternate floor (dark ground/dirt)
      - char: ','
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-93
        terrainType: dirt
        name: Dark Ground
        description: Dark dirt ground

      # Door tile - passable but not stoppable (auto-continue)
      - char: D
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-21
        name: Grey Stone Doorway
        description: Open stone doorway

      # Stairs down
      - char: '>'
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-22
        terrainType: stairs
        name: Stairs Down
        description: Grey stone stairs descending

    tags:
      - dungeon
      - stone
      - indoor
      - grey

  # Add other tilesets from AreaMapSystemOverview.md...
```

### Step 7.2: Create Area Map Database YAML

**File:** `react-app/src/data/area-map-database.yaml`

```yaml
# Area Map Database
# Defines navigable dungeon/world areas

areas:
  # Simple test room
  - id: test-room
    name: "Test Chamber"
    description: "A simple test room for development"
    tilesetId: dungeon-grey-stone
    grid: |-
      #####
      #...#
      #.D.#
      #...#
      #####
    playerSpawn:
      x: 2
      y: 3
      direction: North

  # Example dungeon room with interactive objects
  - id: dungeon-room-1
    name: "Dark Chamber"
    description: "A small stone chamber with a single door to the north."
    tilesetId: dungeon-grey-stone
    grid: |-
      ##########
      ####D#####
      ##........
      #.........
      #.........
      #.........
      #.........
      #.........
      ##........
      ##########
    playerSpawn:
      x: 5
      y: 7
      direction: North
    interactiveObjects:
      # Treasure chest in corner
      - id: chest-1
        type: chest
        x: 2
        y: 2
        state: closed
        spriteId: biomes-76
        data:
          gold: 50
          items:
            - health-potion
            - rusty-sword
    encounterZones:
      - id: goblin-ambush
        x: 5
        y: 3
        encounterId: goblin-patrol
        triggerType: enter
        oneTime: true
```

### Step 7.3: Create Data Loader

**File:** `react-app/src/services/AreaMapDataLoader.ts`

```typescript
import * as YAML from 'yaml';
import { AreaMapTileSetRegistry } from '../utils/AreaMapTileSetRegistry';
import { AreaMapRegistry } from '../utils/AreaMapRegistry';
import { parseAreaMapFromYAML, type AreaMapYAML } from '../utils/AreaMapParser';
import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';

/**
 * Loads tileset and area map data from YAML files.
 * Similar to existing data loaders (EncounterDataLoader, TilesetDataLoader).
 *
 * ⚠️ GUIDELINE COMPLIANCE: Async operations (GeneralGuidelines.md)
 * - Uses async/await for file loading
 * - Collects errors instead of failing fast (better UX for data validation)
 * - Logs progress and errors for debugging
 */
export class AreaMapDataLoader {
  /**
   * Load tileset database from YAML
   */
  static async loadTilesets(yamlPath: string = '/data/area-tileset-database.yaml'): Promise<void> {
    console.log('[AreaMapDataLoader] Loading tilesets from', yamlPath);

    const response = await fetch(yamlPath);
    if (!response.ok) {
      throw new Error(`Failed to load tileset database: ${response.statusText}`);
    }

    const yamlText = await response.text();
    const data = YAML.parse(yamlText);

    if (!data.tilesets || !Array.isArray(data.tilesets)) {
      throw new Error('Invalid tileset database format: missing or invalid "tilesets" array');
    }

    const tilesets: AreaMapTileSet[] = data.tilesets.map((ts: any) => {
      // Validate required fields
      if (!ts.id || !ts.name || !ts.tileTypes) {
        throw new Error(`Invalid tileset: missing required fields (id, name, or tileTypes)`);
      }

      return {
        id: ts.id,
        name: ts.name,
        description: ts.description,
        tileTypes: ts.tileTypes.map((tt: any) => {
          if (!tt.char || !tt.behavior || !tt.spriteId) {
            throw new Error(`Invalid tile type in tileset '${ts.id}': missing required fields`);
          }

          return {
            char: tt.char,
            behavior: tt.behavior,
            walkable: tt.walkable ?? false,
            passable: tt.passable ?? false,
            spriteId: tt.spriteId,
            terrainType: tt.terrainType,
            name: tt.name,
            description: tt.description,
          };
        }),
        spriteSheet: ts.spriteSheet,
        tags: ts.tags,
      };
    });

    AreaMapTileSetRegistry.registerAll(tilesets);
    console.log(`[AreaMapDataLoader] Loaded ${tilesets.length} tilesets`);
  }

  /**
   * Load area map database from YAML
   */
  static async loadAreaMaps(yamlPath: string = '/data/area-map-database.yaml'): Promise<void> {
    console.log('[AreaMapDataLoader] Loading area maps from', yamlPath);

    const response = await fetch(yamlPath);
    if (!response.ok) {
      throw new Error(`Failed to load area map database: ${response.statusText}`);
    }

    const yamlText = await response.text();
    const data = YAML.parse(yamlText);

    if (!data.areas || !Array.isArray(data.areas)) {
      throw new Error('Invalid area map database format: missing or invalid "areas" array');
    }

    const areaMaps: AreaMap[] = [];
    const errors: string[] = [];

    for (const areaData of data.areas as AreaMapYAML[]) {
      try {
        // Get tileset
        const tileset = AreaMapTileSetRegistry.getById(areaData.tilesetId);
        if (!tileset) {
          errors.push(`Tileset '${areaData.tilesetId}' not found for area '${areaData.id}'`);
          continue;
        }

        // Parse ASCII grid into AreaMap
        const areaMap = parseAreaMapFromYAML(areaData, tileset);
        areaMaps.push(areaMap);
      } catch (error) {
        errors.push(`Failed to parse area '${areaData.id}': ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('[AreaMapDataLoader] Errors loading area maps:');
      errors.forEach(err => console.error(`  - ${err}`));
    }

    AreaMapRegistry.registerAll(areaMaps);
    console.log(`[AreaMapDataLoader] Loaded ${areaMaps.length} area maps (${errors.length} errors)`);
  }

  /**
   * Load all area map data (tilesets + maps)
   */
  static async loadAll(): Promise<void> {
    await this.loadTilesets();
    await this.loadAreaMaps();
  }
}
```

### Step 7.4: Integrate with App Initialization

Add to your app initialization (e.g., `App.tsx` or main initialization file):

```typescript
import { AreaMapDataLoader } from './services/AreaMapDataLoader';

// In your app initialization code (alongside other data loaders)
async function initializeGame() {
  try {
    // Load existing data...
    await loadFonts();
    await loadSprites();
    // ... other loaders

    // Load area map data
    await AreaMapDataLoader.loadAll();

    console.log('[Game] All data loaded successfully');
  } catch (error) {
    console.error('[Game] Failed to load game data:', error);
  }
}
```

### Phase 7 Validation

Test that data loads correctly:

```typescript
// After app initialization
import { AreaMapTileSetRegistry } from './utils/AreaMapTileSetRegistry';
import { AreaMapRegistry } from './utils/AreaMapRegistry';

// Check tilesets loaded
console.assert(AreaMapTileSetRegistry.count > 0, 'Tilesets should be loaded');
const greyStone = AreaMapTileSetRegistry.getById('dungeon-grey-stone');
console.assert(greyStone !== undefined, 'dungeon-grey-stone tileset should exist');

// Check area maps loaded
console.assert(AreaMapRegistry.count > 0, 'Area maps should be loaded');
const testRoom = AreaMapRegistry.getById('test-room');
console.assert(testRoom !== undefined, 'test-room area should exist');
console.assert(testRoom.width === 5, 'test-room should be 5 tiles wide');
```

---

## Phase 8: Integration Testing

**Goal:** Comprehensive testing of the entire system working together.

**Duration:** 2-3 hours

**Dependencies:** All previous phases

### Step 8.1: End-to-End Test

Create integration test: `react-app/src/models/area/__tests__/AreaMapIntegration.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { AreaMapDataLoader } from '../../../services/AreaMapDataLoader';
import { AreaMapRegistry } from '../../../utils/AreaMapRegistry';
import { AreaMapTileSetRegistry } from '../../../utils/AreaMapTileSetRegistry';
import { validateMovement } from '../../../utils/MovementValidator';
import { TileBehavior } from '../TileBehavior';

describe('AreaMap Integration Tests', () => {
  beforeAll(async () => {
    // Load all data
    await AreaMapDataLoader.loadAll();
  });

  it('should load tilesets and area maps', () => {
    expect(AreaMapTileSetRegistry.count).toBeGreaterThan(0);
    expect(AreaMapRegistry.count).toBeGreaterThan(0);
  });

  it('should retrieve area map and validate structure', () => {
    const testRoom = AreaMapRegistry.getById('test-room');
    expect(testRoom).toBeDefined();
    expect(testRoom?.width).toBe(5);
    expect(testRoom?.height).toBe(5);
    expect(testRoom?.playerSpawn.x).toBe(2);
    expect(testRoom?.playerSpawn.y).toBe(3);
  });

  it('should allow movement in test room', () => {
    const testRoom = AreaMapRegistry.getById('test-room');
    if (!testRoom) throw new Error('test-room not found');

    // Start at spawn point
    const { x, y, direction } = testRoom.playerSpawn;

    // Move north (should hit door and auto-continue)
    const result = validateMovement(testRoom, x, y, direction);
    expect(result.success).toBe(true);
    expect(result.passThroughDoor).toBe(true);
  });

  it('should detect walls correctly', () => {
    const testRoom = AreaMapRegistry.getById('test-room');
    if (!testRoom) throw new Error('test-room not found');

    // Check corner is wall
    const cornerTile = testRoom.getTile(0, 0);
    expect(cornerTile?.behavior).toBe(TileBehavior.Wall);
    expect(cornerTile?.walkable).toBe(false);
  });

  it('should handle interactive objects', () => {
    const dungeonRoom = AreaMapRegistry.getById('dungeon-room-1');
    if (!dungeonRoom) throw new Error('dungeon-room-1 not found');

    // Check chest exists
    const chest = dungeonRoom.getInteractiveObjectAt(2, 2);
    expect(chest).toBeDefined();
    expect(chest?.type).toBe('chest');
    expect(chest?.data?.gold).toBe(50);
  });
});
```

### Step 8.2: Manual Testing Checklist

- [ ] Load app and verify no console errors
- [ ] Check tilesets are registered (console.log AreaMapTileSetRegistry.count)
- [ ] Check area maps are registered (console.log AreaMapRegistry.count)
- [ ] Retrieve a map and inspect its structure
- [ ] Test movement validation with different scenarios
- [ ] Test door auto-continuation
- [ ] Test interactive object placement
- [ ] Test serialization (toJSON/fromJSON)

---

## Phase 9: AreaMap Developer Panel

**Goal:** Create a developer panel for browsing, editing, and testing area maps (similar to EncounterRegistryPanel).

**Duration:** 6-8 hours

**Dependencies:** All previous phases

**Reference Implementation:** [EncounterRegistryPanel.tsx](react-app/src/components/developer/EncounterRegistryPanel.tsx)

### Overview

The AreaMap developer panel provides a visual interface for:
- **Browsing** all registered area maps
- **Editing** map properties, tiles, and objects
- **Visual tile painting** with drag-to-paint support
- **Interactive object placement** and editing
- **Spawn point management** (player and NPCs)
- **Encounter zone** configuration
- **YAML export** for both tilesets and maps
- **Duplicate/delete** operations
- **Testing** maps in FirstPersonView (future)

### Step 9.1: Core Component Structure

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

```typescript
import { useState, useEffect, useRef } from 'react';
import { AreaMap } from '../../models/area/AreaMap';
import type { AreaMapJSON } from '../../models/area/AreaMap';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { AreaMapTileSetRegistry } from '../../utils/AreaMapTileSetRegistry';
import { TileBehavior } from '../../models/area/TileBehavior';
import { InteractiveObjectType, ObjectState } from '../../models/area/InteractiveObject';
import type { InteractiveObject } from '../../models/area/InteractiveObject';
import type { SpawnPoint } from '../../models/area/SpawnPoint';
import type { EncounterZone } from '../../models/area/EncounterZone';
import { TagFilter } from './TagFilter';
import { AreaMapPreview } from './AreaMapPreview';
import * as yaml from 'js-yaml';

interface AreaMapRegistryPanelProps {
  onClose?: () => void;
  onTestMap?: (areaMap: AreaMap) => void;
}

/**
 * Developer panel for browsing and editing area maps.
 * Provides a visual interface for map creation and editing.
 *
 * ⚠️ GUIDELINE COMPLIANCE: UI Component State (GeneralGuidelines.md)
 * - Caches stateful components (preview, buttons) to preserve interaction state
 * - Uses React state for data that triggers re-renders
 * - Uses useRef for original state storage (cancel/revert functionality)
 * - Immutable state updates when saving changes
 */
export const AreaMapRegistryPanel: React.FC<AreaMapRegistryPanelProps> = ({
  onClose,
  onTestMap
}) => {
  // State management
  const [areaMaps, setAreaMaps] = useState<AreaMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<AreaMap | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMap, setEditedMap] = useState<AreaMapJSON | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editedTilesetId, setEditedTilesetId] = useState<string>('');
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);

  // ⚠️ GUIDELINE COMPLIANCE: useRef for non-rendering state (GeneralGuidelines.md)
  // Store original map state before editing for cancel/revert
  const originalMapRef = useRef<AreaMapJSON | null>(null);

  // Initialize - load maps from registry
  useEffect(() => {
    loadAreaMaps();
  }, []);

  // Extract unique tags from tilesets
  useEffect(() => {
    const tagSet = new Set<string>();
    areaMaps.forEach(map => {
      const tileset = AreaMapTileSetRegistry.getById(map.tilesetId);
      tileset?.tags?.forEach(tag => tagSet.add(tag));
    });
    setAllTags(Array.from(tagSet).sort());
  }, [areaMaps]);

  const loadAreaMaps = () => {
    setAreaMaps(AreaMapRegistry.getAll());
  };

  const handleSelectMap = (map: AreaMap) => {
    setSelectedMap(map);
    setIsEditing(false);
    setEditedMap(null);
  };

  const handleEdit = () => {
    if (!selectedMap) return;

    // ⚠️ GUIDELINE COMPLIANCE: State preservation pattern (GeneralGuidelines.md)
    // Store deep copy for cancel/revert
    originalMapRef.current = selectedMap.toJSON();

    setIsEditing(true);
    setEditedMap(selectedMap.toJSON());
    setSelectedTileIndex(null);
    setEditedTilesetId(selectedMap.tilesetId);
  };

  const handleCancelEdit = () => {
    // ⚠️ GUIDELINE COMPLIANCE: Immutable state updates (GeneralGuidelines.md)
    if (originalMapRef.current && selectedMap) {
      const restoredMap = AreaMap.fromJSON(originalMapRef.current);
      AreaMapRegistry.unregister(selectedMap.id);
      AreaMapRegistry.register(restoredMap);
      setSelectedMap(restoredMap);
      originalMapRef.current = null;
    }

    setIsEditing(false);
    setEditedMap(null);
    setSelectedTileIndex(null);
    setMapRenderKey(prev => prev + 1);
  };

  const handleSaveEdit = () => {
    if (!editedMap || !selectedMap) return;

    // Validation
    const existingMap = AreaMapRegistry.getById(editedMap.id);
    if (existingMap && existingMap.id !== selectedMap.id) {
      alert(`Error: Map ID "${editedMap.id}" already exists.`);
      return;
    }

    // Validate player spawn on walkable tile
    const spawnTile = selectedMap.getTile(editedMap.playerSpawn.x, editedMap.playerSpawn.y);
    if (!spawnTile?.walkable) {
      alert(`Error: Player spawn at (${editedMap.playerSpawn.x}, ${editedMap.playerSpawn.y}) is not walkable.`);
      return;
    }

    // Validate no duplicate object positions
    const objectPositions = new Set<string>();
    for (const obj of editedMap.interactiveObjects || []) {
      const key = `${obj.x},${obj.y}`;
      if (objectPositions.has(key)) {
        alert(`Error: Duplicate object at (${obj.x}, ${obj.y}).`);
        return;
      }
      objectPositions.add(key);
    }

    try {
      const oldId = selectedMap.id;
      const idChanged = oldId !== editedMap.id;

      // ⚠️ GUIDELINE COMPLIANCE: Immutable state updates (GeneralGuidelines.md)
      // Create new AreaMap instance instead of mutating
      const updatedMap = new AreaMap(
        editedMap.id,
        editedMap.name,
        editedMap.description,
        editedMap.width,
        editedMap.height,
        selectedMap.toJSON().grid, // Current grid state
        editedTilesetId,
        editedMap.playerSpawn,
        editedMap.interactiveObjects,
        editedMap.npcSpawns,
        editedMap.encounterZones
      );

      // Update registry
      if (idChanged) AreaMapRegistry.unregister(oldId);
      else AreaMapRegistry.unregister(selectedMap.id);

      AreaMapRegistry.register(updatedMap);

      // Update UI
      setSelectedMap(updatedMap);
      setIsEditing(false);
      setEditedMap(null);
      setAreaMaps(AreaMapRegistry.getAll());
    } catch (error) {
      console.error('Failed to save map:', error);
      alert(`Failed to save: ${error}`);
    }
  };

  // Additional handlers: handleExport, handleDuplicate, handleDelete, etc.
  // ... (implementation continues)

  return (
    <div style={{ /* Panel styles */ }}>
      {/* UI implementation similar to EncounterRegistryPanel */}
    </div>
  );
};
```

### Step 9.2: AreaMapPreview Component

**File:** `react-app/src/components/developer/AreaMapPreview.tsx`

Visual map editor component with canvas rendering:

```typescript
interface AreaMapPreviewProps {
  areaMap: AreaMap;
  isEditing?: boolean;
  selectedTileIndex?: number | null;
  onTilePlacement?: (x: number, y: number, tileTypeIndex: number) => void;
  onBatchTilePlacement?: (tiles: Array<{ x: number; y: number; tileTypeIndex: number }>) => void;
  onObjectMove?: (objectId: string, newX: number, newY: number) => void;
  onSpawnPointMove?: (type: 'player' | 'npc', index: number, newX: number, newY: number) => void;
  onObjectSelect?: (objectId: string | null) => void;
  mapUpdateTrigger?: number;
}

/**
 * ⚠️ GUIDELINE COMPLIANCE: Canvas rendering (GeneralGuidelines.md)
 * - Disables image smoothing for pixel-perfect rendering
 * - Rounds all coordinates to integers
 * - Uses off-screen canvas for complex rendering if needed
 * - Caches canvas reference (useRef)
 */
export const AreaMapPreview: React.FC<AreaMapPreviewProps> = ({
  areaMap,
  isEditing,
  // ... props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTiles, setDraggedTiles] = useState<Array<{ x: number; y: number; tileTypeIndex: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ⚠️ GUIDELINE COMPLIANCE: Disable image smoothing (GeneralGuidelines.md)
    ctx.imageSmoothingEnabled = false;

    renderMap(ctx, areaMap);
  }, [areaMap, mapUpdateTrigger]);

  const renderMap = (ctx: CanvasRenderingContext2D, map: AreaMap) => {
    const TILE_SIZE = 12;
    const SCALE = 2; // 12x12 tiles rendered at 24x24 pixels

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Render tiles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTile(x, y);
        if (!tile) continue;

        // ⚠️ GUIDELINE COMPLIANCE: Round coordinates (GeneralGuidelines.md)
        const renderX = Math.floor(x * TILE_SIZE * SCALE);
        const renderY = Math.floor(y * TILE_SIZE * SCALE);

        // Render tile sprite (use SpriteRenderer)
        // Color-code by behavior: walls=red tint, floors=green tint, doors=blue tint
        renderTileSprite(ctx, tile, renderX, renderY, TILE_SIZE * SCALE);
      }
    }

    // Render interactive objects
    map.interactiveObjects.forEach(obj => {
      const x = Math.floor(obj.x * TILE_SIZE * SCALE);
      const y = Math.floor(obj.y * TILE_SIZE * SCALE);
      renderInteractiveObject(ctx, obj, x, y, TILE_SIZE * SCALE);
    });

    // Render player spawn (green circle with 'P')
    const spawn = map.playerSpawn;
    const spawnX = Math.floor(spawn.x * TILE_SIZE * SCALE);
    const spawnY = Math.floor(spawn.y * TILE_SIZE * SCALE);
    ctx.fillStyle = 'rgba(76, 175, 80, 0.5)';
    ctx.fillRect(spawnX, spawnY, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
    // Draw 'P' text

    // Render grid lines in edit mode
    if (isEditing) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= map.width; x++) {
        const lineX = Math.floor(x * TILE_SIZE * SCALE);
        ctx.beginPath();
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, map.height * TILE_SIZE * SCALE);
        ctx.stroke();
      }
      for (let y = 0; y <= map.height; y++) {
        const lineY = Math.floor(y * TILE_SIZE * SCALE);
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(map.width * TILE_SIZE * SCALE, lineY);
        ctx.stroke();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing || selectedTileIndex === null) return;

    const { x, y } = getGridPosition(e);
    if (x < 0 || x >= areaMap.width || y < 0 || y >= areaMap.height) return;

    setIsDragging(true);
    setDraggedTiles([{ x, y, tileTypeIndex: selectedTileIndex }]);

    if (onTilePlacement) {
      onTilePlacement(x, y, selectedTileIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || selectedTileIndex === null) return;

    const { x, y } = getGridPosition(e);
    if (x < 0 || x >= areaMap.width || y < 0 || y >= areaMap.height) return;

    // Check if already placed this tile
    if (draggedTiles.some(t => t.x === x && t.y === y)) return;

    const newTiles = [...draggedTiles, { x, y, tileTypeIndex: selectedTileIndex }];
    setDraggedTiles(newTiles);

    if (onTilePlacement) {
      onTilePlacement(x, y, selectedTileIndex);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && onBatchTilePlacement && draggedTiles.length > 1) {
      onBatchTilePlacement(draggedTiles);
    }
    setIsDragging(false);
    setDraggedTiles([]);
  };

  const getGridPosition = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    const TILE_SIZE = 12;
    const SCALE = 2;
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    return {
      x: Math.floor(canvasX / (TILE_SIZE * SCALE)),
      y: Math.floor(canvasY / (TILE_SIZE * SCALE))
    };
  };

  return (
    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>
      <canvas
        ref={canvasRef}
        width={areaMap.width * 24}
        height={areaMap.height * 24}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          border: '1px solid rgba(255, 255, 255, 0.3)',
          imageRendering: 'pixelated',
          cursor: isEditing && selectedTileIndex !== null ? 'crosshair' : 'default'
        }}
      />
    </div>
  );
};
```

### Step 9.3: Tile Palette Component

**File:** `react-app/src/components/developer/TilePalette.tsx`

```typescript
interface TilePaletteProps {
  tilesetId: string;
  selectedTileIndex: number | null;
  onTileSelect: (index: number) => void;
}

/**
 * Visual tile picker showing available tiles from the selected tileset.
 * Color-coded by behavior (wall=red, floor=green, door=blue).
 */
export const TilePalette: React.FC<TilePaletteProps> = ({
  tilesetId,
  selectedTileIndex,
  onTileSelect
}) => {
  const tileset = AreaMapTileSetRegistry.getById(tilesetId);
  if (!tileset) return null;

  return (
    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
        Tile Palette
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {tileset.tileTypes.map((tileType, index) => {
          const isSelected = selectedTileIndex === index;

          // Color-code by behavior
          let borderColor = 'rgba(255, 255, 255, 0.3)';
          if (tileType.behavior === TileBehavior.Wall) borderColor = 'rgba(244, 67, 54, 0.6)';
          else if (tileType.behavior === TileBehavior.Floor) borderColor = 'rgba(76, 175, 80, 0.6)';
          else if (tileType.behavior === TileBehavior.Door) borderColor = 'rgba(33, 150, 243, 0.6)';

          return (
            <div
              key={index}
              onClick={() => onTileSelect(index)}
              style={{
                padding: '8px',
                background: isSelected ? 'rgba(33, 150, 243, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                border: `2px solid ${isSelected ? 'rgba(33, 150, 243, 0.8)' : borderColor}`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                minWidth: '60px',
              }}
            >
              {/* Render tile sprite preview */}
              <div style={{ fontSize: '9px', color: '#aaa', textAlign: 'center' }}>
                {tileType.char}
              </div>
              <div style={{ fontSize: '8px', color: '#666' }}>
                {tileType.behavior}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### Step 9.4: Integration with DevPanel

Update `react-app/src/components/developer/DevPanel.tsx`:

```typescript
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { AreaMapRegistryPanel } from './AreaMapRegistryPanel';

// Add state
const [showAreaMapPanel, setShowAreaMapPanel] = useState(false);

// Add button in panel
<button
  onClick={() => setShowAreaMapPanel(true)}
  style={buttonStyle}
  title="Browse and edit area maps"
>
  Area Maps ({AreaMapRegistry.count})
</button>

// Render panel
{showAreaMapPanel && (
  <AreaMapRegistryPanel
    onClose={() => setShowAreaMapPanel(false)}
    onTestMap={(map) => {
      // Future: Launch FirstPersonView with this map
      console.log('Testing map:', map.id);
      setShowAreaMapPanel(false);
    }}
  />
)}
```

### Step 9.5: Export/Import YAML Functionality

Add helper functions for YAML export:

```typescript
const handleExport = () => {
  // Export tilesets
  const tilesetDatabase = {
    tilesets: AreaMapTileSetRegistry.getAll().map(ts => ({
      id: ts.id,
      name: ts.name,
      description: ts.description,
      spriteSheet: ts.spriteSheet,
      tileTypes: ts.tileTypes,
      tags: ts.tags,
    }))
  };

  // Export maps with ASCII grid representation
  const mapDatabase = {
    areas: areaMaps.map(map => ({
      ...map.toJSON(),
      grid: mapGridToASCII(map), // Convert grid to ASCII
    }))
  };

  // Download both files
  downloadYAML(tilesetDatabase, 'area-tileset-database.yaml');
  downloadYAML(mapDatabase, 'area-map-database.yaml');
};

const mapGridToASCII = (map: AreaMap): string => {
  const tileset = AreaMapTileSetRegistry.getById(map.tilesetId);
  if (!tileset) return '';

  const rows: string[] = [];
  for (let y = 0; y < map.height; y++) {
    let row = '';
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y);
      const tileType = tileset.tileTypes.find(tt =>
        tt.behavior === tile?.behavior && tt.spriteId === tile?.spriteId
      );
      row += tileType?.char || '.';
    }
    rows.push(row);
  }
  return rows.join('\n');
};
```

### Phase 9 Validation

**Manual Testing Checklist:**
- [ ] Can open AreaMap panel from DevPanel
- [ ] Can browse all registered area maps
- [ ] Can filter maps by tileset tags
- [ ] Can select and view map details
- [ ] Can enter edit mode for selected map
- [ ] Can edit map properties (name, description, ID)
- [ ] Can change tileset and see preview update
- [ ] Tile palette shows all tiles from selected tileset
- [ ] Can select tile from palette
- [ ] Can click to place single tile
- [ ] Can drag to paint multiple tiles
- [ ] Tile colors match behavior (wall=red, floor=green, door=blue)
- [ ] Can add interactive objects (chest, door, NPC, etc.)
- [ ] Can move interactive objects by dragging
- [ ] Can edit interactive object properties
- [ ] Can delete interactive objects
- [ ] Can move player spawn point
- [ ] Can add/remove NPC spawn points
- [ ] Can add/remove encounter zones
- [ ] Can save changes and see updates in registry
- [ ] Can cancel edits and revert to original
- [ ] Can duplicate maps with unique IDs
- [ ] Can delete maps with confirmation
- [ ] Can export tilesets and maps to YAML
- [ ] Exported YAML matches expected format
- [ ] Exported YAML can be re-imported successfully
- [ ] Grid lines visible in edit mode
- [ ] Canvas rendering is pixel-perfect (no blur)
- [ ] No console errors during operation

**Guidelines Compliance:**
- [ ] All state-modifying operations use immutable updates
- [ ] Canvas rendering disables image smoothing
- [ ] Coordinates are rounded to integers
- [ ] Stateful components are cached (useRef/useState)
- [ ] Original state stored in useRef for cancel/revert
- [ ] No object creation in render loops or hot paths

---

## Phase 10: Documentation and Cleanup

**Goal:** Finalize documentation and clean up code.

**Duration:** 1 hour

### Step 10.1: Add JSDoc Comments

Ensure all public methods have JSDoc comments.

### Step 10.2: Create Usage Examples

**File:** `GDD/FirstPersonView/AreaMap/UsageExamples.md`

```markdown
# Area Map System - Usage Examples

## Loading Data

\`\`\`typescript
import { AreaMapDataLoader } from './services/AreaMapDataLoader';

// Load all data
await AreaMapDataLoader.loadAll();
\`\`\`

## Retrieving an Area Map

\`\`\`typescript
import { AreaMapRegistry } from './utils/AreaMapRegistry';

const dungeon = AreaMapRegistry.getById('dungeon-room-1');
if (dungeon) {
  console.log(`Map: ${dungeon.name}`);
  console.log(`Size: ${dungeon.width}x${dungeon.height}`);
  console.log(`Spawn: (${dungeon.playerSpawn.x}, ${dungeon.playerSpawn.y})`);
}
\`\`\`

## Validating Movement

\`\`\`typescript
import { validateMovement } from './utils/MovementValidator';

const result = validateMovement(dungeon, playerX, playerY, 'North');

if (result.success) {
  // Move player to final position
  playerX = result.finalX!;
  playerY = result.finalY!;

  if (result.passThroughDoor) {
    console.log('Passed through door');
    // Play door animation
  }
} else {
  console.log(`Cannot move: ${result.reason}`);

  if (result.interactiveObject) {
    // Show interaction prompt
    console.log('Press E to open door');
  }
}
\`\`\`

## Opening a Door

\`\`\`typescript
// ⚠️ GUIDELINE COMPLIANCE: Immutable state updates (GeneralGuidelines.md)
// openDoor() returns a NEW AreaMap instance, does not mutate existing map
const updatedMap = dungeon.openDoor(targetX, targetY);
if (updatedMap) {
  console.log('Door opened!');
  // Update your state with the new map instance
  setCurrentAreaMap(updatedMap);
  // Door tile is now passable in updatedMap
}
\`\`\`

## Type-Safe Movement Result Handling

\`\`\`typescript
// ⚠️ GUIDELINE COMPLIANCE: Discriminated unions (GeneralGuidelines.md)
const result = validateMovement(dungeon, playerX, playerY, 'North');

// TypeScript knows which fields are available based on success
if (result.success) {
  // Type-safe: finalX and finalY are guaranteed to exist
  playerX = result.finalX;
  playerY = result.finalY;

  if (result.passThroughDoor) {
    console.log(\`Passed through door at (\${result.doorX}, \${result.doorY})\`);
  }
} else {
  // Type-safe: reason is guaranteed to exist
  console.log(\`Cannot move: \${result.reason}\`);

  // interactiveObject may or may not exist
  if (result.interactiveObject) {
    console.log('Press E to interact');
  }
}
\`\`\`
```

### Step 9.3: Update Index Exports

Make sure all public APIs are exported from appropriate index files.

---

## Final Validation Checklist

Before marking the AreaMap system as complete:

### Code Quality
- [ ] All TypeScript files compile without errors
- [ ] No linter warnings
- [ ] All public methods have JSDoc comments
- [ ] No console.log statements (use console.warn/error appropriately)

### Guidelines Compliance
- [ ] All type enums use const object pattern (not TypeScript enums)
- [ ] State-modifying methods return new objects (immutable pattern)
- [ ] MovementResult uses discriminated union (success: boolean)
- [ ] No object creation in movement validation loops
- [ ] Type guards for runtime validation (isTileBehavior)
- [ ] Async/await pattern for data loading
- [ ] Registry pattern follows existing combat system conventions

### Testing
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Edge cases tested (doors, bounds, etc.)

### Data Files
- [ ] area-tileset-database.yaml loads without errors
- [ ] area-map-database.yaml loads without errors
- [ ] All sprite IDs are valid (biomes-X format)
- [ ] All tileset references are valid

### Documentation
- [ ] Overview document is complete
- [ ] Implementation plan is accurate
- [ ] Usage examples are provided
- [ ] All edge cases are documented

### Integration
- [ ] Data loaders integrated with app initialization
- [ ] No breaking changes to existing systems
- [ ] Ready for FirstPersonView integration

---

## Next Steps

After completing this implementation:

1. **Integrate with FirstPersonView** - Use AreaMap in the first-person navigation system
2. **Add More Tilesets** - Create additional tilesets for variety
3. **Create More Maps** - Build out actual game dungeons
4. **Implement Encounters** - Connect encounter zones to combat system
5. **Add Interactive Objects** - Implement chest opening, NPC dialogue, etc.

---

## Estimated Total Time

- Phase 1: 1-2 hours (Core type definitions)
- Phase 2: 3-4 hours (AreaMap class implementation)
- Phase 3: 1-2 hours (Tileset registry)
- Phase 4: 2-3 hours (ASCII parser)
- Phase 5: 2-3 hours (Movement validation)
- Phase 6: 1 hour (AreaMap registry)
- Phase 7: 3-4 hours (Data loaders and YAML)
- Phase 8: 2-3 hours (Integration testing)
- Phase 9: 6-8 hours (Developer panel)
- Phase 10: 1 hour (Documentation and cleanup)

**Total: 22-32 hours** (3-4 days of focused work)

---

## Support and Troubleshooting

### Common Issues

**Issue: "Unknown tile character" error**
- Check that all characters in grid are defined in tileset
- Verify tileset is registered before parsing map

**Issue: "Tileset not found" error**
- Ensure tilesets are loaded before area maps
- Check tileset ID matches exactly (case-sensitive)

**Issue: "Player spawn not on walkable tile" error**
- Verify spawn coordinates point to floor tile
- Check grid coordinates (0-indexed)

**Issue: Door auto-continuation not working**
- Verify door tile has `behavior: door`
- Check that next tile after door is walkable
- Ensure no adjacent door tiles

### Debug Commands

```typescript
// List all registered tilesets
console.log(AreaMapTileSetRegistry.getAllIds());

// List all registered area maps
console.log(AreaMapRegistry.getAllIds());

// Inspect a specific map
const map = AreaMapRegistry.getById('test-room');
console.log(map?.toJSON());

// Test movement from console
const result = validateMovement(map, 2, 3, 'North');
console.log(result);
```

---

**End of Implementation Plan**

For overview and design details, see [AreaMapSystemOverview.md](./AreaMapSystemOverview.md)

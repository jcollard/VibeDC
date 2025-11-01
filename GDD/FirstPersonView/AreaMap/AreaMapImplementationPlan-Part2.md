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

## Phase 9: Documentation and Cleanup

**Goal:** Finalize documentation and clean up code.

**Duration:** 1 hour

### Step 9.1: Add JSDoc Comments

Ensure all public methods have JSDoc comments.

### Step 9.2: Create Usage Examples

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

- Phase 1: 1-2 hours
- Phase 2: 3-4 hours
- Phase 3: 1-2 hours
- Phase 4: 2-3 hours
- Phase 5: 2-3 hours
- Phase 6: 1 hour
- Phase 7: 3-4 hours
- Phase 8: 2-3 hours
- Phase 9: 1 hour

**Total: 16-24 hours** (2-3 days of focused work)

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

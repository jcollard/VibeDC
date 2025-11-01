# AreaMap System Hierarchy

**Version:** 1.0
**Last Updated:** 2025-11-01
**Related:** [AreaMapSystemOverview.md](GDD/FirstPersonView/AreaMap/AreaMapSystemOverview.md), [AreaMapImplementationPlan.md](GDD/FirstPersonView/AreaMap/AreaMapImplementationPlan.md), [GeneralGuidelines.md](GeneralGuidelines.md)

## Purpose

Token-efficient reference for AI agents to understand the AreaMap system architecture. Grid-based navigable dungeon areas with three tile behaviors (Wall, Floor, Door), interactive objects, spawn points, and encounter zones.

## How AI Agents Should Use This Document

**⚠️ IMPORTANT: Do NOT read this entire file upfront.**

This document is a **reference**, not a preamble. Reading it completely wastes tokens.

### Recommended Usage Pattern:

#### 1. **Start with Quick Reference** (below)
Read ONLY the Quick Reference section first.

#### 2. **Read Targeted Sections**
Use Navigation Index to find specific sections:
- Tile parsing → Read `#### AreaMapParser.ts` only
- Movement logic → Read `#### MovementValidator.ts` only
- YAML loading → Read `#### AreaMapDataLoader.ts` only

#### 3. **Use Search (Ctrl+F)**
Search for file names or keywords (e.g., "door", "registry", "spawn")

#### 4. **Read Data Flow ONLY if confused**
If unclear how pieces connect, read `## Data Flow Summary`

### What NOT to Do:
- ❌ Don't read all sections before starting work
- ❌ Don't include entire file in every conversation
- ❌ Don't read sections unrelated to current task

### Token Budget Guidance:
- **Quick lookup**: Quick Reference only (~100 tokens)
- **Single file work**: Quick Reference + 1 section (~1,500 tokens)
- **Feature work**: Quick Reference + 2-3 sections (~3,000 tokens)
- **Only as last resort**: Read entire file (~10,000 tokens)

---

## Navigation Index

### By Task Type:
- **ASCII map parsing** → `#### AreaMapParser.ts`
- **Movement validation** → `#### MovementValidator.ts`
- **Door behavior** → `#### TileBehavior.ts`, `#### MovementValidator.ts`
- **Map data loading** → `#### AreaMapDataLoader.ts`
- **Map registry** → `#### AreaMapRegistry.ts`, `#### AreaMapTileSetRegistry.ts`
- **Interactive objects** → `#### InteractiveObject.ts`, `#### AreaMap.ts`
- **Spawn points** → `#### SpawnPoint.ts`
- **Encounter zones** → `#### EncounterZone.ts`
- **Developer tools** → `#### AreaMapRegistryPanel.tsx`, `#### AreaMapTileSetEditorPanel.tsx`

### By Component Type:
- **Models** → `### 1. Core Models`
- **Utilities** → `### 2. Utilities`
- **Services** → `### 3. Services`
- **Components** → `### 4. Developer Tools`
- **Data Files** → `### 5. Data Files`

---

## Quick Reference: Common Tasks

- **Load area maps** → `AreaMapDataLoader.loadAll()`, fetches YAML, registers maps
- **Get map by ID** → `AreaMapRegistry.getById(id)`, returns AreaMap or undefined
- **Parse ASCII grid** → `parseAreaMapFromYAML(yaml, tileset)`, creates AreaMap from YAML
- **Validate movement** → `validateMovement(map, x, y, direction)`, returns discriminated union
- **Door auto-continuation** → Door tiles auto-continue player to next tile (passable but not walkable)
- **Check tile walkability** → `map.isWalkable(x, y)`, checks if player can stop on tile
- **Open closed door** → `map.openDoor(x, y)`, returns new AreaMap instance (immutable)
- **Get tile at position** → `map.getTile(x, y)`, returns AreaMapTile or undefined
- **Register tileset** → `AreaMapTileSetRegistry.register(tileset)`, adds to global registry
- **Browse maps in dev panel** → `<AreaMapRegistryPanel />`, developer tool component

---

## Directory Structure

```
react-app/src/
├── models/area/               # Core data models (9 files)
├── utils/                     # Utilities (4 files)
├── services/                  # Data loaders (2 files)
├── components/developer/      # Dev tools (2 files)
└── data/                      # YAML databases (2 files)
```

---

## File Hierarchy by Category

### 1. Core Models

Located in: `react-app/src/models/area/`

#### `AreaMap.ts`
**Purpose:** Main AreaMap class for navigable first-person exploration areas
**Exports:** `AreaMap`, `AreaMapJSON`
**Key Methods:** getTile(), setTile(), isInBounds(), isWalkable(), isPassable(), isDoorTile(), getInteractiveObjectAt(), updateObjectState(), openDoor(), toJSON(), fromJSON()
**Key Pattern:** Immutable state - openDoor() and updateObjectState() return NEW AreaMap instances
**Grid Storage:** Private 2D array (row-major: grid[y][x])
**Dependencies:** AreaMapTile, InteractiveObject, SpawnPoint, EncounterZone, TileBehavior
**Used By:** FirstPersonView, MovementValidator, AreaMapParser, developer panels

#### `AreaMapTile.ts`
**Purpose:** Interface for single tile in area map
**Exports:** `AreaMapTile`
**Key Properties:** behavior (TileBehavior), walkable (bool), passable (bool), spriteId (string), terrainType (optional), interactiveObjectId (optional)
**Tile Rules:**
- Wall: `walkable: false, passable: false` - blocks movement
- Floor: `walkable: true, passable: true` - normal tile
- Door: `walkable: false, passable: true` - auto-continue through
**Dependencies:** TileBehavior
**Used By:** AreaMap, AreaMapParser, rendering systems

#### `AreaMapTileSet.ts`
**Purpose:** Collection of tile definitions for reuse across maps
**Exports:** `AreaMapTileSet`
**Key Properties:** id, name, description, tileTypes (AreaMapTileDefinition[]), spriteSheet, tags (for filtering)
**Usage Pattern:** Define once, reuse across multiple maps (similar to combat TilesetDefinition)
**Dependencies:** AreaMapTileDefinition
**Used By:** AreaMapParser, AreaMapTileSetRegistry, developer panels

#### `AreaMapTileDefinition.ts`
**Purpose:** Maps ASCII character to tile configuration for YAML parsing
**Exports:** `AreaMapTileDefinition`
**Key Properties:** char (string), behavior (TileBehavior), walkable, passable, spriteId, terrainType, name, description
**Example:** `{ char: '#', behavior: 'wall', walkable: false, passable: false, spriteId: 'biomes-8' }`
**Dependencies:** TileBehavior
**Used By:** AreaMapTileSet, AreaMapParser

#### `TileBehavior.ts`
**Purpose:** Tile behavior types using const object pattern (NOT TypeScript enum)
**Exports:** `TileBehavior` const object, `TileBehavior` type, `isTileBehavior()` type guard
**Const Object:** `{ Wall: "wall", Floor: "floor", Door: "door" } as const`
**Door Behavior:** Passable but not walkable - player auto-continues through to next tile
**Why Door Tiles?** Solves "standing in doorway" UX issue in grid-based first-person games
**Dependencies:** None
**Used By:** All tile-related files

#### `InteractiveObject.ts`
**Purpose:** Interactive objects placeable on maps
**Exports:** `InteractiveObject`, `InteractiveObjectType`, `ObjectState`, `InteractiveObjectData`, `CardinalDirection`
**Object Types:** ClosedDoor, Chest, NPC, Item, Stairs, Switch, Sign (const object pattern)
**Object States:** Closed, Open, Locked, Active, Inactive (const object pattern)
**CardinalDirection:** 'North' | 'South' | 'East' | 'West'
**InteractiveObjectData:** Type-specific data (key items, loot, dialogue, destinations, etc.)
**Dependencies:** None (core types)
**Used By:** AreaMap, MovementValidator, FirstPersonView

#### `SpawnPoint.ts`
**Purpose:** Player and NPC spawn locations
**Exports:** `SpawnPoint`
**Key Properties:** x, y, direction (CardinalDirection), id (optional)
**Dependencies:** InteractiveObject (for CardinalDirection)
**Used By:** AreaMap, AreaMapParser

#### `EncounterZone.ts`
**Purpose:** Combat encounter trigger zones
**Exports:** `EncounterZone`
**Key Properties:** id, x, y, encounterId (references CombatEncounter), triggerType ('enter' | 'interact' | 'random'), triggerChance, oneTime, triggered
**Dependencies:** None
**Used By:** AreaMap, FirstPersonView (future)

#### `index.ts`
**Purpose:** Barrel export for convenient imports
**Exports:** All area model types
**Usage:** `import { AreaMap, TileBehavior } from '@/models/area'`

---

### 2. Utilities

Located in: `react-app/src/utils/`

#### `AreaMapRegistry.ts`
**Purpose:** Global registry for AreaMap instances (singleton pattern)
**Exports:** `AreaMapRegistry` (static class)
**Key Methods:** register(), registerAll(), getById(), getAll(), getAllIds(), has(), unregister(), clearRegistry(), count (getter)
**Storage:** `private static registry: Map<string, AreaMap>`
**Usage Pattern:** `AreaMapRegistry.getById('dungeon-room-1')`
**Dependencies:** AreaMap
**Used By:** FirstPersonView, AreaMapDataLoader, developer panels

#### `AreaMapTileSetRegistry.ts`
**Purpose:** Global registry for tileset definitions with tag-based filtering
**Exports:** `AreaMapTileSetRegistry` (static class)
**Key Methods:** register(), registerAll(), getById(), getByTag(), getAll(), getAllIds(), has(), unregister(), clearRegistry(), count (getter)
**Storage:** `private static registry: Map<string, AreaMapTileSet>`
**Tag Filtering:** `getByTag('dungeon')` returns all tilesets with 'dungeon' tag
**Dependencies:** AreaMapTileSet
**Used By:** AreaMapDataLoader, AreaMapParser, developer panels

#### `AreaMapParser.ts`
**Purpose:** Converts ASCII grid strings and YAML data into AreaMap instances
**Exports:** `parseAreaMapFromYAML()`, `AreaMapYAML`
**Key Function:** `parseAreaMapFromYAML(areaData: AreaMapYAML, tileset: AreaMapTileSet): AreaMap`
**Algorithm:**
1. Create char-to-tile lookup from tileset
2. Parse grid string into rows
3. Validate player spawn position
4. Build tile grid by mapping ASCII to tiles
5. Validate player spawn on walkable tile
6. Return new AreaMap
**Validation:** Throws errors for unknown chars, invalid spawns, out-of-bounds objects
**Dependencies:** All area models
**Used By:** AreaMapDataLoader

#### `MovementValidator.ts`
**Purpose:** Validates movement with door auto-continuation logic using discriminated unions
**Exports:** `validateMovement()`, `MovementResult`, `getDirectionOffset()`, `rotateLeft()`, `rotateRight()`
**MovementResult Type:** `{ success: true, finalX, finalY, passThroughDoor, doorX?, doorY? } | { success: false, reason, interactiveObject? }`
**Algorithm:**
1. Calculate target position
2. Check in bounds → fail if not
3. Check passable → fail if not (return closed door object if present)
4. Check if door tile → auto-continue to next tile (validate next tile)
5. Check walkable → success
**Failure Reasons:** 'Out of bounds', 'Door is closed', 'Tile is not passable', 'Door leads out of bounds', 'Cannot stop after passing through door', 'Adjacent door tiles detected', 'Tile is not walkable'
**Door Auto-Continuation:** Player moves TWO tiles (through door + next tile), prevents standing in doorway
**Dependencies:** AreaMap, CardinalDirection, InteractiveObject
**Used By:** FirstPersonView, FirstPersonInputHandler

---

### 3. Services

Located in: `react-app/src/services/`

#### `AreaMapDataLoader.ts`
**Purpose:** Async YAML file loader for tileset and area map databases
**Exports:** `AreaMapDataLoader` (static class)
**Key Methods:** loadTilesets(), loadAreaMaps(), loadAll()
**loadTilesets():**
1. Fetch `/data/area-tileset-database.yaml`
2. Parse YAML
3. Validate required fields
4. Register all tilesets
**loadAreaMaps():**
1. Fetch `/data/area-map-database.yaml`
2. Parse YAML
3. For each area: get tileset, parse ASCII grid
4. Collect errors (doesn't fail fast)
5. Register all successfully parsed maps
**loadAll():** Loads tilesets first, then maps
**Error Handling:** Collects errors, logs all at end, continues processing
**Dependencies:** AreaMapRegistry, AreaMapTileSetRegistry, AreaMapParser, YAML library
**Used By:** App initialization

---

### 4. Developer Tools

Located in: `react-app/src/components/developer/`

#### `AreaMapRegistryPanel.tsx`
**Purpose:** Developer panel for browsing and editing area maps
**Exports:** `AreaMapRegistryPanel`
**Props:** onClose?, onTestMap?
**Key Features:**
- Browse all registered maps
- Filter by tileset tags
- View map details and preview
- Edit mode with tile painting
- Interactive object management
- Spawn point configuration
- YAML export
- Duplicate/delete operations
**Validation:** Player spawn on walkable tile, no duplicate object positions, unique IDs
**State Management:** useRef for original state (cancel/revert), immutable updates
**Dependencies:** AreaMap, AreaMapRegistry, AreaMapTileSetRegistry, all area models
**Used By:** DeveloperPanel

#### `AreaMapTileSetEditorPanel.tsx`
**Purpose:** Developer panel for editing tileset definitions
**Exports:** `AreaMapTileSetEditorPanel`
**Key Features:**
- Browse all registered tilesets
- Edit tileset properties (name, description, tags)
- Tile type editor with sprite browser
- Behavior configuration (wall, floor, door)
- ASCII character assignment
- YAML export
- Create/duplicate/delete operations
**Sprite Integration:** Integrates with sprite browser for sprite selection
**Dependencies:** AreaMapTileSet, AreaMapTileSetRegistry
**Used By:** DeveloperPanel

---

### 5. Data Files

Located in: `react-app/src/data/`

#### `area-tileset-database.yaml`
**Purpose:** Master tileset definitions file
**Structure:**
```yaml
tilesets:
  - id: dungeon-grey-stone
    name: Grey Stone Dungeon
    spriteSheet: biomes
    tileTypes:
      - char: '#'
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-8
```
**Included Tilesets:** dungeon-grey-stone, dungeon-brown-brick, dungeon-grey-brick, dungeon-cave, dungeon-dark, palace, forest-outdoor
**Sprite Format:** `biomes-X` references biomes sprite sheet
**Dependencies:** None (data file)
**Used By:** AreaMapDataLoader

#### `area-map-database.yaml`
**Purpose:** Master area map definitions file
**Structure:**
```yaml
areas:
  - id: dungeon-room-1
    name: "Dark Chamber"
    tilesetId: dungeon-grey-stone
    grid: |-
      ##########
      ####D#####
      ##........
    playerSpawn: { x: 5, y: 7, direction: North }
    interactiveObjects: [...]
    encounterZones: [...]
```
**Grid Format:** ASCII art using tileset characters, top-left is (0,0)
**Included Areas:** test-room, dungeon-room-1, dungeon-corridor-1
**Dependencies:** None (data file)
**Used By:** AreaMapDataLoader

---

## Data Flow Summary

```
YAML Files (area-tileset-database.yaml, area-map-database.yaml)
    ↓
AreaMapDataLoader.loadAll()
    ↓
┌─────────────────────────────────────────┐
│ AreaMapParser.parseAreaMapFromYAML()   │
│ (ASCII grid → AreaMap instance)         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Registries (AreaMapRegistry,            │
│             AreaMapTileSetRegistry)     │
└─────────────────────────────────────────┘
    ↓
FirstPersonView / Developer Panels
    ↓
MovementValidator.validateMovement()
    ↓
AreaMap methods (getTile, isWalkable, isDoorTile, etc.)
```

---

## Key Interfaces Summary

```typescript
// Const Object Pattern (NOT enums)
const TileBehavior = { Wall: "wall", Floor: "floor", Door: "door" } as const;
type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];

// Discriminated Union
type MovementResult =
  | { success: true; finalX: number; finalY: number; passThroughDoor: boolean; doorX?: number; doorY?: number; }
  | { success: false; reason: string; interactiveObject?: InteractiveObject; };

// Core Interfaces
interface AreaMapTile {
  behavior: TileBehavior;
  walkable: boolean;
  passable: boolean;
  spriteId: string;
  terrainType?: string;
  interactiveObjectId?: string;
}

interface AreaMap {
  id, name, description, width, height: ...;
  tilesetId: string;
  playerSpawn: SpawnPoint;
  npcSpawns: SpawnPoint[];
  encounterZones?: EncounterZone[];
  // Methods: getTile, setTile, isWalkable, isPassable, isDoorTile, openDoor, etc.
}

interface SpawnPoint {
  x: number;
  y: number;
  direction: CardinalDirection;
  id?: string;
}
```

---

## Usage Examples

### Loading Maps
```typescript
import { AreaMapDataLoader } from '@/services/AreaMapDataLoader';

async function initializeGame() {
  await AreaMapDataLoader.loadAll(); // Loads tilesets + maps
}
```

### Retrieving Maps
```typescript
import { AreaMapRegistry } from '@/utils/AreaMapRegistry';

const dungeon = AreaMapRegistry.getById('dungeon-room-1');
const tile = dungeon?.getTile(5, 3);
```

### Validating Movement
```typescript
import { validateMovement } from '@/utils/MovementValidator';

const result = validateMovement(areaMap, playerX, playerY, 'North');

if (result.success) {
  playerX = result.finalX;
  playerY = result.finalY;
  if (result.passThroughDoor) {
    console.log('Passed through door');
  }
} else {
  console.log(`Cannot move: ${result.reason}`);
  if (result.interactiveObject) {
    console.log('Press E to interact');
  }
}
```

### Opening Doors (Immutable)
```typescript
// ⚠️ openDoor returns NEW AreaMap instance
const updatedMap = currentMap.openDoor(targetX, targetY);
if (updatedMap) {
  setCurrentAreaMap(updatedMap);
  AreaMapRegistry.register(updatedMap); // Re-register
}
```

---

## Guidelines Compliance

### ✅ Const Object Pattern (Not Enums)
```typescript
export const TileBehavior = { Wall: "wall", Floor: "floor", Door: "door" } as const;
export type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];
```

### ✅ Immutable State Updates
```typescript
// State-modifying methods return NEW objects
openDoor(x, y): AreaMap | null
updateObjectState(id, newState): AreaMap | null
```

### ✅ Type Guards
```typescript
export function isTileBehavior(value: string): value is TileBehavior
```

### ✅ Discriminated Union Results
```typescript
type MovementResult =
  | { success: true; finalX: number; finalY: number; ... }
  | { success: false; reason: string; ... };
```

### ✅ No Object Creation in Hot Paths
```typescript
// Tuple returns instead of objects
export function getDirectionOffset(direction: CardinalDirection): [number, number]
```

---

## Test Coverage

Located in: `react-app/src/models/area/__tests__/` and `react-app/src/utils/__tests__/`

**AreaMap.test.ts:** getTile, setTile, isInBounds, isWalkable, isPassable, isDoorTile, interactive objects, serialization
**AreaMapParser.test.ts:** ASCII parsing, variable-width rows, unknown chars, spawn validation, object bounds
**AreaMapTileSetRegistry.test.ts:** register, getById, getByTag, count, clearRegistry
**MovementValidator.test.ts:** floor movement, wall blocking, door auto-continuation, door edge cases, rotation helpers

---

**End of AreaMap System Hierarchy**

For detailed implementation, see:
- [AreaMapSystemOverview.md](GDD/FirstPersonView/AreaMap/AreaMapSystemOverview.md)
- [AreaMapImplementationPlan.md](GDD/FirstPersonView/AreaMap/AreaMapImplementationPlan.md)

# AreaMap System - Complete File Hierarchy

**Last Updated:** 2025-11-01
**Related Documentation:** [AreaMapSystemOverview.md](GDD/FirstPersonView/AreaMap/AreaMapSystemOverview.md), [AreaMapImplementationPlan.md](GDD/FirstPersonView/AreaMap/AreaMapImplementationPlan.md)

## Table of Contents

- [System Overview](#system-overview)
- [Core Model Files](#core-model-files)
- [Utility Files](#utility-files)
- [Service Files](#service-files)
- [Component Files](#component-files)
- [First-Person View System](#first-person-view-system)
- [Data Files](#data-files)
- [Test Files](#test-files)
- [Documentation Files](#documentation-files)
- [File Dependencies](#file-dependencies)
- [Key Interfaces and Types](#key-interfaces-and-types)
- [Method Reference](#method-reference)

---

## System Overview

The AreaMap System provides grid-based navigable dungeon areas for first-person exploration with three core tile behaviors (Wall, Floor, Door), interactive objects, spawn points, and encounter zones. The system follows immutable state patterns, uses const object enums (not TypeScript enums), and implements type-safe discriminated unions for results.

**Architecture:**
```
Data Layer (Models) → Business Logic (Utils/Services) → Presentation (Components) → Configuration (YAML)
```

**Total Files:** 38 (9 models, 4 utilities, 2 services, 4 components, 4 first-person support, 1 input handler, 2 YAML data, 4 tests, 8 docs)

---

## Core Model Files

Located in: `react-app/src/models/area/`

### `AreaMap.ts`

**Path:** `react-app/src/models/area/AreaMap.ts`

**Purpose:** Main AreaMap class representing a navigable first-person exploration area.

**Key Features:**
- Immutable state pattern (state-modifying methods return new instances)
- Grid-based tile storage (private 2D array)
- Interactive object management (Map<string, InteractiveObject>)
- Player and NPC spawn points
- Encounter zone definitions

**Class: `AreaMap`**

**Constructor Parameters:**
```typescript
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
)
```

**Properties:**
- `id: string` - Unique identifier
- `name: string` - Human-readable name
- `description: string` - Flavor text
- `width: number` - Grid width (tiles)
- `height: number` - Grid height (tiles)
- `tilesetId: string` - Tileset ID reference
- `playerSpawn: SpawnPoint` - Player starting position
- `npcSpawns: SpawnPoint[]` - NPC starting positions
- `encounterZones?: EncounterZone[]` - Combat trigger zones
- `interactiveObjects: Map<string, InteractiveObject>` - Interactive objects map
- `private grid: AreaMapTile[][]` - Tile grid (row-major: grid[y][x])

**Methods:**

#### Tile Access
- `getTile(x: number, y: number): AreaMapTile | undefined` - Get tile at position (returns undefined if out of bounds)
- `setTile(x: number, y: number, tile: AreaMapTile): boolean` - Set tile at position (returns false if out of bounds)
- `isInBounds(x: number, y: number): boolean` - Check if position is within map bounds

#### Navigation
- `isWalkable(x: number, y: number): boolean` - Check if tile is walkable (Floor tiles only)
- `isPassable(x: number, y: number): boolean` - Check if tile is passable (Floor and Door tiles)
- `isDoorTile(x: number, y: number): boolean` - Check if tile is a door (auto-continue behavior)

#### Interactive Objects
- `getInteractiveObjectAt(x: number, y: number): InteractiveObject | undefined` - Get object at position
- `updateObjectState(objectId: string, newState: ObjectState): AreaMap | null` - Update object state (returns new AreaMap instance)
- `openDoor(x: number, y: number): AreaMap | null` - Open closed door (returns new AreaMap instance with door tile replaced)

#### Serialization
- `toJSON(): AreaMapJSON` - Convert to JSON-serializable format
- `static fromJSON(json: AreaMapJSON): AreaMap` - Create AreaMap from JSON

**Interface: `AreaMapJSON`**

JSON representation for serialization:
```typescript
interface AreaMapJSON {
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

---

### `AreaMapTile.ts`

**Path:** `react-app/src/models/area/AreaMapTile.ts`

**Purpose:** Interface defining a single tile in an area map.

**Interface: `AreaMapTile`**

```typescript
interface AreaMapTile {
  behavior: TileBehavior;          // wall | floor | door
  walkable: boolean;               // Can stop on this tile
  passable: boolean;               // Can move through this tile
  spriteId: string;                // Sprite reference (e.g., 'biomes-8')
  terrainType?: string;            // Optional terrain type ('stone', 'water', 'lava', etc.)
  interactiveObjectId?: string;    // Optional interactive object ID
}
```

**Tile Behavior Rules:**
- **Wall**: `walkable: false, passable: false` - Blocks movement
- **Floor**: `walkable: true, passable: true` - Normal tile
- **Door**: `walkable: false, passable: true` - Auto-continue through

---

### `AreaMapTileSet.ts`

**Path:** `react-app/src/models/area/AreaMapTileSet.ts`

**Purpose:** Collection of tile definitions for reuse across multiple maps.

**Interface: `AreaMapTileSet`**

```typescript
interface AreaMapTileSet {
  id: string;                              // Unique identifier
  name: string;                            // Human-readable name
  description?: string;                    // Theme/purpose description
  tileTypes: AreaMapTileDefinition[];      // Tile type definitions
  spriteSheet?: string;                    // Sprite sheet ID (e.g., 'biomes')
  tags?: string[];                         // Category tags (dungeon, outdoor, cave, etc.)
}
```

**Usage:**
- Define once, reuse across multiple maps
- Similar to combat system's TilesetDefinition
- Supports tag-based filtering

---

### `AreaMapTileDefinition.ts`

**Path:** `react-app/src/models/area/AreaMapTileDefinition.ts`

**Purpose:** Maps ASCII character to tile configuration for YAML parsing.

**Interface: `AreaMapTileDefinition`**

```typescript
interface AreaMapTileDefinition {
  char: string;              // ASCII character (e.g., '#', '.', 'D')
  behavior: TileBehavior;    // wall | floor | door
  walkable: boolean;         // Can stop here
  passable: boolean;         // Can move through
  spriteId: string;          // Sprite reference
  terrainType?: string;      // Optional terrain type
  name?: string;             // Human-readable name
  description?: string;      // Description
}
```

**Example:**
```yaml
- char: '#'
  behavior: wall
  walkable: false
  passable: false
  spriteId: biomes-8
  name: Grey Stone Wall
```

---

### `TileBehavior.ts`

**Path:** `react-app/src/models/area/TileBehavior.ts`

**Purpose:** Defines tile behavior types using const object pattern (not TypeScript enum).

**Const Object: `TileBehavior`**

```typescript
export const TileBehavior = {
  Wall: "wall",      // Not walkable, blocks movement
  Floor: "floor",    // Walkable and stoppable
  Door: "door",      // Passable but not stoppable (auto-continue)
} as const;

export type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];
```

**Type Guard:**
```typescript
export function isTileBehavior(value: string): value is TileBehavior {
  return Object.values(TileBehavior).includes(value as TileBehavior);
}
```

**Why Door Tiles?**

Door tiles solve the "standing in doorway" UX issue in grid-based first-person games. When a player moves through a door tile, they automatically continue to the next tile, creating natural flow and preventing awkward positioning.

---

### `InteractiveObject.ts`

**Path:** `react-app/src/models/area/InteractiveObject.ts`

**Purpose:** Defines interactive objects that can be placed on the map.

**Const Object: `InteractiveObjectType`**

```typescript
export const InteractiveObjectType = {
  ClosedDoor: "closed-door",   // Door that can be opened
  Chest: "chest",               // Loot container
  NPC: "npc",                   // Non-player character
  Item: "item",                 // Pickup item
  Stairs: "stairs",             // Level transition
  Switch: "switch",             // Lever/button
  Sign: "sign",                 // Readable text
} as const;
```

**Const Object: `ObjectState`**

```typescript
export const ObjectState = {
  Closed: "closed",
  Open: "open",
  Locked: "locked",
  Active: "active",
  Inactive: "inactive",
} as const;
```

**Type: `CardinalDirection`**

```typescript
export type CardinalDirection = 'North' | 'South' | 'East' | 'West';
```

**Interface: `InteractiveObject`**

```typescript
interface InteractiveObject {
  id: string;                          // Unique identifier
  type: InteractiveObjectType;         // Object type
  x: number;                           // Grid position X
  y: number;                           // Grid position Y
  state: ObjectState;                  // Current state
  spriteId: string;                    // Rendering sprite
  data?: InteractiveObjectData;        // Type-specific data
}
```

**Interface: `InteractiveObjectData`**

Type-specific data for different object types:

```typescript
interface InteractiveObjectData {
  // Closed Door
  keyRequired?: string;                // Key item ID
  opensTo?: string;                    // Tile char when opened (default: 'D')

  // Chest
  lootTable?: string;                  // Loot table ID
  items?: string[];                    // Specific item IDs
  gold?: number;                       // Gold amount
  trapped?: boolean;                   // Is trapped

  // NPC
  npcId?: string;                      // NPC definition ID
  dialogueTree?: string;               // Dialogue tree ID
  shopInventory?: string[];            // Shop items
  questId?: string;                    // Quest ID

  // Item
  itemId?: string;                     // Item definition ID
  quantity?: number;                   // Stack size

  // Stairs
  destinationAreaId?: string;          // Target area map ID
  destinationX?: number;               // Spawn X in destination
  destinationY?: number;               // Spawn Y in destination
  destinationDirection?: CardinalDirection; // Spawn facing

  // Switch
  triggerId?: string;                  // Trigger event ID
  toggleable?: boolean;                // Can toggle on/off

  // Sign
  text?: string;                       // Sign text
}
```

---

### `SpawnPoint.ts`

**Path:** `react-app/src/models/area/SpawnPoint.ts`

**Purpose:** Defines player and NPC spawn locations.

**Interface: `SpawnPoint`**

```typescript
interface SpawnPoint {
  x: number;                    // Grid X coordinate
  y: number;                    // Grid Y coordinate
  direction: CardinalDirection; // Facing direction
  id?: string;                  // Optional identifier (e.g., "player-start", "npc-guard-1")
}
```

---

### `EncounterZone.ts`

**Path:** `react-app/src/models/area/EncounterZone.ts`

**Purpose:** Defines combat encounter trigger zones.

**Interface: `EncounterZone`**

```typescript
interface EncounterZone {
  id: string;                   // Unique identifier
  x: number;                    // Grid X coordinate
  y: number;                    // Grid Y coordinate
  encounterId: string;          // References CombatEncounter ID
  triggerType: 'enter' | 'interact' | 'random';
  triggerChance?: number;       // For random encounters (0.0-1.0)
  oneTime?: boolean;            // Only triggers once
  triggered?: boolean;          // Tracks if triggered
}
```

---

### `index.ts` (Barrel Export)

**Path:** `react-app/src/models/area/index.ts`

**Purpose:** Barrel export file for convenient imports.

```typescript
export * from './TileBehavior';
export * from './AreaMapTile';
export * from './AreaMapTileDefinition';
export * from './AreaMapTileSet';
export * from './InteractiveObject';
export * from './SpawnPoint';
export * from './EncounterZone';
export * from './AreaMap';
```

**Usage:**
```typescript
import { AreaMap, TileBehavior, InteractiveObject } from '@/models/area';
```

---

## Utility Files

Located in: `react-app/src/utils/`

### `AreaMapRegistry.ts`

**Path:** `react-app/src/utils/AreaMapRegistry.ts`

**Purpose:** Global registry for AreaMap instances (singleton pattern).

**Class: `AreaMapRegistry` (static)**

**Storage:**
```typescript
private static registry: Map<string, AreaMap> = new Map();
```

**Methods:**

#### Registration
- `static register(areaMap: AreaMap): void` - Register an area map (warns on duplicate ID)
- `static registerAll(areaMaps: AreaMap[]): void` - Register multiple maps at once
- `static unregister(id: string): boolean` - Remove map from registry
- `static clearRegistry(): void` - Clear all registered maps

#### Retrieval
- `static getById(id: string): AreaMap | undefined` - Get map by ID
- `static getAll(): AreaMap[]` - Get all registered maps
- `static getAllIds(): string[]` - Get all registered map IDs
- `static has(id: string): boolean` - Check if ID is registered

#### Metadata
- `static get count(): number` - Get number of registered maps

**Usage:**
```typescript
import { AreaMapRegistry } from '@/utils/AreaMapRegistry';

// Register
AreaMapRegistry.register(myAreaMap);

// Retrieve
const dungeon = AreaMapRegistry.getById('dungeon-room-1');

// List all
const allMaps = AreaMapRegistry.getAll();
console.log(`Loaded ${AreaMapRegistry.count} area maps`);
```

---

### `AreaMapTileSetRegistry.ts`

**Path:** `react-app/src/utils/AreaMapTileSetRegistry.ts`

**Purpose:** Global registry for AreaMapTileSet definitions with tag-based filtering.

**Class: `AreaMapTileSetRegistry` (static)**

**Storage:**
```typescript
private static registry: Map<string, AreaMapTileSet> = new Map();
```

**Methods:**

#### Registration
- `static register(tileset: AreaMapTileSet): void` - Register a tileset (warns on duplicate ID)
- `static registerAll(tilesets: AreaMapTileSet[]): void` - Register multiple tilesets
- `static unregister(id: string): boolean` - Remove tileset
- `static clearRegistry(): void` - Clear all tilesets

#### Retrieval
- `static getById(id: string): AreaMapTileSet | undefined` - Get tileset by ID
- `static getByTag(tag: string): AreaMapTileSet[]` - Get tilesets by tag
- `static getAll(): AreaMapTileSet[]` - Get all tilesets
- `static getAllIds(): string[]` - Get all tileset IDs
- `static has(id: string): boolean` - Check if ID is registered

#### Metadata
- `static get count(): number` - Get number of registered tilesets

**Usage:**
```typescript
import { AreaMapTileSetRegistry } from '@/utils/AreaMapTileSetRegistry';

// Find dungeon tilesets
const dungeonSets = AreaMapTileSetRegistry.getByTag('dungeon');

// Get specific tileset
const greyStone = AreaMapTileSetRegistry.getById('dungeon-grey-stone');
```

---

### `AreaMapParser.ts`

**Path:** `react-app/src/utils/AreaMapParser.ts`

**Purpose:** Converts ASCII grid strings and YAML data into AreaMap instances.

**Interface: `AreaMapYAML`**

YAML structure for area map definitions:

```typescript
interface AreaMapYAML {
  id: string;
  name: string;
  description: string;
  tilesetId: string;
  grid: string;                        // ASCII grid (multiline string)
  playerSpawn: SpawnPoint;
  interactiveObjects?: InteractiveObject[];
  npcSpawns?: SpawnPoint[];
  encounterZones?: EncounterZone[];
}
```

**Function: `parseAreaMapFromYAML`**

```typescript
export function parseAreaMapFromYAML(
  areaData: AreaMapYAML,
  tileset: AreaMapTileSet
): AreaMap
```

**Algorithm:**
1. Create character-to-tile lookup map from tileset
2. Parse grid string into rows (trim trailing, filter empty)
3. Validate player spawn position is in bounds
4. Build tile grid by mapping ASCII characters to tiles
5. Validate player spawn is on walkable tile
6. Validate interactive objects are in bounds
7. Return new AreaMap instance

**Validation:**
- Throws error if grid is empty
- Throws error for unknown tile characters
- Throws error if player spawn is out of bounds
- Throws error if player spawn is on non-walkable tile
- Throws error if interactive objects are out of bounds

**Helper Function:**
```typescript
function isValidPosition(x: number, y: number, width: number, height: number): boolean
```

**Usage:**
```typescript
import { parseAreaMapFromYAML } from '@/utils/AreaMapParser';
import { AreaMapTileSetRegistry } from '@/utils/AreaMapTileSetRegistry';

const yamlData: AreaMapYAML = {
  id: 'test-room',
  name: 'Test Room',
  description: 'A simple test room',
  tilesetId: 'dungeon-grey-stone',
  grid: `###\n#.#\n###`,
  playerSpawn: { x: 1, y: 1, direction: 'North' }
};

const tileset = AreaMapTileSetRegistry.getById('dungeon-grey-stone');
const areaMap = parseAreaMapFromYAML(yamlData, tileset);
```

---

### `MovementValidator.ts`

**Path:** `react-app/src/utils/MovementValidator.ts`

**Purpose:** Validates player movement with door auto-continuation logic using type-safe discriminated unions.

**Type: `MovementResult` (Discriminated Union)**

```typescript
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
```

**Function: `validateMovement`**

```typescript
export function validateMovement(
  areaMap: AreaMap,
  currentX: number,
  currentY: number,
  direction: CardinalDirection
): MovementResult
```

**Algorithm:**
1. Calculate target position using direction offset
2. Check if target is in bounds (fail if not)
3. Check if target is passable (fail if not)
   - If closed door, return failure with interactiveObject
4. Check if target is door tile (auto-continuation)
   - Calculate next tile after door
   - Validate next tile is in bounds (fail if not)
   - Validate next tile is walkable (fail if not)
   - Check for adjacent door tiles (fail if detected, prevents loops)
   - Return success with final position after door
5. Check if target is walkable (normal floor tile)
   - Return success with target position
6. Return failure (not walkable)

**Failure Reasons:**
- `'Out of bounds'` - Target position outside map
- `'Door is closed'` - Closed door object blocking path
- `'Tile is not passable'` - Wall tile blocking path
- `'Door leads out of bounds'` - Door continuation would go outside map
- `'Cannot stop after passing through door'` - Tile after door is not walkable
- `'Adjacent door tiles detected (would create movement loop)'` - Two door tiles next to each other
- `'Tile is not walkable'` - Fallback failure

**Helper Functions:**

```typescript
export function getDirectionOffset(direction: CardinalDirection): [number, number]
// Returns: [dx, dy] offset for direction
// North: [0, -1], South: [0, 1], East: [1, 0], West: [-1, 0]

export function rotateLeft(direction: CardinalDirection): CardinalDirection
// Counter-clockwise rotation
// North → West → South → East → North

export function rotateRight(direction: CardinalDirection): CardinalDirection
// Clockwise rotation
// North → East → South → West → North
```

**Usage:**
```typescript
import { validateMovement } from '@/utils/MovementValidator';

const result = validateMovement(areaMap, playerX, playerY, 'North');

if (result.success) {
  // Type-safe: finalX and finalY guaranteed to exist
  playerX = result.finalX;
  playerY = result.finalY;

  if (result.passThroughDoor) {
    console.log(`Passed through door at (${result.doorX}, ${result.doorY})`);
    // Play door animation
  }
} else {
  // Type-safe: reason guaranteed to exist
  console.log(`Cannot move: ${result.reason}`);

  if (result.interactiveObject) {
    // Show interaction prompt
    console.log('Press E to open door');
  }
}
```

---

## Service Files

Located in: `react-app/src/services/`

### `AreaMapDataLoader.ts`

**Path:** `react-app/src/services/AreaMapDataLoader.ts`

**Purpose:** Async YAML file loader for tileset and area map databases.

**Class: `AreaMapDataLoader` (static)**

**Methods:**

#### `loadTilesets`

```typescript
static async loadTilesets(yamlPath: string = '/data/area-tileset-database.yaml'): Promise<void>
```

**Algorithm:**
1. Fetch YAML file from path
2. Parse YAML text using YAML.parse()
3. Validate `tilesets` array exists
4. Map raw data to AreaMapTileSet objects
5. Validate required fields (id, name, tileTypes)
6. Validate tile type required fields (char, behavior, spriteId)
7. Register all tilesets with AreaMapTileSetRegistry
8. Log success message

**Throws:**
- Error if fetch fails
- Error if YAML format is invalid
- Error if required fields are missing

#### `loadAreaMaps`

```typescript
static async loadAreaMaps(yamlPath: string = '/data/area-map-database.yaml'): Promise<void>
```

**Algorithm:**
1. Fetch YAML file from path
2. Parse YAML text
3. Validate `areas` array exists
4. For each area:
   - Get tileset from registry
   - Parse ASCII grid using parseAreaMapFromYAML
   - Collect errors (does not fail fast)
5. Log all errors at end
6. Register all successfully parsed maps
7. Log success message with error count

**Error Handling:**
- Collects errors instead of failing fast (better UX)
- Continues processing remaining maps after errors
- Logs all errors at end for debugging

#### `loadAll`

```typescript
static async loadAll(): Promise<void>
```

**Algorithm:**
1. Load tilesets first (await)
2. Load area maps second (await)

**Usage:**
```typescript
import { AreaMapDataLoader } from '@/services/AreaMapDataLoader';

// In app initialization
async function initializeGame() {
  try {
    await AreaMapDataLoader.loadAll();
    console.log('[Game] Area maps loaded successfully');
  } catch (error) {
    console.error('[Game] Failed to load area maps:', error);
  }
}
```

**Integration:**
This loader should be called during app initialization alongside other data loaders (fonts, sprites, combat encounters, etc.).

---

### `MovementValidator.ts` (Service Version)

**Path:** `react-app/src/services/MovementValidator.ts`

**Purpose:** Service wrapper for movement validation logic (may coordinate with utils/MovementValidator.ts).

**Note:** Check if this is a duplicate or wrapper around the utils version. May contain additional business logic or state management.

---

## Component Files

Located in: `react-app/src/components/`

### `AreaMapRegistryPanel.tsx`

**Path:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Purpose:** Developer panel for browsing and editing area maps.

**Component: `AreaMapRegistryPanel`**

**Props:**
```typescript
interface AreaMapRegistryPanelProps {
  onClose?: () => void;
  onTestMap?: (areaMap: AreaMap) => void;
}
```

**State:**
- `areaMaps: AreaMap[]` - All registered maps
- `selectedMap: AreaMap | null` - Currently selected map
- `isEditing: boolean` - Edit mode flag
- `editedMap: AreaMapJSON | null` - Edited map data
- `selectedTag: string` - Filter by tag
- `allTags: string[]` - Available tags
- `editedTilesetId: string` - Edited tileset ID
- `mapRenderKey: number` - Force re-render trigger
- `selectedTileIndex: number | null` - Selected tile for painting

**Refs:**
- `originalMapRef: useRef<AreaMapJSON | null>` - Original map state for cancel/revert

**Key Features:**
- Browse all registered area maps
- Filter maps by tileset tags
- View map details and preview
- Edit mode with tile painting
- Interactive object management
- Spawn point configuration
- Encounter zone editing
- YAML export functionality
- Duplicate/delete operations
- Immutable state updates (returns new AreaMap instances)

**Methods:**
- `loadAreaMaps()` - Load maps from registry
- `handleSelectMap(map)` - Select map for viewing
- `handleEdit()` - Enter edit mode (stores original state)
- `handleCancelEdit()` - Cancel edits (restore original state)
- `handleSaveEdit()` - Save changes (validate and create new AreaMap)
- `handleExport()` - Export to YAML
- `handleDuplicate()` - Duplicate selected map
- `handleDelete()` - Delete map with confirmation

**Validation:**
- Player spawn must be on walkable tile
- No duplicate interactive object positions
- Unique map IDs
- Valid tileset references

**Guidelines Compliance:**
- Uses `useRef` for original state storage (cancel/revert)
- Immutable state updates (creates new AreaMap instances)
- Caches stateful components to preserve interaction state

---

### `AreaMapTileSetEditorPanel.tsx`

**Path:** `react-app/src/components/developer/AreaMapTileSetEditorPanel.tsx`

**Purpose:** Developer panel for editing AreaMapTileSet definitions.

**Component: `AreaMapTileSetEditorPanel`**

**Key Features:**
- Browse all registered tilesets
- Edit tileset properties (name, description, tags)
- Tile type editor with sprite browser
- Behavior configuration (wall, floor, door)
- ASCII character assignment
- Sprite ID selection with preview
- YAML export for tilesets
- Create new tilesets
- Duplicate/delete operations

**Sprite Integration:**
- Integrates with sprite browser for sprite selection
- Preview sprites from biomes sprite sheet
- Validate sprite IDs exist

---

### `FirstPersonView.tsx`

**Path:** `react-app/src/components/firstperson/FirstPersonView.tsx`

**Purpose:** Main first-person exploration component managing state, input, movement, and rendering.

**Component: `FirstPersonView`**

**Props:**
```typescript
interface FirstPersonViewProps {
  initialAreaMapId?: string;
  initialPartyMember?: HumanoidUnit;
  onEncounterTrigger?: (encounterId: string) => void;
  onExit?: () => void;
}
```

**State:**
- `firstPersonState: FirstPersonState` - Complete navigation state
- `isMoving: boolean` - Movement animation flag
- `targetedObject: InteractiveObject | null` - Object in front of player

**Key Features:**
- Input handling (WASD movement, QE rotation, Space interact)
- Movement validation using MovementValidator
- Door auto-continuation
- Interactive object targeting
- Encounter zone triggers
- Minimap rendering
- Party member stats panel
- Layout management
- 3D viewport integration

**Input Commands:**
- `w` - Move forward
- `s` - Move backward
- `a` - Strafe left
- `d` - Strafe right
- `q` - Rotate left
- `e` - Rotate right
- `Space` - Interact with targeted object
- `Escape` - Exit first-person view

**Methods:**
- `handleMovement(direction)` - Validate and execute movement
- `handleRotation(direction)` - Rotate player facing
- `handleInteract()` - Interact with targeted object
- `updateTargetedObject()` - Check for interactive object in front
- `triggerEncounterZone()` - Check and trigger encounter zones

**Integration:**
- Uses AreaMapRegistry to load maps
- Uses MovementValidator for movement
- Uses FirstPersonInputHandler for input
- Uses ThreeJSViewport for 3D rendering
- Uses MinimapRenderer for minimap
- Uses PartyMemberStatsPanel for stats

---

### `ThreeJSViewport.tsx`

**Path:** `react-app/src/components/firstperson/ThreeJSViewport.tsx`

**Purpose:** 3D first-person viewport using React Three Fiber.

**Component: `ThreeJSViewport`**

**Props:**
```typescript
interface ThreeJSViewportProps {
  areaMap: AreaMap;
  playerX: number;
  playerY: number;
  playerDirection: CardinalDirection;
  width: number;
  height: number;
}
```

**Key Features:**
- 3D perspective rendering with perspective camera
- Sprite sheet loading from biomes
- Tile texture mapping (walls, floors, doors)
- Camera animation for smooth movement
- Offscreen canvas composition
- Pixel-perfect rendering (no image smoothing)

**Rendering:**
- Walls: Vertical quads facing player
- Floors: Horizontal quads at bottom
- Doors: Transparent vertical quads
- Lighting: Ambient + directional lights
- FOV: 75 degrees perspective

**Guidelines Compliance:**
- Disables image smoothing (`ctx.imageSmoothingEnabled = false`)
- Rounds all coordinates to integers
- Uses off-screen canvas for complex rendering

---

## First-Person View System

Located in: `react-app/src/models/firstperson/`

### `FirstPersonState.ts`

**Path:** `react-app/src/models/firstperson/FirstPersonState.ts`

**Purpose:** Interface defining complete first-person navigation state.

**Interface: `FirstPersonState`**

```typescript
interface FirstPersonState {
  areaMap: AreaMap;                    // Current area map
  playerX: number;                     // Player grid X position
  playerY: number;                     // Player grid Y position
  playerDirection: CardinalDirection;  // Player facing direction
  partyMember: HumanoidUnit;           // Active party member
  exploredTiles: Set<string>;          // Fog of war (visited tiles)
  targetedObject: InteractiveObject | null; // Object in front
}
```

**Usage:**
- Centralized state for first-person view
- Passed between components
- Updated immutably on state changes

---

### `FirstPersonLayoutManager.ts`

**Path:** `react-app/src/models/firstperson/layouts/FirstPersonLayoutManager.ts`

**Purpose:** Manages UI layout positioning for first-person view components.

**Key Features:**
- Calculates layout positions for minimap, stats panel, viewport
- Responsive layout adjustments
- Z-index management for overlays

---

### `MinimapRenderer.ts`

**Path:** `react-app/src/models/firstperson/rendering/MinimapRenderer.ts`

**Purpose:** Renders minimap with tile visualization and fog of war.

**Class: `MinimapRenderer`**

**Key Features:**
- Canvas-based rendering
- Tile visualization (color-coded by behavior)
- Player position indicator
- Fog of war (unexplored tiles darkened)
- Grid lines for visual clarity

**Rendering:**
- Walls: Red tint
- Floors: Green tint
- Doors: Blue tint
- Player: Yellow/orange marker
- Unexplored: Dark overlay

---

### `PartyMemberStatsPanel.ts`

**Path:** `react-app/src/models/firstperson/rendering/PartyMemberStatsPanel.ts`

**Purpose:** Renders party member statistics panel.

**Key Features:**
- HP/MP bars
- Status effects
- Portrait rendering
- Equipment display

---

## Input & Movement Services

### `FirstPersonInputHandler.ts`

**Path:** `react-app/src/services/FirstPersonInputHandler.ts`

**Purpose:** Handles keyboard and input commands for first-person navigation.

**Class: `FirstPersonInputHandler`**

**Key Features:**
- Keyboard event handling (keydown/keyup)
- Command mapping (WASD, QE, Space)
- Input state tracking
- Debouncing for smooth movement

**Commands:**
- Movement: `w`, `a`, `s`, `d`
- Rotation: `q`, `e`
- Interact: `Space`
- Exit: `Escape`

---

## Data Files

Located in: `react-app/src/data/`

### `area-tileset-database.yaml`

**Path:** `react-app/src/data/area-tileset-database.yaml`

**Purpose:** Master tileset definitions file.

**Structure:**
```yaml
tilesets:
  - id: dungeon-grey-stone
    name: Grey Stone Dungeon
    description: Classic grey stone dungeon
    spriteSheet: biomes
    tileTypes:
      - char: '#'
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-8
        name: Grey Stone Wall
      - char: '.'
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-92
        terrainType: stone
      - char: 'D'
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-21
    tags:
      - dungeon
      - stone
      - indoor
```

**Included Tilesets:**
- `dungeon-grey-stone` - Grey stone dungeon
- `dungeon-brown-brick` - Brown brick dungeon
- `dungeon-grey-brick` - Grey brick dungeon (bloodstained)
- `dungeon-cave` - Natural cave formations
- `dungeon-dark` - Dark ominous dungeon
- `palace` - Ornate palace halls
- `forest-outdoor` - Outdoor forest area

**Sprite References:**
All sprite IDs reference the `biomes` sprite sheet in format `biomes-X` where X is the sprite number.

---

### `area-map-database.yaml`

**Path:** `react-app/src/data/area-map-database.yaml`

**Purpose:** Master area map definitions file.

**Structure:**
```yaml
areas:
  - id: dungeon-room-1
    name: "Dark Chamber"
    description: "A small stone chamber"
    tilesetId: dungeon-grey-stone
    grid: |-
      ##########
      ####D#####
      ##........
      #.........
      ##########
    playerSpawn:
      x: 5
      y: 7
      direction: North
    interactiveObjects:
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
    encounterZones:
      - id: goblin-ambush
        x: 5
        y: 3
        encounterId: goblin-patrol
        triggerType: enter
        oneTime: true
```

**Included Areas:**
- `test-room` - Simple test chamber for development
- `dungeon-room-1` - Dark chamber with chest and encounter
- `dungeon-corridor-1` - Twisting corridor with multiple rooms

**Grid Format:**
- ASCII art using tileset characters
- Each line is a row (Y coordinate)
- Each character is a tile (X coordinate)
- Top-left is (0, 0)
- Example: `#` = wall, `.` = floor, `D` = door, `>` = stairs

---

## Test Files

Located in: `react-app/src/`

### `AreaMap.test.ts`

**Path:** `react-app/src/models/area/__tests__/AreaMap.test.ts`

**Purpose:** Unit tests for AreaMap class.

**Test Suites:**
- `getTile` - Tile retrieval and bounds checking
- `setTile` - Tile updates and bounds checking
- `isInBounds` - Position validation
- `isWalkable` - Walkability checks for wall/floor/door tiles
- `isPassable` - Passability checks for wall/floor/door tiles
- `isDoorTile` - Door tile detection
- `interactive objects` - Object placement, retrieval, state updates
- `serialization` - toJSON/fromJSON round-trip

**Test Utilities:**
- `createWallTile()` - Factory for wall tiles
- `createFloorTile()` - Factory for floor tiles
- `createDoorTile()` - Factory for door tiles
- `createTestMap()` - Factory for test maps

---

### `AreaMapParser.test.ts`

**Path:** `react-app/src/utils/__tests__/AreaMapParser.test.ts`

**Purpose:** Unit tests for ASCII parsing and YAML conversion.

**Test Suites:**
- Simple grid parsing
- Variable-width row handling
- Unknown character error handling
- Empty grid error handling
- Spawn validation (position and walkability)
- Interactive object bounds validation

**Test Scenarios:**
- Valid ASCII grid → AreaMap
- Grid with short rows (padding)
- Invalid character throws error
- Spawn on wall throws error
- Object out of bounds throws error

---

### `AreaMapTileSetRegistry.test.ts`

**Path:** `react-app/src/utils/__tests__/AreaMapTileSetRegistry.test.ts`

**Purpose:** Unit tests for tileset registry.

**Test Suites:**
- `register` - Registration and overwrite warnings
- `getById` - Retrieval by ID
- `getByTag` - Tag-based filtering
- `count` - Registry size tracking
- `clearRegistry` - Registry cleanup

**Test Utilities:**
- `createTestTileset()` - Factory for test tilesets

---

### `MovementValidator.test.ts`

**Path:** `react-app/src/utils/__tests__/MovementValidator.test.ts`

**Purpose:** Unit tests for movement validation.

**Test Suites:**
- `validateMovement` - Movement validation with various scenarios
  - Normal floor movement
  - Wall blocking
  - Out of bounds blocking
  - Door auto-continuation
  - Door leading to wall (blocked)
  - Door leading out of bounds (blocked)
  - Adjacent door tiles (blocked)
- `getDirectionOffset` - Direction offset calculations
- `rotateLeft` - Counter-clockwise rotation
- `rotateRight` - Clockwise rotation

**Test Utilities:**
- `createWallTile()`, `createFloorTile()`, `createDoorTile()` - Tile factories

---

## Documentation Files

Located in: `GDD/FirstPersonView/` and `GDD/FirstPersonView/AreaMap/`

### Overview Documents

1. **AreaMapSystemOverview.md**
   - Path: `GDD/FirstPersonView/AreaMap/AreaMapSystemOverview.md`
   - Comprehensive design document with tile behaviors, data structures, YAML format, edge cases

2. **FirstPersonViewOverview.md**
   - Path: `GDD/FirstPersonView/FirstPersonViewOverview.md`
   - First-person view system overview

### Implementation Plans

3. **AreaMapImplementationPlan.md**
   - Path: `GDD/FirstPersonView/AreaMap/AreaMapImplementationPlan.md`
   - Phase 1-7 implementation plan (Core types through data loaders)

4. **AreaMapImplementationPlan-Part2.md**
   - Path: `GDD/FirstPersonView/AreaMap/AreaMapImplementationPlan-Part2.md`
   - Phase 5-10 (Movement validation through documentation)

5. **FirstPersonViewImplementationPlan.md**
   - Path: `GDD/FirstPersonView/FirstPersonViewImplementationPlan.md`
   - First-person view implementation plan

### Completion Documents

6. **ImplementationComplete.md**
   - Path: `GDD/FirstPersonView/AreaMap/ImplementationComplete.md`
   - Implementation completion notes

7. **DeveloperPanelComplete.md**
   - Path: `GDD/FirstPersonView/AreaMap/DeveloperPanelComplete.md`
   - Developer panel completion notes

### Summary Documents

8. **README.md**
   - Path: `GDD/FirstPersonView/AreaMap/README.md`
   - Quick reference and getting started guide

---

## File Dependencies

### Dependency Graph

```
Data Files (YAML)
    ↓
AreaMapDataLoader (Service)
    ↓
┌────────────────────────────────────────┐
│   AreaMapParser (Utility)             │
│   AreaMapTileSetRegistry (Utility)    │
│   AreaMapRegistry (Utility)           │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│   AreaMap (Model)                      │
│   AreaMapTileSet (Model)               │
│   AreaMapTile (Model)                  │
│   TileBehavior (Model)                 │
│   InteractiveObject (Model)            │
│   SpawnPoint (Model)                   │
│   EncounterZone (Model)                │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│   MovementValidator (Utility)          │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│   FirstPersonState (Model)             │
│   FirstPersonInputHandler (Service)    │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│   FirstPersonView (Component)          │
│   ThreeJSViewport (Component)          │
│   MinimapRenderer (Model)              │
│   PartyMemberStatsPanel (Model)        │
└────────────────────────────────────────┘
    ↓
Developer Tools
    ↓
┌────────────────────────────────────────┐
│   AreaMapRegistryPanel (Component)     │
│   AreaMapTileSetEditorPanel (Comp.)   │
└────────────────────────────────────────┘
```

### Import Relationships

**AreaMap.ts** imports:
- `AreaMapTile` from `./AreaMapTile`
- `InteractiveObject`, `ObjectState`, `InteractiveObjectType` from `./InteractiveObject`
- `SpawnPoint` from `./SpawnPoint`
- `EncounterZone` from `./EncounterZone`
- `TileBehavior` from `./TileBehavior`
- `AreaMapTileSetRegistry` from `../../utils/AreaMapTileSetRegistry`

**AreaMapParser.ts** imports:
- `AreaMap` from `../models/area/AreaMap`
- `AreaMapTile` from `../models/area/AreaMapTile`
- `AreaMapTileSet` from `../models/area/AreaMapTileSet`
- `InteractiveObject` from `../models/area/InteractiveObject`
- `SpawnPoint` from `../models/area/SpawnPoint`
- `EncounterZone` from `../models/area/EncounterZone`

**AreaMapDataLoader.ts** imports:
- `YAML` from `yaml`
- `AreaMapTileSetRegistry` from `../utils/AreaMapTileSetRegistry`
- `AreaMapRegistry` from `../utils/AreaMapRegistry`
- `parseAreaMapFromYAML`, `AreaMapYAML` from `../utils/AreaMapParser`
- `AreaMapTileSet` from `../models/area/AreaMapTileSet`

**MovementValidator.ts** imports:
- `AreaMap` from `../models/area/AreaMap`
- `CardinalDirection`, `InteractiveObject` from `../models/area/InteractiveObject`
- `InteractiveObjectType` from `../models/area/InteractiveObject`

**FirstPersonView.tsx** imports:
- `useState`, `useEffect`, `useRef` from `react`
- `FirstPersonState` from `../../models/firstperson/FirstPersonState`
- `AreaMapRegistry` from `../../utils/AreaMapRegistry`
- `MovementValidator` from `../../utils/MovementValidator`
- `FirstPersonInputHandler` from `../../services/FirstPersonInputHandler`
- `ThreeJSViewport` from `./ThreeJSViewport`
- `MinimapRenderer` from `../../models/firstperson/rendering/MinimapRenderer`
- `PartyMemberStatsPanel` from `../../models/firstperson/rendering/PartyMemberStatsPanel`

**AreaMapRegistryPanel.tsx** imports:
- `useState`, `useEffect`, `useRef` from `react`
- `AreaMap`, `AreaMapJSON` from `../../models/area/AreaMap`
- `AreaMapRegistry` from `../../utils/AreaMapRegistry`
- `AreaMapTileSetRegistry` from `../../utils/AreaMapTileSetRegistry`
- `TileBehavior` from `../../models/area/TileBehavior`
- `InteractiveObjectType`, `ObjectState`, `InteractiveObject` from `../../models/area/InteractiveObject`
- `SpawnPoint` from `../../models/area/SpawnPoint`
- `EncounterZone` from `../../models/area/EncounterZone`

---

## Key Interfaces and Types

### Core Types Summary

```typescript
// Tile Behavior (const object pattern)
const TileBehavior = { Wall: "wall", Floor: "floor", Door: "door" } as const;
type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];

// Interactive Object Types
const InteractiveObjectType = {
  ClosedDoor: "closed-door",
  Chest: "chest",
  NPC: "npc",
  Item: "item",
  Stairs: "stairs",
  Switch: "switch",
  Sign: "sign",
} as const;

// Object States
const ObjectState = {
  Closed: "closed",
  Open: "open",
  Locked: "locked",
  Active: "active",
  Inactive: "inactive",
} as const;

// Cardinal Directions
type CardinalDirection = 'North' | 'South' | 'East' | 'West';

// Movement Result (discriminated union)
type MovementResult =
  | { success: true; finalX: number; finalY: number; passThroughDoor: boolean; doorX?: number; doorY?: number; }
  | { success: false; reason: string; interactiveObject?: InteractiveObject; };
```

### Data Structure Hierarchy

```
AreaMap
├── id, name, description
├── width, height
├── tilesetId
├── grid: AreaMapTile[][]
│   └── AreaMapTile
│       ├── behavior: TileBehavior
│       ├── walkable: boolean
│       ├── passable: boolean
│       ├── spriteId: string
│       ├── terrainType?: string
│       └── interactiveObjectId?: string
├── interactiveObjects: Map<string, InteractiveObject>
│   └── InteractiveObject
│       ├── id, type, x, y, state
│       ├── spriteId
│       └── data?: InteractiveObjectData
│           ├── Closed Door: keyRequired, opensTo
│           ├── Chest: lootTable, items, gold, trapped
│           ├── NPC: npcId, dialogueTree, shopInventory, questId
│           ├── Item: itemId, quantity
│           ├── Stairs: destinationAreaId, destinationX/Y, destinationDirection
│           ├── Switch: triggerId, toggleable
│           └── Sign: text
├── playerSpawn: SpawnPoint
│   ├── x, y
│   ├── direction: CardinalDirection
│   └── id?
├── npcSpawns: SpawnPoint[]
└── encounterZones?: EncounterZone[]
    └── EncounterZone
        ├── id, x, y
        ├── encounterId
        ├── triggerType: 'enter' | 'interact' | 'random'
        ├── triggerChance?
        ├── oneTime?
        └── triggered?

AreaMapTileSet
├── id, name, description
├── spriteSheet?
├── tags?: string[]
└── tileTypes: AreaMapTileDefinition[]
    └── AreaMapTileDefinition
        ├── char: string
        ├── behavior: TileBehavior
        ├── walkable: boolean
        ├── passable: boolean
        ├── spriteId: string
        ├── terrainType?: string
        ├── name?: string
        └── description?: string

FirstPersonState
├── areaMap: AreaMap
├── playerX, playerY
├── playerDirection: CardinalDirection
├── partyMember: HumanoidUnit
├── exploredTiles: Set<string>
└── targetedObject: InteractiveObject | null
```

---

## Method Reference

### AreaMap Class Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `getTile` | `x: number, y: number` | `AreaMapTile \| undefined` | Get tile at position |
| `setTile` | `x: number, y: number, tile: AreaMapTile` | `boolean` | Set tile (returns false if out of bounds) |
| `isInBounds` | `x: number, y: number` | `boolean` | Check if position is valid |
| `isWalkable` | `x: number, y: number` | `boolean` | Check if can stop on tile (Floor only) |
| `isPassable` | `x: number, y: number` | `boolean` | Check if can move through tile (Floor and Door) |
| `isDoorTile` | `x: number, y: number` | `boolean` | Check if tile is door (auto-continue) |
| `getInteractiveObjectAt` | `x: number, y: number` | `InteractiveObject \| undefined` | Get object at position |
| `updateObjectState` | `objectId: string, newState: ObjectState` | `AreaMap \| null` | Update object state (returns new AreaMap) |
| `openDoor` | `x: number, y: number` | `AreaMap \| null` | Open closed door (returns new AreaMap) |
| `toJSON` | - | `AreaMapJSON` | Serialize to JSON |
| `fromJSON` (static) | `json: AreaMapJSON` | `AreaMap` | Deserialize from JSON |

### AreaMapRegistry Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `register` | `areaMap: AreaMap` | `void` | Register area map |
| `registerAll` | `areaMaps: AreaMap[]` | `void` | Register multiple maps |
| `getById` | `id: string` | `AreaMap \| undefined` | Get map by ID |
| `getAll` | - | `AreaMap[]` | Get all maps |
| `getAllIds` | - | `string[]` | Get all IDs |
| `has` | `id: string` | `boolean` | Check if registered |
| `unregister` | `id: string` | `boolean` | Remove map |
| `clearRegistry` | - | `void` | Clear all maps |
| `count` (getter) | - | `number` | Get map count |

### AreaMapTileSetRegistry Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `register` | `tileset: AreaMapTileSet` | `void` | Register tileset |
| `registerAll` | `tilesets: AreaMapTileSet[]` | `void` | Register multiple tilesets |
| `getById` | `id: string` | `AreaMapTileSet \| undefined` | Get tileset by ID |
| `getByTag` | `tag: string` | `AreaMapTileSet[]` | Get tilesets by tag |
| `getAll` | - | `AreaMapTileSet[]` | Get all tilesets |
| `getAllIds` | - | `string[]` | Get all IDs |
| `has` | `id: string` | `boolean` | Check if registered |
| `unregister` | `id: string` | `boolean` | Remove tileset |
| `clearRegistry` | - | `void` | Clear all tilesets |
| `count` (getter) | - | `number` | Get tileset count |

### AreaMapDataLoader Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `loadTilesets` | `yamlPath?: string` | `Promise<void>` | Load tileset database from YAML |
| `loadAreaMaps` | `yamlPath?: string` | `Promise<void>` | Load area map database from YAML |
| `loadAll` | - | `Promise<void>` | Load tilesets then maps |

### MovementValidator Functions

| Function | Parameters | Return Type | Description |
|----------|-----------|-------------|-------------|
| `validateMovement` | `areaMap: AreaMap, currentX: number, currentY: number, direction: CardinalDirection` | `MovementResult` | Validate movement with door auto-continuation |
| `getDirectionOffset` | `direction: CardinalDirection` | `[number, number]` | Get [dx, dy] offset for direction |
| `rotateLeft` | `direction: CardinalDirection` | `CardinalDirection` | Rotate counter-clockwise |
| `rotateRight` | `direction: CardinalDirection` | `CardinalDirection` | Rotate clockwise |

### AreaMapParser Functions

| Function | Parameters | Return Type | Description |
|----------|-----------|-------------|-------------|
| `parseAreaMapFromYAML` | `areaData: AreaMapYAML, tileset: AreaMapTileSet` | `AreaMap` | Parse ASCII grid to AreaMap |

---

## Usage Examples

### Loading Data

```typescript
import { AreaMapDataLoader } from '@/services/AreaMapDataLoader';

// In app initialization
async function initializeGame() {
  await AreaMapDataLoader.loadAll();
  console.log('Area maps loaded');
}
```

### Retrieving and Using Maps

```typescript
import { AreaMapRegistry } from '@/utils/AreaMapRegistry';
import { validateMovement } from '@/utils/MovementValidator';

// Get map
const dungeon = AreaMapRegistry.getById('dungeon-room-1');

// Check tile
const tile = dungeon.getTile(5, 3);
console.log(`Tile behavior: ${tile?.behavior}`);

// Validate movement
const result = validateMovement(dungeon, playerX, playerY, 'North');

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

### Opening Doors (Immutable Pattern)

```typescript
// ⚠️ openDoor returns NEW AreaMap instance
const updatedMap = currentMap.openDoor(targetX, targetY);

if (updatedMap) {
  // Update state with new map
  setCurrentAreaMap(updatedMap);
  // Re-register with registry
  AreaMapRegistry.register(updatedMap);
}
```

### Creating Custom Maps

```typescript
import { AreaMap } from '@/models/area/AreaMap';
import { TileBehavior } from '@/models/area/TileBehavior';

// Create tiles
const floor: AreaMapTile = {
  behavior: TileBehavior.Floor,
  walkable: true,
  passable: true,
  spriteId: 'biomes-92',
  terrainType: 'stone'
};

const wall: AreaMapTile = {
  behavior: TileBehavior.Wall,
  walkable: false,
  passable: false,
  spriteId: 'biomes-8'
};

// Build grid
const grid = [
  [wall, wall, wall],
  [wall, floor, wall],
  [wall, wall, wall]
];

// Create map
const customMap = new AreaMap(
  'custom-1',
  'Custom Room',
  'A custom test room',
  3,
  3,
  grid,
  'dungeon-grey-stone',
  { x: 1, y: 1, direction: 'North' }
);

// Register
AreaMapRegistry.register(customMap);
```

---

## Guidelines Compliance Summary

The AreaMap system follows these key patterns from [GeneralGuidelines.md](GeneralGuidelines.md):

### ✅ Const Object Pattern (Not Enums)
All type definitions use const objects with `as const`:
```typescript
export const TileBehavior = { Wall: "wall", Floor: "floor", Door: "door" } as const;
export type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];
```

### ✅ Immutable State Updates
State-modifying methods return NEW objects:
- `AreaMap.updateObjectState()` returns new AreaMap
- `AreaMap.openDoor()` returns new AreaMap
- Never mutates grid or objects directly

### ✅ Type Guards
Boolean type guards for runtime validation:
```typescript
export function isTileBehavior(value: string): value is TileBehavior
```

### ✅ Discriminated Union Results
Type-safe result types:
```typescript
export type MovementResult =
  | { success: true; finalX: number; finalY: number; ... }
  | { success: false; reason: string; ... };
```

### ✅ No Object Creation in Hot Paths
Movement validation uses tuple returns:
```typescript
export function getDirectionOffset(direction: CardinalDirection): [number, number]
```

### ✅ Canvas Rendering Best Practices
- Disable image smoothing: `ctx.imageSmoothingEnabled = false`
- Round all coordinates: `Math.floor(x * TILE_SIZE * SCALE)`
- Off-screen canvas for complex rendering

### ✅ React State Management
- `useRef` for non-rendering state (original map for cancel/revert)
- `useState` for data triggering re-renders
- Cached stateful components preserve interaction state

---

**End of AreaMap System Hierarchy Documentation**

For implementation details, see:
- [AreaMapSystemOverview.md](GDD/FirstPersonView/AreaMap/AreaMapSystemOverview.md)
- [AreaMapImplementationPlan.md](GDD/FirstPersonView/AreaMap/AreaMapImplementationPlan.md)
- [AreaMapImplementationPlan-Part2.md](GDD/FirstPersonView/AreaMap/AreaMapImplementationPlan-Part2.md)

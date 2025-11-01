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
- **Event system** → `#### EventArea.ts`, `#### EventProcessor.ts`, `#### EventTrigger.ts`
- **Event actions** → `### 1a. Event System - Actions`
- **Event preconditions** → `### 1a. Event System - Preconditions`
- **Developer tools** → `#### AreaMapRegistryPanel.tsx`, `#### AreaMapTileSetEditorPanel.tsx`, `#### EventEditorModal.tsx`

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
- **Process events** → `eventProcessor.processMovement(state, map, oldX, oldY, newX, newY)`, returns new GameState
- **Create event area** → Define in YAML with id, position, dimensions, events array
- **Add event action** → Add to event's actions array (ShowMessage, Teleport, etc.)
- **Add event precondition** → Add to event's preconditions array (GlobalVariableIs, etc.)
- **Browse maps in dev panel** → `<AreaMapRegistryPanel />`, developer tool component
- **Edit events visually** → `<EventEditorModal />`, create/edit event areas and events

---

## Directory Structure

```
react-app/src/
├── models/area/               # Core data models (22 files)
│   ├── actions/              # Event action implementations (7 files)
│   ├── preconditions/        # Event precondition implementations (5 files)
│   └── __tests__/            # Model tests (3 files)
├── utils/                     # Utilities (6 files)
│   └── __tests__/            # Utility tests (3 files)
├── services/                  # Data loaders (2 files)
├── components/developer/      # Dev tools (3 files)
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

### 1a. Event System - Core

Located in: `react-app/src/models/area/`

#### `EventArea.ts`
**Purpose:** Defines event areas and events that trigger based on player movement
**Exports:** `EventArea`, `AreaEvent`, `EventAreaJSON`, `AreaEventJSON`, helper functions
**Key Types:**
- EventArea: Rectangular area with events (id, x, y, width, height, events[], description, color)
- AreaEvent: Single event (id, trigger, preconditions[], actions[], oneTime, triggered, description)
**Helper Functions:**
- isPositionInEventArea(area, x, y): boolean
- getEventsByTrigger(area, trigger): AreaEvent[]
- getPendingOneTimeEvents(area): AreaEvent[]
**Dependencies:** EventTrigger, EventPrecondition, EventAction
**Used By:** EventProcessor, AreaMapParser, FirstPersonView, EventEditorModal

#### `EventTrigger.ts`
**Purpose:** Event trigger types (when events fire)
**Exports:** `EventTrigger` const object, `EventTrigger` type, `isEventTrigger()` type guard
**Const Object:** `{ OnEnter: "on-enter", OnStep: "on-step", OnExit: "on-exit" } as const`
**Trigger Types:**
- OnEnter: Fires when player enters area (wasn't in area previous frame)
- OnStep: Fires every frame player is in area (was in area previous frame)
- OnExit: Fires when player exits area (was in area previous frame)
**Guidelines Compliance:** Uses const object pattern (NOT enum)
**Dependencies:** None
**Used By:** EventArea, EventProcessor, AreaMapParser

#### `EventPrecondition.ts`
**Purpose:** Base interface for event preconditions (conditions that must be true)
**Exports:** `EventPrecondition`, `EventPreconditionJSON`, `GameState`
**Key Interface:**
- type: string (discriminator for JSON)
- evaluate(state: GameState): boolean
- toJSON(): EventPreconditionJSON
**GameState:** Interface for game state (globalVariables: Map, messageLog, currentMapId, playerPosition, etc.)
**Guidelines Compliance:** Pure functions (no side effects), immutable state
**Dependencies:** CardinalDirection (from InteractiveObject)
**Used By:** All precondition implementations, EventProcessor, ActionFactory

#### `EventAction.ts`
**Purpose:** Base interface for event actions (operations to perform)
**Exports:** `EventAction`, `EventActionJSON`
**Key Interface:**
- type: string (discriminator for JSON)
- execute(state: GameState): GameState (MUST return new state - immutable)
- toJSON(): EventActionJSON
**Guidelines Compliance:** Immutable state updates (always return new state)
**Dependencies:** GameState (from EventPrecondition)
**Used By:** All action implementations, EventProcessor, PreconditionFactory

#### `README.md`
**Purpose:** Event system documentation with examples and common patterns
**Content:** Quick start, event types, preconditions, actions, common patterns, best practices, troubleshooting
**See:** models/area/README.md for full documentation

---

### 1b. Event System - Preconditions

Located in: `react-app/src/models/area/preconditions/`

#### `GlobalVariableIs.ts`
**Purpose:** Checks if a global variable equals a specific value
**Exports:** `GlobalVariableIs` class
**Constructor:** `(variableName: string, expectedValue: string | number | boolean)`
**evaluate():** Returns true if state.globalVariables.get(variableName) === expectedValue
**fromJSON():** Static factory method for deserialization
**Guidelines Compliance:** Pure function, no side effects
**Dependencies:** EventPrecondition, GameState
**Used By:** PreconditionFactory, EventProcessor

#### `GlobalVariableIsGreaterThan.ts`
**Purpose:** Checks if a numeric variable is greater than a threshold
**Exports:** `GlobalVariableIsGreaterThan` class
**Constructor:** `(variableName: string, threshold: number)`
**evaluate():** Returns true if variable > threshold (type-checks for number)
**fromJSON():** Static factory method
**Dependencies:** EventPrecondition, GameState
**Used By:** PreconditionFactory

#### `GlobalVariableIsLessThan.ts`
**Purpose:** Checks if a numeric variable is less than a threshold
**Exports:** `GlobalVariableIsLessThan` class
**Constructor:** `(variableName: string, threshold: number)`
**evaluate():** Returns true if variable < threshold (type-checks for number)
**fromJSON():** Static factory method
**Dependencies:** EventPrecondition, GameState
**Used By:** PreconditionFactory

#### `PreconditionFactory.ts`
**Purpose:** Factory for creating precondition instances from JSON
**Exports:** `PreconditionFactory` (static class)
**Key Method:** `fromJSON(json: EventPreconditionJSON): EventPrecondition`
**Pattern:** Switch on type discriminator, delegates to class-specific fromJSON()
**Error Handling:** Throws on unknown type
**Guidelines Compliance:** Discriminated union pattern, type-safe deserialization
**Dependencies:** All precondition implementations
**Used By:** AreaMapParser

#### `index.ts`
**Purpose:** Barrel export for preconditions
**Exports:** All precondition classes and factory
**Usage:** `import { GlobalVariableIs, PreconditionFactory } from '@/models/area/preconditions'`

---

### 1c. Event System - Actions

Located in: `react-app/src/models/area/actions/`

#### `ShowMessage.ts`
**Purpose:** Displays a message to the player
**Exports:** `ShowMessage` class
**Constructor:** `(message: string)`
**execute():** Appends message to state.messageLog array (returns new state)
**fromJSON():** Static factory method
**Guidelines Compliance:** Immutable update (creates new array with spread)
**Dependencies:** EventAction, GameState
**Used By:** ActionFactory, EventProcessor

#### `SetGlobalVariable.ts`
**Purpose:** Sets or updates a global variable
**Exports:** `SetGlobalVariable` class
**Constructor:** `(variableName: string, value: string | number | boolean)`
**execute():** Creates new Map with updated variable (returns new state)
**fromJSON():** Static factory method
**Guidelines Compliance:** Immutable update (new Map instance)
**Dependencies:** EventAction, GameState
**Used By:** ActionFactory

#### `Teleport.ts`
**Purpose:** Moves player to different map and position
**Exports:** `Teleport` class
**Constructor:** `(targetMapId: string, targetX: number, targetY: number, targetDirection?: CardinalDirection)`
**execute():** Updates currentMapId, playerPosition, playerDirection (returns new state)
**fromJSON():** Static factory method
**Dependencies:** EventAction, GameState, CardinalDirection
**Used By:** ActionFactory, FirstPersonView (for handling map changes)

#### `Rotate.ts`
**Purpose:** Changes player's facing direction
**Exports:** `Rotate` class
**Constructor:** `(newDirection: CardinalDirection)`
**execute():** Updates playerDirection (returns new state)
**fromJSON():** Static factory method
**Dependencies:** EventAction, GameState, CardinalDirection
**Used By:** ActionFactory

#### `StartEncounter.ts`
**Purpose:** Triggers a combat encounter
**Exports:** `StartEncounter` class
**Constructor:** `(encounterId: string)`
**execute():** Sets combatState to active with encounterId (returns new state)
**fromJSON():** Static factory method
**Dependencies:** EventAction, GameState
**Used By:** ActionFactory, FirstPersonView (for combat transitions)

#### `ActionFactory.ts`
**Purpose:** Factory for creating action instances from JSON
**Exports:** `ActionFactory` (static class)
**Key Method:** `fromJSON(json: EventActionJSON): EventAction`
**Pattern:** Switch on type discriminator, delegates to class-specific fromJSON()
**Error Handling:** Throws on unknown type
**Guidelines Compliance:** Discriminated union pattern, extensible design
**Dependencies:** All action implementations
**Used By:** AreaMapParser

#### `index.ts`
**Purpose:** Barrel export for actions
**Exports:** All action classes and factory
**Usage:** `import { ShowMessage, ActionFactory } from '@/models/area/actions'`

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

#### `EventProcessor.ts`
**Purpose:** Processes events based on player movement, executes preconditions and actions
**Exports:** `EventProcessor` (class)
**Key Method:** `processMovement(gameState, areaMap, previousX, previousY, currentX, currentY): GameState`
**Algorithm:**
1. Determine which event areas contain previous and current positions
2. Calculate entered, stayed-in, and exited areas
3. Process OnExit events (player leaving areas)
4. Process OnEnter events (player entering new areas)
5. Process OnStep events (player still in areas)
6. For each event: check preconditions → execute actions in order → mark one-time events as triggered
**Performance:** O(n + m) where n = event areas, m = events in active areas
**Error Handling:** Try-catch around precondition.evaluate() and action.execute(), logs errors, continues processing
**Guidelines Compliance:** Returns NEW game state (immutable), no mutations
**Dependencies:** AreaMap, EventArea, EventTrigger, GameState
**Used By:** FirstPersonView

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

#### `EventEditorModal.tsx`
**Purpose:** Modal dialog for creating and editing event areas and events
**Exports:** `EventEditorModal`
**Props:** isOpen, onClose, areaMap, eventArea (optional for editing)
**Key Features:**
- Create new event areas or edit existing ones
- Set area position, dimensions, description, color
- Event list editor (add/remove/reorder events)
- Event property editor (id, trigger, oneTime, description)
- Precondition builder (type selector, property editors)
- Action builder (type selector, property editors)
- Real-time validation (unique IDs, valid coordinates, required fields)
- YAML preview
- Save/cancel operations
**UI Sections:**
- Area Properties (x, y, width, height, description, color picker)
- Events List (expandable cards with event details)
- Event Editor (trigger dropdown, oneTime checkbox, description)
- Preconditions Editor (add/remove, type-specific forms)
- Actions Editor (add/remove, type-specific forms)
**Validation:** Prevents invalid event configurations, shows error messages
**Dependencies:** EventArea, AreaEvent, EventTrigger, PreconditionFactory, ActionFactory
**Used By:** AreaMapRegistryPanel

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
│ (ASCII grid + events → AreaMap)         │
│   - PreconditionFactory.fromJSON()      │
│   - ActionFactory.fromJSON()            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Registries (AreaMapRegistry,            │
│             AreaMapTileSetRegistry)     │
└─────────────────────────────────────────┘
    ↓
FirstPersonView / Developer Panels
    ↓
┌─────────────────────────────────────────┐
│ Movement & Validation                   │
│ - MovementValidator.validateMovement()  │
│ - AreaMap methods (getTile, etc.)       │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Event Processing (after movement)       │
│ - EventProcessor.processMovement()      │
│   - Evaluate preconditions              │
│   - Execute actions                     │
│   - Return new GameState                │
└─────────────────────────────────────────┘
    ↓
Handle State Changes (Teleport, Combat, Messages, etc.)
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

// Event System Types
const EventTrigger = { OnEnter: "on-enter", OnStep: "on-step", OnExit: "on-exit" } as const;
type EventTrigger = typeof EventTrigger[keyof typeof EventTrigger];

interface EventArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  events: AreaEvent[];
  description?: string;
  color?: string;
}

interface AreaEvent {
  id: string;
  trigger: EventTrigger;
  preconditions: EventPrecondition[];
  actions: EventAction[];
  oneTime?: boolean;
  triggered?: boolean;
  description?: string;
}

interface EventPrecondition {
  type: string;
  evaluate(state: GameState): boolean;
  toJSON(): EventPreconditionJSON;
}

interface EventAction {
  type: string;
  execute(state: GameState): GameState; // MUST return new state
  toJSON(): EventActionJSON;
}

interface GameState {
  globalVariables: Map<string, string | number | boolean>;
  messageLog?: Array<{ text: string; timestamp: number }>;
  currentMapId?: string;
  playerPosition?: { x: number; y: number };
  playerDirection?: CardinalDirection;
  combatState?: { active: boolean; encounterId: string };
  triggeredEventIds?: Set<string>;
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

### Processing Events
```typescript
import { EventProcessor } from '@/utils/EventProcessor';
import type { GameState } from '@/models/area/EventPrecondition';

// Create processor (cache with useMemo in React)
const eventProcessor = new EventProcessor();

// Initialize game state
const [gameState, setGameState] = useState<GameState>({
  globalVariables: new Map(),
  messageLog: [],
  triggeredEventIds: new Set(),
  currentMapId: areaMap.id,
  playerPosition: { x: playerX, y: playerY },
  playerDirection: direction,
});

// After player moves from (oldX, oldY) to (newX, newY)
const newGameState = eventProcessor.processMovement(
  gameState,
  areaMap,
  oldX,
  oldY,
  newX,
  newY
);

// Apply state changes if any events fired
if (newGameState !== gameState) {
  setGameState(newGameState);

  // Handle side effects from actions
  if (newGameState.currentMapId !== gameState.currentMapId) {
    // Teleport action triggered - load new map
    const newMap = AreaMapRegistry.getById(newGameState.currentMapId);
    // ... handle map transition
  }

  if (newGameState.combatState?.active) {
    // StartEncounter action triggered - transition to combat
    // ... start combat encounter
  }
}
```

### Defining Events in YAML
```yaml
eventAreas:
  - id: treasure-room-entrance
    x: 10
    y: 5
    width: 3
    height: 3
    description: "Entrance to treasure room"
    color: "#ffaa00"
    events:
      # Check for key
      - id: locked-door-check
        trigger: on-enter
        preconditions:
          - type: GlobalVariableIs
            variableName: "has-treasure-key"
            expectedValue: false
        actions:
          - type: ShowMessage
            message: "The door is locked. You need a key."

      # Unlock and teleport
      - id: unlock-door
        trigger: on-enter
        oneTime: true
        preconditions:
          - type: GlobalVariableIs
            variableName: "has-treasure-key"
            expectedValue: true
        actions:
          - type: ShowMessage
            message: "The key fits! The door opens."
          - type: Teleport
            targetMapId: "treasure-room"
            targetX: 5
            targetY: 10
            targetDirection: North
          - type: SetGlobalVariable
            variableName: "treasure-door-unlocked"
            value: true
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

**Core Area Map Tests:**
- **AreaMap.test.ts:** getTile, setTile, isInBounds, isWalkable, isPassable, isDoorTile, interactive objects, serialization
- **AreaMapParser.test.ts:** ASCII parsing, variable-width rows, unknown chars, spawn validation, object bounds
- **AreaMapTileSetRegistry.test.ts:** register, getById, getByTag, count, clearRegistry
- **MovementValidator.test.ts:** floor movement, wall blocking, door auto-continuation, door edge cases, rotation helpers

**Event System Tests (33 tests, all passing):**
- **EventPreconditions.test.ts (11 tests):** GlobalVariableIs equality checks, GlobalVariableIsGreaterThan numeric comparisons, GlobalVariableIsLessThan numeric comparisons, type validation, serialization round-trips, PreconditionFactory creation
- **EventActions.test.ts (12 tests):** ShowMessage log appending, SetGlobalVariable Map updates, Teleport map/position changes, Rotate direction changes, StartEncounter combat state, immutability verification, serialization, ActionFactory creation
- **EventProcessor.test.ts (10 tests):** OnEnter trigger on area entry, OnStep trigger on continued stay, OnExit trigger on area departure, precondition evaluation (pass/fail), one-time event tracking, action execution order
- **AreaMapParserEvents.test.ts:** Event area parsing from YAML, precondition/action deserialization, validation errors
- **EventSystemIntegration.test.ts:** End-to-end event processing scenarios

**Test Coverage:** 100% of event system core functionality covered

---

**End of AreaMap System Hierarchy**

For detailed implementation, see:
- [AreaMapSystemOverview.md](GDD/FirstPersonView/AreaMap/AreaMapSystemOverview.md)
- [AreaMapImplementationPlan.md](GDD/FirstPersonView/AreaMap/AreaMapImplementationPlan.md)
- [EventSystemOverview.md](GDD/FirstPersonView/AreaMap/EventSystemOverview.md)
- [EventSystemImplementationPlan.md](GDD/FirstPersonView/AreaMap/EventSystemImplementationPlan.md)
- [models/area/README.md](react-app/src/models/area/README.md) - Event system quick reference

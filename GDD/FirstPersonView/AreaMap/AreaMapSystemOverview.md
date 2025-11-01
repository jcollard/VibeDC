# Area Map System - Design Document

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [FirstPersonViewOverview.md](./FirstPersonViewOverview.md), [CombatMap.ts](../../react-app/src/models/combat/CombatMap.ts), [TilesetRegistry.ts](../../react-app/src/utils/TilesetRegistry.ts)

## Purpose

This document describes the AreaMap and AreaMapTileSet system for defining navigable dungeon areas in the first-person exploration mode. The system extends the existing CombatMap and TilesetRegistry patterns to support first-person navigation with additional tile behaviors like doors (automatic passage) and walls (impassable).

## Feature Summary

The Area Map System provides:
- **AreaMap**: Grid-based map representation for first-person navigation
- **AreaMapTileSet**: Reusable tile type collections with navigation behaviors
- **Tile Behaviors**: Wall (not walkable), Floor (walkable and stoppable), Door (passable but not stoppable)
- **YAML Definition Format**: Human-readable map and tileset definitions
- **ASCII Grid Parsing**: Visual map layout using character symbols
- **Tileset Registry**: Centralized tileset management and reuse
- **Interactive Objects**: Doors, chests, NPCs, stairs placed on map
- **Spawn Points**: Player and NPC starting positions
- **Level Transitions**: Stairs and portals linking areas

## Core Concepts

### Tile Behaviors

Unlike combat maps where tiles are either walkable or not, first-person navigation requires additional behaviors:

**Wall Tiles** (Not Walkable)
- **Behavior**: Completely blocks movement
- **Collision**: Player cannot enter tile
- **Example**: `'#'` (solid wall), `'X'` (obstacle)
- **Use Case**: Dungeon walls, locked doors, impassable obstacles

**Floor Tiles** (Walkable and Stoppable)
- **Behavior**: Player can enter and stop on tile
- **Movement**: Normal walking, player remains on tile after movement
- **Example**: `'.'` (stone floor), `','` (dirt), `'~'` (shallow water)
- **Use Case**: Normal dungeon floors, rooms, corridors

**Door Tiles** (Passable but Not Stoppable)
- **Behavior**: Player automatically continues through to next tile
- **Movement**: Player enters door tile but immediately moves to the next tile in same direction
- **Animation**: Brief door-open animation as player passes through
- **Example**: `'D'` (open door), `'|'` (doorway)
- **Use Case**: Archways, open doorways, portals between rooms
- **Restriction**: Cannot have door tiles adjacent to each other (would create infinite movement)

### Why Door Tiles?

The door tile behavior solves a common dungeon navigation UX issue:

**Problem**: In grid-based first-person games, doorways occupy a single tile. If doors are "walkable and stoppable", the player ends up standing inside the doorway, which looks and feels awkward. The player is stuck in the threshold instead of being in the room.

**Solution**: Door tiles are "passable but not stoppable" - when the player moves into a door tile, they automatically continue through to the next tile. This creates a natural flow through doorways where the player never stops in the threshold.

**Example Scenario**:
```
###D###    Player at [2,3] wants to move North (up)
#.....#
#..P..#    Step 1: Move North to [2,2] (door tile)
#.....#    Step 2: Auto-continue North to [2,1] (floor tile)
#######    Result: Player smoothly passes through door
```

The player presses forward once but moves two tiles: first through the door, then into the room. This feels natural and prevents awkward "standing in doorway" situations.

### Interactive Objects

Interactive objects are entities placed on the map that the player can interact with:

**Closed Doors** (different from Door tiles)
- **Behavior**: Acts as Wall tile until opened
- **Interaction**: Player targets and opens door (Spacebar)
- **State Change**: Becomes Door tile (passable) when opened
- **Example**: `'d'` (closed door) → `'D'` (open door/doorway)

**Chests**
- **Behavior**: Acts as Wall tile (blocks movement)
- **Interaction**: Player targets and opens chest
- **State Change**: Remains Wall but visual changes to open chest
- **Loot**: Contains items, gold, equipment

**NPCs**
- **Behavior**: Acts as Wall tile (blocks movement)
- **Interaction**: Player targets and talks to NPC
- **Dialogue**: Opens dialogue panel
- **Optional**: May move/patrol on their own

**Items**
- **Behavior**: Acts as Floor tile (doesn't block)
- **Interaction**: Auto-pickup or target and pick up
- **Visual**: Item sprite rendered on floor

**Stairs**
- **Behavior**: Acts as Floor tile
- **Interaction**: Step onto stairs or use Spacebar
- **Transition**: Loads different AreaMap (level change)

## Data Structures

### AreaMapTile

```typescript
/**
 * Tile behavior types for first-person navigation
 */
export const TileBehavior = {
  Wall: "wall",         // Not walkable (blocks movement)
  Floor: "floor",       // Walkable and stoppable (normal tile)
  Door: "door",         // Passable but not stoppable (auto-continue)
} as const;

export type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];

/**
 * Represents a single tile in an area map
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
   * References sprite from tileset sprite sheet.
   */
  spriteId: string;

  /**
   * Optional terrain type for gameplay effects (future use).
   * Examples: 'stone', 'water', 'lava', 'ice'
   */
  terrainType?: string;

  /**
   * Optional interactive object ID placed on this tile.
   * References InteractiveObject (chest, NPC, item, etc.)
   */
  interactiveObjectId?: string;
}
```

### AreaMapTileDefinition

```typescript
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
   * Sprite ID for rendering
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

### AreaMapTileSet

```typescript
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
   * Sprite sheet image path for this tileset.
   * All spriteIds reference sprites from this sheet.
   */
  spriteSheet?: string;

  /**
   * Tags for categorizing tilesets (dungeon, outdoor, cave, etc.)
   */
  tags?: string[];
}
```

### InteractiveObject

```typescript
/**
 * Interactive object types
 */
export const InteractiveObjectType = {
  ClosedDoor: "closed-door",   // Door that can be opened
  Chest: "chest",               // Loot container
  NPC: "npc",                   // Non-player character
  Item: "item",                 // Pickup item
  Stairs: "stairs",             // Level transition
  Switch: "switch",             // Lever/button
  Sign: "sign",                 // Readable text
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
```

### AreaMap

```typescript
/**
 * Cardinal direction facing
 */
export type CardinalDirection = 'North' | 'South' | 'East' | 'West';

/**
 * Spawn point for player or NPCs
 */
export interface SpawnPoint {
  x: number;
  y: number;
  direction: CardinalDirection;
  id?: string; // Optional identifier (e.g., "player-start", "npc-guard-1")
}

/**
 * Represents a navigable area map for first-person exploration.
 * Extends the CombatMap concept with first-person specific behaviors.
 */
export class AreaMap {
  /**
   * Unique identifier for this area
   */
  readonly id: string;

  /**
   * Human-readable name (displayed in UI)
   */
  readonly name: string;

  /**
   * Description or flavor text
   */
  readonly description: string;

  /**
   * Grid width (number of tiles horizontally)
   */
  readonly width: number;

  /**
   * Grid height (number of tiles vertically)
   */
  readonly height: number;

  /**
   * The tile grid (row-major: grid[y][x])
   */
  private grid: AreaMapTile[][];

  /**
   * Tileset ID used to create this map
   */
  readonly tilesetId: string;

  /**
   * Interactive objects on this map
   */
  readonly interactiveObjects: Map<string, InteractiveObject>;

  /**
   * Player spawn point
   */
  readonly playerSpawn: SpawnPoint;

  /**
   * Optional NPC spawn points
   */
  readonly npcSpawns: SpawnPoint[];

  /**
   * Optional encounter zones (trigger combat)
   */
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
   * Used when player opens doors, chests, activates switches, etc.
   */
  updateObjectState(objectId: string, newState: ObjectState): boolean {
    const obj = this.interactiveObjects.get(objectId);
    if (!obj) {
      return false;
    }
    obj.state = newState;
    return true;
  }

  /**
   * Opens a closed door at the specified position.
   * Replaces the tile with a door tile and updates object state.
   */
  openDoor(x: number, y: number): boolean {
    const obj = this.getInteractiveObjectAt(x, y);
    if (!obj || obj.type !== InteractiveObjectType.ClosedDoor) {
      return false;
    }

    // Check if door is locked
    if (obj.state === ObjectState.Locked) {
      // TODO: Check player inventory for key
      return false; // For now, locked doors cannot be opened
    }

    // Get the tile definition for open doors (default: 'D')
    const openChar = obj.data?.opensTo ?? 'D';
    const tileset = AreaMapTileSetRegistry.getById(this.tilesetId);
    if (!tileset) {
      return false;
    }

    const openTileDef = tileset.tileTypes.find(t => t.char === openChar);
    if (!openTileDef) {
      return false;
    }

    // Replace tile with door tile
    const doorTile: AreaMapTile = {
      behavior: openTileDef.behavior,
      walkable: openTileDef.walkable,
      passable: openTileDef.passable,
      spriteId: openTileDef.spriteId,
      terrainType: openTileDef.terrainType,
    };

    this.setTile(x, y, doorTile);
    this.updateObjectState(obj.id, ObjectState.Open);
    return true;
  }

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
}

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

/**
 * Encounter zone definition
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

### AreaMapTileSetRegistry

```typescript
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

## YAML Definition Format

### Tileset Definition

The tileset database defines reusable tile type collections.

**File**: `react-app/src/data/area-tileset-database.yaml`

**Note**: All sprite IDs reference the `biomes` sprite sheet. Sprite IDs follow the format `biomes-X` where X is the sprite number from the biomes sprite sheet.

```yaml
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

      # Closed door tile (interactive object replaces this)
      - char: d
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-21
        name: Closed Door
        description: Closed stone door (use interactive object for visual)

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

  # Brown brick dungeon
  - id: dungeon-brown-brick
    name: Brown Brick Dungeon
    description: Warm brown brick dungeon corridors
    spriteSheet: biomes
    tileTypes:
      # Wall variants
      - char: '#'
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-0
        name: Brown Brick Wall
        description: Brown brick wall

      - char: '='
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-1
        name: Brown Brick Wall (variant 2)
        description: Brown brick wall variant

      # Floor
      - char: .
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-45
        terrainType: stone
        name: Dark Floor with Grey Spots
        description: Dark stone floor

      # Door
      - char: D
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-13
        name: Brown Brick Doorway
        description: Open brown brick doorway

      # Dark passage (alternate door style)
      - char: P
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-16
        name: Dark Passage
        description: Dark passage through wall

      # Stairs
      - char: '>'
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-14
        terrainType: stairs
        name: Brown Brick Stairs
        description: Brown brick stairs

    tags:
      - dungeon
      - brick
      - indoor
      - brown

  # Grey brick dungeon (bloodstained variant)
  - id: dungeon-grey-brick
    name: Grey Brick Dungeon
    description: Grey brick dungeon with ominous bloodstains
    spriteSheet: biomes
    tileTypes:
      # Wall variants
      - char: '#'
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-52
        name: Grey Brick Wall
        description: Grey brick wall

      - char: B
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-53
        name: Bloodstained Wall
        description: Grey brick wall with blood

      # Floor
      - char: .
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-33
        terrainType: stone
        name: Dark Floor
        description: Dark floor with dark grey spots

      # Door variants
      - char: D
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-64
        name: Grey Brick Door
        description: Grey brick doorway

      - char: P
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-65
        name: Dark Passage
        description: Dark passage

      - char: G
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-66
        name: Gate
        description: Iron gate doorway

    tags:
      - dungeon
      - brick
      - indoor
      - grey
      - dark

  # Cave dungeon
  - id: dungeon-cave
    name: Natural Cave
    description: Natural cave formations and passages
    spriteSheet: biomes
    tileTypes:
      # Wall variants
      - char: '#'
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-58
        name: Cave Wall
        description: Natural cave wall

      - char: '='
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-59
        name: Cave Wall (variant 2)
        description: Cave wall variant

      # Floor
      - char: .
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-93
        terrainType: stone
        name: Cave Floor
        description: Natural cave floor

      # Door (cave passage)
      - char: D
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-71
        name: Cave Passage
        description: Natural cave passage

      # Stairs
      - char: '>'
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-72
        terrainType: stairs
        name: Cave Stairs
        description: Natural cave stairs

    tags:
      - dungeon
      - cave
      - natural
      - indoor

  # Dark dungeon (ominous atmosphere)
  - id: dungeon-dark
    name: Dark Dungeon
    description: Ominous dark dungeon depths
    spriteSheet: biomes
    tileTypes:
      # Wall variants
      - char: '#'
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-34
        name: Dark Wall
        description: Dark stone wall

      - char: '='
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-35
        name: Dark Wall (variant 2)
        description: Dark wall variant

      # Floor
      - char: .
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-33
        terrainType: stone
        name: Dark Floor
        description: Very dark stone floor

      # Door
      - char: D
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-47
        name: Dark Doorway
        description: Dark stone doorway

      # Stairs
      - char: '>'
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-48
        terrainType: stairs
        name: Dark Stairs
        description: Dark stone stairs

    tags:
      - dungeon
      - dark
      - indoor
      - ominous

  # Palace dungeon (ornate)
  - id: palace
    name: Palace Halls
    description: Ornate palace corridors and chambers
    spriteSheet: biomes
    tileTypes:
      # Wall variants
      - char: '#'
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-84
        name: Palace Wall
        description: Ornate palace wall

      - char: '='
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-85
        name: Palace Wall (variant 2)
        description: Palace wall variant

      # Floor
      - char: .
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-92
        terrainType: marble
        name: Palace Floor
        description: Polished palace floor

      # Door
      - char: D
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-97
        name: Palace Doorway
        description: Grand palace doorway

      # Stairs
      - char: '>'
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-98
        terrainType: stairs
        name: Palace Stairs
        description: Ornate palace stairs

    tags:
      - palace
      - ornate
      - indoor
      - grand

  # Forest/outdoor
  - id: forest-outdoor
    name: Forest Path
    description: Outdoor forest area with trees and grass paths
    spriteSheet: biomes
    tileTypes:
      # Tree - blocks movement
      - char: T
        behavior: wall
        walkable: false
        passable: false
        spriteId: biomes-89
        name: Tree
        description: Large tree

      # Grass floor - walkable
      - char: .
        behavior: floor
        walkable: true
        passable: true
        spriteId: biomes-91
        terrainType: grass
        name: Grass Path
        description: Grassy forest path

      # Forest entrance/exit (like a doorway)
      - char: D
        behavior: door
        walkable: false
        passable: true
        spriteId: biomes-91
        name: Forest Clearing
        description: Open clearing between trees

    tags:
      - forest
      - outdoor
      - nature
```

### Area Map Definition

The area map database defines navigable dungeon/world areas.

**File**: `react-app/src/data/area-map-database.yaml`

```yaml
areas:
  # Simple 10x10 dungeon room
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
      # Closed door at the north exit
      - id: door-north
        type: closed-door
        x: 4
        y: 1
        state: closed
        spriteId: dungeon-door-closed-1
        data:
          opensTo: D  # Becomes open doorway when opened

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

  # Larger dungeon with multiple rooms
  - id: dungeon-corridor-1
    name: "Twisting Corridor"
    description: "A long stone corridor with rooms branching off."
    tilesetId: dungeon-grey-stone
    grid: |-
      #####################
      #...................#
      #.###D###...###D####
      #.#.....#...#......#
      #.#.....#...#......#
      #.#.....#...########
      #.###D###..........#
      #..................#
      #.###D###...###D###
      #.#.....#...#.....#
      #.#.....#...#.....#
      #.#######...#######
      #..................#
      #####################
    playerSpawn:
      x: 2
      y: 1
      direction: East
    interactiveObjects:
      # Multiple doors throughout
      - id: door-room-1
        type: closed-door
        x: 5
        y: 2
        state: closed
        spriteId: dungeon-door-closed-1

      - id: door-room-2
        type: closed-door
        x: 13
        y: 2
        state: closed
        spriteId: dungeon-door-closed-1

      - id: door-room-3
        type: closed-door
        x: 5
        y: 6
        state: closed
        spriteId: dungeon-door-closed-1

      # Stairs down in far room
      - id: stairs-down-1
        type: stairs
        x: 15
        y: 4
        state: active
        spriteId: dungeon-stairs-down
        data:
          destinationAreaId: dungeon-level-2
          destinationX: 5
          destinationY: 5
          destinationDirection: North

      # NPC in side room
      - id: npc-merchant
        type: npc
        x: 4
        y: 4
        state: active
        spriteId: npc-merchant-idle
        data:
          npcId: merchant-thorin
          dialogueTree: merchant-thorin-greeting
          shopInventory:
            - health-potion
            - mana-potion
            - iron-sword
            - leather-armor

    npcSpawns:
      - id: merchant-thorin
        x: 4
        y: 4
        direction: South
```

## ASCII Parsing

The system parses ASCII grid strings into AreaMap instances using tileset definitions.

### Parsing Algorithm

```typescript
/**
 * Parses an ASCII grid string into an AreaMap.
 * Uses the specified tileset to map characters to tiles.
 */
export function parseAreaMapFromYAML(
  areaData: AreaMapYAML,
  tileset: AreaMapTileSet
): AreaMap {
  // Create character-to-tile lookup map
  const tileMap = new Map<string, AreaMapTileDefinition>();
  for (const tileDef of tileset.tileTypes) {
    tileMap.set(tileDef.char, tileDef);
  }

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

  // Build the tile grid
  const grid: AreaMapTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: AreaMapTile[] = [];
    for (let x = 0; x < width; x++) {
      const char = rows[y][x] ?? ' '; // Default to space if row is shorter
      const tileDef = tileMap.get(char);

      if (!tileDef) {
        throw new Error(
          `Unknown tile character '${char}' at position (${x}, ${y}) in area '${areaData.id}'`
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
 * YAML structure for area map definitions
 */
interface AreaMapYAML {
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
```

## Movement Validation

The movement system uses tile properties to validate player movement:

```typescript
/**
 * Validates if player can move from current position to target position.
 * Returns movement result including any auto-continuation through door tiles.
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

interface MovementResult {
  success: boolean;
  reason?: string;
  finalX?: number;
  finalY?: number;
  passThroughDoor?: boolean;
  doorX?: number;
  doorY?: number;
  interactiveObject?: InteractiveObject;
}

function getDirectionOffset(direction: CardinalDirection): [number, number] {
  switch (direction) {
    case 'North': return [0, -1];
    case 'South': return [0, 1];
    case 'East': return [1, 0];
    case 'West': return [-1, 0];
  }
}
```

## Data Loading System

### AreaMapRegistry

```typescript
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

### Data Loader

```typescript
/**
 * Loads tileset and area map data from YAML files.
 * Similar to existing data loaders (EncounterDataLoader, TilesetDataLoader).
 */
export class AreaMapDataLoader {
  /**
   * Load tileset database from YAML
   */
  static async loadTilesets(yamlPath: string): Promise<void> {
    const response = await fetch(yamlPath);
    const yamlText = await response.text();
    const data = YAML.parse(yamlText);

    if (!data.tilesets || !Array.isArray(data.tilesets)) {
      throw new Error('Invalid tileset database format');
    }

    const tilesets: AreaMapTileSet[] = data.tilesets.map((ts: any) => ({
      id: ts.id,
      name: ts.name,
      description: ts.description,
      tileTypes: ts.tileTypes.map((tt: any) => ({
        char: tt.char,
        behavior: tt.behavior,
        walkable: tt.walkable,
        passable: tt.passable,
        spriteId: tt.spriteId,
        terrainType: tt.terrainType,
        name: tt.name,
        description: tt.description,
      })),
      spriteSheet: ts.spriteSheet,
      tags: ts.tags,
    }));

    AreaMapTileSetRegistry.registerAll(tilesets);
    console.log(`[AreaMapDataLoader] Loaded ${tilesets.length} tilesets`);
  }

  /**
   * Load area map database from YAML
   */
  static async loadAreaMaps(yamlPath: string): Promise<void> {
    const response = await fetch(yamlPath);
    const yamlText = await response.text();
    const data = YAML.parse(yamlText);

    if (!data.areas || !Array.isArray(data.areas)) {
      throw new Error('Invalid area map database format');
    }

    const areaMaps: AreaMap[] = [];

    for (const areaData of data.areas) {
      // Get tileset
      const tileset = AreaMapTileSetRegistry.getById(areaData.tilesetId);
      if (!tileset) {
        console.error(`Tileset '${areaData.tilesetId}' not found for area '${areaData.id}'`);
        continue;
      }

      // Parse ASCII grid into AreaMap
      const areaMap = parseAreaMapFromYAML(areaData, tileset);
      areaMaps.push(areaMap);
    }

    AreaMapRegistry.registerAll(areaMaps);
    console.log(`[AreaMapDataLoader] Loaded ${areaMaps.length} area maps`);
  }

  /**
   * Load all area map data (tilesets + maps)
   */
  static async loadAll(): Promise<void> {
    await this.loadTilesets('/data/area-tileset-database.yaml');
    await this.loadAreaMaps('/data/area-map-database.yaml');
  }
}
```

## Implementation Plan

### Phase 1: Core Data Structures
1. Create `AreaMapTile` interface
2. Create `AreaMapTileDefinition` interface
3. Create `AreaMapTileSet` interface
4. Create `TileBehavior` enum
5. Create `InteractiveObject` interface and types

### Phase 2: AreaMap Class
1. Create `AreaMap` class with grid storage
2. Implement `getTile()`, `setTile()`, `isInBounds()`
3. Implement `isWalkable()`, `isPassable()`, `isDoorTile()`
4. Implement `getInteractiveObjectAt()`
5. Implement `openDoor()` method
6. Implement `toJSON()` and `fromJSON()` serialization

### Phase 3: Tileset Registry
1. Create `AreaMapTileSetRegistry` class
2. Implement `register()`, `registerAll()`, `getById()`
3. Implement `getByTag()`, `getAll()`, `has()`
4. Follow TilesetRegistry pattern

### Phase 4: ASCII Parsing
1. Create `parseAreaMapFromYAML()` function
2. Implement character-to-tile mapping
3. Implement grid string parsing
4. Handle variable-width rows
5. Add error handling for unknown characters

### Phase 5: Movement Validation
1. Create `validateMovement()` function
2. Implement bounds checking
3. Implement passability checking
4. Implement door auto-continuation logic
5. Return MovementResult with success/reason/finalPosition

### Phase 6: YAML Data Loading
1. Create `area-tileset-database.yaml` file
2. Create `area-map-database.yaml` file
3. Create `AreaMapDataLoader` class
4. Implement `loadTilesets()` method
5. Implement `loadAreaMaps()` method
6. Integrate with app initialization

### Phase 7: AreaMap Registry
1. Create `AreaMapRegistry` class
2. Implement registry methods (register, getById, etc.)
3. Follow CombatEncounter registry pattern

### Phase 8: Testing
1. Unit tests for AreaMap methods
2. Unit tests for movement validation
3. Unit tests for door auto-continuation
4. Integration tests for YAML parsing
5. Test interactive object placement
6. Test spawn point configuration

## Files to Create

### Core Data Models
- `models/area/AreaMapTile.ts` - Tile interfaces and types
- `models/area/AreaMapTileSet.ts` - Tileset interfaces
- `models/area/AreaMap.ts` - AreaMap class
- `models/area/InteractiveObject.ts` - Interactive object definitions
- `models/area/SpawnPoint.ts` - Spawn point definition
- `models/area/EncounterZone.ts` - Encounter zone definition

### Utilities
- `utils/AreaMapTileSetRegistry.ts` - Tileset registry
- `utils/AreaMapRegistry.ts` - Area map registry
- `utils/AreaMapParser.ts` - ASCII parsing functions
- `utils/MovementValidator.ts` - Movement validation logic

### Data Loaders
- `services/AreaMapDataLoader.ts` - YAML data loader

### Data Files
- `data/area-tileset-database.yaml` - Tileset definitions
- `data/area-map-database.yaml` - Area map definitions

### Tests
- `models/area/__tests__/AreaMap.test.ts`
- `utils/__tests__/MovementValidator.test.ts`
- `utils/__tests__/AreaMapParser.test.ts`

## Edge Cases and Considerations

### 1. Adjacent Door Tiles
- **Issue**: Two door tiles next to each other create infinite movement loop
- **Solution**: Validation check in tileset - warn or error if door tiles are adjacent
- **Alternative**: Movement validator checks next tile after door is also a door, blocks movement

### 2. Door Leading Out of Bounds
- **Issue**: Door tile at map edge with nothing beyond
- **Solution**: Movement validator checks if tile after door is in bounds
- **Error**: Return `success: false, reason: 'Door leads out of bounds'`

### 3. Door Leading to Wall
- **Issue**: Door tile followed by wall tile (player can't stop)
- **Solution**: Movement validator checks if tile after door is walkable
- **Error**: Return `success: false, reason: 'Cannot stop after passing through door'`

### 4. Closed Door Sprite vs Open Door Tile
- **Issue**: Confusion between `'d'` (closed door object) and `'D'` (open doorway tile)
- **Solution**: Clear naming convention and documentation
- **Implementation**: Closed doors have interactive object, open doorways are just tiles

### 5. Multiple Interactive Objects Per Tile
- **Issue**: Can a tile have both a chest and an item?
- **Solution**: Only one interactive object per tile (by design)
- **Alternative**: Interactive objects can contain multiple items in their data

### 6. Stair Destination Validation
- **Issue**: Stairs reference non-existent area map ID
- **Solution**: Validation check on data load, warn if destination doesn't exist
- **Runtime**: Check if destination exists before transitioning, show error message

### 7. Player Spawn on Invalid Tile
- **Issue**: Player spawn point is on a wall or out of bounds
- **Solution**: Validation check on map load
- **Error**: Throw error if spawn point is not on walkable tile

### 8. Tileset Character Conflicts
- **Issue**: Two tile definitions use same character in tileset
- **Solution**: Validation during tileset registration
- **Error**: Warn or throw error if duplicate character found

## Testing Checklist

### AreaMap Tests
- [ ] Create AreaMap with valid grid
- [ ] `getTile()` returns correct tile
- [ ] `getTile()` returns undefined for out of bounds
- [ ] `setTile()` updates tile successfully
- [ ] `setTile()` returns false for out of bounds
- [ ] `isInBounds()` correctly validates positions
- [ ] `isWalkable()` returns true for floor tiles
- [ ] `isWalkable()` returns false for wall tiles
- [ ] `isWalkable()` returns false for door tiles
- [ ] `isPassable()` returns true for floor tiles
- [ ] `isPassable()` returns true for door tiles
- [ ] `isPassable()` returns false for wall tiles
- [ ] `isDoorTile()` correctly identifies door tiles
- [ ] `getInteractiveObjectAt()` finds objects at position
- [ ] `openDoor()` converts closed door to open doorway
- [ ] `openDoor()` fails for locked doors
- [ ] `toJSON()` and `fromJSON()` preserve data

### Movement Validation Tests
- [ ] Movement to walkable floor tile succeeds
- [ ] Movement to wall tile fails
- [ ] Movement to out-of-bounds position fails
- [ ] Movement through door tile continues to next tile
- [ ] Movement through door succeeds if next tile is walkable
- [ ] Movement through door fails if next tile is wall
- [ ] Movement through door fails if next tile is out of bounds
- [ ] Movement result includes correct final position
- [ ] Movement result includes door pass-through flag
- [ ] Movement to closed door returns interactive object

### ASCII Parsing Tests
- [ ] Parse simple grid successfully
- [ ] Parse grid with multiple tile types
- [ ] Parse grid with variable-width rows (pad with spaces)
- [ ] Throw error for unknown tile character
- [ ] Throw error for empty grid
- [ ] Correctly map characters to tile definitions
- [ ] Preserve tile properties (behavior, walkable, passable)
- [ ] Handle trailing/leading whitespace correctly

### Tileset Registry Tests
- [ ] Register tileset successfully
- [ ] Get tileset by ID
- [ ] Get tilesets by tag
- [ ] Overwrite warning for duplicate ID
- [ ] `has()` returns correct result
- [ ] `getAll()` returns all tilesets
- [ ] `unregister()` removes tileset
- [ ] `clearRegistry()` removes all tilesets

### Interactive Object Tests
- [ ] Place interactive object at position
- [ ] Retrieve interactive object by position
- [ ] Update object state
- [ ] Open closed door creates door tile
- [ ] Cannot open locked door without key (future)
- [ ] Multiple objects don't overlap positions

### Data Loading Tests
- [ ] Load tilesets from YAML successfully
- [ ] Load area maps from YAML successfully
- [ ] Handle missing tileset ID gracefully
- [ ] Handle invalid YAML format gracefully
- [ ] Register all loaded tilesets
- [ ] Register all loaded area maps

## Performance Considerations

### Memory
- **Grid Storage**: 2D array of tiles (small per-tile data)
- **Registry Storage**: Map-based storage for O(1) lookup
- **Interactive Objects**: Map-based storage, small number per area
- **Expected Memory**: <1MB per large dungeon area

### Lookup Performance
- **Tile Lookup**: O(1) array access
- **Object Lookup**: O(n) linear search (or O(1) with position-based map)
- **Movement Validation**: O(1) constant time checks
- **Expected Frame Time**: <1ms for all lookups

### Data Loading
- **YAML Parsing**: One-time cost on app init
- **ASCII Parsing**: One-time cost per area
- **Sprite Loading**: Lazy load on area transition
- **Expected Load Time**: <100ms per area

## Future Extensions

### Dynamic Tile Changes
- **Crumbling Floors**: Tiles that change after walking on them
- **Triggered Walls**: Walls that open/close based on switches
- **Lava Flow**: Animated dangerous tiles that expand
- **Ice Melting**: Terrain that changes over time

### Advanced Pathfinding
- **NPC Movement**: NPCs navigate around obstacles
- **Patrol Routes**: NPCs follow predefined paths
- **Chase Behavior**: Enemies pursue player through corridors

### Multi-Level Maps
- **Vertical Layers**: Multiple Z-levels in same area
- **Pits and Ledges**: Fall damage and one-way drops
- **Bridges**: Walk over/under structures

### Interactive Terrain
- **Pressure Plates**: Floor tiles that trigger events
- **Teleport Tiles**: Instant transport to other areas
- **One-Way Tiles**: Can only be entered from certain direction

## Success Criteria

This system is complete when:
1. AreaMap class correctly stores and retrieves tiles
2. Tile behaviors (wall, floor, door) work correctly
3. Movement validation correctly handles all tile types
4. Door auto-continuation works as designed
5. Interactive objects can be placed and retrieved
6. ASCII parsing correctly converts grids to AreaMaps
7. Tileset registry stores and retrieves tilesets
8. YAML data loaders successfully parse database files
9. All edge cases handled gracefully
10. Tests pass for all core functionality
11. Documentation is clear and complete

## Dependencies

- **Requires**: YAML parsing library
- **Requires**: Existing Position types
- **Relates To**: CombatMap (similar pattern)
- **Relates To**: TilesetRegistry (same pattern)
- **Relates To**: CombatEncounter (encounter zones)
- **Used By**: FirstPersonView (navigation system)

## Notes

- The door tile behavior is a key UX innovation for grid-based first-person navigation
- The system is designed to be data-driven (YAML definitions)
- Interactive objects are separate from tile data for flexibility
- The registry pattern follows existing codebase conventions
- ASCII parsing allows visual map editing in YAML files
- Future combat encounters can reference area maps for contextual battles

---

**Estimated Complexity**: Medium (15-20 hours)
- Core data structures: 3-4 hours
- AreaMap implementation: 4-5 hours
- Parsing and validation: 4-5 hours
- Data loading: 2-3 hours
- Testing: 4-5 hours

**Risk Level**: Low
- Well-defined pattern (extends CombatMap)
- Clear requirements
- No external dependencies
- Straightforward implementation

import type { AreaMapTile } from './AreaMapTile';
import type { InteractiveObject, ObjectState } from './InteractiveObject';
import { InteractiveObjectType as InteractiveObjectTypeConst, ObjectState as ObjectStateConst } from './InteractiveObject';
import type { SpawnPoint } from './SpawnPoint';
import type { EncounterZone } from './EncounterZone';
import type { EventArea } from './EventArea';
import { TileBehavior } from './TileBehavior';
import type { AreaMapTileDefinition } from './AreaMapTileDefinition';

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
  readonly eventAreas?: EventArea[];

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
    encounterZones?: EncounterZone[],
    eventAreas?: EventArea[]
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
    this.eventAreas = eventAreas;

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
      this.encounterZones,
      this.eventAreas
    );
  }

  /**
   * Opens a closed door at the specified position.
   * Returns a NEW AreaMap instance with door tile replaced and object updated (immutable pattern).
   *
   * ⚠️ GUIDELINE COMPLIANCE: Immutable state updates (GeneralGuidelines.md)
   * Always create new objects with spread operator instead of mutating existing state.
   */
  openDoor(x: number, y: number): AreaMap | null {
    // Import here to avoid circular dependency
    const { AreaMapTileSetRegistry } = require('../utils/AreaMapTileSetRegistry');

    const obj = this.getInteractiveObjectAt(x, y);
    if (!obj || obj.type !== InteractiveObjectTypeConst.ClosedDoor) {
      return null;
    }

    // Check if door is locked
    if (obj.state === ObjectStateConst.Locked) {
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

    const openTileDef = tileset.tileTypes.find((t: AreaMapTileDefinition) => t.char === openChar);
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
    const mapWithUpdatedObject = this.updateObjectState(obj.id, ObjectStateConst.Open);
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
      this.encounterZones,
      this.eventAreas
    );
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
      eventAreas: this.eventAreas,
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
      json.encounterZones,
      json.eventAreas
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
  eventAreas?: EventArea[];
}

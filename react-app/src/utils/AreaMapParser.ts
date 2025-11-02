import { AreaMap } from '../models/area/AreaMap';
import type { AreaMapTile } from '../models/area/AreaMapTile';
import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';
import type { InteractiveObject } from '../models/area/InteractiveObject';
import type { SpawnPoint } from '../models/area/SpawnPoint';
import type { EncounterZone } from '../models/area/EncounterZone';
import type { EventArea, EventAreaJSON, AreaEvent, AreaEventJSON } from '../models/area/EventArea';
import { isEventTrigger } from '../models/area/EventTrigger';
import { PreconditionFactory } from '../models/area/preconditions/PreconditionFactory';
import { ActionFactory } from '../models/area/actions/ActionFactory';

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
  eventAreas?: EventAreaJSON[];
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

  // Parse event areas if present
  let eventAreas: EventArea[] | undefined;
  if (areaData.eventAreas) {
    eventAreas = areaData.eventAreas.map(areaJson => parseEventArea(areaJson, areaData.id));
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
    areaData.encounterZones,
    eventAreas
  );
}

/**
 * Helper function to validate position is within bounds
 */
function isValidPosition(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Parses an event area from JSON.
 *
 * @param areaJson Event area JSON data
 * @param mapId Parent map ID (for error messages)
 * @returns Parsed EventArea
 */
function parseEventArea(areaJson: EventAreaJSON, mapId: string): EventArea {
  // Validate required fields
  if (!areaJson.id || typeof areaJson.x !== 'number' || typeof areaJson.y !== 'number') {
    throw new Error(`Invalid event area in map '${mapId}': missing required fields`);
  }

  // Validate bounds
  if (areaJson.width <= 0 || areaJson.height <= 0) {
    throw new Error(
      `Invalid event area '${areaJson.id}' in map '${mapId}': width and height must be positive`
    );
  }

  // Parse events
  const events: AreaEvent[] = areaJson.events.map(eventJson =>
    parseAreaEvent(eventJson, areaJson.id, mapId)
  );

  return {
    id: areaJson.id,
    x: areaJson.x,
    y: areaJson.y,
    width: areaJson.width,
    height: areaJson.height,
    events,
    description: areaJson.description,
  };
}

/**
 * Parses an area event from JSON.
 *
 * @param eventJson Event JSON data
 * @param areaId Parent area ID
 * @param mapId Parent map ID (for error messages)
 * @returns Parsed AreaEvent
 */
function parseAreaEvent(
  eventJson: AreaEventJSON,
  areaId: string,
  mapId: string
): AreaEvent {
  // Validate trigger type
  if (!isEventTrigger(eventJson.trigger)) {
    throw new Error(
      `Invalid trigger type '${eventJson.trigger}' in event '${eventJson.id}' ` +
      `(area '${areaId}', map '${mapId}')`
    );
  }

  // Parse preconditions
  const preconditions = eventJson.preconditions.map(precondJson => {
    try {
      return PreconditionFactory.fromJSON(precondJson);
    } catch (error) {
      throw new Error(
        `Error parsing precondition in event '${eventJson.id}' ` +
        `(area '${areaId}', map '${mapId}'): ${error}`
      );
    }
  });

  // Parse actions
  const actions = eventJson.actions.map(actionJson => {
    try {
      return ActionFactory.fromJSON(actionJson);
    } catch (error) {
      throw new Error(
        `Error parsing action in event '${eventJson.id}' ` +
        `(area '${areaId}', map '${mapId}'): ${error}`
      );
    }
  });

  return {
    id: eventJson.id,
    trigger: eventJson.trigger,
    preconditions,
    actions,
    oneTime: eventJson.oneTime,
    triggered: eventJson.triggered,
    description: eventJson.description,
  };
}

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

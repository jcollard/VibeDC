import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';
import type { Position } from '../../../types';
import { CombatEncounter } from '../../combat/CombatEncounter';
import type { EnemyPlacement } from '../../combat/CombatEncounter';
import { DungeonGenerator } from '../../../utils/DungeonGenerator';
import { TilesetRegistry } from '../../../utils/TilesetRegistry';
import { EnemyRegistry } from '../../../utils/EnemyRegistry';

/**
 * Generates a random combat encounter with procedurally generated dungeon layout.
 * Creates a dungeon with rooms and corridors, places 8 deployment zones clustered together,
 * and spawns random enemies.
 */
export class GenerateRandomEncounter implements EventAction {
  readonly type = "GenerateRandomEncounter";

  constructor() {}

  execute(state: GameState): GameState {
    try {
      // Fixed dimensions for consistency
      const width = 21;
      const height = 13;

      // Generate dungeon with focus on small rooms (3x3 to 5x5)
      const generator = new DungeonGenerator({
        width,
        height,
        roomAttempts: 50, // More attempts for better room placement
        minRoomSize: 3,   // Minimum 3x3 rooms
        maxRoomSize: 5,   // Maximum 5x5 rooms (focused on smaller rooms)
        extraConnections: false, // Sequential connections only
      });

      const { grid, rooms } = generator.generate();

      // Convert character grid to ASCII string for the map
      const asciiMap = grid.map(row => row.join('')).join('\n');

      // Get a random tileset (prefer dungeon-themed)
      // If no tilesets available, create ASCII-only map without tileset reference
      const tilesets = TilesetRegistry.getAll();
      const dungeonTileset = tilesets.find(t => t.id.includes('dungeon') || t.id.includes('stone'));
      const selectedTilesetId = dungeonTileset?.id || (tilesets.length > 0 ? tilesets[0].id : undefined);

      // Find walkable floor tiles for placement
      const walkableTiles: Position[] = [];
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          if (grid[y][x] === '.') {
            walkableTiles.push({ x, y });
          }
        }
      }

      if (walkableTiles.length === 0) {
        console.error('Failed to generate random encounter: No walkable tiles found');
        // Return unchanged state if generation fails
        return state;
      }

      // Place 8 deployment zones clustered together
      const deploymentZones: Position[] = [];
      if (rooms.length > 0) {
        // Use the first room for deployment zones
        const startRoom = rooms[0];
        const roomCenter = {
          x: Math.floor(startRoom.x + startRoom.width / 2),
          y: Math.floor(startRoom.y + startRoom.height / 2),
        };

        // Find tiles near the room center
        const nearbyTiles = walkableTiles
          .filter(tile => {
            const dx = tile.x - roomCenter.x;
            const dy = tile.y - roomCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= 4; // Within 4 tiles of center
          })
          .sort((a, b) => {
            const distA = Math.sqrt((a.x - roomCenter.x) ** 2 + (a.y - roomCenter.y) ** 2);
            const distB = Math.sqrt((b.x - roomCenter.x) ** 2 + (b.y - roomCenter.y) ** 2);
            return distA - distB;
          });

        // Take up to 8 tiles for deployment
        for (let i = 0; i < Math.min(8, nearbyTiles.length); i++) {
          deploymentZones.push(nearbyTiles[i]);
        }
      }

      // If we couldn't find 8 zones, fill from random walkable tiles
      while (deploymentZones.length < 8 && walkableTiles.length > deploymentZones.length) {
        const randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
        if (!deploymentZones.some(z => z.x === randomTile.x && z.y === randomTile.y)) {
          deploymentZones.push(randomTile);
        }
      }

      // Place 2-8 random enemies
      const enemyCount = Math.floor(Math.random() * 7) + 2; // 2 to 8
      const enemyPlacements: EnemyPlacement[] = [];
      const allEnemyIds = EnemyRegistry.getAllIds();

      if (allEnemyIds.length === 0) {
        console.error('Failed to generate random encounter: No enemies found in registry');
        // Return unchanged state if no enemies available
        return state;
      }

      // Filter walkable tiles to exclude deployment zones
      const availableForEnemies = walkableTiles.filter(tile =>
        !deploymentZones.some(z => z.x === tile.x && z.y === tile.y)
      );

      for (let i = 0; i < enemyCount && availableForEnemies.length > 0; i++) {
        // Pick a random position
        const randomIndex = Math.floor(Math.random() * availableForEnemies.length);
        const position = availableForEnemies[randomIndex];
        availableForEnemies.splice(randomIndex, 1); // Remove from available

        // Pick a random enemy
        const enemyId = allEnemyIds[Math.floor(Math.random() * allEnemyIds.length)];

        enemyPlacements.push({
          enemyId,
          position,
        });
      }

      // Generate a unique ID for the new encounter
      let encounterId = 'random-encounter';
      let counter = 1;
      while (CombatEncounter.getById(encounterId)) {
        encounterId = `random-encounter-${counter}`;
        counter++;
      }

      // Create the encounter data
      const encounterData: any = {
        id: encounterId,
        name: `Random Encounter ${counter > 1 ? counter - 1 : ''}`,
        description: `A procedurally generated dungeon with ${rooms.length} small chambers and ${enemyCount} enemies.`,
        map: selectedTilesetId
          ? {
              tilesetId: selectedTilesetId,
              grid: asciiMap,
            }
          : {
              // ASCII-only format without tileset (for testing/when no tilesets available)
              grid: asciiMap,
              tileTypes: [
                { char: '#', terrain: 'wall', walkable: false, spriteId: undefined },
                { char: '.', terrain: 'floor', walkable: true, spriteId: undefined },
              ],
            },
        victoryConditions: [
          {
            type: 'AllEnemiesDefeated',
            description: 'Defeat all enemies',
          },
        ],
        defeatConditions: [
          {
            type: 'AllPlayersDefeated',
            description: 'All player units defeated',
          },
        ],
        playerDeploymentZones: deploymentZones,
        enemyPlacements,
      };

      // Create the new encounter (this auto-registers it)
      CombatEncounter.fromJSON(encounterData as any);

      console.log(`Generated random encounter: ${encounterId} (${width}x${height}, ${rooms.length} rooms, ${enemyCount} enemies, ${deploymentZones.length} deployment zones)`);

      // Transition to combat with the generated encounter
      return {
        ...state,
        combatState: {
          active: true,
          encounterId: encounterId,
        },
      };
    } catch (error) {
      console.error('Failed to generate random encounter:', error);
      // Return unchanged state if generation fails
      return state;
    }
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
    };
  }

  static fromJSON(json: EventActionJSON): GenerateRandomEncounter {
    if (json.type !== "GenerateRandomEncounter") {
      throw new Error(`Invalid type for GenerateRandomEncounter: ${json.type}`);
    }
    return new GenerateRandomEncounter();
  }
}

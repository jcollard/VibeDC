import type { TileBehavior } from './TileBehavior';

/**
 * Represents a single tile in an area map.
 * Contains all properties needed for navigation and rendering.
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
   * References sprite from tileset sprite sheet (e.g., 'biomes-8').
   */
  spriteId: string;

  /**
   * Optional terrain type for gameplay effects (future use).
   * Examples: 'stone', 'water', 'lava', 'ice', 'grass', 'dirt'
   */
  terrainType?: string;

  /**
   * Optional interactive object ID placed on this tile.
   * References InteractiveObject (chest, NPC, item, etc.)
   */
  interactiveObjectId?: string;
}

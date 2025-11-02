import type { TileBehavior } from './TileBehavior';

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
   * Sprite ID for rendering (e.g., 'biomes-8')
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

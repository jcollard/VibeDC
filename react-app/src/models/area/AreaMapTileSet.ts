import type { AreaMapTileDefinition } from './AreaMapTileDefinition';

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
   * Sprite sheet ID for this tileset.
   * All spriteIds reference sprites from this sheet.
   * Example: 'biomes'
   */
  spriteSheet?: string;

  /**
   * Tags for categorizing tilesets (dungeon, outdoor, cave, etc.)
   */
  tags?: string[];
}

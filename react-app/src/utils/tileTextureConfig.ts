import type { TileTextureMapping } from './SpriteSheetLoader';

/**
 * Texture mapping configuration for different tile types
 *
 * This maps grid characters (like '#', '.', etc.) to sprite coordinates
 * in the world-tiles.png spritesheet.
 *
 * Each sprite is 12x12 pixels, and coordinates are 0-indexed from top-left.
 *
 * To customize textures, update the x/y coordinates to point to different
 * sprites in your spritesheet.
 */
export const TILE_TEXTURE_MAPPINGS: Record<string, TileTextureMapping> = {
  // Wall tile '#'
  '#': {
    floor: { x: 4, y: 3 },      // Floor sprite (row 3, column 4)
    ceiling: { x: 3, y: 3 },    // Ceiling sprite (row 3, column 3)
    wallFront: { x: 0, y: 0 },  // Wall sprite (row 0, column 0)
    wallBack: { x: 0, y: 0 },   // Wall sprite (same as front)
    wallLeft: { x: 0, y: 0 },   // Wall sprite (same as front)
    wallRight: { x: 0, y: 0 },  // Wall sprite (same as front)
  },

  // Floor tile '.'
  '.': {
    floor: { x: 4, y: 3 },      // Floor sprite (row 3, column 4)
    ceiling: { x: 3, y: 3 },    // Ceiling sprite (row 3, column 3)
    // No walls for floor tiles
  },

  // Door tile '+'
  '+': {
    floor: { x: 4, y: 3 },      // Floor sprite (row 3, column 4)
    ceiling: { x: 3, y: 3 },    // Ceiling sprite (row 3, column 3)
    wallFront: { x: 1, y: 1 },  // Door sprite (row 1, column 1)
    wallBack: { x: 1, y: 1 },   // Door sprite (same as front)
    wallLeft: { x: 1, y: 1 },   // Door sprite (same as front)
    wallRight: { x: 1, y: 1 },  // Door sprite (same as front)
  },

  // Add more tile types as needed:
  // 'W': { ... }, // Water
  // 'G': { ... }, // Grass
  // etc.
};

/**
 * Get texture mapping for a tile type
 *
 * @param tileType - The tile character from the grid
 * @returns Texture mapping, or default mapping if tile type not found
 */
export function getTileTextureMapping(tileType: string): TileTextureMapping {
  return TILE_TEXTURE_MAPPINGS[tileType] || TILE_TEXTURE_MAPPINGS['.'];
}

/**
 * Default fallback mapping (simple stone)
 */
export const DEFAULT_MAPPING: TileTextureMapping = {
  floor: { x: 0, y: 0 },
  ceiling: { x: 0, y: 0 },
  wallFront: { x: 0, y: 0 },
  wallBack: { x: 0, y: 0 },
  wallLeft: { x: 0, y: 0 },
  wallRight: { x: 0, y: 0 },
};

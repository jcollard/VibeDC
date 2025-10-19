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
    floor: { x: 0, y: 0 },      // Dark stone floor
    ceiling: { x: 1, y: 0 },    // Dark stone ceiling
    wallFront: { x: 2, y: 0 },  // Stone wall
    wallBack: { x: 2, y: 0 },   // Stone wall (same as front)
    wallLeft: { x: 2, y: 0 },   // Stone wall (same as front)
    wallRight: { x: 2, y: 0 },  // Stone wall (same as front)
  },

  // Floor tile '.'
  '.': {
    floor: { x: 3, y: 0 },      // Light stone floor
    ceiling: { x: 4, y: 0 },    // Light stone ceiling
    // No walls for floor tiles
  },

  // Add more tile types as needed:
  // 'D': { ... }, // Door
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

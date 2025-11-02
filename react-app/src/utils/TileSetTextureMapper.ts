import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';
import type { AreaMapTileDefinition } from '../models/area/AreaMapTileDefinition';
import type { TileTextureMapping, SpriteCoordinates } from './SpriteSheetLoader';
import { SpriteRegistry } from './SpriteRegistry';

/**
 * Utility to create texture mappings from AreaMapTileSet definitions
 *
 * This bridges the gap between the YAML-defined tileset system and the 3D rendering system.
 * Each tile definition in the tileset includes a spriteId, which we look up in SpriteRegistry
 * to get the actual sprite sheet coordinates.
 */
export class TileSetTextureMapper {
  /**
   * Creates a texture mapping for a specific tile character in a tileset
   *
   * @param tileset - The AreaMapTileSet containing tile definitions
   * @param tileChar - The character representing the tile type (e.g., '#', '.', 'D')
   * @returns TileTextureMapping with sprite coordinates for all 6 faces, or undefined if not found
   */
  static createMappingForTile(
    tileset: AreaMapTileSet,
    tileChar: string
  ): TileTextureMapping | undefined {
    // Find the tile definition for this character
    const tileDef = tileset.tileTypes.find(t => t.char === tileChar);
    if (!tileDef) {
      return undefined;
    }

    // Get sprite coordinates from SpriteRegistry
    const spriteCoords = this.getSpriteCoordinates(tileDef.spriteId);
    if (!spriteCoords) {
      console.warn(`[TileSetTextureMapper] Sprite '${tileDef.spriteId}' not found in SpriteRegistry`);
      return undefined;
    }

    // Create texture mapping based on tile behavior
    return this.createMappingFromTileDefinition(tileDef, spriteCoords);
  }

  /**
   * Creates a complete mapping table for all tiles in a tileset
   *
   * @param tileset - The AreaMapTileSet to create mappings for
   * @returns Record mapping tile characters to texture mappings
   */
  static createMappingsForTileset(
    tileset: AreaMapTileSet
  ): Record<string, TileTextureMapping> {
    const mappings: Record<string, TileTextureMapping> = {};

    for (const tileDef of tileset.tileTypes) {
      const mapping = this.createMappingForTile(tileset, tileDef.char);
      if (mapping) {
        mappings[tileDef.char] = mapping;
      }
    }

    return mappings;
  }

  /**
   * Gets sprite coordinates from SpriteRegistry
   */
  private static getSpriteCoordinates(spriteId: string): SpriteCoordinates | undefined {
    const sprite = SpriteRegistry.getById(spriteId);
    if (!sprite) {
      return undefined;
    }

    return { x: sprite.x, y: sprite.y };
  }

  /**
   * Creates texture mapping from tile definition
   *
   * For walls: All 6 faces use the tile's sprite
   * For floors/doors: Floor and ceiling use the tile's sprite, walls are omitted
   */
  private static createMappingFromTileDefinition(
    tileDef: AreaMapTileDefinition,
    spriteCoords: SpriteCoordinates
  ): TileTextureMapping {
    const mapping: TileTextureMapping = {};

    // All tiles get floor and ceiling
    mapping.floor = spriteCoords;
    mapping.ceiling = spriteCoords;

    // Walls get wall textures on all 4 sides
    if (tileDef.behavior === 'wall') {
      mapping.wallFront = spriteCoords;
      mapping.wallBack = spriteCoords;
      mapping.wallLeft = spriteCoords;
      mapping.wallRight = spriteCoords;
    }
    // Doors and floors don't render walls (open passages)
    // Their floor and ceiling are already set above

    return mapping;
  }

  /**
   * Gets the sprite sheet path for rendering
   *
   * NOTE: All sprites are in the atlas.png sprite sheet. The tileset's spriteSheet
   * property (e.g., 'biomes') is just a logical grouping in sprite-definitions.yaml.
   * SpriteRegistry contains the actual coordinates for all sprites in atlas.png.
   *
   * @param _tileset - The tileset (unused, but kept for API consistency)
   * @returns Sprite sheet path - always '/spritesheets/atlas.png'
   */
  static getSpriteSheetPath(_tileset: AreaMapTileSet): string {
    // All sprites are in the single atlas.png sprite sheet
    return '/spritesheets/atlas.png';
  }
}

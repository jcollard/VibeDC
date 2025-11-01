import * as YAML from 'js-yaml';
import { AreaMapTileSetRegistry } from '../utils/AreaMapTileSetRegistry';
import { AreaMapRegistry } from '../utils/AreaMapRegistry';
import { parseAreaMapFromYAML, type AreaMapYAML } from '../utils/AreaMapParser';
import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';
import type { AreaMap } from '../models/area/AreaMap';

/**
 * Loads tileset and area map data from YAML files.
 * Similar to existing data loaders (EncounterDataLoader, TilesetDataLoader).
 *
 * ⚠️ GUIDELINE COMPLIANCE: Async operations (GeneralGuidelines.md)
 * - Uses async/await for file loading
 * - Collects errors instead of failing fast (better UX for data validation)
 * - Logs progress and errors for debugging
 */
export class AreaMapDataLoader {
  /**
   * Load tileset database from YAML
   */
  static async loadTilesets(yamlText: string): Promise<void> {
    console.log('[AreaMapDataLoader] Loading tilesets');

    const data = YAML.load(yamlText) as any;

    if (!data.tilesets || !Array.isArray(data.tilesets)) {
      throw new Error('Invalid tileset database format: missing or invalid "tilesets" array');
    }

    const tilesets: AreaMapTileSet[] = data.tilesets.map((ts: any) => {
      // Validate required fields
      if (!ts.id || !ts.name || !ts.tileTypes) {
        throw new Error(`Invalid tileset: missing required fields (id, name, or tileTypes)`);
      }

      return {
        id: ts.id,
        name: ts.name,
        description: ts.description,
        tileTypes: ts.tileTypes.map((tt: any) => {
          if (!tt.char || !tt.behavior || !tt.spriteId) {
            throw new Error(`Invalid tile type in tileset '${ts.id}': missing required fields`);
          }

          return {
            char: tt.char,
            behavior: tt.behavior,
            walkable: tt.walkable ?? false,
            passable: tt.passable ?? false,
            spriteId: tt.spriteId,
            terrainType: tt.terrainType,
            name: tt.name,
            description: tt.description,
          };
        }),
        spriteSheet: ts.spriteSheet,
        tags: ts.tags,
      };
    });

    AreaMapTileSetRegistry.registerAll(tilesets);
    console.log(`[AreaMapDataLoader] Loaded ${tilesets.length} tilesets`);
  }

  /**
   * Load area map database from YAML
   */
  static async loadAreaMaps(yamlText: string): Promise<void> {
    console.log('[AreaMapDataLoader] Loading area maps');

    const data = YAML.load(yamlText) as any;

    if (!data.areas || !Array.isArray(data.areas)) {
      throw new Error('Invalid area map database format: missing or invalid "areas" array');
    }

    const areaMaps: AreaMap[] = [];
    const errors: string[] = [];

    for (const areaData of data.areas as AreaMapYAML[]) {
      try {
        // Get tileset
        const tileset = AreaMapTileSetRegistry.getById(areaData.tilesetId);
        if (!tileset) {
          errors.push(`Tileset '${areaData.tilesetId}' not found for area '${areaData.id}'`);
          continue;
        }

        // Parse ASCII grid into AreaMap
        const areaMap = parseAreaMapFromYAML(areaData, tileset);
        areaMaps.push(areaMap);
      } catch (error) {
        errors.push(`Failed to parse area '${areaData.id}': ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('[AreaMapDataLoader] Errors loading area maps:');
      errors.forEach(err => console.error(`  - ${err}`));
    }

    AreaMapRegistry.registerAll(areaMaps);
    console.log(`[AreaMapDataLoader] Loaded ${areaMaps.length} area maps (${errors.length} errors)`);
  }

  /**
   * Load all area map data (tilesets + maps)
   */
  static async loadAll(tilesetYaml: string, areaMapYaml: string): Promise<void> {
    await this.loadTilesets(tilesetYaml);
    await this.loadAreaMaps(areaMapYaml);
  }
}

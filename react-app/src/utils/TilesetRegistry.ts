import type { TileDefinition } from '../models/combat/CombatMap';

/**
 * Tileset definition for reusable tile type collections
 */
export interface TilesetDefinition {
  id: string;
  name: string;
  description?: string;
  tileTypes: TileDefinition[];
  tags?: string[];
}

/**
 * JSON format for tileset definitions in YAML/data files
 */
export interface TilesetDefinitionJSON {
  id: string;
  name: string;
  description?: string;
  tileTypes: TileDefinition[];
  tags?: string[];
}

/**
 * Global registry for tileset definitions.
 * Maps tileset IDs to their definitions for easy reuse in encounters.
 *
 * Usage:
 * ```typescript
 * // Register a tileset
 * TilesetRegistry.register({
 *   id: 'dungeon-stone',
 *   name: 'Stone Dungeon',
 *   tileTypes: [
 *     { char: '#', terrain: TerrainType.Wall, walkable: false, spriteId: 'stone-wall' },
 *     { char: '.', terrain: TerrainType.Floor, walkable: true, spriteId: 'stone-floor' }
 *   ]
 * });
 *
 * // Get a tileset
 * const tileset = TilesetRegistry.getById('dungeon-stone');
 * ```
 */
export class TilesetRegistry {
  private static registry: Map<string, TilesetDefinition> = new Map();

  /**
   * Register a tileset definition
   */
  static register(tileset: TilesetDefinition): void {
    if (this.registry.has(tileset.id)) {
      console.warn(`Tileset with id '${tileset.id}' is already registered. Overwriting.`);
    }
    this.registry.set(tileset.id, tileset);
  }

  /**
   * Register multiple tileset definitions at once
   */
  static registerAll(tilesets: TilesetDefinition[]): void {
    for (const tileset of tilesets) {
      this.register(tileset);
    }
  }

  /**
   * Get a tileset definition by ID
   */
  static getById(id: string): TilesetDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all tilesets with a specific tag
   */
  static getByTag(tag: string): TilesetDefinition[] {
    return Array.from(this.registry.values())
      .filter(tileset => tileset.tags?.includes(tag));
  }

  /**
   * Get all registered tileset IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered tilesets
   */
  static getAll(): TilesetDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if a tileset ID is registered
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Remove a tileset from the registry
   */
  static unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all registered tilesets
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered tilesets
   */
  static get count(): number {
    return this.registry.size;
  }
}

import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';

/**
 * Global registry for area map tilesets.
 * Follows the same pattern as TilesetRegistry but for first-person areas.
 */
export class AreaMapTileSetRegistry {
  private static registry: Map<string, AreaMapTileSet> = new Map();

  /**
   * Register a tileset definition
   */
  static register(tileset: AreaMapTileSet): void {
    if (this.registry.has(tileset.id)) {
      console.warn(`AreaMapTileSet with id '${tileset.id}' is already registered. Overwriting.`);
    }
    this.registry.set(tileset.id, tileset);
  }

  /**
   * Register multiple tileset definitions at once
   */
  static registerAll(tilesets: AreaMapTileSet[]): void {
    for (const tileset of tilesets) {
      this.register(tileset);
    }
  }

  /**
   * Get a tileset definition by ID
   */
  static getById(id: string): AreaMapTileSet | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all tilesets with a specific tag
   */
  static getByTag(tag: string): AreaMapTileSet[] {
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
  static getAll(): AreaMapTileSet[] {
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

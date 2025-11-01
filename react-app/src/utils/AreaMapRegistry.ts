import type { AreaMap } from '../models/area/AreaMap';

/**
 * Global registry for area maps.
 * Similar to CombatEncounter registry.
 */
export class AreaMapRegistry {
  private static registry: Map<string, AreaMap> = new Map();

  /**
   * Register an area map
   */
  static register(areaMap: AreaMap): void {
    if (this.registry.has(areaMap.id)) {
      console.warn(`AreaMap with id '${areaMap.id}' is already registered. Overwriting.`);
    }
    this.registry.set(areaMap.id, areaMap);
  }

  /**
   * Register multiple area maps at once
   */
  static registerAll(areaMaps: AreaMap[]): void {
    for (const areaMap of areaMaps) {
      this.register(areaMap);
    }
  }

  /**
   * Get an area map by ID
   */
  static getById(id: string): AreaMap | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all registered area map IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered area maps
   */
  static getAll(): AreaMap[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if an area map ID is registered
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Remove an area map from the registry
   */
  static unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all registered area maps
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered area maps
   */
  static get count(): number {
    return this.registry.size;
  }
}

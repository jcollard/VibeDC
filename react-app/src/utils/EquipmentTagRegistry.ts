/**
 * Represents an equipment tag definition with display information
 */
export interface EquipmentTagDefinition {
  id: string;
  displayName: string;
  category: string;
  description?: string;
  hidden?: boolean;
}

/**
 * JSON format for equipment tag definitions in YAML/data files
 */
export interface EquipmentTagDefinitionJSON {
  id: string;
  displayName: string;
  category: string;
  description?: string;
  hidden?: boolean;
}

/**
 * Registry for equipment tag definitions
 * Maps tag IDs to their display information
 */
export class EquipmentTagRegistry {
  private static registry: Map<string, EquipmentTagDefinition> = new Map();

  /**
   * Register an equipment tag definition
   * @param definition The tag definition to register
   */
  static register(definition: EquipmentTagDefinition): void {
    this.registry.set(definition.id, definition);
  }

  /**
   * Get all registered equipment tags
   * @returns Array of all tag definitions
   */
  static getAll(): EquipmentTagDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get an equipment tag definition by ID
   * @param id The tag ID to look up
   * @returns The tag definition, or undefined if not found
   */
  static getById(id: string): EquipmentTagDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Get the display name for a tag ID
   * @param id The tag ID to look up
   * @returns The display name, or the ID itself if not found
   */
  static getDisplayName(id: string): string {
    const definition = this.registry.get(id);
    return definition?.displayName ?? id;
  }

  /**
   * Check if a tag should be hidden from player display
   * @param id The tag ID to check
   * @returns true if the tag should be hidden, false otherwise
   */
  static isHidden(id: string): boolean {
    const definition = this.registry.get(id);
    return definition?.hidden ?? false;
  }

  /**
   * Get tags by category
   * @param category The category to filter by
   * @returns Array of tag definitions in that category
   */
  static getByCategory(category: string): EquipmentTagDefinition[] {
    return Array.from(this.registry.values()).filter(
      tag => tag.category === category
    );
  }

  /**
   * Get all unique categories
   * @returns Array of category names
   */
  static getAllCategories(): string[] {
    const categories = new Set<string>();
    for (const tag of this.registry.values()) {
      categories.add(tag.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Check if a tag exists in the registry
   * @param id The tag ID to check
   * @returns true if the tag exists, false otherwise
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Clear all registered tags (useful for testing)
   */
  static clear(): void {
    this.registry.clear();
  }

  /**
   * Get the count of registered tags
   */
  static get count(): number {
    return this.registry.size;
  }
}

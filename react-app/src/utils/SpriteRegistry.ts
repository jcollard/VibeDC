import type { SpriteCoordinates } from './SpriteSheetLoader';

/**
 * Defines a sprite's location within a specific sprite sheet
 */
export interface SpriteDefinition {
  /**
   * Unique identifier for this sprite
   */
  id: string;

  /**
   * Path to the sprite sheet (e.g., '/spritesheets/monsters.png')
   */
  spriteSheet: string;

  /**
   * Grid X position in the sprite sheet (0-indexed)
   */
  x: number;

  /**
   * Grid Y position in the sprite sheet (0-indexed)
   */
  y: number;

  /**
   * Optional width in grid cells (defaults to 1)
   * Use for sprites that span multiple cells
   */
  width?: number;

  /**
   * Optional height in grid cells (defaults to 1)
   * Use for sprites that span multiple cells
   */
  height?: number;

  /**
   * Optional tags for categorization and filtering
   */
  tags?: string[];
}

/**
 * Global registry for sprite definitions.
 * Maps string IDs to sprite sheet coordinates for easy lookup.
 *
 * Usage:
 * ```typescript
 * // Define sprites
 * SpriteRegistry.register({
 *   id: 'wolf',
 *   spriteSheet: '/spritesheets/monsters.png',
 *   x: 0,
 *   y: 0
 * });
 *
 * // Look up sprite
 * const wolfSprite = SpriteRegistry.getById('wolf');
 * if (wolfSprite) {
 *   const coords = { x: wolfSprite.x, y: wolfSprite.y };
 *   // Use with SpriteSheetLoader...
 * }
 * ```
 */
export class SpriteRegistry {
  private static registry: Map<string, SpriteDefinition> = new Map();

  /**
   * Register a sprite definition
   */
  static register(sprite: SpriteDefinition): void {
    if (this.registry.has(sprite.id)) {
      console.warn(`Sprite with id '${sprite.id}' is already registered. Overwriting.`);
    }
    this.registry.set(sprite.id, sprite);
  }

  /**
   * Register multiple sprite definitions at once
   */
  static registerAll(sprites: SpriteDefinition[]): void {
    for (const sprite of sprites) {
      this.register(sprite);
    }
  }

  /**
   * Get a sprite definition by ID
   */
  static getById(id: string): SpriteDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Get sprite coordinates by ID (convenience method)
   */
  static getCoordinates(id: string): SpriteCoordinates | undefined {
    const sprite = this.registry.get(id);
    if (!sprite) {
      return undefined;
    }
    return { x: sprite.x, y: sprite.y };
  }

  /**
   * Get all sprites from a specific sprite sheet
   */
  static getBySheet(spriteSheetPath: string): SpriteDefinition[] {
    return Array.from(this.registry.values())
      .filter(sprite => sprite.spriteSheet === spriteSheetPath);
  }

  /**
   * Get all sprites with a specific tag
   */
  static getByTag(tag: string): SpriteDefinition[] {
    return Array.from(this.registry.values())
      .filter(sprite => sprite.tags?.includes(tag));
  }

  /**
   * Get all registered sprite IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered sprites
   */
  static getAll(): SpriteDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if a sprite ID is registered
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Remove a sprite from the registry
   */
  static unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all registered sprites
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered sprites
   */
  static get count(): number {
    return this.registry.size;
  }
}

/**
 * JSON format for sprite definitions in YAML/data files
 */
export interface SpriteDefinitionJSON {
  id: string;
  spriteSheet: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  tags?: string[];
}

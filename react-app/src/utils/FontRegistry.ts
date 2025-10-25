/**
 * Defines a font's atlas configuration and rendering properties
 */
export interface FontDefinition {
  /**
   * Unique identifier for this font
   */
  id: string;

  /**
   * Path to the font atlas image (e.g., '/fonts/dungeon-12x12.png')
   */
  atlasPath: string;

  /**
   * Fixed width of each character in pixels (in the atlas image)
   */
  charWidth: number;

  /**
   * Height of each character in pixels (in the atlas image)
   */
  charHeight: number;

  /**
   * Line height in pixels (spacing between lines)
   * If not specified, defaults to charHeight
   */
  lineHeight?: number;

  /**
   * Horizontal spacing between characters in pixels
   * Default: 0
   */
  charSpacing?: number;

  /**
   * Baseline offset in pixels from the top of the character
   * Used for vertical alignment
   * Default: 0
   */
  baselineOffset?: number;

  /**
   * Character offset X - fine-tune horizontal position within cell
   * Default: 0
   */
  charOffsetX?: number;

  /**
   * Character offset Y - fine-tune vertical position within cell
   * Default: 0
   */
  charOffsetY?: number;

  /**
   * Fallback character to use when a character is not found
   * Default: '?'
   */
  fallbackChar?: string;

  /**
   * The character set mapping
   * Array of strings where index maps to character
   * Example for ASCII 32-126: starts with ' ', '!', '"', etc.
   */
  charSet: string[];

  /**
   * Number of characters per row in the atlas
   * Used to calculate the grid position of each character
   */
  charsPerRow: number;

  /**
   * Optional tags for categorization and filtering
   */
  tags?: string[];
}

/**
 * Global registry for font definitions.
 * Maps string IDs to font atlas configurations for pixel-perfect text rendering.
 *
 * Usage:
 * ```typescript
 * // Define a font
 * FontRegistry.register({
 *   id: 'dungeon-12',
 *   atlasPath: '/fonts/dungeon-12x12.png',
 *   charWidth: 12,
 *   charHeight: 12,
 *   lineHeight: 14,
 *   charSpacing: 1,
 *   charSet: [' ', '!', '"', ...], // ASCII 32-126
 *   charsPerRow: 16
 * });
 *
 * // Look up font
 * const font = FontRegistry.getById('dungeon-12');
 * if (font) {
 *   // Use with canvas rendering...
 * }
 * ```
 */
export class FontRegistry {
  private static registry: Map<string, FontDefinition> = new Map();

  /**
   * Register a font definition
   */
  static register(font: FontDefinition): void {
    if (this.registry.has(font.id)) {
      console.warn(`Font with id '${font.id}' is already registered. Overwriting.`);
    }
    this.registry.set(font.id, font);
  }

  /**
   * Register multiple font definitions at once
   */
  static registerAll(fonts: FontDefinition[]): void {
    for (const font of fonts) {
      this.register(font);
    }
  }

  /**
   * Get a font definition by ID
   */
  static getById(id: string): FontDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all fonts from a specific atlas path
   */
  static getByAtlas(atlasPath: string): FontDefinition[] {
    return Array.from(this.registry.values())
      .filter(font => font.atlasPath === atlasPath);
  }

  /**
   * Get all fonts with a specific tag
   */
  static getByTag(tag: string): FontDefinition[] {
    return Array.from(this.registry.values())
      .filter(font => font.tags?.includes(tag));
  }

  /**
   * Get all registered font IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered fonts
   */
  static getAll(): FontDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if a font ID is registered
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Update the ID of a font while keeping all other properties
   * @param oldId - The current ID of the font
   * @param newId - The new ID to assign
   * @returns true if successful, false if old ID doesn't exist or new ID already exists
   */
  static updateFontId(oldId: string, newId: string): boolean {
    // Validate that old ID exists
    const font = this.registry.get(oldId);
    if (!font) {
      console.warn(`Cannot update font ID: '${oldId}' not found in registry`);
      return false;
    }

    // Validate that new ID is not already taken (unless it's the same)
    if (oldId !== newId && this.registry.has(newId)) {
      console.warn(`Cannot update font ID: '${newId}' is already in use`);
      return false;
    }

    // If the ID is the same, no change needed
    if (oldId === newId) {
      return true;
    }

    // Create updated font with new ID
    const updatedFont = { ...font, id: newId };

    // Remove old entry and add new one
    this.registry.delete(oldId);
    this.registry.set(newId, updatedFont);

    console.log(`Updated font ID from '${oldId}' to '${newId}'`);
    return true;
  }

  /**
   * Update the tags of a font
   * @param id - The font ID
   * @param tags - The new array of tags
   * @returns true if successful, false if font not found
   */
  static updateFontTags(id: string, tags: string[]): boolean {
    const font = this.registry.get(id);
    if (!font) {
      console.warn(`Cannot update font tags: '${id}' not found in registry`);
      return false;
    }

    // Create updated font with new tags (remove empty tags)
    const cleanedTags = tags.filter(tag => tag.trim().length > 0).map(tag => tag.trim());
    const updatedFont = { ...font, tags: cleanedTags.length > 0 ? cleanedTags : undefined };

    this.registry.set(id, updatedFont);
    console.log(`Updated tags for font '${id}':`, cleanedTags);
    return true;
  }

  /**
   * Add a tag to a font
   * @param id - The font ID
   * @param tag - The tag to add
   * @returns true if successful, false if font not found or tag already exists
   */
  static addFontTag(id: string, tag: string): boolean {
    const font = this.registry.get(id);
    if (!font) {
      console.warn(`Cannot add tag: font '${id}' not found in registry`);
      return false;
    }

    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      console.warn('Cannot add empty tag');
      return false;
    }

    const currentTags = font.tags || [];
    if (currentTags.includes(trimmedTag)) {
      console.warn(`Tag '${trimmedTag}' already exists on font '${id}'`);
      return false;
    }

    const updatedFont = { ...font, tags: [...currentTags, trimmedTag] };
    this.registry.set(id, updatedFont);
    console.log(`Added tag '${trimmedTag}' to font '${id}'`);
    return true;
  }

  /**
   * Remove a tag from a font
   * @param id - The font ID
   * @param tag - The tag to remove
   * @returns true if successful, false if font not found or tag doesn't exist
   */
  static removeFontTag(id: string, tag: string): boolean {
    const font = this.registry.get(id);
    if (!font) {
      console.warn(`Cannot remove tag: font '${id}' not found in registry`);
      return false;
    }

    const currentTags = font.tags || [];
    if (!currentTags.includes(tag)) {
      console.warn(`Tag '${tag}' not found on font '${id}'`);
      return false;
    }

    const updatedTags = currentTags.filter(t => t !== tag);
    const updatedFont = { ...font, tags: updatedTags.length > 0 ? updatedTags : undefined };
    this.registry.set(id, updatedFont);
    console.log(`Removed tag '${tag}' from font '${id}'`);
    return true;
  }

  /**
   * Remove a font from the registry
   */
  static unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all registered fonts
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered fonts
   */
  static get count(): number {
    return this.registry.size;
  }

  /**
   * Get the character index in the atlas for a given character
   * @param font - The font definition
   * @param char - The character to look up
   * @returns The index in the charSet array, or -1 if not found
   */
  static getCharIndex(font: FontDefinition, char: string): number {
    const index = font.charSet.indexOf(char);
    if (index === -1) {
      // Try fallback character
      const fallback = font.fallbackChar || '?';
      return font.charSet.indexOf(fallback);
    }
    return index;
  }

  /**
   * Get the atlas coordinates for a character
   * @param font - The font definition
   * @param char - The character to look up
   * @returns Object with x, y grid coordinates in the atlas, or null if not found
   */
  static getCharCoordinates(font: FontDefinition, char: string): { x: number; y: number } | null {
    const index = this.getCharIndex(font, char);
    if (index === -1) return null;

    const x = index % font.charsPerRow;
    const y = Math.floor(index / font.charsPerRow);

    return { x, y };
  }
}

/**
 * JSON format for font definitions in YAML/data files
 */
export interface FontDefinitionJSON {
  id: string;
  atlasPath: string;
  charWidth: number;
  charHeight: number;
  lineHeight?: number;
  charSpacing?: number;
  baselineOffset?: number;
  charOffsetX?: number;
  charOffsetY?: number;
  fallbackChar?: string;
  charSet: string[];
  charsPerRow: number;
  tags?: string[];
}

/**
 * Helper to generate standard ASCII character set (32-126)
 */
export function generateASCIICharSet(): string[] {
  const chars: string[] = [];
  for (let i = 32; i <= 126; i++) {
    chars.push(String.fromCharCode(i));
  }
  return chars;
}

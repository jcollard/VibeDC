import { FontRegistry } from '../utils/FontRegistry';

/**
 * Centralized font atlas loading service
 * Manages font atlas image loading with caching and promise deduplication
 */
export class FontAtlasLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * Load a single font atlas by ID
   * Returns cached image if already loaded
   */
  async load(fontId: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.cache.has(fontId)) {
      return this.cache.get(fontId)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(fontId)) {
      return this.loadingPromises.get(fontId)!;
    }

    // Get font definition from registry
    const fontDef = FontRegistry.getById(fontId);
    if (!fontDef) {
      throw new Error(`Font '${fontId}' not found in FontRegistry`);
    }

    // Create loading promise
    const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = fontDef.atlasPath;
      img.onload = () => {
        this.cache.set(fontId, img);
        this.loadingPromises.delete(fontId);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(fontId);
        reject(new Error(`Failed to load font atlas for '${fontId}' at ${fontDef.atlasPath}`));
      };
    });

    this.loadingPromises.set(fontId, loadingPromise);
    return loadingPromise;
  }

  /**
   * Load multiple font atlases concurrently
   * Returns a map of fontId -> loaded image
   */
  async loadAll(fontIds: string[]): Promise<Map<string, HTMLImageElement>> {
    const promises = fontIds.map(async (fontId) => {
      try {
        const image = await this.load(fontId);
        return { fontId, image };
      } catch (error) {
        console.error(`Failed to load font atlas '${fontId}':`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const loaded = new Map<string, HTMLImageElement>();

    for (const result of results) {
      if (result) {
        loaded.set(result.fontId, result.image);
      }
    }

    return loaded;
  }

  /**
   * Get a loaded font atlas image
   * Returns null if not loaded
   */
  get(fontId: string): HTMLImageElement | null {
    return this.cache.get(fontId) || null;
  }

  /**
   * Check if a font atlas is loaded
   */
  isLoaded(fontId: string): boolean {
    return this.cache.has(fontId);
  }

  /**
   * Check if a font atlas is currently loading
   */
  isLoading(fontId: string): boolean {
    return this.loadingPromises.has(fontId);
  }

  /**
   * Clear all cached font atlases
   */
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get all loaded font atlas images
   */
  getAll(): Map<string, HTMLImageElement> {
    return new Map(this.cache);
  }
}

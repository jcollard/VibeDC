import { FontAtlasLoader } from './FontAtlasLoader';
import { FontRegistry } from '../utils/FontRegistry';

/**
 * ResourceManager - Centralized resource loading and caching
 * Shared across all views to avoid redundant loading
 */
export class ResourceManager {
  private fontLoader: FontAtlasLoader;
  private fontAtlases: Map<string, HTMLImageElement>;
  private isLoading: boolean;

  constructor() {
    this.fontLoader = new FontAtlasLoader();
    this.fontAtlases = new Map();
    this.isLoading = false;
  }

  /**
   * Load all fonts used across the game
   * Called once during GameView mount
   */
  async loadFonts(): Promise<void> {
    // ✅ GUIDELINE: Cache check to avoid redundant loading
    if (this.fontAtlases.size > 0) {
      console.log('[ResourceManager] Fonts already loaded, skipping');
      return;
    }

    this.isLoading = true;
    console.log('[ResourceManager] Loading fonts...');

    try {
      const fontIds = FontRegistry.getAllIds();
      await this.fontLoader.loadAll(fontIds);

      // Cache all loaded fonts
      fontIds.forEach(fontId => {
        const fontAtlas = this.fontLoader.get(fontId);
        if (fontAtlas) {
          this.fontAtlases.set(fontId, fontAtlas);
        }
      });

      console.log(`[ResourceManager] Loaded ${this.fontAtlases.size} fonts`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get a loaded font atlas
   */
  getFontAtlas(fontId: string): HTMLImageElement | null {
    return this.fontAtlases.get(fontId) || null;
  }

  /**
   * Check if resources are currently loading
   */
  isLoadingResources(): boolean {
    return this.isLoading;
  }
}

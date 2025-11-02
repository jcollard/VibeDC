import { FontAtlasLoader } from './FontAtlasLoader';
import { FontRegistry } from '../utils/FontRegistry';
import { SpriteRegistry } from '../utils/SpriteRegistry';

/**
 * ResourceManager - Centralized resource loading and caching
 * Shared across all views to avoid redundant loading
 */
export class ResourceManager {
  private fontLoader: FontAtlasLoader;
  private fontAtlases: Map<string, HTMLImageElement>;
  private spriteAtlas: HTMLImageElement | null;
  private spriteImages: Map<string, HTMLImageElement>;
  private isLoading: boolean;

  constructor() {
    this.fontLoader = new FontAtlasLoader();
    this.fontAtlases = new Map();
    this.spriteAtlas = null;
    this.spriteImages = new Map();
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
   * Load sprite atlas
   * Called once during GameView mount
   */
  async loadSprites(): Promise<void> {
    // ✅ GUIDELINE: Cache check to avoid redundant loading
    if (this.spriteAtlas) {
      console.log('[ResourceManager] Sprites already loaded, skipping');
      return;
    }

    this.isLoading = true;
    console.log('[ResourceManager] Loading sprite atlas...');

    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.spriteAtlas = img;

          // Store the atlas image by its path (not by sprite ID)
          // SpriteRenderer looks up images by sprite sheet path
          this.spriteImages.set('/spritesheets/atlas.png', img);

          const spriteIds = SpriteRegistry.getAllIds();
          console.log(`[ResourceManager] Loaded sprite atlas with ${spriteIds.length} sprites`);
          resolve();
        };
        img.onerror = (error) => {
          console.error('[ResourceManager] Failed to load sprite atlas from /spritesheets/atlas.png', error);
          reject(new Error('Failed to load sprite atlas from /spritesheets/atlas.png'));
        };
        console.log('[ResourceManager] Loading sprite atlas from /spritesheets/atlas.png');
        img.src = '/spritesheets/atlas.png';
      });
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
   * Get the sprite atlas image
   */
  getSpriteAtlas(): HTMLImageElement | null {
    return this.spriteAtlas;
  }

  /**
   * Get all sprite images (map of sprite ID to atlas image)
   */
  getSpriteImages(): Map<string, HTMLImageElement> {
    return this.spriteImages;
  }

  /**
   * Check if resources are currently loading
   */
  isLoadingResources(): boolean {
    return this.isLoading;
  }
}

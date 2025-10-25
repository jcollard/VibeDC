/**
 * Font configuration for combat view
 */
export interface FontConfig {
  headerFont: string;
  dialogFont: string;
}

/**
 * Result of font loading operation
 */
export interface FontLoadResult {
  fonts: FontConfig;
  loaded: boolean;
  error: string | null;
}

/**
 * Service for loading fonts needed for combat view
 * Uses the Font Loading API to ensure fonts are ready before rendering
 */
export class FontAssetLoader {
  private fonts: FontConfig | null = null;
  private loading = false;
  private loaded = false;
  private error: string | null = null;

  /**
   * Load the specified fonts at various sizes
   * @param headerFont - Font to use for headers and titles
   * @param dialogFont - Font to use for dialogs and messages
   */
  async loadFonts(headerFont: string, dialogFont: string): Promise<FontLoadResult> {
    if (this.loading) {
      return {
        fonts: this.fonts || { headerFont: 'monospace', dialogFont: 'monospace' },
        loaded: this.loaded,
        error: 'Font loading already in progress',
      };
    }

    this.loading = true;
    this.error = null;

    try {
      // Load header font at various sizes commonly used in combat view
      await document.fonts.load(`48px "${headerFont}"`); // Title size
      await document.fonts.load(`32px "${headerFont}"`); // Subtitle size

      // Load dialog font at various sizes
      await document.fonts.load(`36px "${dialogFont}"`); // Message size
      await document.fonts.load(`24px "${dialogFont}"`); // Body text size
      await document.fonts.load(`16px "${dialogFont}"`); // Small text size

      this.fonts = { headerFont, dialogFont };
      this.loaded = true;

      console.log(`FontAssetLoader: Fonts "${headerFont}" and "${dialogFont}" loaded successfully`);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error loading fonts';
      this.loaded = false;
      this.fonts = { headerFont: 'monospace', dialogFont: 'monospace' }; // Fallback

      console.warn(`FontAssetLoader: Failed to load fonts`, err);
    } finally {
      this.loading = false;
    }

    return {
      fonts: this.fonts,
      loaded: this.loaded,
      error: this.error,
    };
  }

  /**
   * Get the loaded fonts
   */
  getFonts(): FontConfig | null {
    return this.fonts;
  }

  /**
   * Check if fonts have been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get any error that occurred during loading
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Clear loaded font state (useful for cleanup or reloading)
   */
  clear(): void {
    this.fonts = null;
    this.loaded = false;
    this.error = null;
  }
}

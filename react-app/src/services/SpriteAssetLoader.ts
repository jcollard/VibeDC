import type { CombatState } from '../models/combat/CombatState';
import type { CombatEncounter } from '../models/combat/CombatEncounter';
import type { CombatPhaseHandler } from '../models/combat/CombatPhaseHandler';
import { SpriteRegistry } from '../utils/SpriteRegistry';

/**
 * Result of sprite loading operation
 */
export interface SpriteLoadResult {
  spriteSheets: Map<string, HTMLImageElement>;
  loaded: boolean;
  error: string | null;
}

/**
 * Service for loading sprite sheet images needed for combat
 * Handles loading sprite sheets (not individual sprites) efficiently
 * by loading each unique sprite sheet only once
 */
export class SpriteAssetLoader {
  private spriteSheets = new Map<string, HTMLImageElement>();
  private loading = false;
  private loaded = false;
  private error: string | null = null;

  /**
   * Load all sprite sheets needed for the given combat state and encounter
   * @param combatState - Current combat state containing map and units
   * @param encounter - Combat encounter data
   * @param phaseHandler - Phase handler that knows what sprites it needs
   */
  async loadSprites(
    combatState: CombatState,
    encounter: CombatEncounter,
    phaseHandler: CombatPhaseHandler
  ): Promise<SpriteLoadResult> {
    if (this.loading) {
      return {
        spriteSheets: this.spriteSheets,
        loaded: this.loaded,
        error: 'Sprite loading already in progress',
      };
    }

    this.loading = true;
    this.error = null;

    try {
      // Collect all sprite IDs needed
      const spritesToLoad = new Set<string>();

      // Get sprites from map cells
      const allCells = combatState.map.getAllCells();
      for (const { cell } of allCells) {
        if (cell.spriteId) {
          spritesToLoad.add(cell.spriteId);
        }
      }

      // Get phase-specific sprites from the phase handler
      const phaseSprites = phaseHandler.getRequiredSprites(combatState, encounter);
      phaseSprites.spriteIds.forEach(id => spritesToLoad.add(id));

      // Load each unique sprite sheet
      const loadPromises = Array.from(spritesToLoad).map(async (spriteId) => {
        const spriteDef = SpriteRegistry.getById(spriteId);
        if (!spriteDef) {
          console.warn(`Sprite not found: ${spriteId}`);
          return;
        }

        // Check if we already loaded this sprite sheet
        if (!this.spriteSheets.has(spriteDef.spriteSheet)) {
          const img = new Image();
          img.src = spriteDef.spriteSheet;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              this.spriteSheets.set(spriteDef.spriteSheet, img);
              resolve();
            };
            img.onerror = (err) => {
              const errorMsg = `Failed to load sprite sheet ${spriteDef.spriteSheet}`;
              console.error(`SpriteAssetLoader: ${errorMsg}`, err);
              reject(new Error(errorMsg));
            };
          });
        }
      });

      await Promise.all(loadPromises);
      this.loaded = true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error loading sprites';
      this.loaded = false;
    } finally {
      this.loading = false;
    }

    return {
      spriteSheets: this.spriteSheets,
      loaded: this.loaded,
      error: this.error,
    };
  }

  /**
   * Get the loaded sprite sheets
   * @returns Map of sprite sheet paths to HTMLImageElement instances
   */
  getSpriteSheets(): Map<string, HTMLImageElement> {
    return this.spriteSheets;
  }

  /**
   * Check if sprites have been loaded
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
   * Clear all loaded sprites (useful for cleanup or reloading)
   */
  clear(): void {
    this.spriteSheets.clear();
    this.loaded = false;
    this.error = null;
  }
}

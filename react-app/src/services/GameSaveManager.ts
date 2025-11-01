import type { CompleteGameState } from '../models/game/GameState';
import { serializeCompleteGameState, deserializeCompleteGameState } from '../models/game/GameStateSerialization';

/**
 * GameSaveManager - Handles save/load operations for game state
 * Uses localStorage for browser-based persistence
 */
export class GameSaveManager {
  private static readonly SAVE_KEY_PREFIX = 'vibedc_save_';
  private static readonly QUICK_SAVE_SLOT = 0;
  private static readonly MAX_SAVE_SLOTS = 10;

  /**
   * Save game state to a specific slot
   * @param state The complete game state to save
   * @param slotIndex The save slot (0-9)
   * @returns true if save succeeded, false otherwise
   */
  static saveToSlot(state: CompleteGameState, slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.MAX_SAVE_SLOTS) {
      console.error(`[GameSaveManager] Invalid slot index: ${slotIndex}`);
      return false;
    }

    try {
      // Update save slot info
      const stateWithSlotInfo: CompleteGameState = {
        ...state,
        saveSlotInfo: {
          slotIndex,
          savedAt: new Date(),
          playtime: state.totalPlaytime,
        },
      };

      // Serialize state
      const serialized = serializeCompleteGameState(stateWithSlotInfo);
      const json = JSON.stringify(serialized);

      // Save to localStorage
      const key = this.getSaveKey(slotIndex);
      localStorage.setItem(key, json);

      console.log(`[GameSaveManager] Saved to slot ${slotIndex} (${json.length} bytes)`);
      return true;
    } catch (error) {
      console.error(`[GameSaveManager] Save failed:`, error);
      return false;
    }
  }

  /**
   * Load game state from a specific slot
   * @param slotIndex The save slot (0-9)
   * @returns The loaded game state, or null if load failed
   */
  static loadFromSlot(slotIndex: number): CompleteGameState | null {
    if (slotIndex < 0 || slotIndex >= this.MAX_SAVE_SLOTS) {
      console.error(`[GameSaveManager] Invalid slot index: ${slotIndex}`);
      return null;
    }

    try {
      const key = this.getSaveKey(slotIndex);
      const json = localStorage.getItem(key);

      if (!json) {
        console.log(`[GameSaveManager] No save found in slot ${slotIndex}`);
        return null;
      }

      // Deserialize state
      const serialized = JSON.parse(json);
      const state = deserializeCompleteGameState(serialized);

      if (!state) {
        console.error(`[GameSaveManager] Failed to deserialize slot ${slotIndex}`);
        return null;
      }

      console.log(`[GameSaveManager] Loaded from slot ${slotIndex}`);
      return state;
    } catch (error) {
      console.error(`[GameSaveManager] Load failed:`, error);
      return null;
    }
  }

  /**
   * Check if a save slot has data
   * @param slotIndex The save slot (0-9)
   * @returns true if the slot contains a save
   */
  static hasSave(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.MAX_SAVE_SLOTS) {
      return false;
    }

    const key = this.getSaveKey(slotIndex);
    return localStorage.getItem(key) !== null;
  }

  /**
   * Delete a save slot
   * @param slotIndex The save slot (0-9)
   * @returns true if deletion succeeded
   */
  static deleteSave(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.MAX_SAVE_SLOTS) {
      console.error(`[GameSaveManager] Invalid slot index: ${slotIndex}`);
      return false;
    }

    try {
      const key = this.getSaveKey(slotIndex);
      localStorage.removeItem(key);
      console.log(`[GameSaveManager] Deleted save slot ${slotIndex}`);
      return true;
    } catch (error) {
      console.error(`[GameSaveManager] Delete failed:`, error);
      return false;
    }
  }

  /**
   * Quick save to slot 0
   * @param state The complete game state to save
   * @returns true if save succeeded
   */
  static quickSave(state: CompleteGameState): boolean {
    console.log('[GameSaveManager] Quick save (F5)');
    return this.saveToSlot(state, this.QUICK_SAVE_SLOT);
  }

  /**
   * Quick load from slot 0
   * @returns The loaded game state, or null if no quick save exists
   */
  static quickLoad(): CompleteGameState | null {
    console.log('[GameSaveManager] Quick load');
    return this.loadFromSlot(this.QUICK_SAVE_SLOT);
  }

  /**
   * Get all save slot metadata
   * @returns Array of save slot info (null for empty slots)
   */
  static getAllSaveSlots(): Array<SaveSlotMetadata | null> {
    const slots: Array<SaveSlotMetadata | null> = [];

    for (let i = 0; i < this.MAX_SAVE_SLOTS; i++) {
      slots.push(this.getSaveSlotMetadata(i));
    }

    return slots;
  }

  /**
   * Get metadata for a specific save slot without loading the full state
   * @param slotIndex The save slot (0-9)
   * @returns Metadata about the save, or null if slot is empty
   */
  static getSaveSlotMetadata(slotIndex: number): SaveSlotMetadata | null {
    if (slotIndex < 0 || slotIndex >= this.MAX_SAVE_SLOTS) {
      return null;
    }

    try {
      const key = this.getSaveKey(slotIndex);
      const json = localStorage.getItem(key);

      if (!json) {
        return null;
      }

      // Parse just the metadata without full deserialization
      const data = JSON.parse(json);

      return {
        slotIndex,
        savedAt: new Date(data.saveSlotInfo?.savedAt || Date.now()),
        playtime: data.saveSlotInfo?.playtime || 0,
        currentView: data.currentView,
        currentMapId: data.explorationState?.currentMapId || 'unknown',
      };
    } catch (error) {
      console.error(`[GameSaveManager] Failed to read metadata for slot ${slotIndex}:`, error);
      return null;
    }
  }

  /**
   * Get the localStorage key for a save slot
   */
  private static getSaveKey(slotIndex: number): string {
    return `${this.SAVE_KEY_PREFIX}${slotIndex}`;
  }

  /**
   * Clear all save slots (for testing/debugging)
   */
  static clearAllSaves(): void {
    console.warn('[GameSaveManager] Clearing all save slots');
    for (let i = 0; i < this.MAX_SAVE_SLOTS; i++) {
      this.deleteSave(i);
    }
  }
}

/**
 * Metadata about a save slot (lightweight)
 */
export interface SaveSlotMetadata {
  slotIndex: number;
  savedAt: Date;
  playtime: number;
  currentView: string;
  currentMapId: string;
}

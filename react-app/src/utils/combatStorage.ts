import type { CombatState } from '../models/combat/CombatState';
import type { CombatLogManager } from '../models/combat/CombatLogManager';
import type { CombatSaveData } from '../models/combat/CombatSaveData';
import { serializeCombat, deserializeCombat } from '../models/combat/CombatSaveData';

const STORAGE_KEY = 'vibedc-combat-save';
const SLOT_KEY_PREFIX = 'vibedc-combat-slot-';
const NUM_SLOTS = 4;

/**
 * Metadata for a save slot (stored separately for quick display without full deserialization)
 */
export interface SaveSlotMetadata {
  slotIndex: number;
  timestamp: number;
  turnNumber: number;
  phase: string;
  encounterId?: string;
}

/**
 * Get the storage key for a specific slot
 */
function getSlotKey(slotIndex: number): string {
  return `${SLOT_KEY_PREFIX}${slotIndex}`;
}

/**
 * Get the metadata key for a specific slot
 */
function getSlotMetadataKey(slotIndex: number): string {
  return `${SLOT_KEY_PREFIX}${slotIndex}-metadata`;
}

/**
 * Save combat state and log to browser localStorage
 * @param combatState The current combat state
 * @param combatLog The combat log manager
 * @param encounterId Optional encounter ID reference
 * @returns true if save was successful, false otherwise
 */
export function saveCombatToLocalStorage(
  combatState: CombatState,
  combatLog: CombatLogManager,
  encounterId?: string
): boolean {
  try {
    const saveData = serializeCombat(combatState, combatLog, encounterId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

/**
 * Load combat state and log from browser localStorage
 * @returns Combat state, log manager, and optional encounter ID, or null if no save exists or loading fails
 */
export function loadCombatFromLocalStorage(): {
  combatState: CombatState;
  combatLog: CombatLogManager;
  encounterId?: string;
} | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
      return null;
    }

    const saveData = JSON.parse(json) as CombatSaveData;
    const result = deserializeCombat(saveData);
    if (!result) {
      return null;
    }

    return {
      ...result,
      encounterId: saveData.encounterId
    };
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Clear combat save data from browser localStorage
 */
export function clearCombatFromLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export combat state and log to a downloadable JSON file
 * @param combatState The current combat state
 * @param combatLog The combat log manager
 * @param encounterId Optional encounter ID reference
 */
export function exportCombatToFile(
  combatState: CombatState,
  combatLog: CombatLogManager,
  encounterId?: string
): void {
  const saveData = serializeCombat(combatState, combatLog, encounterId);
  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Generate timestamped filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `vibedc-combat-save-${timestamp}.json`;

  // Create download link and trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import combat state and log from a JSON file
 * @param file The file to import
 * @returns Promise that resolves to combat state, log, and optional encounter ID, or null if import fails
 */
export function importCombatFromFile(
  file: File
): Promise<{ combatState: CombatState; combatLog: CombatLogManager; encounterId?: string } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const saveData = JSON.parse(json) as CombatSaveData;
        const result = deserializeCombat(saveData);
        if (!result) {
          resolve(null);
          return;
        }

        resolve({
          ...result,
          encounterId: saveData.encounterId
        });
      } catch (error) {
        console.error('Failed to parse combat save file:', error);
        resolve(null);
      }
    };

    reader.onerror = () => {
      console.error('Failed to read file');
      resolve(null);
    };

    reader.readAsText(file);
  });
}

/**
 * Save combat state and log to a specific slot in browser localStorage
 * @param slotIndex The slot index (0-3)
 * @param combatState The current combat state
 * @param combatLog The combat log manager
 * @param encounterId Optional encounter ID reference
 * @returns true if save was successful, false otherwise
 */
export function saveCombatToSlot(
  slotIndex: number,
  combatState: CombatState,
  combatLog: CombatLogManager,
  encounterId?: string
): boolean {
  if (slotIndex < 0 || slotIndex >= NUM_SLOTS) {
    console.error(`Invalid slot index: ${slotIndex}. Must be between 0 and ${NUM_SLOTS - 1}`);
    return false;
  }

  try {
    const saveData = serializeCombat(combatState, combatLog, encounterId);
    const slotKey = getSlotKey(slotIndex);
    const metadataKey = getSlotMetadataKey(slotIndex);

    // Save full data
    localStorage.setItem(slotKey, JSON.stringify(saveData));

    // Save metadata for quick display
    const metadata: SaveSlotMetadata = {
      slotIndex,
      timestamp: saveData.timestamp,
      turnNumber: combatState.turnNumber,
      phase: combatState.phase,
      encounterId: saveData.encounterId,
    };
    localStorage.setItem(metadataKey, JSON.stringify(metadata));

    return true;
  } catch (error) {
    console.error(`Failed to save to slot ${slotIndex}:`, error);
    return false;
  }
}

/**
 * Load combat state and log from a specific slot in browser localStorage
 * @param slotIndex The slot index (0-3)
 * @returns Combat state, log manager, and optional encounter ID, or null if no save exists or loading fails
 */
export function loadCombatFromSlot(slotIndex: number): {
  combatState: CombatState;
  combatLog: CombatLogManager;
  encounterId?: string;
} | null {
  if (slotIndex < 0 || slotIndex >= NUM_SLOTS) {
    console.error(`Invalid slot index: ${slotIndex}. Must be between 0 and ${NUM_SLOTS - 1}`);
    return null;
  }

  try {
    const slotKey = getSlotKey(slotIndex);
    const json = localStorage.getItem(slotKey);
    if (!json) {
      return null;
    }

    const saveData = JSON.parse(json) as CombatSaveData;
    const result = deserializeCombat(saveData);
    if (!result) {
      return null;
    }

    return {
      ...result,
      encounterId: saveData.encounterId
    };
  } catch (error) {
    console.error(`Failed to load from slot ${slotIndex}:`, error);
    return null;
  }
}

/**
 * Get metadata for a specific slot without loading the full save data
 * @param slotIndex The slot index (0-3)
 * @returns Slot metadata or null if slot is empty or invalid
 */
export function getSlotMetadata(slotIndex: number): SaveSlotMetadata | null {
  if (slotIndex < 0 || slotIndex >= NUM_SLOTS) {
    return null;
  }

  try {
    const metadataKey = getSlotMetadataKey(slotIndex);
    const json = localStorage.getItem(metadataKey);
    if (!json) {
      return null;
    }

    return JSON.parse(json) as SaveSlotMetadata;
  } catch (error) {
    console.error(`Failed to load metadata for slot ${slotIndex}:`, error);
    return null;
  }
}

/**
 * Get metadata for all slots
 * @returns Array of metadata (null for empty slots)
 */
export function getAllSlotMetadata(): (SaveSlotMetadata | null)[] {
  const metadata: (SaveSlotMetadata | null)[] = [];
  for (let i = 0; i < NUM_SLOTS; i++) {
    metadata.push(getSlotMetadata(i));
  }
  return metadata;
}

/**
 * Clear a specific slot
 * @param slotIndex The slot index (0-3)
 */
export function clearSlot(slotIndex: number): void {
  if (slotIndex < 0 || slotIndex >= NUM_SLOTS) {
    console.error(`Invalid slot index: ${slotIndex}. Must be between 0 and ${NUM_SLOTS - 1}`);
    return;
  }

  const slotKey = getSlotKey(slotIndex);
  const metadataKey = getSlotMetadataKey(slotIndex);
  localStorage.removeItem(slotKey);
  localStorage.removeItem(metadataKey);
}

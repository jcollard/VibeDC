import type { CombatState } from '../models/combat/CombatState';
import type { CombatLogManager } from '../models/combat/CombatLogManager';
import type { CombatSaveData } from '../models/combat/CombatSaveData';
import { serializeCombat, deserializeCombat } from '../models/combat/CombatSaveData';

const STORAGE_KEY = 'vibedc-combat-save';

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

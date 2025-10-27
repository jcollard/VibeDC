import type { CombatState, CombatStateJSON } from './CombatState';
import type { CombatLogManager, CombatLogJSON } from './CombatLogManager';
import { serializeCombatState, deserializeCombatState } from './CombatState';
import { CombatLogManager as CombatLogManagerImpl } from './CombatLogManager';

/**
 * Top-level save data structure for combat state
 */
export interface CombatSaveData {
  /** Schema version for forward compatibility */
  version: string;
  /** Timestamp when the save was created */
  timestamp: number;
  /** The combat state */
  combatState: CombatStateJSON;
  /** The combat log messages */
  combatLog: CombatLogJSON;
  /** Optional reference to the encounter ID (for loading from registry) */
  encounterId?: string;
}

/**
 * Serialize combat state and log to a save data object
 * @param combatState The current combat state
 * @param combatLog The combat log manager
 * @param encounterId Optional encounter ID reference
 * @returns Serialized save data
 */
export function serializeCombat(
  combatState: CombatState,
  combatLog: CombatLogManager,
  encounterId?: string
): CombatSaveData {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    combatState: serializeCombatState(combatState),
    combatLog: combatLog.toJSON(),
    encounterId
  };
}

/**
 * Deserialize combat save data back to combat state and log
 * @param data The save data to deserialize
 * @returns Combat state and log manager, or null if deserialization fails
 */
export function deserializeCombat(
  data: CombatSaveData
): { combatState: CombatState; combatLog: CombatLogManager } | null {
  // Validate version
  if (data.version !== '1.0.0') {
    console.error(`Unsupported save version: ${data.version}. Expected 1.0.0`);
    return null;
  }

  // Deserialize combat state
  const combatState = deserializeCombatState(data.combatState);
  if (!combatState) {
    console.error('Failed to deserialize combat state');
    return null;
  }

  // Deserialize combat log
  const combatLog = CombatLogManagerImpl.fromJSON(data.combatLog);

  return { combatState, combatLog };
}

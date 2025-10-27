import type { CombatMap, CombatMapJSON } from './CombatMap';
import type { CombatUnitManifest, CombatUnitManifestJSON } from './CombatUnitManifest';
import { CombatMap as CombatMapImpl } from './CombatMap';
import { CombatUnitManifest as CombatUnitManifestImpl } from './CombatUnitManifest';

/**
 * Combat phase types
 */
export type CombatPhase = 'deployment' | 'enemy-deployment' | 'battle' | 'victory' | 'defeat';

/**
 * CombatState represents the current state of an active combat encounter.
 * This is a placeholder interface that will be expanded as the combat system is implemented.
 *
 * It will include:
 * - Current turn number
 * - Active units and their positions
 * - Combat map state
 * - Turn order/initiative
 * - Active effects on the battlefield
 * - Combat log/history
 */
export interface CombatState {
  // Placeholder - will be expanded during combat system implementation
  turnNumber: number;

  /**
   * The combat map grid
   */
  map: CombatMap;

  /**
   * The tileset ID to use for rendering the map
   */
  tilesetId: string;

  /**
   * The current phase of combat
   */
  phase: CombatPhase;

  /**
   * Tracks all units and their positions on the map
   */
  unitManifest: CombatUnitManifest;

  // Additional fields will be added as combat mechanics are implemented
}

/**
 * JSON representation of CombatState for serialization
 */
export interface CombatStateJSON {
  turnNumber: number;
  phase: CombatPhase;
  tilesetId: string;
  map: CombatMapJSON;
  unitManifest: CombatUnitManifestJSON;
}

/**
 * Convert a CombatState to a JSON-serializable object
 * @param state The combat state to serialize
 * @returns JSON representation of the combat state
 */
export function serializeCombatState(state: CombatState): CombatStateJSON {
  return {
    turnNumber: state.turnNumber,
    phase: state.phase,
    tilesetId: state.tilesetId,
    map: state.map.toJSON(),
    unitManifest: state.unitManifest.toJSON()
  };
}

/**
 * Create a CombatState from a JSON object
 * @param json The JSON representation
 * @returns A new CombatState instance, or null if deserialization fails
 */
export function deserializeCombatState(json: CombatStateJSON): CombatState | null {
  // Deserialize map
  const map = CombatMapImpl.fromJSON(json.map);
  if (!map) {
    console.error('Failed to deserialize CombatMap');
    return null;
  }

  // Deserialize unit manifest
  const unitManifest = CombatUnitManifestImpl.fromJSON(json.unitManifest);
  if (!unitManifest) {
    console.error('Failed to deserialize CombatUnitManifest');
    return null;
  }

  return {
    turnNumber: json.turnNumber,
    phase: json.phase,
    tilesetId: json.tilesetId,
    map,
    unitManifest
  };
}

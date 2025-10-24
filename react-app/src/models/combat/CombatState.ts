import type { CombatMap } from './CombatMap';
import type { CombatUnitManifest } from './CombatUnitManifest';

/**
 * Combat phase types
 */
export type CombatPhase = 'deployment' | 'battle' | 'victory' | 'defeat';

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

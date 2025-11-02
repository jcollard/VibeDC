import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { CombatState } from '../CombatState';

/**
 * Types of movement triggers
 */
export type MovementTriggerType =
  | 'after-move'       // After unit moves (tilesMoved > 0)
  | 'after-no-move';   // After unit chooses not to move (tilesMoved === 0)

/**
 * Context for movement ability evaluation
 */
export interface MovementTriggerContext {
  /** Type of trigger */
  triggerType: MovementTriggerType;

  /** Unit that moved (or didn't move) */
  mover: CombatUnit;

  /** Starting position */
  startPosition: Position;

  /** Ending position */
  endPosition: Position;

  /** Number of tiles moved (Manhattan distance) */
  tilesMoved: number;

  /** Current combat state */
  state: CombatState;
}

/**
 * Result of movement ability execution
 */
export interface MovementAbilityResult {
  /** Whether ability was triggered */
  shouldExecute: boolean;

  /** Updated combat state */
  newState: CombatState;

  /** Combat log messages */
  logMessages: string[];
}

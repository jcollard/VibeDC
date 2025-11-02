import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { CombatState } from '../CombatState';
import type { CinematicSequence } from '../CinematicSequence';

/**
 * Types of reaction triggers
 */
export type ReactionTriggerType =
  | 'before-attacked'  // Before damage is applied to this unit
  | 'after-attacked'   // After damage is applied to this unit
  | 'before-attack'    // Before this unit attacks
  | 'after-attack';    // After this unit attacks

/**
 * Context for reaction trigger evaluation
 */
export interface ReactionTriggerContext {
  /** Type of trigger that occurred */
  triggerType: ReactionTriggerType;

  /** Unit whose reaction is being checked */
  reactor: CombatUnit;

  /** Position of reactor */
  reactorPosition: Position;

  /** Unit doing the attacking (if reactor is defender) */
  attacker?: CombatUnit;

  /** Position of attacker */
  attackerPosition?: Position;

  /** Unit being targeted (if reactor is attacker) */
  target?: CombatUnit;

  /** Position of target */
  targetPosition?: Position;

  /** Amount of damage dealt (for after-attack triggers) */
  damageDealt?: number;

  /** Current combat state */
  state: CombatState;
}

/**
 * Result of reaction execution
 */
export interface ReactionResult {
  /** Whether reaction was triggered */
  shouldExecute: boolean;

  /** Updated combat state */
  newState: CombatState;

  /** Animations to play */
  animations?: CinematicSequence[];

  /** Combat log messages */
  logMessages: string[];
}

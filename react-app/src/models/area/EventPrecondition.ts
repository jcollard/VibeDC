import type { CardinalDirection } from './InteractiveObject';

/**
 * Game state interface (extend as needed)
 *
 * Guidelines Compliance:
 * - Uses Map and Set for collections (not plain objects)
 * - Maps and Sets support immutable updates via new Map()/new Set()
 * - All fields are optional except globalVariables (may expand over time)
 */
export interface GameState {
  globalVariables: Map<string, string | number | boolean>;
  messageLog?: Array<{ text: string; timestamp: number }>;
  currentMapId?: string;
  playerPosition?: { x: number; y: number };
  playerDirection?: CardinalDirection;
  combatState?: { active: boolean; encounterId: string };
  triggeredEventIds?: Set<string>;
  // ... other game state fields
}

/**
 * Base interface for event preconditions.
 * Preconditions determine if an event should fire based on game state.
 *
 * All preconditions in an event must return true for the event to fire.
 */
export interface EventPrecondition {
  /**
   * Type discriminator for JSON serialization
   */
  type: string;

  /**
   * Evaluates if this precondition is met
   * @param state Current game state
   * @returns true if precondition is met, false otherwise
   */
  evaluate(state: GameState): boolean;

  /**
   * Serializes the precondition to JSON
   */
  toJSON(): EventPreconditionJSON;
}

/**
 * JSON representation of an event precondition
 */
export interface EventPreconditionJSON {
  type: string;
  [key: string]: unknown;
}

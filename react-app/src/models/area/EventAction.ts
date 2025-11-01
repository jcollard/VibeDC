import type { GameState } from './EventPrecondition';

/**
 * Base interface for event actions.
 * Actions are executed when an event fires (after preconditions pass).
 *
 * Guidelines Compliance:
 * - Actions return NEW game state (immutable pattern)
 * - Never mutate input state
 */
export interface EventAction {
  /**
   * Type discriminator for JSON serialization
   */
  type: string;

  /**
   * Executes this action, returning modified game state.
   *
   * IMPORTANT: Always return a NEW state object (immutability)
   * @param state Current game state
   * @returns Modified game state
   */
  execute(state: GameState): GameState;

  /**
   * Serializes the action to JSON
   */
  toJSON(): EventActionJSON;
}

/**
 * JSON representation of an event action
 */
export interface EventActionJSON {
  type: string;
  [key: string]: unknown;
}

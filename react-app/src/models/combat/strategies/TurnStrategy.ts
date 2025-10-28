import type { CombatState } from '../CombatState';
import type { CombatEncounter } from '../CombatEncounter';
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { MouseEventContext, PhaseEventResult } from '../CombatPhaseHandler';

/**
 * Turn action that can be performed by a unit
 */
export type TurnAction =
  | { type: 'delay' }             // Set actionTimer to 50
  | { type: 'end-turn' };         // Set actionTimer to 0

/**
 * Strategy pattern for handling unit turns
 * Separates player input handling from AI decision-making
 */
export interface TurnStrategy {
  /**
   * Called when this strategy becomes active (unit's turn starts)
   * Use this to initialize any strategy-specific state
   */
  onTurnStart(unit: CombatUnit, position: Position, state: CombatState): void;

  /**
   * Called when this strategy becomes inactive (turn ends or phase changes)
   * Use this to clean up strategy-specific state
   */
  onTurnEnd(): void;

  /**
   * Update strategy state each frame
   * Returns a TurnAction if the strategy has decided on an action, null otherwise
   *
   * @param unit - The active unit
   * @param position - The active unit's position
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @param deltaTime - Time since last update (in seconds)
   * @returns TurnAction if ready to act, null if still deciding
   */
  update(
    unit: CombatUnit,
    position: Position,
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): TurnAction | null;

  /**
   * Handle map click events
   * Only called for player-controlled strategies
   *
   * @param context - Mouse event details
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Event result indicating if the event was handled
   */
  handleMapClick(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult;

  /**
   * Handle mouse move events
   * Only called for player-controlled strategies
   *
   * @param context - Mouse event details
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Event result indicating if the event was handled
   */
  handleMouseMove(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult;

  /**
   * Get the currently targeted unit (if any)
   * Used to display target info in UI panels
   */
  getTargetedUnit(): CombatUnit | null;

  /**
   * Get the currently targeted position (if any)
   * Used to display target cursor on map
   */
  getTargetedPosition(): Position | null;

  /**
   * Get the movement range for the active unit
   * Used to display yellow highlight tiles
   */
  getMovementRange(): Position[];

  /**
   * Handle action menu button selection
   * Called when player selects an action from the actions menu
   *
   * @param actionId - The action selected ('delay', 'end-turn', etc.)
   */
  handleActionSelected(actionId: string): void;
}

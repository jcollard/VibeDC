import type { CombatState } from '../CombatState';
import type { CombatEncounter } from '../CombatEncounter';
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { MouseEventContext, PhaseEventResult } from '../CombatPhaseHandler';
import type { AttackRangeTiles } from '../utils/AttackRangeCalculator';

/**
 * Turn action that can be performed by a unit
 */
export type TurnAction =
  | { type: 'delay' }             // Set actionTimer to 50
  | { type: 'end-turn' }          // Set actionTimer to 0
  | { type: 'move'; destination: Position; path?: Position[] } // Move to destination (path optional, calculated if not provided)
  | { type: 'reset-move' }        // Reset to original position
  | { type: 'attack'; target: Position }; // Attack target at position

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

  /**
   * Get the current strategy mode ('normal', 'moveSelection', etc.)
   * Used to determine UI state and behavior
   */
  getMode(): string;

  /**
   * Get the movement path currently being previewed (for hover visualization)
   * Returns null if no path is being previewed
   */
  getMovementPath(): Position[] | null;

  /**
   * Get the movement range color override (for move mode)
   * Returns null for default color (yellow), or color string for override (green)
   */
  getMovementRangeColor(): string | null;

  /**
   * Notify the strategy that the unit has completed a move
   * Strategy should clear movement range display
   */
  onUnitMoved?(): void;

  /**
   * Get attack range tiles (only valid in attack mode)
   * Returns null if not in attack mode
   */
  getAttackRange?(): AttackRangeTiles | null;

  /**
   * Get hovered attack target position (only valid in attack mode)
   * Returns null if not hovering over a valid target
   */
  getHoveredAttackTarget?(): Position | null;

  /**
   * Get selected attack target position (only valid in attack mode)
   * Returns null if no target is selected
   */
  getSelectedAttackTarget?(): Position | null;
}

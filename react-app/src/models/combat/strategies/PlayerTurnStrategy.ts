import type { TurnStrategy, TurnAction } from './TurnStrategy';
import type { CombatState } from '../CombatState';
import type { CombatEncounter } from '../CombatEncounter';
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { MouseEventContext, PhaseEventResult } from '../CombatPhaseHandler';
import { MovementRangeCalculator } from '../utils/MovementRangeCalculator';

/**
 * Player turn strategy - waits for player input to decide actions
 *
 * Responsibilities:
 * - Handle mouse clicks on map (select units, select targets, select movement destinations)
 * - Handle mouse hover (show tooltips, highlight valid targets)
 * - Calculate and display movement range
 * - Show action menu when appropriate
 * - Validate player actions before executing
 *
 * State flow:
 * 1. Turn starts → calculate movement range for active unit
 * 2. Player clicks unit → show info panel
 * 3. Player selects action (future: via action menu)
 * 4. Player confirms action → return TurnAction
 * 5. Turn ends
 */
export class PlayerTurnStrategy implements TurnStrategy {
  // Active unit state
  private activeUnit: CombatUnit | null = null;
  private activePosition: Position | null = null;

  // Target selection
  private targetedUnit: CombatUnit | null = null;
  private targetedPosition: Position | null = null;
  private movementRange: Position[] = [];

  // Current combat state (needed for calculations)
  private currentState: CombatState | null = null;

  // Pending action (set by handleActionSelected, returned by update)
  private pendingAction: TurnAction | null = null;

  onTurnStart(unit: CombatUnit, position: Position, state: CombatState): void {
    this.activeUnit = unit;
    this.activePosition = position;
    this.currentState = state;

    // Calculate movement range for this unit
    this.movementRange = MovementRangeCalculator.calculateReachableTiles({
      startPosition: position,
      movement: unit.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: unit
    });

    // Auto-select the active unit at turn start (same behavior as clicking the unit)
    this.targetedUnit = unit;
    this.targetedPosition = position;
  }

  onTurnEnd(): void {
    // Clean up strategy state
    this.activeUnit = null;
    this.activePosition = null;
    this.targetedUnit = null;
    this.targetedPosition = null;
    this.movementRange = [];
    this.currentState = null;
    this.pendingAction = null;
  }

  update(
    _unit: CombatUnit,
    _position: Position,
    state: CombatState,
    _encounter: CombatEncounter,
    _deltaTime: number
  ): TurnAction | null {
    // Store current state for event handlers
    this.currentState = state;

    // If player has selected an action, return it
    if (this.pendingAction) {
      const action = this.pendingAction;
      this.pendingAction = null; // Clear pending action
      return action;
    }

    // Otherwise, wait for player input
    return null;
  }

  handleMapClick(
    context: MouseEventContext,
    state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const { tileX, tileY } = context;

    if (tileX === undefined || tileY === undefined) {
      return { handled: false };
    }

    // Check if a unit is at this position
    const unit = state.unitManifest.getUnitAtPosition({ x: tileX, y: tileY });

    if (unit) {
      // Select unit and calculate its movement range
      this.selectUnit(unit, { x: tileX, y: tileY }, state);

      return { handled: true };
    } else {
      // Future: If clicking on valid movement tile, move to that position
      // Future: If clicking on valid attack target, attack that position

      // For now, just clear selection
      this.clearSelection();

      return { handled: true };
    }
  }

  handleMouseMove(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    // Future: Show tooltips on hover
    // Future: Highlight valid targets on hover
    return { handled: false };
  }

  getTargetedUnit(): CombatUnit | null {
    return this.targetedUnit;
  }

  getTargetedPosition(): Position | null {
    return this.targetedPosition;
  }

  getMovementRange(): Position[] {
    return this.movementRange;
  }

  /**
   * Select a unit and calculate its movement range
   * Called when clicking on a unit on the map or in the turn order panel
   */
  private selectUnit(unit: CombatUnit, position: Position, state: CombatState): void {
    this.targetedUnit = unit;
    this.targetedPosition = position;

    // Calculate movement range for the selected unit
    this.movementRange = MovementRangeCalculator.calculateReachableTiles({
      startPosition: position,
      movement: unit.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: unit
    });
  }

  /**
   * Clear the currently selected unit and movement range
   */
  private clearSelection(): void {
    this.targetedUnit = null;
    this.targetedPosition = null;

    // Reset movement range to active unit's range
    if (this.activeUnit && this.activePosition && this.currentState) {
      this.movementRange = MovementRangeCalculator.calculateReachableTiles({
        startPosition: this.activePosition,
        movement: this.activeUnit.movement,
        map: this.currentState.map,
        unitManifest: this.currentState.unitManifest,
        activeUnit: this.activeUnit
      });
    } else {
      this.movementRange = [];
    }
  }

  handleActionSelected(actionId: string): void {
    // Convert actionId to TurnAction
    switch (actionId) {
      case 'delay':
        this.pendingAction = { type: 'delay' };
        break;
      case 'end-turn':
        this.pendingAction = { type: 'end-turn' };
        break;
      default:
        console.warn('[PlayerTurnStrategy] Unknown action ID:', actionId);
        this.pendingAction = null;
    }
  }
}

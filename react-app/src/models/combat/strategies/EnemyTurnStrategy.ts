import type { TurnStrategy, TurnAction } from './TurnStrategy';
import type { CombatState } from '../CombatState';
import type { CombatEncounter } from '../CombatEncounter';
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { MouseEventContext, PhaseEventResult } from '../CombatPhaseHandler';
import { MovementRangeCalculator } from '../utils/MovementRangeCalculator';

/**
 * Enemy turn strategy - uses AI rules to decide actions automatically
 *
 * Responsibilities:
 * - Evaluate available actions (move, attack, ability, wait)
 * - Calculate best action using AI strategy
 * - Execute action automatically (no player input)
 * - Add visual delays for player comprehension
 *
 * AI Strategy (future implementation):
 * 1. Identify all player-controlled units in range
 * 2. If enemies in attack range → attack closest/weakest
 * 3. If enemies not in range but reachable → move closer
 * 4. If no enemies reachable → move toward closest enemy
 * 5. If no valid actions → wait
 *
 * State flow:
 * 1. Turn starts → calculate movement range, scan for targets
 * 2. Thinking delay (0.5-1.0s) → make decision visible to player
 * 3. Return TurnAction → execute immediately
 * 4. Turn ends
 */
export class EnemyTurnStrategy implements TurnStrategy {
  // AI decision state
  private movementRange: Position[] = [];
  private thinkingTimer: number = 0;
  private thinkingDuration: number = 1.0; // seconds
  private actionDecided: TurnAction | null = null;

  // Target state (for visualization)
  private targetedUnit: CombatUnit | null = null;
  private targetedPosition: Position | null = null;

  onTurnStart(_unit: CombatUnit, position: Position, state: CombatState): void {
    // Calculate movement range for this unit
    this.movementRange = MovementRangeCalculator.calculateReachableTiles({
      startPosition: position,
      movement: _unit.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: _unit
    });

    // Reset AI state
    this.thinkingTimer = 0;
    this.actionDecided = null;

    // Auto-select the active enemy unit at turn start (for UI display)
    this.targetedUnit = _unit;
    this.targetedPosition = position;
  }

  onTurnEnd(): void {
    // Clean up strategy state
    this.movementRange = [];
    this.thinkingTimer = 0;
    this.actionDecided = null;
    this.targetedUnit = null;
    this.targetedPosition = null;
  }

  update(
    unit: CombatUnit,
    position: Position,
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): TurnAction | null {
    // If we've already decided on an action, return it
    if (this.actionDecided) {
      return this.actionDecided;
    }

    // Add thinking delay for visual feedback
    this.thinkingTimer += deltaTime;

    if (this.thinkingTimer < this.thinkingDuration) {
      // Still "thinking" - no action yet
      return null;
    }

    // Thinking complete - make decision
    const action = this.decideAction(unit, position, state, encounter);
    this.actionDecided = action;

    return action;
  }

  handleMapClick(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    // Enemy strategy doesn't handle player input
    return { handled: false };
  }

  handleMouseMove(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    // Enemy strategy doesn't handle player input
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
   * AI decision logic - determines what action the enemy should take
   *
   * Future implementation:
   * 1. Scan for player units in attack range → attack best target
   * 2. Scan for player units in movement + attack range → move + attack
   * 3. Scan for closest player unit → move toward them
   * 4. If no valid actions → wait
   *
   * For now, just end turn immediately (placeholder)
   */
  private decideAction(
    _unit: CombatUnit,
    _position: Position,
    _state: CombatState,
    _encounter: CombatEncounter
  ): TurnAction {
    // TODO: Implement actual AI decision logic
    // For now, enemies just end their turn immediately

    // Future:
    // const targets = this.findPlayerUnits(state);
    // const attackTarget = this.findBestAttackTarget(targets);
    // if (attackTarget) {
    //   return { type: 'attack', target: attackTarget.position };
    // }
    //
    // const moveTarget = this.findBestMovementTarget(targets);
    // if (moveTarget) {
    //   return { type: 'move', target: moveTarget };
    // }

    return { type: 'end-turn' };
  }

  // Future AI helper methods (not yet used, ready for implementation)

  // private _findPlayerUnits(state: CombatState): Array<{ unit: CombatUnit; position: Position }> {
  //   return state.unitManifest
  //     .getAllUnits()
  //     .filter(placement => placement.unit.isPlayerControlled)
  //     .map(placement => ({ unit: placement.unit, position: placement.position }));
  // }

  // private _calculateDistance(from: Position, to: Position): number {
  //   return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  // }

  // private _findBestAttackTarget(
  //   _targets: Array<{ unit: CombatUnit; position: Position }>
  // ): { unit: CombatUnit; position: Position } | null {
  //   // TODO: Implement attack target selection
  //   return null;
  // }

  // private _findBestMovementTarget(_targets: Array<{ unit: CombatUnit; position: Position }>): Position | null {
  //   // TODO: Implement movement target selection
  //   return null;
  // }

  handleActionSelected(_actionId: string): void {
    // Enemy strategy doesn't use action menu
    // No-op implementation
  }
}

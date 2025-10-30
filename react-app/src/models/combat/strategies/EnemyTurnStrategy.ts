import type { TurnStrategy, TurnAction } from './TurnStrategy';
import type { CombatState } from '../CombatState';
import type { CombatEncounter } from '../CombatEncounter';
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { MouseEventContext, PhaseEventResult } from '../CombatPhaseHandler';
import type { AIBehavior, AIDecision, AIContext, AIBehaviorConfig } from '../ai';
import { AIContextBuilder, BehaviorRegistry, DEFAULT_ENEMY_BEHAVIORS } from '../ai';
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
  // AI behavior system
  private behaviors: AIBehavior[];
  private context: AIContext | null = null;

  // AI decision state
  private movementRange: Position[] = [];
  private thinkingTimer: number = 0;
  private thinkingDuration: number = 1.0; // seconds
  private actionDecided: TurnAction | null = null;

  // Target state (for visualization)
  private targetedUnit: CombatUnit | null = null;
  private targetedPosition: Position | null = null;

  // Pending action to execute after movement completes
  private pendingActionAfterMove: AIDecision['action'] | null = null;

  /**
   * Create enemy turn strategy with optional behavior configuration
   * @param behaviorConfigs - Optional behavior configuration (uses defaults if not provided)
   */
  constructor(behaviorConfigs?: AIBehaviorConfig[]) {
    // Initialize behaviors (use defaults if none provided)
    const configs = behaviorConfigs ?? DEFAULT_ENEMY_BEHAVIORS;
    this.behaviors = BehaviorRegistry.createMany(configs);
  }

  onTurnStart(_unit: CombatUnit, position: Position, state: CombatState): void {
    console.log(`[AI] ${_unit.name} turn starting, building context...`);

    // Build AI context
    try {
      this.context = AIContextBuilder.build(_unit, position, state);
      console.log(`[AI] ${_unit.name} context built successfully`);
      console.log(`[AI] ${_unit.name} attack range:`, this.context.attackRange);
      console.log(`[AI] ${_unit.name} movement range tiles:`, this.context.movementRange.length);
    } catch (error) {
      console.error(`[AI] ${_unit.name} context build failed:`, error);
      this.context = null;
    }

    // Calculate movement range for this unit (for backward compatibility with existing code)
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
    this.context = null;
    this.movementRange = [];
    this.thinkingTimer = 0;
    this.actionDecided = null;
    this.targetedUnit = null;
    this.targetedPosition = null;
    this.pendingActionAfterMove = null; // Clear pending action
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
   * AI decision logic - evaluates behaviors in priority order
   *
   * Evaluates each behavior in priority order (highest first).
   * First behavior with canExecute() === true gets to decide().
   * Converts AIDecision to TurnAction format.
   */
  private decideAction(
    unit: CombatUnit,
    _position: Position,
    _state: CombatState,
    _encounter: CombatEncounter
  ): TurnAction {
    // Evaluate behaviors in priority order
    if (!this.context) {
      console.warn(`[AI] ${unit.name} has no context, ending turn`);
      return { type: 'end-turn' };
    }

    let decisionMade = false;

    for (const behavior of this.behaviors) {
      if (behavior.canExecute(this.context)) {
        const decision = behavior.decide(this.context);

        if (decision) {
          const action = this.convertDecisionToAction(decision);
          decisionMade = true;

          // Debug logging for AI decision-making
          console.log(`[AI] ${unit.name} chose behavior: ${behavior.type}`);
          return action;
        }
      }
    }

    // Fallback if no behavior returned valid decision (should never happen with DefaultBehavior)
    if (!decisionMade) {
      console.warn(`[AI] ${unit.name} had no valid behaviors, ending turn`);
      return { type: 'end-turn' };
    }

    return { type: 'end-turn' };
  }

  /**
   * Convert AIDecision to TurnAction format.
   * Handles decision ordering and action types.
   */
  private convertDecisionToAction(decision: AIDecision): TurnAction {
    // Handle different decision orders
    switch (decision.order) {
      case 'act-only':
        // No movement, just action
        if (decision.action?.type === 'attack') {
          if (!decision.action.target) {
            console.warn('[AI] Attack decision missing target');
            return { type: 'end-turn' };
          }
          // Store target for visualization
          this.targetedPosition = decision.action.target;
          return {
            type: 'attack',
            target: decision.action.target,
          };
        }
        if (decision.action?.type === 'delay') {
          return { type: 'delay' };
        }
        if (decision.action?.type === 'end-turn') {
          return { type: 'end-turn' };
        }
        break;

      case 'move-only':
        // Movement without action
        if (decision.movement) {
          return {
            type: 'move',
            destination: decision.movement.destination,
            path: decision.movement.path,
          };
        }
        break;

      case 'move-first':
        // Movement then action
        if (decision.movement && decision.action?.type === 'attack') {
          // Store the pending action for after movement
          this.pendingActionAfterMove = decision.action;
          // Store target for visualization
          this.targetedPosition = decision.action.target ?? null;
          return {
            type: 'move',
            destination: decision.movement.destination,
            path: decision.movement.path,
          };
        }
        break;

      case 'act-first':
        // Action then movement (future use case)
        console.warn('[AI] act-first order not yet implemented');
        break;
    }

    // Fallback
    console.warn('[AI] Unhandled decision type, ending turn', decision);
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

  getMode(): string {
    // Enemy AI doesn't have modes (always auto-decides)
    return 'normal';
  }

  getMovementPath(): Position[] | null {
    // Enemy AI doesn't preview paths
    return null;
  }

  getMovementRangeColor(): string | null {
    // Enemy AI uses default color
    return null;
  }

  /**
   * Check if there is a pending action to execute after movement
   */
  hasPendingAction(): boolean {
    return this.pendingActionAfterMove !== null;
  }

  /**
   * Get and clear the pending action (for execution after movement completes)
   */
  getPendingAction(): AIDecision['action'] | null {
    const action = this.pendingActionAfterMove;
    this.pendingActionAfterMove = null; // Clear after retrieval
    return action;
  }
}

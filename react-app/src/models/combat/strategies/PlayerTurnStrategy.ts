import type { TurnStrategy, TurnAction } from './TurnStrategy';
import type { CombatState } from '../CombatState';
import type { CombatEncounter } from '../CombatEncounter';
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { MouseEventContext, PhaseEventResult } from '../CombatPhaseHandler';
import { MovementRangeCalculator } from '../utils/MovementRangeCalculator';
import { MovementPathfinder } from '../utils/MovementPathfinder';
import { CombatConstants } from '../CombatConstants';

/**
 * Strategy mode - defines what the player is currently doing
 */
type StrategyMode = 'normal' | 'moveSelection';

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

  // Strategy mode state machine
  private mode: StrategyMode = 'normal';

  // Movement path caching (pre-calculated when entering move mode)
  private moveModePaths: Map<string, Position[]> = new Map();

  // Currently hovered movement path (for yellow preview)
  private hoveredMovePath: Position[] | null = null;

  // Pending message to display in combat log (consumed by phase handler)
  private pendingMessage: string | null = null;

  onTurnStart(unit: CombatUnit, position: Position, state: CombatState): void {
    this.activeUnit = unit;
    this.activePosition = position;
    this.currentState = state;

    // Reset mode state
    this.mode = 'normal';
    this.moveModePaths.clear();
    this.hoveredMovePath = null;

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

    // Clean up mode state
    this.mode = 'normal';
    this.moveModePaths.clear();
    this.hoveredMovePath = null;
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

    const clickedPosition = { x: tileX, y: tileY };
    const unit = state.unitManifest.getUnitAtPosition(clickedPosition);

    // Handle move mode clicks
    if (this.mode === 'moveSelection') {
      // If clicked on a unit, exit move mode and select that unit
      if (unit) {
        this.exitMoveMode();
        this.selectUnit(unit, clickedPosition, state);
        return { handled: true };
      }
      // Otherwise, try to move to the clicked tile
      return this.handleMoveClick(clickedPosition);
    }

    // Normal mode: unit selection
    if (unit) {
      this.selectUnit(unit, clickedPosition, state);
      return { handled: true };
    } else {
      this.clearSelection();
      return { handled: true };
    }
  }

  handleMouseMove(
    context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const { tileX, tileY } = context;

    if (tileX === undefined || tileY === undefined) {
      return { handled: false };
    }

    // Handle move mode hover
    if (this.mode === 'moveSelection') {
      this.updateHoveredPath({ x: tileX, y: tileY });
      return { handled: true };
    }

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
    // Handle mode toggles
    if (actionId === 'move') {
      this.toggleMoveMode();
      return;
    }

    // Other actions cancel move mode
    if (this.mode === 'moveSelection') {
      this.exitMoveMode();
    }

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

  getMode(): string {
    return this.mode;
  }

  getMovementPath(): Position[] | null {
    return this.hoveredMovePath;
  }

  getMovementRangeColor(): string | null {
    return this.mode === 'moveSelection'
      ? CombatConstants.UNIT_TURN.MOVEMENT_RANGE_COLOR_ACTIVE  // Green
      : null;  // Default yellow
  }

  /**
   * Update the hovered movement path (for yellow preview)
   */
  private updateHoveredPath(position: Position): void {
    const key = this.positionKey(position);
    const path = this.moveModePaths.get(key);

    // Update hover state (instant replacement)
    this.hoveredMovePath = path ?? null;
  }

  /**
   * Handle click during move mode
   */
  private handleMoveClick(position: Position): PhaseEventResult {
    const key = this.positionKey(position);
    const path = this.moveModePaths.get(key);

    if (!path || path.length === 0) {
      // Clicked invalid tile - do nothing
      return { handled: true };
    }

    // Valid tile clicked - initiate movement
    this.pendingAction = {
      type: 'move',
      destination: position
    };

    // Clear all highlights immediately (before animation starts)
    this.exitMoveMode();
    this.movementRange = [];

    return { handled: true };
  }

  /**
   * Toggle move mode on/off
   */
  private toggleMoveMode(): void {
    if (this.mode === 'moveSelection') {
      this.exitMoveMode();
    } else {
      this.enterMoveMode();
    }
  }

  /**
   * Enter move selection mode
   */
  private enterMoveMode(): void {
    if (!this.activeUnit || !this.activePosition || !this.currentState) {
      console.warn('[PlayerTurnStrategy] Cannot enter move mode - missing active unit');
      return;
    }

    this.mode = 'moveSelection';

    // Add combat log message with colored unit name
    const nameColor = this.activeUnit.isPlayerControlled ? '#00cc00' : '#ff0000';
    this.pendingMessage = `Click a tile to move [color=${nameColor}]${this.activeUnit.name}[/color]`;

    // Pre-calculate all paths to valid tiles (performance optimization)
    this.moveModePaths.clear();

    for (const tile of this.movementRange) {
      const path = MovementPathfinder.calculatePath({
        start: this.activePosition,
        end: tile,
        maxRange: this.activeUnit.movement,
        map: this.currentState.map,
        unitManifest: this.currentState.unitManifest,
        activeUnit: this.activeUnit
      });

      if (path.length > 0) {
        const key = this.positionKey(tile);
        this.moveModePaths.set(key, path);
      }
    }

    console.log(`[PlayerTurnStrategy] Entered move mode - cached ${this.moveModePaths.size} paths`);
  }

  /**
   * Exit move selection mode
   */
  private exitMoveMode(): void {
    this.mode = 'normal';
    this.moveModePaths.clear();
    this.hoveredMovePath = null;
  }

  /**
   * Get and clear any pending combat log message
   */
  getPendingMessage(): string | null {
    const message = this.pendingMessage;
    this.pendingMessage = null;
    return message;
  }

  /**
   * Convert position to string key for Map
   */
  private positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }
}

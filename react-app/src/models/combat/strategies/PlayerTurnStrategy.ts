import type { TurnStrategy, TurnAction } from './TurnStrategy';
import type { CombatState } from '../CombatState';
import type { CombatEncounter } from '../CombatEncounter';
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import type { MouseEventContext, PhaseEventResult } from '../CombatPhaseHandler';
import type { HumanoidUnit } from '../HumanoidUnit';
import { MovementRangeCalculator } from '../utils/MovementRangeCalculator';
import { MovementPathfinder } from '../utils/MovementPathfinder';
import { AttackRangeCalculator } from '../utils/AttackRangeCalculator';
import type { AttackRangeTiles } from '../utils/AttackRangeCalculator';
import { CombatConstants } from '../CombatConstants';

/**
 * Strategy mode - defines what the player is currently doing
 */
type StrategyMode = 'normal' | 'moveSelection' | 'attackSelection';

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

  // Track if the active unit has moved this turn
  private hasMoved: boolean = false;

  // Attack range state (cached when entering attack mode)
  private attackRange: AttackRangeTiles | null = null;
  private hoveredAttackTarget: Position | null = null;
  private selectedAttackTarget: Position | null = null;
  private attackRangeCachedPosition: Position | null = null; // Position used to calculate attack range

  onTurnStart(unit: CombatUnit, position: Position, state: CombatState): void {
    this.activeUnit = unit;
    this.activePosition = position;
    this.currentState = state;

    // Reset mode state
    this.mode = 'normal';
    this.moveModePaths.clear();
    this.hoveredMovePath = null;
    this.hasMoved = false;
    this.attackRange = null;
    this.hoveredAttackTarget = null;
    this.selectedAttackTarget = null;
    this.attackRangeCachedPosition = null;

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
    this.attackRange = null;
    this.hoveredAttackTarget = null;
    this.selectedAttackTarget = null;
    this.attackRangeCachedPosition = null;
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

    // Handle attack mode clicks
    if (this.mode === 'attackSelection') {
      return this.handleAttackClick(clickedPosition, state);
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

    // Handle attack mode hover
    if (this.mode === 'attackSelection') {
      this.updateHoveredAttackTarget({ x: tileX, y: tileY });
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
    // Hide movement range when in attack mode
    if (this.mode === 'attackSelection') {
      return [];
    }
    return this.movementRange;
  }

  /**
   * Select a unit and calculate its movement range
   * Called when clicking on a unit on the map or in the turn order panel
   */
  private selectUnit(unit: CombatUnit, position: Position, state: CombatState): void {
    this.targetedUnit = unit;
    this.targetedPosition = position;

    // Only calculate movement range if the unit hasn't moved yet
    // (or if selecting a different unit than the active unit)
    if (!this.hasMoved || unit !== this.activeUnit) {
      this.movementRange = MovementRangeCalculator.calculateReachableTiles({
        startPosition: position,
        movement: unit.movement,
        map: state.map,
        unitManifest: state.unitManifest,
        activeUnit: unit
      });
    } else {
      // Unit has already moved - don't show movement range
      this.movementRange = [];
    }
  }

  /**
   * Clear the currently selected unit and movement range
   */
  private clearSelection(): void {
    this.targetedUnit = null;
    this.targetedPosition = null;

    // Reset movement range to active unit's range (only if unit hasn't moved)
    if (this.activeUnit && this.activePosition && this.currentState && !this.hasMoved) {
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

    if (actionId === 'attack') {
      this.toggleAttackMode();
      return;
    }

    // Handle reset-move
    if (actionId === 'reset-move') {
      this.pendingAction = { type: 'reset-move' };
      return;
    }

    // Other actions cancel move mode and attack mode
    if (this.mode === 'moveSelection') {
      this.exitMoveMode();
    }
    if (this.mode === 'attackSelection') {
      this.exitAttackMode();
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
   * Notify that the unit has moved - clear movement range
   */
  onUnitMoved(): void {
    this.hasMoved = true;
    this.movementRange = [];
    this.exitMoveMode();
  }

  /**
   * Notify that the move has been reset - restore movement range
   */
  onMoveReset(unit: CombatUnit, position: Position, state: CombatState): void {
    this.hasMoved = false;
    this.activePosition = position;

    // Recalculate movement range
    this.movementRange = MovementRangeCalculator.calculateReachableTiles({
      startPosition: position,
      movement: unit.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: unit
    });

    // Select the unit at new position
    this.targetedUnit = unit;
    this.targetedPosition = position;
  }

  /**
   * Convert position to string key for Map
   */
  private positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }

  /**
   * Toggle attack mode on/off
   */
  private toggleAttackMode(): void {
    if (this.mode === 'attackSelection') {
      this.exitAttackMode();
    } else {
      this.enterAttackMode();
    }
  }

  /**
   * Enter attack selection mode
   */
  private enterAttackMode(): void {
    if (!this.activeUnit || !this.currentState) {
      console.warn('[PlayerTurnStrategy] Cannot enter attack mode - missing active unit');
      return;
    }

    // Exit move mode if active
    if (this.mode === 'moveSelection') {
      this.exitMoveMode();
    }

    this.mode = 'attackSelection';

    // Deselect all units and clear any previously selected target
    this.targetedUnit = null;
    this.targetedPosition = null;
    this.selectedAttackTarget = null;

    // Get current position from manifest (in case unit has moved)
    const currentPosition = this.currentState.unitManifest.getUnitPosition(this.activeUnit);
    if (!currentPosition) {
      console.warn('[PlayerTurnStrategy] Cannot enter attack mode - unit not found in manifest');
      return;
    }

    // Get weapon range from equipped weapons
    const humanoidUnit = this.activeUnit as HumanoidUnit;
    const weapons = humanoidUnit.getEquippedWeapons?.();

    if (!weapons || weapons.length === 0) {
      console.warn('[PlayerTurnStrategy] Cannot enter attack mode - no weapons equipped');
      this.attackRange = { inRange: [], blocked: [], validTargets: [] };
      this.attackRangeCachedPosition = currentPosition;
      return;
    }

    // Use first weapon's range (if dual-wielding, ranges should match per equipment rules)
    const weapon = weapons[0];
    const minRange = weapon.minRange ?? 1;
    const maxRange = weapon.maxRange ?? 1;

    // Calculate attack range from current position
    this.attackRange = AttackRangeCalculator.calculateAttackRange({
      attackerPosition: currentPosition,
      minRange,
      maxRange,
      map: this.currentState.map,
      unitManifest: this.currentState.unitManifest
    });

    // Cache the position used for calculation
    this.attackRangeCachedPosition = currentPosition;
  }

  /**
   * Exit attack selection mode
   */
  private exitAttackMode(): void {
    this.mode = 'normal';
    this.attackRange = null;
    this.hoveredAttackTarget = null;
    this.selectedAttackTarget = null;

    // Re-select the active unit to restore its info display
    // Use current position from manifest (not cached activePosition which may be stale after movement)
    if (this.activeUnit && this.currentState) {
      const currentPosition = this.currentState.unitManifest.getUnitPosition(this.activeUnit);
      if (currentPosition) {
        this.selectUnit(this.activeUnit, currentPosition, this.currentState);
      }
    }
  }

  /**
   * Handle cancel attack action
   */
  handleCancelAttack(): void {
    this.exitAttackMode();
  }

  /**
   * Get attack range tiles (only valid in attack mode)
   */
  getAttackRange(): AttackRangeTiles | null {
    if (!this.attackRange || !this.attackRangeCachedPosition) {
      return null;
    }

    // Check if position has changed since we cached the attack range
    if (this.activeUnit && this.currentState) {
      const currentPosition = this.currentState.unitManifest.getUnitPosition(this.activeUnit);
      if (currentPosition &&
          (currentPosition.x !== this.attackRangeCachedPosition.x ||
           currentPosition.y !== this.attackRangeCachedPosition.y)) {
        // Position changed - recalculate attack range
        this.recalculateAttackRange();
      }
    }

    return this.attackRange;
  }

  /**
   * Get hovered attack target position (only valid in attack mode)
   */
  getHoveredAttackTarget(): Position | null {
    return this.hoveredAttackTarget;
  }

  /**
   * Update the hovered attack target (for orange highlight)
   */
  private updateHoveredAttackTarget(position: Position): void {
    if (!this.attackRange) {
      this.hoveredAttackTarget = null;
      return;
    }

    // Check if this position is a valid target
    const isValidTarget = this.attackRange.validTargets.some(
      target => target.x === position.x && target.y === position.y
    );

    this.hoveredAttackTarget = isValidTarget ? position : null;
  }

  /**
   * Recalculate attack range from current position
   * Called when position changes while in attack mode
   */
  private recalculateAttackRange(): void {
    if (!this.activeUnit || !this.currentState) {
      return;
    }

    // Get current position from manifest
    const currentPosition = this.currentState.unitManifest.getUnitPosition(this.activeUnit);
    if (!currentPosition) {
      return;
    }

    // Get weapon range from equipped weapons
    const humanoidUnit = this.activeUnit as HumanoidUnit;
    const weapons = humanoidUnit.getEquippedWeapons?.();

    if (!weapons || weapons.length === 0) {
      this.attackRange = { inRange: [], blocked: [], validTargets: [] };
      this.attackRangeCachedPosition = currentPosition;
      return;
    }

    // Use first weapon's range (if dual-wielding, ranges should match per equipment rules)
    const weapon = weapons[0];
    const minRange = weapon.minRange ?? 1;
    const maxRange = weapon.maxRange ?? 1;

    // Calculate attack range from current position
    this.attackRange = AttackRangeCalculator.calculateAttackRange({
      attackerPosition: currentPosition,
      minRange,
      maxRange,
      map: this.currentState.map,
      unitManifest: this.currentState.unitManifest
    });

    // Update cached position
    this.attackRangeCachedPosition = currentPosition;

    // Clear hovered target (may no longer be valid)
    this.hoveredAttackTarget = null;

    // Clear selected target (may no longer be valid)
    this.selectedAttackTarget = null;
  }

  /**
   * Handle click during attack mode
   */
  private handleAttackClick(position: Position, state: CombatState): PhaseEventResult {
    if (!this.attackRange) {
      return { handled: true };
    }

    // Check if this position is a valid target
    const isValidTarget = this.attackRange.validTargets.some(
      target => target.x === position.x && target.y === position.y
    );

    if (isValidTarget) {
      // Select this target
      this.selectedAttackTarget = position;

      // Update targeted unit to show in top panel
      const targetUnit = state.unitManifest.getUnitAtPosition(position);
      if (targetUnit) {
        this.targetedUnit = targetUnit;
        this.targetedPosition = position;
      }

      return { handled: true };
    }

    // Clicked invalid tile - do nothing
    return { handled: true };
  }

  /**
   * Get selected attack target position (only valid in attack mode)
   */
  getSelectedAttackTarget(): Position | null {
    return this.selectedAttackTarget;
  }
}

# Move Action Implementation Plan

**Date:** 2025-10-28
**Feature:** Movement action with visual feedback, pathfinding, and animation
**Priority:** High
**Complexity:** Medium-High

---

## Overview

This feature implements the "Move" menu option for player units during their turn. When selected, the player enters "move mode" where they can click a valid tile to move their unit. The system provides visual feedback (green movement range, yellow path preview on hover), animates the unit along an orthogonal path, and updates game state to prevent moving again during the same turn.

The implementation follows the strategy pattern established in PlayerTurnStrategy and integrates with the existing phase handler architecture. It introduces new systems for pathfinding (BFS-based path calculation) and unit animation (cinematic sequence or phase-specific animation).

## Requirements

### Visual Specifications

**Colors:**
- Movement range tiles: Green `#00ff00` (vs. default yellow `#ffff00`)
- Path preview tiles: Yellow `#ffff00`
- Move button (active): Green `ACTIVE_COLOR` from theme (indicates mode is active)
- Move button (normal): White `#ffffff` (default enabled state)

**Sprites:**
- Movement highlight: `particles-4` (existing sprite for tile highlights)
- Unit sprites: Use existing unit `spriteId` from CombatUnit

**Alpha/Opacity:**
- Movement range: `0.33` alpha (existing constant)
- Path preview: `0.33` alpha (same as movement range)

**Animation:**
- Movement speed: Configurable variable (recommended: `0.2` seconds per tile)
- Movement path: Orthogonal only (up/down/left/right), shortest path via BFS

### Behavioral Specifications

**Mode Entry (Move Button Clicked):**
1. Active unit is already selected (auto-selected at turn start)
2. Movement range highlights change from yellow to green
3. Move button text changes to green color
4. Cancel message added to combat log: "Click a tile to move {UNIT NAME}"

**Hover Behavior:**
- Hovering over valid green tile shows yellow path from unit to destination
- Path includes destination tile (all tiles yellow)
- Path updates instantly when hovering different tiles
- Hovering over invalid tiles shows no path

**Movement Execution (Valid Tile Clicked):**
1. All highlights disappear immediately (green range + yellow path)
2. Unit animates along the yellow path shown during hover
3. Animation moves tile-by-tile at configured speed
4. Unit's position updates in CombatState/UnitManifest after animation
5. `hasMoved` flag set to `true` for the active unit
6. Remains in unit-turn phase (no automatic turn advance)

**Cancellation:**
- Click Move button again (green → white, exit move mode)
- Select different menu option (Attack, Ability, etc.)
- Click on different unit (switches target, exits move mode)
- Cancel button appears in menu during move mode (alternative to clicking Move again)

**Post-Move State:**
- Move button: Disabled (greyed out)
- Delay button: Disabled (greyed out)
- Attack button: Enabled (can still attack)
- Ability buttons: Enabled (can still use abilities)
- End Turn button: Enabled
- Active unit cursor: Remains visible on unit
- Movement range: Hidden (cleared after move)

### Technical Requirements

**State Management:**
- `hasMoved` flag: Stored in UnitTurnPhaseHandler instance (resets on new turn)
- Movement path cache: Map<string, Position[]> in PlayerTurnStrategy (pre-calculated on mode entry)
- Strategy mode: String union type `'normal' | 'moveSelection'` (extensible for future modes)

**Performance:**
- Path caching: Calculate all paths once when entering move mode
- Movement range calculation: O(tiles × movement) - negligible for 32×18 maps
- Animation: ~60fps smooth movement along path
- No synchronous renderFrame() calls in mouse events

**Pathfinding:**
- Algorithm: BFS for shortest orthogonal path
- Max depth: Typically 1-6 tiles (unit movement stat)
- Obstacles: Respect walls, unit collision (can path through friendlies)
- Reuse: Create new `MovementPathfinder` utility (separate from range calculator)

**Serialization:**
- Unit positions must serialize correctly after movement
- `hasMoved` does NOT serialize (turn-specific state, resets next turn)

## Implementation Tasks

### 1. Add ACTIVE_COLOR Constant (Foundation)

**Files:**
- `react-app/src/models/combat/managers/panels/colors.ts`

**Changes:**
```typescript
/** Color for active/selected buttons (green) */
export const ACTIVE_COLOR = '#00ff00';
```

**Rationale:** Need green color for active Move button to indicate mode is active. Centralized in colors.ts per existing pattern.

---

### 2. Create MovementPathfinder Utility (Foundation)

**Files:**
- `react-app/src/models/combat/utils/MovementPathfinder.ts` (new file)

**Changes:**
```typescript
import type { Position } from '../../../types';
import type { CombatMap } from '../CombatMap';
import type { CombatUnitManifest } from '../CombatUnitManifest';
import type { CombatUnit } from '../CombatUnit';

export interface PathfindingOptions {
  start: Position;
  end: Position;
  maxRange: number;
  map: CombatMap;
  unitManifest: CombatUnitManifest;
  activeUnit: CombatUnit;
}

/**
 * Calculates shortest orthogonal paths for unit movement
 * Uses BFS to find the shortest path from start to end
 */
export class MovementPathfinder {
  /**
   * Calculate shortest orthogonal path from start to end
   * Returns path including destination, excluding start position
   * Returns empty array if no valid path exists
   *
   * @param options - Pathfinding parameters
   * @returns Ordered array of positions from start (exclusive) to end (inclusive)
   */
  static calculatePath(options: PathfindingOptions): Position[] {
    const { start, end, maxRange, map, unitManifest, activeUnit } = options;

    // BFS queue with path tracking
    const queue: Array<{ position: Position; path: Position[] }> = [];
    const visited = new Set<string>();

    queue.push({ position: start, path: [] });
    visited.add(this.positionKey(start));

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Found destination
      if (current.position.x === end.x && current.position.y === end.y) {
        return current.path;
      }

      // Max range check (path length, not including start)
      if (current.path.length >= maxRange) continue;

      // Explore orthogonal neighbors
      const neighbors = this.getOrthogonalNeighbors(current.position);

      for (const neighbor of neighbors) {
        const key = this.positionKey(neighbor);
        if (visited.has(key)) continue;

        // Bounds and walkability
        if (!map.isInBounds(neighbor)) continue;
        if (!map.isWalkable(neighbor)) continue;

        // Unit collision (can path through friendlies, cannot through enemies)
        const unitAtPosition = unitManifest.getUnitAtPosition(neighbor);
        if (unitAtPosition && !this.isFriendly(activeUnit, unitAtPosition)) {
          continue; // Cannot path through enemies
        }

        visited.add(key);
        queue.push({
          position: neighbor,
          path: [...current.path, neighbor] // Include neighbor in path
        });
      }
    }

    // No valid path found
    return [];
  }

  /**
   * Get orthogonal neighbors (up, down, left, right)
   */
  private static getOrthogonalNeighbors(position: Position): Position[] {
    return [
      { x: position.x, y: position.y - 1 }, // Up
      { x: position.x, y: position.y + 1 }, // Down
      { x: position.x - 1, y: position.y }, // Left
      { x: position.x + 1, y: position.y }, // Right
    ];
  }

  /**
   * Check if two units are friendly (same team)
   */
  private static isFriendly(unit1: CombatUnit, unit2: CombatUnit): boolean {
    return unit1.isPlayerControlled === unit2.isPlayerControlled;
  }

  /**
   * Convert position to string key for Set/Map
   */
  private static positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }
}
```

**Rationale:** Separate pathfinding utility keeps concerns separated per GeneralGuidelines.md. BFS guarantees shortest path. Reuses patterns from MovementRangeCalculator for consistency.

---

### 3. Add Movement Speed Constant (Foundation)

**Files:**
- `react-app/src/models/combat/CombatConstants.ts`

**Changes:**
```typescript
// Unit Turn Phase
UNIT_TURN: {
  // ... existing constants ...

  // Movement animation
  MOVEMENT_SPEED_PER_TILE: 0.2,      // Seconds per tile during movement animation
  MOVEMENT_RANGE_COLOR_NORMAL: '#ffff00',  // Yellow (normal selection)
  MOVEMENT_RANGE_COLOR_ACTIVE: '#00ff00',  // Green (during move mode)
},
```

**Rationale:** Configurable movement speed allows easy tuning. Color constants document the two movement range states.

---

### 4. Add hasMoved Tracking to UnitTurnPhaseHandler (Foundation)

**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**
```typescript
export class UnitTurnPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // ... existing instance variables ...

  // Movement tracking (resets when new unit's turn starts)
  private unitHasMoved: boolean = false;

  // ... existing methods ...

  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // ... existing update logic ...

    // Initialize active unit and strategy on first frame
    if (sortedUnits.length > 0 && !this.activeUnit) {
      const readyPlacement = sortedUnits[0];
      this.activeUnit = readyPlacement.unit;
      this.activeUnitPosition = readyPlacement.position;

      // Reset movement tracking for new unit
      this.unitHasMoved = false;

      // Initialize appropriate strategy based on unit control
      this.currentStrategy = this.activeUnit.isPlayerControlled
        ? new PlayerTurnStrategy()
        : new EnemyTurnStrategy();

      // Notify strategy that turn is starting
      this.currentStrategy.onTurnStart(this.activeUnit, this.activeUnitPosition, state);
    }

    // ... rest of update logic ...
  }

  /**
   * Get whether the active unit has moved this turn
   */
  getHasMoved(): boolean {
    return this.unitHasMoved;
  }

  /**
   * Mark the active unit as having moved this turn
   */
  setHasMoved(value: boolean): void {
    this.unitHasMoved = value;
  }
}
```

**Rationale:** Instance variable in phase handler is perfect for turn-specific state that resets on new turns. No serialization needed.

---

### 5. Extend TurnStrategy Interface (Strategy Layer - depends on #4)

**Files:**
- `react-app/src/models/combat/strategies/TurnStrategy.ts`

**Changes:**
```typescript
/**
 * Turn action that can be performed by a unit
 */
export type TurnAction =
  | { type: 'delay' }
  | { type: 'end-turn' }
  | { type: 'move'; destination: Position }; // NEW

export interface TurnStrategy {
  // ... existing methods ...

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
}
```

**Rationale:** Extends interface to support mode queries and path visualization. Backwards compatible (existing strategies return default values).

---

### 6. Implement Strategy Mode State Machine (Strategy Layer - depends on #2, #3, #5)

**Files:**
- `react-app/src/models/combat/strategies/PlayerTurnStrategy.ts`

**Changes:**
```typescript
import { MovementPathfinder } from '../utils/MovementPathfinder';
import { CombatConstants } from '../CombatConstants';

/**
 * Strategy mode - defines what the player is currently doing
 */
type StrategyMode = 'normal' | 'moveSelection';

export class PlayerTurnStrategy implements TurnStrategy {
  // ... existing instance variables ...

  // Strategy mode state machine
  private mode: StrategyMode = 'normal';

  // Movement path caching (pre-calculated when entering move mode)
  private moveModePaths: Map<string, Position[]> = new Map();

  // Currently hovered movement path (for yellow preview)
  private hoveredMovePath: Position[] | null = null;

  // ... existing methods ...

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

    // Auto-select the active unit at turn start
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

  handleMapClick(
    context: MouseEventContext,
    state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const { tileX, tileY } = context;

    if (tileX === undefined || tileY === undefined) {
      return { handled: false };
    }

    // Handle move mode clicks
    if (this.mode === 'moveSelection') {
      return this.handleMoveClick({ x: tileX, y: tileY });
    }

    // Normal mode: unit selection
    const unit = state.unitManifest.getUnitAtPosition({ x: tileX, y: tileY });

    if (unit) {
      // Exit move mode if selecting different unit
      if (this.mode === 'moveSelection') {
        this.exitMoveMode();
      }

      this.selectUnit(unit, { x: tileX, y: tileY }, state);
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
   * Convert position to string key for Map
   */
  private positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }
}
```

**Rationale:**
- Mode state machine enables future expansion (attack targeting, ability targeting)
- Path caching prevents redundant BFS calculations on every hover
- Instant hover updates provide responsive UX
- Clearing movement range on click ensures no highlights during animation

---

### 7. Update TileRangePanel Rendering (Rendering Layer - depends on #5, #6)

**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts` (modify render method)

**Changes:**
```typescript
render(_state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
  const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

  // ... existing combat log logic ...

  // Get movement range and color override from strategy
  const movementRange = this.currentStrategy?.getMovementRange() ?? [];
  const rangeColorOverride = this.currentStrategy?.getMovementRangeColor();

  // Determine movement range color (green in move mode, yellow otherwise)
  const rangeColor = rangeColorOverride ?? CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALBEDO;

  // Render movement range highlights - rendered BEFORE units
  for (const position of movementRange) {
    const x = Math.floor(offsetX + (position.x * tileSize));
    const y = Math.floor(offsetY + (position.y * tileSize));

    this.renderTintedSprite(
      ctx,
      CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE,
      spriteImages,
      spriteSize,
      x,
      y,
      tileSize,
      tileSize,
      rangeColor,  // Use color override for green in move mode
      CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALPHA
    );
  }

  // Get movement path preview (yellow tiles on hover)
  const movementPath = this.currentStrategy?.getMovementPath() ?? null;

  // Render movement path preview - rendered BEFORE units, AFTER range
  if (movementPath && movementPath.length > 0) {
    for (const position of movementPath) {
      const x = Math.floor(offsetX + (position.x * tileSize));
      const y = Math.floor(offsetY + (position.y * tileSize));

      // Yellow path overlay (including destination)
      this.renderTintedSprite(
        ctx,
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize,
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALBEDO,  // Yellow
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALPHA
      );
    }
  }
}
```

**Rationale:**
- Uses existing renderTintedSprite for consistency
- Layering: range (green) → path (yellow) → units (ensures path is visible)
- Color override pattern allows strategy to control visual state

---

### 8. Create UnitMovementSequence (Animation Layer - depends on #3)

**Files:**
- `react-app/src/models/combat/cinematics/UnitMovementSequence.ts` (new file)

**Changes:**
```typescript
import type { CinematicSequence } from './CinematicSequence';
import type { CombatState } from '../CombatState';
import type { CombatEncounter } from '../CombatEncounter';
import type { PhaseRenderContext } from '../CombatPhaseHandler';
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../../../types';
import { CombatConstants } from '../CombatConstants';

/**
 * Animates a unit moving along a path from tile to tile
 *
 * Animation behavior:
 * - Moves along provided path at configured speed (seconds per tile)
 * - Interpolates smoothly between tile positions
 * - Does NOT update unit position in manifest (caller handles state update)
 * - Completes when unit reaches final destination
 */
export class UnitMovementSequence implements CinematicSequence {
  private unit: CombatUnit;
  private path: Position[]; // Path excluding start, including destination
  private startPosition: Position;

  private currentSegment: number = 0; // Which path segment (0 = start → path[0])
  private segmentProgress: number = 0; // 0.0 to 1.0 within current segment
  private elapsedTime: number = 0;

  private readonly speedPerTile: number;

  /**
   * @param unit - The unit to animate
   * @param startPosition - Starting position (not in path array)
   * @param path - Movement path (excluding start, including destination)
   * @param speedPerTile - Seconds per tile (default from constants)
   */
  constructor(
    unit: CombatUnit,
    startPosition: Position,
    path: Position[],
    speedPerTile?: number
  ) {
    this.unit = unit;
    this.startPosition = startPosition;
    this.path = path;
    this.speedPerTile = speedPerTile ?? CombatConstants.UNIT_TURN.MOVEMENT_SPEED_PER_TILE;

    if (this.path.length === 0) {
      console.warn('[UnitMovementSequence] Empty path provided - animation will complete immediately');
    }
  }

  update(_state: CombatState, _encounter: CombatEncounter, deltaTime: number): boolean {
    if (this.path.length === 0) {
      return true; // Empty path = complete immediately
    }

    this.elapsedTime += deltaTime;

    // Calculate segment progress
    this.segmentProgress = this.elapsedTime / this.speedPerTile;

    // Advance to next segment if current is complete
    while (this.segmentProgress >= 1.0 && this.currentSegment < this.path.length - 1) {
      this.segmentProgress -= 1.0;
      this.elapsedTime -= this.speedPerTile;
      this.currentSegment++;
    }

    // Clamp final segment
    if (this.segmentProgress >= 1.0) {
      this.segmentProgress = 1.0;
    }

    // Animation complete when reached last segment at progress 1.0
    return this.currentSegment >= this.path.length - 1 && this.segmentProgress >= 1.0;
  }

  render(_state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    // Movement animation doesn't render anything additional
    // Unit is rendered at interpolated position by normal unit rendering
    // This is handled by getUnitRenderPosition() below
  }

  /**
   * Get the interpolated render position for the unit
   * Called by phase handler during unit rendering
   */
  getUnitRenderPosition(): Position {
    if (this.path.length === 0) {
      return this.startPosition;
    }

    // Determine current segment start and end positions
    const segmentStart = this.currentSegment === 0
      ? this.startPosition
      : this.path[this.currentSegment - 1];

    const segmentEnd = this.path[this.currentSegment];

    // Linear interpolation
    const x = segmentStart.x + (segmentEnd.x - segmentStart.x) * this.segmentProgress;
    const y = segmentStart.y + (segmentEnd.y - segmentStart.y) * this.segmentProgress;

    return { x, y };
  }

  /**
   * Get the unit being animated (for rendering)
   */
  getUnit(): CombatUnit {
    return this.unit;
  }
}
```

**Rationale:**
- Implements CinematicSequence for integration with existing animation system
- Provides interpolated position via helper method (phase handler renders unit)
- Separation of concerns: sequence handles animation timing, handler updates state
- Per-tile timing ensures consistent speed regardless of path length

---

### 9. Integrate Movement Animation with Phase Handler (Animation Layer - depends on #8)

**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**
```typescript
import { UnitMovementSequence } from './cinematics/UnitMovementSequence';

export class UnitTurnPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // ... existing instance variables ...

  // Movement animation
  private movementSequence: UnitMovementSequence | null = null;

  // ... existing methods ...

  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // Store state reference for click handlers
    this.currentState = state;

    // Handle movement animation if in progress
    if (this.movementSequence) {
      const isComplete = this.movementSequence.update(state, encounter, deltaTime);

      if (isComplete) {
        // Animation finished - apply position change
        const newState = this.completeMoveAnimation(state);
        this.movementSequence = null;

        // Stay in unit-turn phase (don't auto-advance turn)
        return newState;
      }

      // Animation still playing - stay in phase
      return state;
    }

    // ... existing unit initialization logic ...

    // Update strategy and check for action decision
    if (this.currentStrategy && this.activeUnit && this.activeUnitPosition) {
      const action = this.currentStrategy.update(
        this.activeUnit,
        this.activeUnitPosition,
        state,
        encounter,
        deltaTime
      );

      // If strategy has decided on an action, execute it
      if (action) {
        if (action.type === 'move') {
          // Start movement animation
          return this.startMoveAnimation(action.destination, state);
        } else {
          // Execute other actions (delay, end-turn)
          const newState = this.executeAction(action, state);
          this.currentStrategy.onTurnEnd();
          return newState;
        }
      }
    }

    // ... existing victory/defeat checks ...

    return state;
  }

  /**
   * Start movement animation for active unit
   */
  private startMoveAnimation(destination: Position, state: CombatState): CombatState | null {
    if (!this.activeUnit || !this.activePosition) {
      console.warn('[UnitTurnPhaseHandler] Cannot start move - no active unit');
      return state;
    }

    // Calculate path from current position to destination
    const path = MovementPathfinder.calculatePath({
      start: this.activePosition,
      end: destination,
      maxRange: this.activeUnit.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: this.activeUnit
    });

    if (path.length === 0) {
      console.warn('[UnitTurnPhaseHandler] Cannot move - no valid path to destination');
      return state;
    }

    // Create movement sequence
    this.movementSequence = new UnitMovementSequence(
      this.activeUnit,
      this.activePosition,
      path
    );

    // Add log message
    const nameColor = this.getUnitNameColor();
    const logMessage = `[color=${nameColor}]${this.activeUnit.name}[/color] moves.`;
    this.pendingLogMessages.push(logMessage);

    // Stay in unit-turn phase while animation plays
    return state;
  }

  /**
   * Complete movement animation - update position and set hasMoved flag
   */
  private completeMoveAnimation(state: CombatState): CombatState {
    if (!this.movementSequence || !this.activeUnit || !this.activePosition) {
      return state;
    }

    // Get final position from animation
    const finalPosition = this.movementSequence.getUnitRenderPosition();

    // Update unit position in manifest
    state.unitManifest.moveUnit(this.activeUnit, {
      x: Math.round(finalPosition.x),
      y: Math.round(finalPosition.y)
    });

    // Update cached active position
    this.activePosition = {
      x: Math.round(finalPosition.x),
      y: Math.round(finalPosition.y)
    };

    // Mark unit as having moved
    this.unitHasMoved = true;

    return state;
  }

  // Modify render to handle animation
  render(_state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    // ... existing rendering logic ...

    // If movement animation is active, skip rendering the moving unit here
    // (it will be rendered at interpolated position separately)
  }
}
```

**Rationale:**
- Animation updates in main phase update loop (60fps smooth)
- State changes applied AFTER animation completes (visual consistency)
- Stays in unit-turn phase during animation (no premature turn advance)
- Uses existing MovementPathfinder for path calculation

---

### 10. Add CombatUnitManifest.moveUnit Method (State Layer - depends on #9)

**Files:**
- `react-app/src/models/combat/CombatUnitManifest.ts`

**Changes:**
```typescript
/**
 * Move a unit to a new position
 * Updates internal position tracking without changing unit references
 *
 * @param unit - The unit to move
 * @param newPosition - The destination position
 * @throws Error if unit is not in manifest
 */
moveUnit(unit: CombatUnit, newPosition: Position): void {
  const id = this.unitToId.get(unit);

  if (!id) {
    throw new Error(`Cannot move unit ${unit.name} - not found in manifest`);
  }

  const placement = this.units.get(id);
  if (!placement) {
    throw new Error(`Cannot move unit ${unit.name} - placement not found`);
  }

  // Update position in placement
  placement.position = newPosition;

  console.log(`[CombatUnitManifest] Moved ${unit.name} to (${newPosition.x}, ${newPosition.y})`);
}
```

**Rationale:** Encapsulates position updates in manifest. Maintains unit identity (same reference). Validates unit exists before moving.

---

### 11. Update ActionsMenuContent for Dynamic Button States (Menu Layer - depends on #1, #4)

**Files:**
- `react-app/src/models/combat/managers/panels/ActionsMenuContent.ts`

**Changes:**
```typescript
import { ACTIVE_COLOR } from './colors';

export class ActionsMenuContent implements PanelContent {
  // ... existing instance variables ...

  private activeButtonId: string | null = null; // Track which button is active (green)

  // ... existing methods ...

  /**
   * Build dynamic button list based on unit's stats, classes, and state
   * @param unit - The combat unit
   * @param hasMoved - Whether the unit has moved this turn
   * @param activeAction - The currently active action (for highlighting)
   */
  private buildButtonList(
    unit: CombatUnit,
    hasMoved: boolean = false,
    activeAction: string | null = null
  ): ActionButton[] {
    const buttons: ActionButton[] = [];

    // Move button (disabled if already moved)
    buttons.push({
      id: 'move',
      label: 'Move',
      enabled: !hasMoved,
      helperText: `Move this unit up to ${unit.movement} tiles`
    });

    // Attack button
    buttons.push({
      id: 'attack',
      label: 'Attack',
      enabled: true,
      helperText: 'Perform a basic attack with this unit\'s weapon'
    });

    // Primary class button
    const primaryClassName = unit.unitClass.name;
    buttons.push({
      id: 'primary-class',
      label: primaryClassName,
      enabled: true,
      helperText: `Perform a ${primaryClassName} action`
    });

    // Secondary class button (conditional)
    if (unit.secondaryClass) {
      const secondaryClassName = unit.secondaryClass.name;
      buttons.push({
        id: 'secondary-class',
        label: secondaryClassName,
        enabled: true,
        helperText: `Perform a ${secondaryClassName} action`
      });
    }

    // Delay button (disabled if already moved)
    buttons.push({
      id: 'delay',
      label: 'Delay',
      enabled: !hasMoved,
      helperText: 'Take no moves or actions and sets Action Timer to 50'
    });

    // End Turn button
    buttons.push({
      id: 'end-turn',
      label: 'End Turn',
      enabled: true,
      helperText: 'Ends your turn and sets Action Timer to 0'
    });

    return buttons;
  }

  /**
   * Update the action menu for a new unit
   * @param unit - The combat unit whose turn it is
   * @param hasMoved - Whether the unit has moved this turn
   * @param activeAction - The currently active action (for highlighting)
   */
  updateUnit(unit: CombatUnit, hasMoved: boolean = false, activeAction: string | null = null): void {
    this.currentUnit = unit;
    this.activeButtonId = activeAction;

    // Rebuild button list with current state
    this.buttons = this.buildButtonList(unit, hasMoved, activeAction);

    // Validate hover index is still valid
    if (this.hoveredButtonIndex !== null &&
        this.hoveredButtonIndex >= this.buttons.length) {
      this.hoveredButtonIndex = null;
    }

    // Mark buttons as enabled (reset disabled state from previous turn)
    this.buttonsDisabled = false;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    _spriteImages?: Map<string, HTMLImageElement>,
    _spriteSize?: number
  ): void {
    if (!fontAtlasImage) return;

    // ... existing setup ...

    // Render action buttons
    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      const isHovered = this.hoveredButtonIndex === i;
      const isActive = button.id === this.activeButtonId;

      // Determine button color based on state
      let color: string;
      if (!button.enabled) {
        color = DISABLED_TEXT;
      } else if (isActive) {
        color = ACTIVE_COLOR; // Green for active button
      } else if (isHovered) {
        color = HOVERED_TEXT;
      } else {
        color = ENABLED_TEXT;
      }

      // Render button text
      FontAtlasRenderer.renderText(
        ctx,
        button.label,
        region.x + this.config.padding,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        color
      );

      currentY += this.config.lineSpacing;
    }

    // ... existing helper text rendering ...
  }
}
```

**Rationale:**
- Dynamic button state based on hasMoved flag (prevents double-move)
- Active button highlighting (green) provides visual feedback for mode
- Delay disabled after move (prevents delay → move exploit)
- Extensible for future action states (attacked, used ability, etc.)

---

### 12. Wire Menu State to Phase Handler (Integration - depends on #4, #11)

**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**
```typescript
getInfoPanelContent(
  _context: InfoPanelContext,
  _state: CombatState,
  _encounter: CombatEncounter
): PanelContent | null {
  // Determine which panel to show based on state
  // If we have a targeted unit, show their info
  // Otherwise, show the active unit's action menu

  const targetedUnit = this.currentStrategy?.getTargetedUnit();

  // If targeting a different unit than active, show that unit's info
  if (targetedUnit && targetedUnit !== this.activeUnit) {
    // ... existing UnitInfoContent logic ...
  }

  // Show active unit's action menu
  if (this.activeUnit) {
    // Get current strategy mode for active button highlighting
    const strategyMode = this.currentStrategy?.getMode() ?? 'normal';
    const activeAction = strategyMode === 'moveSelection' ? 'move' : null;

    // Create or update actions menu
    if (!this.actionsMenuContent) {
      this.actionsMenuContent = new ActionsMenuContent(
        {
          title: 'Actions',
          titleColor: this.getUnitNameColor(),
          padding: 1,
          lineSpacing: 8
        },
        this.activeUnit
      );
    }

    // Update menu with current state
    this.actionsMenuContent.updateUnit(
      this.activeUnit,
      this.unitHasMoved,
      activeAction
    );

    return this.actionsMenuContent;
  }

  return null;
}
```

**Rationale:**
- Passes hasMoved state to menu for button disable logic
- Passes active action for green highlighting
- Menu updates every frame (reflects current state)
- No caching issues (state always fresh)

---

## Testing Plan

### Visual Tests
- [ ] Move button turns green when clicked (active mode)
- [ ] Move button turns white when clicked again (cancel)
- [ ] Movement range tiles are green in move mode
- [ ] Movement range tiles are yellow in normal mode
- [ ] Hovering valid tile shows yellow path preview
- [ ] Path preview includes destination tile (all yellow)
- [ ] Hovering different tiles updates path instantly
- [ ] Hovering invalid tiles shows no path
- [ ] All highlights disappear when tile clicked (before animation)
- [ ] Unit animates smoothly along path
- [ ] Active unit cursor remains visible during/after movement
- [ ] Movement range disappears after move complete

### Behavioral Tests
- [ ] Clicking Move button enters move mode
- [ ] Clicking Move button again exits move mode (cancel)
- [ ] Clicking valid tile moves unit to that tile
- [ ] Clicking invalid tile does nothing (stays in move mode)
- [ ] Unit cannot move through enemy units
- [ ] Unit can move through friendly units
- [ ] Unit cannot end movement on occupied tile
- [ ] Movement animation follows shortest orthogonal path
- [ ] Unit position updates correctly after animation
- [ ] hasMoved flag prevents second move
- [ ] Move button disabled after moving
- [ ] Delay button disabled after moving
- [ ] Attack button enabled after moving
- [ ] Ability buttons enabled after moving
- [ ] End Turn button enabled after moving
- [ ] Selecting different unit exits move mode
- [ ] Selecting different action exits move mode
- [ ] Unit remains in unit-turn phase after moving (no auto-advance)

### State Management Tests
- [ ] hasMoved resets when new unit's turn starts
- [ ] Position serializes correctly after movement
- [ ] hasMoved does NOT serialize (turn-specific)
- [ ] Movement path cache clears on mode exit
- [ ] Hovered path clears on mode exit
- [ ] Strategy mode resets on turn end

### Performance Tests
- [ ] Path caching happens once per mode entry (not per hover)
- [ ] Hover updates do NOT cause synchronous renderFrame()
- [ ] Movement animation runs at 60fps
- [ ] No frame drops during movement
- [ ] Path calculation completes in <16ms (1 frame budget)

### Edge Cases
- [ ] Movement range of 0 (no valid tiles)
- [ ] Movement range includes starting position (doesn't move)
- [ ] Path blocked by enemies (no valid path)
- [ ] Path wraps around obstacles correctly
- [ ] Multiple units with same name move independently
- [ ] Cancel works mid-hover (path preview clears)

## Implementation Order

1. **Foundation** (independent tasks):
   - Task #1: Add ACTIVE_COLOR constant
   - Task #2: Create MovementPathfinder utility
   - Task #3: Add movement speed constant
   - Task #4: Add hasMoved tracking to phase handler

2. **Strategy Layer** (depends on Foundation):
   - Task #5: Extend TurnStrategy interface
   - Task #6: Implement mode state machine in PlayerTurnStrategy

3. **Rendering Layer** (depends on Strategy):
   - Task #7: Update tile range panel rendering

4. **Animation Layer** (depends on Foundation):
   - Task #8: Create UnitMovementSequence
   - Task #9: Integrate animation with phase handler

5. **State Layer** (depends on Animation):
   - Task #10: Add moveUnit method to manifest

6. **Menu Integration** (depends on Foundation, Strategy):
   - Task #11: Update ActionsMenuContent for dynamic states
   - Task #12: Wire menu state to phase handler

7. **Testing** (depends on all above):
   - Run full test suite from Testing Plan
   - Fix bugs and edge cases
   - Performance profiling

## Notes & Decisions

### Decision: Path Caching Strategy
- **Choice:** Pre-calculate all paths when entering move mode
- **Alternative:** Calculate path on-demand during each hover
- **Rationale:** Hover events fire frequently (100+ times/sec). BFS is O(tiles × movement), negligible for small maps but wasteful to repeat. Caching trades ~1KB memory for consistent hover performance.
- **Tradeoff:** Slightly slower mode entry (<16ms for 32×18 map) for instant hover feedback

### Decision: Animation Integration Pattern
- **Choice:** Use CinematicSequence interface for movement animation
- **Alternative:** Handle animation directly in phase handler update loop
- **Rationale:** CinematicSequence is the established pattern for multi-frame animations. Provides clean separation, reusable interface, consistent timing logic.
- **Tradeoff:** Extra file and indirection, but worth it for maintainability

### Decision: hasMoved Storage Location
- **Choice:** Store in UnitTurnPhaseHandler instance variable
- **Alternative:** Store in CombatState, CombatUnit, or manifest
- **Rationale:** Turn-specific state that should not persist. Phase handlers are recreated on phase re-entry, providing automatic reset. No serialization complexity.
- **Tradeoff:** Cannot access hasMoved from other phases (acceptable - only relevant during unit's turn)

### Decision: Movement Range Color Override
- **Choice:** Strategy returns color override, phase handler applies
- **Alternative:** Phase handler checks strategy mode and hardcodes colors
- **Rationale:** Strategy owns mode state, should control visual representation. Extensible for future modes (attack range = red, ability range = blue).
- **Tradeoff:** Additional method in interface, but cleaner separation of concerns

### Decision: Path Visualization Layer
- **Choice:** Render path in phase handler render() (before units)
- **Alternative:** Create separate PathOverlayPanel
- **Rationale:** Simple implementation for MVP. If we add more overlay types (attack ranges, AOE indicators), refactor to separate panel.
- **Tradeoff:** Phase handler has more rendering logic, but avoids premature abstraction

### Decision: Cancel via Move Button Toggle
- **Choice:** Clicking Move again exits mode (no separate Cancel button)
- **Alternative:** Add Cancel button to menu during move mode
- **Rationale:** Simpler UX, fewer clicks. Move button color change (green) provides clear visual feedback that mode is active. Clicking again is intuitive cancel gesture.
- **Tradeoff:** User might not realize clicking Move again cancels (can add tooltip/helper text)

### Guidelines Compliance

✅ **Rendering:**
- Uses SpriteRenderer exclusively (renderTintedSprite pattern)
- Rounds all coordinates with Math.floor()
- Uses cached tinting buffer (no per-frame canvas creation)
- Disables image smoothing

✅ **State Management:**
- Caches stateful components (ActionsMenuContent, UnitInfoContent)
- Uses instance variables for turn-specific state (hasMoved)
- Immutable state updates ({ ...state, field: value })
- Captures and applies phase handler return values

✅ **Event Handling:**
- No synchronous renderFrame() in mouse move handlers
- Hover updates state only (animation loop renders)
- Click handlers update state and return PhaseEventResult

✅ **Performance:**
- Path caching prevents redundant BFS calculations
- Tinting buffer cached as instance variable
- WeakMap for unit-to-path associations (garbage collection friendly)
- Viewport-aware rendering (only visible tiles)

✅ **Architecture:**
- Extends strategy pattern consistently
- Uses discriminated unions for TurnAction types
- Implements CinematicSequence interface
- Follows phase handler render pipeline (render before units, renderUI after)

## Performance Considerations

**Path Calculation Complexity:**
- BFS pathfinding: O(tiles × movement)
- Worst case: 576 tiles × 6 movement = 3,456 operations
- Typical case: ~100-200 operations (small connected regions)
- Time budget: <1ms per path on modern hardware
- Total cache time: ~10-50ms for all paths (negligible)

**Memory Usage:**
- Path cache: ~20-30 paths × 4-6 positions × 8 bytes = ~1-2KB
- Movement sequence: ~200 bytes (single instance)
- hasMoved flag: 1 byte
- Total overhead: <5KB per turn (negligible)

**Rendering Performance:**
- Movement range: 1-30 tiles × 2 draw calls = 2-60 draw ops
- Path preview: 1-6 tiles × 2 draw calls = 2-12 draw ops
- Animation: 1 unit sprite update per frame = 60 updates/sec
- Total: <100 draw operations per frame (well within budget)

**Animation Performance:**
- Target: 60fps (16.67ms per frame)
- Update logic: <0.1ms (simple arithmetic)
- Render logic: Reuses existing unit rendering
- No off-screen canvas creation per frame
- Expected: Smooth 60fps movement

## Success Criteria

✅ **Visual Specifications Met:**
- All colors match requirements (green range, yellow path, green button)
- Movement animation at configured speed (0.2s per tile)
- Smooth interpolation between tiles
- Highlights appear/disappear at correct times

✅ **Behavioral Specifications Met:**
- Move mode toggles correctly (click Move to enter/exit)
- Path preview updates on hover
- Valid tile click moves unit along previewed path
- hasMoved prevents double-move
- Menu buttons disabled/enabled correctly
- No auto-advance after movement

✅ **Technical Requirements Met:**
- hasMoved stored in phase handler (resets correctly)
- Path caching works (no redundant calculations)
- Strategy mode extensible (string union type)
- Position serializes after movement

✅ **Testing Complete:**
- All test cases pass (visual, behavioral, state, performance, edge cases)
- No regressions in existing features
- Performance within acceptable limits (60fps)

✅ **Guidelines Compliance:**
- 100% compliance with GeneralGuidelines.md
- All patterns followed correctly
- No anti-patterns introduced
- Code is maintainable and documented

✅ **Build Success:**
- TypeScript compiles with no errors
- No linter warnings
- Tests pass (if applicable)
- Ready for code review

---

**End of Implementation Plan**

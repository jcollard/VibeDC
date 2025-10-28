import { PhaseBase } from './PhaseBase';
import type {
  CombatPhaseHandler,
  PhaseEventResult,
  PhaseRenderContext,
  MouseEventContext,
  PhaseSprites,
  InfoPanelContext
} from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { CombatUnit } from './CombatUnit';
import type { TopPanelRenderer } from './managers/TopPanelRenderer';
import type { PanelContent, PanelRegion, PanelClickResult } from './managers/panels/PanelContent';
import type { UnitPlacement } from './CombatUnitManifest';
import { TurnOrderRenderer } from './managers/renderers/TurnOrderRenderer';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * Multiplier for action timer fill rate
 * Formula: actionTimer += speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER (per tick)
 * Higher values = faster combat pacing
 */
const ACTION_TIMER_MULTIPLIER = 1;

/**
 * Size of each discrete tick in the action timer system
 * Timers advance in whole tick increments, not fractional amounts
 */
const TICK_SIZE = 1;

/**
 * Time (in seconds) to display each discrete tick during animation
 * Default: 0.5s per tick (2 ticks per second)
 */
const TICK_DISPLAY_DURATION = 0.5;

/**
 * Time (in seconds) for units to slide to new positions when order changes
 * This value is configured in TurnOrderRenderer.slideAnimationDuration
 * Should be less than TICK_DISPLAY_DURATION for smooth transitions
 * Default: 0.25s (half of tick duration)
 */

/**
 * Snapshot of unit timers and turn order at a specific tick
 */
interface TickSnapshot {
  tickNumber: number;                      // Absolute tick number (from CombatState.tickCount)
  unitTimers: Map<CombatUnit, number>;    // Unit -> AT value at this tick
  turnOrder: CombatUnit[];                // Sorted turn order at this tick
}

/**
 * Placeholder info panel content for action timer phase
 *
 * STUB: Will be replaced with:
 * - Action menu (Attack, Ability, Move, Wait, End Turn)
 * - Action outcome percentages
 * - Target selection UI
 * - Status effect indicators
 */
class ActionTimerInfoPanelContent implements PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    // Render placeholder text centered in panel
    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;

    FontAtlasRenderer.renderText(
      ctx,
      'Action Timer Phase',
      centerX,
      centerY - 10,
      fontId,
      fontAtlasImage,
      1,
      'center',
      '#ffffff'
    );

    FontAtlasRenderer.renderText(
      ctx,
      'Turn system active',
      centerX,
      centerY + 10,
      fontId,
      fontAtlasImage,
      1,
      'center',
      '#888888'
    );
  }

  // No interaction for stub
  handleClick?(_relativeX: number, _relativeY: number): PanelClickResult {
    return { type: 'button' }; // Placeholder - no actual button
  }

  handleHover?(_relativeX: number, _relativeY: number): unknown {
    return null;
  }
}

/**
 * Action timer phase handler - manages turn order via action timers
 *
 * Current functionality:
 * - Simulates discrete ticks until first unit reaches 100 AT
 * - Each tick increments: actionTimer += speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER
 * - Ticks are whole number increments (no fractional ticks)
 * - Animates all units' AT values from current to final state over 1 second
 * - Shows turn order sorted by predicted turn order (who acts next)
 * - Dynamically re-sorts units during animation
 * - Displays battlefield (map + units)
 * - Transitions to unit-turn phase when animation completes
 * - Victory/defeat condition checking
 *
 * Future functionality:
 * - Speed modifiers from status effects
 * - Time stop effects
 * - Timer overflow handling (carry over to next turn)
 * - Configurable ACTION_TIMER_MULTIPLIER and TICK_SIZE
 */
export class ActionTimerPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // Cached panel content (per GeneralGuidelines.md lines 103-110)
  private infoPanelContent: ActionTimerInfoPanelContent | null = null;

  // Cached turn order renderer (maintains scroll state across renders)
  private turnOrderRenderer: TurnOrderRenderer | null = null;

  // Flag to track if we've already calculated the turn
  private turnCalculated: boolean = false;

  // Animation state - tick snapshots
  private tickSnapshots: TickSnapshot[] = []; // All ticks from start to target
  private currentTickIndex: number = 0;       // Index into tickSnapshots array
  private animationElapsedTime: number = 0;   // Total elapsed time during animation
  private isAnimating: boolean = false;

  constructor() {
    super();
    console.log('[ActionTimerPhaseHandler] Initialized');
  }

  /**
   * Get sprites required for action timer phase rendering
   * @returns Sprite IDs needed for map, units, and UI
   */
  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    // STUB: Return empty set for now
    // Future: Add map tiles, unit sprites, UI sprites
    const spriteIds = new Set<string>();

    return { spriteIds };
  }

  /**
   * Render action timer phase overlays (before units are rendered)
   *
   * STUB: Currently no overlays needed
   * Future: Movement/attack ranges, targeting indicators, status effects
   */
  render(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // Action timer phase doesn't need pre-unit overlays (yet)
    // The map and units are rendered by CombatRenderer
    // UI panels are rendered by CombatLayoutManager
  }

  /**
   * Render action timer phase UI elements (after units are rendered)
   *
   * STUB: Currently no UI overlays needed
   * Future: Action menus, buttons, dialogs
   */
  renderUI(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // Action timer phase doesn't need post-unit UI overlays (yet)
    // UI panels are rendered by CombatLayoutManager
  }

  /**
   * Update action timer logic - calculate who goes next and animate AT values
   */
  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // Check victory/defeat conditions first
    if (encounter.isVictory(state)) {
      console.log('[ActionTimerPhaseHandler] Victory conditions met');
      return {
        ...state,
        phase: 'victory'
      };
    }

    if (encounter.isDefeat(state)) {
      console.log('[ActionTimerPhaseHandler] Defeat conditions met');
      return {
        ...state,
        phase: 'defeat'
      };
    }

    // Only calculate once when entering this phase
    if (!this.turnCalculated) {
      this.startAnimation(state.unitManifest, state.tickCount ?? 0);
      this.turnCalculated = true;
    }

    // Animate through discrete ticks
    if (this.isAnimating) {
      this.animationElapsedTime += deltaTime;

      // Calculate which tick we should be displaying
      const targetTickIndex = Math.floor(this.animationElapsedTime / TICK_DISPLAY_DURATION);

      // If we've moved to a new tick
      if (targetTickIndex > this.currentTickIndex && targetTickIndex < this.tickSnapshots.length) {
        this.currentTickIndex = targetTickIndex;
        const snapshot = this.tickSnapshots[this.currentTickIndex];

        // Update all unit AT values (discrete update, no interpolation)
        for (const [unit, timerValue] of snapshot.unitTimers.entries()) {
          (unit as any)._actionTimer = timerValue;
        }

        // Check if turn order changed
        if (this.turnOrderChanged(snapshot.turnOrder)) {
          // Trigger slide animation in TurnOrderRenderer (Task 5)
          this.startPositionSlideAnimation(snapshot.turnOrder);
        }

        // Update displayed turn order
        if (this.turnOrderRenderer) {
          this.turnOrderRenderer.updateUnits(snapshot.turnOrder);
        }
      }

      // Check if animation complete
      if (this.currentTickIndex >= this.tickSnapshots.length - 1) {
        // Final tick reached - check if slide animation is still playing
        const slideInProgress = this.turnOrderRenderer?.updateSlideAnimation(deltaTime);

        if (!slideInProgress) {
          // Slide complete (or no slide) - transition to unit-turn phase
          this.isAnimating = false;

          // Apply final tick values
          const finalSnapshot = this.tickSnapshots[this.tickSnapshots.length - 1];
          for (const [unit, timerValue] of finalSnapshot.unitTimers.entries()) {
            (unit as any)._actionTimer = timerValue;
          }

          // Find the ready unit
          const readyUnit = this.getReadyUnit(state.unitManifest);

          if (readyUnit) {
            console.log(`[ActionTimerPhaseHandler] ${readyUnit.unit.name} is ready to act (timer: ${readyUnit.unit.actionTimer.toFixed(2)})`);

            // Transition to unit-turn phase
            return {
              ...state,
              phase: 'unit-turn',
              tickCount: finalSnapshot.tickNumber
            };
          }
        }
        // If slide still in progress, stay in this phase and continue animating
      }
    }

    // Animation in progress or waiting
    return state;
  }

  /**
   * Start the animation by simulating discrete ticks until a unit reaches 100
   * Creates tick snapshots for each discrete tick with AT values and turn order
   * Only simulates ticks if no units are already ready (AT >= 100)
   * @param manifest Current unit manifest
   * @param currentTickCount Current tick count from CombatState
   */
  private startAnimation(
    manifest: import('./CombatUnitManifest').CombatUnitManifest,
    currentTickCount: number
  ): void {
    const allUnits = manifest.getAllUnits();

    // Clear previous animation state
    this.tickSnapshots = [];
    this.currentTickIndex = 0;
    this.animationElapsedTime = 0;

    // Check if any unit is already ready (AT >= 100)
    const alreadyReady = allUnits.some(p => p.unit.actionTimer >= 100);

    // If someone is already ready, create single snapshot with current state
    if (alreadyReady) {
      console.log('[ActionTimerPhaseHandler] Unit already ready (AT >= 100), skipping tick simulation');

      // Create single snapshot with current values
      const unitTimers = new Map<CombatUnit, number>();
      for (const placement of allUnits) {
        unitTimers.set(placement.unit, placement.unit.actionTimer);
      }

      const turnOrder = this.calculateTurnOrder(allUnits.map(p => p.unit), unitTimers);

      this.tickSnapshots.push({
        tickNumber: currentTickCount,
        unitTimers,
        turnOrder
      });

      // Start animation (will complete instantly)
      this.isAnimating = true;
      return;
    }

    // Simulate discrete ticks until a unit reaches 100
    let tickCount = 0;
    const maxTicks = 10000; // Safety limit to prevent infinite loop
    let foundReadyUnit = false;

    // Create temporary working copies of timer values
    const workingTimers = new Map<CombatUnit, number>();
    for (const placement of allUnits) {
      workingTimers.set(placement.unit, placement.unit.actionTimer);
    }

    // Create initial snapshot (tick 0)
    const initialTurnOrder = this.calculateTurnOrder(allUnits.map(p => p.unit), workingTimers);
    this.tickSnapshots.push({
      tickNumber: currentTickCount,
      unitTimers: new Map(workingTimers),
      turnOrder: initialTurnOrder
    });

    // Tick until someone reaches 100
    while (!foundReadyUnit && tickCount < maxTicks) {
      tickCount++;

      // Increment all units by one discrete tick
      for (const placement of allUnits) {
        const unit = placement.unit;
        const currentTimer = workingTimers.get(unit) || 0;
        const increment = unit.speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER;
        const newTimer = currentTimer + increment;
        workingTimers.set(unit, newTimer);

        // Check if this unit reached 100
        if (newTimer >= 100) {
          foundReadyUnit = true;
        }
      }

      // Create snapshot for this tick
      const turnOrder = this.calculateTurnOrder(allUnits.map(p => p.unit), workingTimers);
      this.tickSnapshots.push({
        tickNumber: currentTickCount + tickCount,
        unitTimers: new Map(workingTimers),
        turnOrder
      });
    }

    if (!foundReadyUnit) {
      console.warn('[ActionTimerPhaseHandler] No unit reached 100 after maximum ticks');
      return;
    }

    console.log(`[ActionTimerPhaseHandler] Simulated ${tickCount} discrete ticks, created ${this.tickSnapshots.length} snapshots (${currentTickCount} -> ${currentTickCount + tickCount})`);

    // Start animation
    this.isAnimating = true;
  }

  /**
   * Calculate turn order based on time to reach 100 AT
   * Sorts by time to ready (ascending), then alphabetically by name
   * @param units All units in combat
   * @param timerValues Map of unit to current AT value
   * @returns Sorted array of units in turn order
   */
  private calculateTurnOrder(units: CombatUnit[], timerValues: Map<CombatUnit, number>): CombatUnit[] {
    const unitsWithTime = units.map(unit => {
      const currentTimer = timerValues.get(unit) || unit.actionTimer;
      const timeToReady = unit.speed > 0
        ? (100 - currentTimer) / unit.speed
        : Infinity;

      return { unit, timeToReady };
    });

    // Sort by time to ready (ascending - soonest first), then alphabetically
    unitsWithTime.sort((a, b) => {
      if (a.timeToReady !== b.timeToReady) {
        return a.timeToReady - b.timeToReady;
      }
      return a.unit.name.localeCompare(b.unit.name);
    });

    return unitsWithTime.map(item => item.unit);
  }

  /**
   * Check if turn order changed compared to previous tick
   * @param newOrder New turn order to compare
   * @returns True if order changed, false otherwise
   */
  private turnOrderChanged(newOrder: CombatUnit[]): boolean {
    if (this.currentTickIndex === 0) return false; // First tick, no previous order
    const previousSnapshot = this.tickSnapshots[this.currentTickIndex - 1];
    const previousOrder = previousSnapshot.turnOrder;

    // Compare arrays
    if (previousOrder.length !== newOrder.length) return true;
    for (let i = 0; i < previousOrder.length; i++) {
      if (previousOrder[i] !== newOrder[i]) return true;
    }
    return false;
  }

  /**
   * Start position slide animation when turn order changes
   * Delegates to TurnOrderRenderer (Task 5)
   * @param newOrder New turn order after change
   */
  private startPositionSlideAnimation(newOrder: CombatUnit[]): void {
    if (this.turnOrderRenderer) {
      // Region will be cached by TurnOrderRenderer from last render call
      this.turnOrderRenderer.startSlideAnimation(newOrder);
    }
  }

  /**
   * Find the unit with highest action timer if any are ready (>= 100)
   * Tiebreaker: alphabetical by name
   * @param manifest Current unit manifest
   * @returns Ready unit placement, or null if none ready
   */
  private getReadyUnit(manifest: import('./CombatUnitManifest').CombatUnitManifest): UnitPlacement | null {
    const allUnits = manifest.getAllUnits();

    // Filter units with actionTimer >= 100
    const readyUnits = allUnits.filter(p => p.unit.actionTimer >= 100);

    if (readyUnits.length === 0) {
      return null;
    }

    // Sort by actionTimer (descending), then by name (ascending)
    readyUnits.sort((a, b) => {
      // First by timer (highest first)
      if (b.unit.actionTimer !== a.unit.actionTimer) {
        return b.unit.actionTimer - a.unit.actionTimer;
      }
      // Then by name (alphabetical)
      return a.unit.name.localeCompare(b.unit.name);
    });

    return readyUnits[0];
  }

  /**
   * Get turn order renderer for top panel
   * Shows units sorted by predicted turn order (who will reach 100 first)
   * Caches renderer instance to maintain scroll state
   * Uses turn order from current tick snapshot if available
   */
  getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
    // Determine which turn order to use
    let sortedUnits: CombatUnit[];
    let currentTickNumber: number;

    if (this.tickSnapshots.length > 0 && this.currentTickIndex < this.tickSnapshots.length) {
      // Use turn order from current snapshot
      const snapshot = this.tickSnapshots[this.currentTickIndex];
      sortedUnits = snapshot.turnOrder;
      currentTickNumber = snapshot.tickNumber;
    } else {
      // No snapshots yet, calculate turn order manually
      const units = state.unitManifest.getAllUnits().map(placement => placement.unit);
      const unitTimers = new Map<CombatUnit, number>();
      for (const unit of units) {
        unitTimers.set(unit, unit.actionTimer);
      }
      sortedUnits = this.calculateTurnOrder(units, unitTimers);
      currentTickNumber = state.tickCount || 0;
    }

    // Create or update cached renderer (maintains scroll state)
    if (!this.turnOrderRenderer) {
      this.turnOrderRenderer = new TurnOrderRenderer(sortedUnits, currentTickNumber);
    } else {
      // Update units in existing renderer (preserves scroll offset)
      // Note: updateUnits is called in updatePhase when tick changes
      // This ensures the renderer is always up to date
      this.turnOrderRenderer.updateUnits(sortedUnits);
      // Update tick count (Task 7)
      this.turnOrderRenderer.updateTickCount(currentTickNumber);
    }

    return this.turnOrderRenderer;
  }

  /**
   * Get info panel content
   * Returns placeholder content for stub
   */
  getInfoPanelContent(
    _context: InfoPanelContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PanelContent | null {
    // Cache content instance (per GeneralGuidelines.md lines 103-110)
    if (!this.infoPanelContent) {
      this.infoPanelContent = new ActionTimerInfoPanelContent();
    }

    return this.infoPanelContent;
  }

  /**
   * Handle map tile clicks
   *
   * STUB: Logs clicks to combat log
   * Future: Movement selection, action targeting, etc.
   */
  handleMapClick(
    context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    // STUB: Log click for debugging
    console.log(`[ActionTimerPhaseHandler] Map clicked at tile (${context.tileX}, ${context.tileY})`);

    // Future: Handle movement selection, action targeting, etc.

    return {
      handled: true,
      logMessage: `Clicked tile (${context.tileX}, ${context.tileY})` // Add to combat log
    };
  }

  /**
   * Handle mouse movement over map
   *
   * STUB: No hover indicators yet
   * Future: Show movement range, attack range, unit info tooltips
   */
  handleMouseMove(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    // STUB: No hover indicators yet
    // Future: Show movement range, attack range, unit info tooltips

    return {
      handled: false // Let default hover behavior continue
    };
  }
}

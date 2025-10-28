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

  // Animation state
  private animationStartTime: number = 0;
  private animationDuration: number = 1.0; // 1 second animation
  private startTimers: WeakMap<CombatUnit, number> = new WeakMap(); // unit instance -> starting AT value
  private targetTimers: WeakMap<CombatUnit, number> = new WeakMap(); // unit instance -> target AT value
  private isAnimating: boolean = false;

  // Tick counter - number of discrete ticks simulated to reach ready unit
  private tickCount: number = 0;
  private startTickCount: number = 0; // Tick count at start of animation
  private targetTickCount: number = 0; // Tick count at end of animation

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
      this.startAnimation(state.unitManifest);
      this.turnCalculated = true;
    }

    // Animate the timers
    if (this.isAnimating) {
      this.animationStartTime += deltaTime;
      const progress = Math.min(this.animationStartTime / this.animationDuration, 1.0);

      // Animate tick count
      this.tickCount = Math.floor(this.startTickCount + (this.targetTickCount - this.startTickCount) * progress);

      // Update all units' timers based on animation progress
      const allUnits = state.unitManifest.getAllUnits();
      for (const placement of allUnits) {
        const unit = placement.unit;
        const startValue = this.startTimers.get(unit) || 0;
        const targetValue = this.targetTimers.get(unit) || 0;
        const currentValue = startValue + (targetValue - startValue) * progress;

        // Direct mutation of private field
        (unit as any)._actionTimer = currentValue;
      }

      // Check if animation is complete
      if (progress >= 1.0) {
        this.isAnimating = false;
        // Ensure tick count is set to final value
        this.tickCount = this.targetTickCount;

        // Find the ready unit
        const readyUnit = this.getReadyUnit(state.unitManifest);

        if (readyUnit) {
          console.log(`[ActionTimerPhaseHandler] ${readyUnit.unit.name} is ready to act (timer: ${readyUnit.unit.actionTimer.toFixed(2)})`);

          // Transition to unit-turn phase, passing tick count in state
          return {
            ...state,
            phase: 'unit-turn',
            tickCount: this.tickCount
          };
        }
      }
    }

    // Animation in progress or waiting
    return state;
  }

  /**
   * Start the animation by simulating discrete ticks until a unit reaches 100
   * Stores start/target values for animation
   * Only simulates ticks if no units are already ready (AT >= 100)
   * @param manifest Current unit manifest
   */
  private startAnimation(
    manifest: import('./CombatUnitManifest').CombatUnitManifest
  ): void {
    const allUnits = manifest.getAllUnits();

    // Store starting tick count for animation
    this.startTickCount = this.tickCount;

    // Store starting values
    for (const placement of allUnits) {
      const unit = placement.unit;
      this.startTimers.set(unit, unit.actionTimer);
    }

    // Check if any unit is already ready (AT >= 100)
    const alreadyReady = allUnits.some(p => p.unit.actionTimer >= 100);

    // If someone is already ready, don't simulate any ticks
    if (alreadyReady) {
      console.log('[ActionTimerPhaseHandler] Unit already ready (AT >= 100), skipping tick simulation');
      // Target values are same as start values (no change)
      for (const placement of allUnits) {
        const unit = placement.unit;
        this.targetTimers.set(unit, unit.actionTimer);
      }
      this.targetTickCount = this.startTickCount; // No ticks simulated

      // Start animation (instant completion since progress will be 1.0 immediately)
      this.animationStartTime = 0;
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
    }

    if (!foundReadyUnit) {
      console.warn('[ActionTimerPhaseHandler] No unit reached 100 after maximum ticks');
      return;
    }

    // Store target values from simulation
    for (const placement of allUnits) {
      const unit = placement.unit;
      const targetValue = workingTimers.get(unit) || unit.actionTimer;
      this.targetTimers.set(unit, targetValue);
    }

    // Store target tick count for animation
    this.targetTickCount = this.startTickCount + tickCount;

    console.log(`[ActionTimerPhaseHandler] Simulated ${tickCount} discrete ticks to reach first ready unit (${this.startTickCount} -> ${this.targetTickCount})`);

    // Start animation
    this.animationStartTime = 0;
    this.isAnimating = true;
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
   */
  getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
    // Get all units
    const units = state.unitManifest.getAllUnits().map(placement => placement.unit);

    // Calculate time until each unit reaches 100 action timer
    const unitsWithTime = units.map(unit => {
      const timeToReady = unit.speed > 0
        ? (100 - unit.actionTimer) / unit.speed
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

    // Extract sorted units
    const sortedUnits = unitsWithTime.map(item => item.unit);

    // Create or update cached renderer (maintains scroll state)
    if (!this.turnOrderRenderer) {
      this.turnOrderRenderer = new TurnOrderRenderer(sortedUnits, state.tickCount || this.tickCount || 0);
    } else {
      // Update units in existing renderer (preserves scroll offset)
      this.turnOrderRenderer.updateUnits(sortedUnits);
      // Update tick count for animation
      this.turnOrderRenderer.updateTickCount(state.tickCount || this.tickCount || 0);
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

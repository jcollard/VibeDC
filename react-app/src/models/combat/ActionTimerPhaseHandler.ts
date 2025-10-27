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
import type { TopPanelRenderer } from './managers/TopPanelRenderer';
import type { PanelContent, PanelRegion, PanelClickResult } from './managers/panels/PanelContent';
import type { UnitPlacement } from './CombatUnitManifest';
import { TurnOrderRenderer } from './managers/renderers/TurnOrderRenderer';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * Multiplier for action timer fill rate
 * Formula: actionTimer += speed * deltaTime * ACTION_TIMER_MULTIPLIER
 * Higher values = faster combat pacing
 */
const ACTION_TIMER_MULTIPLIER = 1;

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
 * - Displays battlefield (map + units)
 * - Calculates who will reach 100 first
 * - Sets all AT values to their state at that moment
 * - Shows turn order sorted by predicted turn order (with final AT values displayed)
 * - Transitions to unit-turn phase
 * - Victory/defeat condition checking
 *
 * Future functionality:
 * - Speed modifiers from status effects
 * - Time stop effects
 * - Timer overflow handling (carry over to next turn)
 * - Configurable ACTION_TIMER_MULTIPLIER
 */
export class ActionTimerPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // Cached panel content (per GeneralGuidelines.md lines 103-110)
  private infoPanelContent: ActionTimerInfoPanelContent | null = null;

  // Flag to track if we've already calculated the turn
  private turnCalculated: boolean = false;

  // Animation state
  private animationStartTime: number = 0;
  private animationDuration: number = 1.0; // 1 second animation
  private startTimers: Map<string, number> = new Map(); // unit name -> starting AT value
  private targetTimers: Map<string, number> = new Map(); // unit name -> target AT value
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
      this.startAnimation(state.unitManifest);
      this.turnCalculated = true;
    }

    // Animate the timers
    if (this.isAnimating) {
      this.animationStartTime += deltaTime;
      const progress = Math.min(this.animationStartTime / this.animationDuration, 1.0);

      // Update all units' timers based on animation progress
      const allUnits = state.unitManifest.getAllUnits();
      for (const placement of allUnits) {
        const unit = placement.unit;
        const startValue = this.startTimers.get(unit.name) || 0;
        const targetValue = this.targetTimers.get(unit.name) || 0;
        const currentValue = startValue + (targetValue - startValue) * progress;

        // Direct mutation of private field
        (unit as any)._actionTimer = currentValue;
      }

      // Check if animation is complete
      if (progress >= 1.0) {
        this.isAnimating = false;

        // Find the ready unit
        const readyUnit = this.getReadyUnit(state.unitManifest);

        if (readyUnit) {
          console.log(`[ActionTimerPhaseHandler] ${readyUnit.unit.name} is ready to act (timer: ${readyUnit.unit.actionTimer.toFixed(2)})`);

          // Transition to unit-turn phase
          return {
            ...state,
            phase: 'unit-turn'
          };
        }
      }
    }

    // Animation in progress or waiting
    return state;
  }

  /**
   * Start the animation by calculating final AT values and storing start/target values
   * @param manifest Current unit manifest
   */
  private startAnimation(
    manifest: import('./CombatUnitManifest').CombatUnitManifest
  ): void {
    const allUnits = manifest.getAllUnits();

    // Store starting values
    this.startTimers.clear();
    this.targetTimers.clear();

    for (const placement of allUnits) {
      const unit = placement.unit;
      this.startTimers.set(unit.name, unit.actionTimer);
    }

    // Calculate time until first unit reaches 100
    let minTimeToReady = Infinity;

    for (const placement of allUnits) {
      const unit = placement.unit;
      if (unit.speed > 0) {
        const timeToReady = (100 - unit.actionTimer) / (unit.speed * ACTION_TIMER_MULTIPLIER);
        if (timeToReady < minTimeToReady) {
          minTimeToReady = timeToReady;
        }
      }
    }

    // If no unit can reach 100 (all have speed 0), do nothing
    if (minTimeToReady === Infinity) {
      console.warn('[ActionTimerPhaseHandler] No units have speed > 0, cannot advance timers');
      return;
    }

    // Calculate target values for all units
    for (const placement of allUnits) {
      const unit = placement.unit;
      const increment = unit.speed * minTimeToReady * ACTION_TIMER_MULTIPLIER;
      const targetValue = unit.actionTimer + increment;
      this.targetTimers.set(unit.name, targetValue);
    }

    console.log(`[ActionTimerPhaseHandler] Starting animation to advance timers by ${minTimeToReady.toFixed(2)} seconds`);

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
   * Shows units sorted by predicted turn order (who will reach 100 first), limited to 10 units
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

    // Limit to 10 units for display
    const displayUnits = sortedUnits.slice(0, 10);

    // Create new renderer each time with current units
    // (TurnOrderRenderer requires units in constructor, can't cache)
    return new TurnOrderRenderer(displayUnits);
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

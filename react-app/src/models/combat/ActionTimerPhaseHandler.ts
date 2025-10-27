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
 * - Increments action timers based on speed
 * - Shows turn order sorted by action timer (with values displayed)
 * - Detects when unit reaches 100 and transitions to unit-turn phase
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
   * Update action timer logic - increment timers and check for ready units
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

    // Increment all units' action timers
    const updatedManifest = this.incrementActionTimers(state.unitManifest, deltaTime);

    // Check if any unit is ready to act (actionTimer >= 100)
    const readyUnit = this.getReadyUnit(updatedManifest);

    if (readyUnit) {
      // Transition to unit-turn phase
      console.log(`[ActionTimerPhaseHandler] ${readyUnit.unit.name} is ready to act (timer: ${readyUnit.unit.actionTimer.toFixed(2)})`);

      return {
        ...state,
        unitManifest: updatedManifest,
        phase: 'unit-turn'
      };
    }

    // No unit ready, return state with updated manifest
    // Note: We always return state even if manifest didn't change to avoid triggering re-renders
    return state;
  }

  /**
   * Increment all units' action timers based on their speed
   * @param manifest Current unit manifest
   * @param deltaTime Time since last frame (seconds)
   * @returns Same manifest (units mutated for performance)
   */
  private incrementActionTimers(
    manifest: import('./CombatUnitManifest').CombatUnitManifest,
    deltaTime: number
  ): import('./CombatUnitManifest').CombatUnitManifest {
    // Get all unit placements
    const allUnits = manifest.getAllUnits();

    // Cap deltaTime at 1 second to prevent large jumps
    const cappedDeltaTime = Math.min(deltaTime, 1);

    // HACK: Direct mutation (not ideal, but matches current architecture)
    // TODO: Refactor to immutable updates when unit state management improves
    for (const placement of allUnits) {
      const increment = placement.unit.speed * cappedDeltaTime * ACTION_TIMER_MULTIPLIER;

      // Direct mutation of private field
      (placement.unit as any)._actionTimer += increment;
    }

    return manifest;
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
   * Shows units sorted by action timer (highest first), limited to 10 units
   */
  getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
    // Get all units and sort by actionTimer (highest first)
    const units = state.unitManifest.getAllUnits().map(placement => placement.unit);
    const sortedUnits = units.sort((a, b) => b.actionTimer - a.actionTimer);

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

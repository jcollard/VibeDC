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
import { TurnOrderRenderer } from './managers/renderers/TurnOrderRenderer';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * Placeholder info panel content for battle phase
 *
 * STUB: Will be replaced with:
 * - Action menu (Attack, Ability, Move, Wait, End Turn)
 * - Action outcome percentages
 * - Target selection UI
 * - Status effect indicators
 */
class BattleInfoPanelContent implements PanelContent {
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
      'Battle Phase',
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
      'Combat system coming soon',
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
 * Battle phase handler - manages active turn-based combat
 *
 * STUB IMPLEMENTATION: Framework for future combat mechanics
 *
 * Current functionality:
 * - Displays battlefield (map + units)
 * - Shows turn order by Speed
 * - Placeholder info panel
 * - Mouse event logging
 * - Victory/defeat condition checking (stubbed)
 *
 * Future functionality:
 * - Turn management system
 * - Action menu (Attack, Ability, Move, Wait, etc.)
 * - Movement/attack range display
 * - Action targeting
 * - Action execution
 * - Status effects
 * - AI enemy turns
 */
export class BattlePhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // Cached panel content (per GeneralGuidelines.md lines 103-110)
  private infoPanelContent: BattleInfoPanelContent | null = null;

  constructor() {
    super();
    console.log('[BattlePhaseHandler] Initialized');
  }

  /**
   * Get sprites required for battle phase rendering
   * @returns Sprite IDs needed for map, units, and UI
   */
  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    // STUB: Return empty set for now
    // Future: Add map tiles, unit sprites, UI sprites
    const spriteIds = new Set<string>();

    return { spriteIds };
  }

  /**
   * Render battle phase overlays (before units are rendered)
   *
   * STUB: Currently no overlays needed
   * Future: Movement/attack ranges, targeting indicators, status effects
   */
  render(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // Battle phase doesn't need pre-unit overlays (yet)
    // The map and units are rendered by CombatRenderer
    // UI panels are rendered by CombatLayoutManager
  }

  /**
   * Render battle phase UI elements (after units are rendered)
   *
   * STUB: Currently no UI overlays needed
   * Future: Action menus, buttons, dialogs
   */
  renderUI(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // Battle phase doesn't need post-unit UI overlays (yet)
    // UI panels are rendered by CombatLayoutManager
  }

  /**
   * Update battle logic and check victory/defeat conditions
   *
   * STUB: Only checks victory/defeat, no turn management yet
   */
  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    _deltaTime: number
  ): CombatState | null {
    // STUB: Victory/defeat checking
    if (encounter.isVictory(state)) {
      console.log('[BattlePhaseHandler] Victory conditions met');
      return {
        ...state,
        phase: 'victory'
      };
    }

    if (encounter.isDefeat(state)) {
      console.log('[BattlePhaseHandler] Defeat conditions met');
      return {
        ...state,
        phase: 'defeat'
      };
    }

    // STUB: Turn management (not implemented)
    // Future: Update turn gauges, process turn order, trigger AI turns, etc.

    // No state changes yet
    return state;
  }

  /**
   * Get turn order renderer for top panel
   * Shows units sorted by Speed (highest first)
   */
  getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
    // Get all units and sort by speed (highest first)
    const units = state.unitManifest.getAllUnits().map(placement => placement.unit);
    const sortedUnits = units.sort((a, b) => b.speed - a.speed);

    // Create new renderer each time with current units
    // (TurnOrderRenderer requires units in constructor, can't cache)
    return new TurnOrderRenderer(sortedUnits);
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
      this.infoPanelContent = new BattleInfoPanelContent();
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
    console.log(`[BattlePhaseHandler] Map clicked at tile (${context.tileX}, ${context.tileY})`);

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

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
 * Stub info panel content for unit turn phase
 */
class UnitTurnInfoPanelContent implements PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;

    FontAtlasRenderer.renderText(
      ctx,
      'Unit Turn Phase',
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
      'Turn actions coming soon',
      centerX,
      centerY + 10,
      fontId,
      fontAtlasImage,
      1,
      'center',
      '#888888'
    );
  }

  handleClick?(_relativeX: number, _relativeY: number): PanelClickResult {
    return { type: 'button' };
  }

  handleHover?(_relativeX: number, _relativeY: number): unknown {
    return null;
  }
}

/**
 * Unit turn phase handler - manages individual unit turns
 *
 * STUB IMPLEMENTATION: Framework for future turn mechanics
 *
 * Current functionality:
 * - Displays unit ready message in console log
 * - Placeholder info panel
 * - Immediately returns to action-timer phase
 *
 * Future functionality:
 * - Action menu (Attack, Ability, Move, Wait, End Turn)
 * - Movement range display
 * - Target selection
 * - Action execution
 * - AI enemy turns
 * - Action timer reset/overflow handling
 */
export class UnitTurnPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  private infoPanelContent: UnitTurnInfoPanelContent | null = null;
  private messageWritten: boolean = false;

  // Cached turn order renderer (maintains scroll state across renders)
  private turnOrderRenderer: TurnOrderRenderer | null = null;

  constructor() {
    super();
    console.log('[UnitTurnPhaseHandler] Initialized');
  }

  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    const spriteIds = new Set<string>();
    return { spriteIds };
  }

  render(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // No overlays needed for stub
  }

  renderUI(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // No UI overlays needed for stub
  }

  protected updatePhase(
    state: CombatState,
    _encounter: CombatEncounter,
    _deltaTime: number
  ): CombatState | null {
    // Find the unit with highest action timer
    const allUnits = state.unitManifest.getAllUnits();
    const sortedUnits = allUnits.sort((a, b) => {
      if (b.unit.actionTimer !== a.unit.actionTimer) {
        return b.unit.actionTimer - a.unit.actionTimer;
      }
      return a.unit.name.localeCompare(b.unit.name);
    });

    if (sortedUnits.length > 0 && !this.messageWritten) {
      const readyUnit = sortedUnits[0].unit;

      // Write message to console log
      console.log(`[UnitTurnPhaseHandler] ${readyUnit.name} is ready to act.`);

      // TODO: Add to combat log when available
      // context.combatLog?.addMessage(`${readyUnit.name} is ready to act.`);

      this.messageWritten = true;
    }

    // STUB: Stay in this phase - don't transition back
    // TODO: Implement turn mechanics here (action menu, etc.)
    // TODO: Transition back to action-timer when the turn is complete

    // No state change - stay in unit-turn phase
    return state;
  }

  getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
    // Use same turn order logic as ActionTimerPhaseHandler
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
      this.turnOrderRenderer = new TurnOrderRenderer(sortedUnits, state.tickCount || 0);
    } else {
      // Update units in existing renderer (preserves scroll offset)
      this.turnOrderRenderer.updateUnits(sortedUnits);
    }

    return this.turnOrderRenderer;
  }

  getInfoPanelContent(
    _context: InfoPanelContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PanelContent | null {
    if (!this.infoPanelContent) {
      this.infoPanelContent = new UnitTurnInfoPanelContent();
    }

    return this.infoPanelContent;
  }

  handleMapClick(
    context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    console.log(`[UnitTurnPhaseHandler] Map clicked at tile (${context.tileX}, ${context.tileY})`);

    return {
      handled: true,
      logMessage: `Clicked tile (${context.tileX}, ${context.tileY})`
    };
  }

  handleMouseMove(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return {
      handled: false
    };
  }
}

import { PhaseBase } from './PhaseBase';
import type {
  PhaseRenderContext,
  MouseEventContext,
  PhaseSprites,
  PhaseEventResult
} from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { DefeatModalRenderer } from './rendering/DefeatModalRenderer';
import { deserializeCombatState } from './CombatState';
import { CombatConstants } from './CombatConstants';

/**
 * Phase handler for the defeat screen.
 * Displays modal overlay with "Try Again" and "Skip Encounter" options.
 * Disables all other combat interactions.
 */
export class DefeatPhaseHandler extends PhaseBase {
  private hoveredButton: 'try-again' | 'skip' | null = null;
  private renderer: DefeatModalRenderer;

  constructor() {
    super();
    this.renderer = new DefeatModalRenderer();

    // Note: Ensure canvas context has imageSmoothingEnabled = false
    // This should already be set globally in CombatRenderer constructor (per GeneralGuidelines.md)
  }

  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    // Defeat screen only uses fonts, no sprites required
    return { spriteIds: new Set<string>() };
  }

  protected updatePhase(_state: CombatState, _encounter: CombatEncounter, _deltaTime: number): CombatState | null {
    // No automatic state changes - waits for user input
    return null;
  }

  render(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // No overlay rendering needed (all done in renderUI to appear on top)
  }

  renderUI(state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    // Render defeat modal (overlay, panel, title, buttons)
    const fonts = context.fontAtlasImages ?? new Map<string, HTMLImageElement>();
    this.renderer.render(
      context.ctx,
      state,
      this.hoveredButton,
      fonts,
      { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT }
    );
  }

  /**
   * Handle mouse movement for button hover detection
   */
  handleMouseMove(
    context: MouseEventContext,
    state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    // Update hovered button based on mouse position
    const panelBounds = { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT };
    const buttonBounds = this.renderer.getButtonBounds(panelBounds);

    let newHoveredButton: 'try-again' | 'skip' | null = null;

    // Check if mouse is over Try Again button
    if (this.isPointInBounds(context.canvasX, context.canvasY, buttonBounds.tryAgain)) {
      newHoveredButton = 'try-again';
    }
    // Check if mouse is over Skip Encounter button
    else if (this.isPointInBounds(context.canvasX, context.canvasY, buttonBounds.skip)) {
      newHoveredButton = 'skip';
    }

    // If hover state changed, trigger re-render
    if (newHoveredButton !== this.hoveredButton) {
      this.hoveredButton = newHoveredButton;
      return {
        handled: true,
        newState: state,  // Trigger re-render by returning state
      };
    }

    return { handled: false };
  }

  /**
   * Handle mouse button press for button clicks
   */
  handleMouseDown(
    context: MouseEventContext,
    state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const panelBounds = { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT };
    const buttonBounds = this.renderer.getButtonBounds(panelBounds);

    // Check if Try Again button clicked
    if (this.isPointInBounds(context.canvasX, context.canvasY, buttonBounds.tryAgain)) {
      const result = this.handleTryAgain(state);
      if (result) {
        return {
          handled: true,
          newState: result.newState,
          data: { playCinematic: result.playCinematic },
        };
      }
      return { handled: true };
    }

    // Check if Skip Encounter button clicked
    if (this.isPointInBounds(context.canvasX, context.canvasY, buttonBounds.skip)) {
      const newState = this.handleSkipEncounter(state);
      if (newState) {
        return {
          handled: true,
          newState,
        };
      }
      return { handled: true };
    }

    return { handled: false };
  }

  handleMouseUp(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return { handled: false };
  }

  private handleTryAgain(state: CombatState): { newState: CombatState; playCinematic: boolean } | null {
    // Check if initial state snapshot exists
    if (!state.initialStateSnapshot) {
      console.error("[DefeatPhaseHandler] No initial state snapshot available for retry");
      // TODO: Show error message to player (future enhancement)
      return null;
    }

    try {
      // Deserialize initial state snapshot
      const restoredState = deserializeCombatState(state.initialStateSnapshot);

      if (!restoredState) {
        console.error("[DefeatPhaseHandler] Failed to deserialize initial state snapshot");
        return null;
      }

      // IMPORTANT: Preserve the initialStateSnapshot so "Try Again" can be used multiple times
      // The snapshot was excluded during serialization to avoid recursion, so we need to restore it
      restoredState.initialStateSnapshot = state.initialStateSnapshot;

      console.log("[DefeatPhaseHandler] Combat state restored from initial snapshot");
      // Return both the new state and a flag indicating that a cinematic should play
      return { newState: restoredState, playCinematic: true };
    } catch (error) {
      console.error("[DefeatPhaseHandler] Failed to restore initial state:", error);
      // TODO: Show error message to player (future enhancement)
      return null;
    }
  }

  private handleSkipEncounter(_state: CombatState): CombatState | null {
    // TODO: Implement skip encounter logic (future work)
    console.log("[DefeatPhaseHandler] Skip encounter clicked (not yet implemented)");
    return null;
  }

  private isPointInBounds(
    x: number,
    y: number,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }
}

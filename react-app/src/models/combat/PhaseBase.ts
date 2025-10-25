import type { CombatPhaseHandler, PhaseSprites, PhaseRenderContext } from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';

/**
 * Abstract base class for combat phase handlers
 * Provides common infrastructure for time tracking and update lifecycle
 *
 * Phase implementations should extend this class and implement:
 * - getRequiredSprites() - Return sprites needed for this phase
 * - render() - Render phase overlays (before units)
 * - renderUI() - Render phase UI elements (after units)
 * - updatePhase() - Phase-specific update logic
 */
export abstract class PhaseBase implements CombatPhaseHandler {
  protected elapsedTime = 0;

  /**
   * Get all sprites required for this phase
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Set of sprite IDs needed for this phase
   */
  abstract getRequiredSprites(state: CombatState, encounter: CombatEncounter): PhaseSprites;

  /**
   * Render phase-specific overlays (before units are drawn)
   * Examples: deployment zones, movement ranges, attack ranges
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @param context - Rendering context with canvas, sizes, sprites, fonts
   */
  abstract render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void;

  /**
   * Render phase-specific UI elements (after units are drawn)
   * Examples: headers, dialogs, buttons, menus
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @param context - Rendering context with canvas, sizes, sprites, fonts
   */
  abstract renderUI(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void;

  /**
   * Phase-specific update logic
   * Override this in subclasses to implement phase behavior
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @param deltaTime - Time elapsed since last update in seconds
   * @returns Updated combat state, or current state if no changes
   */
  protected abstract updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null;

  /**
   * Update phase state and animations
   * Tracks elapsed time and delegates to phase-specific update logic
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @param deltaTime - Time elapsed since last update in seconds
   * @returns Updated combat state, or current state if no changes
   */
  update(state: CombatState, encounter: CombatEncounter, deltaTime: number): CombatState | null {
    this.elapsedTime += deltaTime;
    return this.updatePhase(state, encounter, deltaTime);
  }

  /**
   * Get elapsed time since phase started
   * @returns Elapsed time in seconds
   */
  protected getElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Reset elapsed time (typically called when phase starts)
   */
  protected resetElapsedTime(): void {
    this.elapsedTime = 0;
  }

  // Optional methods - phases can override if needed

  /**
   * Handle click on the canvas
   * Override to handle phase-specific click behavior
   */
  handleClick?(
    canvasX: number,
    canvasY: number,
    tileSize: number,
    offsetX: number,
    offsetY: number,
    encounter: CombatEncounter
  ): boolean;

  /**
   * Handle mouse move on the canvas
   * Override to handle phase-specific hover behavior
   */
  handleMouseMove?(
    canvasX: number,
    canvasY: number,
    characterCount: number
  ): boolean;

  /**
   * Handle character click in selection dialog
   * Override for phases that use character selection
   */
  handleCharacterClick?(
    canvasX: number,
    canvasY: number,
    characterCount: number
  ): number | null;

  /**
   * Handle button mouse move for hover detection
   * Override for phases that use buttons
   */
  handleButtonMouseMove?(canvasX: number, canvasY: number): boolean;

  /**
   * Handle button mouse down for active state
   * Override for phases that use buttons
   */
  handleButtonMouseDown?(canvasX: number, canvasY: number): boolean;

  /**
   * Handle button mouse up (triggers click if over button)
   * Override for phases that use buttons
   */
  handleButtonMouseUp?(canvasX: number, canvasY: number): boolean;

  /**
   * Get the currently selected zone index
   * Override for phases that use zone selection
   */
  getSelectedZoneIndex?(): number | null;

  /**
   * Clear the selected deployment zone
   * Override for phases that use zone selection
   */
  clearSelectedZone?(): void;

  /**
   * Get the currently hovered character index
   * Override for phases that use character hover
   */
  getHoveredCharacterIndex?(): number | null;
}

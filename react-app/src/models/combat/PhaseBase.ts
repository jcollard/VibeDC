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

  // Legacy optional methods - kept for backwards compatibility with old code
  // New phases should use the phase-agnostic methods from CombatPhaseHandler instead

  /**
   * @deprecated Use handleMapClick instead
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
   * @deprecated Internal use only - use phase-agnostic handleMouseMove from CombatPhaseHandler
   */
  handleCharacterClick?(
    canvasX: number,
    canvasY: number,
    characterCount: number
  ): number | null;

  /**
   * @deprecated Internal use only
   */
  handleButtonMouseMove?(canvasX: number, canvasY: number): boolean;

  /**
   * @deprecated Internal use only
   */
  handleButtonMouseDown?(canvasX: number, canvasY: number): boolean;

  /**
   * @deprecated Internal use only
   */
  handleButtonMouseUp?(canvasX: number, canvasY: number): boolean;

  /**
   * @deprecated Internal use only
   */
  getSelectedZoneIndex?(): number | null;

  /**
   * @deprecated Internal use only
   */
  clearSelectedZone?(): void;

  /**
   * @deprecated Internal use only
   */
  getHoveredCharacterIndex?(): number | null;
}

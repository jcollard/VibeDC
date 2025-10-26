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

  /**
   * MIGRATION NOTE (2025-10-26):
   * Legacy optional methods (handleClick, handleCharacterClick, etc.) have been removed.
   * If you need phase-specific methods:
   * 1. Define them on your specific phase handler class
   * 2. Cast to your specific type when accessing from phaseHandlerRef
   * 3. Use 'in' operator to check if method exists before casting
   *
   * Example:
   *   if ('handleDeploymentAction' in phaseHandlerRef.current) {
   *     const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
   *     handler.handleDeploymentAction(...);
   *   }
   */
}

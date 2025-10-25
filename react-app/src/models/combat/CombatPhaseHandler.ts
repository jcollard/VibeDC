import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';

/**
 * Sprite IDs that a phase needs to load
 */
export interface PhaseSprites {
  spriteIds: Set<string>;
}

/**
 * Parameters passed to phase render methods
 */
export interface PhaseRenderContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  tileSize: number;
  spriteSize: number;
  offsetX: number;
  offsetY: number;
  spriteImages: Map<string, HTMLImageElement>;
  headerFont: string;
  dialogFont: string;
  titleAtlasFontId?: string;
  messageAtlasFontId?: string;
}

/**
 * CombatPhaseHandler defines the behavior for a specific phase of combat.
 * Each phase (deployment, battle, victory, defeat) should implement this interface
 * to define its rendering logic, sprite requirements, and update behavior.
 */
export interface CombatPhaseHandler {
  /**
   * Get the sprite IDs that need to be loaded for this phase.
   * Called during sprite loading to determine which sprites to preload.
   */
  getRequiredSprites(state: CombatState, encounter: CombatEncounter): PhaseSprites;

  /**
   * Render phase-specific overlays on top of the base map.
   * This is called after the map tiles are rendered but before the final buffer swap.
   */
  render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void;

  /**
   * Handle phase-specific updates (e.g., user input, state transitions).
   * Returns the updated combat state (or the same state if no changes).
   *
   * @returns Updated CombatState or null to indicate phase should transition
   */
  update?(state: CombatState, encounter: CombatEncounter, deltaTime: number): CombatState | null;
}

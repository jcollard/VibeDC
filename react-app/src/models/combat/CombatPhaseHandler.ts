import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { CombatUnit } from './CombatUnit';
import type { TopPanelRenderer } from './managers/TopPanelRenderer';
import type { PanelContent } from './managers/panels/PanelContent';

/**
 * Sprite IDs that a phase needs to load
 */
export interface PhaseSprites {
  spriteIds: Set<string>;
}

/**
 * Result of a phase event handler
 * Generic TData allows type-safe passing of phase-specific data
 */
export interface PhaseEventResult<TData = unknown> {
  /** Whether the event was handled */
  handled: boolean;
  /** New combat state (if state changed) */
  newState?: CombatState;
  /** Phase to transition to (if phase should change) */
  transitionTo?: string;
  /** Prevent default CombatView behavior */
  preventDefault?: boolean;
  /** Optional message to add to combat log */
  logMessage?: string;
  /** Optional generic data field for phase-specific information */
  data?: TData;
}

/**
 * Context for mouse events passed to phase handlers
 */
export interface MouseEventContext {
  canvasX: number;
  canvasY: number;
  tileX?: number;
  tileY?: number;
}

/**
 * Context for info panel configuration
 */
export interface InfoPanelContext {
  currentUnit: CombatUnit | null;
  targetUnit: CombatUnit | null;
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
  titleAtlasFontId?: string;
  messageAtlasFontId?: string;
  dialogAtlasFontId?: string;
  fontAtlasImages?: Map<string, HTMLImageElement>;
  combatLog?: import('./CombatLogManager').CombatLogManager;
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

  // --- NEW PHASE-AGNOSTIC METHODS ---

  /**
   * Handle map tile click events
   * @param context - Mouse event context with canvas and tile coordinates
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Event result indicating if handled and any state changes
   */
  handleMapClick?(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult;

  /**
   * Handle mouse down events on the canvas
   * @param context - Mouse event context
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Event result indicating if handled
   */
  handleMouseDown?(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult;

  /**
   * Handle mouse up events on the canvas
   * @param context - Mouse event context
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Event result indicating if handled
   */
  handleMouseUp?(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult;

  /**
   * Handle mouse move events on the canvas
   * @param context - Mouse event context
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Event result indicating if handled
   */
  handleMouseMove?(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult;

  /**
   * Handle info panel click events
   * @param relativeX - X coordinate relative to panel
   * @param relativeY - Y coordinate relative to panel
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Event result indicating if handled and any state changes
   */
  handleInfoPanelClick?(
    relativeX: number,
    relativeY: number,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult;

  /**
   * Handle info panel hover events
   * @param relativeX - X coordinate relative to panel
   * @param relativeY - Y coordinate relative to panel
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Event result indicating if handled
   */
  handleInfoPanelHover?(
    relativeX: number,
    relativeY: number,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult;

  /**
   * Get the top panel renderer for this phase
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Top panel renderer instance
   */
  getTopPanelRenderer?(
    state: CombatState,
    encounter: CombatEncounter
  ): TopPanelRenderer;

  /**
   * Get the info panel content for this phase
   * @param context - Info panel context with unit references
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Panel content instance or null if no panel
   */
  getInfoPanelContent?(
    context: InfoPanelContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PanelContent | null;
}

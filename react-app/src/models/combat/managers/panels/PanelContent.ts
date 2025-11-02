/**
 * Region definition for rendering panel content
 */
export interface PanelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Discriminated union for panel click results
 * Each panel content type can define its own specific result types
 */
export type PanelClickResult =
  | { type: 'button'; buttonId?: string }
  | { type: 'party-member'; index: number }
  | { type: 'unit-selected'; unitId: string }
  | { type: 'action-selected'; actionId: string }
  | { type: 'target-selected'; targetIndex: number }
  | { type: 'view-toggled'; view: 'stats' | 'abilities' }
  | { type: 'combat-log-message'; message: string }
  | { type: 'cancel-attack' }
  | { type: 'perform-attack' }
  | { type: 'empty-slot'; slotLabel: string; slotType: 'equipment' | 'ability' }
  | { type: 'ability-slot-clicked'; slotType: 'Reaction' | 'Passive' | 'Movement' }
  | { type: 'learn-abilities' }
  | { type: 'set-primary-class'; classId: string }
  | { type: 'set-secondary-class'; classId: string }
  | { type: 'learn-ability'; abilityId: string }
  | { type: 'cancel-ability-view' }
  | { type: 'exit-party-management' }
  | null;

/**
 * Type guard to check if a value is a valid PanelClickResult
 */
export function isPanelClickResult(value: unknown): value is PanelClickResult {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  if (!('type' in value)) return false;

  const result = value as { type: string };
  return ['button', 'party-member', 'unit-selected', 'action-selected', 'target-selected', 'view-toggled', 'combat-log-message', 'cancel-attack', 'perform-attack', 'empty-slot', 'ability-slot-clicked', 'learn-abilities', 'set-primary-class', 'set-secondary-class', 'learn-ability', 'cancel-ability-view'].includes(result.type);
}

/**
 * Interface for content that can be rendered in an info panel.
 * Implementations are responsible for:
 * - Rendering all content (including titles, if desired)
 * - Handling their own layout and positioning
 * - Responding to interaction events with panel-relative coordinates
 * - Always using FontAtlasRenderer and SpriteRenderer for rendering
 */
export interface PanelContent {
  /**
   * Render the panel content to the canvas
   * @param ctx - Canvas rendering context
   * @param region - The region where content should be rendered
   * @param fontId - Font ID for text rendering
   * @param fontAtlasImage - Font atlas image for text rendering
   * @param spriteImages - Optional map of sprite images for rendering sprites
   * @param spriteSize - Optional base sprite size (e.g., 12 for 12x12 sprites)
   */
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    spriteImages?: Map<string, HTMLImageElement>,
    spriteSize?: number
  ): void;

  /**
   * Handle click event on the panel content
   * @param relativeX - X coordinate relative to panel region (0 = left edge)
   * @param relativeY - Y coordinate relative to panel region (0 = top edge)
   * @returns Discriminated union result indicating what was clicked, or null if not handled
   */
  handleClick?(relativeX: number, relativeY: number): PanelClickResult;

  /**
   * Handle hover event on the panel content
   * @param relativeX - X coordinate relative to panel region (0 = left edge)
   * @param relativeY - Y coordinate relative to panel region (0 = top edge)
   * @returns Implementation-specific result, or null if no hover state
   */
  handleHover?(relativeX: number, relativeY: number): unknown;

  /**
   * Handle mouse down event on the panel content
   * @param relativeX - X coordinate relative to panel region (0 = left edge)
   * @param relativeY - Y coordinate relative to panel region (0 = top edge)
   * @returns true if the event was handled, false otherwise
   */
  handleMouseDown?(relativeX: number, relativeY: number): boolean;
}

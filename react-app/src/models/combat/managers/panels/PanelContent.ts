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
   */
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void;

  /**
   * Handle click event on the panel content
   * @param relativeX - X coordinate relative to panel region (0 = left edge)
   * @param relativeY - Y coordinate relative to panel region (0 = top edge)
   * @returns Implementation-specific result, or null if click was not handled
   */
  handleClick?(relativeX: number, relativeY: number): unknown;

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

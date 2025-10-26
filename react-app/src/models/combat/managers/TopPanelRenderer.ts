/**
 * Region definition for rendering
 */
export interface PanelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Interface for top panel content renderers.
 * Different renderers can be used based on game phase (combat, deployment, etc.)
 */
export interface TopPanelRenderer {
  /**
   * Render the panel content to the canvas
   * @param ctx - Canvas rendering context
   * @param region - The region to render within
   * @param fontId - Font ID to use for text rendering
   * @param fontAtlasImage - Font atlas image
   * @param spriteImages - Map of sprite images
   * @param spriteSize - Size of sprites
   */
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void;

  /**
   * Handle click events within the panel
   * @param x - Canvas x coordinate
   * @param y - Canvas y coordinate
   * @param region - The panel region
   * @returns true if the click was handled, false otherwise
   */
  handleClick?(
    x: number,
    y: number,
    region: PanelRegion
  ): boolean;
}

import type { PanelContent, PanelRegion, PanelClickResult } from './panels/PanelContent';

/**
 * Manages rendering of information panels that can display different types of content.
 * Acts as a coordinator that delegates rendering and input handling to PanelContent implementations.
 *
 * This manager is responsible for:
 * - Delegating render calls to the current panel content
 * - Transforming canvas coordinates to panel-relative coordinates
 * - Forwarding interaction events (clicks, hovers) to panel content
 */
export class InfoPanelManager {
  private content: PanelContent | null = null;

  /**
   * Set the content to be displayed in the panel
   */
  setContent(content: PanelContent | null): void {
    this.content = content;
  }

  /**
   * Render the panel content to the canvas
   */
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!this.content) return;
    this.content.render(ctx, region, fontId, fontAtlasImage);
  }


  /**
   * Handle click on the panel content
   * Transforms canvas coordinates to panel-relative coordinates and forwards to content
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param region - Panel region
   * @returns Type-safe discriminated union result from content's handleClick, or null
   */
  handleClick(
    canvasX: number,
    canvasY: number,
    region: PanelRegion
  ): PanelClickResult {
    if (!this.content || !this.content.handleClick) return null;

    // Transform canvas coordinates to panel-relative coordinates
    const relativeX = canvasX - region.x;
    const relativeY = canvasY - region.y;

    return this.content.handleClick(relativeX, relativeY);
  }

  /**
   * Handle hover on the panel content
   * Transforms canvas coordinates to panel-relative coordinates and forwards to content
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param region - Panel region
   * @returns Result from content's handleHover method, or null if no content or no handler
   */
  handleHover(
    canvasX: number,
    canvasY: number,
    region: PanelRegion
  ): unknown {
    if (!this.content || !this.content.handleHover) return null;

    // Transform canvas coordinates to panel-relative coordinates
    const relativeX = canvasX - region.x;
    const relativeY = canvasY - region.y;

    return this.content.handleHover(relativeX, relativeY);
  }

  /**
   * Handle mouse down on the panel content
   * Transforms canvas coordinates to panel-relative coordinates and forwards to content
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param region - Panel region
   * @returns true if the event was handled, false otherwise
   */
  handleMouseDown(
    canvasX: number,
    canvasY: number,
    region: PanelRegion
  ): boolean {
    if (!this.content || !this.content.handleMouseDown) return false;

    // Transform canvas coordinates to panel-relative coordinates
    const relativeX = canvasX - region.x;
    const relativeY = canvasY - region.y;

    return this.content.handleMouseDown(relativeX, relativeY);
  }
}

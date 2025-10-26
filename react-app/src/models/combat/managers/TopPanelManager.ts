import type { TopPanelRenderer, PanelRegion } from './TopPanelRenderer';

/**
 * Manages the top panel content, switching between different renderers
 * based on the game phase or state.
 */
export class TopPanelManager {
  private currentRenderer: TopPanelRenderer | null = null;

  /**
   * Set the current renderer to use for the top panel
   */
  setRenderer(renderer: TopPanelRenderer): void {
    this.currentRenderer = renderer;
  }

  /**
   * Get the current renderer
   */
  getRenderer(): TopPanelRenderer | null {
    return this.currentRenderer;
  }

  /**
   * Render the current panel content
   */
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    if (!this.currentRenderer) return;

    this.currentRenderer.render(
      ctx,
      region,
      fontId,
      fontAtlasImage,
      spriteImages,
      spriteSize
    );
  }

  /**
   * Handle click events within the panel
   */
  handleClick(x: number, y: number, region: PanelRegion): boolean {
    if (!this.currentRenderer || !this.currentRenderer.handleClick) {
      return false;
    }

    return this.currentRenderer.handleClick(x, y, region);
  }
}

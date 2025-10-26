import type { TopPanelRenderer, PanelRegion } from '../TopPanelRenderer';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';

/**
 * Renders a simple header for the deployment phase.
 * Displays deployment instructions or status.
 */
export class DeploymentHeaderRenderer implements TopPanelRenderer {
  private message: string;
  private color: string;

  constructor(message: string = 'DEPLOYMENT PHASE', color: string = '#9eff6b') {
    this.message = message;
    this.color = color;
  }

  /**
   * Update the message to display
   */
  setMessage(message: string): void {
    this.message = message;
  }

  /**
   * Update the text color
   */
  setColor(color: string): void {
    this.color = color;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    _spriteImages: Map<string, HTMLImageElement>,
    _spriteSize: number
  ): void {
    if (!fontAtlasImage) return;

    // Render the message at the start of the region
    FontAtlasRenderer.renderText(
      ctx,
      this.message,
      region.x,
      region.y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      this.color
    );
  }

  // No click handling needed for deployment header
  handleClick?(_x: number, _y: number, _region: PanelRegion): boolean {
    return false;
  }
}

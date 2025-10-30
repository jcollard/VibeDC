import type { TopPanelRenderer, PanelRegion } from '../TopPanelRenderer';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import { CombatConstants } from '../../CombatConstants';

/**
 * Renders a simple header for the deployment phase.
 * Displays deployment instructions or status.
 */
export class DeploymentHeaderRenderer implements TopPanelRenderer {
  private message: string;

  constructor(message: string = 'DEPLOYMENT PHASE') {
    this.message = message;
  }

  /**
   * Update the message to display
   */
  setMessage(message: string): void {
    this.message = message;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    _fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    _spriteImages: Map<string, HTMLImageElement>,
    _spriteSize: number
  ): void {
    if (!fontAtlasImage) return;

    const fontId = CombatConstants.FONTS.TITLE_FONT_ID;
    const font = FontRegistry.getById(fontId);
    if (!font) return;

    const scale = 1;

    // Calculate center X position
    const centerX = region.x + region.width / 2;

    // Calculate Y position to vertically center the text
    const textY = region.y + region.height / 2 - (font.charHeight * scale) / 2;

    // Render the message centered using dungeon-slant font (no color tint)
    FontAtlasRenderer.renderText(
      ctx,
      this.message,
      centerX,
      textY,
      fontId,
      fontAtlasImage,
      scale,
      'center'
    );
  }

  // No click handling needed for deployment header
  handleClick?(_x: number, _y: number, _region: PanelRegion): boolean {
    return false;
  }
}

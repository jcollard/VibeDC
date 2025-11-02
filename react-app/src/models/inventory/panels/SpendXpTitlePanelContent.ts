/**
 * Panel content for the Spend XP title panel
 * Shows: "Unit Abilities Coming Soon" (stub)
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';

/**
 * Stub panel content that displays "Unit Abilities Coming Soon" in title panel
 */
export class SpendXpTitlePanelContent implements PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Center the text in the panel
    const text = 'Unit Abilities Coming Soon';
    const centerX = region.x + Math.floor(region.width / 2);
    const centerY = region.y + Math.floor(region.height / 2);

    FontAtlasRenderer.renderText(
      ctx,
      text,
      centerX,
      centerY,
      fontId,
      fontAtlasImage,
      1,
      'center',
      '#ffffff'
    );

    ctx.restore();
  }
}

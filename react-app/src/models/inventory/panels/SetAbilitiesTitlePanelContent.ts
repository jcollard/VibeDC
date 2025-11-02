/**
 * Panel content for the Set Abilities title panel
 * Shows: "Set Abilities" in dragonslant title font
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { CombatConstants } from '../../combat/CombatConstants';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';

/**
 * Panel content that displays "Set Abilities" in title panel using dragonslant font
 */
export class SetAbilitiesTitlePanelContent implements PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    _fontId: string,
    _fontAtlasImage: HTMLImageElement | null,
    _spriteImages?: Map<string, HTMLImageElement>,
    _spriteSize?: number,
    fonts?: Map<string, HTMLImageElement>
  ): void {
    if (!fonts) return;

    // Use dragonslant title font
    const titleFontId = CombatConstants.FONTS.TITLE_FONT_ID;
    const titleFontImage = fonts.get(titleFontId);

    if (!titleFontImage) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Center the text in the panel
    const text = 'Set Abilities';
    const centerX = region.x + Math.floor(region.width / 2);
    const centerY = region.y + Math.floor(region.height / 2);

    FontAtlasRenderer.renderText(
      ctx,
      text,
      centerX,
      centerY,
      titleFontId,
      titleFontImage,
      1,
      'center',
      '#ffffff'
    );

    ctx.restore();
  }
}

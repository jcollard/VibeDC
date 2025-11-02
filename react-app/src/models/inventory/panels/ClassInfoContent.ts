/**
 * Panel content for displaying information about a class
 * Shows the class name and a "Coming Soon" message
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';
import type { UnitClass } from '../../combat/UnitClass';

/**
 * Panel content that displays information about a class
 */
export class ClassInfoContent implements PanelContent {
  private unitClass: UnitClass;

  constructor(unitClass: UnitClass) {
    this.unitClass = unitClass;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    const font = FontRegistry.getById(fontId);
    if (!font) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const padding = 4;
    const lineSpacing = 8;
    let y = region.y + padding;

    // Render class name as title (centered, orange)
    const titleColor = '#ff8c00'; // Dark orange for title
    const nameWidth = FontAtlasRenderer.measureText(this.unitClass.name, font);
    const nameX = region.x + Math.floor((region.width - nameWidth) / 2);
    FontAtlasRenderer.renderText(
      ctx,
      this.unitClass.name,
      nameX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      titleColor
    );

    y += lineSpacing + 2; // Extra spacing after title

    // Render "Coming Soon" text (centered)
    const comingSoonText = 'Coming Soon';
    const comingSoonColor = '#ffffff';
    const comingSoonWidth = FontAtlasRenderer.measureText(comingSoonText, font);
    const comingSoonX = region.x + Math.floor((region.width - comingSoonWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      comingSoonText,
      comingSoonX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      comingSoonColor
    );

    ctx.restore();
  }
}

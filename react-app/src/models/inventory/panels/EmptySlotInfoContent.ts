/**
 * Panel content for displaying information about an empty equipment or ability slot
 * Shows the slot name and instructions for equipping/assigning
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';

/**
 * Type of empty slot
 */
export type EmptySlotType = 'equipment' | 'ability';

/**
 * Panel content that displays information about an empty slot
 */
export class EmptySlotInfoContent implements PanelContent {
  private slotLabel: string;
  private slotType: EmptySlotType;

  constructor(slotLabel: string, slotType: EmptySlotType) {
    this.slotLabel = slotLabel;
    this.slotType = slotType;
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

    // Render slot name as title
    const titleColor = '#ffff00'; // Yellow for title
    FontAtlasRenderer.renderText(
      ctx,
      this.slotLabel,
      region.x + padding,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      titleColor
    );

    y += lineSpacing + 2; // Extra spacing after title

    // Render instruction text
    const instructionText = this.slotType === 'equipment'
      ? 'Click to equip item'
      : 'Click to assign ability';
    const instructionColor = '#ffffff';

    FontAtlasRenderer.renderText(
      ctx,
      instructionText,
      region.x + padding,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      instructionColor
    );

    ctx.restore();
  }
}

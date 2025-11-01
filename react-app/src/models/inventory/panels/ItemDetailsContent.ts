/**
 * Panel content for displaying selected item details (bottom info panel)
 * Shows: Item name, type, stats, description, quantity
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { CombatConstants } from '../../combat/CombatConstants';
import type { Equipment } from '../../combat/Equipment';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';

/**
 * Panel content that displays detailed information about a selected item
 * Renders in the bottom info panel (right column, bottom position)
 */
export class ItemDetailsContent implements PanelContent {
  private equipment: Equipment | null;
  private quantity: number;
  private readonly constants = CombatConstants.INVENTORY_VIEW.BOTTOM_INFO;

  constructor(equipment: Equipment | null, quantity: number = 0) {
    this.equipment = equipment;
    this.quantity = quantity;
  }

  /**
   * Update the displayed item
   */
  updateItem(equipment: Equipment | null, quantity: number = 0): void {
    this.equipment = equipment;
    this.quantity = quantity;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    _fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const padding = 4;
    let currentY = region.y + padding;
    const leftX = region.x + padding;

    // If no item selected, show empty message
    if (!this.equipment) {
      FontAtlasRenderer.renderText(
        ctx,
        'No item selected',
        Math.round(leftX),
        Math.round(currentY),
        this.constants.FONT_ID,
        fontAtlasImage,
        1,
        'left',
        this.constants.DESCRIPTION_COLOR
      );
      ctx.restore();
      return;
    }

    // Render item name (in yellow, title color)
    const itemNameText = this.equipment.name;
    FontAtlasRenderer.renderText(
      ctx,
      itemNameText,
      Math.round(leftX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.TITLE_COLOR
    );
    currentY += this.constants.SPACING + 5; // Extra spacing after title

    // Render item type
    const typeText = `Type: ${this.equipment.type}`;
    FontAtlasRenderer.renderText(
      ctx,
      typeText,
      Math.round(leftX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.LABEL_COLOR
    );
    currentY += this.constants.SPACING;

    // Render quantity (if > 1)
    if (this.quantity > 1) {
      const quantityText = `Quantity: ${this.quantity}`;
      FontAtlasRenderer.renderText(
        ctx,
        quantityText,
        Math.round(leftX),
        Math.round(currentY),
        this.constants.FONT_ID,
        fontAtlasImage,
        1,
        'left',
        this.constants.LABEL_COLOR
      );
      currentY += this.constants.SPACING;
    }

    // Render stats (modifiers)
    const modifiers = this.equipment.modifiers;
    if (Object.keys(modifiers).length > 0) {
      currentY += 2; // Small spacing before stats

      // Render each stat modifier
      for (const [stat, value] of Object.entries(modifiers)) {
        if (value !== 0) {
          const sign = value > 0 ? '+' : '';
          const statText = `${this.formatStatName(stat)}: ${sign}${value}`;
          FontAtlasRenderer.renderText(
            ctx,
            statText,
            Math.round(leftX),
            Math.round(currentY),
            this.constants.FONT_ID,
            fontAtlasImage,
            1,
            'left',
            this.constants.VALUE_COLOR
          );
          currentY += this.constants.SPACING;
        }
      }
    }

    // Render range (if weapon)
    if (this.equipment.minRange !== undefined && this.equipment.maxRange !== undefined) {
      const rangeText = `Range: ${this.equipment.minRange}-${this.equipment.maxRange}`;
      FontAtlasRenderer.renderText(
        ctx,
        rangeText,
        Math.round(leftX),
        Math.round(currentY),
        this.constants.FONT_ID,
        fontAtlasImage,
        1,
        'left',
        this.constants.LABEL_COLOR
      );
      currentY += this.constants.SPACING;
    }

    // Render type tags (if any)
    if (this.equipment.typeTags && this.equipment.typeTags.length > 0) {
      const tagsText = `Tags: ${this.equipment.typeTags.join(', ')}`;
      FontAtlasRenderer.renderText(
        ctx,
        tagsText,
        Math.round(leftX),
        Math.round(currentY),
        this.constants.FONT_ID,
        fontAtlasImage,
        1,
        'left',
        this.constants.DESCRIPTION_COLOR
      );
      currentY += this.constants.SPACING;
    }

    // TODO: Future - render item description if available
    // if (this.equipment.description) {
    //   currentY += 2;
    //   FontAtlasRenderer.renderText(
    //     ctx,
    //     this.equipment.description,
    //     Math.round(leftX),
    //     Math.round(currentY),
    //     this.constants.FONT_ID,
    //     fontAtlasImage,
    //     1,
    //     'left',
    //     this.constants.DESCRIPTION_COLOR
    //   );
    // }

    ctx.restore();
  }

  /**
   * Format stat name for display (e.g., "physicalPower" -> "Physical Power")
   */
  private formatStatName(stat: string): string {
    // Map of common stat names to display names
    const statNameMap: Record<string, string> = {
      health: 'HP',
      maxHealth: 'Max HP',
      magicPoints: 'MP',
      maxMagicPoints: 'Max MP',
      physicalPower: 'P.Pow',
      magicPower: 'M.Pow',
      physicalEvade: 'P.Evd',
      magicalEvade: 'M.Evd',
      move: 'Move',
      speed: 'Speed',
      courage: 'Courage',
      attunement: 'Attunement',
    };

    return statNameMap[stat] || stat;
  }
}

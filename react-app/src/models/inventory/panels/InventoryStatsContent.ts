/**
 * Panel content for displaying inventory statistics (top info panel)
 * Shows: Total items, unique items, gold, weight (future)
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { CombatConstants } from '../../combat/CombatConstants';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';

/**
 * Inventory statistics data
 */
export interface InventoryStats {
  /** Total number of items (sum of all quantities) */
  totalItems: number;
  /** Number of unique item types */
  uniqueItems: number;
  /** Gold amount */
  gold: number;
  /** Total weight (future feature) */
  weight?: number;
  /** Maximum weight capacity (future feature) */
  maxWeight?: number;
}

/**
 * Panel content that displays inventory statistics
 * Renders in the top info panel (right column, top position)
 */
export class InventoryStatsContent implements PanelContent {
  private stats: InventoryStats;
  private readonly constants = CombatConstants.INVENTORY_VIEW.TOP_INFO;

  constructor(stats: InventoryStats) {
    this.stats = stats;
  }

  /**
   * Update the stats (for when inventory changes)
   */
  updateStats(stats: InventoryStats): void {
    this.stats = stats;
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

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'INVENTORY',
      Math.round(leftX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.LABEL_COLOR
    );
    currentY += this.constants.SPACING;

    // Render gold
    const goldLabel = CombatConstants.INVENTORY_VIEW.TEXT.GOLD_LABEL;
    FontAtlasRenderer.renderText(
      ctx,
      goldLabel,
      Math.round(leftX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.LABEL_COLOR
    );

    const goldLabelWidth = FontAtlasRenderer.measureTextByFontId(goldLabel, this.constants.FONT_ID);
    FontAtlasRenderer.renderText(
      ctx,
      `${this.stats.gold}`,
      Math.round(leftX + goldLabelWidth + 4),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.VALUE_COLOR
    );
    currentY += this.constants.SPACING;

    // Render total items
    const itemsLabel = CombatConstants.INVENTORY_VIEW.TEXT.ITEMS_LABEL;
    FontAtlasRenderer.renderText(
      ctx,
      itemsLabel,
      Math.round(leftX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.LABEL_COLOR
    );

    const itemsLabelWidth = FontAtlasRenderer.measureTextByFontId(itemsLabel, this.constants.FONT_ID);
    const itemsText = `${this.stats.totalItems} (${this.stats.uniqueItems} types)`;
    FontAtlasRenderer.renderText(
      ctx,
      itemsText,
      Math.round(leftX + itemsLabelWidth + 4),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.VALUE_COLOR
    );
    currentY += this.constants.SPACING;

    // Render weight (future feature, commented out for now)
    // if (this.stats.weight !== undefined && this.stats.maxWeight !== undefined) {
    //   const weightLabel = CombatConstants.INVENTORY_VIEW.TEXT.WEIGHT_LABEL;
    //   FontAtlasRenderer.renderText(
    //     ctx,
    //     weightLabel,
    //     Math.round(leftX),
    //     Math.round(currentY),
    //     this.constants.FONT_ID,
    //     fontAtlasImage,
    //     1,
    //     'left',
    //     this.constants.LABEL_COLOR
    //   );
    //
    //   const weightLabelWidth = FontAtlasRenderer.measureTextByFontId(weightLabel, this.constants.FONT_ID);
    //   const weightText = `${this.stats.weight} / ${this.stats.maxWeight}`;
    //   FontAtlasRenderer.renderText(
    //     ctx,
    //     weightText,
    //     Math.round(leftX + weightLabelWidth + 4),
    //     Math.round(currentY),
    //     this.constants.FONT_ID,
    //     fontAtlasImage,
    //     1,
    //     'left',
    //     this.constants.VALUE_COLOR
    //   );
    //   currentY += this.constants.SPACING;
    // }

    ctx.restore();
  }
}

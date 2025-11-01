/**
 * Panel content for the inventory top panel
 * Shows: Gold, Items count, and Category filter tabs in a single compact layout
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { CombatConstants } from '../../combat/CombatConstants';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';
import type { InventoryCategory } from '../InventoryViewState';

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
}

/**
 * Panel content that displays inventory stats and category tabs in top panel
 */
export class InventoryTopPanelContent implements PanelContent {
  private stats: InventoryStats;
  private activeCategory: InventoryCategory;
  private hoveredCategory: InventoryCategory | null;
  private readonly constants = CombatConstants.INVENTORY_VIEW.TOP_INFO;
  private readonly categoryConstants = CombatConstants.INVENTORY_VIEW.MAIN_PANEL.CATEGORY_TABS;
  private readonly textConstants = CombatConstants.INVENTORY_VIEW.TEXT;

  constructor(stats: InventoryStats, activeCategory: InventoryCategory, hoveredCategory: InventoryCategory | null) {
    this.stats = stats;
    this.activeCategory = activeCategory;
    this.hoveredCategory = hoveredCategory;
  }

  /**
   * Update the content (for when state changes)
   */
  update(stats: InventoryStats, activeCategory: InventoryCategory, hoveredCategory: InventoryCategory | null): void {
    this.stats = stats;
    this.activeCategory = activeCategory;
    this.hoveredCategory = hoveredCategory;
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
    const leftX = region.x + padding;
    let currentX = leftX;
    const currentY = region.y + padding;

    // Render gold
    const goldLabel = this.textConstants.GOLD_LABEL;
    FontAtlasRenderer.renderText(
      ctx,
      goldLabel,
      Math.round(currentX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.LABEL_COLOR
    );

    const goldLabelWidth = FontAtlasRenderer.measureTextByFontId(goldLabel, this.constants.FONT_ID);
    currentX += goldLabelWidth + 2;

    FontAtlasRenderer.renderText(
      ctx,
      `${this.stats.gold}`,
      Math.round(currentX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.VALUE_COLOR
    );

    const goldValueWidth = FontAtlasRenderer.measureTextByFontId(`${this.stats.gold}`, this.constants.FONT_ID);
    currentX += goldValueWidth + 8; // Add spacing between sections

    // Render items count
    const itemsLabel = this.textConstants.ITEMS_LABEL;
    FontAtlasRenderer.renderText(
      ctx,
      itemsLabel,
      Math.round(currentX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.LABEL_COLOR
    );

    const itemsLabelWidth = FontAtlasRenderer.measureTextByFontId(itemsLabel, this.constants.FONT_ID);
    currentX += itemsLabelWidth + 2;

    const itemsText = `${this.stats.totalItems} (${this.stats.uniqueItems} types)`;
    FontAtlasRenderer.renderText(
      ctx,
      itemsText,
      Math.round(currentX),
      Math.round(currentY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.VALUE_COLOR
    );

    const itemsValueWidth = FontAtlasRenderer.measureTextByFontId(itemsText, this.constants.FONT_ID);
    currentX += itemsValueWidth + 16; // Add more spacing before category tabs

    // Render category tabs
    this.renderCategoryTabs(ctx, currentX, currentY, fontAtlasImage);

    ctx.restore();
  }

  /**
   * Render category tabs in a single row (compact version for top panel)
   */
  private renderCategoryTabs(
    ctx: CanvasRenderingContext2D,
    startX: number,
    y: number,
    fontAtlas: HTMLImageElement
  ): void {
    const tabHeight = 7;
    let tabX = startX;

    // Define tab labels (same order as in InventoryRenderer)
    const tabs: Array<{ category: InventoryCategory; label: string }> = [
      { category: 'all', label: this.textConstants.CATEGORIES.ALL },
      { category: 'weapons', label: this.textConstants.CATEGORIES.WEAPONS },
      { category: 'shields', label: this.textConstants.CATEGORIES.SHIELDS },
      { category: 'armor', label: this.textConstants.CATEGORIES.ARMOR },
      { category: 'accessories', label: this.textConstants.CATEGORIES.ACCESSORIES },
      { category: 'held', label: this.textConstants.CATEGORIES.HELD },
      { category: 'quest-items', label: this.textConstants.CATEGORIES.QUEST_ITEMS },
    ];

    // Render all tabs in a single row
    for (const tab of tabs) {
      const isActive = tab.category === this.activeCategory;
      const isHovered = tab.category === this.hoveredCategory;

      const color = isActive
        ? this.categoryConstants.ACTIVE_COLOR
        : isHovered
          ? this.categoryConstants.HOVER_COLOR
          : this.categoryConstants.INACTIVE_COLOR;

      // Render background for active tab
      if (isActive) {
        ctx.fillStyle = this.categoryConstants.BACKGROUND_ACTIVE;
        const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, this.categoryConstants.FONT_ID);
        ctx.fillRect(
          Math.round(tabX - this.categoryConstants.TAB_PADDING),
          Math.round(y - 1),
          Math.round(textWidth + this.categoryConstants.TAB_PADDING * 2),
          Math.round(tabHeight + 2)
        );
      }

      FontAtlasRenderer.renderText(
        ctx,
        tab.label,
        Math.round(tabX),
        Math.round(y),
        this.categoryConstants.FONT_ID,
        fontAtlas,
        1,
        'left',
        color
      );

      const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, this.categoryConstants.FONT_ID);
      tabX += textWidth + this.categoryConstants.TAB_SPACING + this.categoryConstants.TAB_PADDING * 2;
    }
  }

  /**
   * Get bounds for all category tabs (for hit testing)
   * @param region - Panel region
   * @returns Array of bounds with associated category
   */
  getCategoryTabBounds(region: PanelRegion): Array<{ category: InventoryCategory; bounds: { x: number; y: number; width: number; height: number } }> {
    const padding = 4;
    const leftX = region.x + padding;
    const currentY = region.y + padding;

    // Calculate starting X position (after stats)
    const goldLabel = this.textConstants.GOLD_LABEL;
    const goldLabelWidth = FontAtlasRenderer.measureTextByFontId(goldLabel, this.constants.FONT_ID);
    const goldValueWidth = FontAtlasRenderer.measureTextByFontId(`${this.stats.gold}`, this.constants.FONT_ID);

    const itemsLabel = this.textConstants.ITEMS_LABEL;
    const itemsLabelWidth = FontAtlasRenderer.measureTextByFontId(itemsLabel, this.constants.FONT_ID);
    const itemsText = `${this.stats.totalItems} (${this.stats.uniqueItems} types)`;
    const itemsValueWidth = FontAtlasRenderer.measureTextByFontId(itemsText, this.constants.FONT_ID);

    let tabX = leftX + goldLabelWidth + 2 + goldValueWidth + 8 + itemsLabelWidth + 2 + itemsValueWidth + 16;

    const tabHeight = 7;
    const result: Array<{ category: InventoryCategory; bounds: { x: number; y: number; width: number; height: number } }> = [];

    // Define tab labels
    const tabs: Array<{ category: InventoryCategory; label: string }> = [
      { category: 'all', label: this.textConstants.CATEGORIES.ALL },
      { category: 'weapons', label: this.textConstants.CATEGORIES.WEAPONS },
      { category: 'shields', label: this.textConstants.CATEGORIES.SHIELDS },
      { category: 'armor', label: this.textConstants.CATEGORIES.ARMOR },
      { category: 'accessories', label: this.textConstants.CATEGORIES.ACCESSORIES },
      { category: 'held', label: this.textConstants.CATEGORIES.HELD },
      { category: 'quest-items', label: this.textConstants.CATEGORIES.QUEST_ITEMS },
    ];

    // All tabs in a single row
    for (const tab of tabs) {
      const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, this.categoryConstants.FONT_ID);
      result.push({
        category: tab.category,
        bounds: {
          x: Math.round(tabX - this.categoryConstants.TAB_PADDING),
          y: Math.round(currentY - 1),
          width: Math.round(textWidth + this.categoryConstants.TAB_PADDING * 2),
          height: Math.round(tabHeight + 2),
        },
      });
      tabX += textWidth + this.categoryConstants.TAB_SPACING + this.categoryConstants.TAB_PADDING * 2;
    }

    return result;
  }
}

/**
 * Panel content for the inventory top panel
 * Shows: Inventory title, Gold, Items count, Category filter tabs, and Sort options in a two-row layout
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { CombatConstants } from '../../combat/CombatConstants';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';
import type { InventoryCategory, InventorySortMode } from '../InventoryViewState';

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
  private sortMode: InventorySortMode;
  private hoveredSort: boolean;
  private readonly constants = CombatConstants.INVENTORY_VIEW.TOP_INFO;
  private readonly categoryConstants = CombatConstants.INVENTORY_VIEW.MAIN_PANEL.CATEGORY_TABS;
  private readonly sortConstants = CombatConstants.INVENTORY_VIEW.MAIN_PANEL.SORT_DROPDOWN;
  private readonly textConstants = CombatConstants.INVENTORY_VIEW.TEXT;

  constructor(
    stats: InventoryStats,
    activeCategory: InventoryCategory,
    hoveredCategory: InventoryCategory | null,
    sortMode: InventorySortMode,
    hoveredSort: boolean
  ) {
    this.stats = stats;
    this.activeCategory = activeCategory;
    this.hoveredCategory = hoveredCategory;
    this.sortMode = sortMode;
    this.hoveredSort = hoveredSort;
  }

  /**
   * Update the content (for when state changes)
   */
  update(
    stats: InventoryStats,
    activeCategory: InventoryCategory,
    hoveredCategory: InventoryCategory | null,
    sortMode: InventorySortMode,
    hoveredSort: boolean
  ): void {
    this.stats = stats;
    this.activeCategory = activeCategory;
    this.hoveredCategory = hoveredCategory;
    this.sortMode = sortMode;
    this.hoveredSort = hoveredSort;
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
    const firstRowY = region.y + padding;

    // First row: "Inventory" title, Gold, Items count, Category tabs
    let currentX = leftX;

    // Render "Inventory" title (using smaller 7px font)
    FontAtlasRenderer.renderText(
      ctx,
      'Inventory',
      Math.round(currentX),
      Math.round(firstRowY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.LABEL_COLOR
    );

    const inventoryTitleWidth = FontAtlasRenderer.measureTextByFontId('Inventory', this.constants.FONT_ID);
    currentX += inventoryTitleWidth + 12; // 12px spacing after "Inventory"

    // Render gold
    const goldLabel = this.textConstants.GOLD_LABEL;
    FontAtlasRenderer.renderText(
      ctx,
      goldLabel,
      Math.round(currentX),
      Math.round(firstRowY),
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
      Math.round(firstRowY),
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
      Math.round(firstRowY),
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
      Math.round(firstRowY),
      this.constants.FONT_ID,
      fontAtlasImage,
      1,
      'left',
      this.constants.VALUE_COLOR
    );

    const itemsValueWidth = FontAtlasRenderer.measureTextByFontId(itemsText, this.constants.FONT_ID);
    currentX += itemsValueWidth;

    // Second row: Category tabs
    const secondRowY = firstRowY + 7; // 7px line height
    this.renderCategoryTabs(ctx, leftX, secondRowY, fontAtlasImage);

    // Third row: Sort options
    const thirdRowY = secondRowY + 7; // 7px line height
    this.renderSortOptions(ctx, leftX, thirdRowY, fontAtlasImage);

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
   * Render sort options in a single row
   */
  private renderSortOptions(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontAtlas: HTMLImageElement
  ): void {
    // Render "Sort:" label
    FontAtlasRenderer.renderText(
      ctx,
      this.textConstants.SORT_LABEL,
      Math.round(x),
      Math.round(y),
      this.sortConstants.FONT_ID,
      fontAtlas,
      1,
      'left',
      this.sortConstants.LABEL_COLOR
    );

    const labelWidth = FontAtlasRenderer.measureTextByFontId(this.textConstants.SORT_LABEL, this.sortConstants.FONT_ID);

    // Render current sort value
    const sortValueX = x + labelWidth + 4; // 4px spacing
    let sortValueText = '';
    switch (this.sortMode) {
      case 'name-asc':
        sortValueText = this.textConstants.SORT_OPTIONS.NAME_ASC;
        break;
      case 'name-desc':
        sortValueText = this.textConstants.SORT_OPTIONS.NAME_DESC;
        break;
      case 'type':
        sortValueText = this.textConstants.SORT_OPTIONS.TYPE;
        break;
      case 'recently-added':
        sortValueText = this.textConstants.SORT_OPTIONS.RECENTLY_ADDED;
        break;
    }

    const valueColor = this.hoveredSort ? this.sortConstants.HOVER_COLOR : this.sortConstants.VALUE_COLOR;

    FontAtlasRenderer.renderText(
      ctx,
      sortValueText,
      Math.round(sortValueX),
      Math.round(y),
      this.sortConstants.FONT_ID,
      fontAtlas,
      1,
      'left',
      valueColor
    );
  }

  /**
   * Get bounds for all category tabs (for hit testing)
   * @param region - Panel region
   * @returns Array of bounds with associated category
   */
  getCategoryTabBounds(region: PanelRegion): Array<{ category: InventoryCategory; bounds: { x: number; y: number; width: number; height: number } }> {
    const padding = 4;
    const leftX = region.x + padding;
    const firstRowY = region.y + padding;

    // Category tabs are now on second row (7px below first row)
    const secondRowY = firstRowY + 7;

    // Starting X position is at left edge (no offset needed)
    let tabX = leftX;

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
          y: Math.round(secondRowY - 1),
          width: Math.round(textWidth + this.categoryConstants.TAB_PADDING * 2),
          height: Math.round(tabHeight + 2),
        },
      });
      tabX += textWidth + this.categoryConstants.TAB_SPACING + this.categoryConstants.TAB_PADDING * 2;
    }

    return result;
  }

  /**
   * Get bounds for sort dropdown (for hit testing)
   * @param region - Panel region
   * @returns Bounds of the sort dropdown
   */
  getSortBounds(region: PanelRegion): { x: number; y: number; width: number; height: number } {
    const padding = 4;
    const leftX = region.x + padding;
    const sortY = region.y + padding + 14; // Third row (14px below first row: 7px for row 1->2, 7px for row 2->3)

    const labelWidth = FontAtlasRenderer.measureTextByFontId(this.textConstants.SORT_LABEL, this.sortConstants.FONT_ID);

    return {
      x: leftX + labelWidth + 4,
      y: sortY,
      width: 60, // Approximate width of sort value text
      height: 7,
    };
  }
}

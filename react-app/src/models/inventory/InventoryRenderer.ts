/**
 * InventoryRenderer - Renders the inventory view UI
 * Handles rendering category tabs, sort dropdown, item list, and pagination
 * Follows GeneralGuidelines.md patterns (FontAtlasRenderer, no ctx.fillText)
 */

import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { CombatConstants } from '../combat/CombatConstants';
import type { InventoryViewState, InventoryCategory, InventorySortMode } from './InventoryViewState';
import type { Equipment } from '../combat/Equipment';

/**
 * Filtered and sorted inventory item with quantity
 */
export interface InventoryItemWithQuantity {
  equipment: Equipment;
  quantity: number;
  equipmentId: string;
}

/**
 * Bounds for clickable UI elements
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * InventoryRenderer class
 * Stateless renderer for inventory UI (all state passed via render() method)
 */
export class InventoryRenderer {
  private readonly constants = CombatConstants.INVENTORY_VIEW;

  /**
   * Calculate how many items can fit on a single page given the available height
   * @param panelHeight - Height of the main panel in pixels
   * @returns Number of items per page
   */
  calculateItemsPerPage(panelHeight: number): number {
    const {
      CATEGORY_TABS,
      SORT_DROPDOWN,
      ITEM_LIST,
      PAGINATION,
      PADDING_TOP,
      PADDING_BOTTOM,
    } = this.constants.MAIN_PANEL;

    // Calculate reserved height (everything except item list)
    const categoryTabsHeight = CATEGORY_TABS.HEIGHT;
    const sortDropdownHeight = SORT_DROPDOWN.HEIGHT;
    const paginationHeight = PAGINATION.HEIGHT; // Always reserve space for pagination
    const paddingHeight = PADDING_TOP + PADDING_BOTTOM;

    const reservedHeight = categoryTabsHeight + sortDropdownHeight + paginationHeight + paddingHeight;
    const availableHeight = panelHeight - reservedHeight;

    // Calculate how many rows fit
    const itemRowHeight = ITEM_LIST.ROW_HEIGHT;
    const maxItems = Math.floor(availableHeight / itemRowHeight);

    return Math.max(1, maxItems); // At least 1 item per page
  }

  /**
   * Render the main inventory panel
   * @param ctx - Canvas context
   * @param state - Current inventory view state
   * @param items - Filtered and sorted items for current page
   * @param totalPages - Total number of pages
   * @param panelBounds - Panel region bounds
   * @param fontAtlas - Font atlas image
   */
  render(
    ctx: CanvasRenderingContext2D,
    state: InventoryViewState,
    items: InventoryItemWithQuantity[],
    totalPages: number,
    panelBounds: Bounds,
    fontAtlas: HTMLImageElement
  ): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Render category tabs at top
    const categoryTabsBounds = this.renderCategoryTabs(
      ctx,
      state.category,
      state.hoveredCategory,
      panelBounds,
      fontAtlas
    );

    // Render sort dropdown below category tabs
    const sortDropdownBounds = this.renderSortDropdown(
      ctx,
      state.sortMode,
      state.hoveredSort,
      panelBounds,
      categoryTabsBounds.y + categoryTabsBounds.height,
      fontAtlas
    );

    // Render item list below sort dropdown
    const itemListBounds = {
      x: panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT,
      y: sortDropdownBounds.y + sortDropdownBounds.height,
      width: panelBounds.width - this.constants.MAIN_PANEL.PADDING_LEFT - this.constants.MAIN_PANEL.PADDING_RIGHT,
      height: panelBounds.height - (sortDropdownBounds.y + sortDropdownBounds.height - panelBounds.y) - this.constants.MAIN_PANEL.PAGINATION.HEIGHT - this.constants.MAIN_PANEL.PADDING_BOTTOM,
    };

    this.renderItemList(
      ctx,
      items,
      state.selectedItemId,
      state.hoveredItemId,
      itemListBounds,
      fontAtlas
    );

    // Render pagination at bottom (only if totalPages > 1)
    if (totalPages > 1) {
      this.renderPagination(
        ctx,
        state.currentPage,
        totalPages,
        state.hoveredPagination,
        panelBounds,
        fontAtlas
      );
    }

    ctx.restore();
  }

  /**
   * Render category tabs
   * @returns Bounds of the category tabs region
   */
  private renderCategoryTabs(
    ctx: CanvasRenderingContext2D,
    activeCategory: InventoryCategory,
    hoveredCategory: InventoryCategory | null,
    panelBounds: Bounds,
    fontAtlas: HTMLImageElement
  ): Bounds {
    const { CATEGORY_TABS } = this.constants.MAIN_PANEL;
    const { CATEGORIES } = this.constants.TEXT;

    const tabY = panelBounds.y + this.constants.MAIN_PANEL.PADDING_TOP;
    const tabHeight = 7; // Single row height
    let tabX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;

    // Define tab labels
    const tabs: Array<{ category: InventoryCategory; label: string }> = [
      { category: 'all', label: CATEGORIES.ALL },
      { category: 'weapons', label: CATEGORIES.WEAPONS },
      { category: 'shields', label: CATEGORIES.SHIELDS },
      { category: 'armor', label: CATEGORIES.ARMOR },
      { category: 'accessories', label: CATEGORIES.ACCESSORIES },
      { category: 'held', label: CATEGORIES.HELD },
      { category: 'quest-items', label: CATEGORIES.QUEST_ITEMS },
    ];

    // Render tabs in two rows (first 4 tabs, then remaining 3)
    const firstRowTabs = tabs.slice(0, 4);
    const secondRowTabs = tabs.slice(4);

    // First row
    tabX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;
    for (const tab of firstRowTabs) {
      const isActive = tab.category === activeCategory;
      const isHovered = tab.category === hoveredCategory;

      const color = isActive
        ? CATEGORY_TABS.ACTIVE_COLOR
        : isHovered
          ? CATEGORY_TABS.HOVER_COLOR
          : CATEGORY_TABS.INACTIVE_COLOR;

      // Render background for active tab
      if (isActive) {
        ctx.fillStyle = CATEGORY_TABS.BACKGROUND_ACTIVE;
        const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, CATEGORY_TABS.FONT_ID);
        ctx.fillRect(
          Math.round(tabX - CATEGORY_TABS.TAB_PADDING),
          Math.round(tabY - 1),
          Math.round(textWidth + CATEGORY_TABS.TAB_PADDING * 2),
          Math.round(tabHeight + 2)
        );
      }

      FontAtlasRenderer.renderText(
        ctx,
        tab.label,
        Math.round(tabX),
        Math.round(tabY),
        CATEGORY_TABS.FONT_ID,
        fontAtlas,
        1,
        'left',
        color
      );

      const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, CATEGORY_TABS.FONT_ID);
      tabX += textWidth + CATEGORY_TABS.TAB_SPACING + CATEGORY_TABS.TAB_PADDING * 2;
    }

    // Second row
    tabX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;
    const secondRowY = tabY + tabHeight;
    for (const tab of secondRowTabs) {
      const isActive = tab.category === activeCategory;
      const isHovered = tab.category === hoveredCategory;

      const color = isActive
        ? CATEGORY_TABS.ACTIVE_COLOR
        : isHovered
          ? CATEGORY_TABS.HOVER_COLOR
          : CATEGORY_TABS.INACTIVE_COLOR;

      // Render background for active tab
      if (isActive) {
        ctx.fillStyle = CATEGORY_TABS.BACKGROUND_ACTIVE;
        const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, CATEGORY_TABS.FONT_ID);
        ctx.fillRect(
          Math.round(tabX - CATEGORY_TABS.TAB_PADDING),
          Math.round(secondRowY - 1),
          Math.round(textWidth + CATEGORY_TABS.TAB_PADDING * 2),
          Math.round(tabHeight + 2)
        );
      }

      FontAtlasRenderer.renderText(
        ctx,
        tab.label,
        Math.round(tabX),
        Math.round(secondRowY),
        CATEGORY_TABS.FONT_ID,
        fontAtlas,
        1,
        'left',
        color
      );

      const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, CATEGORY_TABS.FONT_ID);
      tabX += textWidth + CATEGORY_TABS.TAB_SPACING + CATEGORY_TABS.TAB_PADDING * 2;
    }

    return {
      x: panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT,
      y: tabY,
      width: panelBounds.width - this.constants.MAIN_PANEL.PADDING_LEFT - this.constants.MAIN_PANEL.PADDING_RIGHT,
      height: CATEGORY_TABS.HEIGHT,
    };
  }

  /**
   * Render sort dropdown
   * @returns Bounds of the sort dropdown region
   */
  private renderSortDropdown(
    ctx: CanvasRenderingContext2D,
    sortMode: InventorySortMode,
    hoveredSort: boolean,
    panelBounds: Bounds,
    yOffset: number,
    fontAtlas: HTMLImageElement
  ): Bounds {
    const { SORT_DROPDOWN } = this.constants.MAIN_PANEL;
    const { SORT_LABEL, SORT_OPTIONS } = this.constants.TEXT;

    const sortY = yOffset + 2; // 2px spacing
    const sortX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;

    // Render "Sort:" label
    FontAtlasRenderer.renderText(
      ctx,
      SORT_LABEL,
      Math.round(sortX),
      Math.round(sortY),
      SORT_DROPDOWN.FONT_ID,
      fontAtlas,
      1,
      'left',
      SORT_DROPDOWN.LABEL_COLOR
    );

    const labelWidth = FontAtlasRenderer.measureTextByFontId(SORT_LABEL, SORT_DROPDOWN.FONT_ID);

    // Render current sort value
    const sortValueX = sortX + labelWidth + 4; // 4px spacing
    let sortValueText = '';
    switch (sortMode) {
      case 'name-asc':
        sortValueText = SORT_OPTIONS.NAME_ASC;
        break;
      case 'name-desc':
        sortValueText = SORT_OPTIONS.NAME_DESC;
        break;
      case 'type':
        sortValueText = SORT_OPTIONS.TYPE;
        break;
      case 'recently-added':
        sortValueText = SORT_OPTIONS.RECENTLY_ADDED;
        break;
    }

    const valueColor = hoveredSort ? SORT_DROPDOWN.HOVER_COLOR : SORT_DROPDOWN.VALUE_COLOR;

    FontAtlasRenderer.renderText(
      ctx,
      sortValueText,
      Math.round(sortValueX),
      Math.round(sortY),
      SORT_DROPDOWN.FONT_ID,
      fontAtlas,
      1,
      'left',
      valueColor
    );

    return {
      x: sortX,
      y: sortY,
      width: panelBounds.width - this.constants.MAIN_PANEL.PADDING_LEFT - this.constants.MAIN_PANEL.PADDING_RIGHT,
      height: SORT_DROPDOWN.HEIGHT,
    };
  }

  /**
   * Render item list
   */
  private renderItemList(
    ctx: CanvasRenderingContext2D,
    items: InventoryItemWithQuantity[],
    selectedItemId: string | null,
    hoveredItemId: string | null,
    bounds: Bounds,
    fontAtlas: HTMLImageElement
  ): void {
    const { ITEM_LIST } = this.constants.MAIN_PANEL;
    const { EMPTY_INVENTORY } = this.constants.TEXT;

    if (items.length === 0) {
      // Render "empty inventory" message
      const emptyTextY = bounds.y + 10;
      FontAtlasRenderer.renderText(
        ctx,
        EMPTY_INVENTORY,
        Math.round(bounds.x + bounds.width / 2),
        Math.round(emptyTextY),
        ITEM_LIST.FONT_ID,
        fontAtlas,
        1,
        'center',
        ITEM_LIST.ITEM_QUANTITY_COLOR
      );
      return;
    }

    // Render each item
    let itemY = bounds.y;
    for (const item of items) {
      const isSelected = item.equipmentId === selectedItemId;
      const isHovered = item.equipmentId === hoveredItemId;
      const isQuestItem = item.equipment.typeTags?.includes('quest-item') ?? false;

      // Determine text color
      let nameColor: string = ITEM_LIST.ITEM_NAME_COLOR;
      if (isSelected) {
        nameColor = ITEM_LIST.SELECTED_COLOR;
      } else if (isHovered) {
        nameColor = ITEM_LIST.HOVER_COLOR;
      } else if (isQuestItem) {
        nameColor = ITEM_LIST.QUEST_ITEM_COLOR;
      }

      // Render item name
      const itemText = item.equipment.name;
      FontAtlasRenderer.renderText(
        ctx,
        itemText,
        Math.round(bounds.x + ITEM_LIST.ITEM_PADDING),
        Math.round(itemY),
        ITEM_LIST.FONT_ID,
        fontAtlas,
        1,
        'left',
        nameColor
      );

      // Render quantity (if > 1)
      if (item.quantity > 1) {
        const quantityText = `x${item.quantity}`;
        const quantityX = bounds.x + bounds.width - ITEM_LIST.ITEM_PADDING;
        FontAtlasRenderer.renderText(
          ctx,
          quantityText,
          Math.round(quantityX),
          Math.round(itemY),
          ITEM_LIST.FONT_ID,
          fontAtlas,
          1,
          'right',
          ITEM_LIST.ITEM_QUANTITY_COLOR
        );
      }

      itemY += ITEM_LIST.ROW_HEIGHT;

      // Stop if we've exceeded the bounds
      if (itemY > bounds.y + bounds.height) {
        break;
      }
    }
  }

  /**
   * Render pagination controls
   */
  private renderPagination(
    ctx: CanvasRenderingContext2D,
    currentPage: number,
    totalPages: number,
    hoveredPagination: 'prev' | 'next' | null,
    panelBounds: Bounds,
    fontAtlas: HTMLImageElement
  ): void {
    const { PAGINATION } = this.constants.MAIN_PANEL;

    const paginationY = panelBounds.y + panelBounds.height - PAGINATION.HEIGHT - this.constants.MAIN_PANEL.PADDING_BOTTOM;
    const paginationX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;

    // Render "< Prev" button
    const canGoPrev = currentPage > 0;
    const prevColor = !canGoPrev
      ? PAGINATION.BUTTON_COLOR_DISABLED
      : hoveredPagination === 'prev'
        ? PAGINATION.BUTTON_COLOR_HOVER
        : PAGINATION.BUTTON_COLOR_NORMAL;

    FontAtlasRenderer.renderText(
      ctx,
      '< Prev',
      Math.round(paginationX),
      Math.round(paginationY),
      PAGINATION.FONT_ID,
      fontAtlas,
      1,
      'left',
      prevColor
    );

    // Render page indicator (centered)
    const pageText = `Page ${currentPage + 1} / ${totalPages}`;
    const centerX = panelBounds.x + panelBounds.width / 2;
    FontAtlasRenderer.renderText(
      ctx,
      pageText,
      Math.round(centerX),
      Math.round(paginationY),
      PAGINATION.FONT_ID,
      fontAtlas,
      1,
      'center',
      PAGINATION.TEXT_COLOR
    );

    // Render "Next >" button
    const canGoNext = currentPage < totalPages - 1;
    const nextColor = !canGoNext
      ? PAGINATION.BUTTON_COLOR_DISABLED
      : hoveredPagination === 'next'
        ? PAGINATION.BUTTON_COLOR_HOVER
        : PAGINATION.BUTTON_COLOR_NORMAL;

    const nextX = panelBounds.x + panelBounds.width - this.constants.MAIN_PANEL.PADDING_RIGHT;
    FontAtlasRenderer.renderText(
      ctx,
      'Next >',
      Math.round(nextX),
      Math.round(paginationY),
      PAGINATION.FONT_ID,
      fontAtlas,
      1,
      'right',
      nextColor
    );
  }

  /**
   * Get bounds for all category tabs (for hit testing)
   * @returns Array of bounds with associated category
   */
  getCategoryTabBounds(panelBounds: Bounds): Array<{ category: InventoryCategory; bounds: Bounds }> {
    const { CATEGORY_TABS } = this.constants.MAIN_PANEL;
    const { CATEGORIES } = this.constants.TEXT;

    const tabY = panelBounds.y + this.constants.MAIN_PANEL.PADDING_TOP;
    const tabHeight = 7;
    const result: Array<{ category: InventoryCategory; bounds: Bounds }> = [];

    // Define tab labels
    const tabs: Array<{ category: InventoryCategory; label: string }> = [
      { category: 'all', label: CATEGORIES.ALL },
      { category: 'weapons', label: CATEGORIES.WEAPONS },
      { category: 'shields', label: CATEGORIES.SHIELDS },
      { category: 'armor', label: CATEGORIES.ARMOR },
      { category: 'accessories', label: CATEGORIES.ACCESSORIES },
      { category: 'held', label: CATEGORIES.HELD },
      { category: 'quest-items', label: CATEGORIES.QUEST_ITEMS },
    ];

    // First row
    const firstRowTabs = tabs.slice(0, 4);
    const secondRowTabs = tabs.slice(4);

    let tabX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;
    for (const tab of firstRowTabs) {
      const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, CATEGORY_TABS.FONT_ID);
      result.push({
        category: tab.category,
        bounds: {
          x: Math.round(tabX - CATEGORY_TABS.TAB_PADDING),
          y: Math.round(tabY - 1),
          width: Math.round(textWidth + CATEGORY_TABS.TAB_PADDING * 2),
          height: Math.round(tabHeight + 2),
        },
      });
      tabX += textWidth + CATEGORY_TABS.TAB_SPACING + CATEGORY_TABS.TAB_PADDING * 2;
    }

    // Second row
    tabX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;
    const secondRowY = tabY + tabHeight;
    for (const tab of secondRowTabs) {
      const textWidth = FontAtlasRenderer.measureTextByFontId(tab.label, CATEGORY_TABS.FONT_ID);
      result.push({
        category: tab.category,
        bounds: {
          x: Math.round(tabX - CATEGORY_TABS.TAB_PADDING),
          y: Math.round(secondRowY - 1),
          width: Math.round(textWidth + CATEGORY_TABS.TAB_PADDING * 2),
          height: Math.round(tabHeight + 2),
        },
      });
      tabX += textWidth + CATEGORY_TABS.TAB_SPACING + CATEGORY_TABS.TAB_PADDING * 2;
    }

    return result;
  }

  /**
   * Get bounds for sort dropdown (for hit testing)
   */
  getSortDropdownBounds(panelBounds: Bounds): Bounds {
    const { CATEGORY_TABS, SORT_DROPDOWN } = this.constants.MAIN_PANEL;
    const { SORT_LABEL } = this.constants.TEXT;

    const categoryTabsHeight = CATEGORY_TABS.HEIGHT;
    const sortY = panelBounds.y + this.constants.MAIN_PANEL.PADDING_TOP + categoryTabsHeight + 2;
    const sortX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;

    const labelWidth = FontAtlasRenderer.measureTextByFontId(SORT_LABEL, SORT_DROPDOWN.FONT_ID);

    return {
      x: sortX + labelWidth + 4,
      y: sortY,
      width: 60, // Approximate width of sort value text
      height: 7,
    };
  }

  /**
   * Get bounds for all item rows (for hit testing)
   */
  getItemRowBounds(
    items: InventoryItemWithQuantity[],
    panelBounds: Bounds
  ): Array<{ equipmentId: string; bounds: Bounds }> {
    const { CATEGORY_TABS, SORT_DROPDOWN, ITEM_LIST } = this.constants.MAIN_PANEL;

    const categoryTabsHeight = CATEGORY_TABS.HEIGHT;
    const sortDropdownHeight = SORT_DROPDOWN.HEIGHT;
    const listStartY = panelBounds.y + this.constants.MAIN_PANEL.PADDING_TOP + categoryTabsHeight + sortDropdownHeight + 2;

    const result: Array<{ equipmentId: string; bounds: Bounds }> = [];
    let itemY = listStartY;

    for (const item of items) {
      result.push({
        equipmentId: item.equipmentId,
        bounds: {
          x: panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT,
          y: itemY,
          width: panelBounds.width - this.constants.MAIN_PANEL.PADDING_LEFT - this.constants.MAIN_PANEL.PADDING_RIGHT,
          height: ITEM_LIST.ROW_HEIGHT,
        },
      });

      itemY += ITEM_LIST.ROW_HEIGHT;

      // Stop if we've exceeded the bounds
      const maxY = panelBounds.y + panelBounds.height - this.constants.MAIN_PANEL.PAGINATION.HEIGHT - this.constants.MAIN_PANEL.PADDING_BOTTOM;
      if (itemY > maxY) {
        break;
      }
    }

    return result;
  }

  /**
   * Get bounds for pagination buttons (for hit testing)
   */
  getPaginationButtonBounds(panelBounds: Bounds, totalPages: number): {
    prev: Bounds | null;
    next: Bounds | null;
  } {
    if (totalPages <= 1) {
      return { prev: null, next: null };
    }

    const { PAGINATION } = this.constants.MAIN_PANEL;

    const paginationY = panelBounds.y + panelBounds.height - PAGINATION.HEIGHT - this.constants.MAIN_PANEL.PADDING_BOTTOM;
    const paginationX = panelBounds.x + this.constants.MAIN_PANEL.PADDING_LEFT;

    const prevWidth = FontAtlasRenderer.measureTextByFontId('< Prev', PAGINATION.FONT_ID);
    const nextWidth = FontAtlasRenderer.measureTextByFontId('Next >', PAGINATION.FONT_ID);

    return {
      prev: {
        x: paginationX,
        y: paginationY,
        width: prevWidth,
        height: 7,
      },
      next: {
        x: panelBounds.x + panelBounds.width - this.constants.MAIN_PANEL.PADDING_RIGHT - nextWidth,
        y: paginationY,
        width: nextWidth,
        height: 7,
      },
    };
  }
}

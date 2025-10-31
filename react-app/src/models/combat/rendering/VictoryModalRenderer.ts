import { CombatConstants } from "../CombatConstants";
import { FontAtlasRenderer } from "../../../utils/FontAtlasRenderer";
import { FontRegistry } from "../../../utils/FontRegistry";
import type { CombatState } from "../CombatState";
import type { VictoryRewards } from "../VictoryRewards";
import { SpriteRegistry } from "../../../utils/SpriteRegistry";

/**
 * Renders the victory screen modal: overlay, panel, rewards info, item grid, and continue button.
 */
export class VictoryModalRenderer {
  /**
   * Renders the complete victory modal on the given context.
   * @param ctx Canvas rendering context
   * @param state Current combat state
   * @param rewards Victory rewards to display
   * @param hoveredItemIndex Index of hovered item (or null)
   * @param selectedItemIndices Set of selected item indices
   * @param continueHovered Whether the continue button is hovered
   * @param fonts Font atlas images
   * @param sprites Sprite atlas images
   * @param panelBounds Bounds of the canvas for centering
   */
  render(
    ctx: CanvasRenderingContext2D,
    _state: CombatState,
    rewards: VictoryRewards,
    hoveredItemIndex: number | null,
    selectedItemIndices: Set<number>,
    continueHovered: boolean,
    fonts: Map<string, HTMLImageElement>,
    sprites: Map<string, HTMLImageElement>,
    panelBounds: { width: number; height: number }
  ): void {
    // 1. Render full-screen overlay
    this.renderOverlay(ctx, panelBounds);

    // 2. Use fixed modal dimensions and position (grid-based: columns 1-19, rows 3-13)
    const modalX = CombatConstants.VICTORY_SCREEN.MODAL_X;
    const modalY = CombatConstants.VICTORY_SCREEN.MODAL_Y;
    const modalWidth = CombatConstants.VICTORY_SCREEN.MODAL_WIDTH;
    const modalHeight = CombatConstants.VICTORY_SCREEN.MODAL_HEIGHT;

    // 3. Render modal panel background
    this.renderPanelBackground(ctx, modalX, modalY, modalWidth, modalHeight);

    // 4. Render title
    let contentY = this.renderTitle(ctx, modalX, modalY, modalWidth, fonts);

    // 5. Render header (subtitle)
    contentY = this.renderHeader(ctx, modalX, contentY, modalWidth, fonts);

    // 6. Render XP and Gold sections (same row)
    let currentY = this.renderXPGold(ctx, modalX, contentY, modalWidth, rewards, fonts);

    // 7. Render items section if any items exist
    if (rewards.items.length > 0) {
      currentY = this.renderItemsSection(
        ctx,
        modalX,
        currentY,
        rewards,
        hoveredItemIndex,
        selectedItemIndices,
        fonts,
        sprites
      );
    }

    // 6. Render continue button
    this.renderContinueButton(
      ctx,
      modalX,
      currentY,
      modalWidth,
      continueHovered,
      selectedItemIndices.size === rewards.items.length,
      fonts
    );
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, panelBounds: { width: number; height: number }): void {
    ctx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.VICTORY_SCREEN.OVERLAY_OPACITY})`;
    ctx.fillRect(0, 0, panelBounds.width, panelBounds.height);
  }

  private renderPanelBackground(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalY: number,
    modalWidth: number,
    modalHeight: number
  ): void {
    ctx.fillStyle = '#000000';
    ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
  }

  private renderTitle(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalY: number,
    modalWidth: number,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const titleFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID);
    const titleFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID);

    if (!titleFont || !titleFontImage) {
      console.warn("[VictoryModalRenderer] Victory title font not loaded");
      return modalY + CombatConstants.VICTORY_SCREEN.MODAL_PADDING + 15;
    }

    const titleText = CombatConstants.VICTORY_SCREEN.TITLE_TEXT;
    const titleWidth = FontAtlasRenderer.measureText(titleText, titleFont);

    // Center horizontally within modal
    const titleX = Math.floor(modalX + (modalWidth - titleWidth) / 2);
    const titleY = modalY + CombatConstants.VICTORY_SCREEN.MODAL_PADDING;

    FontAtlasRenderer.renderTextWithShadow(
      ctx,
      titleText,
      titleX,
      titleY,
      CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID,
      titleFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.TITLE_COLOR
    );

    return titleY + titleFont.charHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING;
  }

  private renderHeader(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    startY: number,
    modalWidth: number,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const headerFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.HEADER_FONT_ID);
    const headerFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.HEADER_FONT_ID);

    if (!headerFont || !headerFontImage) {
      console.warn("[VictoryModalRenderer] Victory header font not loaded");
      return startY + 7;
    }

    const headerText = CombatConstants.VICTORY_SCREEN.HEADER_TEXT;
    const headerWidth = FontAtlasRenderer.measureText(headerText, headerFont);

    // Center horizontally within modal
    const headerX = Math.floor(modalX + (modalWidth - headerWidth) / 2);
    const headerY = startY;

    FontAtlasRenderer.renderText(
      ctx,
      headerText,
      headerX,
      headerY,
      CombatConstants.VICTORY_SCREEN.HEADER_FONT_ID,
      headerFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.HEADER_COLOR
    );

    return headerY + headerFont.charHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING;
  }

  private renderXPGold(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    startY: number,
    modalWidth: number,
    rewards: VictoryRewards,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const sectionFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID);
    const sectionFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID);

    if (!sectionFont || !sectionFontImage) {
      console.warn("[VictoryModalRenderer] Victory section font not loaded");
      return startY + 40;
    }

    const currentY = startY;

    // Render XP and Gold on the same row with 24px spacing
    const xpText = `XP: ${rewards.xp}`;
    const goldText = `Gold: ${rewards.gold}`;

    const xpWidth = FontAtlasRenderer.measureText(xpText, sectionFont);
    const goldWidth = FontAtlasRenderer.measureText(goldText, sectionFont);
    const totalWidth = xpWidth + CombatConstants.VICTORY_SCREEN.XP_GOLD_SPACING + goldWidth;

    // Center the group horizontally
    const startX = Math.floor(modalX + (modalWidth - totalWidth) / 2);

    // Render XP
    FontAtlasRenderer.renderText(
      ctx,
      xpText,
      startX,
      currentY,
      CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID,
      sectionFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.SECTION_VALUE_COLOR
    );

    // Render Gold (24px to the right of XP)
    FontAtlasRenderer.renderText(
      ctx,
      goldText,
      startX + xpWidth + CombatConstants.VICTORY_SCREEN.XP_GOLD_SPACING,
      currentY,
      CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID,
      sectionFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.SECTION_VALUE_COLOR
    );

    return currentY + sectionFont.charHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING;
  }

  private renderItemsSection(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    startY: number,
    rewards: VictoryRewards,
    hoveredItemIndex: number | null,
    selectedItemIndices: Set<number>,
    fonts: Map<string, HTMLImageElement>,
    sprites: Map<string, HTMLImageElement>
  ): number {
    const sectionFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID);
    const sectionFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID);

    if (!sectionFont || !sectionFontImage) {
      console.warn("[VictoryModalRenderer] Victory section font not loaded");
      return startY + 60;
    }

    const leftMargin = modalX + CombatConstants.VICTORY_SCREEN.MODAL_PADDING;
    let currentY = startY;

    // Render "Items:" label
    const itemsText = "Items:";
    FontAtlasRenderer.renderText(
      ctx,
      itemsText,
      leftMargin,
      currentY,
      CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID,
      sectionFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.SECTION_LABEL_COLOR
    );

    currentY += sectionFont.charHeight + 4; // Small gap before grid

    // Render item grid (3 columns)
    const cellSize = CombatConstants.VICTORY_SCREEN.ITEM_CELL_SIZE;
    const spacing = CombatConstants.VICTORY_SCREEN.ITEM_SPACING;
    const columns = CombatConstants.VICTORY_SCREEN.ITEM_GRID_COLUMNS;

    rewards.items.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      const cellX = leftMargin + col * (cellSize + spacing);
      const cellY = currentY + row * (cellSize + spacing);

      // Render item cell
      this.renderItemCell(
        ctx,
        cellX,
        cellY,
        item.spriteId,
        index === hoveredItemIndex,
        selectedItemIndices.has(index),
        sprites
      );
    });

    // Calculate height of grid
    const rows = Math.ceil(rewards.items.length / columns);
    currentY += rows * (cellSize + spacing);

    return currentY;
  }

  private renderItemCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    spriteId: string,
    isHovered: boolean,
    isSelected: boolean,
    sprites: Map<string, HTMLImageElement>
  ): void {
    const cellSize = CombatConstants.VICTORY_SCREEN.ITEM_CELL_SIZE;

    // Render background
    ctx.fillStyle = CombatConstants.VICTORY_SCREEN.ITEM_BACKGROUND;
    ctx.fillRect(x, y, cellSize, cellSize);

    // Render border (changes color based on state)
    if (isSelected) {
      ctx.strokeStyle = CombatConstants.VICTORY_SCREEN.ITEM_SELECTED_COLOR;
      ctx.lineWidth = 2;
    } else if (isHovered) {
      ctx.strokeStyle = CombatConstants.VICTORY_SCREEN.ITEM_HOVER_COLOR;
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = '#666666'; // Default grey
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(x, y, cellSize, cellSize);

    // Render sprite (centered in cell)
    const spriteData = SpriteRegistry.getById(spriteId);
    if (!spriteData) {
      console.warn(`[VictoryModalRenderer] Sprite data not found: ${spriteId}`);
      return;
    }

    const spriteImage = sprites.get(spriteData.spriteSheet);
    if (!spriteImage) {
      console.warn(`[VictoryModalRenderer] Sprite sheet not loaded: ${spriteData.spriteSheet}`);
      return;
    }

    // Center sprite in cell (assuming 12x12 sprites)
    const spriteSize = 12;
    const srcX = spriteData.x * spriteSize;
    const srcY = spriteData.y * spriteSize;
    const srcWidth = (spriteData.width || 1) * spriteSize;
    const srcHeight = (spriteData.height || 1) * spriteSize;

    ctx.drawImage(
      spriteImage,
      srcX,
      srcY,
      srcWidth,
      srcHeight,
      x,
      y,
      srcWidth,
      srcHeight
    );
  }

  private renderContinueButton(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    startY: number,
    modalWidth: number,
    isHovered: boolean,
    isEnabled: boolean,
    fonts: Map<string, HTMLImageElement>
  ): void {
    const buttonFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.CONTINUE_FONT_ID);
    const buttonFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.CONTINUE_FONT_ID);

    if (!buttonFont || !buttonFontImage) {
      console.warn("[VictoryModalRenderer] Victory button font not loaded");
      return;
    }

    const buttonText = CombatConstants.VICTORY_SCREEN.CONTINUE_TEXT;
    const buttonWidth = FontAtlasRenderer.measureText(buttonText, buttonFont);

    // Center button horizontally
    const buttonX = Math.floor(modalX + (modalWidth - buttonWidth) / 2);
    const buttonY = startY;

    // Determine button color
    let buttonColor: string;
    if (isEnabled) {
      buttonColor = isHovered
        ? CombatConstants.VICTORY_SCREEN.CONTINUE_COLOR_HOVER
        : CombatConstants.VICTORY_SCREEN.CONTINUE_COLOR_NORMAL;
    } else {
      buttonColor = CombatConstants.VICTORY_SCREEN.CONTINUE_COLOR_DISABLED;
    }

    FontAtlasRenderer.renderText(
      ctx,
      buttonText,
      buttonX,
      buttonY,
      CombatConstants.VICTORY_SCREEN.CONTINUE_FONT_ID,
      buttonFontImage,
      1,
      'left',
      buttonColor
    );
  }

  /**
   * Calculates item grid cell bounds for hit detection.
   * Returns bounds for each item in the grid.
   */
  getItemBounds(
    _panelBounds: { width: number; height: number },
    rewards: VictoryRewards
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const modalX = CombatConstants.VICTORY_SCREEN.MODAL_X;
    const modalY = CombatConstants.VICTORY_SCREEN.MODAL_Y;

    const titleFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID);
    const headerFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.HEADER_FONT_ID);
    const sectionFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID);

    const titleHeight = titleFont ? titleFont.charHeight : 15;
    const headerHeight = headerFont ? headerFont.charHeight : 7;
    const sectionHeight = sectionFont ? sectionFont.charHeight : 7;

    // Calculate starting Y for items (same as render logic)
    let currentY = modalY + CombatConstants.VICTORY_SCREEN.MODAL_PADDING;
    currentY += titleHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING; // Title
    currentY += headerHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING; // Header
    currentY += sectionHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING; // XP/Gold row
    currentY += sectionHeight + 4; // Items label + gap

    const leftMargin = modalX + CombatConstants.VICTORY_SCREEN.MODAL_PADDING;
    const cellSize = CombatConstants.VICTORY_SCREEN.ITEM_CELL_SIZE;
    const spacing = CombatConstants.VICTORY_SCREEN.ITEM_SPACING;
    const columns = CombatConstants.VICTORY_SCREEN.ITEM_GRID_COLUMNS;

    return rewards.items.map((_, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      return {
        x: leftMargin + col * (cellSize + spacing),
        y: currentY + row * (cellSize + spacing),
        width: cellSize,
        height: cellSize,
      };
    });
  }

  /**
   * Calculates continue button bounds for hit detection.
   */
  getContinueButtonBounds(
    _panelBounds: { width: number; height: number },
    rewards: VictoryRewards
  ): { x: number; y: number; width: number; height: number } {
    const modalX = CombatConstants.VICTORY_SCREEN.MODAL_X;
    const modalY = CombatConstants.VICTORY_SCREEN.MODAL_Y;
    const modalWidth = CombatConstants.VICTORY_SCREEN.MODAL_WIDTH;

    const buttonFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.CONTINUE_FONT_ID);
    if (!buttonFont) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const titleFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID);
    const headerFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.HEADER_FONT_ID);
    const sectionFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.SECTION_FONT_ID);

    const titleHeight = titleFont ? titleFont.charHeight : 15;
    const headerHeight = headerFont ? headerFont.charHeight : 7;
    const sectionHeight = sectionFont ? sectionFont.charHeight : 7;

    // Calculate button Y (same as render logic)
    let currentY = modalY + CombatConstants.VICTORY_SCREEN.MODAL_PADDING;
    currentY += titleHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING; // Title
    currentY += headerHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING; // Header
    currentY += sectionHeight + CombatConstants.VICTORY_SCREEN.SECTION_SPACING; // XP/Gold row

    if (rewards.items.length > 0) {
      currentY += sectionHeight + 4; // Items label + gap
      const rows = Math.ceil(rewards.items.length / CombatConstants.VICTORY_SCREEN.ITEM_GRID_COLUMNS);
      const cellSize = CombatConstants.VICTORY_SCREEN.ITEM_CELL_SIZE;
      const spacing = CombatConstants.VICTORY_SCREEN.ITEM_SPACING;
      currentY += rows * (cellSize + spacing);
    }

    const buttonText = CombatConstants.VICTORY_SCREEN.CONTINUE_TEXT;
    const buttonWidth = FontAtlasRenderer.measureText(buttonText, buttonFont);
    const buttonX = Math.floor(modalX + (modalWidth - buttonWidth) / 2);

    return {
      x: buttonX,
      y: currentY,
      width: buttonWidth,
      height: buttonFont.charHeight,
    };
  }
}

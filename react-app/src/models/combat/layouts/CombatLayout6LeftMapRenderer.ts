import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { HorizontalVerticalLayout, type LayoutRegion } from './HorizontalVerticalLayout';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';

/**
 * Layout 6: Left Map with Top Turn Order
 * - Top-left: Turn order panel (spans above map)
 * - Middle-left: Map viewport
 * - Bottom-left: Combat log panel
 * - Right column: Current unit (top) + Target unit (bottom) split horizontally
 */
export class CombatLayout6LeftMapRenderer implements CombatLayoutRenderer {
  private readonly RIGHT_COLUMN_WIDTH = 144; // 12 tiles
  private readonly TURN_ORDER_HEIGHT = 24; // 2 tiles
  private readonly COMBAT_LOG_HEIGHT = 36; // 3 tiles
  private readonly PANEL_PADDING = 1; // 1px padding
  private readonly LINE_SPACING = 8;
  private readonly frameLayout: HorizontalVerticalLayout;

  // Scroll button tracking
  private scrollUpButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private scrollDownButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private scrollRightButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private scrollLeftButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private mapScrollUpButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private mapScrollDownButtonBounds: { x: number; y: number; width: number; height: number } | null = null;

  constructor() {
    // Define the layout regions using tile-based dimensions
    // Canvas is 384x216 (32x18 tiles at 12px each)
    const regions: LayoutRegion[] = [
      // Top-left: Turn order (20 tiles wide, 2 tiles tall)
      { name: 'turnOrder', x: 0, y: 0, widthTiles: 20, heightTiles: 2 },

      // Middle-left: Map area (20 tiles wide, 12 tiles tall)
      { name: 'map', x: 0, y: 24, widthTiles: 20, heightTiles: 12 },

      // Spacer region (20 tiles wide, 4 tiles tall) - creates divider at y=168, extends to bottom
      { name: 'spacer', x: 0, y: 168, widthTiles: 20, heightTiles: 4 },

      // Top-right: Current unit (12 tiles wide, 9 tiles tall)
      { name: 'currentUnit', x: 240, y: 0, widthTiles: 12, heightTiles: 9 },

      // Bottom-right: Target unit (12 tiles wide, 9 tiles tall)
      { name: 'targetUnit', x: 240, y: 108, widthTiles: 12, heightTiles: 9 },
    ];

    this.frameLayout = new HorizontalVerticalLayout({ regions });
  }

  getMapViewport(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
    const leftColumnWidth = canvasWidth - this.RIGHT_COLUMN_WIDTH;
    const mapHeight = canvasHeight - this.TURN_ORDER_HEIGHT - this.COMBAT_LOG_HEIGHT;
    return {
      x: 0,
      y: this.TURN_ORDER_HEIGHT,
      width: leftColumnWidth,
      height: mapHeight,
    };
  }

  /**
   * Gets the clipping region for the map viewport in tile coordinates.
   * This defines which tiles are visible within the map viewport.
   * @returns Object with minCol, maxCol, minRow, maxRow (inclusive)
   */
  getMapClipRegion(): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
    return {
      minCol: 0,
      maxCol: 19,
      minRow: 3,
      maxRow: 13,
    };
  }

  /**
   * Handle click events on the map scroll buttons.
   * Returns 'right', 'left', 'up', 'down', or null.
   */
  handleMapScrollClick(x: number, y: number): 'right' | 'left' | 'up' | 'down' | null {
    // Check scroll right button
    if (this.scrollRightButtonBounds &&
        x >= this.scrollRightButtonBounds.x &&
        x <= this.scrollRightButtonBounds.x + this.scrollRightButtonBounds.width &&
        y >= this.scrollRightButtonBounds.y &&
        y <= this.scrollRightButtonBounds.y + this.scrollRightButtonBounds.height) {
      return 'right';
    }

    // Check scroll left button
    if (this.scrollLeftButtonBounds &&
        x >= this.scrollLeftButtonBounds.x &&
        x <= this.scrollLeftButtonBounds.x + this.scrollLeftButtonBounds.width &&
        y >= this.scrollLeftButtonBounds.y &&
        y <= this.scrollLeftButtonBounds.y + this.scrollLeftButtonBounds.height) {
      return 'left';
    }

    // Check scroll up button
    if (this.mapScrollUpButtonBounds &&
        x >= this.mapScrollUpButtonBounds.x &&
        x <= this.mapScrollUpButtonBounds.x + this.mapScrollUpButtonBounds.width &&
        y >= this.mapScrollUpButtonBounds.y &&
        y <= this.mapScrollUpButtonBounds.y + this.mapScrollUpButtonBounds.height) {
      return 'up';
    }

    // Check scroll down button
    if (this.mapScrollDownButtonBounds &&
        x >= this.mapScrollDownButtonBounds.x &&
        x <= this.mapScrollDownButtonBounds.x + this.mapScrollDownButtonBounds.width &&
        y >= this.mapScrollDownButtonBounds.y &&
        y <= this.mapScrollDownButtonBounds.y + this.mapScrollDownButtonBounds.height) {
      return 'down';
    }

    return null;
  }

  /**
   * Handle click events on the combat log scroll buttons.
   * Returns true if a button was clicked, false otherwise.
   */
  handleCombatLogClick(x: number, y: number, combatLogManager: any): boolean {
    // Check scroll up button
    if (this.scrollUpButtonBounds &&
        x >= this.scrollUpButtonBounds.x &&
        x <= this.scrollUpButtonBounds.x + this.scrollUpButtonBounds.width &&
        y >= this.scrollUpButtonBounds.y &&
        y <= this.scrollUpButtonBounds.y + this.scrollUpButtonBounds.height) {
      combatLogManager.scrollUp(1);
      return true;
    }

    // Check scroll down button
    if (this.scrollDownButtonBounds &&
        x >= this.scrollDownButtonBounds.x &&
        x <= this.scrollDownButtonBounds.x + this.scrollDownButtonBounds.width &&
        y >= this.scrollDownButtonBounds.y &&
        y <= this.scrollDownButtonBounds.y + this.scrollDownButtonBounds.height) {
      combatLogManager.scrollDown(1);
      return true;
    }

    return false;
  }

  renderLayout(context: LayoutRenderContext): void {
    const { ctx, canvasWidth, canvasHeight, fontAtlasImage, spriteImages, spriteSize } = context;

    if (!fontAtlasImage) return;

    const leftColumnWidth = canvasWidth - this.RIGHT_COLUMN_WIDTH;
    const mapHeight = canvasHeight - this.TURN_ORDER_HEIGHT - this.COMBAT_LOG_HEIGHT;

    // Top-left: Turn order
    this.renderTurnOrderPanel(context, 0, 0, leftColumnWidth, this.TURN_ORDER_HEIGHT);

    // Bottom-left: Combat log
    this.renderCombatLogPanel(
      context,
      0,
      this.TURN_ORDER_HEIGHT + mapHeight,
      leftColumnWidth,
      this.COMBAT_LOG_HEIGHT
    );

    // Right column - split horizontally
    const rightColumnHeight = canvasHeight / 2;

    // Top-right: Current unit
    this.renderCurrentUnitPanel(
      context,
      leftColumnWidth,
      0,
      this.RIGHT_COLUMN_WIDTH,
      rightColumnHeight
    );

    // Bottom-right: Target unit
    this.renderTargetUnitPanel(
      context,
      leftColumnWidth,
      rightColumnHeight,
      this.RIGHT_COLUMN_WIDTH,
      rightColumnHeight
    );

    // Render the frame layout dividers on top of the 9-slice panels
    this.frameLayout.render(ctx, spriteImages, spriteSize);

    // Render scroll buttons on top of everything
    this.renderScrollButtons(context);
  }

  /**
   * Render map scroll arrows for horizontal and vertical scrolling.
   * Call this after rendering the layout.
   */
  renderMapScrollArrows(context: LayoutRenderContext, canScrollRight: boolean, canScrollLeft: boolean, canScrollUp: boolean, canScrollDown: boolean): void {
    const { ctx, spriteImages, spriteSize } = context;
    const tileSize = 12;
    const buttonSize = 12;

    // Right arrow at column 19, rows 7-9 (if can scroll right)
    if (canScrollRight) {
      const arrowX = 19 * tileSize;
      const arrowStartY = 7 * tileSize;

      // Render 3 arrow sprites vertically
      for (let i = 0; i < 3; i++) {
        const arrowY = arrowStartY + (i * tileSize);
        SpriteRenderer.renderSpriteById(
          ctx,
          'minimap-6',
          spriteImages,
          spriteSize,
          arrowX,
          arrowY,
          buttonSize,
          buttonSize
        );
      }

      // Store bounds for the entire clickable area (all 3 tiles)
      this.scrollRightButtonBounds = {
        x: arrowX,
        y: arrowStartY,
        width: buttonSize,
        height: buttonSize * 3
      };
    } else {
      this.scrollRightButtonBounds = null;
    }

    // Left arrow at column 0, rows 7-9 (if can scroll left)
    if (canScrollLeft) {
      const arrowX = 0 * tileSize;
      const arrowStartY = 7 * tileSize;

      // Render 3 arrow sprites vertically
      for (let i = 0; i < 3; i++) {
        const arrowY = arrowStartY + (i * tileSize);
        SpriteRenderer.renderSpriteById(
          ctx,
          'minimap-8',
          spriteImages,
          spriteSize,
          arrowX,
          arrowY,
          buttonSize,
          buttonSize
        );
      }

      // Store bounds for the entire clickable area (all 3 tiles)
      this.scrollLeftButtonBounds = {
        x: arrowX,
        y: arrowStartY,
        width: buttonSize,
        height: buttonSize * 3
      };
    } else {
      this.scrollLeftButtonBounds = null;
    }

    // Up arrow at row 3, columns 8-10 (if can scroll up)
    if (canScrollUp) {
      const arrowY = 3 * tileSize;
      const arrowStartX = 8 * tileSize;

      // Render 3 arrow sprites horizontally
      for (let i = 0; i < 3; i++) {
        const arrowX = arrowStartX + (i * tileSize);
        SpriteRenderer.renderSpriteById(
          ctx,
          'minimap-7',
          spriteImages,
          spriteSize,
          arrowX,
          arrowY,
          buttonSize,
          buttonSize
        );
      }

      // Store bounds for the entire clickable area (all 3 tiles)
      this.mapScrollUpButtonBounds = {
        x: arrowStartX,
        y: arrowY,
        width: buttonSize * 3,
        height: buttonSize
      };
    } else {
      this.mapScrollUpButtonBounds = null;
    }

    // Down arrow at row 13, columns 8-10 (if can scroll down)
    if (canScrollDown) {
      const arrowY = 13 * tileSize;
      const arrowStartX = 8 * tileSize;

      // Render 3 arrow sprites horizontally
      for (let i = 0; i < 3; i++) {
        const arrowX = arrowStartX + (i * tileSize);
        SpriteRenderer.renderSpriteById(
          ctx,
          'minimap-9',
          spriteImages,
          spriteSize,
          arrowX,
          arrowY,
          buttonSize,
          buttonSize
        );
      }

      // Store bounds for the entire clickable area (all 3 tiles)
      this.mapScrollDownButtonBounds = {
        x: arrowStartX,
        y: arrowY,
        width: buttonSize * 3,
        height: buttonSize
      };
    } else {
      this.mapScrollDownButtonBounds = null;
    }
  }

  private renderTurnOrderPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    _width: number,
    _height: number
  ): void {
    const { ctx, turnOrder, fontId, fontAtlasImage } = context;
    if (!fontAtlasImage) return;

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'TURN ORDER',
      x + this.PANEL_PADDING + 6,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#9eff6b'
    );
    currentY += this.LINE_SPACING;

    // Render units horizontally
    let currentX = x + this.PANEL_PADDING + 6;
    const unitsToShow = turnOrder.slice(0, 10);
    unitsToShow.forEach((unit, index) => {
      const text = `${index + 1}.${unit.name.substring(0, 6)}`;
      FontAtlasRenderer.renderText(
        ctx,
        text,
        currentX,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
      currentX += FontAtlasRenderer.measureTextByFontId(text, fontId) + 6;
    });
  }

  private renderScrollButtons(context: LayoutRenderContext): void {
    const { ctx, spriteImages, spriteSize, canvasHeight, combatLogManager } = context;

    if (!combatLogManager) return;

    // Calculate scroll button dimensions (12x12 each)
    const buttonSize = 12;
    const tileSize = 12;

    // Position at x tile 19 (19 * 12 = 228px)
    const scrollButtonsX = 19 * tileSize;

    // Up arrow: 3 tiles from bottom (canvasHeight - 3 * tileSize) - only if can scroll up
    if (combatLogManager.canScrollUp()) {
      const scrollUpY = canvasHeight - 3 * tileSize;
      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-7',
        spriteImages,
        spriteSize,
        scrollButtonsX,
        scrollUpY,
        buttonSize,
        buttonSize
      );
      this.scrollUpButtonBounds = {
        x: scrollButtonsX,
        y: scrollUpY,
        width: buttonSize,
        height: buttonSize
      };
    } else {
      this.scrollUpButtonBounds = null;
    }

    // Down arrow: bottom-most tile (canvasHeight - 1 * tileSize) - only if can scroll down
    if (combatLogManager.canScrollDown()) {
      const scrollDownY = canvasHeight - 1 * tileSize;
      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-9',
        spriteImages,
        spriteSize,
        scrollButtonsX,
        scrollDownY,
        buttonSize,
        buttonSize
      );
      this.scrollDownButtonBounds = {
        x: scrollButtonsX,
        y: scrollDownY,
        width: buttonSize,
        height: buttonSize
      };
    } else {
      this.scrollDownButtonBounds = null;
    }
  }

  private renderCombatLogPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, combatLogManager, fontId, fontAtlasImage } = context;
    if (!fontAtlasImage || !combatLogManager) return;

    // Calculate the visible area for the combat log (1px padding on all sides)
    const logX = x + this.PANEL_PADDING;
    const logY = y + this.PANEL_PADDING;
    const logWidth = width - this.PANEL_PADDING * 2;
    const logHeight = height - this.PANEL_PADDING * 2;

    // Render combat log using the manager
    combatLogManager.render(
      ctx,
      logX,
      logY,
      logWidth,
      logHeight,
      fontId,
      fontAtlasImage
    );
  }

  private renderCurrentUnitPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, currentUnit, fontId, fontAtlasImage, currentUnitPanelManager } = context;
    if (!fontAtlasImage) return;

    // Use InfoPanelManager if available, otherwise fall back to old rendering
    if (currentUnitPanelManager) {
      const content = currentUnit
        ? { type: 'unit' as const, unit: currentUnit }
        : { type: 'empty' as const };

      currentUnitPanelManager.render(
        ctx,
        { x, y, width, height },
        content,
        fontId,
        fontAtlasImage
      );
    } else {
      // Fallback to old rendering (for backwards compatibility)
      let currentY = y + this.PANEL_PADDING + 6;

      FontAtlasRenderer.renderText(
        ctx,
        'CURRENT UNIT',
        x + this.PANEL_PADDING + 6,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffa500'
      );
      currentY += this.LINE_SPACING;

      if (currentUnit) {
        FontAtlasRenderer.renderText(
          ctx,
          currentUnit.name,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
        currentY += this.LINE_SPACING;

        FontAtlasRenderer.renderText(
          ctx,
          currentUnit.unitClass.name,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
        currentY += this.LINE_SPACING;

        FontAtlasRenderer.renderText(
          ctx,
          `HP: ${currentUnit.health}/${currentUnit.maxHealth}`,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
        currentY += this.LINE_SPACING;

        FontAtlasRenderer.renderText(
          ctx,
          `MP: ${currentUnit.mana}/${currentUnit.maxMana}`,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
        currentY += this.LINE_SPACING;

        FontAtlasRenderer.renderText(
          ctx,
          `Spd:${currentUnit.speed} Mov:${currentUnit.movement}`,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
      } else {
        FontAtlasRenderer.renderText(
          ctx,
          '-',
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#666666'
        );
      }
    }
  }

  private renderTargetUnitPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, targetUnit, fontId, fontAtlasImage, targetUnitPanelManager } = context;
    if (!fontAtlasImage) return;

    // Use InfoPanelManager if available, otherwise fall back to old rendering
    if (targetUnitPanelManager) {
      const content = targetUnit
        ? { type: 'unit' as const, unit: targetUnit }
        : { type: 'empty' as const };

      targetUnitPanelManager.render(
        ctx,
        { x, y, width, height },
        content,
        fontId,
        fontAtlasImage
      );
    } else {
      // Fallback to old rendering (for backwards compatibility)
      let currentY = y + this.PANEL_PADDING + 6;

      FontAtlasRenderer.renderText(
        ctx,
        'TARGET UNIT',
        x + this.PANEL_PADDING + 6,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ff6b6b'
      );
      currentY += this.LINE_SPACING;

      if (targetUnit) {
        FontAtlasRenderer.renderText(
          ctx,
          targetUnit.name,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
        currentY += this.LINE_SPACING;

        FontAtlasRenderer.renderText(
          ctx,
          targetUnit.unitClass.name,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
        currentY += this.LINE_SPACING;

        FontAtlasRenderer.renderText(
          ctx,
          `HP: ${targetUnit.health}/${targetUnit.maxHealth}`,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
        currentY += this.LINE_SPACING;

        FontAtlasRenderer.renderText(
          ctx,
          `MP: ${targetUnit.mana}/${targetUnit.maxMana}`,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
        currentY += this.LINE_SPACING;

        FontAtlasRenderer.renderText(
          ctx,
          `Spd:${targetUnit.speed} Mov:${targetUnit.movement}`,
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
      } else {
        FontAtlasRenderer.renderText(
          ctx,
          '-',
          x + this.PANEL_PADDING + 6,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#666666'
        );
      }
    }
  }
}

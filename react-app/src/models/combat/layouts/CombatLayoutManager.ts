import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { HorizontalVerticalLayout, type LayoutRegion } from './HorizontalVerticalLayout';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';

/**
 * Layout 6: Left Map with Top Turn Order
 * - Top-left: Turn order panel (spans above map)
 * - Middle-left: Map viewport
 * - Bottom-left: Combat log panel
 * - Right column: Current unit (top) + Target unit (bottom) split horizontally
 */
export class CombatLayoutManager implements CombatLayoutRenderer {
  private readonly RIGHT_COLUMN_WIDTH = 144; // 12 tiles
  private readonly TURN_ORDER_HEIGHT = 24; // 2 tiles
  private readonly COMBAT_LOG_HEIGHT = 36; // 3 tiles
  private readonly PANEL_PADDING = 1; // 1px padding
  private readonly frameLayout: HorizontalVerticalLayout;

  // Map scroll button tracking
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
   * Handle click events on the top panel (turn order).
   * Returns true if the click was handled, false otherwise.
   */
  handleTopPanelClick(x: number, y: number, topPanelManager: any): boolean {
    if (!topPanelManager) return false;

    // Top panel is rows 0-1, columns 0-19 (x: 0, y: 0, width: 240px, height: 24px)
    const region = { x: 0, y: 0, width: 240, height: 24 };

    return topPanelManager.handleClick(x, y, region);
  }

  /**
   * Handle click events on the combat log scroll buttons.
   * Returns 'up', 'down', or null.
   */
  handleCombatLogClick(x: number, y: number, combatLogManager: any): 'up' | 'down' | null {
    if (!combatLogManager) return null;
    return combatLogManager.handleScrollButtonClick(x, y);
  }

  renderLayout(context: LayoutRenderContext): void {
    const { ctx, canvasWidth, canvasHeight, fontAtlasImage, spriteImages, spriteSize, combatLogManager } = context;

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

    // Right column - info panels at correct tile positions
    // Top-right: Current unit (rows 0-8, columns 21-31)
    this.renderCurrentUnitPanel(
      context,
      252, // x: column 21 (21 * 12px)
      0,   // y: row 0 (0 * 12px)
      132, // width: 11 tiles (11 * 12px)
      108  // height: 9 tiles (9 * 12px)
    );

    // Bottom-right: Target unit (rows 10-17, columns 21-31)
    this.renderTargetUnitPanel(
      context,
      252, // x: column 21 (21 * 12px)
      120, // y: row 10 (10 * 12px)
      132, // width: 11 tiles (11 * 12px)
      96   // height: 8 tiles (8 * 12px)
    );

    // Render the frame layout dividers on top of the 9-slice panels
    this.frameLayout.render(ctx, spriteImages, spriteSize);

    // Render combat log scroll buttons on top of everything
    if (combatLogManager) {
      combatLogManager.renderScrollButtons(ctx, spriteImages, spriteSize, canvasHeight);
    }
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
    width: number,
    height: number
  ): void {
    const { ctx, topPanelManager, topPanelFontAtlasImage, spriteImages, spriteSize } = context;
    if (!topPanelManager) return;

    // Use dungeon-slant font for top panel
    topPanelManager.render(
      ctx,
      { x, y, width, height },
      '15px-dungeonslant',
      topPanelFontAtlasImage || null,
      spriteImages,
      spriteSize
    );
  }

  private renderCombatLogPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, combatLogManager, fontId, fontAtlasImage, spriteImages, spriteSize } = context;
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
      fontAtlasImage,
      spriteImages,
      spriteSize
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
    if (!currentUnitPanelManager) return;

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
  }

  private renderTargetUnitPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, targetUnit, fontId, fontAtlasImage, targetUnitPanelManager } = context;
    if (!targetUnitPanelManager) return;

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
  }
}

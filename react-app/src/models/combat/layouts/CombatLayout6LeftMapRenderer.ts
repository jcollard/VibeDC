import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { renderNineSliceDialog, DEFAULT_DIALOG_SPRITES } from '../../../utils/DialogRenderer';
import { HorizontalVerticalLayout, type LayoutRegion } from './HorizontalVerticalLayout';

/**
 * Layout 6: Left Map with Top Turn Order
 * - Top-left: Turn order panel (spans above map)
 * - Middle-left: Map viewport
 * - Bottom-left: Combat log panel
 * - Right column: Current unit (top) + Target unit (bottom) split horizontally
 */
export class CombatLayout6LeftMapRenderer implements CombatLayoutRenderer {
  private readonly RIGHT_COLUMN_WIDTH = 120; // 10 tiles
  private readonly TURN_ORDER_HEIGHT = 36; // 3 tiles
  private readonly COMBAT_LOG_HEIGHT = 36; // 3 tiles
  private readonly PANEL_PADDING = 4;
  private readonly LINE_SPACING = 8;
  private readonly frameLayout: HorizontalVerticalLayout;

  constructor() {
    // Define the layout regions using tile-based dimensions
    // Canvas is 384x216 (32x18 tiles at 12px each)
    const regions: LayoutRegion[] = [
      // Top-left: Turn order (22 tiles wide, 3 tiles tall)
      { name: 'turnOrder', x: 0, y: 0, widthTiles: 22, heightTiles: 3 },

      // Middle-left: Map area (22 tiles wide, 12 tiles tall)
      { name: 'map', x: 0, y: 36, widthTiles: 22, heightTiles: 12 },

      // Bottom-left: Combat log (22 tiles wide, 3 tiles tall)
      { name: 'combatLog', x: 0, y: 180, widthTiles: 22, heightTiles: 3 },

      // Top-right: Current unit (10 tiles wide, 9 tiles tall)
      { name: 'currentUnit', x: 264, y: 0, widthTiles: 10, heightTiles: 9 },

      // Bottom-right: Target unit (10 tiles wide, 9 tiles tall)
      { name: 'targetUnit', x: 264, y: 108, widthTiles: 10, heightTiles: 9 },
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
  }

  private renderTurnOrderPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, turnOrder, fontId, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    // Draw panel background
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

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

  private renderCombatLogPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, combatLog, fontId, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    // Draw panel background
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'COMBAT LOG',
      x + this.PANEL_PADDING + 6,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#6b9eff'
    );
    currentY += this.LINE_SPACING;

    // Show last 2 entries
    const entriesToShow = combatLog.slice(-2);
    for (const entry of entriesToShow) {
      FontAtlasRenderer.renderText(
        ctx,
        entry,
        x + this.PANEL_PADDING + 6,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
      currentY += this.LINE_SPACING;
    }
  }

  private renderCurrentUnitPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, currentUnit, fontId, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    // Draw panel background
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
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

  private renderTargetUnitPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, targetUnit, fontId, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    // Draw panel background
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
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

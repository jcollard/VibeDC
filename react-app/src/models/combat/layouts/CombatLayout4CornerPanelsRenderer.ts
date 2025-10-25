import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { renderNineSliceDialog, DEFAULT_DIALOG_SPRITES } from '../../../utils/DialogRenderer';

/**
 * Layout 4: Corner Panels
 * - Center: Map viewport
 * - Top-left: Current unit info
 * - Top-right: Turn order
 * - Bottom-left: Target unit info
 * - Bottom-right: Combat log
 */
export class CombatLayout4CornerPanelsRenderer implements CombatLayoutRenderer {
  private readonly CORNER_WIDTH = 96; // 8 tiles
  private readonly CORNER_HEIGHT = 54; // 4.5 tiles
  private readonly PANEL_PADDING = 4;
  private readonly LINE_SPACING = 8;

  getMapViewport(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
    const mapWidth = canvasWidth - (this.CORNER_WIDTH * 2);
    const mapHeight = canvasHeight - (this.CORNER_HEIGHT * 2);
    return {
      x: this.CORNER_WIDTH,
      y: this.CORNER_HEIGHT,
      width: mapWidth,
      height: mapHeight,
    };
  }

  renderLayout(context: LayoutRenderContext): void {
    const { canvasWidth, canvasHeight, fontAtlasImage } = context;

    if (!fontAtlasImage) return;

    // Top-left - Current Unit
    this.renderCurrentUnitPanel(context, 0, 0, this.CORNER_WIDTH, this.CORNER_HEIGHT);

    // Top-right - Turn Order
    this.renderTurnOrderPanel(
      context,
      canvasWidth - this.CORNER_WIDTH,
      0,
      this.CORNER_WIDTH,
      this.CORNER_HEIGHT
    );

    // Bottom-left - Target Unit
    this.renderTargetUnitPanel(
      context,
      0,
      canvasHeight - this.CORNER_HEIGHT,
      this.CORNER_WIDTH,
      this.CORNER_HEIGHT
    );

    // Bottom-right - Combat Log
    this.renderCombatLogPanel(
      context,
      canvasWidth - this.CORNER_WIDTH,
      canvasHeight - this.CORNER_HEIGHT,
      this.CORNER_WIDTH,
      this.CORNER_HEIGHT
    );
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

    // Draw semi-transparent panel background
    ctx.fillStyle = 'rgba(34, 34, 34, 0.95)';
    ctx.fillRect(x, y, width, height);

    // Draw border
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'CURRENT',
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
        currentUnit.name.substring(0, 12),
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
        `Spd: ${currentUnit.speed}`,
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

  private renderTurnOrderPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, turnOrder, fontId, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    // Draw semi-transparent panel background
    ctx.fillStyle = 'rgba(34, 34, 34, 0.95)';
    ctx.fillRect(x, y, width, height);

    // Draw border
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'TURNS',
      x + this.PANEL_PADDING + 6,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#9eff6b'
    );
    currentY += this.LINE_SPACING;

    // Render first 5 units
    const unitsToShow = turnOrder.slice(0, 5);
    unitsToShow.forEach((unit, index) => {
      FontAtlasRenderer.renderText(
        ctx,
        `${index + 1}. ${unit.name.substring(0, 10)}`,
        x + this.PANEL_PADDING + 6,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
      currentY += this.LINE_SPACING;
    });
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

    // Draw semi-transparent panel background
    ctx.fillStyle = 'rgba(34, 34, 34, 0.95)';
    ctx.fillRect(x, y, width, height);

    // Draw border
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'TARGET',
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
        targetUnit.name.substring(0, 12),
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
        `Spd: ${targetUnit.speed}`,
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

  private renderCombatLogPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, combatLog, fontId, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    // Draw semi-transparent panel background
    ctx.fillStyle = 'rgba(34, 34, 34, 0.95)';
    ctx.fillRect(x, y, width, height);

    // Draw border
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'LOG',
      x + this.PANEL_PADDING + 6,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#6b9eff'
    );
    currentY += this.LINE_SPACING;

    // Show last 4 entries
    const entriesToShow = combatLog.slice(-4);
    for (const entry of entriesToShow) {
      FontAtlasRenderer.renderText(
        ctx,
        entry.substring(0, 16),
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
}

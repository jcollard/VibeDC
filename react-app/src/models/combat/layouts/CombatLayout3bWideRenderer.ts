import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { renderNineSliceDialog, DEFAULT_DIALOG_SPRITES } from '../../../utils/DialogRenderer';

/**
 * Layout 3b: Wide Split Screen (variation)
 * - Left: Map viewport (~50% of width)
 * - Right: Stacked info panels (wider than original)
 *   (Current Unit -> Target Unit -> Turn Order -> Combat Log)
 * Difference: Wider right panel (144px vs 120px), reordered panels
 */
export class CombatLayout3bWideRenderer implements CombatLayoutRenderer {
  private readonly INFO_PANEL_WIDTH = 144; // 12 tiles (wider)
  private readonly PANEL_PADDING = 4;
  private readonly LINE_SPACING = 8;

  getMapViewport(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
    const mapWidth = canvasWidth - this.INFO_PANEL_WIDTH;
    return {
      x: 0,
      y: 0,
      width: mapWidth,
      height: canvasHeight,
    };
  }

  renderLayout(context: LayoutRenderContext): void {
    const { canvasWidth, canvasHeight, fontAtlasImage } = context;

    if (!fontAtlasImage) return;

    const panelX = canvasWidth - this.INFO_PANEL_WIDTH;

    // Define panel heights - units get more space, log gets less
    const currentUnitHeight = 54;
    const targetUnitHeight = 54;
    const turnOrderHeight = 44;
    const combatLogHeight = canvasHeight - currentUnitHeight - targetUnitHeight - turnOrderHeight;

    let currentY = 0;

    // Render current unit panel
    this.renderCurrentUnitPanel(context, panelX, currentY, this.INFO_PANEL_WIDTH, currentUnitHeight);
    currentY += currentUnitHeight;

    // Render target unit panel
    this.renderTargetUnitPanel(context, panelX, currentY, this.INFO_PANEL_WIDTH, targetUnitHeight);
    currentY += targetUnitHeight;

    // Render turn order panel
    this.renderTurnOrderPanel(context, panelX, currentY, this.INFO_PANEL_WIDTH, turnOrderHeight);
    currentY += turnOrderHeight;

    // Render combat log panel
    this.renderCombatLogPanel(context, panelX, currentY, this.INFO_PANEL_WIDTH, combatLogHeight);
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

    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

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
        `Speed: ${currentUnit.speed}  Move: ${currentUnit.movement}`,
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

    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

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
        `Speed: ${targetUnit.speed}  Move: ${targetUnit.movement}`,
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

    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

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

    const unitsToShow = turnOrder.slice(0, 4);
    unitsToShow.forEach((unit, index) => {
      FontAtlasRenderer.renderText(
        ctx,
        `${index + 1}. ${unit.name.substring(0, 16)}`,
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

  private renderCombatLogPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, combatLog, fontId, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

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

    const maxEntries = Math.floor((height - this.PANEL_PADDING - 12 - this.LINE_SPACING) / this.LINE_SPACING);
    const entriesToShow = combatLog.slice(-maxEntries);

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
}

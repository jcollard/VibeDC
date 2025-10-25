import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { renderNineSliceDialog, DEFAULT_DIALOG_SPRITES } from '../../../utils/DialogRenderer';

/**
 * Layout 5: Top Bar
 * - Top: Info bar with turn order and unit stats
 * - Middle: Large map viewport
 * - Bottom: Combat log
 */
export class CombatLayout5TopBarRenderer implements CombatLayoutRenderer {
  private readonly TOP_BAR_HEIGHT = 36; // 3 tiles
  private readonly LOG_HEIGHT = 30; // 2.5 tiles
  private readonly PANEL_PADDING = 4;
  private readonly LINE_SPACING = 8;

  getMapViewport(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
    const mapHeight = canvasHeight - this.TOP_BAR_HEIGHT - this.LOG_HEIGHT;
    return {
      x: 0,
      y: this.TOP_BAR_HEIGHT,
      width: canvasWidth,
      height: mapHeight,
    };
  }

  renderLayout(context: LayoutRenderContext): void {
    const { fontAtlasImage } = context;

    if (!fontAtlasImage) return;

    // Render top bar
    this.renderTopBar(context);

    // Render bottom combat log
    this.renderCombatLog(context);
  }

  private renderTopBar(context: LayoutRenderContext): void {
    const { ctx, canvasWidth, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    // Draw top bar background
    renderNineSliceDialog(ctx, 0, 0, canvasWidth, this.TOP_BAR_HEIGHT, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    // Divide top bar into sections: Turn Order (2x width) | Current (1x width) | Target (1x width)
    const sectionWidth = canvasWidth / 4;
    const turnOrderWidth = sectionWidth * 2;

    this.renderTurnOrderSection(context, 0, 0, turnOrderWidth);
    this.renderCurrentUnitSection(context, turnOrderWidth, 0, sectionWidth);
    this.renderTargetUnitSection(context, turnOrderWidth + sectionWidth, 0, sectionWidth);
  }

  private renderTurnOrderSection(
    context: LayoutRenderContext,
    x: number,
    y: number,
    _width: number
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

    // Render units horizontally with abbreviated names
    let currentX = x + this.PANEL_PADDING + 6;
    const unitsToShow = turnOrder.slice(0, 8);
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
      // Move to next position (approximate width)
      currentX += FontAtlasRenderer.measureTextByFontId(text, fontId) + 6;
    });
  }

  private renderCurrentUnitSection(
    context: LayoutRenderContext,
    x: number,
    y: number,
    _width: number
  ): void {
    const { ctx, currentUnit, fontId, fontAtlasImage } = context;
    if (!fontAtlasImage) return;

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'CURRENT',
      x + this.PANEL_PADDING,
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
        currentUnit.name.substring(0, 10),
        x + this.PANEL_PADDING,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
      currentY += this.LINE_SPACING;

      // Compact stats on one line
      FontAtlasRenderer.renderText(
        ctx,
        `HP:${currentUnit.health}/${currentUnit.maxHealth} MP:${currentUnit.mana}/${currentUnit.maxMana}`,
        x + this.PANEL_PADDING,
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
        x + this.PANEL_PADDING,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#666666'
      );
    }
  }

  private renderTargetUnitSection(
    context: LayoutRenderContext,
    x: number,
    y: number,
    _width: number
  ): void {
    const { ctx, targetUnit, fontId, fontAtlasImage } = context;
    if (!fontAtlasImage) return;

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'TARGET',
      x + this.PANEL_PADDING,
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
        targetUnit.name.substring(0, 10),
        x + this.PANEL_PADDING,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
      currentY += this.LINE_SPACING;

      // Compact stats on one line
      FontAtlasRenderer.renderText(
        ctx,
        `HP:${targetUnit.health}/${targetUnit.maxHealth} MP:${targetUnit.mana}/${targetUnit.maxMana}`,
        x + this.PANEL_PADDING,
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
        x + this.PANEL_PADDING,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#666666'
      );
    }
  }

  private renderCombatLog(context: LayoutRenderContext): void {
    const { ctx, canvasWidth, canvasHeight, combatLog, fontId, fontAtlasImage, spriteSize, spriteImages } = context;
    if (!fontAtlasImage) return;

    const logY = canvasHeight - this.LOG_HEIGHT;

    // Draw combat log background
    renderNineSliceDialog(ctx, 0, logY, canvasWidth, this.LOG_HEIGHT, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = logY + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'COMBAT LOG',
      this.PANEL_PADDING + 6,
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
        this.PANEL_PADDING + 6,
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

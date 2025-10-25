import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { renderNineSliceDialog, DEFAULT_DIALOG_SPRITES } from '../../../utils/DialogRenderer';

/**
 * Layout 5b: Minimal Top Bar (variation)
 * - Top: Compact info bar (shorter)
 * - Middle: Larger map viewport
 * - Bottom: Compact combat log (shorter)
 * Difference: Thinner bars (24px top, 24px bottom) for maximum map space
 */
export class CombatLayout5bMinimalRenderer implements CombatLayoutRenderer {
  private readonly TOP_BAR_HEIGHT = 24; // 2 tiles
  private readonly LOG_HEIGHT = 24; // 2 tiles
  private readonly PANEL_PADDING = 4;

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

    // Divide top bar: Turn Order | Current | Target
    const turnOrderWidth = canvasWidth / 2;
    const unitSectionWidth = canvasWidth / 4;

    this.renderTurnOrderSection(context, 0, 0, turnOrderWidth);
    this.renderCurrentUnitSection(context, turnOrderWidth, 0, unitSectionWidth);
    this.renderTargetUnitSection(context, turnOrderWidth + unitSectionWidth, 0, unitSectionWidth);
  }

  private renderTurnOrderSection(
    context: LayoutRenderContext,
    x: number,
    y: number,
    _width: number
  ): void {
    const { ctx, turnOrder, fontId, fontAtlasImage } = context;
    if (!fontAtlasImage) return;

    let currentX = x + this.PANEL_PADDING + 6;
    const currentY = y + this.PANEL_PADDING + 6;

    // Render units horizontally inline (no title, maximally compact)
    const unitsToShow = turnOrder.slice(0, 10);
    unitsToShow.forEach((unit, index) => {
      const text = `${index + 1}.${unit.name.substring(0, 5)}`;
      FontAtlasRenderer.renderText(
        ctx,
        text,
        currentX,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        index === 0 ? '#9eff6b' : '#ffffff'
      );
      currentX += FontAtlasRenderer.measureTextByFontId(text, fontId) + 4;
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

    const currentY = y + this.PANEL_PADDING + 6;

    if (currentUnit) {
      const text = `${currentUnit.name.substring(0, 8)} HP:${currentUnit.health}/${currentUnit.maxHealth}`;
      FontAtlasRenderer.renderText(
        ctx,
        text,
        x + this.PANEL_PADDING,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffa500'
      );
    } else {
      FontAtlasRenderer.renderText(
        ctx,
        'Current: -',
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

    const currentY = y + this.PANEL_PADDING + 6;

    if (targetUnit) {
      const text = `${targetUnit.name.substring(0, 8)} HP:${targetUnit.health}/${targetUnit.maxHealth}`;
      FontAtlasRenderer.renderText(
        ctx,
        text,
        x + this.PANEL_PADDING,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ff6b6b'
      );
    } else {
      FontAtlasRenderer.renderText(
        ctx,
        'Target: -',
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

    const currentY = logY + this.PANEL_PADDING + 6;

    // Show only last entry (very compact)
    const lastEntry = combatLog[combatLog.length - 1];
    if (lastEntry) {
      FontAtlasRenderer.renderText(
        ctx,
        lastEntry,
        this.PANEL_PADDING + 6,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
    }
  }
}

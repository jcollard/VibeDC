import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { renderNineSliceDialog, DEFAULT_DIALOG_SPRITES } from '../../../utils/DialogRenderer';

/**
 * Layout 1c: Wide Traditional RPG (variation)
 * - Left sidebar: Turn order + Combat log (stacked)
 * - Center: Map viewport
 * - Right sidebar: Current + Target (stacked)
 * Difference: Turn order on left instead of right, for different visual balance
 */
export class CombatLayout1cWideRenderer implements CombatLayoutRenderer {
  private readonly SIDEBAR_WIDTH = 96; // 8 tiles
  private readonly PANEL_PADDING = 4;
  private readonly LINE_SPACING = 8;

  getMapViewport(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
    const mapWidth = canvasWidth - (this.SIDEBAR_WIDTH * 2);
    return {
      x: this.SIDEBAR_WIDTH,
      y: 0,
      width: mapWidth,
      height: canvasHeight,
    };
  }

  renderLayout(context: LayoutRenderContext): void {
    const { fontAtlasImage } = context;

    if (!fontAtlasImage) return;

    // Render left sidebar panels (turn order + log)
    this.renderLeftSidebar(context);

    // Render right sidebar panels (current + target)
    this.renderRightSidebar(context);
  }

  private renderLeftSidebar(context: LayoutRenderContext): void {
    const { ctx, canvasHeight, fontId, fontAtlasImage, combatLog, turnOrder, spriteSize, spriteImages } = context;

    if (!fontAtlasImage) return;

    const turnOrderHeight = canvasHeight / 2;
    const logHeight = canvasHeight / 2;

    // Top half - Turn order panel
    this.renderTurnOrderPanel(
      ctx,
      0,
      0,
      this.SIDEBAR_WIDTH,
      turnOrderHeight,
      turnOrder,
      fontId,
      fontAtlasImage,
      spriteSize,
      spriteImages
    );

    // Bottom half - Combat log panel
    this.renderCombatLogPanel(
      ctx,
      0,
      turnOrderHeight,
      this.SIDEBAR_WIDTH,
      logHeight,
      combatLog,
      fontId,
      fontAtlasImage,
      spriteSize,
      spriteImages
    );
  }

  private renderRightSidebar(context: LayoutRenderContext): void {
    const { ctx, canvasWidth, canvasHeight, fontId, fontAtlasImage, currentUnit, targetUnit, spriteSize, spriteImages } = context;

    if (!fontAtlasImage) return;

    const sidebarX = canvasWidth - this.SIDEBAR_WIDTH;
    const halfHeight = canvasHeight / 2;

    // Top half - Current unit panel
    this.renderUnitPanel(
      ctx,
      sidebarX,
      0,
      this.SIDEBAR_WIDTH,
      halfHeight,
      'CURRENT',
      '#ffa500',
      currentUnit,
      fontId,
      fontAtlasImage,
      spriteSize,
      spriteImages
    );

    // Bottom half - Target unit panel
    this.renderUnitPanel(
      ctx,
      sidebarX,
      halfHeight,
      this.SIDEBAR_WIDTH,
      halfHeight,
      'TARGET',
      '#ff6b6b',
      targetUnit,
      fontId,
      fontAtlasImage,
      spriteSize,
      spriteImages
    );
  }

  private renderUnitPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    titleColor: string,
    unit: any | null,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    spriteSize: number,
    spriteImages: Map<string, HTMLImageElement>
  ): void {
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6;

    FontAtlasRenderer.renderText(
      ctx,
      title,
      x + this.PANEL_PADDING + 6,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      titleColor
    );
    currentY += this.LINE_SPACING;

    if (unit) {
      FontAtlasRenderer.renderText(
        ctx,
        unit.name.substring(0, 12),
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
        `HP: ${unit.health}/${unit.maxHealth}`,
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
        `MP: ${unit.mana}/${unit.maxMana}`,
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
        `Spd: ${unit.speed}`,
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
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    combatLog: string[],
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    spriteSize: number,
    spriteImages: Map<string, HTMLImageElement>
  ): void {
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
        entry.substring(0, 14),
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

  private renderTurnOrderPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    turnOrder: any[],
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    spriteSize: number,
    spriteImages: Map<string, HTMLImageElement>
  ): void {
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

    const maxEntries = Math.floor((height - this.PANEL_PADDING - 12 - this.LINE_SPACING) / this.LINE_SPACING);
    const unitsToShow = turnOrder.slice(0, maxEntries);

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
}

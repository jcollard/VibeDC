import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { renderNineSliceDialog, DEFAULT_DIALOG_SPRITES } from '../../../utils/DialogRenderer';

/**
 * Layout 1: Traditional RPG
 * - Left sidebar: Current unit info (top) + Target unit info (bottom)
 * - Center: Map viewport
 * - Right sidebar: Combat log (top 2/3) + Turn order (bottom 1/3)
 */
export class CombatLayout1TraditionalRenderer implements CombatLayoutRenderer {
  private readonly SIDEBAR_WIDTH = 96; // 8 tiles
  private readonly PANEL_PADDING = 4;
  private readonly LINE_SPACING = 8; // 7px font + 1px spacing

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

    // Render left sidebar panels
    this.renderLeftSidebar(context);

    // Render right sidebar panels
    this.renderRightSidebar(context);
  }

  private renderLeftSidebar(context: LayoutRenderContext): void {
    const { ctx, canvasHeight, fontId, fontAtlasImage, currentUnit, targetUnit, spriteSize, spriteImages } = context;

    if (!fontAtlasImage) return;

    const halfHeight = canvasHeight / 2;

    // Top half - Current unit panel
    this.renderUnitPanel(
      ctx,
      0,
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
      0,
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

  private renderRightSidebar(context: LayoutRenderContext): void {
    const { ctx, canvasWidth, canvasHeight, fontId, fontAtlasImage, combatLog, turnOrder, spriteSize, spriteImages } = context;

    if (!fontAtlasImage) return;

    const sidebarX = canvasWidth - this.SIDEBAR_WIDTH;
    const logHeight = (canvasHeight * 2) / 3;
    const turnOrderHeight = canvasHeight / 3;

    // Top 2/3 - Combat log panel
    this.renderCombatLogPanel(
      ctx,
      sidebarX,
      0,
      this.SIDEBAR_WIDTH,
      logHeight,
      combatLog,
      fontId,
      fontAtlasImage,
      spriteSize,
      spriteImages
    );

    // Bottom 1/3 - Turn order panel
    this.renderTurnOrderPanel(
      ctx,
      sidebarX,
      logHeight,
      this.SIDEBAR_WIDTH,
      turnOrderHeight,
      turnOrder,
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
    // Draw panel background with border
    renderNineSliceDialog(ctx, x, y, width, height, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    let currentY = y + this.PANEL_PADDING + 6; // 6px border inset

    // Render title
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
      // Render unit name
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

      // Render HP
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

      // Render MP
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

      // Render Speed
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
    // Draw panel background with border
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

    // Render log entries (most recent at bottom)
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
    // Draw panel background with border
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

    // Render turn order entries
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

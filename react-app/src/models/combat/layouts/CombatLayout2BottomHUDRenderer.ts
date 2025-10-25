import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { renderNineSliceDialog, DEFAULT_DIALOG_SPRITES } from '../../../utils/DialogRenderer';

/**
 * Layout 2: Bottom HUD
 * - Top: Large map viewport (takes most of screen)
 * - Bottom: HUD bar with all info panels side-by-side
 *   (Current Unit | Target Unit | Combat Log | Turn Order)
 */
export class CombatLayout2BottomHUDRenderer implements CombatLayoutRenderer {
  private readonly HUD_HEIGHT = 60; // 5 tiles
  private readonly PANEL_PADDING = 4;
  private readonly LINE_SPACING = 8;

  getMapViewport(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
    const mapHeight = canvasHeight - this.HUD_HEIGHT;
    return {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: mapHeight,
    };
  }

  renderLayout(context: LayoutRenderContext): void {
    const { ctx, canvasWidth, canvasHeight, fontAtlasImage, spriteSize, spriteImages } = context;

    if (!fontAtlasImage) return;

    const hudY = canvasHeight - this.HUD_HEIGHT;

    // Render HUD background
    renderNineSliceDialog(ctx, 0, hudY, canvasWidth, this.HUD_HEIGHT, spriteSize, spriteImages, DEFAULT_DIALOG_SPRITES, 1);

    // Divide HUD into 4 sections
    const sectionWidth = canvasWidth / 4;

    this.renderCurrentUnitSection(context, 0, hudY, sectionWidth);
    this.renderTargetUnitSection(context, sectionWidth, hudY, sectionWidth);
    this.renderCombatLogSection(context, sectionWidth * 2, hudY, sectionWidth);
    this.renderTurnOrderSection(context, sectionWidth * 3, hudY, sectionWidth);
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
        targetUnit.name.substring(0, 12),
        x + this.PANEL_PADDING,
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
        x + this.PANEL_PADDING,
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
        x + this.PANEL_PADDING,
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

  private renderCombatLogSection(
    context: LayoutRenderContext,
    x: number,
    y: number,
    _width: number
  ): void {
    const { ctx, combatLog, fontId, fontAtlasImage } = context;
    if (!fontAtlasImage) return;

    let currentY = y + this.PANEL_PADDING + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      'COMBAT LOG',
      x + this.PANEL_PADDING,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#6b9eff'
    );
    currentY += this.LINE_SPACING;

    // Show last 5 entries
    const entriesToShow = combatLog.slice(-5);
    for (const entry of entriesToShow) {
      FontAtlasRenderer.renderText(
        ctx,
        entry.substring(0, 20),
        x + this.PANEL_PADDING,
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
      'TURNS',
      x + this.PANEL_PADDING,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#9eff6b'
    );
    currentY += this.LINE_SPACING;

    // Show first 5 units
    const unitsToShow = turnOrder.slice(0, 5);
    unitsToShow.forEach((unit, index) => {
      FontAtlasRenderer.renderText(
        ctx,
        `${index + 1}. ${unit.name.substring(0, 8)}`,
        x + this.PANEL_PADDING,
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

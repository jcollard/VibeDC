import type { CombatUnit } from '../../CombatUnit';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../../../utils/SpriteRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from './PanelContent';

/**
 * Configuration for unit info panel appearance
 */
export interface UnitInfoConfig {
  title: string;
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Panel content that displays comprehensive information about a single combat unit.
 * Shows: sprite, colored name, class(es), action timer, and two-column stats grid.
 */
export class UnitInfoContent implements PanelContent {
  private config: UnitInfoConfig;
  private unit: CombatUnit;

  constructor(config: UnitInfoConfig, unit: CombatUnit) {
    this.config = config;
    this.unit = unit;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    spriteImages?: Map<string, HTMLImageElement>,
    spriteSize?: number
  ): void {
    if (!fontAtlasImage) return;

    const font = FontRegistry.getById(fontId);
    if (!font) return;

    // ===== Section 1: Sprite (top-left corner) =====
    const spriteX = region.x + this.config.padding;
    const spriteY = region.y + this.config.padding;

    if (spriteImages && spriteSize) {
      SpriteRenderer.renderSpriteById(
        ctx,
        this.unit.spriteId,
        spriteImages,
        spriteSize,
        spriteX,
        spriteY,
        12,
        12
      );
    }

    // ===== Section 2: Name (to right of sprite) =====
    const nameX = spriteX + 12 + 1; // sprite width + 1px gap
    const nameY = spriteY;

    // Determine name color based on allegiance
    const nameColor = this.unit.isPlayerControlled ? '#00ff00' : '#ff0000';

    FontAtlasRenderer.renderText(
      ctx,
      this.unit.name,
      nameX,
      nameY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      nameColor
    );

    // ===== Section 3: Class line (below name/sprite) =====
    const classY = nameY + this.config.lineSpacing;
    let classText = this.unit.unitClass.name;
    if (this.unit.secondaryClass) {
      classText += `/${this.unit.secondaryClass.name}`; // No spaces around slash
    }

    FontAtlasRenderer.renderText(
      ctx,
      classText,
      nameX,
      classY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );

    // ===== Section 4: Action Timer (top-right corner) =====
    const atLabelY = spriteY;

    // Try full label first
    const fullLabel = 'ACTION TIMER';
    const fullLabelWidth = FontAtlasRenderer.measureText(fullLabel, font);
    const availableWidth = region.width - (nameX - region.x) - 50; // Reserve space for name

    if (fullLabelWidth <= availableWidth) {
      // Option A: Use full label
      const atLabelX = region.x + region.width - this.config.padding - fullLabelWidth;

      FontAtlasRenderer.renderText(
        ctx,
        fullLabel,
        atLabelX,
        atLabelY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
    } else {
      // Option B: Use "AT" + clock icon
      const atText = 'AT';
      const atWidth = FontAtlasRenderer.measureText(atText, font);
      const clockSize = 8; // Scaled down from 12
      const gap = 1;
      const totalWidth = clockSize + gap + atWidth;
      const atLabelX = region.x + region.width - this.config.padding - totalWidth;

      // Render clock icon
      if (spriteImages && spriteSize) {
        SpriteRenderer.renderSpriteById(
          ctx,
          'icons-5', // Clock sprite
          spriteImages,
          spriteSize,
          atLabelX,
          atLabelY,
          clockSize,
          clockSize
        );
      }

      // Render "AT" text
      FontAtlasRenderer.renderText(
        ctx,
        atText,
        atLabelX + clockSize + gap,
        atLabelY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
    }

    // Render action timer value below label (right-aligned)
    const atValue = `${Math.floor(this.unit.actionTimer)}/100`;
    const atValueWidth = FontAtlasRenderer.measureText(atValue, font);
    const atValueX = region.x + region.width - this.config.padding - atValueWidth;
    const atValueY = atLabelY + this.config.lineSpacing;

    FontAtlasRenderer.renderText(
      ctx,
      atValue,
      atValueX,
      atValueY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffa500' // Orange
    );

    // ===== Section 5: Two-Column Stats Grid =====
    // Define stats for each column
    const leftColumnStats = [
      { label: 'HP', value: `${this.unit.health}/${this.unit.maxHealth}` },
      { label: 'MP', value: `${this.unit.mana}/${this.unit.maxMana}` },
      { label: 'Speed', value: `${this.unit.speed}` },
      { label: 'Movement', value: `${this.unit.movement}` },
      { label: 'Cour', value: `${this.unit.courage}` }
    ];

    const rightColumnStats = [
      { label: 'P.Pow', value: `${this.unit.physicalPower}` },
      { label: 'M.Pow', value: `${this.unit.magicPower}` },
      { label: 'P.Evd', value: `${this.unit.physicalEvade}` },
      { label: 'M.Evd', value: `${this.unit.magicEvade}` },
      { label: 'Attn', value: `${this.unit.attunement}` }
    ];

    // Calculate left column label width (for right-aligning values)
    let maxLeftLabelWidth = 0;
    for (const stat of leftColumnStats) {
      const labelWidth = FontAtlasRenderer.measureText(stat.label, font);
      if (labelWidth > maxLeftLabelWidth) {
        maxLeftLabelWidth = labelWidth;
      }
    }

    // Calculate right column label width
    let maxRightLabelWidth = 0;
    for (const stat of rightColumnStats) {
      const labelWidth = FontAtlasRenderer.measureText(stat.label, font);
      if (labelWidth > maxRightLabelWidth) {
        maxRightLabelWidth = labelWidth;
      }
    }

    // Calculate total widths for positioning
    // Left column: label + space + widest value
    const maxLeftValueWidth = Math.max(
      FontAtlasRenderer.measureText(`${this.unit.health}/${this.unit.maxHealth}`, font),
      FontAtlasRenderer.measureText(`${this.unit.mana}/${this.unit.maxMana}`, font),
      FontAtlasRenderer.measureText(`${this.unit.speed}`, font),
      FontAtlasRenderer.measureText(`${this.unit.movement}`, font),
      FontAtlasRenderer.measureText(`${this.unit.courage}`, font)
    );
    const leftColumnWidth = maxLeftLabelWidth + 1 + maxLeftValueWidth; // 1px space

    // Define column positions
    const leftColumnX = region.x + this.config.padding;
    const rightColumnX = leftColumnX + leftColumnWidth + 12; // 12px gap between columns
    let statsY = classY + this.config.lineSpacing + 4; // Start below class line + 4px spacing

    // Render left column (label left-aligned, value right-aligned)
    for (const stat of leftColumnStats) {
      // Render label
      FontAtlasRenderer.renderText(
        ctx,
        stat.label,
        leftColumnX,
        statsY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );

      // Render value (right-aligned within column)
      const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
      const valueX = leftColumnX + leftColumnWidth - valueWidth;
      FontAtlasRenderer.renderText(
        ctx,
        stat.value,
        valueX,
        statsY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );

      statsY += this.config.lineSpacing;
    }

    // Reset Y position for right column (parallel to left)
    statsY = classY + this.config.lineSpacing + 4;

    // Calculate right column value width for alignment
    const maxRightValueWidth = Math.max(
      FontAtlasRenderer.measureText(`${this.unit.physicalPower}`, font),
      FontAtlasRenderer.measureText(`${this.unit.magicPower}`, font),
      FontAtlasRenderer.measureText(`${this.unit.physicalEvade}`, font),
      FontAtlasRenderer.measureText(`${this.unit.magicEvade}`, font),
      FontAtlasRenderer.measureText(`${this.unit.attunement}`, font)
    );
    const rightColumnWidth = maxRightLabelWidth + 1 + maxRightValueWidth;

    // Render right column (label left-aligned, value right-aligned)
    for (const stat of rightColumnStats) {
      // Render label
      FontAtlasRenderer.renderText(
        ctx,
        stat.label,
        rightColumnX,
        statsY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );

      // Render value (right-aligned within column)
      const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
      const valueX = rightColumnX + rightColumnWidth - valueWidth;
      FontAtlasRenderer.renderText(
        ctx,
        stat.value,
        valueX,
        statsY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );

      statsY += this.config.lineSpacing;
    }
  }

  /**
   * Update the unit being displayed and the panel title/color
   * Call this instead of recreating the content when the unit changes
   * @param unit - New combat unit to display
   * @param title - Optional new title (defaults to unit name)
   * @param titleColor - Optional new title color (defaults to based on isPlayerControlled)
   */
  updateUnit(unit: CombatUnit, title?: string, titleColor?: string): void {
    this.unit = unit;

    // Update title to unit name if not explicitly provided
    if (title !== undefined) {
      this.config.title = title;
    }

    // Update title color if provided
    if (titleColor !== undefined) {
      this.config.titleColor = titleColor;
    }
  }

  // No interaction handling needed for unit info
}

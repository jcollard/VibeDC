import type { CombatUnit } from '../../CombatUnit';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../../../utils/SpriteRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from './PanelContent';
import { HELPER_TEXT, HOVERED_TEXT } from './colors';

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
  private hoveredStatId: string | null = null;
  private lastRegionWidth: number = 0; // Cache region width for hit detection
  private lastRegionHeight: number = 0; // Cache region height for hit detection

  // Helper text for each stat
  private readonly statHelperText: Record<string, string> = {
    'HP': "If HP is reduced to 0 the unit is knocked out",
    'MP': "MP is required for magic based abilities",
    'P.Pow': 'Physical Power determines physical damage',
    'P.Evd': 'Evasion rate vs. Physical Attacks',
    'M.Evd': 'Evasion rate vs. Magical Attacks',
    'M.Pow': 'Magic Power determines magic damage',
    'Move': 'The number of tiles this unit can move',
    'Speed': "Action Timer increases by Speed each turn. Units act when reaching 100.",
    'Courage': 'Courage determines if some abilities succeed',
    'Attunement': 'Attunement determines if some abilities succeed',
    'Action Timer': 'Action Timer increases by Speed each turn. Units act when reaching 100.'
  };

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

    // Cache region dimensions for hit detection
    this.lastRegionWidth = region.width;
    this.lastRegionHeight = region.height;

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
    const nameX = spriteX + 12 + 2; // sprite width + 2px gap
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

    // Determine Action Timer color based on hover state
    const isActionTimerHovered = this.hoveredStatId === 'Action Timer';
    const actionTimerColor = isActionTimerHovered ? HOVERED_TEXT : '#ffffff';

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
        actionTimerColor
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
        actionTimerColor
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
      isActionTimerHovered ? HOVERED_TEXT : '#ffa500' // Yellow when hovered, orange otherwise
    );

    // ===== Section 5: Two-Column Stats Grid =====
    // Define stats for each column
    const leftColumnStats = [
      { label: 'HP', value: `${this.unit.health}/${this.unit.maxHealth}` },
      { label: 'P.Pow', value: `${this.unit.physicalPower}` },
      { label: 'M.Pow', value: `${this.unit.magicPower}` },
      { label: 'Move', value: `${this.unit.movement}` },
      { label: 'Courage', value: `${this.unit.courage}` }
    ];

    const rightColumnStats = [
      { label: 'MP', value: `${this.unit.mana}/${this.unit.maxMana}` },
      { label: 'P.Evd', value: `${this.unit.physicalEvade}` },
      { label: 'M.Evd', value: `${this.unit.magicEvade}` },
      { label: 'Speed', value: `${this.unit.speed}` },
      { label: 'Attunement', value: `${this.unit.attunement}` }
    ];

    // Calculate available width for stats (panel width minus padding on both sides)
    const statsAreaWidth = region.width - (this.config.padding * 2);

    // 8px gap between columns
    const columnGap = 8;

    // Each column gets exactly half the available width minus half the gap
    const columnWidth = (statsAreaWidth - columnGap) / 2;

    // Define column positions
    const leftColumnX = region.x + this.config.padding;
    const rightColumnX = leftColumnX + columnWidth + columnGap;
    let statsY = classY + this.config.lineSpacing + 4; // Start below class line + 4px spacing

    // Render left column (label left-aligned, value right-aligned within column)
    for (const stat of leftColumnStats) {
      // Determine color based on hover state
      const isHovered = this.hoveredStatId === stat.label;
      const color = isHovered ? HOVERED_TEXT : '#ffffff';

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
        color
      );

      // Render value (right-aligned within column width)
      const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
      const valueX = leftColumnX + columnWidth - valueWidth;
      FontAtlasRenderer.renderText(
        ctx,
        stat.value,
        valueX,
        statsY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        color
      );

      statsY += this.config.lineSpacing;
    }

    // Reset Y position for right column (parallel to left)
    statsY = classY + this.config.lineSpacing + 4;

    // Render right column (label left-aligned, value right-aligned within column)
    for (const stat of rightColumnStats) {
      // Determine color based on hover state
      const isHovered = this.hoveredStatId === stat.label;
      const color = isHovered ? HOVERED_TEXT : '#ffffff';

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
        color
      );

      // Render value (right-aligned within column width)
      const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
      const valueX = rightColumnX + columnWidth - valueWidth;
      FontAtlasRenderer.renderText(
        ctx,
        stat.value,
        valueX,
        statsY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        color
      );

      statsY += this.config.lineSpacing;
    }

    // ===== Section 6: Helper Text (below stats grid) =====
    if (this.hoveredStatId !== null && this.statHelperText[this.hoveredStatId]) {
      // Add spacing before helper text
      statsY += 2;

      // Wrap helper text to fit within panel width
      const wrappedLines = this.wrapText(
        this.statHelperText[this.hoveredStatId],
        region.width - (this.config.padding * 2),
        fontId
      );

      // Render each line of helper text
      for (const line of wrappedLines) {
        FontAtlasRenderer.renderText(
          ctx,
          line,
          region.x + this.config.padding,
          statsY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          HELPER_TEXT
        );
        statsY += this.config.lineSpacing;
      }
    }
  }

  /**
   * Wrap text to fit within a maximum width
   * @param text - Text to wrap
   * @param maxWidth - Maximum width in pixels
   * @param fontId - Font ID for text measurement
   * @returns Array of text lines
   */
  private wrapText(text: string, maxWidth: number, fontId: string): string[] {
    const font = FontRegistry.getById(fontId);
    if (!font) {
      return [text];
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = FontAtlasRenderer.measureText(testLine, font);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        // If current line has content, push it and start new line
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word itself is too long, just add it anyway
          lines.push(word);
        }
      }
    }

    // Add the last line
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
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

  /**
   * Handle hover events to show helper text for stats
   * @param relativeX - X coordinate relative to panel region
   * @param relativeY - Y coordinate relative to panel region
   * @returns Hover state change info or null if unchanged
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    // Check if mouse is outside panel bounds
    if (relativeX < 0 || relativeY < 0 ||
        relativeX >= this.lastRegionWidth ||
        relativeY >= this.lastRegionHeight) {
      // Clear hover state if mouse is outside panel
      if (this.hoveredStatId !== null) {
        this.hoveredStatId = null;
        return { statId: null };
      }
      return null;
    }

    const statId = this.getStatIdAt(relativeX, relativeY);

    // Update hover state if changed
    if (statId !== this.hoveredStatId) {
      this.hoveredStatId = statId;
      return { statId }; // Signal that hover state changed
    }

    return null;
  }

  /**
   * Determine which stat (if any) is at the given panel-relative coordinates
   * Returns stat ID (label) or null if no stat at that position
   */
  private getStatIdAt(relativeX: number, relativeY: number): string | null {
    // Calculate layout positions (must match render method)
    const padding = this.config.padding;
    const lineSpacing = this.config.lineSpacing;

    // Sprite and name section height
    const spriteY = padding;
    const nameY = spriteY;
    const classY = nameY + lineSpacing;
    const statsStartY = classY + lineSpacing + 4;

    // Check Action Timer region (top-right)
    // Action Timer label is at spriteY, value is at spriteY + lineSpacing
    const atLabelY = spriteY;
    const atValueY = atLabelY + lineSpacing;

    // Approximate Action Timer region (right side of panel)
    // This covers both the label and value rows
    if (relativeY >= atLabelY && relativeY < atValueY + lineSpacing) {
      // Check if X is on the right side (rough approximation)
      if (relativeX > padding + 50) { // Assume Action Timer takes right portion
        return 'Action Timer';
      }
    }

    // Check if Y is within stats grid
    if (relativeY < statsStartY) {
      return null; // Above stats grid
    }

    // Calculate which stats row (0-4)
    const statsRowY = relativeY - statsStartY;
    const rowIndex = Math.floor(statsRowY / lineSpacing);

    if (rowIndex < 0 || rowIndex >= 5) {
      return null; // Outside stats grid rows
    }

    // Define stat labels (must match render order)
    const leftColumnStats = ['HP', 'P.Pow', 'M.Pow', 'Move', 'Courage'];
    const rightColumnStats = ['MP', 'P.Evd', 'M.Evd', 'Speed', 'Attunement'];

    // Calculate column layout (must match render method)
    const statsAreaWidth = this.lastRegionWidth - (padding * 2);
    const columnGap = 8;
    const columnWidth = (statsAreaWidth - columnGap) / 2;

    // The dividing line between columns is at the end of left column + half the gap
    const columnDivider = padding + columnWidth + (columnGap / 2);

    if (relativeX < columnDivider) {
      // Left column
      return leftColumnStats[rowIndex];
    } else {
      // Right column
      return rightColumnStats[rowIndex];
    }
  }
}

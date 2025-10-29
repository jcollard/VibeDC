import type { CombatUnit } from '../../CombatUnit';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../../../utils/SpriteRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';
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

  // View state management
  private currentView: 'stats' | 'abilities' = 'stats';
  private buttonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private isButtonHovered: boolean = false;

  // Helper text state
  private currentHelperTextFull: string | null = null;
  private isHelperTextTruncated: boolean = false;

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
    'Action Timer': 'Action Timer increases by Speed each turn. Units act when reaching 100.',
    'View Abilities': "Click to view unit's abilities and equipment",
    'Back': 'Click to return to stats view'
  };

  constructor(config: UnitInfoConfig, unit: CombatUnit) {
    this.config = config;
    this.unit = unit;
  }

  /**
   * Toggle between stats view and abilities view
   */
  private toggleView(): void {
    this.currentView = this.currentView === 'stats' ? 'abilities' : 'stats';
    this.hoveredStatId = null; // Clear hover state on view change
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

    // Render common header (sprite, name, class, action timer)
    let currentY = this.renderHeader(ctx, region, fontId, fontAtlasImage, font, spriteImages, spriteSize);

    // Render view-specific content
    if (this.currentView === 'stats') {
      currentY = this.renderStatsView(ctx, region, fontId, fontAtlasImage, font, currentY);
    } else {
      currentY = this.renderAbilitiesView(ctx, region, fontId, fontAtlasImage, font, currentY);
    }

    // Render toggle button (centered, with 2px padding)
    currentY += 2; // Padding above button
    currentY = this.renderToggleButton(ctx, region, fontId, fontAtlasImage, font, currentY);
    currentY += 2; // Padding below button

    // Render helper text (if any)
    this.renderHelperText(ctx, region, fontId, fontAtlasImage, font, currentY);
  }

  /**
   * Render header section: sprite, name, class, action timer
   * @returns Y position after header
   */
  private renderHeader(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    spriteImages?: Map<string, HTMLImageElement>,
    spriteSize?: number
  ): number {
    const spriteX = region.x + this.config.padding;
    const spriteY = region.y + this.config.padding;

    // Sprite rendering
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

    // Name rendering
    const nameX = spriteX + 12 + 2;
    const nameY = spriteY;
    const nameColor = this.unit.isPlayerControlled ? '#00ff00' : '#ff0000';
    FontAtlasRenderer.renderText(ctx, this.unit.name, nameX, nameY, fontId, fontAtlasImage, 1, 'left', nameColor);

    // Class rendering
    const classY = nameY + this.config.lineSpacing;
    let classText = this.unit.unitClass.name;
    if (this.unit.secondaryClass) {
      classText += `/${this.unit.secondaryClass.name}`;
    }
    FontAtlasRenderer.renderText(ctx, classText, nameX, classY, fontId, fontAtlasImage, 1, 'left', '#ffffff');

    // Action Timer rendering
    const atLabelY = spriteY;
    const isActionTimerHovered = this.hoveredStatId === 'Action Timer';
    const actionTimerColor = isActionTimerHovered ? HOVERED_TEXT : '#ffffff';

    const fullLabel = 'ACTION TIMER';
    const fullLabelWidth = FontAtlasRenderer.measureText(fullLabel, font);
    const availableWidth = region.width - (nameX - region.x) - 50;

    if (fullLabelWidth <= availableWidth) {
      const atLabelX = region.x + region.width - this.config.padding - fullLabelWidth;
      FontAtlasRenderer.renderText(ctx, fullLabel, atLabelX, atLabelY, fontId, fontAtlasImage, 1, 'left', actionTimerColor);
    } else {
      const atText = 'AT';
      const atWidth = FontAtlasRenderer.measureText(atText, font);
      const clockSize = 8;
      const gap = 1;
      const totalWidth = clockSize + gap + atWidth;
      const atLabelX = region.x + region.width - this.config.padding - totalWidth;

      if (spriteImages && spriteSize) {
        SpriteRenderer.renderSpriteById(ctx, 'icons-5', spriteImages, spriteSize, atLabelX, atLabelY, clockSize, clockSize);
      }

      FontAtlasRenderer.renderText(ctx, atText, atLabelX + clockSize + gap, atLabelY, fontId, fontAtlasImage, 1, 'left', actionTimerColor);
    }

    const atValue = `${Math.floor(this.unit.actionTimer)}/100`;
    const atValueWidth = FontAtlasRenderer.measureText(atValue, font);
    const atValueX = region.x + region.width - this.config.padding - atValueWidth;
    const atValueY = atLabelY + this.config.lineSpacing;
    FontAtlasRenderer.renderText(ctx, atValue, atValueX, atValueY, fontId, fontAtlasImage, 1, 'left', isActionTimerHovered ? HOVERED_TEXT : '#ffa500');

    return classY + this.config.lineSpacing;
  }

  /**
   * Render stats view: two-column stats grid
   * @returns Y position after stats
   */
  private renderStatsView(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    startY: number
  ): number {
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

    const statsAreaWidth = region.width - (this.config.padding * 2);
    const columnGap = 8;
    const columnWidth = (statsAreaWidth - columnGap) / 2;
    const leftColumnX = region.x + this.config.padding;
    const rightColumnX = leftColumnX + columnWidth + columnGap;
    let statsY = startY + 4;

    // Render left column
    for (const stat of leftColumnStats) {
      const isHovered = this.hoveredStatId === stat.label;
      const color = isHovered ? HOVERED_TEXT : '#ffffff';

      FontAtlasRenderer.renderText(ctx, stat.label, leftColumnX, statsY, fontId, fontAtlasImage, 1, 'left', color);

      const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
      const valueX = leftColumnX + columnWidth - valueWidth;
      FontAtlasRenderer.renderText(ctx, stat.value, valueX, statsY, fontId, fontAtlasImage, 1, 'left', color);

      statsY += this.config.lineSpacing;
    }

    // Render right column
    statsY = startY + 4;
    for (const stat of rightColumnStats) {
      const isHovered = this.hoveredStatId === stat.label;
      const color = isHovered ? HOVERED_TEXT : '#ffffff';

      FontAtlasRenderer.renderText(ctx, stat.label, rightColumnX, statsY, fontId, fontAtlasImage, 1, 'left', color);

      const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
      const valueX = rightColumnX + columnWidth - valueWidth;
      FontAtlasRenderer.renderText(ctx, stat.value, valueX, statsY, fontId, fontAtlasImage, 1, 'left', color);

      statsY += this.config.lineSpacing;
    }

    return statsY;
  }

  /**
   * Render abilities view: ability slots and equipment
   * @returns Y position after abilities
   */
  private renderAbilitiesView(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    startY: number
  ): number {
    let y = startY + 4;

    // Render ability slots
    y = this.renderAbilitySlot(ctx, region, 'Reaction', this.unit.reactionAbility, fontId, fontAtlasImage, font, y);
    y = this.renderAbilitySlot(ctx, region, 'Passive', this.unit.passiveAbility, fontId, fontAtlasImage, font, y);
    y = this.renderAbilitySlot(ctx, region, 'Movement', this.unit.movementAbility, fontId, fontAtlasImage, font, y);

    // Render equipment slots (only for humanoid units)
    if ('leftHand' in this.unit) {
      const humanoid = this.unit as any;
      y = this.renderEquipmentSlot(ctx, region, 'L.Hand', humanoid.leftHand, fontId, fontAtlasImage, font, y);
      y = this.renderEquipmentSlot(ctx, region, 'R.Hand', humanoid.rightHand, fontId, fontAtlasImage, font, y);
      y = this.renderEquipmentSlot(ctx, region, 'Head', humanoid.head, fontId, fontAtlasImage, font, y);
      y = this.renderEquipmentSlot(ctx, region, 'Body', humanoid.body, fontId, fontAtlasImage, font, y);
      y = this.renderEquipmentSlot(ctx, region, 'Accessory', humanoid.accessory, fontId, fontAtlasImage, font, y);
    }

    return y;
  }

  /**
   * Render a single ability slot
   * @returns Y position after slot
   */
  private renderAbilitySlot(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    label: string,
    ability: any,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    y: number
  ): number {
    const padding = this.config.padding;
    const lineSpacing = this.config.lineSpacing;

    const isHovered = this.hoveredStatId === label;
    const color = isHovered ? HOVERED_TEXT : '#ffffff';

    const labelX = region.x + padding;
    FontAtlasRenderer.renderText(ctx, label, labelX, y, fontId, fontAtlasImage, 1, 'left', color);

    const abilityName = ability ? ability.name : '-';
    const valueWidth = FontAtlasRenderer.measureText(abilityName, font);
    const valueX = region.x + region.width - padding - valueWidth;
    FontAtlasRenderer.renderText(ctx, abilityName, valueX, y, fontId, fontAtlasImage, 1, 'left', color);

    return y + lineSpacing;
  }

  /**
   * Render a single equipment slot
   * @returns Y position after slot
   */
  private renderEquipmentSlot(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    label: string,
    equipment: any,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    y: number
  ): number {
    const padding = this.config.padding;
    const lineSpacing = this.config.lineSpacing;

    const isHovered = this.hoveredStatId === label;
    const color = isHovered ? HOVERED_TEXT : '#ffffff';

    const labelX = region.x + padding;
    FontAtlasRenderer.renderText(ctx, label, labelX, y, fontId, fontAtlasImage, 1, 'left', color);

    const equipmentName = equipment ? equipment.name : '-';
    const valueWidth = FontAtlasRenderer.measureText(equipmentName, font);
    const valueX = region.x + region.width - padding - valueWidth;
    FontAtlasRenderer.renderText(ctx, equipmentName, valueX, y, fontId, fontAtlasImage, 1, 'left', color);

    return y + lineSpacing;
  }

  /**
   * Render toggle button
   * @returns Y position after button
   */
  private renderToggleButton(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    y: number
  ): number {
    const lineSpacing = this.config.lineSpacing;
    const buttonText = this.currentView === 'stats' ? 'View Abilities' : 'Back';

    const textWidth = FontAtlasRenderer.measureText(buttonText, font);
    const textX = region.x + Math.floor((region.width - textWidth) / 2);

    // Use hover color when button is hovered
    const buttonColor = this.isButtonHovered ? HOVERED_TEXT : '#ffffff';
    FontAtlasRenderer.renderText(ctx, buttonText, textX, y, fontId, fontAtlasImage, 1, 'left', buttonColor);

    this.buttonBounds = {
      x: textX - region.x,
      y: y - region.y,
      width: textWidth,
      height: lineSpacing
    };

    return y + lineSpacing;
  }

  /**
   * Render helper text with overflow handling
   */
  private renderHelperText(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    _font: any,
    startY: number
  ): void {
    let helperText: string | null = null;

    if (this.hoveredStatId !== null) {
      if (this.currentView === 'stats') {
        helperText = this.statHelperText[this.hoveredStatId] || null;
      } else {
        helperText = this.getAbilityEquipmentHelperText(this.hoveredStatId);
      }
    }

    if (!helperText) {
      this.currentHelperTextFull = null;
      this.isHelperTextTruncated = false;
      return;
    }

    const padding = this.config.padding;
    const lineSpacing = this.config.lineSpacing;
    const availableHeight = region.height - (startY - region.y) - padding;

    const wrappedLines = this.wrapText(helperText, region.width - (padding * 2), fontId);
    const requiredHeight = wrappedLines.length * lineSpacing;

    if (requiredHeight > availableHeight) {
      this.isHelperTextTruncated = true;
      this.currentHelperTextFull = helperText;

      FontAtlasRenderer.renderText(ctx, 'Click for Detail', region.x + padding, startY, fontId, fontAtlasImage, 1, 'left', HELPER_TEXT);
    } else {
      this.isHelperTextTruncated = false;
      this.currentHelperTextFull = null;

      let y = startY;
      for (const line of wrappedLines) {
        FontAtlasRenderer.renderText(ctx, line, region.x + padding, y, fontId, fontAtlasImage, 1, 'left', HELPER_TEXT);
        y += lineSpacing;
      }
    }
  }

  /**
   * Get helper text for ability or equipment slot
   */
  private getAbilityEquipmentHelperText(slotLabel: string): string | null {
    // Check ability slots
    if (slotLabel === 'Reaction' && this.unit.reactionAbility) {
      return this.unit.reactionAbility.description;
    }
    if (slotLabel === 'Passive' && this.unit.passiveAbility) {
      return this.unit.passiveAbility.description;
    }
    if (slotLabel === 'Movement' && this.unit.movementAbility) {
      return this.unit.movementAbility.description;
    }

    // Check equipment slots
    if ('leftHand' in this.unit) {
      const humanoid = this.unit as any;

      if (slotLabel === 'L.Hand' && humanoid.leftHand) {
        return this.formatEquipmentHelperText(humanoid.leftHand);
      }
      if (slotLabel === 'R.Hand' && humanoid.rightHand) {
        return this.formatEquipmentHelperText(humanoid.rightHand);
      }
      if (slotLabel === 'Head' && humanoid.head) {
        return this.formatEquipmentHelperText(humanoid.head);
      }
      if (slotLabel === 'Body' && humanoid.body) {
        return this.formatEquipmentHelperText(humanoid.body);
      }
      if (slotLabel === 'Accessory' && humanoid.accessory) {
        return this.formatEquipmentHelperText(humanoid.accessory);
      }
    }

    return null;
  }

  /**
   * Format equipment helper text with modifiers
   */
  private formatEquipmentHelperText(equipment: any): string {
    const modifierSummary = equipment.modifiers.getSummary();

    if (modifierSummary === 'No modifiers') {
      return equipment.name;
    }

    return `${equipment.name}\n${modifierSummary}`;
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
   * Handle click events for button and helper text
   * @param relativeX - X coordinate relative to panel region
   * @param relativeY - Y coordinate relative to panel region
   * @returns Click result or null if not handled
   */
  handleClick(relativeX: number, relativeY: number): PanelClickResult {
    // Check if button was clicked
    if (this.buttonBounds) {
      const { x, y, width, height } = this.buttonBounds;
      if (relativeX >= x && relativeX <= x + width &&
          relativeY >= y && relativeY <= y + height) {
        this.toggleView();
        return { type: 'view-toggled', view: this.currentView };
      }
    }

    // Check if truncated helper text was clicked
    if (this.isHelperTextTruncated && this.currentHelperTextFull) {
      const helperTextY = this.buttonBounds ? this.buttonBounds.y + this.buttonBounds.height + 2 : 0;
      const helperTextHeight = this.config.lineSpacing;

      if (relativeY >= helperTextY && relativeY <= helperTextY + helperTextHeight) {
        return {
          type: 'combat-log-message',
          message: this.currentHelperTextFull
        };
      }
    }

    return null;
  }

  /**
   * Handle hover events to show helper text for stats/abilities
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
      const hadHover = this.hoveredStatId !== null || this.isButtonHovered;
      this.hoveredStatId = null;
      this.isButtonHovered = false;
      return hadHover ? { statId: null } : null;
    }

    // Check if hovering over button
    const wasButtonHovered = this.isButtonHovered;
    if (this.buttonBounds) {
      const { x, y, width, height } = this.buttonBounds;
      this.isButtonHovered = relativeX >= x && relativeX <= x + width &&
                             relativeY >= y && relativeY <= y + height;
    } else {
      this.isButtonHovered = false;
    }

    // If hovering button, set button text as "hovered stat" for helper text
    if (this.isButtonHovered) {
      const buttonText = this.currentView === 'stats' ? 'View Abilities' : 'Back';
      if (this.hoveredStatId !== buttonText || wasButtonHovered !== this.isButtonHovered) {
        this.hoveredStatId = buttonText;
        return { statId: buttonText, buttonHovered: true };
      }
      return null;
    }

    // Check for stat/ability hover
    let statId: string | null = null;
    if (this.currentView === 'stats') {
      statId = this.getStatIdAt(relativeX, relativeY);
    } else {
      statId = this.getAbilityEquipmentIdAt(relativeX, relativeY);
    }

    // Update hover state if changed
    if (statId !== this.hoveredStatId || wasButtonHovered) {
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

  /**
   * Determine which ability/equipment slot is at the given panel-relative coordinates
   * Returns slot label or null if no slot at that position or slot is empty
   */
  private getAbilityEquipmentIdAt(_relativeX: number, relativeY: number): string | null {
    const padding = this.config.padding;
    const lineSpacing = this.config.lineSpacing;

    // Calculate header height - must match renderHeader's return value
    // renderHeader returns: classY + lineSpacing
    // where classY = nameY + lineSpacing = (spriteY) + lineSpacing = (padding) + lineSpacing
    // So: padding + lineSpacing + lineSpacing = padding + (2 * lineSpacing)
    const headerHeight = padding + (lineSpacing * 2);

    // Calculate abilities start Y (must match renderAbilitiesView)
    const abilitiesStartY = headerHeight + 4; // 4px spacing

    // Check if Y is below header
    if (relativeY < abilitiesStartY) {
      return null;
    }

    // Calculate row index
    const rowY = relativeY - abilitiesStartY;
    const rowIndex = Math.floor(rowY / lineSpacing);

    // Ability slots (rows 0-2)
    const abilitySlots = ['Reaction', 'Passive', 'Movement'];
    if (rowIndex >= 0 && rowIndex < abilitySlots.length) {
      const label = abilitySlots[rowIndex];

      // Check if slot is empty (show "-")
      if (label === 'Reaction' && !this.unit.reactionAbility) return null;
      if (label === 'Passive' && !this.unit.passiveAbility) return null;
      if (label === 'Movement' && !this.unit.movementAbility) return null;

      return label;
    }

    // Equipment slots (rows 3-7, only for humanoid units)
    if ('leftHand' in this.unit) {
      const equipmentSlots = ['L.Hand', 'R.Hand', 'Head', 'Body', 'Accessory'];
      const equipmentRowIndex = rowIndex - abilitySlots.length;

      if (equipmentRowIndex >= 0 && equipmentRowIndex < equipmentSlots.length) {
        const label = equipmentSlots[equipmentRowIndex];
        const humanoid = this.unit as any;

        // Check if slot is empty (show "-")
        if (label === 'L.Hand' && !humanoid.leftHand) return null;
        if (label === 'R.Hand' && !humanoid.rightHand) return null;
        if (label === 'Head' && !humanoid.head) return null;
        if (label === 'Body' && !humanoid.body) return null;
        if (label === 'Accessory' && !humanoid.accessory) return null;

        return label;
      }
    }

    return null;
  }
}

import type { CombatAbility } from '../../CombatAbility';
import type { CombatUnit } from '../../CombatUnit';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from './PanelContent';
import { ITEM_NAME_COLOR, HOVERED_TEXT } from './colors';

const MENU_OPTION_COLOR = '#ffffff';
const LEARNED_COLOR = '#00ff00'; // Green for learned abilities

/**
 * Panel content that displays detailed information about a combat ability.
 * Shows: ability name, type, XP cost, description, and Learn/Cancel options.
 */
export class AbilityInfoContent implements PanelContent {
  private ability: CombatAbility;
  private unit: CombatUnit;
  private padding: number = 4;
  private lineSpacing: number = 8;
  private hoveredOption: 'learn' | 'cancel' | null = null;
  private learnOptionBounds: { x: number; y: number; width: number; height: number } | null = null;
  private cancelOptionBounds: { x: number; y: number; width: number; height: number } | null = null;

  constructor(ability: CombatAbility, unit: CombatUnit) {
    this.ability = ability;
    this.unit = unit;
  }

  /**
   * Update the ability being displayed
   * Allows reusing the same panel instance for different abilities
   */
  public setAbility(ability: CombatAbility): void {
    this.ability = ability;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;
    const font = FontRegistry.getById(fontId);
    if (!font) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    let y = region.y + this.padding;

    // Render ability name (left-aligned, orange)
    FontAtlasRenderer.renderText(
      ctx,
      this.ability.name,
      region.x + this.padding,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ITEM_NAME_COLOR
    );

    // Render XP cost (right-aligned, orange)
    const xpText = `${this.ability.experiencePrice} XP`;
    const xpWidth = FontAtlasRenderer.measureText(xpText, font);
    const xpX = region.x + region.width - this.padding - xpWidth;
    FontAtlasRenderer.renderText(
      ctx,
      xpText,
      xpX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ITEM_NAME_COLOR
    );

    y += this.lineSpacing;

    // Render ability type (left-aligned, white)
    FontAtlasRenderer.renderText(
      ctx,
      this.ability.abilityType,
      region.x + this.padding,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );

    y += this.lineSpacing + 2; // Spacing before description

    // Render description (wrapped, white)
    const maxWidth = region.width - (this.padding * 2);
    const descriptionLines = this.wrapText(this.ability.description, maxWidth, font);

    for (const line of descriptionLines) {
      // Stop if we exceed panel height
      if (y + this.lineSpacing > region.y + region.height - this.padding) {
        break;
      }

      FontAtlasRenderer.renderText(
        ctx,
        line,
        region.x + this.padding,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
      y += this.lineSpacing;
    }

    y += 8; // Extra spacing before options

    // Check if ability is already learned
    const isLearned = this.unit.learnedAbilities.has(this.ability);

    // Render "Learn" or "Learned!" option (centered)
    const learnText = isLearned ? 'Learned!' : 'Learn';
    const learnColor = isLearned ? LEARNED_COLOR : (this.hoveredOption === 'learn' ? HOVERED_TEXT : MENU_OPTION_COLOR);
    const learnWidth = FontAtlasRenderer.measureText(learnText, font);
    const learnX = region.x + Math.floor((region.width - learnWidth) / 2);
    const learnY = y;

    FontAtlasRenderer.renderText(
      ctx,
      learnText,
      learnX,
      learnY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      learnColor
    );

    // Store bounds for hover/click detection (only if not learned)
    if (!isLearned) {
      this.learnOptionBounds = {
        x: learnX - region.x,
        y: learnY - region.y,
        width: learnWidth,
        height: this.lineSpacing
      };
    } else {
      this.learnOptionBounds = null; // Disable clicking/hovering for learned abilities
    }

    y += this.lineSpacing;

    // Render "Cancel" option (centered)
    const cancelText = 'Cancel';
    const cancelColor = this.hoveredOption === 'cancel' ? HOVERED_TEXT : MENU_OPTION_COLOR;
    const cancelWidth = FontAtlasRenderer.measureText(cancelText, font);
    const cancelX = region.x + Math.floor((region.width - cancelWidth) / 2);
    const cancelY = y;

    FontAtlasRenderer.renderText(
      ctx,
      cancelText,
      cancelX,
      cancelY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      cancelColor
    );

    // Store bounds for hover/click detection
    this.cancelOptionBounds = {
      x: cancelX - region.x,
      y: cancelY - region.y,
      width: cancelWidth,
      height: this.lineSpacing
    };

    ctx.restore();
  }

  /**
   * Wrap text to fit within maximum width
   */
  private wrapText(text: string, maxWidth: number, font: any): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = FontAtlasRenderer.measureText(testLine, font);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word); // Word itself too long
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }

  /**
   * Handle hover event
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    let newHoveredOption: 'learn' | 'cancel' | null = null;

    // Check if hovering over learn option
    if (this.learnOptionBounds) {
      const bounds = this.learnOptionBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        newHoveredOption = 'learn';
      }
    }

    // Check if hovering over cancel option
    if (this.cancelOptionBounds && newHoveredOption === null) {
      const bounds = this.cancelOptionBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        newHoveredOption = 'cancel';
      }
    }

    // Check if hover state changed
    if (newHoveredOption !== this.hoveredOption) {
      this.hoveredOption = newHoveredOption;
      return { type: 'ability-option-hover', option: newHoveredOption };
    }

    return null;
  }

  /**
   * Handle click event
   */
  handleClick(relativeX: number, relativeY: number): any {
    // Check if clicking on learn option
    if (this.learnOptionBounds) {
      const bounds = this.learnOptionBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        return { type: 'learn-ability', abilityId: this.ability.id };
      }
    }

    // Check if clicking on cancel option
    if (this.cancelOptionBounds) {
      const bounds = this.cancelOptionBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        return { type: 'cancel-ability-view' };
      }
    }

    return null;
  }
}

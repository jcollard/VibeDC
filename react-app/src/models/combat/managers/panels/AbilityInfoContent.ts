import type { CombatAbility } from '../../CombatAbility';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from './PanelContent';
import { ITEM_NAME_COLOR } from './colors';

/**
 * Panel content that displays detailed information about a combat ability.
 * Shows: centered ability name (orange) and wrapped description text.
 */
export class AbilityInfoContent implements PanelContent {
  private ability: CombatAbility;
  private padding: number = 1;
  private lineSpacing: number = 8;

  constructor(ability: CombatAbility) {
    this.ability = ability;
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

    let y = region.y + this.padding;

    // Render ability name (centered, orange)
    const nameWidth = FontAtlasRenderer.measureText(this.ability.name, font);
    const nameX = region.x + Math.floor((region.width - nameWidth) / 2);
    FontAtlasRenderer.renderText(
      ctx,
      this.ability.name,
      nameX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ITEM_NAME_COLOR
    );

    y += this.lineSpacing + 2; // Spacing after name

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
}

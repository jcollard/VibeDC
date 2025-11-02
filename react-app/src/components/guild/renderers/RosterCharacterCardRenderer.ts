import type { PartyMemberDefinition } from '../../../utils/PartyMemberRegistry';
import { GuildHallConstants as C } from '../../../constants/GuildHallConstants';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { UnitClass } from '../../../models/combat/UnitClass';

export interface RosterCharacterCardOptions {
  x: number;
  y: number;
  isSelected?: boolean;
  isHovered?: boolean;
}

export class RosterCharacterCardRenderer {
  /**
   * Render a roster character card
   * @param ctx Canvas rendering context
   * @param character Party member definition to render
   * @param options Rendering options (position, state)
   * @param spriteImages Map of sprite sheet paths to loaded images
   * @param fontAtlasImage Loaded font atlas image
   */
  static render(
    ctx: CanvasRenderingContext2D,
    character: PartyMemberDefinition,
    options: RosterCharacterCardOptions,
    spriteImages: Map<string, HTMLImageElement>,
    fontAtlasImage: HTMLImageElement
  ): void {
    const { x, y, isSelected, isHovered } = options;
    const card = C.ROSTER_CHARACTER_CARD;

    // Draw background
    if (isSelected) {
      ctx.fillStyle = card.BG_SELECTED;
    } else if (isHovered) {
      ctx.fillStyle = card.BG_HOVER;
    } else {
      ctx.fillStyle = card.BG_NORMAL;
    }
    ctx.fillRect(x, y, card.WIDTH, card.HEIGHT);

    // ⚠️ RENDERING GUIDELINE: Use SpriteRenderer + round coordinates!
    SpriteRenderer.renderSpriteById(
      ctx,
      character.spriteId,
      spriteImages,
      12, // sprite size (12px per sprite)
      Math.floor(x + card.PADDING),
      Math.floor(y + card.PADDING),
      card.SPRITE_SIZE,
      card.SPRITE_SIZE
    );

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for all text!
    FontAtlasRenderer.renderText(
      ctx,
      character.name,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING),
      '7px-04b03',
      fontAtlasImage,
      1,
      'left',
      card.NAME_COLOR
    );

    // Render class
    const unitClass = UnitClass.getById(character.unitClassId);
    const className = unitClass?.name || 'Unknown';
    FontAtlasRenderer.renderText(
      ctx,
      className,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 8),
      '7px-04b03',
      fontAtlasImage,
      1,
      'left',
      card.CLASS_COLOR
    );

    // Render level (TODO: calculate from totalExperience)
    const level = 1;
    FontAtlasRenderer.renderText(
      ctx,
      `Lv. ${level}`,
      Math.floor(x + card.WIDTH - 30),
      Math.floor(y + card.PADDING),
      '7px-04b03',
      fontAtlasImage,
      1,
      'left',
      card.LEVEL_COLOR
    );

    // Render left arrow (add button) - always visible
    // Use minimap-8 sprite (left arrow)
    const arrowSize = 12;
    const arrowX = x + card.PADDING;
    const arrowY = y + Math.floor((card.HEIGHT - arrowSize) / 2);

    SpriteRenderer.renderSpriteById(
      ctx,
      'minimap-8',
      spriteImages,
      12,
      Math.floor(arrowX),
      Math.floor(arrowY),
      arrowSize,
      arrowSize
    );
  }

  /**
   * Check if the add arrow is hovered
   * @param mouseX Mouse X coordinate
   * @param mouseY Mouse Y coordinate
   * @param cardX Card X position
   * @param cardY Card Y position
   * @returns true if add arrow is hovered
   */
  static isAddButtonHovered(
    mouseX: number,
    mouseY: number,
    cardX: number,
    cardY: number
  ): boolean {
    const card = C.ROSTER_CHARACTER_CARD;
    const arrowSize = 12;
    const arrowX = cardX + card.PADDING;
    const arrowY = cardY + Math.floor((card.HEIGHT - arrowSize) / 2);

    return (
      mouseX >= arrowX &&
      mouseX <= arrowX + arrowSize &&
      mouseY >= arrowY &&
      mouseY <= arrowY + arrowSize
    );
  }
}

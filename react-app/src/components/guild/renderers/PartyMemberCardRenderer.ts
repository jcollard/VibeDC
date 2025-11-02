import type { CombatUnit } from '../../../models/combat/CombatUnit';
import type { PartyMemberDefinition } from '../../../utils/PartyMemberRegistry';
import { UnitClass } from '../../../models/combat/UnitClass';
import { GuildHallConstants as C } from '../../../constants/GuildHallConstants';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

export interface PartyMemberCardOptions {
  x: number;
  y: number;
  isSelected?: boolean;
  isHovered?: boolean;
  characterDef?: PartyMemberDefinition;
}

export class PartyMemberCardRenderer {
  /**
   * Render a party member card
   * @param ctx Canvas rendering context
   * @param member Combat unit to render
   * @param options Rendering options (position, state, character definition)
   * @param spriteImages Map of sprite sheet paths to loaded images
   * @param fontAtlasImage Loaded font atlas image
   */
  static render(
    ctx: CanvasRenderingContext2D,
    member: CombatUnit,
    options: PartyMemberCardOptions,
    spriteImages: Map<string, HTMLImageElement>,
    fontAtlasImage: HTMLImageElement
  ): void {
    const { x, y } = options;
    const card = C.PARTY_MEMBER_CARD;

    // Draw background (no border)
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, card.WIDTH, card.HEIGHT);

    // ⚠️ RENDERING GUIDELINE: Use SpriteRenderer + round coordinates!
    SpriteRenderer.renderSpriteById(
      ctx,
      member.spriteId,
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
      member.name,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING),
      '7px-04b03',
      fontAtlasImage,
      1,
      'left',
      card.NAME_COLOR
    );

    // Render primary class / secondary class
    const characterDef = options.characterDef;
    let classText = member.unitClass.name;

    if (characterDef?.secondaryClassId) {
      const secondaryClass = UnitClass.getById(characterDef.secondaryClassId);
      if (secondaryClass) {
        classText = `${member.unitClass.name}/${secondaryClass.name}`;
      }
    }

    FontAtlasRenderer.renderText(
      ctx,
      classText,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 8),
      '7px-04b03',
      fontAtlasImage,
      1,
      'left',
      card.CLASS_COLOR
    );

    // Render total XP
    const totalXP = characterDef?.totalExperience ?? 0;
    FontAtlasRenderer.renderText(
      ctx,
      `XP: ${totalXP}`,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 16),
      '7px-04b03',
      fontAtlasImage,
      1,
      'left',
      card.LEVEL_COLOR
    );

    // Render right arrow (remove button) - always visible
    // Use minimap-6 sprite (right arrow)
    const arrowSize = 12;
    const arrowX = x + card.WIDTH - arrowSize - card.PADDING;
    const arrowY = y + Math.floor((card.HEIGHT - arrowSize) / 2);

    SpriteRenderer.renderSpriteById(
      ctx,
      'minimap-6',
      spriteImages,
      12,
      Math.floor(arrowX),
      Math.floor(arrowY),
      arrowSize,
      arrowSize
    );
  }

  /**
   * Check if the remove arrow is hovered
   * @param mouseX Mouse X coordinate
   * @param mouseY Mouse Y coordinate
   * @param cardX Card X position
   * @param cardY Card Y position
   * @returns true if remove arrow is hovered
   */
  static isRemoveButtonHovered(
    mouseX: number,
    mouseY: number,
    cardX: number,
    cardY: number
  ): boolean {
    const card = C.PARTY_MEMBER_CARD;
    const arrowSize = 12;
    const arrowX = cardX + card.WIDTH - arrowSize - card.PADDING;
    const arrowY = cardY + Math.floor((card.HEIGHT - arrowSize) / 2);

    return (
      mouseX >= arrowX &&
      mouseX <= arrowX + arrowSize &&
      mouseY >= arrowY &&
      mouseY <= arrowY + arrowSize
    );
  }
}

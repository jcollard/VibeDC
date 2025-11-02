import type { CombatUnit } from '../../../models/combat/CombatUnit';
import { GuildHallConstants as C } from '../../../constants/GuildHallConstants';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

export interface PartyMemberCardOptions {
  x: number;
  y: number;
  isSelected?: boolean;
  isHovered?: boolean;
}

export class PartyMemberCardRenderer {
  /**
   * Render a party member card
   * @param ctx Canvas rendering context
   * @param member Combat unit to render
   * @param options Rendering options (position, state)
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
    const { x, y, isSelected, isHovered } = options;
    const card = C.PARTY_MEMBER_CARD;

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, card.WIDTH, card.HEIGHT);

    // Draw border
    if (isSelected) {
      ctx.strokeStyle = card.BORDER_SELECTED;
      ctx.lineWidth = 2;
    } else if (isHovered) {
      ctx.strokeStyle = card.BORDER_HOVER;
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = card.BORDER_NORMAL;
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(x, y, card.WIDTH, card.HEIGHT);
    ctx.lineWidth = 1;

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

    // Render class
    FontAtlasRenderer.renderText(
      ctx,
      member.unitClass.name,
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
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 16),
      '7px-04b03',
      fontAtlasImage,
      1,
      'left',
      card.LEVEL_COLOR
    );

    // Render HP bar
    const hpPercent = member.health / member.maxHealth;
    this.renderStatBar(
      ctx,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 24),
      card.BAR_WIDTH,
      card.BAR_HEIGHT,
      hpPercent,
      card.HP_BAR_COLOR
    );

    // Render MP bar
    const mpPercent = member.mana / member.maxMana;
    this.renderStatBar(
      ctx,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 28),
      card.BAR_WIDTH,
      card.BAR_HEIGHT,
      mpPercent,
      card.MANA_BAR_COLOR
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
   * Render a stat bar (HP/MP)
   * @private
   */
  private static renderStatBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    percent: number,
    color: string
  ): void {
    // Draw background
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, width, height);

    // Draw fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * percent, height);

    // Draw border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(x, y, width, height);
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

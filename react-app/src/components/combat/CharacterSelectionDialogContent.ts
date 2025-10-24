import { DialogContent } from '../../utils/DialogRenderer';
import type { ContentBounds } from '../../utils/DialogRenderer';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import type { PartyMemberDefinition } from '../../utils/PartyMemberRegistry';

/**
 * Dialog content for character selection
 */
export class CharacterSelectionDialogContent extends DialogContent {
  private title: string;
  private partyMembers: PartyMemberDefinition[];
  private font: string;
  private spriteImages: Map<string, HTMLImageElement>;
  private tileSize: number;
  private spriteSize: number;

  constructor(
    title: string,
    partyMembers: PartyMemberDefinition[],
    font: string,
    spriteImages: Map<string, HTMLImageElement>,
    tileSize: number,
    spriteSize: number
  ) {
    super();
    this.title = title;
    this.partyMembers = partyMembers;
    this.font = font;
    this.spriteImages = spriteImages;
    this.tileSize = tileSize;
    this.spriteSize = spriteSize;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const TITLE_FONT_SIZE = 32;
    const NAME_FONT_SIZE = 16;
    const SPRITE_SIZE_PIXELS = this.tileSize * 2; // Characters are 2x2 tiles
    const SPACING = this.tileSize * 2.5; // Space between characters

    // DEBUG: Draw rectangle around content bounds
    const bounds = this.getBounds();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, bounds.width, bounds.height);

    // Render title
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${TITLE_FONT_SIZE}px "${this.font}", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Calculate title position (centered horizontally)
    const titleX = x + (this.partyMembers.length * SPACING - this.tileSize) / 2;
    ctx.fillText(this.title, titleX, y);

    // Render character sprites and names
    const spriteY = y + TITLE_FONT_SIZE + this.tileSize; // Below title with 1 tile spacing

    this.partyMembers.forEach((member, index) => {
      if (!member.spriteId) return;

      const spriteDef = SpriteRegistry.getById(member.spriteId);
      if (!spriteDef) return;

      const spriteImage = this.spriteImages.get(spriteDef.spriteSheet);
      if (!spriteImage) return;

      const memberX = x + index * SPACING;

      // Draw character sprite
      const srcX = spriteDef.x * this.spriteSize;
      const srcY = spriteDef.y * this.spriteSize;
      const srcWidth = (spriteDef.width || 1) * this.spriteSize;
      const srcHeight = (spriteDef.height || 1) * this.spriteSize;

      ctx.drawImage(
        spriteImage,
        srcX, srcY, srcWidth, srcHeight,
        memberX, spriteY, SPRITE_SIZE_PIXELS, SPRITE_SIZE_PIXELS
      );

      // Draw character name below sprite
      ctx.fillStyle = '#000000';
      ctx.font = `${NAME_FONT_SIZE}px "${this.font}", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(member.name, memberX + this.tileSize, spriteY + SPRITE_SIZE_PIXELS);
    });
  }

  protected getBounds(): ContentBounds {
    const TITLE_FONT_SIZE = 32;
    const NAME_FONT_SIZE = 16;
    const SPRITE_SIZE_PIXELS = this.tileSize * 2;
    const SPACING = this.tileSize * 2.5;

    // Calculate width: sprite + (n-1) spacings between characters
    // For 3 characters: sprite + spacing + sprite + spacing + sprite
    const totalWidth = SPRITE_SIZE_PIXELS + (SPACING * (this.partyMembers.length - 1));

    // Calculate height to align with tile boundaries: 4 tiles = 192px
    // 32 (title) + 48 (spacing) + 96 (sprite) + 16 (name) = 192px
    const totalHeight = TITLE_FONT_SIZE + this.tileSize + SPRITE_SIZE_PIXELS + NAME_FONT_SIZE;

    return {
      width: totalWidth,
      height: totalHeight,
      minX: 0,
      minY: 0,
      maxX: totalWidth,
      maxY: totalHeight,
    };
  }
}

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
  private hoveredIndex: number | null;
  private highlightColor: string;

  constructor(
    title: string,
    partyMembers: PartyMemberDefinition[],
    font: string,
    spriteImages: Map<string, HTMLImageElement>,
    tileSize: number,
    spriteSize: number,
    hoveredIndex: number | null = null,
    highlightColor: string = '#ccaa00'
  ) {
    super();
    this.title = title;
    this.partyMembers = partyMembers;
    this.font = font;
    this.spriteImages = spriteImages;
    this.tileSize = tileSize;
    this.spriteSize = spriteSize;
    this.hoveredIndex = hoveredIndex;
    this.highlightColor = highlightColor;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const TITLE_FONT_SIZE = 32;
    const NAME_FONT_SIZE = 32; // Match the title font size
    const SPRITE_SIZE_PIXELS = this.tileSize * 1; // Characters are 1x1 tiles (48px)
    const ROW_HEIGHT = 48; // Each row is exactly 48px tall
    const TITLE_SPACING = 8; // Space after title
    const NAME_OFFSET = 8; // Horizontal space between sprite and name

    // DEBUG: Draw rectangle around content bounds
    const bounds = this.getBounds();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, bounds.width, bounds.height);

    // Render title
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${TITLE_FONT_SIZE}px "${this.font}", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.title, x, y);

    // Render character sprites in a column with names to the right
    const firstRowY = y + TITLE_FONT_SIZE + TITLE_SPACING; // Below title with small spacing

    this.partyMembers.forEach((member, index) => {
      if (!member.spriteId) return;

      const spriteDef = SpriteRegistry.getById(member.spriteId);
      if (!spriteDef) return;

      const spriteImage = this.spriteImages.get(spriteDef.spriteSheet);
      if (!spriteImage) return;

      const rowY = firstRowY + (index * ROW_HEIGHT);

      // Draw character sprite
      const srcX = spriteDef.x * this.spriteSize;
      const srcY = spriteDef.y * this.spriteSize;
      const srcWidth = (spriteDef.width || 1) * this.spriteSize;
      const srcHeight = (spriteDef.height || 1) * this.spriteSize;

      ctx.drawImage(
        spriteImage,
        srcX, srcY, srcWidth, srcHeight,
        x, rowY, SPRITE_SIZE_PIXELS, SPRITE_SIZE_PIXELS
      );

      // Draw character name to the right of sprite (truncated to 13 characters)
      const truncatedName = member.name.substring(0, 13);

      // Use highlight color if this row is hovered
      ctx.fillStyle = this.hoveredIndex === index ? this.highlightColor : '#000000';
      ctx.font = `${NAME_FONT_SIZE}px "${this.font}", monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(truncatedName, x + SPRITE_SIZE_PIXELS + NAME_OFFSET, rowY + (SPRITE_SIZE_PIXELS / 2));
    });
  }

  protected getBounds(): ContentBounds {
    const TITLE_FONT_SIZE = 32;
    const NAME_FONT_SIZE = 32; // Match the title font size
    const SPRITE_SIZE_PIXELS = this.tileSize * 1;
    const ROW_HEIGHT = 48; // Each row is exactly 48px tall
    const TITLE_SPACING = 8; // Space after title
    const NAME_OFFSET = 8;

    // Create a temporary canvas to measure text width accurately
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      // Fallback to estimates if context not available
      const totalWidth = this.title.length * 20;
      const totalHeight = TITLE_FONT_SIZE + TITLE_SPACING + (ROW_HEIGHT * this.partyMembers.length);
      return { width: totalWidth, height: totalHeight, minX: 0, minY: 0, maxX: totalWidth, maxY: totalHeight };
    }

    // Measure title width
    tempCtx.font = `bold ${TITLE_FONT_SIZE}px "${this.font}", monospace`;
    const titleWidth = tempCtx.measureText(this.title).width;

    // Measure character list width (sprite + offset + longest name)
    tempCtx.font = `${NAME_FONT_SIZE}px "${this.font}", monospace`;
    let maxNameWidth = 0;
    this.partyMembers.forEach(member => {
      const truncatedName = member.name.substring(0, 13);
      const nameWidth = tempCtx.measureText(truncatedName).width;
      maxNameWidth = Math.max(maxNameWidth, nameWidth);
    });
    const characterListWidth = SPRITE_SIZE_PIXELS + NAME_OFFSET + maxNameWidth;

    // Use the maximum of title width and character list width
    const totalWidth = Math.max(titleWidth, characterListWidth);

    // Calculate height: title + spacing + (rows at 48px each, no gaps)
    // Each row is exactly 48px tall
    const totalHeight = TITLE_FONT_SIZE + TITLE_SPACING + (ROW_HEIGHT * this.partyMembers.length);

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

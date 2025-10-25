import { DialogContent } from '../../utils/DialogRenderer';
import type { ContentBounds } from '../../utils/DialogRenderer';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import type { PartyMemberDefinition } from '../../utils/PartyMemberRegistry';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../utils/FontRegistry';

/**
 * Dialog content for character selection
 */
export class CharacterSelectionDialogContent extends DialogContent {
  private title: string;
  private partyMembers: PartyMemberDefinition[];
  private fontId: string;
  private fontAtlasImage: HTMLImageElement | null;
  private spriteImages: Map<string, HTMLImageElement>;
  private tileSize: number;
  private spriteSize: number;
  private hoveredIndex: number | null;
  private highlightColor: string;

  constructor(
    title: string,
    partyMembers: PartyMemberDefinition[],
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    spriteImages: Map<string, HTMLImageElement>,
    tileSize: number,
    spriteSize: number,
    hoveredIndex: number | null = null,
    highlightColor: string = '#ccaa00'
  ) {
    super();
    this.title = title;
    this.partyMembers = partyMembers;
    this.fontId = fontId;
    this.fontAtlasImage = fontAtlasImage;
    this.spriteImages = spriteImages;
    this.tileSize = tileSize;
    this.spriteSize = spriteSize;
    this.hoveredIndex = hoveredIndex;
    this.highlightColor = highlightColor;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (!this.fontAtlasImage) {
      console.warn('Font atlas image not loaded');
      return;
    }

    const font = FontRegistry.getById(this.fontId);
    if (!font) {
      console.warn(`Font '${this.fontId}' not found in registry`);
      return;
    }

    const TITLE_SCALE = 1; // Scale for title (reduced from 2 for new resolution)
    const NAME_SCALE = 1; // Scale for names (reduced from 2 for new resolution)
    const SPRITE_SIZE_PIXELS = this.tileSize * 1; // Characters are 1x1 tiles (12px at new resolution)
    const ROW_HEIGHT = 12; // Each row is exactly 12px tall (reduced from 48)
    const TITLE_SPACING = 2; // Space after title (reduced from 8)
    const NAME_OFFSET = 2; // Horizontal space between sprite and name (reduced from 8)

    // Render title using FontAtlasRenderer
    const titleHeight = font.charHeight * TITLE_SCALE;
    FontAtlasRenderer.renderText(
      ctx,
      this.title,
      x,
      y,
      this.fontId,
      this.fontAtlasImage,
      TITLE_SCALE,
      'left',
      '#000000' // Black color
    );

    // Render character sprites in a column with names to the right
    const firstRowY = y + titleHeight + TITLE_SPACING; // Below title with small spacing

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

      // Render name using FontAtlasRenderer with appropriate color
      const nameY = rowY + (SPRITE_SIZE_PIXELS / 2) - (font.charHeight * NAME_SCALE / 2);
      const textColor = this.hoveredIndex === index ? this.highlightColor : '#000000';

      if (this.fontAtlasImage) {
        FontAtlasRenderer.renderText(
          ctx,
          truncatedName,
          x + SPRITE_SIZE_PIXELS + NAME_OFFSET,
          nameY,
          this.fontId,
          this.fontAtlasImage,
          NAME_SCALE,
          'left',
          textColor
        );
      }
    });
  }

  protected getBounds(): ContentBounds {
    const font = FontRegistry.getById(this.fontId);
    if (!font) {
      console.warn(`Font '${this.fontId}' not found in registry`);
      // Fallback to estimates (scaled down from previous values)
      const totalWidth = this.title.length * 5; // Reduced from 20
      const totalHeight = 10 + (12 * this.partyMembers.length); // Reduced from 40 + (48 * length)
      return { width: totalWidth, height: totalHeight, minX: 0, minY: 0, maxX: totalWidth, maxY: totalHeight };
    }

    const TITLE_SCALE = 1; // Scale for title (reduced from 2 for new resolution)
    const NAME_SCALE = 1; // Scale for names (reduced from 2 for new resolution)
    const SPRITE_SIZE_PIXELS = this.tileSize * 1;
    const ROW_HEIGHT = 12; // Each row is exactly 12px tall (reduced from 48)
    const TITLE_SPACING = 2; // Space after title (reduced from 8)
    const NAME_OFFSET = 2; // Horizontal space between sprite and name (reduced from 8)

    // Measure title width using FontAtlasRenderer
    const titleWidth = FontAtlasRenderer.measureTextByFontId(this.title, this.fontId) * TITLE_SCALE;

    // Measure character list width (sprite + offset + longest name)
    let maxNameWidth = 0;
    this.partyMembers.forEach(member => {
      const truncatedName = member.name.substring(0, 13);
      const nameWidth = FontAtlasRenderer.measureTextByFontId(truncatedName, this.fontId) * NAME_SCALE;
      maxNameWidth = Math.max(maxNameWidth, nameWidth);
    });
    const characterListWidth = SPRITE_SIZE_PIXELS + NAME_OFFSET + maxNameWidth;

    // Use the maximum of title width and character list width
    const totalWidth = Math.max(titleWidth, characterListWidth);

    // Calculate height: title + spacing + (rows at 48px each, no gaps)
    // Each row is exactly 48px tall
    const titleHeight = font.charHeight * TITLE_SCALE;
    const totalHeight = titleHeight + TITLE_SPACING + (ROW_HEIGHT * this.partyMembers.length);

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

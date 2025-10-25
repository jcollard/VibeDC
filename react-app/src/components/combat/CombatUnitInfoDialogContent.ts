import { DialogContent } from '../../utils/DialogRenderer';
import type { ContentBounds } from '../../utils/DialogRenderer';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import type { CombatUnit } from '../../models/combat/CombatUnit';

/**
 * Dialog content for displaying combat unit information
 */
export class CombatUnitInfoDialogContent extends DialogContent {
  private unit: CombatUnit;
  private font: string;
  private spriteImages: Map<string, HTMLImageElement>;
  private tileSize: number;
  private spriteSize: number;
  private fontSize: number;

  constructor(
    unit: CombatUnit,
    font: string,
    spriteImages: Map<string, HTMLImageElement>,
    tileSize: number,
    spriteSize: number,
    fontSize: number = 16
  ) {
    super();
    this.unit = unit;
    this.font = font;
    this.spriteImages = spriteImages;
    this.tileSize = tileSize;
    this.spriteSize = spriteSize;
    this.fontSize = fontSize;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const FONT_SIZE = this.fontSize;
    const LINE_HEIGHT = Math.ceil(this.fontSize * 1.125); // 1.125x font size for line height
    const SPRITE_SIZE_PIXELS = this.tileSize; // 48px
    const NAME_FONT_SIZE = Math.ceil(this.fontSize * 1.25); // 1.25x font size for name
    const SPACING = 8;

    let currentY = y;

    // Render unit sprite
    const spriteDef = SpriteRegistry.getById(this.unit.spriteId);
    if (spriteDef) {
      const spriteImage = this.spriteImages.get(spriteDef.spriteSheet);
      if (spriteImage) {
        const srcX = spriteDef.x * this.spriteSize;
        const srcY = spriteDef.y * this.spriteSize;
        const srcWidth = (spriteDef.width || 1) * this.spriteSize;
        const srcHeight = (spriteDef.height || 1) * this.spriteSize;

        ctx.drawImage(
          spriteImage,
          srcX, srcY, srcWidth, srcHeight,
          x, currentY, SPRITE_SIZE_PIXELS, SPRITE_SIZE_PIXELS
        );
      }
    }

    // Render unit name to the right of sprite
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${NAME_FONT_SIZE}px "${this.font}", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.unit.name, x + SPRITE_SIZE_PIXELS + SPACING, currentY + (SPRITE_SIZE_PIXELS / 2));

    currentY += SPRITE_SIZE_PIXELS + SPACING;

    // Prepare stats with labels and max digits
    // Layout: Row 1: HP/MP, Row 2: SPD/MV, Row 3: P.Pow/M.Pow, Row 4: P.Ev/M.Ev, Row 5: Cour/Attn
    // TEST: Display 999 for all values to test maximum width
    const stats = [
      { label: 'HP', value: '999/999', maxDigits: 7 },
      { label: 'MP', value: '999/999', maxDigits: 7 },
      { label: 'SPD', value: '99', maxDigits: 2 },
      { label: 'MV', value: '9', maxDigits: 1 },
      { label: 'P.Pow', value: '99', maxDigits: 2 },
      { label: 'M.Pow', value: '99', maxDigits: 2 },
      { label: 'P.Ev', value: '99', maxDigits: 2 },
      { label: 'M.Ev', value: '99', maxDigits: 2 },
      { label: 'Cour', value: '99', maxDigits: 2 },
      { label: 'Attn', value: '99', maxDigits: 2 },
    ];

    // Render stats in two columns (row-major order)
    ctx.font = `${FONT_SIZE}px "${this.font}", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Scale column width based on font size (approximately 5.5x font size)
    const COL_WIDTH = Math.ceil(this.fontSize * 5.5);

    stats.forEach((stat, index) => {
      // Row-major order: fill left to right, then move to next row
      const row = Math.floor(index / 2);
      const column = index % 2;
      const statX = x + (column * COL_WIDTH);
      const statY = currentY + (row * LINE_HEIGHT);

      // Render label
      ctx.fillStyle = '#000000';
      ctx.fillText(`${stat.label}:`, statX, statY);

      // Render value (right-aligned within the column)
      const valueX = statX + COL_WIDTH - 8;
      ctx.textAlign = 'right';
      ctx.fillText(stat.value, valueX, statY);
      ctx.textAlign = 'left';
    });
  }

  protected getBounds(): ContentBounds {
    const LINE_HEIGHT = Math.ceil(this.fontSize * 1.125);
    const SPRITE_SIZE_PIXELS = this.tileSize; // 48px
    const NAME_FONT_SIZE = Math.ceil(this.fontSize * 1.25);
    const SPACING = 8;
    const COL_WIDTH = Math.ceil(this.fontSize * 5.5);

    // Create a temporary canvas to measure text width accurately
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      // Fallback to estimates if context not available
      const totalWidth = COL_WIDTH * 2;
      const totalHeight = SPRITE_SIZE_PIXELS + SPACING + (LINE_HEIGHT * 5);
      return { width: totalWidth, height: totalHeight, minX: 0, minY: 0, maxX: totalWidth, maxY: totalHeight };
    }

    // Measure name width
    tempCtx.font = `bold ${NAME_FONT_SIZE}px "${this.font}", monospace`;
    const nameWidth = tempCtx.measureText(this.unit.name).width;

    // Total width is sprite + spacing + name OR two columns of stats (whichever is wider)
    const topRowWidth = SPRITE_SIZE_PIXELS + SPACING + nameWidth;
    const statsWidth = COL_WIDTH * 2;
    const totalWidth = Math.max(topRowWidth, statsWidth);

    // Height: sprite + spacing + stats (5 rows in each column)
    const statsHeight = LINE_HEIGHT * 5; // 5 rows of stats
    const totalHeight = SPRITE_SIZE_PIXELS + SPACING + statsHeight;

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

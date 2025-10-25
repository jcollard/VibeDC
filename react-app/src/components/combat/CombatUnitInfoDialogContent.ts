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

  constructor(
    unit: CombatUnit,
    font: string,
    spriteImages: Map<string, HTMLImageElement>,
    tileSize: number,
    spriteSize: number
  ) {
    super();
    this.unit = unit;
    this.font = font;
    this.spriteImages = spriteImages;
    this.tileSize = tileSize;
    this.spriteSize = spriteSize;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const FONT_SIZE = 16;
    const LINE_HEIGHT = 18;
    const SPRITE_SIZE_PIXELS = this.tileSize; // 48px
    const NAME_FONT_SIZE = 20;
    const SPACING = 4;

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
    const stats = [
      { label: 'HP', value: `${this.unit.health}/${this.unit.maxHealth}`, maxDigits: 7 }, // "999/999"
      { label: 'MP', value: `${this.unit.mana}/${this.unit.maxMana}`, maxDigits: 7 },
      { label: 'PP', value: this.unit.physicalPower.toString(), maxDigits: 2 },
      { label: 'MgP', value: this.unit.magicPower.toString(), maxDigits: 2 },
      { label: 'SPD', value: this.unit.speed.toString(), maxDigits: 2 },
      { label: 'MOV', value: this.unit.movement.toString(), maxDigits: 1 },
      { label: 'PE', value: this.unit.physicalEvade.toString(), maxDigits: 2 },
      { label: 'ME', value: this.unit.magicEvade.toString(), maxDigits: 2 },
      { label: 'C', value: this.unit.courage.toString(), maxDigits: 2 },
      { label: 'A', value: this.unit.attunement.toString(), maxDigits: 2 },
    ];

    // Render stats in two columns
    ctx.font = `${FONT_SIZE}px "${this.font}", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const COL_WIDTH = 90;
    const statsPerColumn = Math.ceil(stats.length / 2);

    stats.forEach((stat, index) => {
      const column = Math.floor(index / statsPerColumn);
      const row = index % statsPerColumn;
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
    const LINE_HEIGHT = 18;
    const SPRITE_SIZE_PIXELS = this.tileSize;
    const NAME_FONT_SIZE = 20;
    const SPACING = 4;
    const COL_WIDTH = 90;

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

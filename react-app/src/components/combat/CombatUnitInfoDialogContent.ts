import { DialogContent } from '../../utils/DialogRenderer';
import type { ContentBounds } from '../../utils/DialogRenderer';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import type { CombatUnit } from '../../models/combat/CombatUnit';
import { HumanoidUnit } from '../../models/combat/HumanoidUnit';

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

    // Render unit sprite on the left
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

    // Render unit name to the right of sprite (moved up 16px)
    const textX = x + SPRITE_SIZE_PIXELS + SPACING;
    const textY = currentY - 16;
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${NAME_FONT_SIZE}px "${this.font}", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.unit.name, textX, textY);

    // Render class information below name (moved up additional 8px from previous -4, now -12)
    ctx.font = `${FONT_SIZE}px "${this.font}", monospace`;
    const classText = this.unit.secondaryClass
      ? `${this.unit.unitClass.name}/${this.unit.secondaryClass.name}`
      : this.unit.unitClass.name;
    ctx.fillText(classText, textX, textY + NAME_FONT_SIZE - 12);

    // Move down past the sprite/name/class area
    currentY += SPRITE_SIZE_PIXELS + SPACING;

    // Prepare stats with labels and max digits
    // Layout: Row 1: HP/MP, Row 2: Speed/Move, Row 3: P.Power/M.Power, Row 4: P.Evade/M.Evade, Row 5: Courage/Attunement
    // TEST: Display 999 for all values to test maximum width
    const stats = [
      { label: 'HP', value: '999/999', maxDigits: 7 },
      { label: 'MP', value: '999/999', maxDigits: 7 },
      { label: 'Speed', value: '99', maxDigits: 2 },
      { label: 'Move', value: '9', maxDigits: 1 },
      { label: 'P.Power', value: '99', maxDigits: 2 },
      { label: 'M.Power', value: '99', maxDigits: 2 },
      { label: 'P.Evade', value: '99', maxDigits: 2 },
      { label: 'M.Evade', value: '99', maxDigits: 2 },
      { label: 'Courage', value: '99', maxDigits: 2 },
      { label: 'Attunement', value: '99', maxDigits: 2 },
    ];

    // Render stats in two columns (row-major order)
    ctx.font = `${FONT_SIZE}px "${this.font}", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Scale column width based on font size (approximately 5.5x font size)
    // Reduced by 24px for tighter label-value spacing
    const COL_WIDTH = Math.ceil(this.fontSize * 5.5) - 24;
    // Add 16px spacing between columns
    const COL_SPACING = 16;

    stats.forEach((stat, index) => {
      // Row-major order: fill left to right, then move to next row
      const row = Math.floor(index / 2);
      const column = index % 2;
      const statX = x + (column * (COL_WIDTH + COL_SPACING));
      const statY = currentY + (row * LINE_HEIGHT);

      // Render label
      ctx.fillStyle = '#000000';
      ctx.fillText(stat.label, statX, statY);

      // Render value (right-aligned within the column)
      const valueX = statX + COL_WIDTH - 8;
      ctx.textAlign = 'right';
      ctx.fillText(stat.value, valueX, statY);
      ctx.textAlign = 'left';
    });

    // Move down past stats
    currentY += LINE_HEIGHT * 5 + SPACING;

    // Render ability slots
    // Use wider width for abilities/equipment (full two-column width)
    const ABILITY_WIDTH = (COL_WIDTH * 2) + COL_SPACING;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';

    const abilities = [
      { label: 'Reaction', ability: this.unit.reactionAbility },
      { label: 'Passive', ability: this.unit.passiveAbility },
      { label: 'Movement', ability: this.unit.movementAbility },
    ];

    abilities.forEach((slot, index) => {
      const abilityY = currentY + (index * LINE_HEIGHT);
      ctx.fillText(slot.label, x, abilityY);

      const abilityName = slot.ability ? slot.ability.name : '-';
      const valueX = x + ABILITY_WIDTH - 8;
      ctx.textAlign = 'right';
      ctx.fillText(abilityName, valueX, abilityY);
      ctx.textAlign = 'left';
    });

    // Move down past abilities
    currentY += LINE_HEIGHT * 3 + SPACING;

    // Render equipment slots if unit is humanoid
    if (this.unit instanceof HumanoidUnit) {
      const equipment = [
        { label: 'L.Hand', item: this.unit.leftHand },
        { label: 'R.Hand', item: this.unit.rightHand },
        { label: 'Head', item: this.unit.head },
        { label: 'Body', item: this.unit.body },
        { label: 'Accessory', item: this.unit.accessory },
      ];

      equipment.forEach((slot, index) => {
        const equipY = currentY + (index * LINE_HEIGHT);
        ctx.fillText(slot.label, x, equipY);

        const itemName = slot.item ? slot.item.name : '-';
        const valueX = x + ABILITY_WIDTH - 8;
        ctx.textAlign = 'right';
        ctx.fillText(itemName, valueX, equipY);
        ctx.textAlign = 'left';
      });
    }
  }

  protected getBounds(): ContentBounds {
    const LINE_HEIGHT = Math.ceil(this.fontSize * 1.125);
    const SPRITE_SIZE_PIXELS = this.tileSize; // 48px
    const NAME_FONT_SIZE = Math.ceil(this.fontSize * 1.25);
    const SPACING = 8;
    const COL_WIDTH = Math.ceil(this.fontSize * 5.5) - 24; // Reduced by 24px
    const COL_SPACING = 16; // Add spacing between columns

    // Create a temporary canvas to measure text width accurately
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      // Fallback to estimates if context not available
      const totalWidth = (COL_WIDTH * 2) + COL_SPACING;
      const abilitiesHeight = SPACING + (LINE_HEIGHT * 3);
      const equipmentHeight = this.unit instanceof HumanoidUnit ? SPACING + (LINE_HEIGHT * 5) : 0;
      const totalHeight = SPRITE_SIZE_PIXELS + SPACING + (LINE_HEIGHT * 5) + abilitiesHeight + equipmentHeight;
      return { width: totalWidth, height: totalHeight, minX: 0, minY: 0, maxX: totalWidth, maxY: totalHeight };
    }

    // Measure name width
    tempCtx.font = `bold ${NAME_FONT_SIZE}px "${this.font}", monospace`;
    const nameWidth = tempCtx.measureText(this.unit.name).width;

    // Measure class text width
    tempCtx.font = `${this.fontSize}px "${this.font}", monospace`;
    const classText = this.unit.secondaryClass
      ? `${this.unit.unitClass.name}/${this.unit.secondaryClass.name}`
      : this.unit.unitClass.name;
    const classWidth = tempCtx.measureText(classText).width;

    // Total width is max(sprite + spacing + max(name, class), stats)
    const topRowWidth = SPRITE_SIZE_PIXELS + SPACING + Math.max(nameWidth, classWidth);
    const statsWidth = (COL_WIDTH * 2) + COL_SPACING;
    const totalWidth = Math.max(topRowWidth, statsWidth);

    // Height: sprite + spacing + stats (5 rows) + spacing + abilities (3 rows) + spacing + equipment (5 rows if humanoid)
    // The sprite is tall enough to contain both name and class
    const statsHeight = LINE_HEIGHT * 5; // 5 rows of stats
    const abilitiesHeight = SPACING + (LINE_HEIGHT * 3); // 3 ability slots
    const equipmentHeight = this.unit instanceof HumanoidUnit ? SPACING + (LINE_HEIGHT * 5) : 0; // 5 equipment slots if humanoid
    const totalHeight = SPRITE_SIZE_PIXELS + SPACING + statsHeight + abilitiesHeight + equipmentHeight;

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

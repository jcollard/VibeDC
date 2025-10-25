import { DialogContent } from '../../utils/DialogRenderer';
import type { ContentBounds } from '../../utils/DialogRenderer';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import type { CombatUnit } from '../../models/combat/CombatUnit';
import { HumanoidUnit } from '../../models/combat/HumanoidUnit';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../utils/FontRegistry';

/**
 * Dialog content for displaying combat unit information
 */
export class CombatUnitInfoDialogContent extends DialogContent {
  private unit: CombatUnit;
  private fontId: string;
  private fontAtlasImage: HTMLImageElement | null;
  private spriteImages: Map<string, HTMLImageElement>;
  private tileSize: number;
  private spriteSize: number;
  private scale: number;

  constructor(
    unit: CombatUnit,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    spriteImages: Map<string, HTMLImageElement>,
    tileSize: number,
    spriteSize: number,
    scale: number = 1 // Default scale reduced from 2 for new resolution
  ) {
    super();
    this.unit = unit;
    this.fontId = fontId;
    this.fontAtlasImage = fontAtlasImage;
    this.spriteImages = spriteImages;
    this.tileSize = tileSize;
    this.spriteSize = spriteSize;
    this.scale = scale;
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

    const NAME_SCALE = this.scale * 1.5; // 1.5x scale for name
    const TEXT_SCALE = this.scale; // Regular scale for text
    const FONT_HEIGHT = font.charHeight * TEXT_SCALE;
    const NAME_HEIGHT = font.charHeight * NAME_SCALE;
    const LINE_HEIGHT = FONT_HEIGHT + 1; // Add 1px spacing between lines (reduced from 4)
    const SPRITE_SIZE_PIXELS = this.tileSize; // 12px at new resolution
    const SPACING = 2; // Reduced from 8

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

    // Render unit name to the right of sprite
    const textX = x + SPRITE_SIZE_PIXELS + SPACING;
    const textY = currentY;
    FontAtlasRenderer.renderText(
      ctx,
      this.unit.name,
      textX,
      textY,
      this.fontId,
      this.fontAtlasImage,
      NAME_SCALE,
      'left',
      '#000000'
    );

    // Render class information below name with proper spacing
    const classText = this.unit.secondaryClass
      ? `${this.unit.unitClass.name}/${this.unit.secondaryClass.name}`
      : this.unit.unitClass.name;
    FontAtlasRenderer.renderText(
      ctx,
      classText,
      textX,
      textY + NAME_HEIGHT + 2, // 2px spacing between name and class
      this.fontId,
      this.fontAtlasImage,
      TEXT_SCALE,
      'left',
      '#000000'
    );

    // Move down past the sprite/name/class area
    currentY += SPRITE_SIZE_PIXELS + SPACING;

    // Prepare stats with actual values from the unit
    // Layout: Row 1: HP/MP, Row 2: Speed/Move, Row 3: P.Power/M.Power, Row 4: P.Evade/M.Evade, Row 5: Courage/Attunement
    const stats = [
      { label: 'HP', value: `${this.unit.health}/${this.unit.maxHealth}`, maxDigits: 7 },
      { label: 'MP', value: `${this.unit.mana}/${this.unit.maxMana}`, maxDigits: 7 },
      { label: 'Speed', value: `${this.unit.speed}`, maxDigits: 2 },
      { label: 'Move', value: `${this.unit.movement}`, maxDigits: 1 },
      { label: 'P.Power', value: `${this.unit.physicalPower}`, maxDigits: 2 },
      { label: 'M.Power', value: `${this.unit.magicPower}`, maxDigits: 2 },
      { label: 'P.Evade', value: `${this.unit.physicalEvade}`, maxDigits: 2 },
      { label: 'M.Evade', value: `${this.unit.magicEvade}`, maxDigits: 2 },
      { label: 'Courage', value: `${this.unit.courage}`, maxDigits: 2 },
      { label: 'Attunement', value: `${this.unit.attunement}`, maxDigits: 2 },
    ];

    // Calculate column widths based on actual text measurements
    // Find the longest label and longest value in each column
    let maxLabelWidth = 0;
    let maxValueWidth = 0;

    stats.forEach((stat) => {
      const labelWidth = FontAtlasRenderer.measureTextByFontId(stat.label, this.fontId) * TEXT_SCALE;
      const valueWidth = FontAtlasRenderer.measureTextByFontId(stat.value, this.fontId) * TEXT_SCALE;
      maxLabelWidth = Math.max(maxLabelWidth, labelWidth);
      maxValueWidth = Math.max(maxValueWidth, valueWidth);
    });

    // Column width = label width + spacing + value width
    const LABEL_VALUE_SPACING = 2; // Space between label and value (reduced from 8)
    const COL_WIDTH = maxLabelWidth + LABEL_VALUE_SPACING + maxValueWidth;
    const COL_SPACING = 4; // Space between columns (reduced from 16)

    stats.forEach((stat, index) => {
      if (!this.fontAtlasImage) return;

      // Row-major order: fill left to right, then move to next row
      const row = Math.floor(index / 2);
      const column = index % 2;
      const statX = x + (column * (COL_WIDTH + COL_SPACING));
      const statY = currentY + (row * LINE_HEIGHT);

      // Render label
      FontAtlasRenderer.renderText(
        ctx,
        stat.label,
        statX,
        statY,
        this.fontId,
        this.fontAtlasImage,
        TEXT_SCALE,
        'left',
        '#000000'
      );

      // Render value (right-aligned within the column)
      const valueX = statX + COL_WIDTH;
      FontAtlasRenderer.renderText(
        ctx,
        stat.value,
        valueX,
        statY,
        this.fontId,
        this.fontAtlasImage,
        TEXT_SCALE,
        'right',
        '#000000'
      );
    });

    // Move down past stats
    currentY += LINE_HEIGHT * 5 + SPACING;

    // Render ability slots
    const abilities = [
      { label: 'Reaction', ability: this.unit.reactionAbility },
      { label: 'Passive', ability: this.unit.passiveAbility },
      { label: 'Movement', ability: this.unit.movementAbility },
    ];

    // Calculate ability section width based on actual content
    let maxAbilityLabelWidth = 0;
    let maxAbilityValueWidth = 0;

    abilities.forEach((slot) => {
      const labelWidth = FontAtlasRenderer.measureTextByFontId(slot.label, this.fontId) * TEXT_SCALE;
      const abilityName = slot.ability ? slot.ability.name : '-';
      const valueWidth = FontAtlasRenderer.measureTextByFontId(abilityName, this.fontId) * TEXT_SCALE;
      maxAbilityLabelWidth = Math.max(maxAbilityLabelWidth, labelWidth);
      maxAbilityValueWidth = Math.max(maxAbilityValueWidth, valueWidth);
    });

    const ABILITY_WIDTH = maxAbilityLabelWidth + LABEL_VALUE_SPACING + maxAbilityValueWidth;

    abilities.forEach((slot, index) => {
      if (!this.fontAtlasImage) return;

      const abilityY = currentY + (index * LINE_HEIGHT);

      FontAtlasRenderer.renderText(
        ctx,
        slot.label,
        x,
        abilityY,
        this.fontId,
        this.fontAtlasImage,
        TEXT_SCALE,
        'left',
        '#000000'
      );

      const abilityName = slot.ability ? slot.ability.name : '-';
      const valueX = x + ABILITY_WIDTH;
      FontAtlasRenderer.renderText(
        ctx,
        abilityName,
        valueX,
        abilityY,
        this.fontId,
        this.fontAtlasImage,
        TEXT_SCALE,
        'right',
        '#000000'
      );
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

      // Calculate equipment section width based on actual content
      let maxEquipLabelWidth = 0;
      let maxEquipValueWidth = 0;

      equipment.forEach((slot) => {
        const labelWidth = FontAtlasRenderer.measureTextByFontId(slot.label, this.fontId) * TEXT_SCALE;
        const itemName = slot.item ? slot.item.name : '-';
        const valueWidth = FontAtlasRenderer.measureTextByFontId(itemName, this.fontId) * TEXT_SCALE;
        maxEquipLabelWidth = Math.max(maxEquipLabelWidth, labelWidth);
        maxEquipValueWidth = Math.max(maxEquipValueWidth, valueWidth);
      });

      const EQUIPMENT_WIDTH = maxEquipLabelWidth + LABEL_VALUE_SPACING + maxEquipValueWidth;

      equipment.forEach((slot, index) => {
        if (!this.fontAtlasImage) return;

        const equipY = currentY + (index * LINE_HEIGHT);

        FontAtlasRenderer.renderText(
          ctx,
          slot.label,
          x,
          equipY,
          this.fontId,
          this.fontAtlasImage,
          TEXT_SCALE,
          'left',
          '#000000'
        );

        const itemName = slot.item ? slot.item.name : '-';
        const valueX = x + EQUIPMENT_WIDTH;
        FontAtlasRenderer.renderText(
          ctx,
          itemName,
          valueX,
          equipY,
          this.fontId,
          this.fontAtlasImage,
          TEXT_SCALE,
          'right',
          '#000000'
        );
      });
    }
  }

  protected getBounds(): ContentBounds {
    const font = FontRegistry.getById(this.fontId);
    if (!font) {
      console.warn(`Font '${this.fontId}' not found in registry`);
      // Fallback to estimates (scaled down from previous values)
      const totalWidth = 50; // Reduced from 200
      const totalHeight = 75; // Reduced from 300
      return { width: totalWidth, height: totalHeight, minX: 0, minY: 0, maxX: totalWidth, maxY: totalHeight };
    }

    const NAME_SCALE = this.scale * 1.5;
    const TEXT_SCALE = this.scale;
    const FONT_HEIGHT = font.charHeight * TEXT_SCALE;
    const LINE_HEIGHT = FONT_HEIGHT + 1; // Add 1px spacing between lines (reduced from 4)
    const SPRITE_SIZE_PIXELS = this.tileSize; // 12px at new resolution
    const SPACING = 2; // Reduced from 8
    const LABEL_VALUE_SPACING = 2; // Reduced from 8

    // Measure name width using FontAtlasRenderer
    const nameWidth = FontAtlasRenderer.measureTextByFontId(this.unit.name, this.fontId) * NAME_SCALE;

    // Measure class text width
    const classText = this.unit.secondaryClass
      ? `${this.unit.unitClass.name}/${this.unit.secondaryClass.name}`
      : this.unit.unitClass.name;
    const classWidth = FontAtlasRenderer.measureTextByFontId(classText, this.fontId) * TEXT_SCALE;

    // Calculate stats column width (same as render method)
    const stats = [
      { label: 'HP', value: `${this.unit.health}/${this.unit.maxHealth}` },
      { label: 'MP', value: `${this.unit.mana}/${this.unit.maxMana}` },
      { label: 'Speed', value: `${this.unit.speed}` },
      { label: 'Move', value: `${this.unit.movement}` },
      { label: 'P.Power', value: `${this.unit.physicalPower}` },
      { label: 'M.Power', value: `${this.unit.magicPower}` },
      { label: 'P.Evade', value: `${this.unit.physicalEvade}` },
      { label: 'M.Evade', value: `${this.unit.magicEvade}` },
      { label: 'Courage', value: `${this.unit.courage}` },
      { label: 'Attunement', value: `${this.unit.attunement}` },
    ];

    let maxLabelWidth = 0;
    let maxValueWidth = 0;
    stats.forEach((stat) => {
      const labelWidth = FontAtlasRenderer.measureTextByFontId(stat.label, this.fontId) * TEXT_SCALE;
      const valueWidth = FontAtlasRenderer.measureTextByFontId(stat.value, this.fontId) * TEXT_SCALE;
      maxLabelWidth = Math.max(maxLabelWidth, labelWidth);
      maxValueWidth = Math.max(maxValueWidth, valueWidth);
    });

    const COL_WIDTH = maxLabelWidth + LABEL_VALUE_SPACING + maxValueWidth;
    const COL_SPACING = 4; // Reduced from 16

    // Total width is max(sprite + spacing + max(name, class), stats width)
    const topRowWidth = SPRITE_SIZE_PIXELS + SPACING + Math.max(nameWidth, classWidth);
    const statsWidth = (COL_WIDTH * 2) + COL_SPACING;
    const totalWidth = Math.max(topRowWidth, statsWidth);

    // Height: sprite + spacing + stats (5 rows) + spacing + abilities (3 rows) + spacing + equipment (5 rows if humanoid)
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

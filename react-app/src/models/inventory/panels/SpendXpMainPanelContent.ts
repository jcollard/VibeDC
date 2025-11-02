/**
 * Panel content for the Spend XP main panel
 * Shows two columns: left column lists player classes, right column shows abilities
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { SpriteRegistry } from '../../../utils/SpriteRegistry';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';
import type { CombatUnit } from '../../combat/CombatUnit';
import type { HumanoidUnit } from '../../combat/HumanoidUnit';
import { UnitClass } from '../../combat/UnitClass';

const HOVERED_CLASS_COLOR = '#ffff00'; // Yellow for hovered class
const SELECTED_CLASS_COLOR = '#00ff00'; // Green for selected class
const NORMAL_CLASS_COLOR = '#ffffff'; // White for normal class
const HEADER_COLOR = '#ff8c00'; // Dark orange for headers
const DIVIDER_SPRITE = 'frames-3'; // 12x12 sprite for vertical divider

/**
 * Panel content for the Spend XP main panel
 * Shows two columns: left with selectable classes, right with abilities (stub)
 */
export class SpendXpMainPanelContent implements PanelContent {
  private selectedClassId: string;
  private hoveredClassIndex: number | null = null;
  private classBounds: Array<{ x: number; y: number; width: number; height: number; classId: string }> = [];
  private playerClasses: UnitClass[] = [];
  private unit: CombatUnit;

  constructor(unit: CombatUnit) {
    this.unit = unit;

    // Get all classes with 'player' tag
    this.playerClasses = UnitClass.getAll().filter(cls => cls.tags.includes('player'));

    // Set initial selected class to the unit's primary class
    this.selectedClassId = unit.unitClass.id;
  }

  /**
   * Helper method to get unspent XP for a class (only works with HumanoidUnit)
   */
  private getUnspentXp(cls: UnitClass): number {
    const humanoid = this.unit as HumanoidUnit;
    if (humanoid.getUnspentClassExperience) {
      return humanoid.getUnspentClassExperience(cls);
    }
    return 0;
  }

  /**
   * Set the selected class
   */
  setSelectedClass(classId: string): void {
    this.selectedClassId = classId;
  }

  /**
   * Get the selected class ID
   */
  getSelectedClassId(): string {
    return this.selectedClassId;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    spriteImages?: Map<string, HTMLImageElement>,
    spriteSize?: number
  ): void {
    if (!fontAtlasImage) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const padding = 4;
    const lineSpacing = 8;
    const dividerWidth = 12; // Width of the divider sprite
    const headerText = 'Available Classes';

    // Calculate left column width based on widest class name plus space for XP
    let maxClassNameWidth = FontAtlasRenderer.measureTextByFontId(headerText, fontId);
    let maxXpWidth = 0;

    for (const cls of this.playerClasses) {
      const classNameWidth = FontAtlasRenderer.measureTextByFontId(cls.name, fontId);
      if (classNameWidth > maxClassNameWidth) {
        maxClassNameWidth = classNameWidth;
      }

      const xp = this.getUnspentXp(cls);
      const xpText = `${xp}`;
      const xpWidth = FontAtlasRenderer.measureTextByFontId(xpText, fontId);
      if (xpWidth > maxXpWidth) {
        maxXpWidth = xpWidth;
      }
    }

    // Left column width: class name + gap + XP number + padding
    const xpGap = 8; // Gap between class name and XP number
    const leftColumnWidth = maxClassNameWidth + xpGap + maxXpWidth + 4;

    // Column positions
    const leftX = region.x + padding;
    const dividerX = leftX + leftColumnWidth;
    const rightX = dividerX + dividerWidth;
    let currentY = region.y + padding;

    // Render "Available Classes" header in dark orange
    FontAtlasRenderer.renderText(
      ctx,
      headerText,
      leftX,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      HEADER_COLOR
    );

    // Move down for class list (with spacing after header)
    currentY += lineSpacing + 2;

    // Clear bounds array
    this.classBounds = [];

    // Render class list
    for (let i = 0; i < this.playerClasses.length; i++) {
      const cls = this.playerClasses[i];
      const isSelected = cls.id === this.selectedClassId;
      const isHovered = this.hoveredClassIndex === i;

      // Determine color
      let color = NORMAL_CLASS_COLOR;
      if (isSelected) {
        color = SELECTED_CLASS_COLOR;
      } else if (isHovered) {
        color = HOVERED_CLASS_COLOR;
      }

      // Render class name on left
      FontAtlasRenderer.renderText(
        ctx,
        cls.name,
        leftX,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        color
      );

      // Get unspent XP for this class and render right-aligned
      const xp = this.getUnspentXp(cls);
      const xpText = `${xp}`;
      const xpWidth = FontAtlasRenderer.measureTextByFontId(xpText, fontId);
      const xpX = dividerX - xpWidth - 4; // 4px padding before divider

      FontAtlasRenderer.renderText(
        ctx,
        xpText,
        xpX,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        color
      );

      // Store bounds for click detection (entire row width)
      this.classBounds.push({
        x: leftX - region.x,
        y: currentY - region.y,
        width: leftColumnWidth,
        height: lineSpacing,
        classId: cls.id
      });

      currentY += lineSpacing;
    }

    // Render vertical divider using frames-3 sprite
    if (spriteImages && spriteSize) {
      const dividerHeight = region.height - (padding * 2);
      const spriteDef = SpriteRegistry.getById(DIVIDER_SPRITE);
      const spriteImage = spriteImages.get('/spritesheets/atlas.png');

      if (spriteDef && spriteImage) {
        SpriteRenderer.renderSprite(
          ctx,
          spriteImage,
          spriteDef,
          spriteSize,
          dividerX,
          region.y + padding,
          dividerWidth,
          dividerHeight
        );
      }
    }

    // Right column: Abilities (stub for now)
    const rightColumnY = region.y + padding;
    const stubText = 'Abilities Coming Soon';
    FontAtlasRenderer.renderText(
      ctx,
      stubText,
      rightX,
      rightColumnY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#888888'
    );

    ctx.restore();
  }

  /**
   * Handle hover event
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    let newHoveredIndex: number | null = null;

    // Check if hovering over any class
    for (let i = 0; i < this.classBounds.length; i++) {
      const bounds = this.classBounds[i];
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        newHoveredIndex = i;
        break;
      }
    }

    // Return true if hover state changed
    if (newHoveredIndex !== this.hoveredClassIndex) {
      this.hoveredClassIndex = newHoveredIndex;
      return { type: 'class-hover', classIndex: newHoveredIndex };
    }

    return null;
  }

  /**
   * Handle click event
   */
  handleClick(relativeX: number, relativeY: number): any {
    // Check if clicking on any class
    for (const bounds of this.classBounds) {
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        // Select this class
        this.selectedClassId = bounds.classId;
        return { type: 'class-selected', classId: bounds.classId };
      }
    }

    return null;
  }
}

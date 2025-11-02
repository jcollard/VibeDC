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
const HOVERED_ABILITY_COLOR = '#ffff00'; // Yellow for hovered ability
const HEADER_COLOR = '#ff8c00'; // Dark orange for headers
const DIVIDER_SPRITE = 'frames-3'; // 12x12 sprite for vertical divider

/**
 * Panel content for the Spend XP main panel
 * Shows two columns: left with selectable classes, right with abilities (stub)
 */
export class SpendXpMainPanelContent implements PanelContent {
  private selectedClassId: string;
  private hoveredClassIndex: number | null = null;
  private hoveredAbilityIndex: number | null = null;
  private classBounds: Array<{ x: number; y: number; width: number; height: number; classId: string }> = [];
  private abilityBounds: Array<{ x: number; y: number; width: number; height: number; abilityId: string; canAfford: boolean; isLearned: boolean }> = [];
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
    const classesHeaderText = 'Classes';
    const xpHeaderText = 'XP';

    // Left column width is fixed to the width of "Available Classes" plus 12px (for backward compatibility)
    const leftColumnWidth = FontAtlasRenderer.measureTextByFontId('Available Classes', fontId) + 12;

    // Column positions
    const leftX = region.x + padding;
    const dividerX = leftX + leftColumnWidth;
    const rightX = dividerX + dividerWidth;
    let currentY = region.y + padding;

    // Render "Classes" header in dark orange (left-aligned)
    FontAtlasRenderer.renderText(
      ctx,
      classesHeaderText,
      leftX,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      HEADER_COLOR
    );

    // Render "XP" header in dark orange (right-aligned)
    const xpHeaderWidth = FontAtlasRenderer.measureTextByFontId(xpHeaderText, fontId);
    const xpHeaderX = dividerX - xpHeaderWidth - 4; // 4px padding before divider
    FontAtlasRenderer.renderText(
      ctx,
      xpHeaderText,
      xpHeaderX,
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

    // Right column: Abilities
    const rightColumnY = region.y + padding;

    // Get the selected class
    const selectedClass = UnitClass.getById(this.selectedClassId);

    if (selectedClass) {
      // Render abilities header with class name
      const abilitiesHeaderText = `${selectedClass.name} Abilities`;
      FontAtlasRenderer.renderText(
        ctx,
        abilitiesHeaderText,
        rightX,
        rightColumnY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        HEADER_COLOR
      );

      // Render "XP Cost" header (right-aligned)
      const xpCostHeaderText = 'XP Cost';
      const xpCostHeaderWidth = FontAtlasRenderer.measureTextByFontId(xpCostHeaderText, fontId);
      const xpCostHeaderX = region.x + region.width - padding - xpCostHeaderWidth;
      FontAtlasRenderer.renderText(
        ctx,
        xpCostHeaderText,
        xpCostHeaderX,
        rightColumnY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        HEADER_COLOR
      );

      let abilityY = rightColumnY + lineSpacing + 2;

      // Get available XP for this class
      const availableXp = this.getUnspentXp(selectedClass);

      // Clear ability bounds array
      this.abilityBounds = [];

      // Calculate ability row width (from rightX to right edge of region)
      const abilityRowWidth = region.x + region.width - rightX;

      // Render each learnable ability
      for (let i = 0; i < selectedClass.learnableAbilities.length; i++) {
        const ability = selectedClass.learnableAbilities[i];
        const isLearned = this.unit.learnedAbilities.has(ability);
        const canAfford = availableXp >= ability.experiencePrice;
        const isHovered = this.hoveredAbilityIndex === i;

        // Determine ability name color based on hover state
        const nameColor = isHovered ? HOVERED_ABILITY_COLOR : '#ffffff';

        // Render ability name
        FontAtlasRenderer.renderText(
          ctx,
          ability.name,
          rightX,
          abilityY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          nameColor
        );

        // Render cost or "Learned" label (right-aligned)
        const costText = isLearned ? 'Learned' : `${ability.experiencePrice}`;
        const costWidth = FontAtlasRenderer.measureTextByFontId(costText, fontId);
        const costX = region.x + region.width - padding - costWidth;

        // Determine cost color: gray if learned, red if can't afford, yellow if hovered, white otherwise
        let costColor = '#ffffff';
        if (isLearned) {
          costColor = '#888888';
        } else if (isHovered) {
          costColor = HOVERED_ABILITY_COLOR;
        } else if (!canAfford) {
          costColor = '#ff0000'; // Red for unaffordable abilities
        }

        FontAtlasRenderer.renderText(
          ctx,
          costText,
          costX,
          abilityY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          costColor
        );

        // Store bounds for hover/click detection
        this.abilityBounds.push({
          x: rightX - region.x,
          y: abilityY - region.y,
          width: abilityRowWidth,
          height: lineSpacing,
          abilityId: ability.id,
          canAfford,
          isLearned
        });

        abilityY += lineSpacing;
      }
    }

    ctx.restore();
  }

  /**
   * Handle hover event
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    let newHoveredClassIndex: number | null = null;
    let newHoveredAbilityIndex: number | null = null;

    // Check if hovering over any class
    for (let i = 0; i < this.classBounds.length; i++) {
      const bounds = this.classBounds[i];
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        newHoveredClassIndex = i;
        break;
      }
    }

    // Check if hovering over any ability
    for (let i = 0; i < this.abilityBounds.length; i++) {
      const bounds = this.abilityBounds[i];
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        newHoveredAbilityIndex = i;
        break;
      }
    }

    // Check if hover state changed
    const classChanged = newHoveredClassIndex !== this.hoveredClassIndex;
    const abilityChanged = newHoveredAbilityIndex !== this.hoveredAbilityIndex;

    if (classChanged || abilityChanged) {
      this.hoveredClassIndex = newHoveredClassIndex;
      this.hoveredAbilityIndex = newHoveredAbilityIndex;

      if (newHoveredAbilityIndex !== null) {
        return { type: 'ability-hover', abilityIndex: newHoveredAbilityIndex };
      } else if (newHoveredClassIndex !== null) {
        return { type: 'class-hover', classIndex: newHoveredClassIndex };
      } else {
        return { type: 'hover-cleared' };
      }
    }

    return null;
  }

  /**
   * Handle click event
   */
  handleClick(relativeX: number, relativeY: number): any {
    // Check if clicking on any ability first (abilities take precedence)
    for (const bounds of this.abilityBounds) {
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        // Click on ability
        return {
          type: 'ability-selected',
          abilityId: bounds.abilityId,
          canAfford: bounds.canAfford,
          isLearned: bounds.isLearned
        };
      }
    }

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

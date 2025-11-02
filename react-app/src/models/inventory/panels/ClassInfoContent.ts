/**
 * Panel content for displaying information about a class
 * Shows the class name, XP earned/spent, and options for setting primary/secondary class
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';
import { HOVERED_TEXT } from '../../combat/managers/panels/colors';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';
import type { UnitClass } from '../../combat/UnitClass';
import type { CombatUnit } from '../../combat/CombatUnit';
import type { HumanoidUnit } from '../../combat/HumanoidUnit';

const MENU_OPTION_COLOR = '#ffffff';
const HELPER_TEXT_COLOR = '#aaaaaa'; // Gray for helper text

/**
 * Panel content that displays information about a class
 */
export class ClassInfoContent implements PanelContent {
  private unitClass: UnitClass;
  private unit: CombatUnit;
  private hoveredOption: 'primary' | 'secondary' | null = null;
  private primaryOptionBounds: { x: number; y: number; width: number; height: number } | null = null;
  private secondaryOptionBounds: { x: number; y: number; width: number; height: number } | null = null;

  constructor(unitClass: UnitClass, unit: CombatUnit) {
    this.unitClass = unitClass;
    this.unit = unit;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    const font = FontRegistry.getById(fontId);
    if (!font) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const padding = 4;
    const lineSpacing = 8;
    let y = region.y + padding;

    // Render class name as title (centered, orange)
    const titleColor = '#ff8c00'; // Dark orange for title
    const nameWidth = FontAtlasRenderer.measureText(this.unitClass.name, font);
    const nameX = region.x + Math.floor((region.width - nameWidth) / 2);
    FontAtlasRenderer.renderText(
      ctx,
      this.unitClass.name,
      nameX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      titleColor
    );

    y += lineSpacing + 2; // Extra spacing after title

    // Get XP data for this class
    const humanoid = this.unit as HumanoidUnit;
    let earnedXp = 0;
    let spentXp = 0;

    if ('getClassExperience' in humanoid && typeof humanoid.getClassExperience === 'function') {
      earnedXp = humanoid.getClassExperience(this.unitClass);
    }

    if ('getClassExperienceSpent' in humanoid && typeof humanoid.getClassExperienceSpent === 'function') {
      spentXp = humanoid.getClassExperienceSpent(this.unitClass);
    }

    // Render XP Earned label (left-aligned)
    const earnedLabel = 'XP Earned';
    FontAtlasRenderer.renderText(
      ctx,
      earnedLabel,
      region.x + padding,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );

    // Render XP Earned value (right-aligned)
    const earnedValue = `${earnedXp}`;
    const earnedValueWidth = FontAtlasRenderer.measureText(earnedValue, font);
    const earnedValueX = region.x + region.width - padding - earnedValueWidth;
    FontAtlasRenderer.renderText(
      ctx,
      earnedValue,
      earnedValueX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffa500' // Orange for value
    );

    y += lineSpacing;

    // Render XP Spent label (left-aligned)
    const spentLabel = 'XP Spent';
    FontAtlasRenderer.renderText(
      ctx,
      spentLabel,
      region.x + padding,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );

    // Render XP Spent value (right-aligned)
    const spentValue = `${spentXp}`;
    const spentValueWidth = FontAtlasRenderer.measureText(spentValue, font);
    const spentValueX = region.x + region.width - padding - spentValueWidth;
    FontAtlasRenderer.renderText(
      ctx,
      spentValue,
      spentValueX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffa500' // Orange for value
    );

    y += lineSpacing + 4; // Extra spacing before menu options

    // Render "Set Primary Class" option
    const primaryText = 'Set Primary Class';
    const primaryColor = this.hoveredOption === 'primary' ? HOVERED_TEXT : MENU_OPTION_COLOR;
    const primaryWidth = FontAtlasRenderer.measureText(primaryText, font);
    const primaryX = region.x + Math.floor((region.width - primaryWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      primaryText,
      primaryX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      primaryColor
    );

    // Store bounds for hover/click detection
    this.primaryOptionBounds = {
      x: primaryX - region.x,
      y: y - region.y,
      width: primaryWidth,
      height: lineSpacing
    };

    y += lineSpacing;

    // Render helper text for primary class (only if hovered)
    if (this.hoveredOption === 'primary') {
      const helperText = 'You earn XP for your primary class';
      const helperWidth = FontAtlasRenderer.measureText(helperText, font);
      const helperX = region.x + Math.floor((region.width - helperWidth) / 2);

      FontAtlasRenderer.renderText(
        ctx,
        helperText,
        helperX,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        HELPER_TEXT_COLOR
      );

      y += lineSpacing;
    }

    // Render "Set Secondary Class" option
    const secondaryText = 'Set Secondary Class';
    const secondaryColor = this.hoveredOption === 'secondary' ? HOVERED_TEXT : MENU_OPTION_COLOR;
    const secondaryWidth = FontAtlasRenderer.measureText(secondaryText, font);
    const secondaryX = region.x + Math.floor((region.width - secondaryWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      secondaryText,
      secondaryX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      secondaryColor
    );

    // Store bounds for hover/click detection
    this.secondaryOptionBounds = {
      x: secondaryX - region.x,
      y: y - region.y,
      width: secondaryWidth,
      height: lineSpacing
    };

    y += lineSpacing;

    // Render helper text for secondary class (only if hovered)
    if (this.hoveredOption === 'secondary') {
      const helperText = `Gives access to the ${this.unitClass.name} menu in combat`;
      const helperWidth = FontAtlasRenderer.measureText(helperText, font);
      const helperX = region.x + Math.floor((region.width - helperWidth) / 2);

      FontAtlasRenderer.renderText(
        ctx,
        helperText,
        helperX,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        HELPER_TEXT_COLOR
      );
    }

    ctx.restore();
  }

  /**
   * Handle hover event
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    let newHoveredOption: 'primary' | 'secondary' | null = null;

    // Check if hovering over primary option
    if (this.primaryOptionBounds) {
      const bounds = this.primaryOptionBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        newHoveredOption = 'primary';
      }
    }

    // Check if hovering over secondary option
    if (this.secondaryOptionBounds && newHoveredOption === null) {
      const bounds = this.secondaryOptionBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        newHoveredOption = 'secondary';
      }
    }

    // Check if hover state changed
    if (newHoveredOption !== this.hoveredOption) {
      this.hoveredOption = newHoveredOption;
      return { type: 'class-option-hover', option: newHoveredOption };
    }

    return null;
  }

  /**
   * Handle click event
   */
  handleClick(relativeX: number, relativeY: number): any {
    // Check if clicking on primary option
    if (this.primaryOptionBounds) {
      const bounds = this.primaryOptionBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        return { type: 'set-primary-class', classId: this.unitClass.id };
      }
    }

    // Check if clicking on secondary option
    if (this.secondaryOptionBounds) {
      const bounds = this.secondaryOptionBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        return { type: 'set-secondary-class', classId: this.unitClass.id };
      }
    }

    return null;
  }
}

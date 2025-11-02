/**
 * Panel content for displaying class requirements
 * Shows what prerequisites are needed to unlock a class
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';
import { UnitClass } from '../../combat/UnitClass';
import type { CombatUnit } from '../../combat/CombatUnit';
import type { HumanoidUnit } from '../../combat/HumanoidUnit';

const TITLE_COLOR = '#ff8c00'; // Dark orange for title
const MET_REQUIREMENT_COLOR = '#00ff00'; // Green for met requirements
const UNMET_REQUIREMENT_COLOR = '#ff0000'; // Red for unmet requirements
const LABEL_COLOR = '#ffffff'; // White for labels

/**
 * Panel content that displays class requirements and whether they are met
 */
export class ClassRequirementsInfoContent implements PanelContent {
  private unitClass: UnitClass;
  private unit: CombatUnit;

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
      TITLE_COLOR
    );

    y += lineSpacing + 2; // Extra spacing after title

    // Render "Requirements:" label (centered)
    const requirementsLabel = 'Requirements:';
    const requirementsLabelWidth = FontAtlasRenderer.measureText(requirementsLabel, font);
    const requirementsLabelX = region.x + Math.floor((region.width - requirementsLabelWidth) / 2);
    FontAtlasRenderer.renderText(
      ctx,
      requirementsLabel,
      requirementsLabelX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      LABEL_COLOR
    );

    y += lineSpacing + 2; // Extra spacing after label

    // Get XP data for requirements
    const humanoid = this.unit as HumanoidUnit;
    const classExperience = humanoid.classExperience ?? new Map<string, number>();

    // Check if there are no requirements
    if (this.unitClass.requirements.size === 0) {
      const noReqText = 'None';
      const noReqWidth = FontAtlasRenderer.measureText(noReqText, font);
      const noReqX = region.x + Math.floor((region.width - noReqWidth) / 2);
      FontAtlasRenderer.renderText(
        ctx,
        noReqText,
        noReqX,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        MET_REQUIREMENT_COLOR
      );
    } else {
      // Render each requirement
      for (const [requiredClassId, requiredXp] of this.unitClass.requirements) {
        const requiredClass = UnitClass.getById(requiredClassId);
        if (!requiredClass) continue;

        const earnedXp = classExperience.get(requiredClassId) ?? 0;
        const isMet = earnedXp >= requiredXp;
        const color = isMet ? MET_REQUIREMENT_COLOR : UNMET_REQUIREMENT_COLOR;

        // Render class name (left-aligned)
        FontAtlasRenderer.renderText(
          ctx,
          requiredClass.name,
          region.x + padding,
          y,
          fontId,
          fontAtlasImage,
          1,
          'left',
          color
        );

        // Render XP requirement (right-aligned)
        const xpText = `${earnedXp}/${requiredXp}`;
        const xpWidth = FontAtlasRenderer.measureText(xpText, font);
        const xpX = region.x + region.width - padding - xpWidth;
        FontAtlasRenderer.renderText(
          ctx,
          xpText,
          xpX,
          y,
          fontId,
          fontAtlasImage,
          1,
          'left',
          color
        );

        y += lineSpacing;
      }
    }

    ctx.restore();
  }

  handleHover(_relativeX: number, _relativeY: number): unknown {
    return null;
  }

  handleClick(_relativeX: number, _relativeY: number): any {
    return null;
  }
}

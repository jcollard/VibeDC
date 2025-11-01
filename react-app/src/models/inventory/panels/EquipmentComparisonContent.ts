/**
 * Panel content for comparing two equipment items
 * Shows side-by-side comparison with stat differences highlighted in green (positive) or red (negative)
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';
import type { Equipment } from '../../combat/Equipment';

/**
 * Panel content that displays a comparison between two equipment items
 */
export class EquipmentComparisonContent implements PanelContent {
  private currentItem: Equipment | null; // null means empty slot
  private comparisonItem: Equipment | null; // null means no item to compare (show "??")

  constructor(currentItem: Equipment | null, comparisonItem: Equipment | null) {
    this.currentItem = currentItem;
    this.comparisonItem = comparisonItem;
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

    // Render title: "{CURRENT} vs {COMPARISON}"
    const currentName = this.currentItem?.name ?? 'Empty';
    const comparisonName = this.comparisonItem?.name ?? '??';
    const titleText = `${currentName} vs ${comparisonName}`;
    const titleColor = '#ffff00'; // Yellow for title

    // Check if title fits on one line
    const availableWidth = region.width - (padding * 2);
    const titleWidth = FontAtlasRenderer.measureText(titleText, font);

    if (titleWidth <= availableWidth) {
      // Title fits on one line
      FontAtlasRenderer.renderText(
        ctx,
        titleText,
        region.x + padding,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        titleColor
      );
      y += lineSpacing + 2; // Extra spacing after title
    } else {
      // Title is too wide, wrap it
      const line1 = currentName;
      const line2 = `vs ${comparisonName}`;

      FontAtlasRenderer.renderText(
        ctx,
        line1,
        region.x + padding,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        titleColor
      );
      y += lineSpacing;

      FontAtlasRenderer.renderText(
        ctx,
        line2,
        region.x + padding,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        titleColor
      );
      y += lineSpacing + 2; // Extra spacing after title
    }

    // If no comparison item, show helper text (wrapped)
    if (!this.comparisonItem) {
      const helperColor = '#888888'; // Grey for helper text
      const helperLine1 = 'Hover over an';
      const helperLine2 = 'item to compare';

      FontAtlasRenderer.renderText(
        ctx,
        helperLine1,
        region.x + padding,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        helperColor
      );

      y += lineSpacing;

      FontAtlasRenderer.renderText(
        ctx,
        helperLine2,
        region.x + padding,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        helperColor
      );

      ctx.restore();
      return;
    }

    // Get non-default properties from comparison item
    const comparisonStats = this.getNonDefaultProperties(this.comparisonItem);

    if (comparisonStats.length > 0) {
      // Render stats grid (two columns) - same layout as EquipmentInfoContent
      const statsAreaWidth = region.width - (padding * 2);
      const columnGap = 8;
      const columnWidth = (statsAreaWidth - columnGap) / 2;
      const leftColumnX = region.x + padding;
      const rightColumnX = leftColumnX + columnWidth + columnGap;

      // Separate stats into those that fit in columns and those that need full width
      const twoColumnStats: Array<{ statName: string; comparisonValue: number; difference: number }> = [];
      const fullWidthStats: Array<{ statName: string; comparisonValue: number; difference: number }> = [];

      for (const stat of comparisonStats) {
        // Check if stat fits in a column
        if (this.statFitsInColumn(stat, columnWidth, font)) {
          twoColumnStats.push(stat);
        } else {
          fullWidthStats.push(stat);
        }
      }

      // Render two-column stats
      if (twoColumnStats.length > 0) {
        const leftColumn = twoColumnStats.filter((_, idx) => idx % 2 === 0);
        const rightColumn = twoColumnStats.filter((_, idx) => idx % 2 === 1);

        const maxRows = Math.max(leftColumn.length, rightColumn.length);

        for (let i = 0; i < maxRows; i++) {
          // Stop if we exceed panel height
          if (y + lineSpacing > region.y + region.height - padding) {
            break;
          }

          // Render left column stat
          if (i < leftColumn.length) {
            const stat = leftColumn[i];
            this.renderStatWithDifference(
              ctx,
              stat,
              leftColumnX,
              columnWidth,
              y,
              fontId,
              fontAtlasImage,
              font
            );
          }

          // Render right column stat
          if (i < rightColumn.length) {
            const stat = rightColumn[i];
            this.renderStatWithDifference(
              ctx,
              stat,
              rightColumnX,
              columnWidth,
              y,
              fontId,
              fontAtlasImage,
              font
            );
          }

          y += lineSpacing;
        }
      }

      // Render full-width stats (with more space for the label)
      if (fullWidthStats.length > 0) {
        const fullWidth = statsAreaWidth;

        for (const stat of fullWidthStats) {
          // Stop if we exceed panel height
          if (y + lineSpacing > region.y + region.height - padding) {
            break;
          }

          this.renderStatWithDifference(
            ctx,
            stat,
            leftColumnX,
            fullWidth,
            y,
            fontId,
            fontAtlasImage,
            font
          );

          y += lineSpacing;
        }
      }
    }

    ctx.restore();
  }

  /**
   * Check if a stat fits in a column width
   */
  private statFitsInColumn(
    stat: { statName: string; comparisonValue: number; difference: number },
    columnWidth: number,
    font: any
  ): boolean {
    // Calculate total width needed: label + value
    const labelWidth = FontAtlasRenderer.measureText(stat.statName, font);
    const valueText = stat.difference !== 0
      ? `${stat.comparisonValue} (${stat.difference > 0 ? '+' : ''}${stat.difference})`
      : `${stat.comparisonValue}`;
    const valueWidth = FontAtlasRenderer.measureText(valueText, font);

    // Add small buffer (4px) for spacing between label and value
    const totalWidth = labelWidth + valueWidth + 4;

    return totalWidth <= columnWidth;
  }

  /**
   * Render a stat with its difference in two-column format
   */
  private renderStatWithDifference(
    ctx: CanvasRenderingContext2D,
    stat: { statName: string; comparisonValue: number; difference: number },
    columnX: number,
    columnWidth: number,
    y: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any
  ): void {
    // Render stat label on the left
    FontAtlasRenderer.renderText(
      ctx,
      stat.statName,
      columnX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );

    // Format the value with difference
    const valueText = stat.difference !== 0
      ? `${stat.comparisonValue} (${stat.difference > 0 ? '+' : ''}${stat.difference})`
      : `${stat.comparisonValue}`;

    // Measure and right-align the value
    const valueWidth = FontAtlasRenderer.measureText(valueText, font);
    const valueX = columnX + columnWidth - valueWidth;

    // Determine color based on difference
    const valueColor = stat.difference > 0 ? '#00ff00' : stat.difference < 0 ? '#ff0000' : '#ffffff';

    FontAtlasRenderer.renderText(
      ctx,
      valueText,
      valueX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      valueColor
    );
  }

  /**
   * Get all non-default properties from equipment with differences
   */
  private getNonDefaultProperties(equipment: Equipment): Array<{ statName: string; comparisonValue: number; difference: number }> {
    const stats: Array<{ statName: string; comparisonValue: number; difference: number }> = [];
    const mods = equipment.modifiers;

    // Check each possible stat modifier
    if (mods.physicalPowerModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'P.Pow');
      stats.push({
        statName: 'P.Pow',
        comparisonValue: mods.physicalPowerModifier,
        difference: mods.physicalPowerModifier - currentValue
      });
    }
    if (mods.magicPowerModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'M.Pow');
      stats.push({
        statName: 'M.Pow',
        comparisonValue: mods.magicPowerModifier,
        difference: mods.magicPowerModifier - currentValue
      });
    }
    if (mods.physicalEvadeModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'P.Evd');
      stats.push({
        statName: 'P.Evd',
        comparisonValue: mods.physicalEvadeModifier,
        difference: mods.physicalEvadeModifier - currentValue
      });
    }
    if (mods.magicEvadeModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'M.Evd');
      stats.push({
        statName: 'M.Evd',
        comparisonValue: mods.magicEvadeModifier,
        difference: mods.magicEvadeModifier - currentValue
      });
    }
    if (mods.healthModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'HP');
      stats.push({
        statName: 'HP',
        comparisonValue: mods.healthModifier,
        difference: mods.healthModifier - currentValue
      });
    }
    if (mods.manaModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'MP');
      stats.push({
        statName: 'MP',
        comparisonValue: mods.manaModifier,
        difference: mods.manaModifier - currentValue
      });
    }
    if (mods.speedModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'Speed');
      stats.push({
        statName: 'Speed',
        comparisonValue: mods.speedModifier,
        difference: mods.speedModifier - currentValue
      });
    }
    if (mods.movementModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'Move');
      stats.push({
        statName: 'Move',
        comparisonValue: mods.movementModifier,
        difference: mods.movementModifier - currentValue
      });
    }
    if (mods.courageModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'Courage');
      stats.push({
        statName: 'Courage',
        comparisonValue: mods.courageModifier,
        difference: mods.courageModifier - currentValue
      });
    }
    if (mods.attunementModifier !== 0) {
      const currentValue = this.getPropertyValue(this.currentItem, 'Attunement');
      stats.push({
        statName: 'Attunement',
        comparisonValue: mods.attunementModifier,
        difference: mods.attunementModifier - currentValue
      });
    }

    return stats;
  }

  /**
   * Get property value from equipment (0 if null or undefined)
   */
  private getPropertyValue(equipment: Equipment | null, statName: string): number {
    if (!equipment) return 0;

    const mods = equipment.modifiers;

    switch (statName) {
      case 'P.Pow': return mods.physicalPowerModifier;
      case 'M.Pow': return mods.magicPowerModifier;
      case 'P.Evd': return mods.physicalEvadeModifier;
      case 'M.Evd': return mods.magicEvadeModifier;
      case 'HP': return mods.healthModifier;
      case 'MP': return mods.manaModifier;
      case 'Speed': return mods.speedModifier;
      case 'Move': return mods.movementModifier;
      case 'Courage': return mods.courageModifier;
      case 'Attunement': return mods.attunementModifier;
      default: return 0;
    }
  }
}

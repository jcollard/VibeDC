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
  private hoveredOption: 'cancel' | 'remove' | null = null;
  private cancelBounds: { x: number; y: number; width: number; height: number } | null = null;
  private removeBounds: { x: number; y: number; width: number; height: number } | null = null;

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

    // Render Remove Item and Cancel options (below title, above helper text)
    const normalColor = '#ffffff';
    const hoverColor = '#ffff00'; // Yellow for hover

    // Render "Remove Item" option first if currentItem exists
    if (this.currentItem) {
      const removeText = 'Remove Item';
      const removeColor = this.hoveredOption === 'remove' ? hoverColor : normalColor;
      const removeX = region.x + padding;
      FontAtlasRenderer.renderText(
        ctx,
        removeText,
        removeX,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        removeColor
      );

      // Store remove bounds for hit detection (panel-relative)
      const removeWidth = FontAtlasRenderer.measureText(removeText, font);
      this.removeBounds = {
        x: padding,
        y: y - region.y,
        width: removeWidth,
        height: lineSpacing
      };

      y += lineSpacing; // Move to next line for Cancel
    } else {
      this.removeBounds = null;
    }

    // Render "Cancel" option
    const cancelText = 'Cancel';
    const cancelColor = this.hoveredOption === 'cancel' ? hoverColor : normalColor;
    const cancelX = region.x + padding;
    FontAtlasRenderer.renderText(
      ctx,
      cancelText,
      cancelX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      cancelColor
    );

    // Store cancel bounds for hit detection (panel-relative)
    const cancelWidth = FontAtlasRenderer.measureText(cancelText, font);
    this.cancelBounds = {
      x: padding,
      y: y - region.y,
      width: cancelWidth,
      height: lineSpacing
    };

    y += lineSpacing; // Move past Cancel

    // Only show helper text if no comparison item
    if (!this.comparisonItem) {
      y += 12; // 12px spacing before helper text

      // Render helper text based on hover state or default
      const helperColor = '#888888'; // Grey for helper text
      let helperText = 'Select an item to equip.';

      if (this.hoveredOption === 'cancel') {
        helperText = 'Clear equipment selection';
      } else if (this.hoveredOption === 'remove') {
        helperText = 'Remove item and add to inventory';
      }

      // Helper text might be too wide, wrap if necessary
      const helperWidth = FontAtlasRenderer.measureText(helperText, font);
      const helperAvailableWidth = region.width - (padding * 2);

      if (helperWidth <= helperAvailableWidth) {
        // Fits on one line - center it
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
          helperColor
        );
      } else {
        // Need to wrap - split into lines and center each
        if (this.hoveredOption === 'remove') {
          // "Remove item and add to inventory" -> "Remove item and" / "add to inventory"
          const line1 = 'Remove item and';
          const line2 = 'add to inventory';

          const line1Width = FontAtlasRenderer.measureText(line1, font);
          const line1X = region.x + Math.floor((region.width - line1Width) / 2);
          FontAtlasRenderer.renderText(ctx, line1, line1X, y, fontId, fontAtlasImage, 1, 'left', helperColor);
          y += lineSpacing;

          const line2Width = FontAtlasRenderer.measureText(line2, font);
          const line2X = region.x + Math.floor((region.width - line2Width) / 2);
          FontAtlasRenderer.renderText(ctx, line2, line2X, y, fontId, fontAtlasImage, 1, 'left', helperColor);
        } else if (this.hoveredOption === 'cancel') {
          // "Clear equipment selection" -> "Clear equipment" / "selection"
          const line1 = 'Clear equipment';
          const line2 = 'selection';

          const line1Width = FontAtlasRenderer.measureText(line1, font);
          const line1X = region.x + Math.floor((region.width - line1Width) / 2);
          FontAtlasRenderer.renderText(ctx, line1, line1X, y, fontId, fontAtlasImage, 1, 'left', helperColor);
          y += lineSpacing;

          const line2Width = FontAtlasRenderer.measureText(line2, font);
          const line2X = region.x + Math.floor((region.width - line2Width) / 2);
          FontAtlasRenderer.renderText(ctx, line2, line2X, y, fontId, fontAtlasImage, 1, 'left', helperColor);
        } else {
          // "Select an item to equip." -> "Select an item" / "to equip."
          const line1 = 'Select an item';
          const line2 = 'to equip.';

          const line1Width = FontAtlasRenderer.measureText(line1, font);
          const line1X = region.x + Math.floor((region.width - line1Width) / 2);
          FontAtlasRenderer.renderText(ctx, line1, line1X, y, fontId, fontAtlasImage, 1, 'left', helperColor);
          y += lineSpacing;

          const line2Width = FontAtlasRenderer.measureText(line2, font);
          const line2X = region.x + Math.floor((region.width - line2Width) / 2);
          FontAtlasRenderer.renderText(ctx, line2, line2X, y, fontId, fontAtlasImage, 1, 'left', helperColor);
        }
      }

      // If no comparison item, don't render stats
      ctx.restore();
      return;
    }

    y += 2; // Small spacing before stats

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

  /**
   * Handle hover events to detect option hover
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    // Check if hovering over Cancel option
    if (this.cancelBounds) {
      const bounds = this.cancelBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        if (this.hoveredOption !== 'cancel') {
          this.hoveredOption = 'cancel';
          return { type: 'option-hover', option: 'cancel' };
        }
        return null;
      }
    }

    // Check if hovering over Remove Item option
    if (this.removeBounds) {
      const bounds = this.removeBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        if (this.hoveredOption !== 'remove') {
          this.hoveredOption = 'remove';
          return { type: 'option-hover', option: 'remove' };
        }
        return null;
      }
    }

    // Clear hover if not over any option
    if (this.hoveredOption !== null) {
      this.hoveredOption = null;
      return { type: 'option-hover', option: null };
    }

    return null;
  }

  /**
   * Handle click events to detect option clicks
   */
  handleClick(relativeX: number, relativeY: number): import('../../combat/managers/panels/PanelContent').PanelClickResult {
    // Check if clicking on Cancel option
    if (this.cancelBounds) {
      const bounds = this.cancelBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        return { type: 'button', buttonId: 'cancel-selection' };
      }
    }

    // Check if clicking on Remove Item option
    if (this.removeBounds) {
      const bounds = this.removeBounds;
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        return { type: 'button', buttonId: 'remove-item' };
      }
    }

    return null;
  }
}

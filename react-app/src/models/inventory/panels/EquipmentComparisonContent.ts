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
  private comparisonItem: Equipment;

  constructor(currentItem: Equipment | null, comparisonItem: Equipment) {
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
    const titleText = `${currentName} vs ${this.comparisonItem.name}`;
    const titleColor = '#ffff00'; // Yellow for title

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

    // Get non-default properties from comparison item
    const comparisonStats = this.getNonDefaultProperties(this.comparisonItem);

    // Render each stat with difference
    for (const [statName, comparisonValue] of Object.entries(comparisonStats)) {
      const currentValue = this.getPropertyValue(this.currentItem, statName);
      const difference = comparisonValue - currentValue;

      // Format the line: "StatName: ComparisonValue (±Difference)"
      let lineText = `${statName}: ${comparisonValue}`;

      if (difference !== 0) {
        const diffText = difference > 0 ? `(+${difference})` : `(${difference})`;
        const diffColor = difference > 0 ? '#00ff00' : '#ff0000'; // Green for positive, red for negative

        // Render stat name and value in white
        FontAtlasRenderer.renderText(
          ctx,
          lineText,
          region.x + padding,
          y,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );

        // Render difference in color
        const lineWidth = FontAtlasRenderer.measureText(lineText, font);
        FontAtlasRenderer.renderText(
          ctx,
          ` ${diffText}`,
          region.x + padding + lineWidth,
          y,
          fontId,
          fontAtlasImage,
          1,
          'left',
          diffColor
        );
      } else {
        // No difference, render in white
        FontAtlasRenderer.renderText(
          ctx,
          lineText,
          region.x + padding,
          y,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffffff'
        );
      }

      y += lineSpacing;
    }

    ctx.restore();
  }

  /**
   * Get all non-default properties from equipment
   */
  private getNonDefaultProperties(equipment: Equipment): Record<string, number> {
    const stats: Record<string, number> = {};
    const mods = equipment.modifiers;

    // Check each possible stat modifier
    if (mods.physicalPowerModifier !== 0) {
      stats['P.Pow'] = mods.physicalPowerModifier;
    }
    if (mods.magicPowerModifier !== 0) {
      stats['M.Pow'] = mods.magicPowerModifier;
    }
    if (mods.physicalEvadeModifier !== 0) {
      stats['P.Evd'] = mods.physicalEvadeModifier;
    }
    if (mods.magicEvadeModifier !== 0) {
      stats['M.Evd'] = mods.magicEvadeModifier;
    }
    if (mods.healthModifier !== 0) {
      stats['HP'] = mods.healthModifier;
    }
    if (mods.manaModifier !== 0) {
      stats['MP'] = mods.manaModifier;
    }
    if (mods.speedModifier !== 0) {
      stats['Speed'] = mods.speedModifier;
    }
    if (mods.movementModifier !== 0) {
      stats['Move'] = mods.movementModifier;
    }
    if (mods.courageModifier !== 0) {
      stats['Courage'] = mods.courageModifier;
    }
    if (mods.attunementModifier !== 0) {
      stats['Attunement'] = mods.attunementModifier;
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

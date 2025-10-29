import type { Equipment } from '../../Equipment';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from './PanelContent';
import { ITEM_NAME_COLOR } from './colors';

/**
 * Panel content that displays detailed information about equipment.
 * Shows: centered equipment name (orange), stat modifiers grid, optional description.
 */
export class EquipmentInfoContent implements PanelContent {
  private equipment: Equipment;
  private padding: number = 1;
  private lineSpacing: number = 8;

  constructor(equipment: Equipment) {
    this.equipment = equipment;
  }

  /**
   * Update the equipment being displayed
   * Allows reusing the same panel instance for different equipment
   */
  public setEquipment(equipment: Equipment): void {
    this.equipment = equipment;
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

    let y = region.y + this.padding;

    // Render equipment name (centered, orange)
    const nameWidth = FontAtlasRenderer.measureText(this.equipment.name, font);
    const nameX = region.x + Math.floor((region.width - nameWidth) / 2);
    FontAtlasRenderer.renderText(
      ctx,
      this.equipment.name,
      nameX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ITEM_NAME_COLOR
    );

    y += this.lineSpacing + 2; // Spacing after name

    // Get non-zero modifiers and non-1.0 multipliers
    const displayStats = this.getDisplayStats();

    if (displayStats.length > 0) {
      // Render stats grid (two columns)
      const statsAreaWidth = region.width - (this.padding * 2);
      const columnGap = 8;
      const columnWidth = (statsAreaWidth - columnGap) / 2;
      const leftColumnX = region.x + this.padding;
      const rightColumnX = leftColumnX + columnWidth + columnGap;

      const leftColumn = displayStats.filter((_, idx) => idx % 2 === 0);
      const rightColumn = displayStats.filter((_, idx) => idx % 2 === 1);

      const maxRows = Math.max(leftColumn.length, rightColumn.length);

      for (let i = 0; i < maxRows; i++) {
        // Stop if we exceed panel height
        if (y + this.lineSpacing > region.y + region.height - this.padding) {
          break;
        }

        // Render left column stat
        if (i < leftColumn.length) {
          const stat = leftColumn[i];
          FontAtlasRenderer.renderText(
            ctx,
            stat.label,
            leftColumnX,
            y,
            fontId,
            fontAtlasImage,
            1,
            'left',
            '#ffffff'
          );

          const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
          const valueX = leftColumnX + columnWidth - valueWidth;
          FontAtlasRenderer.renderText(
            ctx,
            stat.value,
            valueX,
            y,
            fontId,
            fontAtlasImage,
            1,
            'left',
            '#ffffff'
          );
        }

        // Render right column stat
        if (i < rightColumn.length) {
          const stat = rightColumn[i];
          FontAtlasRenderer.renderText(
            ctx,
            stat.label,
            rightColumnX,
            y,
            fontId,
            fontAtlasImage,
            1,
            'left',
            '#ffffff'
          );

          const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
          const valueX = rightColumnX + columnWidth - valueWidth;
          FontAtlasRenderer.renderText(
            ctx,
            stat.value,
            valueX,
            y,
            fontId,
            fontAtlasImage,
            1,
            'left',
            '#ffffff'
          );
        }

        y += this.lineSpacing;
      }

      y += 2; // Spacing after stats
    }

    // Render description if available (wrapped, white)
    // Note: Equipment may not have description property - check first
    // For now, we'll skip description since Equipment.ts doesn't define it
    // Future: Add description property to Equipment class if needed
  }

  /**
   * Get list of stats to display (non-zero modifiers, non-1.0 multipliers)
   */
  private getDisplayStats(): Array<{ label: string; value: string }> {
    const stats: Array<{ label: string; value: string }> = [];
    const modifiers = this.equipment.modifiers;

    // Check modifiers (non-zero only)
    if (modifiers.healthModifier !== 0) {
      stats.push({ label: 'HP', value: this.formatModifier(modifiers.healthModifier) });
    }
    if (modifiers.manaModifier !== 0) {
      stats.push({ label: 'MP', value: this.formatModifier(modifiers.manaModifier) });
    }
    if (modifiers.physicalPowerModifier !== 0) {
      stats.push({ label: 'P.Pow', value: this.formatModifier(modifiers.physicalPowerModifier) });
    }
    if (modifiers.magicPowerModifier !== 0) {
      stats.push({ label: 'M.Pow', value: this.formatModifier(modifiers.magicPowerModifier) });
    }
    if (modifiers.speedModifier !== 0) {
      stats.push({ label: 'Speed', value: this.formatModifier(modifiers.speedModifier) });
    }
    if (modifiers.movementModifier !== 0) {
      stats.push({ label: 'Move', value: this.formatModifier(modifiers.movementModifier) });
    }
    if (modifiers.physicalEvadeModifier !== 0) {
      stats.push({ label: 'P.Evd', value: this.formatModifier(modifiers.physicalEvadeModifier) });
    }
    if (modifiers.magicEvadeModifier !== 0) {
      stats.push({ label: 'M.Evd', value: this.formatModifier(modifiers.magicEvadeModifier) });
    }
    if (modifiers.courageModifier !== 0) {
      stats.push({ label: 'Courage', value: this.formatModifier(modifiers.courageModifier) });
    }
    if (modifiers.attunementModifier !== 0) {
      stats.push({ label: 'Attunement', value: this.formatModifier(modifiers.attunementModifier) });
    }

    // Check multipliers (non-1.0 only)
    if (modifiers.healthMultiplier !== 1.0) {
      stats.push({ label: 'HP', value: this.formatMultiplier(modifiers.healthMultiplier) });
    }
    if (modifiers.manaMultiplier !== 1.0) {
      stats.push({ label: 'MP', value: this.formatMultiplier(modifiers.manaMultiplier) });
    }
    if (modifiers.physicalPowerMultiplier !== 1.0) {
      stats.push({ label: 'P.Pow', value: this.formatMultiplier(modifiers.physicalPowerMultiplier) });
    }
    if (modifiers.magicPowerMultiplier !== 1.0) {
      stats.push({ label: 'M.Pow', value: this.formatMultiplier(modifiers.magicPowerMultiplier) });
    }
    if (modifiers.speedMultiplier !== 1.0) {
      stats.push({ label: 'Speed', value: this.formatMultiplier(modifiers.speedMultiplier) });
    }
    if (modifiers.movementMultiplier !== 1.0) {
      stats.push({ label: 'Move', value: this.formatMultiplier(modifiers.movementMultiplier) });
    }
    if (modifiers.physicalEvadeMultiplier !== 1.0) {
      stats.push({ label: 'P.Evd', value: this.formatMultiplier(modifiers.physicalEvadeMultiplier) });
    }
    if (modifiers.magicEvadeMultiplier !== 1.0) {
      stats.push({ label: 'M.Evd', value: this.formatMultiplier(modifiers.magicEvadeMultiplier) });
    }
    if (modifiers.courageMultiplier !== 1.0) {
      stats.push({ label: 'Courage', value: this.formatMultiplier(modifiers.courageMultiplier) });
    }
    if (modifiers.attunementMultiplier !== 1.0) {
      stats.push({ label: 'Attunement', value: this.formatMultiplier(modifiers.attunementMultiplier) });
    }

    return stats;
  }

  /**
   * Format modifier value (e.g., +5, -3)
   */
  private formatModifier(value: number): string {
    if (value > 0) {
      return `+${value}`;
    }
    return value.toString();
  }

  /**
   * Format multiplier value (e.g., x1.2, x0.8)
   * Uses ASCII 'x' not multiplication symbol for compatibility
   */
  private formatMultiplier(value: number): string {
    return `x${value.toFixed(1)}`;
  }
}

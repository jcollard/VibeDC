import type { CombatUnit } from '../../CombatUnit';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion } from './PanelContent';

/**
 * Configuration for unit info panel appearance
 */
export interface UnitInfoConfig {
  title: string;
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Panel content that displays detailed information about a single combat unit.
 * Shows: unit name (as title), class, HP, MP, speed, and movement.
 */
export class UnitInfoContent implements PanelContent {
  private config: UnitInfoConfig;
  private unit: CombatUnit;

  constructor(config: UnitInfoConfig, unit: CombatUnit) {
    this.config = config;
    this.unit = unit;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    let currentY = region.y + this.config.padding;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      this.config.title,
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      this.config.titleColor
    );
    currentY += this.config.lineSpacing;

    // Unit class
    FontAtlasRenderer.renderText(
      ctx,
      this.unit.unitClass.name,
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += this.config.lineSpacing;

    // HP
    FontAtlasRenderer.renderText(
      ctx,
      `HP: ${this.unit.health}/${this.unit.maxHealth}`,
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += this.config.lineSpacing;

    // MP
    FontAtlasRenderer.renderText(
      ctx,
      `MP: ${this.unit.mana}/${this.unit.maxMana}`,
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += this.config.lineSpacing;

    // Speed and Movement
    FontAtlasRenderer.renderText(
      ctx,
      `Spd:${this.unit.speed} Mov:${this.unit.movement}`,
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
  }

  /**
   * Update the unit being displayed and the panel title/color
   * Call this instead of recreating the content when the unit changes
   * @param unit - New combat unit to display
   * @param title - Optional new title (defaults to unit name)
   * @param titleColor - Optional new title color (defaults to based on isPlayerControlled)
   */
  updateUnit(unit: CombatUnit, title?: string, titleColor?: string): void {
    this.unit = unit;

    // Update title to unit name if not explicitly provided
    if (title !== undefined) {
      this.config.title = title;
    }

    // Update title color if provided
    if (titleColor !== undefined) {
      this.config.titleColor = titleColor;
    }
  }

  // No interaction handling needed for unit info
}

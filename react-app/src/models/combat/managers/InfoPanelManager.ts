import type { CombatUnit } from '../CombatUnit';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

/**
 * Union type for different content types the info panel can display
 */
export type InfoPanelContent =
  | { type: 'unit'; unit: CombatUnit }
  | { type: 'empty' };
  // Future content types can be added here:
  // | { type: 'terrain'; terrain: TerrainInfo }
  // | { type: 'item'; item: Item }

/**
 * Configuration for the info panel appearance
 */
export interface InfoPanelConfig {
  title: string;
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Region definition for rendering
 */
export interface PanelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Manages rendering of information panels that can display different types of content.
 * Used for current unit, target unit, and potentially other info displays.
 */
export class InfoPanelManager {
  private readonly config: InfoPanelConfig;

  constructor(config: InfoPanelConfig) {
    this.config = config;
  }

  /**
   * Render the panel content to the canvas
   */
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    content: InfoPanelContent,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    let currentY = region.y + this.config.padding + 6;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      this.config.title,
      region.x + this.config.padding + 6,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      this.config.titleColor
    );
    currentY += this.config.lineSpacing;

    // Render content based on type
    if (content.type === 'unit') {
      this.renderUnitContent(ctx, region, content.unit, currentY, fontId, fontAtlasImage);
    } else if (content.type === 'empty') {
      this.renderEmptyContent(ctx, region, currentY, fontId, fontAtlasImage);
    }
  }

  /**
   * Render unit information
   */
  private renderUnitContent(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    unit: CombatUnit,
    startY: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement
  ): void {
    let currentY = startY;

    // Unit name
    FontAtlasRenderer.renderText(
      ctx,
      unit.name,
      region.x + this.config.padding + 6,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += this.config.lineSpacing;

    // Unit class
    FontAtlasRenderer.renderText(
      ctx,
      unit.unitClass.name,
      region.x + this.config.padding + 6,
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
      `HP: ${unit.health}/${unit.maxHealth}`,
      region.x + this.config.padding + 6,
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
      `MP: ${unit.mana}/${unit.maxMana}`,
      region.x + this.config.padding + 6,
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
      `Spd:${unit.speed} Mov:${unit.movement}`,
      region.x + this.config.padding + 6,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
  }

  /**
   * Render empty state (no content to display)
   */
  private renderEmptyContent(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    startY: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement
  ): void {
    FontAtlasRenderer.renderText(
      ctx,
      '-',
      region.x + this.config.padding + 6,
      startY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#666666'
    );
  }
}

import type { CombatUnit } from '../CombatUnit';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';

/**
 * Union type for different content types the info panel can display
 */
export type InfoPanelContent =
  | { type: 'unit'; unit: CombatUnit }
  | { type: 'empty' }
  | { type: 'party'; units: CombatUnit[]; spriteImages: Map<string, HTMLImageElement>; spriteSize: number };
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

    let currentY = region.y + this.config.padding;

    // Render title (centered for party content, left-aligned otherwise)
    const titleX = content.type === 'party'
      ? region.x + region.width / 2
      : region.x + this.config.padding;
    const titleAlign = content.type === 'party' ? 'center' : 'left';

    FontAtlasRenderer.renderText(
      ctx,
      this.config.title,
      titleX,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      titleAlign,
      this.config.titleColor
    );
    currentY += this.config.lineSpacing;

    // Render content based on type
    if (content.type === 'unit') {
      this.renderUnitContent(ctx, region, content.unit, currentY, fontId, fontAtlasImage);
    } else if (content.type === 'empty') {
      this.renderEmptyContent(ctx, region, currentY, fontId, fontAtlasImage);
    } else if (content.type === 'party') {
      this.renderPartyContent(ctx, region, content.units, currentY, fontId, fontAtlasImage, content.spriteImages, content.spriteSize);
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
      region.x + this.config.padding,
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
      `HP: ${unit.health}/${unit.maxHealth}`,
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
      `MP: ${unit.mana}/${unit.maxMana}`,
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
      `Spd:${unit.speed} Mov:${unit.movement}`,
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
      region.x + this.config.padding,
      startY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#666666'
    );
  }

  /**
   * Render party members in a 2x2 grid with sprites and names
   */
  private renderPartyContent(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    units: CombatUnit[],
    startY: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    const spriteDisplaySize = 12; // 12x12px sprites
    const nameSpacing = 8; // Space for name below sprite
    const verticalSpacing = 6; // Additional vertical space between rows
    const cellWidth = region.width / 2; // 2 columns
    const cellHeight = (spriteDisplaySize + nameSpacing + verticalSpacing); // Height of sprite + name + spacing

    // Calculate starting position to center the grid vertically in remaining space
    const availableHeight = region.height - (startY - region.y);
    const gridHeight = Math.min(2, Math.ceil(units.length / 2)) * cellHeight;
    let currentY = startY + (availableHeight - gridHeight) / 2;

    // Render units in 2x2 grid (up to 4 units)
    for (let i = 0; i < units.length && i < 4; i++) {
      const unit = units[i];
      const row = Math.floor(i / 2);
      const col = i % 2;

      // Calculate position for this cell
      const cellX = region.x + col * cellWidth;
      const cellY = currentY + row * cellHeight;

      // Center sprite within cell
      const spriteX = cellX + (cellWidth - spriteDisplaySize) / 2;
      const spriteY = cellY;

      // Render sprite
      SpriteRenderer.renderSpriteById(
        ctx,
        unit.spriteId,
        spriteImages,
        spriteSize,
        spriteX,
        spriteY,
        spriteDisplaySize,
        spriteDisplaySize
      );

      // Render name centered below sprite
      const nameY = spriteY + spriteDisplaySize + 1;
      const nameX = cellX + cellWidth / 2;
      FontAtlasRenderer.renderText(
        ctx,
        unit.name,
        nameX,
        nameY,
        fontId,
        fontAtlasImage,
        1,
        'center',
        '#ffffff'
      );
    }
  }
}

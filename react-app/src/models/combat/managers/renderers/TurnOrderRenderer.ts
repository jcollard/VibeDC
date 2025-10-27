import type { TopPanelRenderer, PanelRegion } from '../TopPanelRenderer';
import type { CombatUnit } from '../../CombatUnit';
import { SpriteRenderer } from '../../../../utils/SpriteRenderer';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';

/**
 * Renders the turn order as a horizontal list of unit sprites.
 * Supports clicking on units to select them as the target.
 */
export class TurnOrderRenderer implements TopPanelRenderer {
  private units: CombatUnit[];
  private onUnitClick?: (unit: CombatUnit) => void;
  private readonly spriteSpacing: number = 12; // 1 tile spacing between sprites
  private readonly spriteSize: number = 12; // Sprite size in pixels

  constructor(units: CombatUnit[], onUnitClick?: (unit: CombatUnit) => void) {
    this.units = units;
    this.onUnitClick = onUnitClick;
  }

  /**
   * Update the units to display
   */
  setUnits(units: CombatUnit[]): void {
    this.units = units;
  }

  /**
   * Set the click handler
   */
  setClickHandler(handler: (unit: CombatUnit) => void): void {
    this.onUnitClick = handler;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    _fontId: string,
    _fontAtlasImage: HTMLImageElement | null,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number,
    smallFontAtlasImage?: HTMLImageElement | null
  ): void {
    // Render units horizontally, starting from the left edge of the region
    let currentX = region.x;
    const spriteY = region.y;

    for (const unit of this.units) {
      // Check if we've exceeded the region width
      if (currentX + this.spriteSize > region.x + region.width) {
        break; // Stop rendering if we run out of space
      }

      // Render the unit sprite
      SpriteRenderer.renderSpriteById(
        ctx,
        unit.spriteId,
        spriteImages,
        spriteSize,
        currentX,
        spriteY,
        this.spriteSize,
        this.spriteSize
      );

      // Render action timer value below sprite using small font
      if (smallFontAtlasImage) {
        const timerValue = Math.floor(unit.actionTimer); // Round down for display
        const timerText = timerValue.toString();
        const textX = currentX + this.spriteSize / 2; // Center under sprite
        const textY = spriteY + this.spriteSize + 1; // 1px below sprite

        // Use 7px-04b03 font for small, readable numbers
        FontAtlasRenderer.renderText(
          ctx,
          timerText,
          textX,
          textY,
          '7px-04b03',
          smallFontAtlasImage,
          1, // Normal scale
          'center', // alignment
          '#ffffff' // color
        );
      }

      // Move to next position
      currentX += this.spriteSize + this.spriteSpacing;
    }
  }

  handleClick(x: number, y: number, region: PanelRegion): boolean {
    if (!this.onUnitClick) return false;

    // Check if click is within the panel region
    if (x < region.x || x > region.x + region.width ||
        y < region.y || y > region.y + region.height) {
      return false;
    }

    // Determine which unit was clicked
    let currentX = region.x;

    for (const unit of this.units) {
      // Check if we've exceeded the region width
      if (currentX + this.spriteSize > region.x + region.width) {
        break;
      }

      // Check if click is within this unit's sprite bounds
      if (x >= currentX && x < currentX + this.spriteSize &&
          y >= region.y && y < region.y + this.spriteSize) {
        this.onUnitClick(unit);
        return true;
      }

      // Move to next position
      currentX += this.spriteSize + this.spriteSpacing;
    }

    return false;
  }
}

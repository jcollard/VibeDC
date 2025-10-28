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
    // Render "Action Timers" title at the top in yellow/orange using small font
    if (smallFontAtlasImage) {
      const titleX = region.x + region.width / 2;
      const titleY = region.y; // No padding from top

      FontAtlasRenderer.renderText(
        ctx,
        'Action Timers',
        titleX,
        titleY,
        '7px-04b03',
        smallFontAtlasImage,
        1,
        'center',
        '#FFA500' // Orange color
      );
    }

    // Calculate total width needed for all units
    const totalUnits = Math.min(this.units.length, Math.floor(region.width / (this.spriteSize + this.spriteSpacing)));
    const totalWidth = totalUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;

    // Calculate starting X to center the units
    const startX = region.x + (region.width - totalWidth) / 2;

    // Position sprites at the bottom of the panel
    // Leave room for sprite (12px) + timer text (7px), shifted down 3px total (2px + 1px for sprite)
    const spriteY = region.y + region.height - this.spriteSize - 7 + 3;

    let currentX = startX;

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

      // Render action timer (AT) value below sprite
      if (smallFontAtlasImage) {
        const timerValue = Math.floor(unit.actionTimer); // Round down for display
        const timerText = timerValue.toString();
        const textX = currentX + this.spriteSize / 2; // Center under sprite
        // Text Y position adjusted to stay in same place (sprite moved down 1px, so subtract 1px from offset)
        const textY = spriteY + this.spriteSize;

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

    // Calculate total width needed for all units (same as in render)
    const totalUnits = Math.min(this.units.length, Math.floor(region.width / (this.spriteSize + this.spriteSpacing)));
    const totalWidth = totalUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;

    // Calculate starting X to center the units (same as in render)
    const startX = region.x + (region.width - totalWidth) / 2;

    // Position sprites at the bottom of the panel (same as in render)
    const spriteY = region.y + region.height - this.spriteSize - 7 + 3;

    // Determine which unit was clicked
    let currentX = startX;

    for (const unit of this.units) {
      // Check if we've exceeded the region width
      if (currentX + this.spriteSize > region.x + region.width) {
        break;
      }

      // Check if click is within this unit's sprite bounds
      if (x >= currentX && x < currentX + this.spriteSize &&
          y >= spriteY && y < spriteY + this.spriteSize) {
        this.onUnitClick(unit);
        return true;
      }

      // Move to next position
      currentX += this.spriteSize + this.spriteSpacing;
    }

    return false;
  }
}

import type { TopPanelRenderer, PanelRegion } from '../TopPanelRenderer';
import type { CombatUnit } from '../../CombatUnit';
import { SpriteRenderer } from '../../../../utils/SpriteRenderer';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';

/**
 * Renders the turn order as a horizontal list of unit sprites with tick counter.
 * Supports clicking on units to select them as the target.
 */
export class TurnOrderRenderer implements TopPanelRenderer {
  private units: CombatUnit[];
  private tickCount: number;
  private onUnitClick?: (unit: CombatUnit) => void;
  private readonly spriteSpacing: number = 12; // 1 tile spacing between sprites
  private readonly spriteSize: number = 12; // Sprite size in pixels

  // Scroll state
  private scrollOffset: number = 0; // Index of first visible unit
  private readonly maxVisibleUnits: number = 8; // Max units to show at once

  // Arrow button bounds for click detection
  private scrollRightButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private scrollLeftButtonBounds: { x: number; y: number; width: number; height: number } | null = null;

  // Repeat scroll state
  private scrollRepeatTimer: number | null = null;
  private scrollRepeatDirection: 'left' | 'right' | null = null;
  private readonly scrollRepeatInterval: number = 200; // ms between repeats

  constructor(units: CombatUnit[], onUnitClickOrTickCount?: ((unit: CombatUnit) => void) | number, tickCount: number = 0) {
    this.units = units;

    // Handle overloaded constructor: second param can be onUnitClick or tickCount
    if (typeof onUnitClickOrTickCount === 'function') {
      this.onUnitClick = onUnitClickOrTickCount;
      this.tickCount = 0; // Default when callback is provided
    } else if (typeof onUnitClickOrTickCount === 'number') {
      this.tickCount = onUnitClickOrTickCount;
      this.onUnitClick = undefined;
    } else {
      this.tickCount = tickCount;
      this.onUnitClick = undefined;
    }
  }

  /**
   * Update the units to display and reset scroll position
   */
  setUnits(units: CombatUnit[]): void {
    this.units = units;
    this.scrollOffset = 0; // Reset to start when units change
  }

  /**
   * Update the units without resetting scroll position
   * Use this when the unit list changes but you want to preserve scroll state
   */
  updateUnits(units: CombatUnit[]): void {
    this.units = units;
    // Don't reset scrollOffset - preserve scroll position
    // But clamp it if it's now out of bounds
    const maxOffset = Math.max(0, this.units.length - this.maxVisibleUnits);
    if (this.scrollOffset > maxOffset) {
      this.scrollOffset = maxOffset;
    }
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

    // Render clock sprite and tick counter on the left
    const clockX = region.x + 4; // Left aligned with padding (shifted right 2px from original 2px)
    const clockY = region.y + region.height - this.spriteSize - 7 + 3; // Same Y as unit sprites

    // Render "TIME" label above clock
    if (smallFontAtlasImage) {
      const timeLabelX = clockX + this.spriteSize / 2 + 1; // Shifted right 1px
      const timeLabelY = region.y; // Same Y as title

      FontAtlasRenderer.renderText(
        ctx,
        'TIME',
        timeLabelX,
        timeLabelY,
        '7px-04b03',
        smallFontAtlasImage,
        1,
        'center',
        '#FFA500' // Orange color (same as title)
      );
    }

    // Render clock sprite (icons-5)
    SpriteRenderer.renderSpriteById(
      ctx,
      'icons-5',
      spriteImages,
      spriteSize,
      clockX,
      clockY,
      this.spriteSize,
      this.spriteSize
    );

    // Render tick count below clock
    if (smallFontAtlasImage) {
      const tickTextX = clockX + this.spriteSize / 2;
      const tickTextY = clockY + this.spriteSize;

      FontAtlasRenderer.renderText(
        ctx,
        this.tickCount.toString(),
        tickTextX,
        tickTextY,
        '7px-04b03',
        smallFontAtlasImage,
        1,
        'center',
        '#ffffff' // White color (same as AT values)
      );
    }

    // Calculate visible window based on scroll position
    const startIndex = this.scrollOffset;
    const endIndex = Math.min(this.scrollOffset + this.maxVisibleUnits, this.units.length);
    const visibleUnits = this.units.slice(startIndex, endIndex);

    // Calculate total width for visible units
    const totalVisibleUnits = visibleUnits.length;
    const totalWidth = totalVisibleUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;

    // Calculate starting X to center the units
    const startX = region.x + (region.width - totalWidth) / 2;

    // Position sprites at the bottom of the panel
    // Leave room for sprite (12px) + timer text (7px), shifted down 3px total (2px + 1px for sprite)
    const spriteY = region.y + region.height - this.spriteSize - 7 + 3;

    let currentX = startX;

    for (const unit of visibleUnits) {
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

    // Render scroll arrows if needed
    this.renderScrollArrows(ctx, region, spriteImages, spriteSize);
  }

  /**
   * Render left/right scroll arrows when appropriate
   */
  private renderScrollArrows(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    const arrowSize = 12; // 1 tile (same as sprite size)

    // Calculate arrow Y position (vertically centered in panel)
    const arrowY = region.y + (region.height - arrowSize) / 2;

    // Right arrow (show if we can scroll right)
    if (this.canScrollRight()) {
      const arrowX = region.x + region.width - arrowSize; // Right edge

      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-6', // Right arrow sprite (same as map scrolling)
        spriteImages,
        spriteSize,
        arrowX,
        arrowY,
        arrowSize,
        arrowSize
      );

      // Store bounds for click detection
      this.scrollRightButtonBounds = {
        x: arrowX,
        y: arrowY,
        width: arrowSize,
        height: arrowSize
      };
    } else {
      this.scrollRightButtonBounds = null;
    }

    // Left arrow (show if we can scroll left)
    if (this.canScrollLeft()) {
      // Position left arrow to the right of the clock area
      // Clock is at x=4, width=12, so start at x=20 (with 4px padding)
      const arrowX = region.x + 20;

      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-8', // Left arrow sprite (same as map scrolling)
        spriteImages,
        spriteSize,
        arrowX,
        arrowY,
        arrowSize,
        arrowSize
      );

      // Store bounds for click detection
      this.scrollLeftButtonBounds = {
        x: arrowX,
        y: arrowY,
        width: arrowSize,
        height: arrowSize
      };
    } else {
      this.scrollLeftButtonBounds = null;
    }
  }

  handleClick(x: number, y: number, region: PanelRegion): boolean {
    // Check if click is within the panel region
    if (x < region.x || x > region.x + region.width ||
        y < region.y || y > region.y + region.height) {
      return false;
    }

    // Priority 1: Check left arrow click
    if (this.scrollLeftButtonBounds &&
        x >= this.scrollLeftButtonBounds.x &&
        x <= this.scrollLeftButtonBounds.x + this.scrollLeftButtonBounds.width &&
        y >= this.scrollLeftButtonBounds.y &&
        y <= this.scrollLeftButtonBounds.y + this.scrollLeftButtonBounds.height) {
      this.scrollLeft();
      return true; // Event handled
    }

    // Priority 2: Check right arrow click
    if (this.scrollRightButtonBounds &&
        x >= this.scrollRightButtonBounds.x &&
        x <= this.scrollRightButtonBounds.x + this.scrollRightButtonBounds.width &&
        y >= this.scrollRightButtonBounds.y &&
        y <= this.scrollRightButtonBounds.y + this.scrollRightButtonBounds.height) {
      this.scrollRight();
      return true; // Event handled
    }

    // Priority 3: Check unit sprite clicks (using visible window)
    if (!this.onUnitClick) return false;

    // Calculate visible window (same as in render)
    const startIndex = this.scrollOffset;
    const endIndex = Math.min(this.scrollOffset + this.maxVisibleUnits, this.units.length);
    const visibleUnits = this.units.slice(startIndex, endIndex);

    // Calculate total width for visible units
    const totalVisibleUnits = visibleUnits.length;
    const totalWidth = totalVisibleUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;

    // Calculate starting X to center the units
    const startX = region.x + (region.width - totalWidth) / 2;

    // Position sprites at the bottom of the panel
    const spriteY = region.y + region.height - this.spriteSize - 7 + 3;

    // Determine which unit was clicked
    let currentX = startX;

    for (const unit of visibleUnits) {
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

  /**
   * Check if we can scroll left (not at start)
   */
  private canScrollLeft(): boolean {
    return this.scrollOffset > 0;
  }

  /**
   * Check if we can scroll right (more units beyond visible window)
   */
  private canScrollRight(): boolean {
    return this.scrollOffset + this.maxVisibleUnits < this.units.length;
  }

  /**
   * Scroll left by 1 unit (decrement offset)
   */
  private scrollLeft(): void {
    if (this.canScrollLeft()) {
      this.scrollOffset = Math.max(0, this.scrollOffset - 1);
    }
  }

  /**
   * Scroll right by 1 unit (increment offset)
   */
  private scrollRight(): void {
    if (this.canScrollRight()) {
      const maxOffset = Math.max(0, this.units.length - this.maxVisibleUnits);
      this.scrollOffset = Math.min(maxOffset, this.scrollOffset + 1);
    }
  }

  /**
   * Start repeat scrolling in the given direction
   */
  private startRepeatScroll(direction: 'left' | 'right'): void {
    // Clear any existing timer
    this.stopRepeatScroll();

    // Store direction
    this.scrollRepeatDirection = direction;

    // Set up repeat timer
    this.scrollRepeatTimer = window.setInterval(() => {
      if (this.scrollRepeatDirection === 'left') {
        this.scrollLeft();
      } else if (this.scrollRepeatDirection === 'right') {
        this.scrollRight();
      }
    }, this.scrollRepeatInterval);
  }

  /**
   * Stop repeat scrolling
   */
  private stopRepeatScroll(): void {
    if (this.scrollRepeatTimer !== null) {
      window.clearInterval(this.scrollRepeatTimer);
      this.scrollRepeatTimer = null;
    }
    this.scrollRepeatDirection = null;
  }

  /**
   * Handle mouse down events (starts scroll and repeat timer)
   */
  handleMouseDown(x: number, y: number, region: PanelRegion): boolean {
    // Check if mouse down is within the panel region
    if (x < region.x || x > region.x + region.width ||
        y < region.y || y > region.y + region.height) {
      return false;
    }

    // Check left arrow
    if (this.scrollLeftButtonBounds &&
        x >= this.scrollLeftButtonBounds.x &&
        x <= this.scrollLeftButtonBounds.x + this.scrollLeftButtonBounds.width &&
        y >= this.scrollLeftButtonBounds.y &&
        y <= this.scrollLeftButtonBounds.y + this.scrollLeftButtonBounds.height) {
      this.scrollLeft(); // Immediate scroll
      this.startRepeatScroll('left'); // Start repeat timer
      return true;
    }

    // Check right arrow
    if (this.scrollRightButtonBounds &&
        x >= this.scrollRightButtonBounds.x &&
        x <= this.scrollRightButtonBounds.x + this.scrollRightButtonBounds.width &&
        y >= this.scrollRightButtonBounds.y &&
        y <= this.scrollRightButtonBounds.y + this.scrollRightButtonBounds.height) {
      this.scrollRight(); // Immediate scroll
      this.startRepeatScroll('right'); // Start repeat timer
      return true;
    }

    return false;
  }

  /**
   * Handle mouse up events (stops repeat timer)
   */
  handleMouseUp(): void {
    this.stopRepeatScroll();
  }

  /**
   * Handle mouse leave events (stops repeat timer)
   */
  handleMouseLeave(): void {
    this.stopRepeatScroll();
  }
}

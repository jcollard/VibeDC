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

  // Position slide animation state
  private slideAnimationActive: boolean = false;
  private slideAnimationElapsedTime: number = 0;
  private readonly slideAnimationDuration: number = 1.5; // seconds (testing: 1.5s, default: 0.25s)
  private previousPositions: WeakMap<CombatUnit, number> = new WeakMap(); // Unit -> X coordinate
  private targetPositions: WeakMap<CombatUnit, number> = new WeakMap(); // Unit -> X coordinate
  private animatingUnits: CombatUnit[] = []; // Units that are currently animating
  private cachedRegion: PanelRegion | null = null; // Cached from last render
  private pendingSlideNewOrder: CombatUnit[] | null = null; // Pending slide to trigger on next render

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
   * Update the tick count (for animation)
   */
  updateTickCount(tickCount: number): void {
    this.tickCount = tickCount;
  }

  /**
   * Set the click handler
   */
  setClickHandler(handler: (unit: CombatUnit) => void): void {
    this.onUnitClick = handler;
  }

  /**
   * Get the current units array
   * Used to check if turn order has changed before triggering slide animation
   */
  getUnits(): CombatUnit[] {
    return this.units;
  }

  /**
   * Start a slide animation for units that changed positions
   * Called by ActionTimerPhaseHandler when turn order changes
   */
  startSlideAnimation(newOrder: CombatUnit[]): void {
    console.log('[TurnOrderRenderer] startSlideAnimation called with', newOrder.length, 'units');

    if (!this.cachedRegion) {
      console.log('[TurnOrderRenderer] Region not cached yet, deferring slide animation to next render');
      this.pendingSlideNewOrder = newOrder;
      return;
    }

    console.log('[TurnOrderRenderer] Starting slide animation, cachedRegion:', this.cachedRegion);

    // Reset scroll to show first 8 units during animation (per user requirement)
    this.scrollOffset = 0;

    // Debug: Log what units we're working with
    console.log('[TurnOrderRenderer] this.units (current, first 8):', this.units.slice(0, 8).map(u => u.name));
    console.log('[TurnOrderRenderer] newOrder (target, first 8):', newOrder.slice(0, 8).map(u => u.name));

    // Calculate current X positions based on current units array
    const currentXPositions = this.calculateUnitXPositions(this.units, this.cachedRegion);
    console.log('[TurnOrderRenderer] Current X positions:', currentXPositions);

    for (let i = 0; i < this.units.length; i++) {
      const unit = this.units[i];
      if (i < this.maxVisibleUnits) {
        // Unit is visible, use calculated position
        this.previousPositions.set(unit, currentXPositions[i]);
      } else {
        // Unit is off-screen to the right, start from beyond right edge
        // Add spriteSize to ensure it starts completely off-screen
        const rightEdgeX = this.cachedRegion.x + this.cachedRegion.width + this.spriteSize;
        this.previousPositions.set(unit, rightEdgeX);
      }
    }

    // Calculate target X positions based on new order
    const targetXPositions = this.calculateUnitXPositions(newOrder, this.cachedRegion);
    console.log('[TurnOrderRenderer] Target X positions:', targetXPositions);

    for (let i = 0; i < newOrder.length; i++) {
      const unit = newOrder[i];
      if (i < this.maxVisibleUnits) {
        // Unit will be visible, use calculated position
        this.targetPositions.set(unit, targetXPositions[i]);
      } else {
        // Unit will be off-screen to the right, target is beyond right edge
        // Add spriteSize to ensure it ends completely off-screen
        const rightEdgeX = this.cachedRegion.x + this.cachedRegion.width + this.spriteSize;
        this.targetPositions.set(unit, rightEdgeX);
      }
    }

    // Update units array to new order
    this.units = newOrder;

    // Store all units that need to be rendered during animation
    // This includes units from BOTH previous and new order (so units can slide off screen)
    const animatingUnitsSet = new Set<CombatUnit>();
    for (let i = 0; i < this.units.length; i++) {
      const unit = this.units[i];
      if (this.previousPositions.get(unit) !== undefined && this.targetPositions.get(unit) !== undefined) {
        animatingUnitsSet.add(unit);
      }
    }
    this.animatingUnits = Array.from(animatingUnitsSet);

    // Start animation
    this.slideAnimationActive = true;
    this.slideAnimationElapsedTime = 0;
    console.log('[TurnOrderRenderer] Slide animation started! Active:', this.slideAnimationActive, 'animating', this.animatingUnits.length, 'units');
  }

  /**
   * Update slide animation progress
   * Called each frame during animation
   * @returns True if animation is still in progress, false if complete
   */
  updateSlideAnimation(deltaTime: number): boolean {
    if (!this.slideAnimationActive) return false;

    this.slideAnimationElapsedTime += deltaTime;
    const progress = Math.min(this.slideAnimationElapsedTime / this.slideAnimationDuration, 1.0);

    console.log('[TurnOrderRenderer] Slide animation progress:', progress.toFixed(2), 'elapsed:', this.slideAnimationElapsedTime.toFixed(2));

    if (progress >= 1.0) {
      console.log('[TurnOrderRenderer] Slide animation complete!');
      this.slideAnimationActive = false;
      return false; // Animation complete
    }

    return true; // Animation still in progress
  }

  /**
   * Calculate X positions for an array of units
   * @param units Units to position
   * @param region Panel region
   * @returns Array of X positions corresponding to units array
   */
  private calculateUnitXPositions(units: CombatUnit[], region: PanelRegion): number[] {
    const visibleUnits = units.slice(this.scrollOffset, this.scrollOffset + this.maxVisibleUnits);
    const totalVisibleUnits = visibleUnits.length;
    const totalWidth = totalVisibleUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;
    const startX = region.x + (region.width - totalWidth) / 2;

    const positions: number[] = [];
    let currentX = startX;
    for (let i = 0; i < visibleUnits.length; i++) {
      positions.push(currentX);
      currentX += this.spriteSize + this.spriteSpacing;
    }
    return positions;
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
    // Cache region at start of render (for slide animation)
    this.cachedRegion = region;

    // Check if we have a pending slide animation to trigger now that region is cached
    if (this.pendingSlideNewOrder) {
      console.log('[TurnOrderRenderer] Triggering deferred slide animation in render');
      const newOrder = this.pendingSlideNewOrder;
      this.pendingSlideNewOrder = null;
      this.startSlideAnimation(newOrder);
    }

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
    // Position sprites at the bottom of the panel
    // Leave room for sprite (12px) + timer text (7px), shifted down 3px total (2px + 1px for sprite)
    const spriteY = region.y + region.height - this.spriteSize - 7 + 3;

    // Save context state and set clipping region for unit rendering
    // Extend clipping height by 7px to accommodate AT text below sprites
    const clipHeight = region.height + 7;
    ctx.save();
    ctx.beginPath();
    ctx.rect(region.x, region.y, region.width, clipHeight);
    ctx.clip();

    // If slide animation active, interpolate positions
    if (this.slideAnimationActive) {
      const progress = Math.min(this.slideAnimationElapsedTime / this.slideAnimationDuration, 1.0);

      console.log('[TurnOrderRenderer] Rendering animation, animatingUnits:', this.animatingUnits.length, 'progress:', progress.toFixed(2));

      for (const unit of this.animatingUnits) {
        const previousX = this.previousPositions.get(unit);
        const targetX = this.targetPositions.get(unit);

        // These should always be defined since we filtered them when creating animatingUnits
        if (previousX === undefined || targetX === undefined) {
          console.warn(`[TurnOrderRenderer] Unit ${unit.name}: missing animation data, skipping`);
          continue;
        }

        console.log(`[TurnOrderRenderer] Unit ${unit.name}: previousX=${previousX}, targetX=${targetX}`);

        // Linear interpolation
        const currentX = previousX + (targetX - previousX) * progress;
        console.log(`[TurnOrderRenderer] Interpolating ${unit.name} to ${currentX.toFixed(1)}`);

        // Render the unit at interpolated position
        this.renderUnitAtPosition(ctx, unit, currentX, spriteY, spriteImages, spriteSize, smallFontAtlasImage);
      }
    } else {
      // No animation, render at static positions
      const visibleUnits = this.units.slice(startIndex, endIndex);
      const positions = this.calculateUnitXPositions(this.units, region);
      for (let i = 0; i < visibleUnits.length; i++) {
        if (i >= positions.length) break;
        this.renderUnitAtPosition(ctx, visibleUnits[i], positions[i], spriteY, spriteImages, spriteSize, smallFontAtlasImage);
      }
    }

    // Restore context state (removes clipping)
    ctx.restore();

    // Render scroll arrows if needed (AFTER restoring - arrows should not be clipped)
    this.renderScrollArrows(ctx, region, spriteImages, spriteSize);
  }

  /**
   * Helper method to render a unit at a specific X position
   * @param ctx Canvas context
   * @param unit Unit to render
   * @param x X coordinate for sprite
   * @param y Y coordinate for sprite
   * @param spriteImages Sprite image map
   * @param spriteSize Base sprite size
   * @param smallFontAtlasImage Small font atlas for AT values
   */
  private renderUnitAtPosition(
    ctx: CanvasRenderingContext2D,
    unit: CombatUnit,
    x: number,
    y: number,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number,
    smallFontAtlasImage: HTMLImageElement | null | undefined
  ): void {
    // Render the unit sprite
    SpriteRenderer.renderSpriteById(
      ctx,
      unit.spriteId,
      spriteImages,
      spriteSize,
      x,
      y,
      this.spriteSize,
      this.spriteSize
    );

    // Render action timer (AT) value below sprite
    if (smallFontAtlasImage) {
      const timerValue = Math.floor(unit.actionTimer); // Round down for display
      const timerText = timerValue.toString();
      const textX = x + this.spriteSize / 2; // Center under sprite
      const textY = y + this.spriteSize;

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
  }

  /**
   * Render left/right scroll arrows when appropriate
   * Both arrows are stacked vertically on the right side
   */
  private renderScrollArrows(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    const arrowSize = 12; // 1 tile (same as sprite size)
    const arrowX = region.x + region.width - arrowSize; // Right edge

    // Left arrow on top (if we can scroll left)
    if (this.canScrollLeft()) {
      const leftArrowY = region.y; // Top of panel

      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-8', // Left arrow sprite (same as map scrolling)
        spriteImages,
        spriteSize,
        arrowX,
        leftArrowY,
        arrowSize,
        arrowSize
      );

      // Store bounds for click detection
      this.scrollLeftButtonBounds = {
        x: arrowX,
        y: leftArrowY,
        width: arrowSize,
        height: arrowSize
      };
    } else {
      this.scrollLeftButtonBounds = null;
    }

    // Right arrow on bottom (if we can scroll right)
    if (this.canScrollRight()) {
      const rightArrowY = region.y + arrowSize; // Bottom half of panel (12px down)

      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-6', // Right arrow sprite (same as map scrolling)
        spriteImages,
        spriteSize,
        arrowX,
        rightArrowY,
        arrowSize,
        arrowSize
      );

      // Store bounds for click detection
      this.scrollRightButtonBounds = {
        x: arrowX,
        y: rightArrowY,
        width: arrowSize,
        height: arrowSize
      };
    } else {
      this.scrollRightButtonBounds = null;
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

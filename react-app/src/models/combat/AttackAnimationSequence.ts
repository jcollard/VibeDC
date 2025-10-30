import type { Position } from '../../types';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * Attack Animation Sequence
 *
 * Handles the visual feedback for attack actions:
 * - Hit: Red flicker (1s) + damage number floating up (2s)
 * - Miss: "Miss" text floating up (2s)
 *
 * Total duration: 3.0 seconds per attack (1.0s flicker + 2.0s float)
 */
export class AttackAnimationSequence {
  private elapsedTime: number = 0;
  private readonly duration: number = 3.0; // Total animation duration in seconds

  private readonly flickerDuration: number = 1.0; // Flicker lasts 1 second
  private readonly floatDuration: number = 2.0; // Float lasts 2s
  private readonly floatDistance: number = 12; // 1 tile (12px) upward movement

  private readonly targetPosition: Position;
  private readonly isHit: boolean;
  private readonly damage: number;

  /**
   * Create a new attack animation sequence
   * @param targetPosition - Tile position of the target unit
   * @param isHit - True if attack hit, false if miss
   * @param damage - Damage dealt (only used if isHit is true)
   */
  constructor(targetPosition: Position, isHit: boolean, damage: number) {
    this.targetPosition = targetPosition;
    this.isHit = isHit;
    this.damage = damage;
  }

  /**
   * Update animation state
   * @param deltaTime - Time elapsed since last frame in seconds
   * @returns True if animation is complete, false if still playing
   */
  update(deltaTime: number): boolean {
    this.elapsedTime += deltaTime;
    return this.elapsedTime >= this.duration;
  }

  /**
   * Check if animation is complete
   */
  isComplete(): boolean {
    return this.elapsedTime >= this.duration;
  }

  /**
   * Render the animation
   * @param ctx - Canvas rendering context
   * @param tileSize - Size of one tile in pixels
   * @param offsetX - Map X offset in pixels
   * @param offsetY - Map Y offset in pixels
   * @param fontAtlasImage - Font atlas image for text rendering
   */
  render(
    ctx: CanvasRenderingContext2D,
    tileSize: number,
    offsetX: number,
    offsetY: number,
    fontAtlasImage: HTMLImageElement
  ): void {
    // Calculate target tile center position in screen coordinates
    const tileX = Math.floor(offsetX + (this.targetPosition.x * tileSize));
    const tileY = Math.floor(offsetY + (this.targetPosition.y * tileSize));
    const tileCenterX = tileX + Math.floor(tileSize / 2);
    const tileCenterY = tileY + Math.floor(tileSize / 2);

    if (this.isHit) {
      this.renderHitAnimation(
        ctx,
        tileX,
        tileY,
        tileSize,
        tileCenterX,
        tileCenterY,
        fontAtlasImage
      );
    } else {
      this.renderMissAnimation(ctx, tileCenterX, tileCenterY, fontAtlasImage);
    }
  }

  /**
   * Render hit animation: Red flicker + floating damage number
   */
  private renderHitAnimation(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    tileSize: number,
    tileCenterX: number,
    tileCenterY: number,
    fontAtlasImage: HTMLImageElement
  ): void {
    // Red flicker phase (0-1000ms)
    if (this.elapsedTime < this.flickerDuration) {
      // Alternates every 150ms for 1 second total
      const flickerInterval = 0.15; // 150ms intervals
      const intervalIndex = Math.floor(this.elapsedTime / flickerInterval);
      const shouldShowRed = intervalIndex % 2 === 0;

      if (shouldShowRed) {
        // Render red flicker by drawing a red semi-transparent overlay on the tile
        ctx.save();
        ctx.fillStyle = '#ff0000';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        ctx.restore();
      }
    }

    // Floating damage number phase (1000ms-3000ms)
    if (this.elapsedTime >= this.flickerDuration) {
      const floatElapsed = this.elapsedTime - this.flickerDuration;
      const floatProgress = Math.min(floatElapsed / this.floatDuration, 1.0);

      // Calculate floating Y position (moves up by floatDistance pixels)
      const floatY = tileCenterY - Math.floor(floatProgress * this.floatDistance);

      // Render damage number in red
      const damageText = this.damage.toString();
      FontAtlasRenderer.renderText(
        ctx,
        damageText,
        tileCenterX,
        floatY,
        '7px-04b03',
        fontAtlasImage,
        1, // scale
        'center', // alignment
        '#ff0000' // Red color for damage
      );
    }
  }

  /**
   * Render miss animation: Floating "Miss" text
   */
  private renderMissAnimation(
    ctx: CanvasRenderingContext2D,
    tileCenterX: number,
    tileCenterY: number,
    fontAtlasImage: HTMLImageElement
  ): void {
    // "Miss" text floats for the entire duration (no flicker phase)
    // Start floating immediately at 0s
    const floatProgress = Math.min(this.elapsedTime / this.floatDuration, 1.0);

    // Calculate floating Y position (moves up by floatDistance pixels)
    const floatY = tileCenterY - Math.floor(floatProgress * this.floatDistance);

    // Render "Miss" text in white
    FontAtlasRenderer.renderText(
      ctx,
      'Miss',
      tileCenterX,
      floatY,
      '7px-04b03',
      fontAtlasImage,
      1, // scale
      'center', // alignment
      '#ffffff' // White color for miss
    );
  }
}

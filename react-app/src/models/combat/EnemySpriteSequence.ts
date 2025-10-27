import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { CombatUnit } from './CombatUnit';
import type { Position } from '../../types';
import { CombatConstants } from './CombatConstants';
import { SpriteRenderer } from '../../utils/SpriteRenderer';

/**
 * Easing function type for fade transitions
 */
export type EasingFunction = (t: number) => number;

/**
 * Cinematic sequence that materializes a single enemy sprite using a dithered fade-in effect.
 * The enemy fades in over 1 second at its designated position on the combat map.
 */
export class EnemySpriteSequence implements CinematicSequence {
  private elapsedTime = 0;
  private readonly duration: number;
  private readonly easingFunction: EasingFunction;
  private complete = false;
  private readonly unit: CombatUnit;
  private readonly position: Position;

  // Cache off-screen canvas for performance (avoid creating 60 canvases/second)
  private spriteCanvas: HTMLCanvasElement | null = null;
  private spriteCtx: CanvasRenderingContext2D | null = null;

  /**
   * @param unit - The enemy unit to materialize
   * @param position - The position on the map where the enemy should appear
   * @param duration - Duration of the fade-in effect in seconds (default: 1.0)
   * @param easingFunction - Easing function to use (default: ease-in-out cubic)
   */
  constructor(
    unit: CombatUnit,
    position: Position,
    duration: number = 1.0,
    easingFunction: EasingFunction = EnemySpriteSequence.easeInOutCubic
  ) {
    this.unit = unit;
    this.position = position;
    this.duration = duration;
    this.easingFunction = easingFunction;
  }

  /**
   * Ease-in/ease-out cubic function
   * Provides smooth acceleration and deceleration
   */
  static easeInOutCubic(t: number): number {
    if (t < 0.5) {
      return 4 * t * t * t;
    } else {
      return 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
  }

  /**
   * Linear easing (no easing)
   */
  static linear(t: number): number {
    return t;
  }

  start(_state: CombatState, _encounter: CombatEncounter): void {
    this.elapsedTime = 0;
    this.complete = false;
  }

  update(deltaTime: number): boolean {
    this.elapsedTime += deltaTime;
    if (this.elapsedTime >= this.duration) {
      this.complete = true;
      return true;
    }
    return false;
  }

  /**
   * Use dithering to create a pixelated fade effect
   * Returns true if the pixel should be drawn based on alpha and dither pattern
   */
  private shouldDrawPixel(pixelX: number, pixelY: number, alpha: number): boolean {
    const ditherPixelSize = CombatConstants.ANIMATION.DITHERING.PIXEL_SIZE;
    const bayerMatrix = CombatConstants.ANIMATION.DITHERING.BAYER_MATRIX;

    // Calculate which dither block this pixel is in
    const blockX = Math.floor(pixelX / ditherPixelSize);
    const blockY = Math.floor(pixelY / ditherPixelSize);

    const threshold = bayerMatrix[blockY % 4][blockX % 4] / 16;
    return alpha > threshold;
  }

  /**
   * Render the enemy sprite with dithered fade-in effect
   */
  render(_state: CombatState, _encounter: CombatEncounter, context: CinematicRenderContext): void {
    const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

    // Calculate current fade progress (0 to 1)
    const progress = Math.min(this.elapsedTime / this.duration, 1.0);
    const alpha = this.easingFunction(progress);

    // If fully visible, render normally without dithering
    if (alpha >= 1.0) {
      const x = Math.round(offsetX + this.position.x * tileSize);
      const y = Math.round(offsetY + this.position.y * tileSize);

      SpriteRenderer.renderSpriteById(
        ctx,
        this.unit.spriteId,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize
      );
      return;
    }

    // Render with dithering effect
    const ditherPixelSize = CombatConstants.ANIMATION.DITHERING.PIXEL_SIZE;
    const x = Math.round(offsetX + this.position.x * tileSize);
    const y = Math.round(offsetY + this.position.y * tileSize);

    // Create/reuse off-screen canvas for the sprite
    if (!this.spriteCanvas) {
      this.spriteCanvas = document.createElement('canvas');
      this.spriteCanvas.width = tileSize;
      this.spriteCanvas.height = tileSize;
      this.spriteCtx = this.spriteCanvas.getContext('2d');
      if (this.spriteCtx) {
        this.spriteCtx.imageSmoothingEnabled = false;
      }
    }

    if (!this.spriteCtx) return;

    // Clear canvas and render the full sprite to it
    this.spriteCtx.clearRect(0, 0, tileSize, tileSize);
    SpriteRenderer.renderSpriteById(
      this.spriteCtx,
      this.unit.spriteId,
      spriteImages,
      spriteSize,
      0,
      0,
      tileSize,
      tileSize
    );

    // Apply dithering by drawing pixel blocks based on alpha
    for (let py = 0; py < tileSize; py += ditherPixelSize) {
      for (let px = 0; px < tileSize; px += ditherPixelSize) {
        // Check if this block should be visible based on dither pattern
        if (this.shouldDrawPixel(px, py, alpha)) {
          // Draw this pixel block from the sprite canvas to the main canvas
          ctx.drawImage(
            this.spriteCanvas,
            px, py, ditherPixelSize, ditherPixelSize,  // Source rectangle
            x + px, y + py, ditherPixelSize, ditherPixelSize  // Destination rectangle
          );
        }
      }
    }
  }

  isComplete(): boolean {
    return this.complete;
  }

  reset(): void {
    this.elapsedTime = 0;
    this.complete = false;
  }

  /**
   * Get the unit being animated (for debugging/inspection)
   */
  getUnit(): CombatUnit {
    return this.unit;
  }

  /**
   * Get the position where the unit is materializing
   */
  getPosition(): Position {
    return this.position;
  }
}

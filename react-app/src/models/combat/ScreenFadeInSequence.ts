import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { CombatConstants } from './CombatConstants';

/**
 * Easing function type for fade transitions
 */
export type EasingFunction = (t: number) => number;

/**
 * Cinematic sequence that fades in the entire rendered screen with a dithered effect.
 * This applies as a post-process effect after all other rendering is complete,
 * making it phase-agnostic - it works regardless of what's currently displayed.
 */
export class ScreenFadeInSequence implements CinematicSequence {
  private elapsedTime = 0;
  private readonly duration: number;
  private readonly easingFunction: EasingFunction;
  private complete = false;

  /**
   * @param duration - Total duration of the fade-in effect in seconds (default: 2.0)
   * @param easingFunction - Easing function to use (default: ease-in-out cubic)
   */
  constructor(
    duration: number = 2.0,
    easingFunction: EasingFunction = ScreenFadeInSequence.easeInOutCubic
  ) {
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
   * Calculate alpha value for a screen position based on diagonal wave effect
   * Positions closer to top-left fade earlier, bottom-right fades later
   */
  private calculatePositionAlpha(x: number, y: number, canvasWidth: number, canvasHeight: number, globalAlpha: number): number {
    // Calculate the diagonal distance from top-left (0,0)
    // Normalize by the maximum diagonal distance (bottom-right corner)
    const maxDistance = canvasWidth + canvasHeight;
    const positionDistance = x + y;
    const normalizedDistance = maxDistance > 0 ? positionDistance / maxDistance : 0;

    // Calculate the time when this position should start and finish fading
    // Positions further from origin start later
    const fadeStartProgress = normalizedDistance * 0.6; // First 60% spreads the wave
    const fadeRange = 0.4; // Each position fades over 40% of the total duration

    // Calculate progress for this specific position
    const localProgress = (globalAlpha - fadeStartProgress) / fadeRange;

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, localProgress));
  }

  /**
   * Use dithering to create a pixelated fade effect at 4px block level
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
   * Render the fade-in effect over the entire canvas
   * This is called AFTER all other rendering is complete
   */
  render(_state: CombatState, _encounter: CombatEncounter, context: CinematicRenderContext): void {
    const { ctx, canvasWidth, canvasHeight } = context;

    // Calculate current fade progress (0 to 1)
    const progress = Math.min(this.elapsedTime / this.duration, 1.0);
    const globalProgress = this.easingFunction(progress);

    // If fully visible (no black overlay), skip rendering
    if (globalProgress >= 1.0) {
      return;
    }

    // Draw dithered black overlay with diagonal wave
    ctx.fillStyle = '#000000';

    const ditherPixelSize = CombatConstants.ANIMATION.DITHERING.PIXEL_SIZE;

    // Iterate over dither blocks (4x4 pixels each)
    for (let y = 0; y < canvasHeight; y += ditherPixelSize) {
      for (let x = 0; x < canvasWidth; x += ditherPixelSize) {
        // Calculate alpha for this position based on diagonal wave
        const positionAlpha = this.calculatePositionAlpha(x, y, canvasWidth, canvasHeight, globalProgress);

        // Invert: we want black at the start (low positionAlpha means more black)
        const blackAlpha = 1.0 - positionAlpha;

        // Check if this dither block should be black based on position alpha
        if (this.shouldDrawPixel(x, y, blackAlpha)) {
          // Draw a 4x4 black block
          ctx.fillRect(x, y, ditherPixelSize, ditherPixelSize);
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
}

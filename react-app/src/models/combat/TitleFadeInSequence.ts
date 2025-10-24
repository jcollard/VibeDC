import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { renderTextWithShadow } from '../../utils/DialogRenderer';

/**
 * Cinematic sequence that fades in a title text at the top of the screen
 * Uses dithering for a pixelated fade effect
 */
export class TitleFadeInSequence implements CinematicSequence {
  private elapsedTime = 0;
  private readonly duration: number;
  private readonly title: string;
  private readonly fontSize: number;
  private readonly yPosition: number;
  private complete = false;

  /**
   * @param title - The text to display
   * @param duration - Duration of the fade-in effect in seconds (default: 1)
   * @param fontSize - Font size in pixels (default: 48)
   * @param yPosition - Y position on screen (default: 60)
   */
  constructor(title: string, duration: number = 1.0, fontSize: number = 48, yPosition: number = 60) {
    this.title = title;
    this.duration = duration;
    this.fontSize = fontSize;
    this.yPosition = yPosition;
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
   * Ease-in/ease-out cubic function
   */
  private easeInOutCubic(t: number): number {
    if (t < 0.5) {
      return 4 * t * t * t;
    } else {
      return 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
  }

  /**
   * Use dithering to create a pixelated fade effect at 4px block level
   */
  private shouldDrawPixel(pixelX: number, pixelY: number, alpha: number): boolean {
    const ditherPixelSize = 4;

    const bayerMatrix = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];

    const blockX = Math.floor(pixelX / ditherPixelSize);
    const blockY = Math.floor(pixelY / ditherPixelSize);

    const threshold = bayerMatrix[blockY % 4][blockX % 4] / 16;
    return alpha > threshold;
  }

  render(_state: CombatState, _encounter: CombatEncounter, context: CinematicRenderContext): void {
    const { ctx, canvasSize } = context;

    // Calculate fade progress with easing
    const progress = Math.min(this.elapsedTime / this.duration, 1.0);
    const alpha = this.easeInOutCubic(progress);

    // Create a temporary canvas for rendering the text
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize;
    tempCanvas.height = 100; // Enough height for the text and background
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.imageSmoothingEnabled = false;

    // Draw semi-transparent black background
    tempCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    tempCtx.fillRect(0, 0, canvasSize, 80);

    // Render text to temp canvas
    renderTextWithShadow(
      tempCtx,
      this.title,
      canvasSize / 2,
      40,
      `bold ${this.fontSize}px "DungeonSlant", monospace`,
      '#ffffff',
      2,
      'center',
      'middle'
    );

    // Get pixel data and apply dithering
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    for (let py = 0; py < tempCanvas.height; py++) {
      for (let px = 0; px < tempCanvas.width; px++) {
        const index = (py * tempCanvas.width + px) * 4;

        // Check if this pixel should be drawn based on dithering
        if (!this.shouldDrawPixel(px, py, alpha)) {
          // Replace with transparent black
          data[index] = 0;     // R
          data[index + 1] = 0; // G
          data[index + 2] = 0; // B
          data[index + 3] = 0; // A (transparent)
        }
      }
    }

    // Put modified pixels back
    tempCtx.putImageData(imageData, 0, 0);

    // Draw to main canvas at the top
    ctx.drawImage(tempCanvas, 0, 20);
  }

  isComplete(): boolean {
    return this.complete;
  }

  reset(): void {
    this.elapsedTime = 0;
    this.complete = false;
  }
}

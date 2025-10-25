import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { CombatConstants } from './CombatConstants';

/**
 * Cinematic sequence that fades in a title text at the top of the screen
 * Uses dithering for a pixelated fade effect
 */
export class TitleFadeInSequence implements CinematicSequence {
  private elapsedTime = 0;
  private readonly duration: number;
  private readonly title: string;
  private readonly scale: number;
  private readonly yPosition: number;
  private complete = false;
  private fontAtlasImage: HTMLImageElement | null = null;
  private fontAtlasLoading: Promise<void> | null = null;

  /**
   * @param title - The text to display
   * @param duration - Duration of the fade-in effect in seconds (default: 1)
   * @param scale - Scale factor for font atlas rendering (default: 3)
   * @param yPosition - Y position on screen (default: 20, matching DeploymentPhaseHandler)
   */
  constructor(title: string, duration: number = 1.0, scale: number = 3, yPosition: number = 20) {
    this.title = title;
    this.duration = duration;
    this.scale = scale;
    this.yPosition = yPosition;
  }

  /**
   * Load the font atlas image (called once)
   */
  private async loadFontAtlas(): Promise<void> {
    if (this.fontAtlasImage || this.fontAtlasLoading) {
      return this.fontAtlasLoading || Promise.resolve();
    }

    this.fontAtlasLoading = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = '/fonts/15px-dungeonslant-atlas.png';
      img.onload = () => {
        this.fontAtlasImage = img;
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load font atlas'));
    });

    return this.fontAtlasLoading;
  }

  start(_state: CombatState, _encounter: CombatEncounter): void {
    this.elapsedTime = 0;
    this.complete = false;
    // Start loading font atlas if not already loaded
    if (!this.fontAtlasImage && !this.fontAtlasLoading) {
      this.loadFontAtlas().catch(console.error);
    }
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
    // Don't draw anything if alpha is 0
    if (alpha <= 0) {
      return false;
    }

    const ditherPixelSize = CombatConstants.ANIMATION.DITHERING.PIXEL_SIZE;
    const bayerMatrix = CombatConstants.ANIMATION.DITHERING.BAYER_MATRIX;

    const blockX = Math.floor(pixelX / ditherPixelSize);
    const blockY = Math.floor(pixelY / ditherPixelSize);

    const threshold = bayerMatrix[blockY % 4][blockX % 4] / 16;
    return alpha > threshold;
  }

  render(_state: CombatState, _encounter: CombatEncounter, context: CinematicRenderContext): void {
    const { ctx, canvasWidth } = context;

    // Skip rendering if font atlas not loaded yet
    if (!this.fontAtlasImage) {
      return;
    }

    // Calculate fade progress with easing
    const progress = Math.min(this.elapsedTime / this.duration, 1.0);
    const alpha = this.easeInOutCubic(progress);

    // Create a temporary canvas for rendering the text
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = 100; // Enough height for the text and background
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.imageSmoothingEnabled = false;

    // Draw semi-transparent black background at y=0 of temp canvas
    tempCtx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.RENDERING.BACKGROUND_ALPHA})`;
    tempCtx.fillRect(0, 0, canvasWidth, CombatConstants.UI.TITLE_HEIGHT);

    // Calculate centered position for text
    const fontId = "15px-dungeonslant";
    const textY = CombatConstants.UI.TITLE_HEIGHT / 2 - (15 * this.scale) / 2; // 15 is charHeight

    // Render text using font atlas to temp canvas
    FontAtlasRenderer.renderText(
      tempCtx,
      this.title,
      canvasWidth / 2,
      textY,
      fontId,
      this.fontAtlasImage,
      this.scale,
      'center'
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

    // Draw to main canvas at the specified Y position
    ctx.drawImage(tempCanvas, 0, this.yPosition);
  }

  isComplete(): boolean {
    return this.complete;
  }

  reset(): void {
    this.elapsedTime = 0;
    this.complete = false;
  }
}

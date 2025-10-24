import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

/**
 * Cinematic sequence that fades in the map grid with a diagonal wave effect
 * Tiles fade in from top-left to bottom-right over a specified duration
 */
export class MapFadeInSequence implements CinematicSequence {
  private elapsedTime = 0;
  private readonly duration: number;
  private complete = false;

  /**
   * @param duration - Total duration of the fade-in effect in seconds (default: 2)
   */
  constructor(duration: number = 2.0) {
    this.duration = duration;
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
   * Calculate alpha value for a tile based on its position and current time
   * Uses diagonal wave effect and ease-in/ease-out curve
   */
  private calculateTileAlpha(tileX: number, tileY: number, mapWidth: number, mapHeight: number): number {
    // Calculate the diagonal distance from top-left (0,0)
    // Normalize by the maximum diagonal distance (bottom-right corner)
    const maxDistance = mapWidth + mapHeight - 2; // -2 because we start at (0,0)
    const tileDistance = tileX + tileY;
    const normalizedDistance = maxDistance > 0 ? tileDistance / maxDistance : 0;

    // Calculate the time when this tile should start and finish fading
    // Tiles further from origin start later
    const fadeStartTime = normalizedDistance * this.duration * 0.5; // First half spreads the wave
    const fadeDuration = this.duration * 0.5; // Each tile fades over half the total duration

    // Calculate progress for this specific tile
    const timeSinceFadeStart = this.elapsedTime - fadeStartTime;
    if (timeSinceFadeStart <= 0) {
      return 0; // Haven't started fading yet
    }

    const fadeProgress = Math.min(timeSinceFadeStart / fadeDuration, 1.0);

    // Apply ease-in/ease-out curve (smoothstep)
    const eased = this.easeInOutCubic(fadeProgress);

    return eased;
  }

  /**
   * Ease-in/ease-out cubic function
   * Provides smooth acceleration and deceleration
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
   * Returns true if the pixel should be drawn based on alpha and dither pattern
   */
  private shouldDrawPixel(pixelX: number, pixelY: number, alpha: number): boolean {
    // Dither pixel size (4px blocks)
    const ditherPixelSize = 4;

    // Use a 4x4 Bayer matrix for ordered dithering
    const bayerMatrix = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];

    // Calculate which dither block this pixel is in
    const blockX = Math.floor(pixelX / ditherPixelSize);
    const blockY = Math.floor(pixelY / ditherPixelSize);

    const threshold = bayerMatrix[blockY % 4][blockX % 4] / 16;
    return alpha > threshold;
  }

  render(state: CombatState, _encounter: CombatEncounter, context: CinematicRenderContext): void {
    const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;
    const map = state.map;

    // Create an off-screen canvas for pixel manipulation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tileSize;
    tempCanvas.height = tileSize;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Render each tile with pixel-level dithering
    const allCells = map.getAllCells();
    for (const { position, cell } of allCells) {
      const tileX = position.x;
      const tileY = position.y;

      // Calculate position
      const drawX = tileX * tileSize + offsetX;
      const drawY = tileY * tileSize + offsetY;

      // Calculate alpha for this tile based on diagonal wave
      const alpha = this.calculateTileAlpha(tileX, tileY, map.width, map.height);

      if (alpha <= 0) continue;

      // Clear temp canvas
      tempCtx.clearRect(0, 0, tileSize, tileSize);

      // Draw the tile to temp canvas first
      if (cell.spriteId) {
        const spriteDef = SpriteRegistry.getById(cell.spriteId);
        if (spriteDef) {
          const spriteImage = spriteImages.get(spriteDef.spriteSheet);
          if (spriteImage) {
            const srcX = spriteDef.x * spriteSize;
            const srcY = spriteDef.y * spriteSize;
            const srcWidth = (spriteDef.width || 1) * spriteSize;
            const srcHeight = (spriteDef.height || 1) * spriteSize;

            tempCtx.drawImage(
              spriteImage,
              srcX, srcY, srcWidth, srcHeight,
              0, 0, tileSize, tileSize
            );
          }
        }
      } else {
        // Render a default tile based on terrain type
        tempCtx.fillStyle = cell.walkable ? '#444444' : '#222222';
        tempCtx.fillRect(0, 0, tileSize, tileSize);
      }

      // Get pixel data from temp canvas
      const imageData = tempCtx.getImageData(0, 0, tileSize, tileSize);
      const data = imageData.data;

      // Apply dithering at pixel level
      for (let py = 0; py < tileSize; py++) {
        for (let px = 0; px < tileSize; px++) {
          const index = (py * tileSize + px) * 4;

          // Calculate global pixel position for dithering pattern
          const globalPixelX = tileX * tileSize + px;
          const globalPixelY = tileY * tileSize + py;

          // Check if this pixel should be drawn based on dithering
          if (!this.shouldDrawPixel(globalPixelX, globalPixelY, alpha)) {
            // Make pixel transparent
            data[index + 3] = 0;
          }
        }
      }

      // Put modified pixels back
      tempCtx.putImageData(imageData, 0, 0);

      // Draw the dithered tile to main canvas
      ctx.drawImage(tempCanvas, drawX, drawY);
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

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

  render(state: CombatState, _encounter: CombatEncounter, context: CinematicRenderContext): void {
    const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;
    const map = state.map;

    // Render each tile with calculated alpha
    const allCells = map.getAllCells();
    for (const { position, cell } of allCells) {
      const x = position.x;
      const y = position.y;

      // Calculate position
      const drawX = x * tileSize + offsetX;
      const drawY = y * tileSize + offsetY;

      // Calculate alpha for this tile based on diagonal wave
      const alpha = this.calculateTileAlpha(x, y, map.width, map.height);

      // Get sprite ID from cell
      if (cell.spriteId) {
        const spriteDef = SpriteRegistry.getById(cell.spriteId);
        if (spriteDef) {
          const spriteImage = spriteImages.get(spriteDef.spriteSheet);
          if (spriteImage) {
            // Calculate source rectangle in sprite sheet
            const srcX = spriteDef.x * spriteSize;
            const srcY = spriteDef.y * spriteSize;
            const srcWidth = (spriteDef.width || 1) * spriteSize;
            const srcHeight = (spriteDef.height || 1) * spriteSize;

            // Apply alpha and draw tile
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.drawImage(
              spriteImage,
              srcX, srcY, srcWidth, srcHeight,
              drawX, drawY, tileSize, tileSize
            );
            ctx.restore();
          }
        }
      } else {
        // Render a default tile based on terrain type
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = cell.walkable ? '#444444' : '#222222';
        ctx.fillRect(drawX, drawY, tileSize, tileSize);
        ctx.restore();
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

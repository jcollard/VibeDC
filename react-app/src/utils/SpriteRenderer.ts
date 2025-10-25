import { SpriteRegistry } from './SpriteRegistry';
import type { SpriteDefinition } from './SpriteRegistry';

/**
 * Utility class for pixel-perfect sprite rendering.
 * Ensures all coordinates are rounded to prevent texture bleeding from adjacent sprites.
 */
export class SpriteRenderer {
  /**
   * Renders a sprite from a sprite sheet with pixel-perfect positioning.
   * All coordinates are automatically rounded to ensure no texture bleeding.
   *
   * @param ctx - Canvas rendering context
   * @param spriteImage - The sprite sheet image
   * @param spriteDef - Sprite definition containing grid coordinates
   * @param spriteSize - Size of each sprite in the sprite sheet (typically 12)
   * @param destX - Destination X coordinate on canvas
   * @param destY - Destination Y coordinate on canvas
   * @param destWidth - Destination width on canvas
   * @param destHeight - Destination height on canvas
   */
  static renderSprite(
    ctx: CanvasRenderingContext2D,
    spriteImage: HTMLImageElement,
    spriteDef: SpriteDefinition,
    spriteSize: number,
    destX: number,
    destY: number,
    destWidth: number,
    destHeight: number
  ): void {
    // Calculate and round source coordinates for pixel-perfect sampling
    const srcX = Math.round(spriteDef.x * spriteSize);
    const srcY = Math.round(spriteDef.y * spriteSize);
    const srcWidth = Math.round((spriteDef.width || 1) * spriteSize);
    const srcHeight = Math.round((spriteDef.height || 1) * spriteSize);

    // Round destination coordinates for pixel-perfect rendering
    ctx.drawImage(
      spriteImage,
      srcX, srcY, srcWidth, srcHeight,
      Math.round(destX), Math.round(destY), Math.round(destWidth), Math.round(destHeight)
    );
  }

  /**
   * Renders a sprite by ID with pixel-perfect positioning.
   * Looks up the sprite definition from the registry and renders it.
   *
   * @param ctx - Canvas rendering context
   * @param spriteId - ID of the sprite in the registry
   * @param spriteImages - Map of sprite sheet paths to loaded images
   * @param spriteSize - Size of each sprite in the sprite sheet (typically 12)
   * @param destX - Destination X coordinate on canvas
   * @param destY - Destination Y coordinate on canvas
   * @param destWidth - Destination width on canvas
   * @param destHeight - Destination height on canvas
   * @returns true if sprite was rendered, false if sprite or image not found
   */
  static renderSpriteById(
    ctx: CanvasRenderingContext2D,
    spriteId: string,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number,
    destX: number,
    destY: number,
    destWidth: number,
    destHeight: number
  ): boolean {
    const spriteDef = SpriteRegistry.getById(spriteId);
    if (!spriteDef) {
      console.warn(`Sprite '${spriteId}' not found in registry`);
      return false;
    }

    const spriteImage = spriteImages.get(spriteDef.spriteSheet);
    if (!spriteImage) {
      console.warn(`Sprite sheet '${spriteDef.spriteSheet}' not loaded`);
      return false;
    }

    this.renderSprite(ctx, spriteImage, spriteDef, spriteSize, destX, destY, destWidth, destHeight);
    return true;
  }

  /**
   * Helper method to get source rectangle coordinates for a sprite.
   * Useful when you need the coordinates but want to call drawImage yourself.
   *
   * @param spriteDef - Sprite definition containing grid coordinates
   * @param spriteSize - Size of each sprite in the sprite sheet (typically 12)
   * @returns Object with rounded srcX, srcY, srcWidth, srcHeight
   */
  static getSpriteSourceRect(
    spriteDef: SpriteDefinition,
    spriteSize: number
  ): { srcX: number; srcY: number; srcWidth: number; srcHeight: number } {
    return {
      srcX: Math.round(spriteDef.x * spriteSize),
      srcY: Math.round(spriteDef.y * spriteSize),
      srcWidth: Math.round((spriteDef.width || 1) * spriteSize),
      srcHeight: Math.round((spriteDef.height || 1) * spriteSize),
    };
  }

  /**
   * Helper method to round destination coordinates.
   * Useful for ensuring pixel-perfect positioning when calling drawImage directly.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param width - Width
   * @param height - Height
   * @returns Object with rounded x, y, width, height
   */
  static roundDestRect(
    x: number,
    y: number,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
  }
}

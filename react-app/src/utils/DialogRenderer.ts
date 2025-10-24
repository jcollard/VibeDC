import { SpriteRegistry } from './SpriteRegistry';

/**
 * 9-slice sprite IDs for rendering UI dialogs
 */
export interface NineSliceSprites {
  topLeft: string;
  topCenter: string;
  topRight: string;
  middleLeft: string;
  middleCenter: string;
  middleRight: string;
  bottomLeft: string;
  bottomCenter: string;
  bottomRight: string;
}

/**
 * Default 9-slice sprites for dialog boxes
 */
export const DEFAULT_DIALOG_SPRITES: NineSliceSprites = {
  topLeft: 'ui-52',
  topCenter: 'ui-53',
  topRight: 'ui-54',
  middleLeft: 'ui-69',
  middleCenter: 'ui-70',
  middleRight: 'ui-71',
  bottomLeft: 'ui-85',
  bottomCenter: 'ui-86',
  bottomRight: 'ui-87',
};

/**
 * Renders a 9-slice dialog box on a canvas context
 *
 * @param ctx - Canvas 2D context to render on
 * @param x - X position (top-left corner)
 * @param y - Y position (top-left corner)
 * @param width - Width in tiles (interior width, not including borders)
 * @param height - Height in tiles (interior height, not including borders)
 * @param tileSize - Size of each tile in pixels
 * @param spriteSize - Size of sprites in the sprite sheet (e.g., 12 for 12x12)
 * @param spriteImages - Map of sprite sheet URLs to loaded images
 * @param nineSlice - 9-slice sprite IDs (defaults to DEFAULT_DIALOG_SPRITES)
 */
export function renderNineSliceDialog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  tileSize: number,
  spriteSize: number,
  spriteImages: Map<string, HTMLImageElement>,
  nineSlice: NineSliceSprites = DEFAULT_DIALOG_SPRITES
): void {
  // Helper function to draw a single sprite
  const drawSprite = (spriteId: string, dx: number, dy: number) => {
    const spriteDef = SpriteRegistry.getById(spriteId);
    if (!spriteDef) {
      console.warn(`DialogRenderer: Sprite "${spriteId}" not found`);
      return;
    }

    const spriteImage = spriteImages.get(spriteDef.spriteSheet);
    if (!spriteImage) {
      console.warn(`DialogRenderer: Sprite sheet not loaded for "${spriteId}"`);
      return;
    }

    const srcX = spriteDef.x * spriteSize;
    const srcY = spriteDef.y * spriteSize;
    const srcWidth = (spriteDef.width || 1) * spriteSize;
    const srcHeight = (spriteDef.height || 1) * spriteSize;

    ctx.drawImage(
      spriteImage,
      srcX, srcY, srcWidth, srcHeight,
      dx, dy, tileSize, tileSize
    );
  };

  // Total dialog size including borders
  const totalWidth = width + 2;
  const totalHeight = height + 2;

  // Draw corners (never repeated)
  drawSprite(nineSlice.topLeft, x, y);
  drawSprite(nineSlice.topRight, x + (totalWidth - 1) * tileSize, y);
  drawSprite(nineSlice.bottomLeft, x, y + (totalHeight - 1) * tileSize);
  drawSprite(nineSlice.bottomRight, x + (totalWidth - 1) * tileSize, y + (totalHeight - 1) * tileSize);

  // Draw top and bottom edges (repeated horizontally)
  for (let i = 1; i < totalWidth - 1; i++) {
    drawSprite(nineSlice.topCenter, x + i * tileSize, y);
    drawSprite(nineSlice.bottomCenter, x + i * tileSize, y + (totalHeight - 1) * tileSize);
  }

  // Draw left and right edges (repeated vertically)
  for (let i = 1; i < totalHeight - 1; i++) {
    drawSprite(nineSlice.middleLeft, x, y + i * tileSize);
    drawSprite(nineSlice.middleRight, x + (totalWidth - 1) * tileSize, y + i * tileSize);
  }

  // Draw center (tiled to fill interior)
  for (let row = 1; row < totalHeight - 1; row++) {
    for (let col = 1; col < totalWidth - 1; col++) {
      drawSprite(nineSlice.middleCenter, x + col * tileSize, y + row * tileSize);
    }
  }
}

/**
 * Gets all sprite IDs needed for a 9-slice dialog
 */
export function getNineSliceSpriteIds(nineSlice: NineSliceSprites = DEFAULT_DIALOG_SPRITES): string[] {
  return [
    nineSlice.topLeft,
    nineSlice.topCenter,
    nineSlice.topRight,
    nineSlice.middleLeft,
    nineSlice.middleCenter,
    nineSlice.middleRight,
    nineSlice.bottomLeft,
    nineSlice.bottomCenter,
    nineSlice.bottomRight,
  ];
}

/**
 * Renders text with a hard black outline for better readability
 *
 * @param ctx - Canvas 2D context to render on
 * @param text - Text to render
 * @param x - X position
 * @param y - Y position
 * @param font - Font string (e.g., 'bold 24px "DungeonSlant", monospace')
 * @param color - Text color (defaults to white)
 * @param shadowOffset - Outline thickness in pixels (defaults to 2)
 * @param textAlign - Text alignment (defaults to current context setting)
 * @param textBaseline - Text baseline (defaults to current context setting)
 */
export function renderTextWithShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string = '#ffffff',
  shadowOffset: number = 2,
  textAlign?: CanvasTextAlign,
  textBaseline?: CanvasTextBaseline
): void {
  // Save current context state
  ctx.save();

  // Set font
  ctx.font = font;

  // Set alignment if provided
  if (textAlign) ctx.textAlign = textAlign;
  if (textBaseline) ctx.textBaseline = textBaseline;

  // Draw black outline on all 8 surrounding positions
  ctx.fillStyle = '#000000';

  // Top row
  ctx.fillText(text, x - shadowOffset, y - shadowOffset); // Top-left
  ctx.fillText(text, x, y - shadowOffset);                // Top
  ctx.fillText(text, x + shadowOffset, y - shadowOffset); // Top-right

  // Middle row
  ctx.fillText(text, x - shadowOffset, y);                // Left
  ctx.fillText(text, x + shadowOffset, y);                // Right

  // Bottom row
  ctx.fillText(text, x - shadowOffset, y + shadowOffset); // Bottom-left
  ctx.fillText(text, x, y + shadowOffset);                // Bottom
  ctx.fillText(text, x + shadowOffset, y + shadowOffset); // Bottom-right

  // Draw main text on top
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  // Restore context state
  ctx.restore();
}

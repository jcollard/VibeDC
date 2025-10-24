import { SpriteRegistry } from './SpriteRegistry';

/**
 * Represents the measured bounds of dialog content
 */
export interface ContentBounds {
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Abstract base class for dialog content that can be measured and rendered
 */
export abstract class DialogContent {
  /**
   * Render the content to a canvas context at the specified position
   * @param ctx - Canvas context to render to
   * @param x - X position (top-left of content area, inside dialog border)
   * @param y - Y position (top-left of content area, inside dialog border)
   */
  abstract render(ctx: CanvasRenderingContext2D, x: number, y: number): void;

  /**
   * Measure the content bounds without rendering to visible canvas
   * @param _tileSize - Size of each tile in pixels (unused in base implementation)
   * @returns The measured bounds of the content
   */
  measure(_tileSize: number): ContentBounds {
    // Create an off-screen canvas for measuring
    const canvas = document.createElement('canvas');
    canvas.width = 2000; // Large enough for measurement
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    // Render content at origin to measure
    this.render(ctx, 0, 0);

    // Get the actual bounds - for now, return the requested size
    // Subclasses can override this to provide more accurate measurements
    return this.getBounds();
  }

  /**
   * Get the bounds of this content
   * Subclasses should override this to provide accurate dimensions
   */
  protected abstract getBounds(): ContentBounds;

  /**
   * Calculate the required dialog size in tiles based on content bounds
   * @param bounds - The measured content bounds
   * @param tileSize - Size of each tile in pixels
   * @param paddingTiles - Additional padding in tiles (default: 1)
   * @returns Object with width and height in tiles (interior, not including borders)
   */
  static calculateDialogSize(
    bounds: ContentBounds,
    tileSize: number,
    paddingTiles: number = 1
  ): { width: number; height: number } {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const widthInTiles = Math.ceil(contentWidth / tileSize) + (paddingTiles * 2);
    const heightInTiles = Math.ceil(contentHeight / tileSize) + (paddingTiles * 2);

    return { width: widthInTiles, height: heightInTiles };
  }
}

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

/**
 * Renders a dialog with content, auto-sizing based on content bounds
 *
 * @param ctx - Canvas 2D context to render on
 * @param content - DialogContent instance to render
 * @param x - X position (top-left corner of dialog)
 * @param y - Y position (top-left corner of dialog)
 * @param tileSize - Size of each tile in pixels
 * @param spriteSize - Size of sprites in the sprite sheet
 * @param spriteImages - Map of sprite sheet URLs to loaded images
 * @param nineSlice - 9-slice sprite IDs (defaults to DEFAULT_DIALOG_SPRITES)
 * @param paddingPixels - Additional padding in pixels (default: 48)
 * @returns The final dialog dimensions { width, height } in tiles
 */
export function renderDialogWithContent(
  ctx: CanvasRenderingContext2D,
  content: DialogContent,
  x: number,
  y: number,
  tileSize: number,
  spriteSize: number,
  spriteImages: Map<string, HTMLImageElement>,
  nineSlice: NineSliceSprites = DEFAULT_DIALOG_SPRITES,
  paddingPixels: number = 48
): { width: number; height: number } {
  // Measure content bounds
  const bounds = content.measure(tileSize);

  // Calculate dialog size in pixels including padding
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;

  const totalWidthPixels = contentWidth + (paddingPixels * 2);
  const totalHeightPixels = contentHeight + (paddingPixels * 2);

  // Convert to tiles (round up to ensure content fits)
  // Note: This is the INTERIOR size (the width/height passed to renderNineSliceDialog)
  // The actual dialog will be 2 tiles larger (1 tile border on each side)
  // Subtract 1 tile from width and height to account for border overlap with content
  const interiorWidth = Math.ceil(totalWidthPixels / tileSize) - 1;
  const interiorHeight = Math.ceil(totalHeightPixels / tileSize) - 1;

  // Render the dialog background
  renderNineSliceDialog(ctx, x, y, interiorWidth, interiorHeight, tileSize, spriteSize, spriteImages, nineSlice);

  // Calculate content position (inside dialog, accounting for border and padding)
  // Since we reduced interior width and height by 1, shift content by 0.5 tiles from borders
  const contentX = x + (tileSize * 0.5) + paddingPixels; // Shift left by 0.5 tiles from left border
  const contentY = y + (tileSize * 0.5) + paddingPixels; // Content starts 0.5 tiles down from top

  // Render the content
  content.render(ctx, contentX, contentY);

  return { width: interiorWidth, height: interiorHeight };
}

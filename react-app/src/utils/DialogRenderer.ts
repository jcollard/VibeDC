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
   * Calculate the required dialog size in pixels based on content bounds
   * @param bounds - The measured content bounds
   * @param paddingPixels - Additional padding beyond the border inset (default: 6)
   * @param scale - Scale factor for border sprites and insets (default: 4)
   * @returns Object with width and height in pixels (total including borders and padding)
   */
  static calculateDialogSize(
    bounds: ContentBounds,
    paddingPixels: number = 6,
    scale: number = 4
  ): { width: number; height: number } {
    const BORDER_INSET = 6 * scale;
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const width = contentWidth + (paddingPixels * 2) + (BORDER_INSET * 2);
    const height = contentHeight + (paddingPixels * 2) + (BORDER_INSET * 2);

    return { width, height };
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
  topLeft: 'ui-56',
  topCenter: 'ui-57',
  topRight: 'ui-58',
  middleLeft: 'ui-73',
  middleCenter: 'ui-74',
  middleRight: 'ui-75',
  bottomLeft: 'ui-89',
  bottomCenter: 'ui-90',
  bottomRight: 'ui-91',
};

/**
 * Renders a 9-slice dialog box on a canvas context with pixel-precise sizing
 *
 * @param ctx - Canvas 2D context to render on
 * @param x - X position (top-left corner) in pixels
 * @param y - Y position (top-left corner) in pixels
 * @param width - Width in pixels (total width including borders)
 * @param height - Height in pixels (total height including borders)
 * @param spriteSize - Size of sprites in the sprite sheet (e.g., 12 for 12x12)
 * @param spriteImages - Map of sprite sheet URLs to loaded images
 * @param nineSlice - 9-slice sprite IDs (defaults to DEFAULT_DIALOG_SPRITES)
 * @param scale - Scale factor for border sprites and insets (default: 4)
 */
export function renderNineSliceDialog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  spriteSize: number,
  spriteImages: Map<string, HTMLImageElement>,
  nineSlice: NineSliceSprites = DEFAULT_DIALOG_SPRITES,
  scale: number = 4
): void {
  // Calculate scaled sprite size
  const scaledSpriteSize = spriteSize * scale;

  // Helper function to draw a corner sprite
  const drawCornerSprite = (spriteId: string, dx: number, dy: number) => {
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
    const srcWidth = spriteSize;
    const srcHeight = spriteSize;

    ctx.drawImage(
      spriteImage,
      srcX, srcY, srcWidth, srcHeight,
      dx, dy, scaledSpriteSize, scaledSpriteSize
    );
  };

  // Helper function to draw an edge sprite (stretched)
  const drawEdgeSprite = (spriteId: string, dx: number, dy: number, dw: number, dh: number) => {
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
    const srcWidth = spriteSize;
    const srcHeight = spriteSize;

    ctx.drawImage(
      spriteImage,
      srcX, srcY, srcWidth, srcHeight,
      dx, dy, dw, dh
    );
  };

  // Round all positions and dimensions to avoid sub-pixel rendering artifacts
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  const roundedScaledSpriteSize = Math.round(scaledSpriteSize);

  // Draw corners (scaled)
  drawCornerSprite(nineSlice.topLeft, roundedX, roundedY);
  drawCornerSprite(nineSlice.topRight, roundedX + roundedWidth - roundedScaledSpriteSize, roundedY);
  drawCornerSprite(nineSlice.bottomLeft, roundedX, roundedY + roundedHeight - roundedScaledSpriteSize);
  drawCornerSprite(nineSlice.bottomRight, roundedX + roundedWidth - roundedScaledSpriteSize, roundedY + roundedHeight - roundedScaledSpriteSize);

  // Draw top and bottom edges (stretched horizontally)
  const horizontalEdgeWidth = roundedWidth - (roundedScaledSpriteSize * 2);
  drawEdgeSprite(nineSlice.topCenter, roundedX + roundedScaledSpriteSize, roundedY, horizontalEdgeWidth, roundedScaledSpriteSize);
  drawEdgeSprite(nineSlice.bottomCenter, roundedX + roundedScaledSpriteSize, roundedY + roundedHeight - roundedScaledSpriteSize, horizontalEdgeWidth, roundedScaledSpriteSize);

  // Draw left and right edges (stretched vertically)
  const verticalEdgeHeight = roundedHeight - (roundedScaledSpriteSize * 2);
  drawEdgeSprite(nineSlice.middleLeft, roundedX, roundedY + roundedScaledSpriteSize, roundedScaledSpriteSize, verticalEdgeHeight);
  drawEdgeSprite(nineSlice.middleRight, roundedX + roundedWidth - roundedScaledSpriteSize, roundedY + roundedScaledSpriteSize, roundedScaledSpriteSize, verticalEdgeHeight);

  // Draw center (scaled to fill interior) - solid color sprite
  const centerWidth = roundedWidth - (roundedScaledSpriteSize * 2);
  const centerHeight = roundedHeight - (roundedScaledSpriteSize * 2);
  drawEdgeSprite(nineSlice.middleCenter, roundedX + roundedScaledSpriteSize, roundedY + roundedScaledSpriteSize, centerWidth, centerHeight);
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
 * @param x - X position (top-left corner of dialog) in pixels
 * @param y - Y position (top-left corner of dialog) in pixels
 * @param spriteSize - Size of sprites in the sprite sheet (12px for 12x12)
 * @param spriteImages - Map of sprite sheet URLs to loaded images
 * @param nineSlice - 9-slice sprite IDs (defaults to DEFAULT_DIALOG_SPRITES)
 * @param paddingPixels - Additional padding beyond the border inset (default: 6)
 * @param scale - Scale factor for border sprites and insets (default: 4)
 * @returns The final dialog dimensions { width, height } in pixels
 */
export function renderDialogWithContent(
  ctx: CanvasRenderingContext2D,
  content: DialogContent,
  x: number,
  y: number,
  spriteSize: number,
  spriteImages: Map<string, HTMLImageElement>,
  nineSlice: NineSliceSprites = DEFAULT_DIALOG_SPRITES,
  paddingPixels: number = 6,
  scale: number = 4
): { width: number; height: number } {
  // Border inset - 6px from each edge of the 12px sprite is usable for content (scaled)
  const BORDER_INSET = 6 * scale;

  // Measure content bounds (tileSize parameter is no longer used, pass 0)
  const bounds = content.measure(0);

  // Calculate content dimensions
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;

  // Calculate total dialog size in pixels
  // Total = content + padding on both sides + border insets on both sides
  const totalWidth = contentWidth + (paddingPixels * 2) + (BORDER_INSET * 2);
  const totalHeight = contentHeight + (paddingPixels * 2) + (BORDER_INSET * 2);

  // Render the dialog background
  renderNineSliceDialog(ctx, x, y, totalWidth, totalHeight, spriteSize, spriteImages, nineSlice, scale);

  // Calculate content position (inside dialog, accounting for border inset and padding)
  const contentX = x + BORDER_INSET + paddingPixels;
  const contentY = y + BORDER_INSET + paddingPixels;

  // Render the content
  content.render(ctx, contentX, contentY);

  return { width: totalWidth, height: totalHeight };
}

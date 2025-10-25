import { FontRegistry } from './FontRegistry';
import type { FontDefinition } from './FontRegistry';

/**
 * Utility for rendering text using font atlases
 * Provides pixel-perfect text rendering with variable-width font support
 */
export class FontAtlasRenderer {
  /**
   * Render text using a font atlas
   * @param ctx - Canvas rendering context
   * @param text - Text to render
   * @param x - X position (use alignment for positioning)
   * @param y - Y position (top of text)
   * @param fontId - Font ID from FontRegistry
   * @param atlasImage - Loaded font atlas image
   * @param scale - Scale factor for rendering (default 1)
   * @param alignment - Text alignment: 'left', 'center', 'right' (default 'left')
   * @returns Width of rendered text in pixels (at scale 1)
   */
  static renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fontId: string,
    atlasImage: HTMLImageElement,
    scale: number = 1,
    alignment: 'left' | 'center' | 'right' = 'left'
  ): number {
    const font = FontRegistry.getById(fontId);
    if (!font) {
      console.warn(`Font '${fontId}' not found in registry`);
      return 0;
    }

    // Calculate total text width for alignment
    const textWidth = this.measureText(text, font);

    // Adjust starting X based on alignment
    let currentX = x;
    if (alignment === 'center') {
      currentX = x - (textWidth * scale) / 2;
    } else if (alignment === 'right') {
      currentX = x - textWidth * scale;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Render each character
    for (const char of text) {
      const coords = FontRegistry.getCharCoordinates(font, char);
      if (coords) {
        ctx.drawImage(
          atlasImage,
          coords.x,
          coords.y,
          coords.width,
          font.charHeight,
          Math.round(currentX),
          Math.round(y),
          Math.round(coords.width * scale),
          Math.round(font.charHeight * scale)
        );
        currentX += coords.width * scale + (font.charSpacing || 0) * scale;
      }
    }

    ctx.restore();
    return textWidth;
  }

  /**
   * Measure the width of text in pixels (at scale 1)
   * @param text - Text to measure
   * @param font - Font definition
   * @returns Width in pixels
   */
  static measureText(text: string, font: FontDefinition): number {
    let width = 0;
    for (const char of text) {
      const charWidth = FontRegistry.getCharWidth(font, char);
      width += charWidth + (font.charSpacing || 0);
    }
    // Remove trailing spacing
    if (text.length > 0 && font.charSpacing) {
      width -= font.charSpacing;
    }
    return width;
  }

  /**
   * Measure text width by font ID
   * @param text - Text to measure
   * @param fontId - Font ID from FontRegistry
   * @returns Width in pixels (at scale 1), or 0 if font not found
   */
  static measureTextByFontId(text: string, fontId: string): number {
    const font = FontRegistry.getById(fontId);
    if (!font) {
      console.warn(`Font '${fontId}' not found in registry`);
      return 0;
    }
    return this.measureText(text, font);
  }

  /**
   * Render centered title text with background bar (similar to TextRenderingUtils)
   * @param ctx - Canvas rendering context
   * @param text - Text to render
   * @param canvasWidth - Width of canvas for centering
   * @param y - Y position of background bar
   * @param backgroundHeight - Height of background bar
   * @param backgroundAlpha - Alpha transparency of background
   * @param fontId - Font ID from FontRegistry
   * @param atlasImage - Loaded font atlas image
   * @param scale - Scale factor for rendering
   * @param shadowOffsetX - Shadow offset X in pixels (unused, kept for compatibility)
   * @param shadowOffsetY - Shadow offset Y in pixels (unused, kept for compatibility)
   */
  static renderTitleWithBackground(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    y: number,
    backgroundHeight: number,
    backgroundAlpha: number,
    fontId: string,
    atlasImage: HTMLImageElement,
    scale: number = 1,
    _shadowOffsetX: number = 2,
    _shadowOffsetY: number = 2
  ): void {
    const font = FontRegistry.getById(fontId);
    if (!font) {
      console.warn(`Font '${fontId}' not found in registry`);
      return;
    }

    // Draw semi-transparent background
    ctx.fillStyle = `rgba(0, 0, 0, ${backgroundAlpha})`;
    ctx.fillRect(0, y, canvasWidth, backgroundHeight);

    // Calculate centered position
    const textY = y + backgroundHeight / 2 - (font.charHeight * scale) / 2;

    // Render centered title
    this.renderText(
      ctx,
      text,
      canvasWidth / 2,
      textY,
      fontId,
      atlasImage,
      scale,
      'center'
    );
  }
}

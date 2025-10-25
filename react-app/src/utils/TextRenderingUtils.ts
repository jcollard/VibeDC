import { renderTextWithShadow } from './DialogRenderer';

/**
 * Utility class for common text rendering patterns in combat
 * Consolidates duplicated text rendering logic across phase handlers
 */
export class TextRenderingUtils {
  /**
   * Render centered title text with shadow
   * Commonly used for phase headers and titles
   */
  static renderCenteredTitle(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    y: number,
    font: string,
    fontSize: number,
    textColor: string = '#ffffff',
    shadowOffset: number = 2
  ): void {
    const fullFont = `bold ${fontSize}px "${font}", monospace`;
    renderTextWithShadow(
      ctx,
      text,
      canvasWidth / 2,
      y,
      fullFont,
      textColor,
      shadowOffset,
      'center',
      'middle'
    );
  }

  /**
   * Render centered message text with shadow
   * Used for instructions and informational messages
   */
  static renderCenteredMessage(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    y: number,
    font: string,
    fontSize: number,
    textColor: string = '#ffffff',
    shadowOffset: number = 2
  ): void {
    ctx.save();
    ctx.font = `${fontSize}px "${font}", monospace`;
    ctx.textBaseline = 'top';

    const textWidth = ctx.measureText(text).width;
    const currentX = (canvasWidth - textWidth) / 2;

    // Render shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(text, currentX - shadowOffset, y - shadowOffset);
    ctx.fillText(text, currentX + shadowOffset, y - shadowOffset);
    ctx.fillText(text, currentX - shadowOffset, y + shadowOffset);
    ctx.fillText(text, currentX + shadowOffset, y + shadowOffset);

    // Render main text
    ctx.fillStyle = textColor;
    ctx.fillText(text, currentX, y);

    ctx.restore();
  }

  /**
   * Render a title with semi-transparent background bar
   * Commonly used for phase headers
   */
  static renderTitleWithBackground(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    y: number,
    backgroundHeight: number,
    backgroundAlpha: number,
    font: string,
    fontSize: number,
    textColor: string = '#ffffff',
    shadowOffset: number = 2
  ): void {
    // Draw semi-transparent background
    ctx.fillStyle = `rgba(0, 0, 0, ${backgroundAlpha})`;
    ctx.fillRect(0, y, canvasWidth, backgroundHeight);

    // Draw centered title at middle of background
    this.renderCenteredTitle(
      ctx,
      text,
      canvasWidth,
      y + backgroundHeight / 2,
      font,
      fontSize,
      textColor,
      shadowOffset
    );
  }
}

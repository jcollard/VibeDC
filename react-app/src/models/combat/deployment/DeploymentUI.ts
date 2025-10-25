import { TextRenderingUtils } from '../../../utils/TextRenderingUtils';
import { CombatConstants } from '../CombatConstants';
import { SpriteRegistry } from '../../../utils/SpriteRegistry';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

/**
 * Renders UI elements for the deployment phase
 * Handles phase header, messages, and instructions
 */
export class DeploymentUI {
  private fontAtlasImage: HTMLImageElement | null = null;
  private fontAtlasLoading: Promise<void> | null = null;

  constructor() {
    // Start loading font atlas immediately
    this.loadFontAtlas().catch(console.error);
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

  /**
   * Render the "Deploy Units" phase header with background
   */
  renderPhaseHeader(ctx: CanvasRenderingContext2D, canvasWidth: number, _headerFont: string): void {
    // Use font atlas rendering if available
    if (this.fontAtlasImage) {
      const text = CombatConstants.TEXT.DEPLOY_TITLE;
      const fontId = "15px-dungeonslant";
      const scale = 3; // Scale factor for the font
      const y = CombatConstants.UI.TITLE_Y_POSITION;

      // Draw semi-transparent background
      const backgroundHeight = CombatConstants.UI.TITLE_HEIGHT;
      ctx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.RENDERING.BACKGROUND_ALPHA})`;
      ctx.fillRect(0, y, canvasWidth, backgroundHeight);

      // Calculate centered position for text
      const textY = y + backgroundHeight / 2 - (15 * scale) / 2; // 15 is charHeight

      // Render centered title
      FontAtlasRenderer.renderText(
        ctx,
        text,
        canvasWidth / 2,
        textY,
        fontId,
        this.fontAtlasImage,
        scale,
        'center'
      );
    }
  }

  /**
   * Render the waylaid message below the Deploy Units title
   */
  renderWaylaidMessage(ctx: CanvasRenderingContext2D, canvasWidth: number, font: string): void {
    TextRenderingUtils.renderCenteredMessage(
      ctx,
      CombatConstants.TEXT.WAYLAID_MESSAGE,
      canvasWidth,
      CombatConstants.UI.WAYLAID_MESSAGE_Y,
      font,
      CombatConstants.FONTS.MESSAGE_SIZE,
      CombatConstants.RENDERING.TEXT_COLOR,
      CombatConstants.RENDERING.TEXT_SHADOW_OFFSET
    );
  }

  /**
   * Render the deployment instruction message with embedded sprite
   */
  renderInstructionMessage(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    spriteSize: number,
    spriteImages: Map<string, HTMLImageElement>,
    font: string,
    yPosition: number
  ): void {
    const fontSize = CombatConstants.FONTS.MESSAGE_SIZE;
    const message = 'Click ';
    const message2 = ' to deploy a unit.';

    // Set up text rendering
    ctx.save();
    ctx.font = `${fontSize}px "${font}", monospace`;
    ctx.textBaseline = 'top';

    // Measure text parts
    const part1Width = ctx.measureText(message).width;
    const part2Width = ctx.measureText(message2).width;
    const spriteDisplaySize = fontSize;
    const totalWidth = part1Width + spriteDisplaySize + 4 + part2Width;
    let currentX = (canvasWidth - totalWidth) / 2;

    // Render "Click "
    ctx.fillStyle = '#000000';
    ctx.fillText(message, currentX - 1, yPosition - 1);
    ctx.fillText(message, currentX + 1, yPosition - 1);
    ctx.fillText(message, currentX - 1, yPosition + 1);
    ctx.fillText(message, currentX + 1, yPosition + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, currentX, yPosition);
    currentX += part1Width;

    // Render deployment zone sprite
    const deploymentSprite = 'gradients-7';
    const spriteDef = SpriteRegistry.getById(deploymentSprite);
    if (spriteDef) {
      const spriteImage = spriteImages.get(spriteDef.spriteSheet);
      if (spriteImage) {
        const srcX = spriteDef.x * spriteSize;
        const srcY = spriteDef.y * spriteSize;
        const srcWidth = (spriteDef.width || 1) * spriteSize;
        const srcHeight = (spriteDef.height || 1) * spriteSize;

        ctx.drawImage(
          spriteImage,
          srcX,
          srcY,
          srcWidth,
          srcHeight,
          currentX,
          yPosition,
          spriteDisplaySize,
          spriteDisplaySize
        );
      }
    }
    currentX += spriteDisplaySize + 4;

    // Render " to deploy a unit."
    ctx.fillStyle = '#000000';
    ctx.fillText(message2, currentX - 1, yPosition - 1);
    ctx.fillText(message2, currentX + 1, yPosition - 1);
    ctx.fillText(message2, currentX - 1, yPosition + 1);
    ctx.fillText(message2, currentX + 1, yPosition + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message2, currentX, yPosition);

    ctx.restore();
  }
}

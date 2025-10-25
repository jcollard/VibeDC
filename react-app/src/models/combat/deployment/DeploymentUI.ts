import { TextRenderingUtils } from '../../../utils/TextRenderingUtils';
import { CombatConstants } from '../CombatConstants';
import { SpriteRegistry } from '../../../utils/SpriteRegistry';

/**
 * Renders UI elements for the deployment phase
 * Handles phase header, messages, and instructions
 */
export class DeploymentUI {
  /**
   * Render the "Deploy Units" phase header with background
   */
  renderPhaseHeader(ctx: CanvasRenderingContext2D, canvasWidth: number, headerFont: string): void {
    TextRenderingUtils.renderTitleWithBackground(
      ctx,
      CombatConstants.TEXT.DEPLOY_TITLE,
      canvasWidth,
      CombatConstants.UI.TITLE_Y_POSITION,
      CombatConstants.UI.TITLE_HEIGHT,
      CombatConstants.RENDERING.BACKGROUND_ALPHA,
      headerFont,
      CombatConstants.FONTS.TITLE_SIZE,
      CombatConstants.RENDERING.TEXT_COLOR,
      CombatConstants.RENDERING.TEXT_SHADOW_OFFSET
    );
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

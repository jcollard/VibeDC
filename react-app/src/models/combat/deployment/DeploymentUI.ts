import { CombatConstants } from '../CombatConstants';
import { SpriteRegistry } from '../../../utils/SpriteRegistry';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';

/**
 * Renders UI elements for the deployment phase
 * Handles phase header, messages, and instructions
 * Fonts are now passed in from external FontAtlasLoader
 */
export class DeploymentUI {
  /**
   * Render the "Deploy Units" phase header with background
   */
  renderPhaseHeader(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    fontId: string,
    fontAtlas: HTMLImageElement | null
  ): void {
    if (!fontAtlas) {
      console.warn(`Font atlas not loaded for '${fontId}'`);
      return;
    }

    const fontDef = FontRegistry.getById(fontId);
    if (!fontDef) return;

    const text = CombatConstants.TEXT.DEPLOY_TITLE;
    const scale = 1;
    const y = CombatConstants.UI.TITLE_Y_POSITION;

    // Draw semi-transparent background
    const backgroundHeight = CombatConstants.UI.TITLE_HEIGHT;
    ctx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.RENDERING.BACKGROUND_ALPHA})`;
    ctx.fillRect(0, y, canvasWidth, backgroundHeight);

    // Calculate centered position for text
    const textY = y + backgroundHeight / 2 - (fontDef.charHeight * scale) / 2;

    // Render centered title
    FontAtlasRenderer.renderText(
      ctx,
      text,
      canvasWidth / 2,
      textY,
      fontId,
      fontAtlas,
      scale,
      'center'
    );
  }

  /**
   * Render the waylaid message below the Deploy Units title
   */
  renderWaylaidMessage(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    fontId: string,
    fontAtlas: HTMLImageElement | null
  ): void {
    if (!fontAtlas) {
      console.warn(`Font atlas not loaded for '${fontId}'`);
      return;
    }

    const text = CombatConstants.TEXT.WAYLAID_MESSAGE;
    const scale = 1;
    const y = CombatConstants.UI.WAYLAID_MESSAGE_Y;

    // Render centered message
    FontAtlasRenderer.renderText(
      ctx,
      text,
      canvasWidth / 2,
      y,
      fontId,
      fontAtlas,
      scale,
      'center'
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
    yPosition: number,
    fontId: string,
    fontAtlas: HTMLImageElement | null
  ): void {
    if (!fontAtlas) {
      console.warn(`Font atlas not loaded for '${fontId}'`);
      return;
    }

    const fontDef = FontRegistry.getById(fontId);
    if (!fontDef) return;

    const scale = 1; // Scale factor for the font (reduced from 2 for new resolution)
    const message = 'Click ';
    const message2 = ' to deploy a unit.';

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Measure text parts using font atlas
    const part1Width = FontAtlasRenderer.measureTextByFontId(message, fontId) * scale;
    const part2Width = FontAtlasRenderer.measureTextByFontId(message2, fontId) * scale;
    const spriteDisplaySize = fontDef.charHeight * scale;
    const totalWidth = part1Width + spriteDisplaySize + 4 * scale + part2Width;
    let currentX = (canvasWidth - totalWidth) / 2;

    // Render "Click " using font atlas
    for (const char of message) {
      const coords = FontRegistry.getCharCoordinates(fontDef, char);
      if (coords) {
        ctx.drawImage(
          fontAtlas,
          coords.x,
          coords.y,
          coords.width,
          fontDef.charHeight,
          Math.round(currentX),
          Math.round(yPosition),
          Math.round(coords.width * scale),
          Math.round(fontDef.charHeight * scale)
        );
        currentX += coords.width * scale + (fontDef.charSpacing || 0) * scale;
      }
    }

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
    currentX += spriteDisplaySize + 4 * scale;

    // Render " to deploy a unit." using font atlas
    for (const char of message2) {
      const coords = FontRegistry.getCharCoordinates(fontDef, char);
      if (coords) {
        ctx.drawImage(
          fontAtlas,
          coords.x,
          coords.y,
          coords.width,
          fontDef.charHeight,
          Math.round(currentX),
          Math.round(yPosition),
          Math.round(coords.width * scale),
          Math.round(fontDef.charHeight * scale)
        );
        currentX += coords.width * scale + (fontDef.charSpacing || 0) * scale;
      }
    }

    ctx.restore();
  }
}

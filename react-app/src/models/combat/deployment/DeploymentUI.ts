import { CombatConstants } from '../CombatConstants';
import { SpriteRegistry } from '../../../utils/SpriteRegistry';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';

/**
 * Renders UI elements for the deployment phase
 * Handles phase header, messages, and instructions
 */
export class DeploymentUI {
  private fontAtlasCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  constructor() {
    // Pre-load default fonts immediately and synchronously
    this.preloadDefaultFonts();
  }

  /**
   * Pre-load default fonts synchronously
   */
  private preloadDefaultFonts(): void {
    const defaultFonts = ['15px-dungeonslant', '8px-habbo8'];
    for (const fontId of defaultFonts) {
      const fontDef = FontRegistry.getById(fontId);
      if (fontDef) {
        const img = new Image();
        img.src = fontDef.atlasPath;
        // Add to cache when loaded
        img.onload = () => {
          this.fontAtlasCache.set(fontId, img);
          console.log(`Preloaded font atlas: ${fontId}`);
        };
        img.onerror = () => {
          console.error(`Failed to preload font atlas '${fontId}' from ${fontDef.atlasPath}`);
        };
      } else {
        console.error(`Font definition '${fontId}' not found in FontRegistry during preload`);
      }
    }
  }

  /**
   * Load a font atlas image by font ID
   */
  private async loadFontAtlas(fontId: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.fontAtlasCache.has(fontId)) {
      return this.fontAtlasCache.get(fontId)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(fontId)) {
      return this.loadingPromises.get(fontId)!;
    }

    // Get font definition from registry
    const fontDef = FontRegistry.getById(fontId);
    if (!fontDef) {
      throw new Error(`Font '${fontId}' not found in FontRegistry`);
    }

    // Create loading promise
    const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = fontDef.atlasPath;
      img.onload = () => {
        this.fontAtlasCache.set(fontId, img);
        this.loadingPromises.delete(fontId);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(fontId);
        reject(new Error(`Failed to load font atlas for '${fontId}' at ${fontDef.atlasPath}`));
      };
    });

    this.loadingPromises.set(fontId, loadingPromise);
    return loadingPromise;
  }

  /**
   * Render the "Deploy Units" phase header with background
   */
  renderPhaseHeader(ctx: CanvasRenderingContext2D, canvasWidth: number, _headerFont: string, fontId: string = '15px-dungeonslant'): void {
    // Get font atlas (load if needed)
    const atlas = this.fontAtlasCache.get(fontId);
    if (!atlas) {
      // Start loading if not already loaded
      this.loadFontAtlas(fontId).catch(console.error);
      return;
    }

    // Get font definition for char height
    const fontDef = FontRegistry.getById(fontId);
    if (!fontDef) return;

    const text = CombatConstants.TEXT.DEPLOY_TITLE;
    const scale = 3; // Scale factor for the font
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
      atlas,
      scale,
      'center'
    );
  }

  /**
   * Render the waylaid message below the Deploy Units title
   */
  renderWaylaidMessage(ctx: CanvasRenderingContext2D, canvasWidth: number, _font: string, fontId: string = '8px-habbo8'): void {
    // Get font atlas (load if needed)
    const atlas = this.fontAtlasCache.get(fontId);
    if (!atlas) {
      // Start loading if not already loaded
      this.loadFontAtlas(fontId).catch(console.error);
      return;
    }

    const text = CombatConstants.TEXT.WAYLAID_MESSAGE;
    const scale = 2; // Scale factor for the font (8px * 2 = 16px, close to MESSAGE_SIZE)
    const y = CombatConstants.UI.WAYLAID_MESSAGE_Y;

    // Render centered message
    FontAtlasRenderer.renderText(
      ctx,
      text,
      canvasWidth / 2,
      y,
      fontId,
      atlas,
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

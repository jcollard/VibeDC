import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { FontRegistry } from '../../utils/FontRegistry';

/**
 * Represents a part of a message - either text or a sprite
 */
interface MessagePart {
  type: 'text' | 'sprite';
  content: string; // Text content or sprite ID
}

/**
 * Cinematic sequence that fades in a message letter-by-letter
 * Supports embedding sprites using [sprite:id] syntax
 * Example: "Click [sprite:deployment-zone] to deploy"
 */
export class MessageFadeInSequence implements CinematicSequence {
  private elapsedTime = 0;
  private readonly duration: number;
  private readonly message: string;
  private readonly scale: number;
  private readonly yPosition: number;
  private readonly fontId: string;
  private complete = false;
  private messageParts: MessagePart[] = [];
  private fontAtlasImage: HTMLImageElement | null = null;
  private fontAtlasLoading: Promise<HTMLImageElement> | null = null;

  /**
   * @param message - The message to display (use [sprite:id] to embed sprites)
   * @param duration - Duration of the fade-in effect in seconds (default: 2)
   * @param fontId - Font ID from FontRegistry (default: '7px-04b03')
   * @param scale - Scale factor for font rendering (default: 1, reduced from 2)
   * @param yPosition - Y position on screen (default: 35, reduced from 140)
   */
  constructor(
    message: string,
    duration: number = 2.0,
    fontId: string = '7px-04b03',
    scale: number = 1,
    yPosition: number = 35
  ) {
    this.message = message;
    this.duration = duration;
    this.fontId = fontId;
    this.scale = scale;
    this.yPosition = yPosition;
    this.parseMessage();
  }

  /**
   * Load the font atlas image
   */
  private async loadFontAtlas(): Promise<HTMLImageElement> {
    if (this.fontAtlasImage) {
      return this.fontAtlasImage;
    }

    if (this.fontAtlasLoading) {
      return this.fontAtlasLoading;
    }

    const fontDef = FontRegistry.getById(this.fontId);
    if (!fontDef) {
      throw new Error(`Font '${this.fontId}' not found in FontRegistry`);
    }

    this.fontAtlasLoading = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = fontDef.atlasPath;
      img.onload = () => {
        this.fontAtlasImage = img;
        this.fontAtlasLoading = null;
        resolve(img);
      };
      img.onerror = () => {
        this.fontAtlasLoading = null;
        reject(new Error(`Failed to load font atlas for '${this.fontId}' at ${fontDef.atlasPath}`));
      };
    });

    return this.fontAtlasLoading;
  }

  /**
   * Parse the message into text and sprite parts
   */
  private parseMessage(): void {
    const regex = /\[sprite:([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(this.message)) !== null) {
      // Add text before the sprite
      if (match.index > lastIndex) {
        const textContent = this.message.substring(lastIndex, match.index);
        this.messageParts.push({ type: 'text', content: textContent });
      }

      // Add the sprite
      this.messageParts.push({ type: 'sprite', content: match[1] });

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < this.message.length) {
      const textContent = this.message.substring(lastIndex);
      this.messageParts.push({ type: 'text', content: textContent });
    }
  }

  /**
   * Calculate total number of "characters" (letters + sprites count as 1 each)
   */
  private getTotalCharacterCount(): number {
    let count = 0;
    for (const part of this.messageParts) {
      if (part.type === 'text') {
        count += part.content.length;
      } else {
        count += 1; // Sprite counts as 1 character
      }
    }
    return count;
  }

  start(_state: CombatState, _encounter: CombatEncounter): void {
    this.elapsedTime = 0;
    this.complete = false;
    // Start loading font atlas
    if (!this.fontAtlasImage && !this.fontAtlasLoading) {
      this.loadFontAtlas().catch(console.error);
    }
  }

  update(deltaTime: number): boolean {
    this.elapsedTime += deltaTime;
    if (this.elapsedTime >= this.duration) {
      this.complete = true;
      return true;
    }
    return false;
  }

  /**
   * Calculate how many characters should be visible based on elapsed time
   */
  private getVisibleCharacterCount(): number {
    const progress = Math.min(this.elapsedTime / this.duration, 1.0);
    const totalChars = this.getTotalCharacterCount();
    return Math.floor(progress * totalChars);
  }

  render(_state: CombatState, _encounter: CombatEncounter, context: CinematicRenderContext): void {
    const { ctx, canvasWidth, spriteSize, spriteImages } = context;

    // Skip rendering if font atlas not loaded yet
    if (!this.fontAtlasImage) {
      return;
    }

    const fontDef = FontRegistry.getById(this.fontId);
    if (!fontDef) return;

    const visibleChars = this.getVisibleCharacterCount();
    if (visibleChars === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Measure the full message to center it
    const fullWidth = this.measureMessageWidth();
    let currentX = (canvasWidth - fullWidth) / 2;
    const currentY = this.yPosition;

    // Render visible parts
    let charsRendered = 0;
    for (const part of this.messageParts) {
      if (charsRendered >= visibleChars) break;

      if (part.type === 'text') {
        // Render text characters one by one using font atlas
        const charsToShow = Math.min(part.content.length, visibleChars - charsRendered);
        const visibleText = part.content.substring(0, charsToShow);

        // Render each character individually
        for (const char of visibleText) {
          const coords = FontRegistry.getCharCoordinates(fontDef, char);
          if (coords) {
            ctx.drawImage(
              this.fontAtlasImage,
              coords.x,
              coords.y,
              coords.width,
              fontDef.charHeight,
              Math.round(currentX),
              Math.round(currentY),
              Math.round(coords.width * this.scale),
              Math.round(fontDef.charHeight * this.scale)
            );
            currentX += coords.width * this.scale + (fontDef.charSpacing || 0) * this.scale;
          }
        }

        charsRendered += charsToShow;
      } else if (part.type === 'sprite') {
        // Only render sprite if we've revealed it
        if (charsRendered < visibleChars) {
          const spriteDef = SpriteRegistry.getById(part.content);
          if (spriteDef) {
            const spriteImage = spriteImages.get(spriteDef.spriteSheet);
            if (spriteImage) {
              const srcX = spriteDef.x * spriteSize;
              const srcY = spriteDef.y * spriteSize;
              const srcWidth = (spriteDef.width || 1) * spriteSize;
              const srcHeight = (spriteDef.height || 1) * spriteSize;

              // Draw sprite at text height
              const spriteDisplaySize = fontDef.charHeight * this.scale;
              ctx.drawImage(
                spriteImage,
                srcX, srcY, srcWidth, srcHeight,
                currentX, currentY, spriteDisplaySize, spriteDisplaySize
              );

              currentX += spriteDisplaySize + 4 * this.scale; // Sprite width + small gap
            }
          }
          charsRendered += 1;
        }
      }
    }

    ctx.restore();
  }

  /**
   * Measure the full width of the message with all characters visible
   */
  private measureMessageWidth(): number {
    const fontDef = FontRegistry.getById(this.fontId);
    if (!fontDef) return 0;

    let width = 0;

    for (const part of this.messageParts) {
      if (part.type === 'text') {
        // Measure text using font atlas
        for (const char of part.content) {
          const charWidth = FontRegistry.getCharWidth(fontDef, char);
          width += charWidth * this.scale + (fontDef.charSpacing || 0) * this.scale;
        }
        // Remove trailing spacing after last character in this text part
        if (part.content.length > 0 && fontDef.charSpacing) {
          width -= fontDef.charSpacing * this.scale;
        }
      } else if (part.type === 'sprite') {
        width += fontDef.charHeight * this.scale + 4 * this.scale; // Sprite size + gap
      }
    }

    return width;
  }

  isComplete(): boolean {
    return this.complete;
  }

  reset(): void {
    this.elapsedTime = 0;
    this.complete = false;
  }
}

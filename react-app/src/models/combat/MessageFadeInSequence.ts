import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

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
  private readonly fontSize: number;
  private readonly yPosition: number;
  private readonly font: string;
  private complete = false;
  private messageParts: MessagePart[] = [];

  /**
   * @param message - The message to display (use [sprite:id] to embed sprites)
   * @param duration - Duration of the fade-in effect in seconds (default: 2)
   * @param font - Font to use (default: Bitfantasy)
   * @param fontSize - Font size in pixels (default: 24)
   * @param yPosition - Y position on screen (default: 140)
   */
  constructor(
    message: string,
    duration: number = 2.0,
    font: string = 'Bitfantasy',
    fontSize: number = 24,
    yPosition: number = 140
  ) {
    this.message = message;
    this.duration = duration;
    this.font = font;
    this.fontSize = fontSize;
    this.yPosition = yPosition;
    this.parseMessage();
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
    const { ctx, canvasSize, spriteSize, spriteImages } = context;

    const visibleChars = this.getVisibleCharacterCount();
    if (visibleChars === 0) return;

    // Set up text rendering
    ctx.save();
    ctx.font = `${this.fontSize}px "${this.font}", monospace`;
    ctx.textBaseline = 'top';

    // Measure the full message to center it
    const fullWidth = this.measureMessageWidth(ctx, this.getTotalCharacterCount(), spriteImages, spriteSize);
    let currentX = (canvasSize - fullWidth) / 2;
    const currentY = this.yPosition;

    // Render visible parts
    let charsRendered = 0;
    for (const part of this.messageParts) {
      if (charsRendered >= visibleChars) break;

      if (part.type === 'text') {
        // Render text characters one by one
        const charsToShow = Math.min(part.content.length, visibleChars - charsRendered);
        const visibleText = part.content.substring(0, charsToShow);

        // Draw shadow
        ctx.fillStyle = '#000000';
        ctx.fillText(visibleText, currentX - 1, currentY - 1);
        ctx.fillText(visibleText, currentX + 1, currentY - 1);
        ctx.fillText(visibleText, currentX - 1, currentY + 1);
        ctx.fillText(visibleText, currentX + 1, currentY + 1);

        // Draw main text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(visibleText, currentX, currentY);

        currentX += ctx.measureText(visibleText).width;
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
              const spriteDisplaySize = this.fontSize;
              ctx.drawImage(
                spriteImage,
                srcX, srcY, srcWidth, srcHeight,
                currentX, currentY, spriteDisplaySize, spriteDisplaySize
              );

              currentX += spriteDisplaySize + 4; // Sprite width + small gap
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
  private measureMessageWidth(
    ctx: CanvasRenderingContext2D,
    charCount: number,
    _spriteImages: Map<string, HTMLImageElement>,
    _spriteSize: number
  ): number {
    let width = 0;
    let charsProcessed = 0;

    for (const part of this.messageParts) {
      if (charsProcessed >= charCount) break;

      if (part.type === 'text') {
        width += ctx.measureText(part.content).width;
        charsProcessed += part.content.length;
      } else if (part.type === 'sprite') {
        width += this.fontSize + 4; // Sprite size + gap
        charsProcessed += 1;
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

import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../utils/SpriteRenderer';

/**
 * A segment of text or sprite with optional color formatting.
 */
interface TextSegment {
  type: 'text' | 'sprite';
  text: string; // For text segments
  spriteId?: string; // For sprite segments
  color: string | null; // null means use default color
}

/**
 * Configuration for the combat log rendering.
 */
export interface CombatLogConfig {
  /** Maximum number of messages to keep in history */
  maxMessages: number;
  /** Number of lines to render on the off-screen canvas */
  bufferLines: number;
  /** Height of each line in pixels */
  lineHeight: number;
  /** Default text color */
  defaultColor: string;
}

/**
 * Manages combat log messages with support for colored text tags.
 * Uses an off-screen canvas buffer to render message history with scrolling.
 *
 * Color tag format: [color=#hexcode]text[/color]
 * Example: "The [color=#ff0000]Red Dragon[/color] attacks!"
 */
export class CombatLogManager {
  private messages: string[] = [];
  private readonly config: CombatLogConfig;
  private bufferCanvas: HTMLCanvasElement | null = null;
  private bufferCtx: CanvasRenderingContext2D | null = null;
  private scrollOffset: number = 0; // Scroll position (0 = showing newest messages)
  private lastVisibleLines: number = 0; // Track how many lines are actually visible
  private bufferDirty: boolean = true; // Flag to track if buffer needs redrawing
  private lastFontId: string = '';
  private lastBufferWidth: number = 0;

  // Animation state
  private animatingMessageIndex: number = -1; // Index of the message being animated
  private animationProgress: number = 1; // 0.0 to 1.0, how much of the message to show
  private animationCharsShown: number = 0; // Track characters shown to prevent going backwards
  private readonly ANIMATION_DURATION: number = 0.5; // 0.5 seconds per message

  // Message queue for sequential animations
  private messageQueue: string[] = [];

  constructor(config: Partial<CombatLogConfig> = {}) {
    this.config = {
      maxMessages: config.maxMessages ?? 100,
      bufferLines: config.bufferLines ?? 20,
      lineHeight: config.lineHeight ?? 8,
      defaultColor: config.defaultColor ?? '#ffffff',
    };
  }

  /**
   * Adds a new message to the combat log.
   * If an animation is currently in progress, the message is queued.
   * Automatically trims history if it exceeds maxMessages.
   */
  addMessage(message: string): void {
    // If currently animating, queue the message for later
    if (this.animatingMessageIndex >= 0 && this.animationProgress < 1) {
      this.messageQueue.push(message);
      return;
    }

    // Add message immediately
    this.messages.push(message);

    // Trim old messages if we exceed the limit
    if (this.messages.length > this.config.maxMessages) {
      this.messages = this.messages.slice(-this.config.maxMessages);
    }

    // Auto-scroll to bottom when new message arrives
    this.scrollOffset = 0;

    // Start animation for the new message
    this.animatingMessageIndex = this.messages.length - 1;
    this.animationProgress = 0;
    this.animationCharsShown = 0;

    // Mark buffer as dirty
    this.bufferDirty = true;
  }

  /**
   * Clears all messages from the log.
   */
  clear(): void {
    this.messages = [];
    this.scrollOffset = 0;
    this.bufferDirty = true;
  }

  /**
   * Gets all messages in the log.
   */
  getMessages(): readonly string[] {
    return this.messages;
  }

  /**
   * Scrolls the log up (shows older messages).
   * @param lines Number of lines to scroll
   */
  scrollUp(lines: number = 1): void {
    // Max scroll is based on visible lines, not buffer lines
    const visibleLines = this.lastVisibleLines || this.config.bufferLines;
    const maxScroll = Math.max(0, this.messages.length - visibleLines);
    const oldOffset = this.scrollOffset;
    this.scrollOffset = Math.min(this.scrollOffset + lines, maxScroll);

    // Mark buffer as dirty if offset changed
    if (oldOffset !== this.scrollOffset) {
      this.bufferDirty = true;
    }
  }

  /**
   * Scrolls the log down (shows newer messages).
   * @param lines Number of lines to scroll
   */
  scrollDown(lines: number = 1): void {
    const oldOffset = this.scrollOffset;
    this.scrollOffset = Math.max(0, this.scrollOffset - lines);

    // Mark buffer as dirty if offset changed
    if (oldOffset !== this.scrollOffset) {
      this.bufferDirty = true;
    }
  }

  /**
   * Scrolls to the bottom of the log (newest messages).
   */
  scrollToBottom(): void {
    const oldOffset = this.scrollOffset;
    this.scrollOffset = 0;

    // Mark buffer as dirty if offset changed
    if (oldOffset !== this.scrollOffset) {
      this.bufferDirty = true;
    }
  }

  /**
   * Parses tags from a message string.
   * Supports [color=#hexcode]text[/color] and [sprite:spriteId] formats.
   *
   * @param message Message string with optional color and sprite tags
   * @returns Array of text/sprite segments with color information
   */
  private parseTags(message: string): TextSegment[] {
    const segments: TextSegment[] = [];
    // Combined regex to match both color tags and sprite tags
    const tagRegex = /\[color=(#[0-9a-fA-F]{6})\](.*?)\[\/color\]|\[sprite:([\w-]+)\]/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(message)) !== null) {
      // Add text before the tag (if any)
      if (match.index > lastIndex) {
        const plainText = message.substring(lastIndex, match.index);
        segments.push({ type: 'text', text: plainText, color: null });
      }

      if (match[1] !== undefined) {
        // Color tag matched
        const color = match[1]; // The hex color
        const text = match[2]; // The text inside the tags
        segments.push({ type: 'text', text, color });
      } else if (match[3] !== undefined) {
        // Sprite tag matched
        const spriteId = match[3];
        segments.push({ type: 'sprite', text: '', spriteId, color: null });
      }

      lastIndex = tagRegex.lastIndex;
    }

    // Add remaining text after the last tag (if any)
    if (lastIndex < message.length) {
      const plainText = message.substring(lastIndex);
      segments.push({ type: 'text', text: plainText, color: null });
    }

    // If no tags were found, return the entire message as a single segment
    if (segments.length === 0) {
      segments.push({ type: 'text', text: message, color: null });
    }

    return segments;
  }

  /**
   * Renders the combat log to an off-screen buffer canvas.
   * The buffer is sized to fit exactly bufferLines lines.
   *
   * @param fontId Font atlas ID to use for rendering
   * @param fontAtlasImage Font atlas image
   * @param bufferWidth Width of the buffer canvas
   * @param spriteImages Map of sprite images
   * @param spriteSize Size of each sprite
   */
  private renderToBuffer(
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    bufferWidth: number,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    const bufferHeight = this.config.bufferLines * this.config.lineHeight;

    // Round dimensions to avoid floating-point comparison issues
    const roundedWidth = Math.round(bufferWidth);
    const roundedHeight = Math.round(bufferHeight);

    // Create buffer canvas if it doesn't exist or size changed
    const needsRecreate = !this.bufferCanvas ||
        this.bufferCanvas.width !== roundedWidth ||
        this.bufferCanvas.height !== roundedHeight;

    if (needsRecreate) {
      this.bufferCanvas = document.createElement('canvas');
      this.bufferCanvas.width = roundedWidth;
      this.bufferCanvas.height = roundedHeight;
      this.bufferCtx = this.bufferCanvas.getContext('2d');
      this.bufferDirty = true; // Force redraw after recreation
    }

    if (!this.bufferCtx) return;

    // Check if we need to redraw the buffer
    const fontChanged = this.lastFontId !== fontId;
    const widthChanged = this.lastBufferWidth !== roundedWidth;

    if (!this.bufferDirty && !fontChanged && !widthChanged) {
      // Buffer is still valid, no need to redraw
      return;
    }

    // Update tracking variables
    this.lastFontId = fontId;
    this.lastBufferWidth = roundedWidth;

    // Ensure pixel-perfect rendering
    this.bufferCtx.imageSmoothingEnabled = false;

    // Clear buffer
    this.bufferCtx.fillStyle = '#000000';
    this.bufferCtx.fillRect(0, 0, roundedWidth, roundedHeight);

    // Calculate which messages to render (considering scroll offset)
    const startIdx = Math.max(0, this.messages.length - this.config.bufferLines - this.scrollOffset);
    const endIdx = this.messages.length - this.scrollOffset;
    const visibleMessages = this.messages.slice(startIdx, endIdx);

    // Calculate starting Y position to align messages to bottom of buffer
    // If we have fewer messages than bufferLines, start from the bottom
    const totalMessagesHeight = visibleMessages.length * this.config.lineHeight;
    let currentY = Math.max(0, roundedHeight - totalMessagesHeight);

    // Render each message line
    for (let i = 0; i < visibleMessages.length; i++) {
      const messageIndex = startIdx + i;
      const message = visibleMessages[i];
      const segments = this.parseTags(message);

      let currentX = 0;

      // Check if this message is being animated
      const isAnimating = messageIndex === this.animatingMessageIndex && this.animationProgress < 1;

      // Calculate how many characters/elements to show based on animation progress
      let charsToShow = message.length;
      if (isAnimating) {
        // Remove tags from message to get actual visible character count
        // Count sprites as 1 character each
        const plainText = message
          .replace(/\[color=#[0-9a-fA-F]{6}\]/g, '')
          .replace(/\[\/color\]/g, '')
          .replace(/\[sprite:[\w-]+\]/g, 'S'); // Replace sprite tags with single char
        const visibleChars = Math.floor(plainText.length * this.animationProgress);
        // Ensure we never show fewer characters than before (prevents backwards animation)
        charsToShow = Math.max(visibleChars, this.animationCharsShown);
        this.animationCharsShown = charsToShow;
      }

      // Track how many characters we've rendered so far
      let charsRendered = 0;

      // Render each segment (text or sprite)
      for (const segment of segments) {
        if (segment.type === 'sprite') {
          // Render sprite segment
          if (segment.spriteId && this.bufferCtx) {
            // Skip sprite if animating and we haven't reached it yet
            if (isAnimating && charsRendered >= charsToShow) {
              break;
            }

            // Scale sprite to fit line height
            const spriteDisplaySize = this.config.lineHeight;
            SpriteRenderer.renderSpriteById(
              this.bufferCtx,
              segment.spriteId,
              spriteImages,
              spriteSize,
              currentX,
              currentY,
              spriteDisplaySize,
              spriteDisplaySize
            );

            // Advance X position by sprite size
            currentX += spriteDisplaySize;
            charsRendered += 1; // Count sprite as 1 character for animation
          }
        } else {
          // Render text segment
          const color = segment.color || this.config.defaultColor;

          // Calculate how much of this segment to render
          let textToRender = segment.text;
          if (isAnimating) {
            const charsAvailable = charsToShow - charsRendered;
            if (charsAvailable <= 0) {
              break; // Don't render this segment at all
            }
            if (charsAvailable < segment.text.length) {
              textToRender = segment.text.substring(0, charsAvailable);
            }
          }

          if (textToRender.length > 0) {
            FontAtlasRenderer.renderText(
              this.bufferCtx,
              textToRender,
              currentX,
              currentY,
              fontId,
              fontAtlasImage,
              1,
              'left',
              color
            );

            // Advance X position for next segment
            currentX += FontAtlasRenderer.measureTextByFontId(textToRender, fontId);
          }

          charsRendered += textToRender.length;
        }
      }

      currentY += this.config.lineHeight;
    }

    // Clear the dirty flag after redrawing
    this.bufferDirty = false;
  }

  /**
   * Renders the visible portion of the combat log to the main canvas.
   * Uses the off-screen buffer and clips to the visible area.
   *
   * @param ctx Main canvas rendering context
   * @param x X position on main canvas
   * @param y Y position on main canvas
   * @param width Width of the visible area
   * @param height Height of the visible area (the mask)
   * @param fontId Font atlas ID to use for rendering
   * @param fontAtlasImage Font atlas image
   * @param spriteImages Map of sprite images
   * @param spriteSize Size of each sprite
   */
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    spriteImages: Map<string, HTMLImageElement> = new Map(),
    spriteSize: number = 12
  ): void {
    // Track visible lines for scroll calculations
    this.lastVisibleLines = Math.floor(height / this.config.lineHeight);

    // Render full history to buffer
    this.renderToBuffer(fontId, fontAtlasImage, width, spriteImages, spriteSize);

    if (!this.bufferCanvas) return;

    // Calculate source rectangle (bottom portion of buffer for newest messages)
    const bufferHeight = this.config.bufferLines * this.config.lineHeight;
    const sourceHeight = Math.min(height, bufferHeight);

    // Copy from bottom of buffer (newest messages)
    const sourceY = Math.max(0, bufferHeight - sourceHeight);

    // Copy visible portion from buffer to main canvas
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      this.bufferCanvas,
      0, sourceY, width, sourceHeight,  // Source rectangle (from buffer)
      x, y, width, sourceHeight         // Destination rectangle (on main canvas)
    );

    ctx.restore();
  }

  /**
   * Gets the current scroll offset.
   */
  getScrollOffset(): number {
    return this.scrollOffset;
  }

  /**
   * Gets the maximum scroll offset (number of lines that can be scrolled).
   */
  getMaxScrollOffset(): number {
    return Math.max(0, this.messages.length - this.config.bufferLines);
  }

  /**
   * Returns true if the log can scroll up (show older messages).
   */
  canScrollUp(): boolean {
    const visibleLines = this.lastVisibleLines || this.config.bufferLines;
    const maxScroll = Math.max(0, this.messages.length - visibleLines);
    return this.scrollOffset < maxScroll;
  }

  /**
   * Returns true if the log can scroll down (show newer messages).
   */
  canScrollDown(): boolean {
    return this.scrollOffset > 0;
  }

  /**
   * Updates the animation state.
   * @param deltaTime Time elapsed since last update in seconds
   */
  update(deltaTime: number): void {
    // If we're animating a message, advance the animation
    if (this.animatingMessageIndex >= 0 && this.animationProgress < 1) {
      this.animationProgress += deltaTime / this.ANIMATION_DURATION;

      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.animatingMessageIndex = -1; // Animation complete

        // Process next message in queue if available
        if (this.messageQueue.length > 0) {
          const nextMessage = this.messageQueue.shift()!;
          this.addMessage(nextMessage);
        }
      }

      // Mark buffer as dirty to trigger redraw
      this.bufferDirty = true;
    }
  }

  // Scroll button tracking
  private scrollUpButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private scrollDownButtonBounds: { x: number; y: number; width: number; height: number } | null = null;

  /**
   * Renders scroll buttons for the combat log.
   * @param ctx Canvas rendering context
   * @param spriteImages Map of sprite images
   * @param spriteSize Size of sprites
   * @param canvasHeight Full canvas height
   */
  renderScrollButtons(
    ctx: CanvasRenderingContext2D,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number,
    canvasHeight: number
  ): void {
    const buttonSize = 12;
    const tileSize = 12;

    // Position at x tile 19 (19 * 12 = 228px)
    const scrollButtonsX = 19 * tileSize;

    // Up arrow: 3 tiles from bottom - only if can scroll up
    if (this.canScrollUp()) {
      const scrollUpY = canvasHeight - 3 * tileSize;
      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-7',
        spriteImages,
        spriteSize,
        scrollButtonsX,
        scrollUpY,
        buttonSize,
        buttonSize
      );
      this.scrollUpButtonBounds = {
        x: scrollButtonsX,
        y: scrollUpY,
        width: buttonSize,
        height: buttonSize
      };
    } else {
      this.scrollUpButtonBounds = null;
    }

    // Down arrow: bottom-most tile - only if can scroll down
    if (this.canScrollDown()) {
      const scrollDownY = canvasHeight - 1 * tileSize;
      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-9',
        spriteImages,
        spriteSize,
        scrollButtonsX,
        scrollDownY,
        buttonSize,
        buttonSize
      );
      this.scrollDownButtonBounds = {
        x: scrollButtonsX,
        y: scrollDownY,
        width: buttonSize,
        height: buttonSize
      };
    } else {
      this.scrollDownButtonBounds = null;
    }
  }

  /**
   * Handles click events on scroll buttons.
   * @param x Click x coordinate
   * @param y Click y coordinate
   * @returns 'up', 'down', or null if no button was clicked
   */
  handleScrollButtonClick(x: number, y: number): 'up' | 'down' | null {
    // Check scroll up button
    if (this.scrollUpButtonBounds &&
        x >= this.scrollUpButtonBounds.x &&
        x <= this.scrollUpButtonBounds.x + this.scrollUpButtonBounds.width &&
        y >= this.scrollUpButtonBounds.y &&
        y <= this.scrollUpButtonBounds.y + this.scrollUpButtonBounds.height) {
      return 'up';
    }

    // Check scroll down button
    if (this.scrollDownButtonBounds &&
        x >= this.scrollDownButtonBounds.x &&
        x <= this.scrollDownButtonBounds.x + this.scrollDownButtonBounds.width &&
        y >= this.scrollDownButtonBounds.y &&
        y <= this.scrollDownButtonBounds.y + this.scrollDownButtonBounds.height) {
      return 'down';
    }

    return null;
  }
}

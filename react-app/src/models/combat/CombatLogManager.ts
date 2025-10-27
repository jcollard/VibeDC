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
 * A stored message with pre-parsed segments for performance.
 */
interface StoredMessage {
  rawText: string;
  segments: TextSegment[];
  plainTextLength: number;
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
 * JSON representation of CombatLogManager for serialization
 */
export interface CombatLogJSON {
  messages: string[];
}

/**
 * Manages combat log messages with support for colored text tags.
 * Uses an off-screen canvas buffer to render message history with scrolling.
 *
 * Color tag format: [color=#hexcode]text[/color]
 * Example: "The [color=#ff0000]Red Dragon[/color] attacks!"
 */
export class CombatLogManager {
  private messages: StoredMessage[] = [];
  private readonly config: CombatLogConfig;
  private scrollOffset: number = 0; // Scroll position (0 = showing newest messages)
  private lastVisibleLines: number = 0; // Track how many lines are actually visible

  // Static message buffer (contains ALL messages rendered once)
  private staticBuffer: HTMLCanvasElement | null = null;
  private staticBufferCtx: CanvasRenderingContext2D | null = null;
  private staticBufferDirty: boolean = true;
  private lastStaticMessageCount: number = 0;

  // Animation state
  private animatingMessageIndex: number = -1; // Index of the message being animated
  private animationProgress: number = 1; // 0.0 to 1.0, how much of the message to show
  private animationCharsShown: number = 0; // Track characters shown to prevent going backwards
  private animationDuration: number = 0.5; // Duration for current message animation
  private readonly DEFAULT_CHARS_PER_SECOND: number = 60; // Default animation speed
  private readonly FAST_CHARS_PER_SECOND: number = 240; // Fast animation speed when queue is long
  private readonly MAX_QUEUE_TIME: number = 3; // Max queue time in seconds before speeding up

  // Message queue for sequential animations
  private messageQueue: { message: string; charsPerSecond?: number }[] = [];

  constructor(config: Partial<CombatLogConfig> = {}) {
    this.config = {
      maxMessages: config.maxMessages ?? 100,
      bufferLines: config.bufferLines ?? 20,
      lineHeight: config.lineHeight ?? 8,
      defaultColor: config.defaultColor ?? '#ffffff',
    };
  }

  /**
   * Calculates the plain text length of a message (without color/sprite tags).
   */
  private getPlainTextLength(message: string): number {
    const plainText = message
      .replace(/\[color=#[0-9a-fA-F]{6}\]/g, '')
      .replace(/\[\/color\]/g, '')
      .replace(/\[sprite:[\w-]+\]/g, 'S'); // Replace sprite tags with single char
    return plainText.length;
  }

  /**
   * Calculates the total time remaining for all queued messages plus current animation.
   */
  private calculateTotalQueueTime(): number {
    // Time remaining for current animation
    let totalTime = 0;
    if (this.animatingMessageIndex >= 0 && this.animationProgress < 1) {
      totalTime += this.animationDuration * (1 - this.animationProgress);
    }

    // Time for all queued messages
    for (const item of this.messageQueue) {
      const length = this.getPlainTextLength(item.message);
      const speed = item.charsPerSecond ?? this.DEFAULT_CHARS_PER_SECOND;
      totalTime += length / speed;
    }

    return totalTime;
  }

  /**
   * Adds a new message to the combat log.
   * If an animation is currently in progress, the message is queued.
   * Automatically trims history if it exceeds maxMessages.
   *
   * @param message The message to add
   * @param charsPerSecond Optional animation speed in characters per second (defaults to DEFAULT_CHARS_PER_SECOND)
   */
  addMessage(message: string, charsPerSecond?: number): void {
    // If currently animating, queue the message for later
    if (this.animatingMessageIndex >= 0 && this.animationProgress < 1) {
      this.messageQueue.push({ message, charsPerSecond });

      // Check if queue time exceeds threshold - if so, speed up all messages
      const totalQueueTime = this.calculateTotalQueueTime();
      if (totalQueueTime > this.MAX_QUEUE_TIME) {
        // Speed up all queued messages to fast speed
        for (const item of this.messageQueue) {
          item.charsPerSecond = this.FAST_CHARS_PER_SECOND;
        }
        // Also speed up current animation
        const currentLength = this.messages[this.animatingMessageIndex].plainTextLength;
        this.animationDuration = currentLength / this.FAST_CHARS_PER_SECOND;
      }

      return;
    }

    // Pre-parse message segments for performance
    const segments = this.parseTags(message);
    const plainTextLength = this.getPlainTextLength(message);

    // Add message immediately with pre-parsed data
    this.messages.push({
      rawText: message,
      segments,
      plainTextLength,
    });

    // Trim old messages if we exceed the limit
    if (this.messages.length > this.config.maxMessages) {
      this.messages = this.messages.slice(-this.config.maxMessages);
    }

    // Auto-scroll to bottom when new message arrives
    this.scrollOffset = 0;

    // Calculate animation duration based on message length
    const speed = charsPerSecond ?? this.DEFAULT_CHARS_PER_SECOND;
    this.animationDuration = plainTextLength / speed;

    // Start animation for the new message
    this.animatingMessageIndex = this.messages.length - 1;

    // If animation duration is 0 (instant/infinite speed), complete immediately
    if (this.animationDuration === 0 || !isFinite(this.animationDuration)) {
      this.animationProgress = 1;
      this.animationCharsShown = plainTextLength;
    } else {
      this.animationProgress = 0;
      this.animationCharsShown = 0;
    }

    // Mark static buffer as dirty since we have a new message
    this.staticBufferDirty = true;
  }

  /**
   * Clears all messages from the log.
   */
  clear(): void {
    this.messages = [];
    this.scrollOffset = 0;
    this.staticBufferDirty = true;
    // Reset animation state
    this.animatingMessageIndex = -1;
    this.animationProgress = 1;
    this.animationCharsShown = 0;
    // Clear message queue
    this.messageQueue = [];
  }

  /**
   * Gets all messages in the log.
   */
  getMessages(): readonly string[] {
    return this.messages.map(m => m.rawText);
  }

  /**
   * Scrolls the log up (shows older messages).
   * @param lines Number of lines to scroll
   */
  scrollUp(lines: number = 1): void {
    // Max scroll is based on visible lines, not buffer lines
    const visibleLines = this.lastVisibleLines || this.config.bufferLines;
    const maxScroll = Math.max(0, this.messages.length - visibleLines);
    this.scrollOffset = Math.min(this.scrollOffset + lines, maxScroll);
    // No need to mark buffer as dirty - scrolling just changes composition
  }

  /**
   * Scrolls the log down (shows newer messages).
   * @param lines Number of lines to scroll
   */
  scrollDown(lines: number = 1): void {
    this.scrollOffset = Math.max(0, this.scrollOffset - lines);
    // No need to mark buffer as dirty - scrolling just changes composition
  }

  /**
   * Scrolls to the bottom of the log (newest messages).
   */
  scrollToBottom(): void {
    this.scrollOffset = 0;
    // No need to mark buffer as dirty - scrolling just changes composition
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
   * Renders all static (non-animating) messages to the static buffer.
   * The static buffer contains ALL messages at their absolute Y positions.
   * This buffer is only re-rendered when messages change, not during animation.
   *
   * @param fontId Font atlas ID to use for rendering
   * @param fontAtlasImage Font atlas image
   * @param bufferWidth Width of the buffer canvas
   * @param spriteImages Map of sprite images
   * @param spriteSize Size of each sprite
   */
  private renderStaticMessages(
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    bufferWidth: number,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    // Calculate total height needed for all messages
    const totalMessages = this.messages.length;
    const bufferHeight = totalMessages * this.config.lineHeight;

    // Round dimensions
    const roundedWidth = Math.round(bufferWidth);
    const roundedHeight = Math.round(bufferHeight);

    // Create or recreate buffer if needed
    const needsRecreate = !this.staticBuffer ||
        this.staticBuffer.width !== roundedWidth ||
        this.staticBuffer.height !== roundedHeight;

    if (needsRecreate) {
      this.staticBuffer = document.createElement('canvas');
      this.staticBuffer.width = roundedWidth;
      this.staticBuffer.height = roundedHeight;
      this.staticBufferCtx = this.staticBuffer.getContext('2d');
      this.staticBufferDirty = true;
    }

    if (!this.staticBufferCtx) return;

    // Check if we need to redraw
    if (!this.staticBufferDirty && this.lastStaticMessageCount === totalMessages) {
      return; // Buffer is still valid
    }

    // Ensure pixel-perfect rendering
    this.staticBufferCtx.imageSmoothingEnabled = false;

    // Clear buffer
    this.staticBufferCtx.fillStyle = '#000000';
    this.staticBufferCtx.fillRect(0, 0, roundedWidth, roundedHeight);

    // Render ALL messages (except the currently animating one)
    for (let i = 0; i < this.messages.length; i++) {
      // Skip the animating message - it will be rendered separately
      if (i === this.animatingMessageIndex && this.animationProgress < 1) {
        continue;
      }

      const storedMessage = this.messages[i];
      const segments = storedMessage.segments;
      const currentY = i * this.config.lineHeight;
      let currentX = 0;

      // Render each segment
      for (const segment of segments) {
        if (segment.type === 'sprite') {
          if (segment.spriteId && this.staticBufferCtx) {
            const spriteDisplaySize = this.config.lineHeight;
            SpriteRenderer.renderSpriteById(
              this.staticBufferCtx,
              segment.spriteId,
              spriteImages,
              spriteSize,
              currentX,
              currentY,
              spriteDisplaySize,
              spriteDisplaySize
            );
            currentX += spriteDisplaySize;
          }
        } else {
          const color = segment.color || this.config.defaultColor;
          FontAtlasRenderer.renderText(
            this.staticBufferCtx,
            segment.text,
            currentX,
            currentY,
            fontId,
            fontAtlasImage,
            1,
            'left',
            color
          );
          currentX += FontAtlasRenderer.measureTextByFontId(segment.text, fontId);
        }
      }
    }

    // Clear dirty flag and update tracking
    this.staticBufferDirty = false;
    this.lastStaticMessageCount = totalMessages;
  }

  /**
   * Renders the currently animating message to a temporary canvas.
   * This canvas is composited with the static buffer during the main render.
   *
   * @param fontId Font atlas ID to use for rendering
   * @param fontAtlasImage Font atlas image
   * @param width Width of the canvas
   * @param spriteImages Map of sprite images
   * @param spriteSize Size of each sprite
   * @returns Temporary canvas with the animated message, or null if not animating
   */
  private renderAnimatingMessage(
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    width: number,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): HTMLCanvasElement | null {
    if (this.animatingMessageIndex < 0 || this.animationProgress >= 1) {
      return null;
    }

    const storedMessage = this.messages[this.animatingMessageIndex];
    const segments = storedMessage.segments;

    // Create temporary canvas for this one line
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.round(width);
    tempCanvas.height = this.config.lineHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return null;

    tempCtx.imageSmoothingEnabled = false;

    // Calculate how many characters to show
    const visibleChars = Math.floor(storedMessage.plainTextLength * this.animationProgress);
    const charsToShow = Math.max(visibleChars, this.animationCharsShown);
    this.animationCharsShown = charsToShow;

    let currentX = 0;
    let charsRendered = 0;

    // Render each segment
    for (const segment of segments) {
      if (segment.type === 'sprite') {
        if (charsRendered >= charsToShow) break;

        if (segment.spriteId) {
          const spriteDisplaySize = this.config.lineHeight;
          SpriteRenderer.renderSpriteById(
            tempCtx,
            segment.spriteId,
            spriteImages,
            spriteSize,
            currentX,
            0, // Y is always 0 in temp canvas
            spriteDisplaySize,
            spriteDisplaySize
          );
          currentX += spriteDisplaySize;
          charsRendered += 1;
        }
      } else {
        const charsAvailable = charsToShow - charsRendered;
        if (charsAvailable <= 0) break;

        let textToRender = segment.text;
        if (charsAvailable < segment.text.length) {
          textToRender = segment.text.substring(0, charsAvailable);
        }

        if (textToRender.length > 0) {
          const color = segment.color || this.config.defaultColor;
          FontAtlasRenderer.renderText(
            tempCtx,
            textToRender,
            currentX,
            0, // Y is always 0 in temp canvas
            fontId,
            fontAtlasImage,
            1,
            'left',
            color
          );
          currentX += FontAtlasRenderer.measureTextByFontId(textToRender, fontId);
        }

        charsRendered += textToRender.length;
      }
    }

    return tempCanvas;
  }

  /**
   * Renders the visible portion of the combat log to the main canvas.
   * Uses the static buffer for completed messages and composites the animating message on top.
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

    // Render all static messages to static buffer (only if dirty)
    this.renderStaticMessages(fontId, fontAtlasImage, width, spriteImages, spriteSize);

    if (!this.staticBuffer) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Calculate which messages are visible based on scroll and viewport size
    const maxVisibleLines = Math.min(this.config.bufferLines, Math.floor(height / this.config.lineHeight));
    const startIdx = Math.max(0, this.messages.length - maxVisibleLines - this.scrollOffset);
    const endIdx = this.messages.length - this.scrollOffset;
    const visibleCount = Math.min(endIdx - startIdx, maxVisibleLines);

    // Calculate starting Y position to align messages to bottom
    const totalVisibleHeight = visibleCount * this.config.lineHeight;
    const startY = Math.max(0, height - totalVisibleHeight);

    // Copy visible portion of static buffer to main canvas, line by line
    // Skip the animating message's line if it's in the visible range
    for (let i = startIdx; i < endIdx && i < startIdx + maxVisibleLines; i++) {
      const relativeIdx = i - startIdx;
      const destY = y + startY + (relativeIdx * this.config.lineHeight);

      // Skip rendering if this would be outside the viewport
      if (destY + this.config.lineHeight > y + height) {
        break;
      }

      // Skip animating message - it will be rendered separately
      if (i === this.animatingMessageIndex && this.animationProgress < 1) {
        continue;
      }

      // Copy this line from static buffer
      const sourceY = i * this.config.lineHeight;
      ctx.drawImage(
        this.staticBuffer,
        0, sourceY, width, this.config.lineHeight,  // Source rectangle
        x, destY, width, this.config.lineHeight     // Destination rectangle
      );
    }

    // If animating message is visible, render it on top
    if (this.animatingMessageIndex >= startIdx &&
        this.animatingMessageIndex < endIdx &&
        this.animationProgress < 1) {
      const animCanvas = this.renderAnimatingMessage(fontId, fontAtlasImage, width, spriteImages, spriteSize);
      if (animCanvas) {
        const relativeIdx = this.animatingMessageIndex - startIdx;
        const destY = y + startY + (relativeIdx * this.config.lineHeight);
        ctx.drawImage(animCanvas, 0, 0, width, this.config.lineHeight, x, destY, width, this.config.lineHeight);
      }
    }

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
      this.animationProgress += deltaTime / this.animationDuration;

      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.animatingMessageIndex = -1; // Animation complete

        // Mark static buffer dirty - completed message becomes static
        this.staticBufferDirty = true;

        // Process next message in queue if available
        if (this.messageQueue.length > 0) {
          const next = this.messageQueue.shift()!;
          this.addMessage(next.message, next.charsPerSecond);
        }
      }

      // No need to mark buffer dirty during animation - animating message renders separately
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

  /**
   * Convert this CombatLogManager to a JSON-serializable object
   * Only stores the message text, not animation state or scroll position
   */
  toJSON(): CombatLogJSON {
    return {
      messages: this.messages.map(m => m.rawText)
    };
  }

  /**
   * Create a CombatLogManager from a JSON object
   * Messages are added instantly without animation
   * @param json The JSON representation
   * @param config Optional configuration (uses defaults if not provided)
   * @returns A new CombatLogManager instance
   */
  static fromJSON(json: CombatLogJSON, config?: Partial<CombatLogConfig>): CombatLogManager {
    const logManager = new CombatLogManager(config);

    // Add all messages instantly (no animation)
    for (const message of json.messages) {
      logManager.addMessage(message, Infinity); // Infinity chars/sec = instant
    }

    // Scroll to bottom to show newest messages
    logManager.scrollToBottom();

    return logManager;
  }
}

import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * A segment of text with optional color formatting.
 */
interface TextSegment {
  text: string;
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
   * Automatically trims history if it exceeds maxMessages.
   */
  addMessage(message: string): void {
    this.messages.push(message);

    // Trim old messages if we exceed the limit
    if (this.messages.length > this.config.maxMessages) {
      this.messages = this.messages.slice(-this.config.maxMessages);
    }

    // Auto-scroll to bottom when new message arrives
    this.scrollOffset = 0;

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
   * Parses color tags from a message string.
   * Supports [color=#hexcode]text[/color] format (non-nested).
   *
   * @param message Message string with optional color tags
   * @returns Array of text segments with color information
   */
  private parseColorTags(message: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const colorTagRegex = /\[color=(#[0-9a-fA-F]{6})\](.*?)\[\/color\]/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = colorTagRegex.exec(message)) !== null) {
      // Add text before the color tag (if any)
      if (match.index > lastIndex) {
        const plainText = message.substring(lastIndex, match.index);
        segments.push({ text: plainText, color: null });
      }

      // Add colored text
      const color = match[1]; // The hex color
      const text = match[2]; // The text inside the tags
      segments.push({ text, color });

      lastIndex = colorTagRegex.lastIndex;
    }

    // Add remaining text after the last tag (if any)
    if (lastIndex < message.length) {
      const plainText = message.substring(lastIndex);
      segments.push({ text: plainText, color: null });
    }

    // If no tags were found, return the entire message as a single segment
    if (segments.length === 0) {
      segments.push({ text: message, color: null });
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
   */
  private renderToBuffer(
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    bufferWidth: number
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
      const message = visibleMessages[i];
      const segments = this.parseColorTags(message);

      let currentX = 0;

      // Render each segment with its color
      for (const segment of segments) {
        const color = segment.color || this.config.defaultColor;

        FontAtlasRenderer.renderText(
          this.bufferCtx,
          segment.text,
          currentX,
          currentY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          color
        );

        // Advance X position for next segment
        currentX += FontAtlasRenderer.measureTextByFontId(segment.text, fontId);
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
   */
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement
  ): void {
    // Track visible lines for scroll calculations
    this.lastVisibleLines = Math.floor(height / this.config.lineHeight);

    // Render full history to buffer
    this.renderToBuffer(fontId, fontAtlasImage, width);

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
}

import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../utils/FontRegistry';

/**
 * Configuration for a canvas button's appearance and behavior
 */
export interface CanvasButtonConfig {
  /** Text label to display on the button */
  label: string;
  /** X position of the button (top-left corner) */
  x: number;
  /** Y position of the button (top-left corner) */
  y: number;
  /** Width of the button in pixels (optional - auto-calculated from text if not provided) */
  width?: number;
  /** Height of the button in pixels (optional - auto-calculated from text if not provided) */
  height?: number;
  /** Padding around the text in pixels (default: 1) */
  padding?: number;
  /** Sprite ID to use for the normal button state (default: 'ui-simple-4') */
  spriteId?: string;
  /** Sprite ID to use for the hover state (default: 'ui-simple-5') */
  hoverSpriteId?: string;
  /** Sprite ID to use for the active/clicked state (default: 'ui-simple-6') */
  activeSpriteId?: string;
  /** Font ID from FontRegistry to use for the label */
  fontId: string;
  /** Font atlas image for rendering */
  fontAtlasImage: HTMLImageElement | null;
  /** Scale factor for the font (default: 2) */
  fontScale?: number;
  /** Text color (default: white) */
  textColor?: string;
  /** Whether the button is currently enabled (default: true) */
  enabled?: boolean;
  /** Callback function to execute when button is clicked */
  onClick?: () => void;
}

/**
 * Canvas button component that renders a 9-sliced button from a single sprite
 * with support for hover and active states
 *
 * The sprite should be structured as:
 * - Outer 3 pixels on each side: border that gets repeated (scaled 4x)
 * - Inner pixels: solid fill color that tiles to fill the interior
 */
export class CanvasButton {
  private config: CanvasButtonConfig;
  private readonly borderSize = 3; // Size of border in pixels from the sprite
  private isHovered = false;
  private isActive = false;

  constructor(config: CanvasButtonConfig) {
    // Calculate width and height from text if not provided
    const fontScale = config.fontScale || 2;
    const padding = config.padding !== undefined ? config.padding : 1;
    const borderSize = this.borderSize * 4; // 3 pixels * 4 scale = 12 pixels per side

    let width = config.width;
    let height = config.height;

    // Auto-calculate dimensions if not provided
    if (!width || !height) {
      const font = FontRegistry.getById(config.fontId);
      if (font && config.fontAtlasImage) {
        const textWidth = FontAtlasRenderer.measureTextByFontId(config.label, config.fontId) * fontScale;
        const textHeight = font.charHeight * fontScale;

        if (!width) {
          width = textWidth + (padding * 2) + (borderSize * 2);
        }
        if (!height) {
          height = textHeight + (padding * 2) + (borderSize * 2);
        }
      } else {
        // Fallback if font not loaded
        console.warn('CanvasButton: Cannot auto-calculate size - font not loaded');
        width = width || 200;
        height = height || 60;
      }
    }

    this.config = {
      spriteId: 'ui-simple-4',
      hoverSpriteId: 'ui-simple-5',
      activeSpriteId: 'ui-simple-6',
      fontScale: 2,
      padding: 1,
      textColor: '#ffffff',
      enabled: true,
      ...config,
      width,
      height,
    };
  }

  /**
   * Get the sprite IDs used by this button (for preloading)
   */
  getSpriteIds(): string[] {
    return [
      this.config.spriteId || 'ui-simple-4',
      this.config.hoverSpriteId || 'ui-simple-5',
      this.config.activeSpriteId || 'ui-simple-6',
    ];
  }

  /**
   * Update button configuration
   */
  updateConfig(config: Partial<CanvasButtonConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a point is within the button's bounds
   */
  contains(x: number, y: number): boolean {
    const width = this.config.width || 0;
    const height = this.config.height || 0;
    return (
      x >= this.config.x &&
      x <= this.config.x + width &&
      y >= this.config.y &&
      y <= this.config.y + height
    );
  }

  /**
   * Set the hover state of the button
   */
  setHovered(hovered: boolean): void {
    this.isHovered = hovered;
  }

  /**
   * Set the active/clicked state of the button
   */
  setActive(active: boolean): void {
    this.isActive = active;
  }

  /**
   * Handle mouse down event
   */
  handleMouseDown(x: number, y: number): boolean {
    if (this.config.enabled && this.contains(x, y)) {
      this.isActive = true;
      return true;
    }
    return false;
  }

  /**
   * Handle mouse up event
   */
  handleMouseUp(x: number, y: number): boolean {
    if (this.config.enabled && this.isActive) {
      this.isActive = false;
      // Only trigger click if mouse is still over the button
      if (this.contains(x, y)) {
        if (this.config.onClick) {
          this.config.onClick();
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Handle mouse move event (for hover detection)
   */
  handleMouseMove(x: number, y: number): boolean {
    const wasHovered = this.isHovered;
    this.isHovered = (this.config.enabled !== false) && this.contains(x, y);
    return wasHovered !== this.isHovered;
  }

  /**
   * Render the button to a canvas context
   */
  render(
    ctx: CanvasRenderingContext2D,
    spriteImages: Map<string, HTMLImageElement>
  ): void {
    // Determine which sprite to use based on state
    let spriteId = this.config.spriteId || 'ui-simple-4';
    if (this.config.enabled) {
      if (this.isActive) {
        spriteId = this.config.activeSpriteId || 'ui-simple-6';
      } else if (this.isHovered) {
        spriteId = this.config.hoverSpriteId || 'ui-simple-5';
      }
    }

    const spriteDef = SpriteRegistry.getById(spriteId);
    if (!spriteDef) {
      console.warn(`CanvasButton: Sprite "${spriteId}" not found`);
      return;
    }

    const spriteImage = spriteImages.get(spriteDef.spriteSheet);
    if (!spriteImage) {
      console.warn(`CanvasButton: Sprite sheet not loaded for "${spriteId}"`);
      return;
    }

    const { x, y } = this.config;
    const width = this.config.width || 0;
    const height = this.config.height || 0;
    const spriteSize = 12; // All sprites are 12x12
    const borderSizeInSprite = this.borderSize; // 3 pixels in the sprite
    const borderScale = 4; // Scale factor for the border
    const scaledBorderSize = borderSizeInSprite * borderScale; // 12 pixels on screen

    // Calculate source coordinates in the sprite sheet
    const srcX = spriteDef.x * spriteSize;
    const srcY = spriteDef.y * spriteSize;

    // Draw 9-slice:
    // Corners (3x3 pixels from sprite, scaled to 12x12 on screen)
    // Top-left corner
    ctx.drawImage(
      spriteImage,
      srcX, srcY, borderSizeInSprite, borderSizeInSprite,
      x, y, scaledBorderSize, scaledBorderSize
    );
    // Top-right corner
    ctx.drawImage(
      spriteImage,
      srcX + spriteSize - borderSizeInSprite, srcY, borderSizeInSprite, borderSizeInSprite,
      x + width - scaledBorderSize, y, scaledBorderSize, scaledBorderSize
    );
    // Bottom-left corner
    ctx.drawImage(
      spriteImage,
      srcX, srcY + spriteSize - borderSizeInSprite, borderSizeInSprite, borderSizeInSprite,
      x, y + height - scaledBorderSize, scaledBorderSize, scaledBorderSize
    );
    // Bottom-right corner
    ctx.drawImage(
      spriteImage,
      srcX + spriteSize - borderSizeInSprite, srcY + spriteSize - borderSizeInSprite, borderSizeInSprite, borderSizeInSprite,
      x + width - scaledBorderSize, y + height - scaledBorderSize, scaledBorderSize, scaledBorderSize
    );

    // Edges (tiled)
    // Top edge
    const topEdgeWidth = width - (scaledBorderSize * 2);
    ctx.drawImage(
      spriteImage,
      srcX + borderSizeInSprite, srcY, spriteSize - (borderSizeInSprite * 2), borderSizeInSprite,
      x + scaledBorderSize, y, topEdgeWidth, scaledBorderSize
    );
    // Bottom edge
    ctx.drawImage(
      spriteImage,
      srcX + borderSizeInSprite, srcY + spriteSize - borderSizeInSprite, spriteSize - (borderSizeInSprite * 2), borderSizeInSprite,
      x + scaledBorderSize, y + height - scaledBorderSize, topEdgeWidth, scaledBorderSize
    );
    // Left edge
    const leftEdgeHeight = height - (scaledBorderSize * 2);
    ctx.drawImage(
      spriteImage,
      srcX, srcY + borderSizeInSprite, borderSizeInSprite, spriteSize - (borderSizeInSprite * 2),
      x, y + scaledBorderSize, scaledBorderSize, leftEdgeHeight
    );
    // Right edge
    ctx.drawImage(
      spriteImage,
      srcX + spriteSize - borderSizeInSprite, srcY + borderSizeInSprite, borderSizeInSprite, spriteSize - (borderSizeInSprite * 2),
      x + width - scaledBorderSize, y + scaledBorderSize, scaledBorderSize, leftEdgeHeight
    );

    // Center fill (tiled)
    const centerWidth = width - (scaledBorderSize * 2);
    const centerHeight = height - (scaledBorderSize * 2);
    ctx.drawImage(
      spriteImage,
      srcX + borderSizeInSprite, srcY + borderSizeInSprite, spriteSize - (borderSizeInSprite * 2), spriteSize - (borderSizeInSprite * 2),
      x + scaledBorderSize, y + scaledBorderSize, centerWidth, centerHeight
    );

    // Draw label text using FontAtlasRenderer
    if (!this.config.fontAtlasImage) {
      console.warn('CanvasButton: Font atlas image not loaded');
      return;
    }

    const font = FontRegistry.getById(this.config.fontId);
    if (!font) {
      console.warn(`CanvasButton: Font '${this.config.fontId}' not found in registry`);
      return;
    }

    const fontScale = this.config.fontScale || 2;
    const textColor = this.config.enabled ? (this.config.textColor || '#ffffff') : '#888888';

    // Calculate text position (centered)
    const textX = x + width / 2;
    const fontHeight = font.charHeight * fontScale;
    const textY = y + (height / 2) - (fontHeight / 2);

    ctx.save();

    // Draw main text (no shadow)
    FontAtlasRenderer.renderText(
      ctx,
      this.config.label,
      textX,
      textY,
      this.config.fontId,
      this.config.fontAtlasImage,
      fontScale,
      'center',
      textColor
    );

    ctx.restore();
  }
}

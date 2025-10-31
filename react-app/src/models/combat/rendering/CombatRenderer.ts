import { SpriteRegistry } from '../../../utils/SpriteRegistry';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import type { CombatMap } from '../CombatMap';
import type { CombatUnitManifest } from '../CombatUnitManifest';
import { CombatConstants } from '../CombatConstants';

/**
 * Handles rendering of combat map and units
 * Separates rendering logic from component lifecycle
 */
export class CombatRenderer {
  private canvasWidth: number;
  private canvasHeight: number;
  private tileSize: number;
  private spriteSize: number;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    tileSize: number,
    spriteSize: number
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.tileSize = tileSize;
    this.spriteSize = spriteSize;
  }

  /**
   * Clear and prepare canvas for rendering
   */
  clearCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.imageSmoothingEnabled = false;
  }

  /**
   * Render the combat map (terrain tiles)
   * @param ctx - Canvas rendering context
   * @param map - Combat map to render
   * @param spriteImages - Map of loaded sprite images
   * @param offsetX - X offset for centering the map
   * @param offsetY - Y offset for centering the map
   */
  renderMap(
    ctx: CanvasRenderingContext2D,
    map: CombatMap,
    spriteImages: Map<string, HTMLImageElement>,
    offsetX: number,
    offsetY: number
  ): void {
    const allCells = map.getAllCells();

    for (const { position, cell } of allCells) {
      const x = position.x * this.tileSize + offsetX;
      const y = position.y * this.tileSize + offsetY;

      if (cell.spriteId) {
        const spriteDef = SpriteRegistry.getById(cell.spriteId);
        if (spriteDef) {
          const spriteImage = spriteImages.get(spriteDef.spriteSheet);
          if (spriteImage) {
            // Draw the sprite scaled to tile size with pixel-perfect rendering
            SpriteRenderer.renderSprite(
              ctx,
              spriteImage,
              spriteDef,
              this.spriteSize,
              x,
              y,
              this.tileSize,
              this.tileSize
            );
          } else {
            console.warn(`CombatRenderer: Sprite image not loaded for ${cell.spriteId}`);
          }
        } else {
          console.warn(`CombatRenderer: Sprite definition not found for ${cell.spriteId}`);
        }
      } else {
        // Render a default tile based on terrain type
        ctx.fillStyle = cell.walkable ? '#444444' : '#222222';
        ctx.fillRect(x, y, this.tileSize, this.tileSize);

        // Draw grid lines
        ctx.strokeStyle = '#666666';
        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
      }
    }
  }

  /**
   * Render all units on the map
   * @param ctx - Canvas rendering context
   * @param unitManifest - Combat unit manifest containing all units
   * @param spriteImages - Map of loaded sprite images
   * @param offsetX - X offset for centering the map
   * @param offsetY - Y offset for centering the map
   */
  renderUnits(
    ctx: CanvasRenderingContext2D,
    unitManifest: CombatUnitManifest,
    spriteImages: Map<string, HTMLImageElement>,
    offsetX: number,
    offsetY: number
  ): void {
    const allUnits = unitManifest.getAllUnits();

    for (const { unit, position } of allUnits) {
      const x = position.x * this.tileSize + offsetX;
      const y = position.y * this.tileSize + offsetY;

      // Get the unit's sprite
      const spriteId = unit.spriteId;
      if (spriteId) {
        const spriteDef = SpriteRegistry.getById(spriteId);
        if (spriteDef) {
          const spriteImage = spriteImages.get(spriteDef.spriteSheet);
          if (spriteImage) {
            // Apply grey tint for KO'd units
            if (unit.isKnockedOut) {
              ctx.filter = CombatConstants.KNOCKED_OUT.TINT_FILTER;
            }

            // Draw the unit sprite with pixel-perfect rendering
            SpriteRenderer.renderSprite(
              ctx,
              spriteImage,
              spriteDef,
              this.spriteSize,
              x,
              y,
              this.tileSize,
              this.tileSize
            );

            // Reset filter after rendering
            if (unit.isKnockedOut) {
              ctx.filter = 'none';
            }
          }
        }
      }
    }
  }

  /**
   * Copy buffer canvas to display canvas
   * @param displayCtx - Display canvas context
   * @param bufferCanvas - Buffer canvas to copy from
   */
  displayBuffer(displayCtx: CanvasRenderingContext2D, bufferCanvas: HTMLCanvasElement): void {
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    displayCtx.drawImage(bufferCanvas, 0, 0);
  }

  /**
   * Calculate offset to center the map on the canvas
   * @param mapWidth - Width of the map in pixels
   * @param mapHeight - Height of the map in pixels
   * @returns Object with offsetX and offsetY
   */
  calculateMapOffset(mapWidth: number, mapHeight: number): { offsetX: number; offsetY: number } {
    return {
      offsetX: (this.canvasWidth - mapWidth) / 2,
      offsetY: (this.canvasHeight - mapHeight) / 2,
    };
  }

  /**
   * Render a debug grid overlay showing tile boundaries
   * @param ctx - Canvas rendering context
   * @param fontId - Font atlas ID to use for numbers
   * @param fontAtlasImage - Font atlas image
   */
  renderDebugGrid(ctx: CanvasRenderingContext2D, fontId?: string, fontAtlasImage?: HTMLImageElement | null): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= this.canvasWidth; x += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvasHeight);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= this.canvasHeight; y += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasWidth, y);
      ctx.stroke();
    }

    // Add row and column numbers
    if (fontId && fontAtlasImage) {
      // Use atlas font for numbers
      const numCols = Math.floor(this.canvasWidth / this.tileSize);
      for (let col = 0; col < numCols; col++) {
        const x = col * this.tileSize + 1;
        FontAtlasRenderer.renderText(
          ctx,
          col.toString(),
          x,
          1,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffff00'
        );
      }

      // Number rows (along left column)
      const numRows = Math.floor(this.canvasHeight / this.tileSize);
      for (let row = 0; row < numRows; row++) {
        const y = row * this.tileSize + 1;
        FontAtlasRenderer.renderText(
          ctx,
          row.toString(),
          1,
          y,
          fontId,
          fontAtlasImage,
          1,
          'left',
          '#ffff00'
        );
      }
    } else {
      // Fallback to canvas font if atlas font not available
      ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Number columns (along top row)
      const numCols = Math.floor(this.canvasWidth / this.tileSize);
      for (let col = 0; col < numCols; col++) {
        const x = col * this.tileSize + 1;
        ctx.fillText(col.toString(), x, 1);
      }

      // Number rows (along left column)
      const numRows = Math.floor(this.canvasHeight / this.tileSize);
      for (let row = 0; row < numRows; row++) {
        const y = row * this.tileSize + 1;
        ctx.fillText(row.toString(), 1, y);
      }
    }

    ctx.restore();
  }
}

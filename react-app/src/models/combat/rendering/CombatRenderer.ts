import { SpriteRegistry } from '../../../utils/SpriteRegistry';
import type { CombatMap } from '../CombatMap';
import type { CombatUnitManifest } from '../CombatUnitManifest';

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
            // Calculate source rectangle in the sprite sheet
            const srcX = spriteDef.x * this.spriteSize;
            const srcY = spriteDef.y * this.spriteSize;
            const srcWidth = (spriteDef.width || 1) * this.spriteSize;
            const srcHeight = (spriteDef.height || 1) * this.spriteSize;

            // Draw the sprite scaled to tile size
            ctx.drawImage(
              spriteImage,
              srcX, srcY, srcWidth, srcHeight,
              x, y, this.tileSize, this.tileSize
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
            // Calculate source rectangle in the sprite sheet
            const srcX = spriteDef.x * this.spriteSize;
            const srcY = spriteDef.y * this.spriteSize;
            const srcWidth = (spriteDef.width || 1) * this.spriteSize;
            const srcHeight = (spriteDef.height || 1) * this.spriteSize;

            // Draw the unit sprite
            ctx.drawImage(
              spriteImage,
              srcX, srcY, srcWidth, srcHeight,
              x, y, this.tileSize, this.tileSize
            );
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
}

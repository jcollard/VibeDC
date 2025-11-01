import type { AreaMap } from '../../area/AreaMap';
import type { CardinalDirection } from '../../../types';
import { TileBehavior } from '../../area/TileBehavior';
import { SpriteRegistry } from '../../../utils/SpriteRegistry';

/**
 * Renders top-down minimap with fog of war
 */
export class MinimapRenderer {
  private static readonly TILE_SIZE = 6; // 6x6 pixels per tile
  private static readonly SPRITE_SIZE = 12; // Source sprite size in sheet

  /**
   * Render minimap in the given region
   */
  static render(
    ctx: CanvasRenderingContext2D,
    areaMap: AreaMap,
    playerX: number,
    playerY: number,
    direction: CardinalDirection,
    exploredTiles: Set<string>,
    regionX: number,
    regionY: number,
    regionWidth: number,
    regionHeight: number,
    tilesSpriteSheet?: HTMLImageElement | null
  ): void {
    ctx.save();

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(regionX, regionY, regionWidth, regionHeight);

    // Calculate minimap dimensions
    const mapWidth = areaMap.width;
    const mapHeight = areaMap.height;
    const mapPixelWidth = mapWidth * this.TILE_SIZE;
    const mapPixelHeight = mapHeight * this.TILE_SIZE;

    // Center the map in the region
    const offsetX = regionX + Math.floor((regionWidth - mapPixelWidth) / 2);
    const offsetY = regionY + Math.floor((regionHeight - mapPixelHeight) / 2);

    // Render explored tiles
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileKey = `${x},${y}`;

        // Only render explored tiles
        if (!exploredTiles.has(tileKey)) {
          continue; // Fog of war - leave black
        }

        const tile = areaMap.getTile(x, y);
        if (!tile) continue;

        const pixelX = offsetX + (x * this.TILE_SIZE);
        const pixelY = offsetY + (y * this.TILE_SIZE);

        // Render sprite if available, otherwise fallback to colored rectangles
        if (tilesSpriteSheet) {
          // Get sprite definition from registry using tile's spriteId
          const spriteDef = SpriteRegistry.getById(tile.spriteId);

          if (spriteDef) {
            // Calculate sprite position in sheet (assumes grid layout)
            const spriteX = spriteDef.x;
            const spriteY = spriteDef.y;

            // Draw scaled sprite (12x12 → 6x6)
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              tilesSpriteSheet,
              spriteX, // source x (already in pixels)
              spriteY, // source y (already in pixels)
              this.SPRITE_SIZE, // source width
              this.SPRITE_SIZE, // source height
              pixelX, // dest x
              pixelY, // dest y
              this.TILE_SIZE, // dest width (scaled down)
              this.TILE_SIZE  // dest height (scaled down)
            );
          } else {
            // Sprite not found, use fallback rectangle
            this.renderFallbackTile(ctx, tile, pixelX, pixelY);
          }
        } else {
          // Sprite sheet not loaded, use fallback rectangles
          this.renderFallbackTile(ctx, tile, pixelX, pixelY);
        }
      }
    }

    // Render player icon (triangle pointing in facing direction)
    const playerPixelX = offsetX + (playerX * this.TILE_SIZE) + Math.floor(this.TILE_SIZE / 2);
    const playerPixelY = offsetY + (playerY * this.TILE_SIZE) + Math.floor(this.TILE_SIZE / 2);

    ctx.fillStyle = '#00ff00'; // Green
    ctx.beginPath();

    const arrowSize = Math.max(2, Math.floor(this.TILE_SIZE / 2));

    switch (direction) {
      case 'North':
        ctx.moveTo(playerPixelX, playerPixelY - arrowSize);
        ctx.lineTo(playerPixelX - arrowSize, playerPixelY + arrowSize);
        ctx.lineTo(playerPixelX + arrowSize, playerPixelY + arrowSize);
        break;
      case 'South':
        ctx.moveTo(playerPixelX, playerPixelY + arrowSize);
        ctx.lineTo(playerPixelX - arrowSize, playerPixelY - arrowSize);
        ctx.lineTo(playerPixelX + arrowSize, playerPixelY - arrowSize);
        break;
      case 'East':
        ctx.moveTo(playerPixelX + arrowSize, playerPixelY);
        ctx.lineTo(playerPixelX - arrowSize, playerPixelY - arrowSize);
        ctx.lineTo(playerPixelX - arrowSize, playerPixelY + arrowSize);
        break;
      case 'West':
        ctx.moveTo(playerPixelX - arrowSize, playerPixelY);
        ctx.lineTo(playerPixelX + arrowSize, playerPixelY - arrowSize);
        ctx.lineTo(playerPixelX + arrowSize, playerPixelY + arrowSize);
        break;
    }

    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Render a fallback colored rectangle for a tile when sprite is unavailable
   */
  private static renderFallbackTile(
    ctx: CanvasRenderingContext2D,
    tile: import('../../area/AreaMapTile').AreaMapTile,
    pixelX: number,
    pixelY: number
  ): void {
    let color = '#333333'; // Default: dark grey

    if (tile.behavior === TileBehavior.Wall) {
      color = '#666666'; // Wall: light grey
    } else if (tile.behavior === TileBehavior.Door) {
      color = '#ffaa00'; // Door: orange
    } else if (tile.behavior === TileBehavior.Floor) {
      color = '#222222'; // Floor: very dark grey
    }

    ctx.fillStyle = color;
    ctx.fillRect(pixelX, pixelY, this.TILE_SIZE, this.TILE_SIZE);
  }
}

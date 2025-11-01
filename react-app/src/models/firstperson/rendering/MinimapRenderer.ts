import type { AreaMap } from '../../area/AreaMap';
import type { CardinalDirection } from '../../../types';
import { TileBehavior } from '../../area/TileBehavior';
import { SpriteRegistry } from '../../../utils/SpriteRegistry';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';

/**
 * Renders top-down minimap with fog of war
 */
export class MinimapRenderer {
  private static readonly TILE_SIZE = 12; // 12x12 pixels per tile
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
    spriteImages: Map<string, HTMLImageElement>
  ): void {
    ctx.save();

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(regionX, regionY, regionWidth, regionHeight);

    // Player arrow is centered in the panel
    const centerX = regionX + Math.floor((regionWidth - this.TILE_SIZE) / 2);
    const centerY = regionY + Math.floor((regionHeight - this.TILE_SIZE) / 2);

    // Calculate how many tiles fit in the panel
    const tilesWide = Math.floor(regionWidth / this.TILE_SIZE);
    const tilesHigh = Math.floor(regionHeight / this.TILE_SIZE);
    const halfWide = Math.floor(tilesWide / 2);
    const halfHigh = Math.floor(tilesHigh / 2);

    // Render tiles relative to player position
    ctx.imageSmoothingEnabled = false;

    for (let dy = -halfHigh; dy <= halfHigh; dy++) {
      for (let dx = -halfWide; dx <= halfWide; dx++) {
        // Skip the center tile (player position)
        if (dx === 0 && dy === 0) continue;

        const mapX = playerX + dx;
        const mapY = playerY + dy;
        const tileKey = `${mapX},${mapY}`;

        // Only render explored tiles
        if (!exploredTiles.has(tileKey)) {
          continue; // Fog of war - leave black
        }

        const tile = areaMap.getTile(mapX, mapY);
        if (!tile) continue;

        // Calculate pixel position relative to center
        const pixelX = centerX + (dx * this.TILE_SIZE);
        const pixelY = centerY + (dy * this.TILE_SIZE);

        // Render sprite using SpriteRenderer
        const rendered = SpriteRenderer.renderSpriteById(
          ctx,
          tile.spriteId,
          spriteImages,
          this.SPRITE_SIZE,
          pixelX,
          pixelY,
          this.TILE_SIZE,
          this.TILE_SIZE
        );

        // If sprite failed to render, use fallback colored rectangle
        if (!rendered) {
          this.renderFallbackTile(ctx, tile, pixelX, pixelY);
        }
      }
    }

    // Select arrow sprite based on direction
    let arrowSpriteId: string;
    switch (direction) {
      case 'North':
        arrowSpriteId = 'minimap-7'; // up-north
        break;
      case 'South':
        arrowSpriteId = 'minimap-9'; // down-south
        break;
      case 'East':
        arrowSpriteId = 'minimap-6'; // right-east
        break;
      case 'West':
        arrowSpriteId = 'minimap-8'; // left-west
        break;
    }

    // Render player arrow sprite in center (on top of tiles)
    SpriteRenderer.renderSpriteById(
      ctx,
      arrowSpriteId,
      spriteImages,
      this.SPRITE_SIZE,
      centerX,
      centerY,
      this.TILE_SIZE,
      this.TILE_SIZE
    );

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

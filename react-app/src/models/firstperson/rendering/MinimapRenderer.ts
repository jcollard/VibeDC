import type { AreaMap } from '../../area/AreaMap';
import type { CardinalDirection } from '../../../types';

/**
 * Renders top-down minimap with fog of war
 */
export class MinimapRenderer {
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
    regionHeight: number
  ): void {
    ctx.save();

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(regionX, regionY, regionWidth, regionHeight);

    // Calculate tile size for minimap
    const mapWidth = areaMap.width;
    const mapHeight = areaMap.height;
    const tileSize = Math.min(
      Math.floor(regionWidth / mapWidth),
      Math.floor(regionHeight / mapHeight)
    );

    // Center the map in the region
    const mapPixelWidth = mapWidth * tileSize;
    const mapPixelHeight = mapHeight * tileSize;
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

        // Choose color based on tile type
        let color = '#333333'; // Default: dark grey

        if (!tile.walkable) {
          color = '#666666'; // Wall: light grey
        } else if (tile.behavior === 'door') {
          color = '#ffaa00'; // Door: orange
        } else {
          color = '#222222'; // Floor: very dark grey
        }

        const pixelX = offsetX + (x * tileSize);
        const pixelY = offsetY + (y * tileSize);

        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
      }
    }

    // Render player icon (triangle pointing in facing direction)
    const playerPixelX = offsetX + (playerX * tileSize) + Math.floor(tileSize / 2);
    const playerPixelY = offsetY + (playerY * tileSize) + Math.floor(tileSize / 2);

    ctx.fillStyle = '#00ff00'; // Green
    ctx.beginPath();

    const arrowSize = Math.max(2, Math.floor(tileSize / 2));

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
}

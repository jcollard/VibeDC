import type { CombatLayoutRenderer } from '../layouts/CombatLayoutRenderer';

/**
 * Handles map rendering offset calculations with support for scrolling and clipping
 * Encapsulates the complex logic for positioning maps within layout viewports
 */
export class CombatMapRenderer {
  private readonly tileSize: number;
  private readonly layoutRenderer: CombatLayoutRenderer;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;

  // Offset adjustments for wall borders
  private readonly horizontalBorderOffset = -6; // px
  private readonly verticalBorderOffset = 0; // px

  constructor(
    tileSize: number,
    layoutRenderer: CombatLayoutRenderer,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.tileSize = tileSize;
    this.layoutRenderer = layoutRenderer;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Calculate the map rendering offsets based on map size, scroll position, and clipping
   * @param mapWidthInTiles - Width of the map in tiles
   * @param mapHeightInTiles - Height of the map in tiles
   * @param scrollX - Horizontal scroll offset in tiles
   * @param scrollY - Vertical scroll offset in tiles
   * @returns Object with offsetX and offsetY in pixels
   */
  calculateMapOffset(
    mapWidthInTiles: number,
    mapHeightInTiles: number,
    scrollX: number,
    scrollY: number
  ): { offsetX: number; offsetY: number } {
    const mapWidth = mapWidthInTiles * this.tileSize;
    const mapHeight = mapHeightInTiles * this.tileSize;

    const viewport = this.layoutRenderer.getMapViewport(this.canvasWidth, this.canvasHeight);
    const clipRegion = this.layoutRenderer.getMapClipRegion();
    const clipWidthCalc = (clipRegion.maxCol - clipRegion.minCol + 1) * this.tileSize + 4;
    const clipHeightCalc = (clipRegion.maxRow - clipRegion.minRow + 1) * this.tileSize + 4 + 4;

    // Calculate horizontal offset
    let offsetX = viewport.x;
    if (mapWidth <= clipWidthCalc) {
      // Map fits within clipping area - center it horizontally
      offsetX = viewport.x + (clipWidthCalc - mapWidth) / 2;
    } else {
      // Map is larger - apply scroll offset with border adjustment
      offsetX = viewport.x - (scrollX * this.tileSize) + this.horizontalBorderOffset;
    }

    // Calculate vertical offset
    let offsetY = viewport.y;
    if (mapHeight <= clipHeightCalc) {
      // Map fits within clipping area - center it vertically
      const clipTopY = clipRegion.minRow * this.tileSize - 4;
      offsetY = clipTopY + (clipHeightCalc - mapHeight) / 2;
    } else {
      // Map is larger - apply scroll offset with border adjustment
      offsetY = viewport.y - (scrollY * this.tileSize) + this.verticalBorderOffset;
    }

    return { offsetX, offsetY };
  }

  /**
   * Calculate the maximum scroll values for the map
   * @param mapWidthInTiles - Width of the map in tiles
   * @param mapHeightInTiles - Height of the map in tiles
   * @returns Object with maxScrollX and maxScrollY
   */
  calculateMaxScroll(
    mapWidthInTiles: number,
    mapHeightInTiles: number
  ): { maxScrollX: number; maxScrollY: number } {
    const clipRegion = this.layoutRenderer.getMapClipRegion();
    const clipWidthInTiles = clipRegion.maxCol - clipRegion.minCol + 1;
    const clipHeightInTiles = clipRegion.maxRow - clipRegion.minRow + 1;

    // Reduce max horizontal scroll by 1 tile due to 6px left offset for wall border
    const maxScrollX = Math.max(0, mapWidthInTiles - clipWidthInTiles - 1);

    // Reduce max vertical scroll by 2 tiles
    const maxScrollY = Math.max(0, mapHeightInTiles - clipHeightInTiles - 2);

    return { maxScrollX, maxScrollY };
  }

  /**
   * Check if the map can scroll in each direction
   * @param mapWidthInTiles - Width of the map in tiles
   * @param mapHeightInTiles - Height of the map in tiles
   * @param scrollX - Current horizontal scroll position
   * @param scrollY - Current vertical scroll position
   * @returns Object with boolean flags for each direction
   */
  getScrollCapabilities(
    mapWidthInTiles: number,
    mapHeightInTiles: number,
    scrollX: number,
    scrollY: number
  ): { canScrollRight: boolean; canScrollLeft: boolean; canScrollUp: boolean; canScrollDown: boolean } {
    const { maxScrollX, maxScrollY } = this.calculateMaxScroll(mapWidthInTiles, mapHeightInTiles);

    return {
      canScrollRight: scrollX < maxScrollX,
      canScrollLeft: scrollX > 0,
      canScrollDown: scrollY < maxScrollY,
      canScrollUp: scrollY > 0,
    };
  }

  /**
   * Convert canvas coordinates to tile coordinates, accounting for offset and scroll
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param scrollX - Horizontal scroll offset in tiles
   * @param scrollY - Vertical scroll offset in tiles
   * @param mapWidthInTiles - Width of the map in tiles
   * @param mapHeightInTiles - Height of the map in tiles
   * @returns Tile coordinates or null if outside map bounds
   */
  canvasToTileCoordinates(
    canvasX: number,
    canvasY: number,
    scrollX: number,
    scrollY: number,
    mapWidthInTiles: number,
    mapHeightInTiles: number
  ): { tileX: number; tileY: number } | null {
    const { offsetX, offsetY } = this.calculateMapOffset(
      mapWidthInTiles,
      mapHeightInTiles,
      scrollX,
      scrollY
    );

    // Convert canvas coordinates to map pixel coordinates
    const mapPixelX = canvasX - offsetX;
    const mapPixelY = canvasY - offsetY;

    // Convert to tile coordinates
    const tileX = Math.floor(mapPixelX / this.tileSize);
    const tileY = Math.floor(mapPixelY / this.tileSize);

    // Check if within bounds
    if (tileX < 0 || tileX >= mapWidthInTiles || tileY < 0 || tileY >= mapHeightInTiles) {
      return null;
    }

    return { tileX, tileY };
  }
}

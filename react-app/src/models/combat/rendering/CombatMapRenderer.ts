import type { CombatLayoutRenderer } from '../layouts/CombatLayoutRenderer';

/**
 * Event handler for map tile clicks
 */
export type MapClickHandler = (tileX: number, tileY: number) => void;

/**
 * Handles map rendering offset calculations with support for scrolling and clipping
 * Encapsulates the complex logic for positioning maps within layout viewports
 * Also manages map click events and coordinate conversions
 */
export class CombatMapRenderer {
  private readonly tileSize: number;
  private readonly layoutRenderer: CombatLayoutRenderer;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;

  // Offset adjustments for wall borders
  private readonly horizontalBorderOffset = -6; // px
  private readonly verticalBorderOffset = 0; // px

  // Event handlers
  private mapClickHandlers: MapClickHandler[] = [];

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
   * Register a handler to be called when the map is clicked
   * @param handler - Function to call with tile coordinates
   * @returns Unsubscribe function
   */
  onMapClick(handler: MapClickHandler): () => void {
    this.mapClickHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.mapClickHandlers.indexOf(handler);
      if (index !== -1) {
        this.mapClickHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Handle a canvas click event and notify all registered handlers if it's on the map
   * @param canvasX - X coordinate on canvas
   * @param canvasY - Y coordinate on canvas
   * @param scrollX - Current horizontal scroll position
   * @param scrollY - Current vertical scroll position
   * @param mapWidthInTiles - Width of the map in tiles
   * @param mapHeightInTiles - Height of the map in tiles
   * @returns true if the click was on the map, false otherwise
   */
  handleMapClick(
    canvasX: number,
    canvasY: number,
    scrollX: number,
    scrollY: number,
    mapWidthInTiles: number,
    mapHeightInTiles: number
  ): boolean {
    const coords = this.canvasToTileCoordinates(
      canvasX,
      canvasY,
      scrollX,
      scrollY,
      mapWidthInTiles,
      mapHeightInTiles
    );

    if (coords) {
      // Notify all registered handlers
      this.mapClickHandlers.forEach(handler => {
        handler(coords.tileX, coords.tileY);
      });
      return true;
    }

    return false;
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

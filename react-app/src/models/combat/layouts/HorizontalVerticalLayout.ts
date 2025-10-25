import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { CombatConstants } from '../CombatConstants';

/**
 * Defines a rectangular region in the layout.
 * Coordinates are in pixels, but sizes are defined using tile dimensions.
 */
export interface LayoutRegion {
  /** Name identifier for the region */
  name: string;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Width in tiles */
  widthTiles: number;
  /** Height in tiles */
  heightTiles: number;
}

/**
 * Configuration for the HorizontalVerticalLayout.
 */
export interface HorizontalVerticalLayoutConfig {
  /** Regions that define the layout */
  regions: LayoutRegion[];
  /** Sprite ID for connector (at intersections), defaults to 'frames2-0' */
  connectorSpriteId?: string;
  /** Sprite ID for horizontal dividers, defaults to 'frames2-1' */
  horizontalSpriteId?: string;
  /** Sprite ID for vertical dividers, defaults to 'frames2-2' */
  verticalSpriteId?: string;
}

/**
 * A layout system that uses simple sprites to draw dividers between rectangular regions.
 * Uses 3 sprite types:
 * - Connector sprite: Used at intersections where horizontal and vertical splits meet
 * - Horizontal sprite: Used for horizontal divider lines
 * - Vertical sprite: Used for vertical divider lines
 */
export class HorizontalVerticalLayout {
  private readonly regions: LayoutRegion[];
  private readonly connectorSpriteId: string;
  private readonly horizontalSpriteId: string;
  private readonly verticalSpriteId: string;
  private readonly tileSize: number;

  constructor(config: HorizontalVerticalLayoutConfig) {
    this.regions = config.regions;
    this.connectorSpriteId = config.connectorSpriteId || 'frames2-0';
    this.horizontalSpriteId = config.horizontalSpriteId || 'frames2-1';
    this.verticalSpriteId = config.verticalSpriteId || 'frames2-2';
    this.tileSize = CombatConstants.TILE_SIZE;
  }

  /**
   * Gets a region by name.
   */
  getRegion(name: string): LayoutRegion | undefined {
    return this.regions.find(r => r.name === name);
  }

  /**
   * Gets the pixel dimensions of a region.
   */
  getRegionPixelBounds(name: string): { x: number; y: number; width: number; height: number } | undefined {
    const region = this.getRegion(name);
    if (!region) return undefined;

    return {
      x: region.x,
      y: region.y,
      width: region.widthTiles * this.tileSize,
      height: region.heightTiles * this.tileSize,
    };
  }

  /**
   * Renders the layout dividers.
   * This should be called after rendering backgrounds but before rendering content.
   */
  render(
    ctx: CanvasRenderingContext2D,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    // Extract unique horizontal and vertical edges from regions
    const horizontalEdges = this.extractHorizontalEdges();
    const verticalEdges = this.extractVerticalEdges();

    // Find intersections
    const intersections = this.findIntersections(horizontalEdges, verticalEdges);

    // Render horizontal dividers
    for (const edge of horizontalEdges) {
      this.renderHorizontalDivider(ctx, edge, intersections, spriteImages, spriteSize);
    }

    // Render vertical dividers
    for (const edge of verticalEdges) {
      this.renderVerticalDivider(ctx, edge, intersections, spriteImages, spriteSize);
    }

    // Render connectors at intersections
    for (const intersection of intersections) {
      SpriteRenderer.renderSpriteById(
        ctx,
        this.connectorSpriteId,
        spriteImages,
        spriteSize,
        intersection.x,
        intersection.y,
        this.tileSize,
        this.tileSize
      );
    }
  }

  /**
   * Extracts horizontal edges (dividers) from regions.
   * Returns edges as { y: number, x1: number, x2: number }
   */
  private extractHorizontalEdges(): Array<{ y: number; x1: number; x2: number }> {
    const edges: Array<{ y: number; x1: number; x2: number }> = [];

    for (const region of this.regions) {
      const bottomY = region.y + region.heightTiles * this.tileSize;
      const rightX = region.x + region.widthTiles * this.tileSize;

      // Check if there's a region below this one (horizontally aligned)
      const hasRegionBelow = this.regions.some(other => {
        return other !== region &&
               other.y === bottomY &&
               this.rangesOverlap(region.x, rightX, other.x, other.x + other.widthTiles * this.tileSize);
      });

      if (hasRegionBelow) {
        // Find the overlapping x-range
        const overlappingRegions = this.regions.filter(other => {
          return other !== region &&
                 other.y === bottomY &&
                 this.rangesOverlap(region.x, rightX, other.x, other.x + other.widthTiles * this.tileSize);
        });

        for (const other of overlappingRegions) {
          const otherRightX = other.x + other.widthTiles * this.tileSize;
          const x1 = Math.max(region.x, other.x);
          const x2 = Math.min(rightX, otherRightX);

          // Add edge if not already present
          if (!edges.some(e => e.y === bottomY && e.x1 === x1 && e.x2 === x2)) {
            edges.push({ y: bottomY, x1, x2 });
          }
        }
      }
    }

    return edges;
  }

  /**
   * Extracts vertical edges (dividers) from regions.
   * Returns edges as { x: number, y1: number, y2: number }
   */
  private extractVerticalEdges(): Array<{ x: number; y1: number; y2: number }> {
    const edges: Array<{ x: number; y1: number; y2: number }> = [];

    for (const region of this.regions) {
      const rightX = region.x + region.widthTiles * this.tileSize;
      const bottomY = region.y + region.heightTiles * this.tileSize;

      // Check if there's a region to the right of this one (vertically aligned)
      const hasRegionRight = this.regions.some(other => {
        return other !== region &&
               other.x === rightX &&
               this.rangesOverlap(region.y, bottomY, other.y, other.y + other.heightTiles * this.tileSize);
      });

      if (hasRegionRight) {
        // Find the overlapping y-range
        const overlappingRegions = this.regions.filter(other => {
          return other !== region &&
                 other.x === rightX &&
                 this.rangesOverlap(region.y, bottomY, other.y, other.y + other.heightTiles * this.tileSize);
        });

        for (const other of overlappingRegions) {
          const otherBottomY = other.y + other.heightTiles * this.tileSize;
          const y1 = Math.max(region.y, other.y);
          const y2 = Math.min(bottomY, otherBottomY);

          // Add edge if not already present
          if (!edges.some(e => e.x === rightX && e.y1 === y1 && e.y2 === y2)) {
            edges.push({ x: rightX, y1, y2 });
          }
        }
      }
    }

    return edges;
  }

  /**
   * Finds intersections between horizontal and vertical edges.
   */
  private findIntersections(
    horizontalEdges: Array<{ y: number; x1: number; x2: number }>,
    verticalEdges: Array<{ x: number; y1: number; y2: number }>
  ): Array<{ x: number; y: number }> {
    const intersections: Array<{ x: number; y: number }> = [];

    for (const hEdge of horizontalEdges) {
      for (const vEdge of verticalEdges) {
        // Check if the vertical edge crosses the horizontal edge
        if (vEdge.x >= hEdge.x1 && vEdge.x <= hEdge.x2 &&
            hEdge.y >= vEdge.y1 && hEdge.y <= vEdge.y2) {
          intersections.push({ x: vEdge.x, y: hEdge.y });
        }
      }
    }

    return intersections;
  }

  /**
   * Renders a horizontal divider line.
   */
  private renderHorizontalDivider(
    ctx: CanvasRenderingContext2D,
    edge: { y: number; x1: number; x2: number },
    intersections: Array<{ x: number; y: number }>,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    // Render horizontal sprites along the edge, skipping intersections
    for (let x = edge.x1; x < edge.x2; x += this.tileSize) {
      // Skip if this position is an intersection
      const isIntersection = intersections.some(i => i.x === x && i.y === edge.y);
      if (isIntersection) continue;

      SpriteRenderer.renderSpriteById(
        ctx,
        this.horizontalSpriteId,
        spriteImages,
        spriteSize,
        x,
        edge.y,
        this.tileSize,
        this.tileSize
      );
    }
  }

  /**
   * Renders a vertical divider line.
   */
  private renderVerticalDivider(
    ctx: CanvasRenderingContext2D,
    edge: { x: number; y1: number; y2: number },
    intersections: Array<{ x: number; y: number }>,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    // Render vertical sprites along the edge, skipping intersections
    for (let y = edge.y1; y < edge.y2; y += this.tileSize) {
      // Skip if this position is an intersection
      const isIntersection = intersections.some(i => i.x === edge.x && i.y === y);
      if (isIntersection) continue;

      SpriteRenderer.renderSpriteById(
        ctx,
        this.verticalSpriteId,
        spriteImages,
        spriteSize,
        edge.x,
        y,
        this.tileSize,
        this.tileSize
      );
    }
  }

  /**
   * Checks if two ranges overlap.
   */
  private rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
    return a1 < b2 && b1 < a2;
  }
}

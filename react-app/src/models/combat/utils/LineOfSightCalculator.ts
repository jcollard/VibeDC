import type { Position } from '../../../types';
import type { CombatMap } from '../CombatMap';
import type { CombatUnitManifest } from '../CombatUnitManifest';

export interface LineOfSightOptions {
  from: Position;
  to: Position;
  map: CombatMap;
  unitManifest: CombatUnitManifest;
}

/**
 * Calculates line of sight between positions using Bresenham's algorithm
 */
export class LineOfSightCalculator {
  /**
   * Check if there is a clear line of sight between two positions
   * Uses Bresenham's line algorithm to trace the path
   *
   * Line of sight is blocked by:
   * - Non-walkable terrain (walls, obstacles)
   * - Other units (both friendly and enemy)
   *
   * @param options - Line of sight calculation parameters
   * @returns true if line of sight is clear, false if blocked
   */
  static hasLineOfSight(options: LineOfSightOptions): boolean {
    const { from, to, map, unitManifest } = options;

    // Get all positions along the line between from and to
    const linePositions = this.getLinePositions(from, to);

    // Check each position along the line (excluding start and end)
    for (let i = 1; i < linePositions.length - 1; i++) {
      const pos = linePositions[i];

      // Check if out of bounds
      if (!map.isInBounds(pos)) {
        return false;
      }

      // Check if terrain blocks line of sight
      if (!map.isWalkable(pos)) {
        return false;
      }

      // Check if a unit blocks line of sight (KO'd units don't block - they're lying down)
      const unitAtPosition = unitManifest.getUnitAtPosition(pos);
      if (unitAtPosition && !unitAtPosition.isKnockedOut) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all positions along a line from start to end using Bresenham's algorithm
   *
   * @param from - Starting position
   * @param to - Ending position
   * @returns Array of positions along the line (includes start and end)
   */
  static getLinePositions(from: Position, to: Position): Position[] {
    const positions: Position[] = [];

    let x0 = from.x;
    let y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      positions.push({ x: x0, y: y0 });

      // Reached the end
      if (x0 === x1 && y0 === y1) {
        break;
      }

      const e2 = 2 * err;

      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }

      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return positions;
  }
}

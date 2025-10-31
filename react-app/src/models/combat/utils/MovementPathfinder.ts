import type { Position } from '../../../types';
import type { CombatMap } from '../CombatMap';
import type { CombatUnitManifest } from '../CombatUnitManifest';
import type { CombatUnit } from '../CombatUnit';

export interface PathfindingOptions {
  start: Position;
  end: Position;
  maxRange: number;
  map: CombatMap;
  unitManifest: CombatUnitManifest;
  activeUnit: CombatUnit;
}

/**
 * Calculates shortest orthogonal paths for unit movement
 * Uses BFS to find the shortest path from start to end
 */
export class MovementPathfinder {
  /**
   * Calculate shortest orthogonal path from start to end
   * Returns path including destination, excluding start position
   * Returns empty array if no valid path exists
   *
   * @param options - Pathfinding parameters
   * @returns Ordered array of positions from start (exclusive) to end (inclusive)
   */
  static calculatePath(options: PathfindingOptions): Position[] {
    const { start, end, maxRange, map } = options;
    // Note: unitManifest and activeUnit no longer used - pathfinding ignores all units

    // BFS queue with path tracking
    const queue: Array<{ position: Position; path: Position[] }> = [];
    const visited = new Set<string>();

    queue.push({ position: start, path: [] });
    visited.add(this.positionKey(start));

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Found destination
      if (current.position.x === end.x && current.position.y === end.y) {
        return current.path;
      }

      // Max range check (path length, not including start)
      if (current.path.length >= maxRange) continue;

      // Explore orthogonal neighbors
      const neighbors = this.getOrthogonalNeighbors(current.position);

      for (const neighbor of neighbors) {
        const key = this.positionKey(neighbor);
        if (visited.has(key)) continue;

        // Bounds and walkability
        if (!map.isInBounds(neighbor)) continue;
        if (!map.isWalkable(neighbor)) continue;

        // Unit collision: Allow pathing through ALL units for distance calculation
        // Note: Units cannot END movement on occupied tiles (handled by MovementRangeCalculator)
        // but CAN path through them to calculate distances
        // This allows AI to correctly calculate distances even when other units are in the way

        visited.add(key);
        queue.push({
          position: neighbor,
          path: [...current.path, neighbor] // Include neighbor in path
        });
      }
    }

    // No valid path found
    return [];
  }

  /**
   * Get orthogonal neighbors (up, down, left, right)
   */
  private static getOrthogonalNeighbors(position: Position): Position[] {
    return [
      { x: position.x, y: position.y - 1 }, // Up
      { x: position.x, y: position.y + 1 }, // Down
      { x: position.x - 1, y: position.y }, // Left
      { x: position.x + 1, y: position.y }, // Right
    ];
  }

  /**
   * Convert position to string key for Set/Map
   */
  private static positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }
}

import type { Position } from '../../../types';
import type { CombatMap } from '../CombatMap';
import type { CombatUnitManifest } from '../CombatUnitManifest';
import type { CombatUnit } from '../CombatUnit';

export interface MovementRangeOptions {
  startPosition: Position;
  movement: number;
  map: CombatMap;
  unitManifest: CombatUnitManifest;
  activeUnit: CombatUnit;
}

interface QueueNode {
  position: Position;
  remainingMovement: number;
}

/**
 * Calculates movement ranges for units using flood-fill pathfinding
 */
export class MovementRangeCalculator {
  /**
   * Calculate all tiles reachable within movement range
   * Uses flood-fill (BFS) algorithm with orthogonal movement only
   *
   * @param options - Movement calculation parameters
   * @returns Array of reachable positions (excludes starting position)
   */
  static calculateReachableTiles(options: MovementRangeOptions): Position[] {
    const { startPosition, movement, map, unitManifest, activeUnit } = options;
    const reachable: Position[] = [];
    const visited = new Set<string>();
    const queue: QueueNode[] = [];

    // Start BFS from initial position
    queue.push({ position: startPosition, remainingMovement: movement });
    visited.add(this.positionKey(startPosition));

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.remainingMovement <= 0) continue;

      // Check all 4 orthogonal neighbors
      const neighbors = this.getOrthogonalNeighbors(current.position);

      for (const neighbor of neighbors) {
        // Skip if already visited
        const key = this.positionKey(neighbor);
        if (visited.has(key)) continue;

        // Skip if out of bounds
        if (!map.isInBounds(neighbor)) continue;

        // Skip if not walkable terrain
        if (!map.isWalkable(neighbor)) continue;

        // Check if tile is occupied
        const unitAtPosition = unitManifest.getUnitAtPosition(neighbor);

        if (unitAtPosition) {
          // Can path through friendly units, but cannot stop on them
          if (this.isFriendly(activeUnit, unitAtPosition)) {
            // Mark as visited to continue pathfinding through this tile
            visited.add(key);
            queue.push({
              position: neighbor,
              remainingMovement: current.remainingMovement - 1
            });
          }
          // Skip adding to reachable (cannot end movement here)
          continue;
        }

        // Tile is reachable
        visited.add(key);
        reachable.push(neighbor);
        queue.push({
          position: neighbor,
          remainingMovement: current.remainingMovement - 1
        });
      }
    }

    return reachable;
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
   * Check if two units are friendly (same team)
   */
  private static isFriendly(unit1: CombatUnit, unit2: CombatUnit): boolean {
    return unit1.isPlayerControlled === unit2.isPlayerControlled;
  }

  /**
   * Convert position to string key for Set/Map
   */
  private static positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }
}

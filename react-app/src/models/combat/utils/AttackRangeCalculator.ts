import type { Position } from '../../../types';
import type { CombatMap } from '../CombatMap';
import type { CombatUnitManifest } from '../CombatUnitManifest';
import { LineOfSightCalculator } from './LineOfSightCalculator';

export interface AttackRangeOptions {
  attackerPosition: Position;
  minRange: number;
  maxRange: number;
  map: CombatMap;
  unitManifest: CombatUnitManifest;
}

export interface AttackRangeTiles {
  /** All tiles within weapon range (orthogonal distance) */
  inRange: Position[];
  /** Tiles within range but blocked by obstacles/units (no line of sight) */
  blocked: Position[];
  /** Valid enemy targets (in range + clear line of sight) */
  validTargets: Position[];
}

/**
 * Calculates attack ranges for weapons
 */
export class AttackRangeCalculator {
  /**
   * Calculate attack range tiles for a unit
   *
   * @param options - Attack range calculation parameters
   * @returns Object containing categorized tile positions
   */
  static calculateAttackRange(options: AttackRangeOptions): AttackRangeTiles {
    const { attackerPosition, minRange, maxRange, map, unitManifest } = options;

    const inRange: Position[] = [];
    const blocked: Position[] = [];
    const validTargets: Position[] = [];

    // Get all tiles within the weapon's range using orthogonal distance
    const tilesInRange = this.getTilesInRange(attackerPosition, minRange, maxRange, map);

    for (const tile of tilesInRange) {
      inRange.push(tile);

      // Check if tile is a wall (non-walkable terrain)
      if (!map.isWalkable(tile)) {
        blocked.push(tile);
        continue;
      }

      // Check line of sight
      const hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: attackerPosition,
        to: tile,
        map,
        unitManifest
      });

      if (!hasLoS) {
        blocked.push(tile);
        continue;
      }

      // Check if there's any unit at this position (friendly fire allowed)
      const unitAtPosition = unitManifest.getUnitAtPosition(tile);
      if (unitAtPosition) {
        validTargets.push(tile);
      }
    }

    return { inRange, blocked, validTargets };
  }

  /**
   * Get all tiles within range using orthogonal distance (Manhattan distance)
   *
   * @param center - Center position
   * @param minRange - Minimum range (inclusive)
   * @param maxRange - Maximum range (inclusive)
   * @param map - Combat map for bounds checking
   * @returns Array of positions within range
   */
  private static getTilesInRange(
    center: Position,
    minRange: number,
    maxRange: number,
    map: CombatMap
  ): Position[] {
    const tiles: Position[] = [];

    // Check all positions in a square around the center
    for (let dx = -maxRange; dx <= maxRange; dx++) {
      for (let dy = -maxRange; dy <= maxRange; dy++) {
        const pos = { x: center.x + dx, y: center.y + dy };

        // Skip if out of bounds
        if (!map.isInBounds(pos)) {
          continue;
        }

        // Calculate orthogonal distance (Manhattan distance)
        const distance = Math.abs(dx) + Math.abs(dy);

        // Check if within range
        if (distance >= minRange && distance <= maxRange) {
          tiles.push(pos);
        }
      }
    }

    return tiles;
  }
}

import type { CombatUnit } from './CombatUnit';
import type { Position } from '../../types';
import { CombatConstants } from './CombatConstants';

/**
 * Animates a unit moving along a path from tile to tile
 *
 * Animation behavior:
 * - Moves along provided path at configured speed (seconds per tile)
 * - Interpolates smoothly between tile positions
 * - Does NOT update unit position in manifest (caller handles state update)
 * - Completes when unit reaches final destination
 *
 * Usage:
 * 1. Create sequence with unit, start position, and path
 * 2. Call update() each frame to advance animation
 * 3. Call getUnitRenderPosition() to get interpolated position for rendering
 * 4. When update() returns true, animation is complete
 */
export class UnitMovementSequence {
  private unit: CombatUnit;
  private path: Position[]; // Path excluding start, including destination
  private startPosition: Position;

  private currentSegment: number = 0; // Which path segment (0 = start → path[0])
  private segmentProgress: number = 0; // 0.0 to 1.0 within current segment
  private elapsedTime: number = 0;

  private readonly speedPerTile: number;

  /**
   * @param unit - The unit to animate
   * @param startPosition - Starting position (not in path array)
   * @param path - Movement path (excluding start, including destination)
   * @param speedPerTile - Seconds per tile (default from constants)
   */
  constructor(
    unit: CombatUnit,
    startPosition: Position,
    path: Position[],
    speedPerTile?: number
  ) {
    this.unit = unit;
    this.startPosition = startPosition;
    this.path = path;
    this.speedPerTile = speedPerTile ?? CombatConstants.UNIT_TURN.MOVEMENT_SPEED_PER_TILE;

    if (this.path.length === 0) {
      console.warn('[UnitMovementSequence] Empty path provided - animation will complete immediately');
    }
  }

  /**
   * Update animation state
   * @param deltaTime - Time elapsed since last update in seconds
   * @returns True if animation is complete, false otherwise
   */
  update(deltaTime: number): boolean {
    if (this.path.length === 0) {
      return true; // Empty path = complete immediately
    }

    this.elapsedTime += deltaTime;

    // Calculate segment progress
    this.segmentProgress = this.elapsedTime / this.speedPerTile;

    // Advance to next segment if current is complete
    while (this.segmentProgress >= 1.0 && this.currentSegment < this.path.length - 1) {
      this.segmentProgress -= 1.0;
      this.elapsedTime -= this.speedPerTile;
      this.currentSegment++;
    }

    // Clamp final segment
    if (this.segmentProgress >= 1.0) {
      this.segmentProgress = 1.0;
    }

    // Animation complete when reached last segment at progress 1.0
    return this.currentSegment >= this.path.length - 1 && this.segmentProgress >= 1.0;
  }

  /**
   * Get the interpolated render position for the unit
   * Called by phase handler during unit rendering
   */
  getUnitRenderPosition(): Position {
    if (this.path.length === 0) {
      return this.startPosition;
    }

    // Determine current segment start and end positions
    const segmentStart = this.currentSegment === 0
      ? this.startPosition
      : this.path[this.currentSegment - 1];

    const segmentEnd = this.path[this.currentSegment];

    // Linear interpolation
    const x = segmentStart.x + (segmentEnd.x - segmentStart.x) * this.segmentProgress;
    const y = segmentStart.y + (segmentEnd.y - segmentStart.y) * this.segmentProgress;

    return { x, y };
  }

  /**
   * Get the final destination position
   */
  getDestination(): Position {
    if (this.path.length === 0) {
      return this.startPosition;
    }
    return this.path[this.path.length - 1];
  }

  /**
   * Get the unit being animated (for rendering)
   */
  getUnit(): CombatUnit {
    return this.unit;
  }
}

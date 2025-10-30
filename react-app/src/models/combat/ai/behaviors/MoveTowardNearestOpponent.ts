import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext } from '../types/AIContext';
import type { Position } from '../../../../types';

/**
 * Move toward the nearest opponent without attacking.
 * Used when enemies cannot reach attack range this turn.
 *
 * Priority: 10 (default, above DefaultBehavior)
 *
 * Decision Logic:
 * - Finds all enemy units on the battlefield
 * - Selects nearest enemy by Manhattan distance
 * - Moves as close as possible toward that enemy
 * - Does NOT attack (move-only)
 *
 * Use Case:
 * - Fallback when no enemies are in movement + attack range
 * - Ensures enemies always advance toward combat
 * - Priority just above DefaultBehavior (end turn)
 */
export class MoveTowardNearestOpponent implements AIBehavior {
  readonly type = 'MoveTowardNearestOpponent';
  readonly priority: number;
  readonly config?: unknown;

  constructor(priority: number = 10, config?: unknown) {
    this.priority = priority;
    this.config = config;
  }

  canExecute(context: AIContext): boolean {
    // Can execute if there are any enemy units on the battlefield
    // and we have movement range available
    return context.enemyUnits.length > 0 && context.movementRange.length > 0;
  }

  decide(context: AIContext): AIDecision | null {
    if (context.enemyUnits.length === 0) return null;

    // Find nearest enemy by Manhattan distance
    let nearestEnemy = context.enemyUnits[0];
    let nearestDistance = context.getDistance(
      context.selfPosition,
      nearestEnemy.position
    );

    for (const enemy of context.enemyUnits.slice(1)) {
      const distance = context.getDistance(context.selfPosition, enemy.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    // Find the movement position that gets us closest to the nearest enemy
    let bestMovePosition: Position | null = null;
    let bestDistanceToEnemy = Infinity;

    for (const movePos of context.movementRange) {
      const distanceToEnemy = context.getDistance(movePos, nearestEnemy.position);
      if (distanceToEnemy < bestDistanceToEnemy) {
        bestDistanceToEnemy = distanceToEnemy;
        bestMovePosition = movePos;
      }
    }

    // If no valid movement position found, return null
    if (!bestMovePosition) return null;

    // If the best move position is our current position, don't move
    // (we're already as close as we can get)
    if (
      bestMovePosition.x === context.selfPosition.x &&
      bestMovePosition.y === context.selfPosition.y
    ) {
      return null;
    }

    // Calculate path to movement position
    const path = context.calculatePath(bestMovePosition);
    if (!path) {
      console.warn(
        `[AI] ${context.self.name} cannot path to ${bestMovePosition.x},${bestMovePosition.y}`
      );
      return null;
    }

    console.log(
      `[AI] ${context.self.name} moving toward ${nearestEnemy.unit.name} at ${nearestEnemy.position.x},${nearestEnemy.position.y}`
    );

    // Move toward enemy (no attack)
    return {
      movement: {
        destination: bestMovePosition,
        path: path,
      },
      order: 'move-only',
    };
  }
}

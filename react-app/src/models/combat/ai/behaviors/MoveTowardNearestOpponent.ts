import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext, UnitPlacement } from '../types/AIContext';
import type { Position } from '../../../../types';
import { CombatConstants } from '../../CombatConstants';

/**
 * Move toward the nearest opponent without attacking.
 * Used when enemies cannot reach attack range this turn.
 *
 * Priority: 10 (default, above DefaultBehavior)
 *
 * Decision Logic:
 * 1. For each possible movement position:
 *    - Calculate BFS distance to each enemy (ignoring units, only walls)
 *    - Find the nearest enemy from that position
 * 2. Select the movement position with shortest distance to its nearest enemy
 * 3. Tie-breakers: prefer higher hit chance, then lower HP
 * 4. Does NOT attack (move-only)
 *
 * Why BFS instead of Manhattan:
 * - Accounts for walls and obstacles between positions
 * - Pathfinding ignores all units (they can't stop on units anyway)
 * - Ensures AI makes intelligent routing decisions around obstacles
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
  readonly requiresMove = true;   // Requires movement
  readonly requiresAction = false; // No action, just movement

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

    if (CombatConstants.AI.DEBUG_LOGGING) {
      console.log(
        `[AI] ${context.self.name} at (${context.selfPosition.x},${context.selfPosition.y}) ` +
        `evaluating ${context.movementRange.length} movement positions, ${context.enemyUnits.length} enemies`
      );
    }

    // For each movement position, calculate BFS distance to all enemies
    // Select the position that minimizes distance to nearest opponent
    let bestMovePosition: Position | null = null;
    let bestDistanceToNearestEnemy = Infinity;
    let bestTargetEnemy: UnitPlacement | null = null;

    for (const movePos of context.movementRange) {
      // Find nearest enemy from this movement position using BFS
      let nearestEnemyFromPos = context.enemyUnits[0];
      let nearestDistanceFromPos = context.getPathDistance(
        movePos,
        nearestEnemyFromPos.position
      );

      for (const enemy of context.enemyUnits.slice(1)) {
        const distance = context.getPathDistance(movePos, enemy.position);
        if (distance < nearestDistanceFromPos) {
          nearestDistanceFromPos = distance;
          nearestEnemyFromPos = enemy;
        }
      }

      // Check if this position is better than current best
      if (nearestDistanceFromPos < bestDistanceToNearestEnemy) {
        bestDistanceToNearestEnemy = nearestDistanceFromPos;
        bestMovePosition = movePos;
        bestTargetEnemy = nearestEnemyFromPos;
      } else if (nearestDistanceFromPos === bestDistanceToNearestEnemy && bestTargetEnemy) {
        // Tie-breaker 1: Prefer enemy with higher hit chance
        const currentHitChance = context.predictHitChance(bestTargetEnemy.unit);
        const newHitChance = context.predictHitChance(nearestEnemyFromPos.unit);

        if (newHitChance > currentHitChance) {
          bestMovePosition = movePos;
          bestTargetEnemy = nearestEnemyFromPos;
        } else if (newHitChance === currentHitChance) {
          // Tie-breaker 2: Prefer enemy with lower HP
          if (nearestEnemyFromPos.unit.health < bestTargetEnemy.unit.health) {
            bestMovePosition = movePos;
            bestTargetEnemy = nearestEnemyFromPos;
          }
        }
      }
    }

    // If all enemies are unreachable from all movement positions
    if (bestDistanceToNearestEnemy === Infinity) {
      if (CombatConstants.AI.DEBUG_LOGGING) {
        console.log(
          `[AI] ${context.self.name} cannot reach any enemies from any movement position`
        );
      }
      return null;
    }

    // If no valid movement position found, return null
    if (!bestMovePosition) {
      if (CombatConstants.AI.DEBUG_LOGGING) {
        console.log(`[AI] ${context.self.name} has no valid movement positions`);
      }
      return null;
    }

    // If the best move position is our current position, don't move
    // (we're already as close as we can get)
    if (
      bestMovePosition.x === context.selfPosition.x &&
      bestMovePosition.y === context.selfPosition.y
    ) {
      if (CombatConstants.AI.DEBUG_LOGGING) {
        console.log(
          `[AI] ${context.self.name} best position is current position - not moving`
        );
      }
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

    if (CombatConstants.AI.DEBUG_LOGGING && bestTargetEnemy) {
      console.log(
        `[AI] ${context.self.name} moving toward ${bestTargetEnemy.unit.name} at ${bestTargetEnemy.position.x},${bestTargetEnemy.position.y}`
      );
    }

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

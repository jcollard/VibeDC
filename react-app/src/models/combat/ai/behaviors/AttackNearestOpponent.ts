import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext } from '../types/AIContext';
import type { Position } from '../../../../types';

/**
 * Attack the nearest opponent, moving into range if necessary.
 *
 * Priority: 80 (default)
 *
 * Decision Logic:
 * - First checks current attack range for enemies
 * - If found, attacks immediately (no movement)
 * - If no enemies in range, searches movement + attack range
 * - Moves toward nearest enemy and attacks
 * - Tie-breaker: Prefers enemy with higher hit chance
 *
 * Use Case:
 * - Standard attack behavior for all enemies
 * - Mid-priority (lower than one-shot kills, higher than fallback)
 * - Ensures enemies always engage the nearest target
 */
export class AttackNearestOpponent implements AIBehavior {
  readonly type = 'AttackNearestOpponent';
  readonly priority: number;
  readonly config?: unknown;

  constructor(priority: number = 80, config?: unknown) {
    this.priority = priority;
    this.config = config;
  }

  canExecute(context: AIContext): boolean {
    // Check if any enemies in current attack range
    const currentTargets = context.getUnitsInAttackRange();
    if (currentTargets.length > 0) return true;

    // Check if any enemies reachable via movement + attack
    for (const movePos of context.movementRange) {
      const attackFromMove = context.calculateAttackRangeFrom(movePos);
      if (attackFromMove.validTargets.length > 0) {
        // At least one enemy reachable
        return true;
      }
    }

    return false;
  }

  decide(context: AIContext): AIDecision | null {
    // First, check current attack range (no movement needed)
    const currentTargets = context.getUnitsInAttackRange();
    if (currentTargets.length > 0) {
      // Find nearest target in current range
      let nearestTarget = currentTargets[0];
      let nearestDistance = context.getDistance(
        context.selfPosition,
        nearestTarget.position
      );

      for (const target of currentTargets.slice(1)) {
        const distance = context.getDistance(context.selfPosition, target.position);

        // Prefer closer, or same distance with higher hit chance
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestTarget = target;
        } else if (distance === nearestDistance) {
          // Tie-breaker: higher hit chance
          const currentHitChance = context.predictHitChance(nearestTarget.unit);
          const newHitChance = context.predictHitChance(target.unit);
          if (newHitChance > currentHitChance) {
            nearestTarget = target;
          }
        }
      }

      // Attack immediately (no movement)
      return {
        action: {
          type: 'attack',
          target: nearestTarget.position,
        },
        order: 'act-only',
      };
    }

    // No targets in current range - search movement + attack range
    let bestTarget: Position | null = null;
    let bestMovePosition: Position | null = null;
    let bestDistance = Infinity;

    for (const movePos of context.movementRange) {
      const attackFromMove = context.calculateAttackRangeFrom(movePos);

      for (const targetPos of attackFromMove.validTargets) {
        const targetUnit = context.manifest.getUnitAtPosition(targetPos);
        if (!targetUnit) continue;

        // Check if target is an enemy
        if (targetUnit.isPlayerControlled === context.self.isPlayerControlled) {
          continue;
        }

        // Calculate distance from self to target (total movement + attack distance)
        const moveDistance = context.getDistance(context.selfPosition, movePos);
        const attackDistance = context.getDistance(movePos, targetPos);
        const totalDistance = moveDistance + attackDistance;

        // Prefer closer targets
        if (totalDistance < bestDistance) {
          bestDistance = totalDistance;
          bestTarget = targetPos;
          bestMovePosition = movePos;
        } else if (totalDistance === bestDistance) {
          // Tie-breaker: higher hit chance
          if (bestTarget) {
            const bestTargetUnit = context.manifest.getUnitAtPosition(bestTarget);
            if (bestTargetUnit) {
              const currentHitChance = context.predictHitChance(bestTargetUnit);
              const newHitChance = context.predictHitChance(targetUnit);
              if (newHitChance > currentHitChance) {
                bestTarget = targetPos;
                bestMovePosition = movePos;
              }
            }
          }
        }
      }
    }

    if (!bestTarget || !bestMovePosition) return null;

    // Calculate path to movement position
    const path = context.calculatePath(bestMovePosition);
    if (!path) {
      console.warn(
        `[AI] ${context.self.name} cannot path to ${bestMovePosition.x},${bestMovePosition.y}`
      );
      return null;
    }

    // Move toward target, then attack
    return {
      movement: {
        destination: bestMovePosition,
        path: path,
      },
      action: {
        type: 'attack',
        target: bestTarget,
      },
      order: 'move-first',
    };
  }
}

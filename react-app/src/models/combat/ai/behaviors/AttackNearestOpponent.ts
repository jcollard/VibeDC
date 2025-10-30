import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext } from '../types/AIContext';

/**
 * Attack the nearest opponent in current attack range.
 * Does not move - only attacks from current position.
 *
 * Priority: 80 (default)
 *
 * Decision Logic:
 * - Finds all enemy units in current attack range
 * - Selects nearest enemy by Manhattan distance
 * - Tie-breaker: Prefers enemy with higher hit chance
 * - Returns attack-only decision (no movement)
 *
 * Use Case:
 * - Standard attack behavior for enemies already in range
 * - Mid-priority (lower than one-shot kills, higher than fallback)
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
    const targets = context.getUnitsInAttackRange();
    return targets.length > 0;
  }

  decide(context: AIContext): AIDecision | null {
    const targets = context.getUnitsInAttackRange();
    if (targets.length === 0) return null;

    // Find nearest target by Manhattan distance
    let nearestTarget = targets[0];
    let nearestDistance = context.getDistance(
      context.selfPosition,
      nearestTarget.position
    );

    for (const target of targets.slice(1)) {
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

    return {
      action: {
        type: 'attack',
        target: nearestTarget.position,
      },
      order: 'act-only',
    };
  }
}

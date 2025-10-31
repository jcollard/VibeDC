import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext } from '../types/AIContext';
import type { Position } from '../../../../types';

/**
 * Move toward and one-shot kill weak enemies.
 * Checks if any enemy can be defeated in one attack.
 * If so, moves into range (if needed) and attacks.
 *
 * Priority: 100 (default, highest)
 *
 * Decision Logic:
 * - Checks current attack range for one-shot kills (no movement needed)
 * - If found, attacks immediately
 * - Otherwise, checks movement + attack range for one-shot kills
 * - Prefers closer targets if multiple one-shot opportunities exist
 * - Calculates path to movement position
 * - Returns move-first decision with movement and attack
 *
 * Use Case:
 * - Highest priority - enemies prioritize eliminating weak targets
 * - Enables tactical "finish off" behavior
 * - Creates pressure on wounded player units
 */
export class DefeatNearbyOpponent implements AIBehavior {
  readonly type = 'DefeatNearbyOpponent';
  readonly priority: number;
  readonly config?: unknown;
  readonly requiresMove = false;  // Can work with or without movement
  readonly requiresAction = true; // Requires attack action

  constructor(priority: number = 100, config?: unknown) {
    this.priority = priority;
    this.config = config;
  }

  canExecute(context: AIContext): boolean {
    // Check current attack range for one-shot kills
    const currentTargets = context.getUnitsInAttackRange();
    for (const target of currentTargets) {
      if (context.canDefeat(target.unit)) {
        return true;
      }
    }

    // Check movement + attack range for one-shot kills
    for (const movePos of context.movementRange) {
      const attackFromMove = context.calculateAttackRangeFrom(movePos);

      for (const targetPos of attackFromMove.validTargets) {
        const targetUnit = context.manifest.getUnitAtPosition(targetPos);
        if (!targetUnit) continue;

        // Check if target is an enemy
        if (targetUnit.isPlayerControlled === context.self.isPlayerControlled) {
          continue;
        }

        if (context.canDefeat(targetUnit)) {
          return true;
        }
      }
    }

    return false;
  }

  decide(context: AIContext): AIDecision | null {
    // First, check current attack range for one-shot kills
    const currentTargets = context.getUnitsInAttackRange();
    for (const target of currentTargets) {
      if (context.canDefeat(target.unit)) {
        // Can defeat from current position - no movement needed
        return {
          action: {
            type: 'attack',
            target: target.position,
          },
          order: 'act-only',
        };
      }
    }

    // Search movement + attack range for one-shot kills
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

        // Check if can defeat
        if (!context.canDefeat(targetUnit)) continue;

        // Prefer closer targets by pathfinding distance
        const distance = context.getPathDistance(movePos, targetPos);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTarget = targetPos;
          bestMovePosition = movePos;
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

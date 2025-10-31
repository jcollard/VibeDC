import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext } from '../types/AIContext';

/**
 * Fallback behavior that always ends the turn.
 * Should be configured with priority 0 (lowest) as last resort.
 *
 * Use case: Ensures enemy always takes an action even if no other behaviors apply.
 */
export class DefaultBehavior implements AIBehavior {
  readonly type = 'DefaultBehavior';
  readonly priority: number;
  readonly config?: unknown;
  readonly requiresMove = false;   // Doesn't need movement
  readonly requiresAction = false; // Doesn't need action (just ends turn)

  constructor(priority: number = 0, config?: unknown) {
    this.priority = priority;
    this.config = config;
  }

  /**
   * Always returns true (fallback behavior).
   */
  canExecute(_context: AIContext): boolean {
    return true;
  }

  /**
   * Returns end-turn decision.
   */
  decide(_context: AIContext): AIDecision | null {
    return {
      action: {
        type: 'end-turn',
      },
      order: 'act-only',
    };
  }
}

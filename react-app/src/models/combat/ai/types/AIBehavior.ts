import type { Position } from '../../../../types';
import type { AIContext } from './AIContext';

/**
 * Represents an AI behavior that can be evaluated and executed by enemy units.
 * Behaviors are evaluated in priority order (highest first).
 */
export interface AIBehavior {
  /**
   * Unique identifier for this behavior type.
   * Used for behavior registration and debugging.
   */
  readonly type: string;

  /**
   * Priority value for this behavior instance.
   * Higher priority behaviors are evaluated first.
   * Typical range: 0 (lowest) to 100 (highest)
   */
  readonly priority: number;

  /**
   * Optional configuration data specific to this behavior.
   * Type depends on behavior implementation.
   */
  readonly config?: unknown;

  /**
   * Determines if this behavior can execute in the current context.
   * Called during behavior evaluation to filter valid behaviors.
   *
   * @param context - Current AI context with game state
   * @returns true if this behavior is valid, false to skip to next behavior
   */
  canExecute(context: AIContext): boolean;

  /**
   * Decides the action to take (only called if canExecute() returned true).
   * Should return a complete decision with movement and/or action.
   *
   * @param context - Current AI context with game state
   * @returns AIDecision with movement/action plan, or null if no valid action
   */
  decide(context: AIContext): AIDecision | null;
}

/**
 * Configuration for creating an AI behavior instance.
 * Used in encounter definitions and unit configurations.
 */
export interface AIBehaviorConfig {
  /** Behavior type identifier (must be registered in BehaviorRegistry) */
  type: string;

  /** Priority value (higher = evaluated first) */
  priority: number;

  /** Optional behavior-specific configuration */
  config?: unknown;
}

/**
 * Represents a complete turn decision made by AI behavior.
 * Includes optional movement and action components.
 */
export interface AIDecision {
  /**
   * Optional movement to a new position.
   * Includes pre-calculated path for animation.
   */
  movement?: {
    /** Final destination position */
    destination: Position;

    /** Path from current position to destination (excludes start, includes end) */
    path: Position[];
  };

  /**
   * Optional action to perform.
   */
  action?: {
    /** Type of action to perform */
    type: 'attack' | 'ability' | 'delay' | 'end-turn';

    /** Target position (required for attack/ability) */
    target?: Position;

    /** Ability ID (required for ability type) */
    abilityId?: string;
  };

  /**
   * Order of execution for movement and action.
   * - 'move-first': Execute movement, then action
   * - 'act-first': Execute action, then movement (future use case)
   * - 'move-only': Execute movement only, no action
   * - 'act-only': Execute action only, no movement
   */
  order: 'move-first' | 'act-first' | 'move-only' | 'act-only';
}

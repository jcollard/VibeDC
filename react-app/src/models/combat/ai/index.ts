/**
 * AI Behavior System
 *
 * Priority-based AI decision-making for enemy units.
 * Behaviors are evaluated in priority order, first valid behavior executes.
 *
 * @example
 * ```typescript
 * import { BehaviorRegistry, DEFAULT_ENEMY_BEHAVIORS } from './ai';
 *
 * const behaviors = BehaviorRegistry.createMany(DEFAULT_ENEMY_BEHAVIORS);
 * ```
 */

// Core types
export type { AIBehavior, AIBehaviorConfig, AIDecision } from './types/AIBehavior';
export type { AIContext, UnitPlacement } from './types/AIContext';

// Context builder
export { AIContextBuilder } from './types/AIContext';

// Behaviors
export { DefaultBehavior } from './behaviors/DefaultBehavior';

// Registry
export { BehaviorRegistry, DEFAULT_ENEMY_BEHAVIORS } from './BehaviorRegistry';

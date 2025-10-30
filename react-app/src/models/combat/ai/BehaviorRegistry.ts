import type { AIBehavior, AIBehaviorConfig } from './types/AIBehavior';
import { DefaultBehavior } from './behaviors/DefaultBehavior';
import { AttackNearestOpponent } from './behaviors/AttackNearestOpponent';
import { DefeatNearbyOpponent } from './behaviors/DefeatNearbyOpponent';
import { MoveTowardNearestOpponent } from './behaviors/MoveTowardNearestOpponent';

/**
 * Factory function for creating behavior instances.
 */
type BehaviorFactory = (priority: number, config?: unknown) => AIBehavior;

/**
 * Registry for AI behavior types.
 * Maps behavior type strings to factory functions.
 */
class BehaviorRegistryImpl {
  private factories = new Map<string, BehaviorFactory>();

  /**
   * Register a behavior type with its factory function.
   *
   * @param type - Unique behavior type identifier
   * @param factory - Factory function to create behavior instances
   */
  register(type: string, factory: BehaviorFactory): void {
    if (this.factories.has(type)) {
      console.warn(`Behavior type "${type}" already registered, overwriting`);
    }
    this.factories.set(type, factory);
  }

  /**
   * Create a behavior instance from configuration.
   *
   * @param config - Behavior configuration
   * @returns Behavior instance
   * @throws Error if behavior type not registered
   */
  create(config: AIBehaviorConfig): AIBehavior {
    const factory = this.factories.get(config.type);

    if (!factory) {
      throw new Error(
        `Unknown behavior type: "${config.type}". ` +
        `Available types: ${Array.from(this.factories.keys()).join(', ')}`
      );
    }

    return factory(config.priority, config.config);
  }

  /**
   * Create multiple behavior instances from configurations.
   * Sorts by priority (highest first).
   *
   * @param configs - Array of behavior configurations
   * @returns Array of behavior instances, sorted by priority
   */
  createMany(configs: AIBehaviorConfig[]): AIBehavior[] {
    const behaviors = configs.map(config => this.create(config));

    // Sort by priority (highest first)
    return behaviors.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get list of registered behavior types.
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}

// Singleton instance
export const BehaviorRegistry = new BehaviorRegistryImpl();

// Register built-in behaviors
BehaviorRegistry.register('DefaultBehavior', (priority, config) =>
  new DefaultBehavior(priority, config)
);

BehaviorRegistry.register('AttackNearestOpponent', (priority, config) =>
  new AttackNearestOpponent(priority, config)
);

BehaviorRegistry.register('DefeatNearbyOpponent', (priority, config) =>
  new DefeatNearbyOpponent(priority, config)
);

BehaviorRegistry.register('MoveTowardNearestOpponent', (priority, config) =>
  new MoveTowardNearestOpponent(priority, config)
);

// Default behavior configuration used when no behaviors specified
export const DEFAULT_ENEMY_BEHAVIORS: AIBehaviorConfig[] = [
  { type: 'DefeatNearbyOpponent', priority: 100 },
  { type: 'AttackNearestOpponent', priority: 80 },
  { type: 'MoveTowardNearestOpponent', priority: 10 },
  { type: 'DefaultBehavior', priority: 0 },
];

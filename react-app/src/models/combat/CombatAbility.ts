/**
 * Type of ability that determines when and how it can be used
 */
export type AbilityType = "Action" | "Reaction" | "Passive" | "Movement";

/**
 * Type of effect that an ability can produce
 */
export type EffectType =
  // Stat modifiers
  | 'stat-permanent'      // Permanent stat change (for passive abilities)
  | 'stat-bonus'          // Temporary stat increase
  | 'stat-penalty'        // Temporary stat decrease
  // Damage and healing
  | 'damage-physical'     // Physical damage
  | 'damage-magical'      // Magical damage
  | 'heal'                // Restore HP
  // Resources
  | 'mana-restore'        // Restore MP
  | 'action-timer-modify'; // Modify action timer

/**
 * Target of an ability effect
 */
export type EffectTarget =
  | 'self'                // The ability user
  | 'target'              // Single selected target
  | 'ally'                // Any ally
  | 'enemy'               // Any enemy
  | 'all-allies'          // All allied units
  | 'all-enemies';        // All enemy units

/**
 * Represents an effect applied by an ability
 */
export interface AbilityEffect {
  /**
   * Type of effect
   */
  type: EffectType;

  /**
   * Effect target (who receives the effect)
   */
  target: EffectTarget;

  /**
   * Effect value (damage amount, stat bonus, etc.)
   * Can be a number or a formula string (e.g., "PPower * 1.5")
   */
  value: number | string;

  /**
   * Duration in turns (for temporary effects)
   * -1 = permanent, >0 = temporary
   */
  duration?: number;

  /**
   * Hit chance multiplier (0.0-1.0, default 1.0 = normal hit roll)
   */
  chance?: number;

  /**
   * Additional parameters specific to effect type
   */
  params?: {
    stat?: string; // For stat effects (maxHealth, speed, etc.)
    [key: string]: any;
  };
}

/**
 * Represents a combat ability that a unit can use
 */
export class CombatAbility {
  /**
   * Registry of all created abilities, indexed by ID
   */
  private static registry: Map<string, CombatAbility> = new Map();

  /**
   * Unique identifier for this ability
   */
  public readonly id: string;

  /**
   * Display name of the ability
   */
  public readonly name: string;

  /**
   * Description of what the ability does
   */
  public readonly description: string;

  /**
   * Tags for categorizing abilities (e.g., "attack", "heal", "buff", "debuff")
   */
  public readonly tags: string[];

  /**
   * Type of ability that determines when it can be used
   */
  public readonly abilityType: AbilityType;

  /**
   * The amount of experience required to purchase this ability
   */
  public readonly experiencePrice: number;

  /**
   * Effects applied when ability is used/active
   */
  public readonly effects?: AbilityEffect[];

  /**
   * Icon sprite ID for UI display
   */
  public readonly icon?: string;

  /**
   * Range in tiles for targeting (undefined = melee/adjacent only, 0 = self only, >0 = ranged)
   */
  public readonly range?: number;

  constructor(
    name: string,
    description: string,
    abilityType: AbilityType,
    experiencePrice: number,
    tags: string[] = [],
    id?: string,
    effects?: AbilityEffect[],
    icon?: string,
    range?: number
  ) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.description = description;
    this.abilityType = abilityType;
    this.experiencePrice = experiencePrice;
    this.tags = tags;
    this.effects = effects;
    this.icon = icon;
    this.range = range;

    // Register this ability in the registry
    CombatAbility.registry.set(this.id, this);
  }

  /**
   * Checks if this ability has a specific tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Get a CombatAbility by its ID
   * @param id The ID of the ability to retrieve
   * @returns The CombatAbility with the given ID, or undefined if not found
   */
  static getById(id: string): CombatAbility | undefined {
    return CombatAbility.registry.get(id);
  }

  /**
   * Get all registered abilities
   * @returns Array of all CombatAbility instances
   */
  static getAll(): CombatAbility[] {
    return Array.from(CombatAbility.registry.values());
  }

  /**
   * Clear the ability registry (useful for testing)
   */
  static clearRegistry(): void {
    CombatAbility.registry.clear();
  }
}

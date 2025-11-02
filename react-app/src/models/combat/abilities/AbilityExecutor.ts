import type { CombatUnit } from '../CombatUnit';
import type { CombatAbility, AbilityEffect } from '../CombatAbility';
import type { CombatState } from '../CombatState';
import type { Position } from '../../../types';
import type { CinematicSequence } from '../CinematicSequence';
import type { StatModifier } from '../StatModifier';

/**
 * Context information for ability execution
 */
export interface AbilityExecutionContext {
  /** Unit using the ability */
  caster: CombatUnit;

  /** Caster's position on the map */
  casterPosition: Position;

  /** Target unit (if single-target ability) */
  target?: CombatUnit;

  /** Target position (for area effects) */
  targetPosition?: Position;

  /** Current combat state */
  state: CombatState;
}

/**
 * Result of ability execution
 */
export interface AbilityExecutionResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Updated combat state */
  newState: CombatState;

  /** Animation sequences to play */
  animations?: CinematicSequence[];

  /** Combat log messages */
  logMessages: string[];

  /** Damage dealt per unit (WeakMap prevents duplicate name bugs) */
  damages?: WeakMap<CombatUnit, number>;

  /** Healing received per unit */
  heals?: WeakMap<CombatUnit, number>;

  /** Stat modifiers applied per unit */
  modifiers?: WeakMap<CombatUnit, StatModifier[]>;
}

/**
 * AbilityExecutor - Core ability execution engine
 *
 * Responsible for:
 * - Validating ability can be executed
 * - Consuming mana costs
 * - Applying effects (damage, healing, stat modifiers, etc.)
 * - Generating combat log messages
 * - Triggering animations
 *
 * Performance patterns:
 * - Uses WeakMap for per-unit tracking (prevents duplicate name bugs)
 * - No rendering in execution logic (separation of concerns)
 */
export class AbilityExecutor {
  /**
   * Execute an ability and return the updated state
   */
  static execute(
    ability: CombatAbility,
    context: AbilityExecutionContext
  ): AbilityExecutionResult {
    const results: AbilityExecutionResult = {
      success: false,
      newState: context.state,
      animations: [],
      logMessages: [],
      damages: new WeakMap(), // ✅ Use WeakMap for per-unit tracking
      heals: new WeakMap(),
      modifiers: new WeakMap()
    };

    // Validate ability can be executed
    if (!this.canExecute(ability, context)) {
      results.logMessages.push(`Cannot execute ${ability.name}`);
      return results;
    }

    // Check mana cost
    const manaCost = this.getManaCost(ability);
    if (manaCost > 0 && context.caster.mana < manaCost) {
      results.logMessages.push(`Not enough mana to use ${ability.name}`);
      return results;
    }

    // Consume mana
    if (manaCost > 0 && 'consumeMana' in context.caster) {
      (context.caster as any).consumeMana(manaCost);
    }

    // Process each effect in sequence
    for (const effect of ability.effects ?? []) {
      this.applyEffect(effect, context, results, ability.name);
    }

    results.success = true;
    return results;
  }

  /**
   * Check if ability can be executed
   */
  private static canExecute(
    ability: CombatAbility,
    context: AbilityExecutionContext
  ): boolean {
    // Check if caster is KO'd
    if (context.caster.health <= 0) {
      return false;
    }

    // Check if ability has effects
    if (!ability.effects || ability.effects.length === 0) {
      return false;
    }

    // Check if target is required and present
    const requiresTarget = ability.effects.some(e =>
      e.target === 'target' || e.target === 'enemy' || e.target === 'ally'
    );
    if (requiresTarget && !context.target) {
      return false;
    }

    return true;
  }

  /**
   * Get total mana cost of ability
   */
  private static getManaCost(ability: CombatAbility): number {
    // Check for mana-cost effect type
    const manaCostEffect = ability.effects?.find(e => e.type === 'mana-cost');
    if (manaCostEffect) {
      return typeof manaCostEffect.value === 'number' ? manaCostEffect.value : 0;
    }

    // Default: no cost
    return 0;
  }

  /**
   * Apply a single effect
   */
  private static applyEffect(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult,
    abilityName: string
  ): void {
    const target = this.resolveTarget(effect, context);
    if (!target) return;

    switch (effect.type) {
      case 'damage-physical':
      case 'damage-magical':
        this.applyDamage(effect, context, results, target, abilityName);
        break;

      case 'heal':
        this.applyHeal(effect, context, results, target, abilityName);
        break;

      case 'stat-bonus':
      case 'stat-penalty':
        this.applyStatModifier(effect, context, results, target, abilityName);
        break;

      case 'mana-restore':
        this.applyManaRestore(effect, context, results, target, abilityName);
        break;

      case 'action-timer-modify':
        this.applyActionTimerModify(effect, context, results, target, abilityName);
        break;

      default:
        console.warn(`Unsupported effect type: ${effect.type}`);
    }
  }

  /**
   * Resolve effect target
   */
  private static resolveTarget(
    effect: AbilityEffect,
    context: AbilityExecutionContext
  ): CombatUnit | null {
    switch (effect.target) {
      case 'self':
        return context.caster;

      case 'target':
      case 'enemy':
      case 'ally':
        return context.target ?? null;

      default:
        console.warn(`Unsupported target type: ${effect.target}`);
        return null;
    }
  }

  /**
   * Apply damage effect
   */
  private static applyDamage(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult,
    target: CombatUnit,
    abilityName: string
  ): void {
    const isMagical = effect.type === 'damage-magical';

    // Calculate base damage from effect value
    const baseDamage = this.calculateDamageValue(effect, context.caster, isMagical);

    // Hit roll (unless auto-hit)
    if (!effect.params?.autoHit) {
      const hitChance = isMagical
        ? this.calculateMagicHitChance(context.caster, target)
        : this.calculatePhysicalHitChance(context.caster, target);

      const roll = Math.random() * 100;
      if (roll > hitChance) {
        const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
        results.logMessages.push(`<color=${targetColor}>${target.name}</color> evaded!`);
        return;
      }
    }

    // Apply damage
    if ('addWounds' in target) {
      (target as any).addWounds(baseDamage);
    }
    results.damages?.set(target, baseDamage);

    // Combat log with color coding (per CombatHierarchy.md)
    const casterColor = context.caster.isPlayerControlled ? '#00ff00' : '#ff0000';
    const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';

    results.logMessages.push(
      `<color=${casterColor}>${context.caster.name}</color> used ${abilityName}! ` +
      `<color=${targetColor}>${target.name}</color> took ${baseDamage} damage!`
    );
  }

  /**
   * Apply healing effect
   */
  private static applyHeal(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult,
    target: CombatUnit,
    abilityName: string
  ): void {
    const healAmount = this.calculateHealValue(effect, context.caster);
    const actualHeal = Math.min(healAmount, target.wounds);

    if ('removeWounds' in target) {
      (target as any).removeWounds(actualHeal);
    }
    results.heals?.set(target, actualHeal);

    const casterColor = context.caster.isPlayerControlled ? '#00ff00' : '#ff0000';
    const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
    results.logMessages.push(
      `<color=${casterColor}>${context.caster.name}</color> used ${abilityName}! ` +
      `<color=${targetColor}>${target.name}</color> restored ${actualHeal} HP!`
    );
  }

  /**
   * Apply stat modifier (buff or debuff)
   */
  private static applyStatModifier(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult,
    target: CombatUnit,
    abilityName: string
  ): void {
    if (!('addStatModifier' in target)) {
      console.warn('Target does not support stat modifiers');
      return;
    }

    if (!effect.params?.stat) {
      console.warn('Stat modifier effect missing stat parameter');
      return;
    }

    const modifier: StatModifier = {
      id: `ability-${context.caster.name}-${Date.now()}`,
      stat: effect.params.stat,
      value: typeof effect.value === 'number' ? effect.value : 0,
      duration: effect.duration ?? -1,
      source: 'ability',
      sourceName: abilityName
    };

    (target as any).addStatModifier(modifier);

    // Track modifier
    const existingModifiers = results.modifiers?.get(target) ?? [];
    existingModifiers.push(modifier);
    results.modifiers?.set(target, existingModifiers);

    const casterColor = context.caster.isPlayerControlled ? '#00ff00' : '#ff0000';
    const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
    const isDebuff = modifier.value < 0;
    const buffType = isDebuff ? 'decreased' : 'increased';

    results.logMessages.push(
      `<color=${casterColor}>${context.caster.name}</color> used ${abilityName}! ` +
      `<color=${targetColor}>${target.name}</color>'s ${modifier.stat} ${buffType}!`
    );
  }

  /**
   * Apply mana restore effect
   */
  private static applyManaRestore(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult,
    target: CombatUnit,
    abilityName: string
  ): void {
    if (!('restoreMana' in target)) {
      console.warn('Target does not support mana');
      return;
    }

    const manaAmount = typeof effect.value === 'number' ? effect.value : 0;
    const actualRestore = Math.min(manaAmount, target.maxMana - target.mana);

    (target as any).restoreMana(actualRestore);

    const casterColor = context.caster.isPlayerControlled ? '#00ff00' : '#ff0000';
    const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
    results.logMessages.push(
      `<color=${casterColor}>${context.caster.name}</color> used ${abilityName}! ` +
      `<color=${targetColor}>${target.name}</color> restored ${actualRestore} mana!`
    );
  }

  /**
   * Apply action timer modification
   */
  private static applyActionTimerModify(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult,
    target: CombatUnit,
    abilityName: string
  ): void {
    if (!('setActionTimer' in target)) {
      console.warn('Target does not support action timer');
      return;
    }

    const currentTimer = target.actionTimer;
    const modifyAmount = typeof effect.value === 'number' ? effect.value : 0;
    const newTimer = Math.max(0, currentTimer + modifyAmount);

    (target as any).setActionTimer(newTimer);

    const casterColor = context.caster.isPlayerControlled ? '#00ff00' : '#ff0000';
    const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
    results.logMessages.push(
      `<color=${casterColor}>${context.caster.name}</color> used ${abilityName}! ` +
      `<color=${targetColor}>${target.name}</color>'s action timer changed by ${modifyAmount}!`
    );
  }

  /**
   * Calculate damage value (supports formulas)
   */
  private static calculateDamageValue(
    effect: AbilityEffect,
    caster: CombatUnit,
    isMagical: boolean
  ): number {
    if (typeof effect.value === 'number') {
      return Math.floor(effect.value);
    }

    // Formula support (future enhancement)
    // For now, treat as 0
    return 0;
  }

  /**
   * Calculate heal value
   */
  private static calculateHealValue(
    effect: AbilityEffect,
    caster: CombatUnit
  ): number {
    if (typeof effect.value === 'number') {
      return Math.floor(effect.value);
    }

    // Formula support (future enhancement)
    return 0;
  }

  /**
   * Calculate physical hit chance
   */
  private static calculatePhysicalHitChance(
    attacker: CombatUnit,
    defender: CombatUnit
  ): number {
    // Simplified hit calculation
    const baseChance = 75;
    const evadeBonus = defender.physicalEvade;
    return Math.max(10, Math.min(95, baseChance - evadeBonus));
  }

  /**
   * Calculate magic hit chance
   */
  private static calculateMagicHitChance(
    attacker: CombatUnit,
    defender: CombatUnit
  ): number {
    // Simplified hit calculation
    const baseChance = 85;
    const evadeBonus = defender.magicEvade;
    return Math.max(20, Math.min(95, baseChance - evadeBonus));
  }
}

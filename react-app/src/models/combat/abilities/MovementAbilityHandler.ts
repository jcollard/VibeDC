import type { CombatAbility, AbilityEffect } from '../CombatAbility';
import type { HumanoidUnit } from '../HumanoidUnit';
import type { MovementTriggerContext, MovementAbilityResult } from './MovementTrigger';
import type { StatModifier, StatType } from '../StatModifier';
import type { CombatUnit } from '../CombatUnit';

export class MovementAbilityHandler {
  /**
   * Check if unit has movement ability that triggers
   */
  static checkMovementAbility(context: MovementTriggerContext): MovementAbilityResult {
    const result: MovementAbilityResult = {
      shouldExecute: false,
      newState: context.state,
      logMessages: []
    };

    // Get assigned movement ability
    const movementAbility = this.getAssignedMovement(context.mover);
    if (!movementAbility) {
      return result;
    }

    // Check if mover is KO'd
    if (context.mover.health <= 0) {
      return result;
    }

    // Check if ability triggers for this movement type
    if (!this.shouldTrigger(movementAbility, context)) {
      return result;
    }

    // Execute movement ability
    const modifiedEffects = this.scaleEffects(movementAbility, context);

    for (const effect of modifiedEffects) {
      this.applyMovementEffect(effect, context, result);
    }

    result.shouldExecute = true;

    // Add trigger message at the start
    const moverColor = context.mover.isPlayerControlled ? '#00ff00' : '#ff0000';
    result.logMessages.unshift(
      `[color=${moverColor}]${context.mover.name}[/color] triggered ${movementAbility.name}!`
    );

    return result;
  }

  /**
   * Get unit's assigned movement ability
   */
  private static getAssignedMovement(unit: CombatUnit): CombatAbility | null {
    if (!('movementAbility' in unit)) {
      return null;
    }
    return (unit as HumanoidUnit).movementAbility;
  }

  /**
   * Check if ability should trigger for this movement
   */
  private static shouldTrigger(
    ability: CombatAbility,
    context: MovementTriggerContext
  ): boolean {
    // Check trigger type from ability tags
    const triggerTag = ability.tags.find(tag =>
      tag === 'after-move' || tag === 'after-no-move'
    );

    if (!triggerTag) {
      return false;
    }

    return triggerTag === context.triggerType;
  }

  /**
   * Scale effect values based on tiles moved (for per-tile abilities)
   */
  private static scaleEffects(
    ability: CombatAbility,
    context: MovementTriggerContext
  ): AbilityEffect[] {
    // Check if ability scales with distance
    const scalesWithDistance = ability.tags.includes('per-tile');

    if (!scalesWithDistance) {
      return ability.effects ?? [];
    }

    // Scale effect values by tiles moved
    return (ability.effects ?? []).map(effect => ({
      ...effect,
      value: typeof effect.value === 'number'
        ? effect.value * context.tilesMoved
        : effect.value
    }));
  }

  /**
   * Apply a movement ability effect
   */
  private static applyMovementEffect(
    effect: AbilityEffect,
    context: MovementTriggerContext,
    result: MovementAbilityResult
  ): void {
    const unit = context.mover;

    switch (effect.type) {
      case 'heal':
        this.applyHeal(effect, unit, result);
        break;

      case 'mana-restore':
        this.applyManaRestore(effect, unit, result);
        break;

      case 'stat-bonus':
      case 'stat-penalty':
        this.applyStatModifier(effect, unit, result);
        break;

      default:
        console.warn(`Unsupported movement effect type: ${effect.type}`);
    }
  }

  /**
   * Apply healing effect
   */
  private static applyHeal(
    effect: AbilityEffect,
    unit: CombatUnit,
    result: MovementAbilityResult
  ): void {
    const healAmount = typeof effect.value === 'number' ? effect.value : 0;
    const actualHeal = Math.min(healAmount, unit.wounds);

    if (actualHeal > 0 && 'healWounds' in unit) {
      (unit as any).healWounds(actualHeal);

      const unitColor = unit.isPlayerControlled ? '#00ff00' : '#ff0000';
      result.logMessages.push(
        `[color=${unitColor}]${unit.name}[/color] restored ${actualHeal} HP!`
      );
    }
  }

  /**
   * Apply mana restore effect
   */
  private static applyManaRestore(
    effect: AbilityEffect,
    unit: CombatUnit,
    result: MovementAbilityResult
  ): void {
    if (!('restoreMana' in unit)) {
      console.warn('Unit does not support mana');
      return;
    }

    // Check if percentage-based (value as string like "10%")
    let manaAmount: number;

    if (typeof effect.value === 'string' && effect.value.includes('%')) {
      const percentage = parseFloat(effect.value.replace('%', '')) / 100;
      manaAmount = Math.floor(unit.maxMana * percentage);
    } else {
      manaAmount = typeof effect.value === 'number' ? effect.value : 0;
    }

    const actualRestore = Math.min(manaAmount, unit.maxMana - unit.mana);

    if (actualRestore > 0) {
      (unit as any).restoreMana(actualRestore);

      const unitColor = unit.isPlayerControlled ? '#00ff00' : '#ff0000';
      result.logMessages.push(
        `[color=${unitColor}]${unit.name}[/color] restored ${actualRestore} mana!`
      );
    }
  }

  /**
   * Apply stat modifier (temporary buff/debuff)
   */
  private static applyStatModifier(
    effect: AbilityEffect,
    unit: CombatUnit,
    result: MovementAbilityResult
  ): void {
    if (!('addStatModifier' in unit)) {
      console.warn('Unit does not support stat modifiers');
      return;
    }

    if (!effect.params?.stat) {
      console.warn('Stat modifier effect missing stat parameter');
      return;
    }

    const modifier: StatModifier = {
      id: `movement-${unit.name}-${Date.now()}`,
      stat: effect.params.stat as StatType,
      value: typeof effect.value === 'number' ? effect.value : 0,
      duration: effect.duration ?? 2, // Default 2 turns
      source: 'movement-ability',
      sourceName: 'Movement'
    };

    (unit as any).addStatModifier(modifier);

    const unitColor = unit.isPlayerControlled ? '#00ff00' : '#ff0000';
    const buffType = modifier.value > 0 ? 'increased' : 'decreased';

    result.logMessages.push(
      `[color=${unitColor}]${unit.name}[/color]'s ${modifier.stat} ${buffType}!`
    );
  }
}

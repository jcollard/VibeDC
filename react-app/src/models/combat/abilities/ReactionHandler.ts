import type { CombatAbility } from '../CombatAbility';
import type { HumanoidUnit } from '../HumanoidUnit';
import type { CombatUnit } from '../CombatUnit';
import type { ReactionTriggerContext, ReactionResult } from './ReactionTrigger';
import { AbilityExecutor, type AbilityExecutionContext } from './AbilityExecutor';

export class ReactionHandler {
  /**
   * Check if unit has reaction ability that triggers for this event
   */
  static checkReaction(context: ReactionTriggerContext): ReactionResult {
    const result: ReactionResult = {
      shouldExecute: false,
      newState: context.state,
      animations: [],
      logMessages: []
    };

    // Get assigned reaction ability
    const reactionAbility = this.getAssignedReaction(context.reactor);
    if (!reactionAbility) {
      return result;
    }

    // Check if reactor is KO'd (dead units can't react)
    if (context.reactor.health <= 0) {
      return result;
    }

    // Check if reaction triggers for this event
    if (!this.shouldTrigger(reactionAbility, context)) {
      return result;
    }

    // Execute reaction ability
    const abilityContext: AbilityExecutionContext = {
      caster: context.reactor,
      casterPosition: context.reactorPosition,
      target: context.attacker ?? context.target,
      targetPosition: context.attackerPosition ?? context.targetPosition,
      state: context.state
    };

    const executionResult = AbilityExecutor.execute(reactionAbility, abilityContext);

    result.shouldExecute = executionResult.success;
    result.newState = executionResult.newState;
    result.animations = executionResult.animations;

    // Add reaction trigger message
    const reactorColor = context.reactor.isPlayerControlled ? '#00ff00' : '#ff0000';
    result.logMessages = [
      `[color=${reactorColor}]${context.reactor.name}[/color] triggered ${reactionAbility.name}!`,
      ...executionResult.logMessages
    ];

    return result;
  }

  /**
   * Get unit's assigned reaction ability
   */
  private static getAssignedReaction(unit: CombatUnit): CombatAbility | null {
    if (!('reactionAbility' in unit)) {
      return null;
    }
    return (unit as HumanoidUnit).reactionAbility;
  }

  /**
   * Check if ability should trigger for this event
   */
  private static shouldTrigger(
    ability: CombatAbility,
    context: ReactionTriggerContext
  ): boolean {
    // Check trigger type from ability tags
    const triggerTag = ability.tags.find(tag =>
      tag === 'before-attacked' ||
      tag === 'after-attacked' ||
      tag === 'before-attack' ||
      tag === 'after-attack'
    );

    if (!triggerTag) {
      return false;
    }

    return triggerTag === context.triggerType;
  }
}

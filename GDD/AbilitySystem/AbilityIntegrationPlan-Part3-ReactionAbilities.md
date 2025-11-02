# Ability System Integration - Part 3: Reaction Abilities

**Version:** 1.0
**Created:** 2025-11-02
**Related:** [AbilitySystemOverview.md](AbilitySystemOverview.md), [Part2-ActionAbilities.md](AbilityIntegrationPlan-Part2-ActionAbilities.md), [CombatHierarchy.md](../../CombatHierarchy.md)

## Purpose

This document details the implementation of **Reaction Abilities** - abilities that trigger automatically when specific combat events occur (e.g., being attacked, attacking an enemy).

**Depends On**: Part 2: Action Abilities (✅ MUST BE COMPLETE FIRST)

## Scope

**IN SCOPE:**
- ✅ Reaction trigger system (before/after attack events)
- ✅ ReactionHandler for automatic execution
- ✅ Integration with attack flow in UnitTurnPhaseHandler
- ✅ Dual-wield support (reactions trigger per weapon)
- ✅ Combat log integration
- ✅ YAML trigger tag configuration

**OUT OF SCOPE:**
- ❌ Status effect reactions (requires status system)
- ❌ Damage reduction/absorption reactions (requires shield system)
- ❌ Movement-based reactions (teleport, knockback)
- ❌ Equipment-dependent reactions

## Overview

Reaction abilities are **passive, automatic responses** to combat events. When a unit has a reaction ability assigned and the trigger condition is met, the ability executes immediately without player input.

**Key Differences from Action Abilities**:
- Action: Manually chosen from menu → targets selected → executes
- Reaction: Automatically detected → triggers on event → executes immediately

## Implementation

### Phase 3.1: Define Reaction Triggers

**New File**: [react-app/src/models/combat/abilities/ReactionTrigger.ts](../../react-app/src/models/combat/abilities/ReactionTrigger.ts)

```typescript
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../Position';
import type { CombatState } from '../CombatState';
import type { CinematicSequence } from '../cinematic/CinematicSequence';

/**
 * Types of reaction triggers
 */
export type ReactionTriggerType =
  | 'before-attacked'  // Before damage is applied to this unit
  | 'after-attacked'   // After damage is applied to this unit
  | 'before-attack'    // Before this unit attacks
  | 'after-attack';    // After this unit attacks

/**
 * Context for reaction trigger evaluation
 */
export interface ReactionTriggerContext {
  /** Type of trigger that occurred */
  triggerType: ReactionTriggerType;

  /** Unit whose reaction is being checked */
  reactor: CombatUnit;

  /** Position of reactor */
  reactorPosition: Position;

  /** Unit doing the attacking (if reactor is defender) */
  attacker?: CombatUnit;

  /** Position of attacker */
  attackerPosition?: Position;

  /** Unit being targeted (if reactor is attacker) */
  target?: CombatUnit;

  /** Position of target */
  targetPosition?: Position;

  /** Amount of damage dealt (for after-attack triggers) */
  damageDealt?: number;

  /** Current combat state */
  state: CombatState;
}

/**
 * Result of reaction execution
 */
export interface ReactionResult {
  /** Whether reaction was triggered */
  shouldExecute: boolean;

  /** Updated combat state */
  newState: CombatState;

  /** Animations to play */
  animations?: CinematicSequence[];

  /** Combat log messages */
  logMessages: string[];
}
```

### Phase 3.2: Create ReactionHandler

**New File**: [react-app/src/models/combat/abilities/ReactionHandler.ts](../../react-app/src/models/combat/abilities/ReactionHandler.ts)

```typescript
import type { CombatAbility } from '../CombatAbility';
import type { HumanoidUnit } from '../HumanoidUnit';
import type { ReactionTriggerContext, ReactionResult, ReactionTriggerType } from './ReactionTrigger';
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
      `<color=${reactorColor}>${context.reactor.name}</color> triggered ${reactionAbility.name}!`,
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
```

### Phase 3.3: Update UnitTurnPhaseHandler

**File**: [react-app/src/models/combat/UnitTurnPhaseHandler.ts](../../react-app/src/models/combat/UnitTurnPhaseHandler.ts)

Add reaction trigger points in attack flow:

#### 3.3.1: Account for Dual-Wield Attack Animations

Per [CombatHierarchy.md](../../CombatHierarchy.md), UnitTurnPhaseHandler supports dual-wield with **two sequential 3s animations**.

**Reaction Trigger Points Must Handle**:
- Single weapon: 1 before-attack → 1 attack → 1 after-attack sequence
- Dual-wield: 2 before-attack → 2 attacks → 2 after-attack sequences

**Pattern**:

```typescript
import { ReactionHandler } from './abilities/ReactionHandler';
import type { ReactionTriggerContext } from './abilities/ReactionTrigger';

executeAttack(targetPosition: Position): CombatState {
  const target = this.currentState!.unitManifest.getUnitAt(targetPosition);
  if (!target) {
    console.warn('No target at position');
    return this.currentState!;
  }

  const weapons = this.getEquippedWeapons(); // May return 1 or 2 weapons
  let newState = this.currentState!;

  for (const weapon of weapons) {
    // ============================================================
    // TRIGGER: before-attack (attacker's reaction, per weapon)
    // ============================================================
    const beforeAttackReaction = ReactionHandler.checkReaction({
      triggerType: 'before-attack',
      reactor: this.activeUnit!,
      reactorPosition: this.activePosition!,
      target,
      targetPosition,
      state: newState
    });

    if (beforeAttackReaction.shouldExecute) {
      newState = beforeAttackReaction.newState;
      for (const msg of beforeAttackReaction.logMessages) {
        newState = CombatLogManager.addMessage(newState, msg);
      }
    }

    // ============================================================
    // TRIGGER: before-attacked (defender's reaction, per weapon)
    // ============================================================
    const beforeAttackedReaction = ReactionHandler.checkReaction({
      triggerType: 'before-attacked',
      reactor: target,
      reactorPosition: targetPosition,
      attacker: this.activeUnit!,
      attackerPosition: this.activePosition!,
      state: newState
    });

    if (beforeAttackedReaction.shouldExecute) {
      newState = beforeAttackedReaction.newState;
      for (const msg of beforeAttackedReaction.logMessages) {
        newState = CombatLogManager.addMessage(newState, msg);
      }
    }

    // ============================================================
    // Execute attack with this weapon
    // ============================================================
    const attackResult = this.performAttack(weapon, targetPosition, newState);
    newState = attackResult.newState;
    const damageAmount = attackResult.damage;

    // ============================================================
    // TRIGGER: after-attacked (defender's reaction, per weapon)
    // ============================================================
    const afterAttackedReaction = ReactionHandler.checkReaction({
      triggerType: 'after-attacked',
      reactor: target,
      reactorPosition: targetPosition,
      attacker: this.activeUnit!,
      attackerPosition: this.activePosition!,
      damageDealt: damageAmount,
      state: newState
    });

    if (afterAttackedReaction.shouldExecute) {
      newState = afterAttackedReaction.newState;
      for (const msg of afterAttackedReaction.logMessages) {
        newState = CombatLogManager.addMessage(newState, msg);
      }
    }

    // ============================================================
    // TRIGGER: after-attack (attacker's reaction, per weapon)
    // ============================================================
    const afterAttackReaction = ReactionHandler.checkReaction({
      triggerType: 'after-attack',
      reactor: this.activeUnit!,
      reactorPosition: this.activePosition!,
      target,
      targetPosition,
      damageDealt: damageAmount,
      state: newState
    });

    if (afterAttackReaction.shouldExecute) {
      newState = afterAttackReaction.newState;
      for (const msg of afterAttackReaction.logMessages) {
        newState = CombatLogManager.addMessage(newState, msg);
      }
    }
  }

  return newState;
}

/**
 * Get equipped weapons (1 for single-wield, 2 for dual-wield)
 */
private getEquippedWeapons(): Equipment[] {
  const weapons: Equipment[] = [];

  if (this.activeUnit!.leftHand) {
    weapons.push(this.activeUnit!.leftHand);
  }

  if (this.activeUnit!.canDualWield && this.activeUnit!.rightHand) {
    weapons.push(this.activeUnit!.rightHand);
  }

  return weapons.length > 0 ? weapons : [/* unarmed attack */];
}
```

**Why**: Reactions must fire for each weapon in dual-wield scenarios. A "Repost" reaction should trigger twice if hit by a dual-wielding attacker.

### Phase 3.4: Update ability-database.yaml

**File**: [react-app/src/data/ability-database.yaml](../../react-app/src/data/ability-database.yaml)

Add trigger tags to reaction abilities (implementable ones only):

```yaml
# Rogue Reaction Abilities

# Note: Repost is implementable (uses damage-physical)
# Reaction triggers not fully implemented yet, but structure is ready
- id: "repost-001"
  name: "Repost"
  description: "Counter-attack after being attacked"
  abilityType: "Reaction"
  experiencePrice: 250
  tags: ["offensive", "counter", "after-attacked"] # Tag indicates trigger
  effects:
    - type: "damage-physical"
      target: "enemy"  # Target is the attacker
      value: 5  # Fixed damage for simplicity (formula support later)

# Note: Slippery requires status effects (OUT OF SCOPE)
# Include structure but no effects
- id: "slippery-001"
  name: "Slippery"
  description: "Gain Haste after taking damage"
  abilityType: "Reaction"
  experiencePrice: 500
  tags: ["defensive", "haste", "after-attacked"]
  # effects: OUT OF SCOPE - requires status system

# Fighter Reaction Abilities

# Note: Parry requires trigger-based stat bonus (OUT OF SCOPE)
- id: "parry-001"
  name: "Parry"
  description: "Increases your physical evasion based on your weapon"
  abilityType: "Reaction"
  experiencePrice: 500
  tags: ["defensive", "evasion", "before-attacked"]
  # effects: OUT OF SCOPE - requires conditional stat bonus

# Apprentice Reaction Abilities

# Note: Quick Shield requires shield system (OUT OF SCOPE)
- id: "quick-shield-001"
  name: "Quick Shield"
  description: "Cast Minor Shield before taking damage"
  abilityType: "Reaction"
  experiencePrice: 200
  tags: ["magic", "defensive", "shield", "before-attacked"]
  # effects: OUT OF SCOPE - requires shield system
```

**Important**: Only **Repost** is fully implementable in Part 3. Other reactions require systems not yet implemented.

### Phase 3.5: Testing

**File**: Create [react-app/src/models/combat/abilities/ReactionHandler.test.ts](../../react-app/src/models/combat/abilities/ReactionHandler.test.ts)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ReactionHandler } from './ReactionHandler';
import { HumanoidUnit } from '../HumanoidUnit';
import { UnitClass } from '../UnitClass';
import type { CombatAbility } from '../CombatAbility';
import type { ReactionTriggerContext } from './ReactionTrigger';
import type { CombatState } from '../CombatState';

describe('ReactionHandler', () => {
  let attacker: HumanoidUnit;
  let defender: HumanoidUnit;
  let repostAbility: CombatAbility;
  let fighterClass: UnitClass;
  let mockState: CombatState;

  beforeEach(() => {
    fighterClass = new UnitClass('fighter-001', 'Fighter', 'Test class', []);

    attacker = new HumanoidUnit(
      'Attacker',
      fighterClass,
      100, 50, 10, 5, 8, 4, 3, 2, 6, 4
    );

    defender = new HumanoidUnit(
      'Defender',
      fighterClass,
      100, 50, 10, 5, 8, 4, 3, 2, 6, 4
    );

    repostAbility = {
      id: 'repost-001',
      name: 'Repost',
      description: 'Counter-attack',
      abilityType: 'Reaction',
      experiencePrice: 250,
      tags: ['offensive', 'counter', 'after-attacked'],
      effects: [
        {
          type: 'damage-physical',
          target: 'enemy',
          value: 5,
          params: { autoHit: true } // Simplified for testing
        }
      ]
    };

    defender.learnAbility(repostAbility, fighterClass);
    defender.assignReactionAbility(repostAbility);

    mockState = createMockCombatState([attacker, defender]);
  });

  it('should trigger reaction on correct event type', () => {
    const context: ReactionTriggerContext = {
      triggerType: 'after-attacked',
      reactor: defender,
      reactorPosition: { x: 5, y: 5 },
      attacker,
      attackerPosition: { x: 4, y: 5 },
      damageDealt: 10,
      state: mockState
    };

    const result = ReactionHandler.checkReaction(context);

    expect(result.shouldExecute).toBe(true);
    expect(result.logMessages).toContain('Defender triggered Repost!');
  });

  it('should not trigger reaction on wrong event type', () => {
    const context: ReactionTriggerContext = {
      triggerType: 'before-attacked', // Repost triggers on after-attacked
      reactor: defender,
      reactorPosition: { x: 5, y: 5 },
      attacker,
      attackerPosition: { x: 4, y: 5 },
      state: mockState
    };

    const result = ReactionHandler.checkReaction(context);

    expect(result.shouldExecute).toBe(false);
  });

  it('should not trigger if unit has no reaction ability', () => {
    defender.assignReactionAbility(null);

    const context: ReactionTriggerContext = {
      triggerType: 'after-attacked',
      reactor: defender,
      reactorPosition: { x: 5, y: 5 },
      attacker,
      attackerPosition: { x: 4, y: 5 },
      state: mockState
    };

    const result = ReactionHandler.checkReaction(context);

    expect(result.shouldExecute).toBe(false);
  });

  it('should not trigger if reactor is KO\'d', () => {
    defender.addWounds(100); // KO the defender

    const context: ReactionTriggerContext = {
      triggerType: 'after-attacked',
      reactor: defender,
      reactorPosition: { x: 5, y: 5 },
      attacker,
      attackerPosition: { x: 4, y: 5 },
      state: mockState
    };

    const result = ReactionHandler.checkReaction(context);

    expect(result.shouldExecute).toBe(false);
  });

  it('should execute reaction ability effects', () => {
    const context: ReactionTriggerContext = {
      triggerType: 'after-attacked',
      reactor: defender,
      reactorPosition: { x: 5, y: 5 },
      attacker,
      attackerPosition: { x: 4, y: 5 },
      damageDealt: 10,
      state: mockState
    };

    const initialWounds = attacker.wounds;
    const result = ReactionHandler.checkReaction(context);

    expect(result.shouldExecute).toBe(true);
    expect(attacker.wounds).toBeGreaterThan(initialWounds); // Damage was dealt
  });

  it('should handle dual-wield (reactions trigger per weapon)', () => {
    // This test verifies the pattern works, but dual-wield logic
    // is in UnitTurnPhaseHandler.executeAttack()
    let reactionCount = 0;

    // Simulate 2 weapon attacks
    for (let i = 0; i < 2; i++) {
      const context: ReactionTriggerContext = {
        triggerType: 'after-attacked',
        reactor: defender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        damageDealt: 10,
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);
      if (result.shouldExecute) {
        reactionCount++;
      }
    }

    expect(reactionCount).toBe(2); // Reaction triggered twice
  });
});
```

## Success Criteria

Part 3 is complete when:

- ✅ ReactionHandler correctly detects trigger types
- ✅ Reactions execute automatically during attack flow
- ✅ Dual-wield scenarios trigger reactions twice
- ✅ KO'd units cannot trigger reactions
- ✅ Combat log shows reaction usage
- ✅ All 8+ unit tests passing
- ✅ YAML has trigger tags for reaction abilities
- ✅ At least 1 implementable reaction ability works (Repost)

## Time Estimate

**Total: 8-12 hours**

- Define reaction triggers (1-2 hours)
- Create ReactionHandler (2-3 hours)
- Update UnitTurnPhaseHandler attack flow (2-3 hours)
- Update YAML (1 hour)
- Write tests (2-3 hours)
- Bug fixes and testing (1-2 hours)

## Next Step

After completing Part 3, proceed to **Part 4: Movement Abilities** which enables abilities that trigger based on unit movement during their turn.

## Notes

### Limited Implementable Reactions

Due to out-of-scope systems, most reaction abilities cannot be fully implemented in Part 3:

**Implementable**:
- ✅ **Repost** - Counter-attack with fixed damage

**Out of Scope** (requires additional systems):
- ❌ **Slippery** - Requires status effect system (Haste)
- ❌ **Parry** - Requires conditional stat bonuses (weapon-dependent)
- ❌ **Quick Shield** - Requires shield/absorption system

Focus on **Repost** for Part 3. Other reactions can be added once their dependencies are implemented.

# Ability System Integration - Part 4: Movement Abilities

**Version:** 1.0
**Created:** 2025-11-02
**Related:** [AbilitySystemOverview.md](AbilitySystemOverview.md), [Part2-ActionAbilities.md](AbilityIntegrationPlan-Part2-ActionAbilities.md), [CombatHierarchy.md](../../CombatHierarchy.md)

## Purpose

This document details the implementation of **Movement Abilities** - abilities that trigger automatically after a unit moves (or chooses not to move) during their turn.

**Depends On**: Part 2: Action Abilities (✅ MUST BE COMPLETE FIRST)

## Scope

**IN SCOPE:**
- ✅ Movement trigger system (after-move, after-no-move)
- ✅ MovementAbilityHandler for automatic execution
- ✅ Integration with movement flow in UnitTurnPhaseHandler
- ✅ Per-tile scaling (e.g., heal 3 HP per tile traveled)
- ✅ Percentage-based effects (e.g., restore 10% mana)
- ✅ Combat log integration
- ✅ YAML trigger tag configuration

**OUT OF SCOPE:**
- ❌ XP-based movement abilities (requires XP system changes)
- ❌ Movement stat bonuses from passive abilities (use stat-permanent in Part 1)
- ❌ Teleport/knockback abilities (requires position manipulation system)

## Overview

Movement abilities reward (or penalize) units based on their movement decisions. They trigger automatically at the end of the movement phase, before the action phase.

**Examples**:
- **Meditate**: Restore 10% mana if you don't move
- **Regenerate**: Restore 3 HP per tile traveled
- **Power Walker**: Gain +2 Physical Power after moving

**Key Differences**:
- Action: Manually chosen → executes
- Reaction: Triggers on attack events
- Movement: Triggers on movement/no-movement → automatic

## Implementation

### Phase 4.1: Define Movement Triggers

**New File**: [react-app/src/models/combat/abilities/MovementTrigger.ts](../../react-app/src/models/combat/abilities/MovementTrigger.ts)

```typescript
import type { CombatUnit } from '../CombatUnit';
import type { Position } from '../Position';
import type { CombatState } from '../CombatState';

/**
 * Types of movement triggers
 */
export type MovementTriggerType =
  | 'after-move'       // After unit moves (tilesMoved > 0)
  | 'after-no-move';   // After unit chooses not to move (tilesMoved === 0)

/**
 * Context for movement ability evaluation
 */
export interface MovementTriggerContext {
  /** Type of trigger */
  triggerType: MovementTriggerType;

  /** Unit that moved (or didn't move) */
  mover: CombatUnit;

  /** Starting position */
  startPosition: Position;

  /** Ending position */
  endPosition: Position;

  /** Number of tiles moved (Manhattan distance) */
  tilesMoved: number;

  /** Current combat state */
  state: CombatState;
}

/**
 * Result of movement ability execution
 */
export interface MovementAbilityResult {
  /** Whether ability was triggered */
  shouldExecute: boolean;

  /** Updated combat state */
  newState: CombatState;

  /** Combat log messages */
  logMessages: string[];
}
```

### Phase 4.2: Create MovementAbilityHandler

**New File**: [react-app/src/models/combat/abilities/MovementAbilityHandler.ts](../../react-app/src/models/combat/abilities/MovementAbilityHandler.ts)

```typescript
import type { CombatAbility, AbilityEffect } from '../CombatAbility';
import type { HumanoidUnit } from '../HumanoidUnit';
import type { MovementTriggerContext, MovementAbilityResult } from './MovementTrigger';
import type { StatModifier } from '../StatModifier';

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
      `<color=${moverColor}>${context.mover.name}</color> triggered ${movementAbility.name}!`
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

    if (actualHeal > 0 && 'removeWounds' in unit) {
      (unit as any).removeWounds(actualHeal);

      const unitColor = unit.isPlayerControlled ? '#00ff00' : '#ff0000';
      result.logMessages.push(
        `<color=${unitColor}>${unit.name}</color> restored ${actualHeal} HP!`
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
        `<color=${unitColor}>${unit.name}</color> restored ${actualRestore} mana!`
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
      stat: effect.params.stat,
      value: typeof effect.value === 'number' ? effect.value : 0,
      duration: effect.duration ?? 2, // Default 2 turns
      source: 'movement-ability',
      sourceName: 'Movement'
    };

    (unit as any).addStatModifier(modifier);

    const unitColor = unit.isPlayerControlled ? '#00ff00' : '#ff0000';
    const buffType = modifier.value > 0 ? 'increased' : 'decreased';

    result.logMessages.push(
      `<color=${unitColor}>${unit.name}</color>'s ${modifier.stat} ${buffType}!`
    );
  }
}
```

### Phase 4.3: Update UnitTurnPhaseHandler

**File**: [react-app/src/models/combat/UnitTurnPhaseHandler.ts](../../react-app/src/models/combat/UnitTurnPhaseHandler.ts)

Add movement ability trigger points:

```typescript
import { MovementAbilityHandler } from './abilities/MovementAbilityHandler';
import type { MovementTriggerContext } from './abilities/MovementTrigger';

/**
 * Called after movement animation completes
 */
completeMoveAnimation(): void {
  // ... existing code to update position ...

  // Calculate tiles moved (Manhattan distance)
  const tilesMoved = Math.abs(this.activePosition!.x - this.originalPosition!.x) +
                     Math.abs(this.activePosition!.y - this.originalPosition!.y);

  // ============================================================
  // TRIGGER: after-move (if unit moved)
  // ============================================================
  if (tilesMoved > 0) {
    const movementResult = MovementAbilityHandler.checkMovementAbility({
      triggerType: 'after-move',
      mover: this.activeUnit!,
      startPosition: this.originalPosition!,
      endPosition: this.activePosition!,
      tilesMoved,
      state: this.currentState!
    });

    if (movementResult.shouldExecute) {
      this.currentState = movementResult.newState;
      for (const msg of movementResult.logMessages) {
        this.currentState = CombatLogManager.addMessage(this.currentState, msg);
      }
    }
  }

  // ... rest of existing code ...
}

/**
 * Execute a turn action
 */
executeAction(action: TurnAction): CombatState {
  // ... existing code ...

  // ============================================================
  // TRIGGER: after-no-move (if Delay/End Turn without moving)
  // ============================================================
  if ((action.type === 'delay' || action.type === 'end-turn') && !this.hasMoved) {
    const movementResult = MovementAbilityHandler.checkMovementAbility({
      triggerType: 'after-no-move',
      mover: this.activeUnit!,
      startPosition: this.activePosition!,
      endPosition: this.activePosition!,
      tilesMoved: 0,
      state: newState
    });

    if (movementResult.shouldExecute) {
      newState = movementResult.newState;
      for (const msg of movementResult.logMessages) {
        newState = CombatLogManager.addMessage(newState, msg);
      }
    }
  }

  // ... existing action execution code ...
}
```

### Phase 4.4: Update ability-database.yaml

**File**: [react-app/src/data/ability-database.yaml](../../react-app/src/data/ability-database.yaml)

Add trigger tags to movement abilities (implementable ones only):

```yaml
# Apprentice Movement Abilities

- id: "meditate-001"
  name: "Meditate"
  description: "Restore 10% of max mana when you don't move"
  abilityType: "Movement"
  experiencePrice: 200
  tags: ["mana", "regeneration", "after-no-move"]
  effects:
    - type: "mana-restore"
      target: "self"
      value: "10%"  # Handler will parse percentage

# Rogue Movement Abilities

# Note: +1 Movement is better as a passive (stat-permanent)
# But shown here for reference
- id: "extra-movement-001"
  name: "+1 Movement"
  description: "Increases movement by 1"
  abilityType: "Movement"
  experiencePrice: 200
  tags: ["movement"]
  # This should be a Passive ability with stat-permanent effect
  # Leaving it here as Movement for structure demonstration

# Fighter Movement Abilities

# Note: Journeyman requires XP system (OUT OF SCOPE)
- id: "journeyman-001"
  name: "Journeyman"
  description: "Gain 1 XP per tile traveled"
  abilityType: "Movement"
  experiencePrice: 250
  tags: ["experience", "passive-gain", "after-move", "per-tile"]
  # effects: OUT OF SCOPE - requires XP gain system

# Custom Movement Abilities (Examples)

- id: "regenerate-001"
  name: "Regenerate"
  description: "Restore 3 HP per tile traveled"
  abilityType: "Movement"
  experiencePrice: 300
  tags: ["healing", "after-move", "per-tile"]
  effects:
    - type: "heal"
      target: "self"
      value: 3  # Will be multiplied by tilesMoved

- id: "power-walker-001"
  name: "Power Walker"
  description: "Gain +2 Physical Power for 2 turns after moving"
  abilityType: "Movement"
  experiencePrice: 250
  tags: ["buff", "after-move"]
  effects:
    - type: "stat-bonus"
      target: "self"
      value: 2
      duration: 2
      params:
        stat: "physicalPower"
```

**Important**: Only **Meditate**, **Regenerate**, and **Power Walker** are fully implementable in Part 4. Journeyman requires XP system changes.

### Phase 4.5: Testing

**File**: Create [react-app/src/models/combat/abilities/MovementAbilityHandler.test.ts](../../react-app/src/models/combat/abilities/MovementAbilityHandler.test.ts)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MovementAbilityHandler } from './MovementAbilityHandler';
import { HumanoidUnit } from '../HumanoidUnit';
import { UnitClass } from '../UnitClass';
import type { CombatAbility } from '../CombatAbility';
import type { MovementTriggerContext } from './MovementTrigger';
import type { CombatState } from '../CombatState';

describe('MovementAbilityHandler', () => {
  let testUnit: HumanoidUnit;
  let rogueClass: UnitClass;
  let regenerateAbility: CombatAbility;
  let meditateAbility: CombatAbility;
  let powerWalkerAbility: CombatAbility;
  let mockState: CombatState;

  beforeEach(() => {
    rogueClass = new UnitClass('rogue-001', 'Rogue', 'Test class', []);

    testUnit = new HumanoidUnit(
      'Test Rogue',
      rogueClass,
      100, // maxHealth
      50,  // maxMana
      10, 5, 8, 4, 3, 2, 6, 4
    );

    // Give unit some wounds and mana usage for testing
    testUnit.addWounds(30); // 70/100 HP
    testUnit.consumeMana(20); // 30/50 mana

    regenerateAbility = {
      id: 'regenerate-001',
      name: 'Regenerate',
      description: 'Heal 3 HP per tile',
      abilityType: 'Movement',
      experiencePrice: 300,
      tags: ['healing', 'after-move', 'per-tile'],
      effects: [
        {
          type: 'heal',
          target: 'self',
          value: 3
        }
      ]
    };

    meditateAbility = {
      id: 'meditate-001',
      name: 'Meditate',
      description: 'Restore 10% mana when not moving',
      abilityType: 'Movement',
      experiencePrice: 200,
      tags: ['mana', 'after-no-move'],
      effects: [
        {
          type: 'mana-restore',
          target: 'self',
          value: '10%'
        }
      ]
    };

    powerWalkerAbility = {
      id: 'power-walker-001',
      name: 'Power Walker',
      description: '+2 Physical Power after moving',
      abilityType: 'Movement',
      experiencePrice: 250,
      tags: ['buff', 'after-move'],
      effects: [
        {
          type: 'stat-bonus',
          target: 'self',
          value: 2,
          duration: 2,
          params: { stat: 'physicalPower' }
        }
      ]
    };

    mockState = createMockCombatState([testUnit]);
  });

  it('should trigger after-move ability when unit moves', () => {
    testUnit.learnAbility(regenerateAbility, rogueClass);
    testUnit.assignMovementAbility(regenerateAbility);

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(true);
    expect(result.logMessages).toContain('Test Rogue triggered Regenerate!');
  });

  it('should trigger after-no-move ability when unit does not move', () => {
    testUnit.learnAbility(meditateAbility, rogueClass);
    testUnit.assignMovementAbility(meditateAbility);

    const context: MovementTriggerContext = {
      triggerType: 'after-no-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 5, y: 5 },
      tilesMoved: 0,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(true);
    expect(result.logMessages).toContain('Test Rogue triggered Meditate!');
  });

  it('should scale per-tile effects correctly', () => {
    testUnit.learnAbility(regenerateAbility, rogueClass);
    testUnit.assignMovementAbility(regenerateAbility);

    const initialWounds = testUnit.wounds; // 30

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 9, y: 5 }, // 4 tiles
      tilesMoved: 4,
      state: mockState
    };

    MovementAbilityHandler.checkMovementAbility(context);

    // Should heal 3 HP × 4 tiles = 12 HP
    expect(testUnit.wounds).toBe(initialWounds - 12);
  });

  it('should handle percentage-based mana restore', () => {
    testUnit.learnAbility(meditateAbility, rogueClass);
    testUnit.assignMovementAbility(meditateAbility);

    const initialMana = testUnit.mana; // 30

    const context: MovementTriggerContext = {
      triggerType: 'after-no-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 5, y: 5 },
      tilesMoved: 0,
      state: mockState
    };

    MovementAbilityHandler.checkMovementAbility(context);

    // Should restore 10% of 50 max mana = 5 mana
    expect(testUnit.mana).toBe(initialMana + 5);
  });

  it('should apply stat modifiers from movement abilities', () => {
    testUnit.learnAbility(powerWalkerAbility, rogueClass);
    testUnit.assignMovementAbility(powerWalkerAbility);

    const basePower = testUnit.physicalPower; // 10

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 6, y: 5 },
      tilesMoved: 1,
      state: mockState
    };

    MovementAbilityHandler.checkMovementAbility(context);

    expect(testUnit.physicalPower).toBe(basePower + 2);
    expect(testUnit.statModifiers).toHaveLength(1);
  });

  it('should not trigger if unit has no movement ability', () => {
    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(false);
  });

  it('should not trigger if unit is KO\'d', () => {
    testUnit.learnAbility(regenerateAbility, rogueClass);
    testUnit.assignMovementAbility(regenerateAbility);
    testUnit.addWounds(100); // KO the unit

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(false);
  });

  it('should not trigger wrong ability type', () => {
    testUnit.learnAbility(meditateAbility, rogueClass);
    testUnit.assignMovementAbility(meditateAbility); // after-no-move ability

    const context: MovementTriggerContext = {
      triggerType: 'after-move', // Wrong trigger
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(false);
  });
});
```

## Success Criteria

Part 4 is complete when:

- ✅ Movement abilities trigger after move/no-move
- ✅ Per-tile scaling works correctly (3 HP × 4 tiles = 12 HP)
- ✅ Percentage-based effects calculated correctly (10% of max mana)
- ✅ Stat modifiers from movement abilities work
- ✅ Combat log shows movement ability usage
- ✅ All 10+ unit tests passing
- ✅ YAML has trigger tags for movement abilities
- ✅ At least 3 implementable movement abilities work (Meditate, Regenerate, Power Walker)

## Time Estimate

**Total: 6-8 hours**

- Define movement triggers (1 hour)
- Create MovementAbilityHandler (2-3 hours)
- Update UnitTurnPhaseHandler movement flow (1-2 hours)
- Update YAML (1 hour)
- Write tests (2-3 hours)
- Bug fixes and testing (1 hour)

## Next Step

After completing Part 4, all **core ability types** are implemented:
- ✅ Part 1: Passive Abilities
- ✅ Part 2: Action Abilities
- ✅ Part 3: Reaction Abilities
- ✅ Part 4: Movement Abilities

**Final Polish**: Update the main AbilityIntegrationPlan.md to serve as a **roadmap/index** referencing all 4 parts.

## Notes

### Limited Implementable Movement Abilities

Due to out-of-scope systems, some movement abilities cannot be fully implemented in Part 4:

**Implementable**:
- ✅ **Meditate** - Restore 10% mana when not moving
- ✅ **Regenerate** - Heal 3 HP per tile traveled
- ✅ **Power Walker** - +2 Physical Power after moving

**Out of Scope** (requires additional systems):
- ❌ **Journeyman** - Requires XP gain system
- ❌ **+1 Movement** - Should be a passive ability with stat-permanent (not a movement ability)

Focus on **Meditate**, **Regenerate**, and **Power Walker** for Part 4.

### Movement vs Passive Abilities

**Movement abilities** trigger based on movement decisions and grant **temporary** benefits.

**Passive abilities** are **permanent** while assigned.

If an ability grants a permanent movement stat increase (like "+1 Movement"), it should be a **Passive** ability with `stat-permanent` effect, NOT a Movement ability.

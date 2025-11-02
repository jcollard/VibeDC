# Ability System Integration - Part 1: Passive Abilities

**Version:** 1.0
**Created:** 2025-11-02
**Related:** [AbilitySystemOverview.md](AbilitySystemOverview.md), [StatModifierSystem.md](StatModifierSystem.md)

## Purpose

This document details the implementation of **Passive Ability stat modifier integration**. This is the first and simplest part of the ability system - automatically applying stat modifiers when passive abilities are assigned to units.

**Depends On**: StatModifierSystem.md (✅ Phases 1-5 COMPLETE)

## Scope

**IN SCOPE:**
- ✅ Auto-apply stat modifiers when passive ability assigned
- ✅ Remove old modifiers when swapping passive abilities
- ✅ Parse ability effects from YAML
- ✅ Add effects field to CombatAbility interface
- ✅ Testing passive ability stat bonuses

**OUT OF SCOPE:**
- ❌ Equipment permissions (Dual Wield, Shield Bearer, Heavy Armor)
- ❌ Damage calculation modifiers
- ❌ Combat-start timing effects (Ready ability)

## Overview

Passive abilities grant **permanent stat bonuses** while assigned to a unit's passive slot. The StatModifier system (already complete) handles the actual stat calculations. This phase just needs to:

1. Add `effects` field to CombatAbility
2. Update `assignPassiveAbility()` to auto-apply modifiers
3. Parse effects from YAML
4. Test the integration

## Implementation

### Phase 1.1: Update HumanoidUnit.assignPassiveAbility()

**Current State**: [HumanoidUnit.ts](../../react-app/src/models/combat/HumanoidUnit.ts)

The method currently just sets the ability reference without applying effects:
```typescript
assignPassiveAbility(ability: CombatAbility | null): boolean {
  if (ability && !this.hasAbility(ability)) {
    return false;
  }

  this._passiveAbility = ability;
  return true;
}
```

**New Implementation**:

```typescript
assignPassiveAbility(ability: CombatAbility | null): boolean {
  // Validate ability is learned
  if (ability && !this.hasAbility(ability)) {
    return false;
  }

  // Validate ability type
  if (ability && ability.abilityType !== 'Passive') {
    console.warn(`Cannot assign non-passive ability ${ability.id} to passive slot`);
    return false;
  }

  // Remove stat modifiers from previous passive ability
  if (this._passiveAbility) {
    this.removeStatModifiersBySource(this._passiveAbility.id);
  }

  // Update passive ability reference
  this._passiveAbility = ability;

  // Apply stat modifiers from new passive ability
  if (ability) {
    this.applyPassiveAbilityModifiers(ability);
  }

  return true;
}

/**
 * Apply stat modifiers from a passive ability
 */
private applyPassiveAbilityModifiers(ability: CombatAbility): void {
  // Filter for stat-permanent effects
  const statEffects = ability.effects?.filter(
    effect => effect.type === 'stat-permanent' || effect.type === 'stat-bonus'
  ) ?? [];

  for (const effect of statEffects) {
    if (!effect.params?.stat) {
      console.warn(`Stat effect in ability ${ability.id} missing stat parameter`);
      continue;
    }

    if (!this.isValidStatType(effect.params.stat)) {
      console.warn(`Invalid stat type in ability ${ability.id}: ${effect.params.stat}`);
      continue;
    }

    const modifier: StatModifier = {
      id: `${ability.id}-${effect.params.stat}`,
      stat: effect.params.stat as StatType,
      value: typeof effect.value === 'number' ? effect.value : 0,
      duration: -1, // Permanent while assigned
      source: ability.id,
      sourceName: ability.name,
      icon: ability.icon
    };

    this.addStatModifier(modifier);
  }
}

/**
 * Validate stat type string
 */
private isValidStatType(stat: string): stat is StatType {
  const validStats: StatType[] = [
    'maxHealth', 'maxMana', 'physicalPower', 'magicPower',
    'speed', 'movement', 'physicalEvade', 'magicEvade',
    'courage', 'attunement'
  ];
  return validStats.includes(stat as StatType);
}
```

**Why WeakMap Not Needed**: Stat modifiers are stored in `unit._statModifiers` array, not in a map keyed by unit name.

### Phase 1.1.5: Phase Handler Lifecycle Awareness

**CRITICAL**: Per [CombatHierarchy.md](../../CombatHierarchy.md), phase handlers are **recreated** on each phase entry.

**Implication for Passive Abilities**:
- Passive stat modifiers are stored in `HumanoidUnit._statModifiers` (persists across phase transitions) ✅
- Phase handlers are recreated each turn (don't persist) ✅
- Stat modifiers survive phase transitions (correct design) ✅
- Don't store passive ability state in phase handler instance variables ❌

**Pattern**:
```typescript
class UnitTurnPhaseHandler {
  // ❌ DON'T: Store ability state here - lost on phase re-entry
  private activePassiveBonus: number = 0;

  // ✅ DO: Read from unit's persistent state
  updatePhase(state: CombatState, ...): CombatState | null {
    const unit = this.activeUnit!;
    // Passive modifiers already in unit.statModifiers - just use stat getters
    const totalPower = unit.physicalPower; // Includes passive bonuses automatically
  }
}
```

**Rationale**: Phase handlers don't persist between phases, so instance variables are lost. Always read from `CombatState` or unit instance.

### Phase 1.2: Add CombatAbility.effects Field

**File**: [react-app/src/models/combat/CombatAbility.ts](../../react-app/src/models/combat/CombatAbility.ts)

Add effect configuration to CombatAbility interface:

```typescript
/**
 * Represents an effect applied by an ability
 */
export interface AbilityEffect {
  /**
   * Type of effect
   */
  type: 'stat-permanent' | 'stat-bonus' | 'stat-penalty' |
        'damage-physical' | 'damage-magical' | 'heal' |
        'mana-restore' | 'action-timer-modify';

  /**
   * Effect target (who receives the effect)
   */
  target: 'self' | 'target' | 'ally' | 'enemy' | 'all-allies' | 'all-enemies';

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
 * Represents a learnable combat ability
 */
export interface CombatAbility {
  id: string;
  name: string;
  description: string;
  abilityType: 'Action' | 'Passive' | 'Movement' | 'Reaction';
  experiencePrice: number;
  tags: string[];

  /**
   * Effects applied when ability is used/active
   */
  effects?: AbilityEffect[];

  /**
   * Icon sprite ID for UI display
   */
  icon?: string;
}
```

### Phase 1.3: Update AbilityDataLoader

**File**: [react-app/src/data/loaders/AbilityDataLoader.ts](../../react-app/src/data/loaders/AbilityDataLoader.ts)

Parse effects from YAML:

```typescript
/**
 * Parse an ability effect from YAML data
 */
private parseAbilityEffect(effectData: any): AbilityEffect {
  return {
    type: effectData.type,
    target: effectData.target ?? 'self',
    value: effectData.value,
    duration: effectData.duration,
    chance: effectData.chance,
    params: effectData.params
  };
}

/**
 * Parse a single ability from YAML
 */
private parseAbility(data: any): CombatAbility {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    abilityType: data.abilityType,
    experiencePrice: data.experiencePrice,
    tags: data.tags ?? [],
    effects: data.effects?.map((e: any) => this.parseAbilityEffect(e)) ?? [],
    icon: data.icon
  };
}
```

### Phase 1.4: Update ability-database.yaml

**File**: [react-app/src/data/ability-database.yaml](../../react-app/src/data/ability-database.yaml)

Add effects to passive abilities (implementable ones only):

```yaml
# Fighter Passive Abilities
- id: "meat-shield-001"
  name: "Meat Shield"
  description: "Increases max HP by 50"
  abilityType: "Passive"
  experiencePrice: 500
  tags: ["defensive", "health"]
  effects:
    - type: "stat-permanent"
      target: "self"
      value: 50
      params:
        stat: "maxHealth"

# Rogue Passive Abilities
- id: "fast-001"
  name: "Fast"
  description: "+3 Speed"
  abilityType: "Passive"
  experiencePrice: 400
  tags: ["speed"]
  effects:
    - type: "stat-permanent"
      target: "self"
      value: 3
      params:
        stat: "speed"

- id: "dodge-001"
  name: "Dodge"
  description: "Increases Physical Evasion by 10"
  abilityType: "Passive"
  experiencePrice: 500
  tags: ["defensive", "evasion"]
  effects:
    - type: "stat-permanent"
      target: "self"
      value: 10
      params:
        stat: "physicalEvade"

# Apprentice Passive Abilities
- id: "focused-001"
  name: "Focused"
  description: "Increases max MP by 50"
  abilityType: "Passive"
  experiencePrice: 500
  tags: ["mana"]
  effects:
    - type: "stat-permanent"
      target: "self"
      value: 50
      params:
        stat: "maxMana"
```

**Note**: Out-of-scope passive abilities (Shield Bearer, Dual Wield, Ready, Mana Shield) should remain in YAML but WITHOUT effects field for now.

### Phase 1.5: Testing

**File**: Create [react-app/src/models/combat/HumanoidUnit.passiveability.test.ts](../../react-app/src/models/combat/HumanoidUnit.passiveability.test.ts)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClass } from './UnitClass';
import { CombatAbility } from './CombatAbility';
import type { AbilityEffect } from './CombatAbility';

describe('HumanoidUnit - Passive Ability Integration', () => {
  let testUnit: HumanoidUnit;
  let fighterClass: UnitClass;
  let meatShieldAbility: CombatAbility;
  let fastAbility: CombatAbility;

  beforeEach(() => {
    fighterClass = new UnitClass(
      'fighter-001',
      'Fighter',
      'A basic warrior class',
      []
    );

    testUnit = new HumanoidUnit(
      'Test Fighter',
      fighterClass,
      100, // baseHealth
      50,  // baseMana
      10,  // basePhysicalPower
      5,   // baseMagicPower
      8,   // baseSpeed
      4,   // baseMovement
      3,   // basePhysicalEvade
      2,   // baseMagicEvade
      6,   // baseCourage
      4    // baseAttunement
    );

    // Create test abilities with effects
    meatShieldAbility = {
      id: 'meat-shield-001',
      name: 'Meat Shield',
      description: '+50 HP',
      abilityType: 'Passive',
      experiencePrice: 100,
      tags: ['defensive'],
      effects: [
        {
          type: 'stat-permanent',
          target: 'self',
          value: 50,
          params: { stat: 'maxHealth' }
        }
      ]
    };

    fastAbility = {
      id: 'fast-001',
      name: 'Fast',
      description: '+3 Speed',
      abilityType: 'Passive',
      experiencePrice: 50,
      tags: ['speed'],
      effects: [
        {
          type: 'stat-permanent',
          target: 'self',
          value: 3,
          params: { stat: 'speed' }
        }
      ]
    };

    // Learn the abilities
    testUnit.learnAbility(meatShieldAbility, fighterClass);
    testUnit.learnAbility(fastAbility, fighterClass);
  });

  it('should apply stat modifiers when passive ability assigned', () => {
    const baseHealth = testUnit.maxHealth;

    testUnit.assignPassiveAbility(meatShieldAbility);

    expect(testUnit.maxHealth).toBe(baseHealth + 50);
    expect(testUnit.statModifiers).toHaveLength(1);
    expect(testUnit.statModifiers[0].source).toBe('meat-shield-001');
  });

  it('should reflect modifier in stat getter', () => {
    expect(testUnit.maxHealth).toBe(100); // Base

    testUnit.assignPassiveAbility(meatShieldAbility);

    expect(testUnit.maxHealth).toBe(150); // Base + modifier
  });

  it('should remove old modifiers when swapping passive abilities', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);
    expect(testUnit.maxHealth).toBe(150);

    testUnit.assignPassiveAbility(fastAbility);

    expect(testUnit.maxHealth).toBe(100); // Back to base
    expect(testUnit.speed).toBe(11); // Base 8 + 3
    expect(testUnit.statModifiers).toHaveLength(1);
    expect(testUnit.statModifiers[0].source).toBe('fast-001');
  });

  it('should remove all modifiers when removing passive ability', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);
    expect(testUnit.maxHealth).toBe(150);

    testUnit.assignPassiveAbility(null);

    expect(testUnit.maxHealth).toBe(100);
    expect(testUnit.statModifiers).toHaveLength(0);
  });

  it('should handle passive with multiple stat effects', () => {
    const multiStatAbility: CombatAbility = {
      id: 'multi-stat-001',
      name: 'Multi Stat',
      description: '+10 HP and +2 Speed',
      abilityType: 'Passive',
      experiencePrice: 100,
      tags: ['buff'],
      effects: [
        {
          type: 'stat-permanent',
          target: 'self',
          value: 10,
          params: { stat: 'maxHealth' }
        },
        {
          type: 'stat-permanent',
          target: 'self',
          value: 2,
          params: { stat: 'speed' }
        }
      ]
    };

    testUnit.learnAbility(multiStatAbility, fighterClass);
    testUnit.assignPassiveAbility(multiStatAbility);

    expect(testUnit.maxHealth).toBe(110);
    expect(testUnit.speed).toBe(10);
    expect(testUnit.statModifiers).toHaveLength(2);
  });

  it('should gracefully handle invalid stat type', () => {
    const invalidAbility: CombatAbility = {
      id: 'invalid-001',
      name: 'Invalid',
      description: 'Invalid stat',
      abilityType: 'Passive',
      experiencePrice: 100,
      tags: ['test'],
      effects: [
        {
          type: 'stat-permanent',
          target: 'self',
          value: 10,
          params: { stat: 'invalidStat' }
        }
      ]
    };

    testUnit.learnAbility(invalidAbility, fighterClass);
    testUnit.assignPassiveAbility(invalidAbility);

    expect(testUnit.statModifiers).toHaveLength(0);
  });

  it('should handle passive without effects field', () => {
    const noEffectsAbility: CombatAbility = {
      id: 'no-effects-001',
      name: 'No Effects',
      description: 'No effects defined',
      abilityType: 'Passive',
      experiencePrice: 100,
      tags: ['test']
      // effects field missing
    };

    testUnit.learnAbility(noEffectsAbility, fighterClass);
    testUnit.assignPassiveAbility(noEffectsAbility);

    expect(testUnit.statModifiers).toHaveLength(0);
  });

  it('should serialize stat modifiers from passive ability', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);

    const json = testUnit.toJSON();

    expect(json.statModifiers).toHaveLength(1);
    expect(json.statModifiers[0].source).toBe('meat-shield-001');
    expect(json.statModifiers[0].value).toBe(50);
  });

  it('should deserialize and restore passive ability modifiers', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);
    expect(testUnit.maxHealth).toBe(150);

    const json = testUnit.toJSON();
    const restored = HumanoidUnit.fromJSON(json);

    expect(restored).not.toBeNull();
    expect(restored!.maxHealth).toBe(150);
    expect(restored!.statModifiers).toHaveLength(1);
    expect(restored!.statModifiers[0].source).toBe('meat-shield-001');
  });

  it('should not assign non-passive ability to passive slot', () => {
    const actionAbility: CombatAbility = {
      id: 'heal-001',
      name: 'Heal',
      description: 'Heal a unit',
      abilityType: 'Action',
      experiencePrice: 100,
      tags: ['healing'],
      effects: []
    };

    testUnit.learnAbility(actionAbility, fighterClass);
    const result = testUnit.assignPassiveAbility(actionAbility);

    expect(result).toBe(false);
    expect(testUnit.passiveAbility).toBeNull();
  });
});
```

## Success Criteria

Phase 1 is complete when:

- ✅ Passive abilities automatically apply stat modifiers on assignment
- ✅ Stat getters reflect passive ability bonuses
- ✅ Swapping passives removes old and applies new modifiers
- ✅ Serialization preserves passive ability modifiers
- ✅ All 14 unit tests passing
- ✅ AbilityEffect interface defined
- ✅ YAML parsing handles effects field
- ✅ 4 implementable passive abilities have effects in YAML

**IMPLEMENTATION COMPLETE** ✅ (2025-11-02)

## Time Estimate

**Total: 8-12 hours**

- Update HumanoidUnit (2-3 hours)
- Add AbilityEffect interface (1 hour)
- Update AbilityDataLoader (1-2 hours)
- Update YAML (1 hour)
- Write tests (2-3 hours)
- Bug fixes and testing (1-2 hours)

## Next Step

After completing Part 1, proceed to **Part 2: Action Abilities** which builds on this foundation to enable action ability execution during combat.

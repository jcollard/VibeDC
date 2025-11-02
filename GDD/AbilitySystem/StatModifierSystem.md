# Stat Modifier System - Implementation Plan

**Version:** 1.1
**Created:** 2025-11-01
**Updated:** 2025-11-01
**Status:** Core Implementation Complete (Phases 1-5)
**Related:** [AbilitySystemOverview.md](./AbilitySystemOverview.md), [CombatUnit.ts](../../react-app/src/models/combat/CombatUnit.ts), [HumanoidUnit.ts](../../react-app/src/models/combat/HumanoidUnit.ts)

## Implementation Status

**Completed**: 2025-11-01

The core StatModifier system has been successfully implemented with the following changes:

### Files Created
- [StatModifier.ts](../../react-app/src/models/combat/StatModifier.ts) - Core interfaces and types
- [HumanoidUnit.statmodifier.test.ts](../../react-app/src/models/combat/HumanoidUnit.statmodifier.test.ts) - 24 comprehensive unit tests

### Files Modified
- [HumanoidUnit.ts](../../react-app/src/models/combat/HumanoidUnit.ts):
  - Added `_statModifiers` array and getter
  - Added `addStatModifier()`, `removeStatModifier()`, `removeStatModifiersBySource()` methods
  - Added `decrementModifierDurations()` for turn-based expiration
  - Added private `getStatModifierTotal()` helper
  - Updated all 10 stat getters to include modifiers
  - Updated `toJSON()` and `fromJSON()` for serialization

### Test Results
All 24 tests passing, covering:
- Adding/removing modifiers
- Positive and negative modifiers (buffs/debuffs)
- Multiple modifiers stacking
- Duration decrement and expiration
- Permanent modifiers (duration -1)
- Serialization/deserialization
- All 10 stat types

### Still Pending
- **Phase 4**: Passive ability integration (auto-apply modifiers on assignment)
- **Phase 6**: Duration tracking integration with UnitTurnPhaseHandler
- **Phase 7**: Ability effect application helper functions
- **Phase 8**: UI integration for displaying buffs/debuffs

## Purpose

This document describes the **Stat Modifier System** for applying temporary and permanent stat changes to combat units. This system is **essential for buffs, debuffs, and passive abilities** and is the first priority for ability system implementation.

## Feature Summary

The Stat Modifier System provides:
- **Temporary Buffs/Debuffs**: Timed stat changes (e.g., Strength +6 for 5 turns)
- **Permanent Passive Bonuses**: Stat increases from passive abilities (e.g., Meat Shield +50 HP)
- **Multiple Modifier Stacking**: Multiple modifiers can affect the same stat
- **Duration Tracking**: Turn-based expiration for temporary effects
- **Source Tracking**: Track which ability/source applied each modifier

## Core Concepts

### Stat Modifiers

A **Stat Modifier** is a change to a unit's stat value. Modifiers have:
- **Target Stat**: Which stat to modify (health, speed, physicalPower, etc.)
- **Value**: Amount to add/subtract (can be positive or negative)
- **Duration**: Number of turns (-1 = permanent, >0 = temporary, 0 = expired)
- **Source**: What applied this modifier (ability ID, equipment ID, etc.)

### Modifier Application

Stats in `CombatUnit` are **getters** that calculate the final value by:
1. Start with base stat value
2. Add all active modifiers for that stat
3. Return the total

**Example**:
```typescript
get physicalPower(): number {
  const base = this.basePhysicalPower;
  const modifiers = this.getModifiersForStat('physicalPower');
  const total = modifiers.reduce((sum, mod) => sum + mod.value, base);
  return Math.max(0, total); // Never negative
}
```

### Duration Tracking

- **Permanent Modifiers** (duration = -1): Never expire, removed only when source is removed
- **Temporary Modifiers** (duration > 0): Countdown at end of affected unit's turn
- **Expiration**: When duration reaches 0, modifier is removed

## Data Structures

### StatModifier Interface

```typescript
/**
 * Represents a modification to a unit's stat
 */
export interface StatModifier {
  /**
   * Unique identifier for this modifier instance
   */
  id: string;

  /**
   * Which stat this modifier affects
   */
  stat: StatType;

  /**
   * Amount to modify the stat (can be positive or negative)
   */
  value: number;

  /**
   * Number of turns remaining (-1 = permanent, >0 = temporary, 0 = expired)
   * Counts down at end of affected unit's turn
   */
  duration: number;

  /**
   * What applied this modifier (ability ID, equipment ID, etc.)
   */
  source: string;

  /**
   * Human-readable source name (for UI display)
   */
  sourceName: string;

  /**
   * Optional icon sprite ID for UI display
   */
  icon?: string;
}

/**
 * Stat types that can be modified
 */
export type StatType =
  | 'maxHealth'        // Maximum health capacity
  | 'maxMana'          // Maximum mana capacity
  | 'physicalPower'    // Physical attack power
  | 'magicPower'       // Magical attack power
  | 'speed'            // Turn order speed
  | 'movement'         // Movement range
  | 'physicalEvade'    // Physical evasion chance
  | 'magicEvade'       // Magical evasion chance
  | 'courage'          // Courage stat
  | 'attunement';      // Attunement stat
```

### StatModifierJSON Interface

```typescript
/**
 * JSON representation of a StatModifier for serialization
 */
export interface StatModifierJSON {
  id: string;
  stat: StatType;
  value: number;
  duration: number;
  source: string;
  sourceName: string;
  icon?: string;
}
```

## Implementation in HumanoidUnit

### Add Modifier Storage

```typescript
/**
 * Active stat modifiers on this unit
 */
private _statModifiers: StatModifier[] = [];

/**
 * Get all active stat modifiers
 */
get statModifiers(): ReadonlyArray<StatModifier> {
  return this._statModifiers;
}
```

### Add Modifier Management Methods

```typescript
/**
 * Add a stat modifier to this unit
 * @param modifier The modifier to add
 */
addStatModifier(modifier: StatModifier): void {
  this._statModifiers.push(modifier);
}

/**
 * Remove a stat modifier by ID
 * @param modifierId The ID of the modifier to remove
 * @returns true if removed, false if not found
 */
removeStatModifier(modifierId: string): boolean {
  const index = this._statModifiers.findIndex(m => m.id === modifierId);
  if (index === -1) {
    return false;
  }
  this._statModifiers.splice(index, 1);
  return true;
}

/**
 * Remove all stat modifiers from a specific source
 * @param source The source ID to remove modifiers from
 * @returns Number of modifiers removed
 */
removeStatModifiersBySource(source: string): number {
  const initialLength = this._statModifiers.length;
  this._statModifiers = this._statModifiers.filter(m => m.source !== source);
  return initialLength - this._statModifiers.length;
}

/**
 * Get all modifiers affecting a specific stat
 * @param stat The stat type to filter by
 * @returns Array of modifiers affecting that stat
 */
getModifiersForStat(stat: StatType): StatModifier[] {
  return this._statModifiers.filter(m => m.stat === stat);
}

/**
 * Decrement duration on all temporary modifiers
 * Call this at the end of this unit's turn
 * @returns Array of modifiers that expired
 */
decrementModifierDurations(): StatModifier[] {
  const expired: StatModifier[] = [];

  for (const modifier of this._statModifiers) {
    if (modifier.duration > 0) {
      modifier.duration--;
      if (modifier.duration === 0) {
        expired.push(modifier);
      }
    }
  }

  // Remove expired modifiers
  for (const expiredMod of expired) {
    this.removeStatModifier(expiredMod.id);
  }

  return expired;
}

/**
 * Get total modifier value for a specific stat
 * @param stat The stat to calculate modifiers for
 * @returns Sum of all modifier values for that stat
 */
private getStatModifierTotal(stat: StatType): number {
  return this._statModifiers
    .filter(m => m.stat === stat)
    .reduce((sum, m) => sum + m.value, 0);
}
```

### Update Stat Getters

Modify stat getters to include modifiers:

```typescript
get maxHealth(): number {
  return Math.max(1, this.baseHealth + this.getStatModifierTotal('maxHealth'));
}

get maxMana(): number {
  return Math.max(0, this.baseMana + this.getStatModifierTotal('maxMana'));
}

get physicalPower(): number {
  return Math.max(0, this.basePhysicalPower + this.getStatModifierTotal('physicalPower'));
}

get magicPower(): number {
  return Math.max(0, this.baseMagicPower + this.getStatModifierTotal('magicPower'));
}

get speed(): number {
  return Math.max(1, this.baseSpeed + this.getStatModifierTotal('speed'));
}

get movement(): number {
  return Math.max(0, this.baseMovement + this.getStatModifierTotal('movement'));
}

get physicalEvade(): number {
  return Math.max(0, this.basePhysicalEvade + this.getStatModifierTotal('physicalEvade'));
}

get magicEvade(): number {
  return Math.max(0, this.baseMagicEvade + this.getStatModifierTotal('magicEvade'));
}

get courage(): number {
  return Math.max(0, this.baseCourage + this.getStatModifierTotal('courage'));
}

get attunement(): number {
  return Math.max(0, this.baseAttunement + this.getStatModifierTotal('attunement'));
}
```

### Update Serialization

Add stat modifiers to JSON serialization:

```typescript
// In HumanoidUnitJSON interface
export interface HumanoidUnitJSON {
  // ... existing fields ...
  statModifiers: StatModifierJSON[];
}

// In toJSON() method
toJSON(): HumanoidUnitJSON {
  return {
    // ... existing fields ...
    statModifiers: this._statModifiers.map(m => ({
      id: m.id,
      stat: m.stat,
      value: m.value,
      duration: m.duration,
      source: m.source,
      sourceName: m.sourceName,
      icon: m.icon,
    })),
  };
}

// In fromJSON() method
static fromJSON(json: HumanoidUnitJSON): HumanoidUnit | null {
  // ... existing code ...

  // Restore stat modifiers
  if (json.statModifiers) {
    for (const modJson of json.statModifiers) {
      unit._statModifiers.push({
        id: modJson.id,
        stat: modJson.stat,
        value: modJson.value,
        duration: modJson.duration,
        source: modJson.source,
        sourceName: modJson.sourceName,
        icon: modJson.icon,
      });
    }
  }

  return unit;
}
```

## Passive Ability Integration

### Apply Passive Modifiers on Assignment

When a passive ability is assigned to the passive slot, apply its stat modifiers:

```typescript
assignPassiveAbility(ability: CombatAbility | null): boolean {
  // Remove old passive modifiers
  if (this._passiveAbility !== null) {
    this.removeStatModifiersBySource(this._passiveAbility.id);
  }

  // Clear slot
  if (ability === null) {
    this._passiveAbility = null;
    return true;
  }

  // Validate ability type and learned status
  if (ability.abilityType !== "Passive") {
    return false;
  }

  if (!this.hasAbility(ability)) {
    return false;
  }

  // Assign ability
  this._passiveAbility = ability;

  // Apply passive stat modifiers (if ability has effects)
  if (ability.effects) {
    for (const effect of ability.effects) {
      if (effect.type === 'stat-permanent' || effect.type === 'stat-bonus') {
        const modifier: StatModifier = {
          id: `${ability.id}-${effect.params?.stat}-${Date.now()}`,
          stat: effect.params?.stat as StatType,
          value: typeof effect.value === 'number' ? effect.value : 0,
          duration: -1, // Permanent while passive is equipped
          source: ability.id,
          sourceName: ability.name,
          icon: ability.icon,
        };
        this.addStatModifier(modifier);
      }
    }
  }

  return true;
}
```

## Ability Effect Application

### Apply Temporary Buffs/Debuffs

When an ability with stat effects is executed:

```typescript
/**
 * Apply a stat modifier effect to a target unit
 * Used by ability execution system
 */
static applyStatModifierEffect(
  effect: AbilityEffect,
  source: CombatAbility,
  target: CombatUnit,
  duration: number
): void {
  if (!effect.params?.stat) {
    console.warn('Stat effect missing stat parameter');
    return;
  }

  const modifier: StatModifier = {
    id: `${source.id}-${target.name}-${Date.now()}`,
    stat: effect.params.stat as StatType,
    value: typeof effect.value === 'number' ? effect.value : 0,
    duration: duration,
    source: source.id,
    sourceName: source.name,
    icon: source.icon,
  };

  // Assuming target is HumanoidUnit (or has addStatModifier method)
  if ('addStatModifier' in target) {
    (target as any).addStatModifier(modifier);
  }
}
```

## Duration Countdown Integration

### UnitTurnPhaseHandler Integration

At the end of each unit's turn, decrement modifier durations:

```typescript
// In UnitTurnPhaseHandler, at end of unit's turn
private endUnitTurn(unit: CombatUnit, state: CombatState): CombatState {
  // ... existing end-of-turn logic ...

  // Decrement stat modifier durations
  if ('decrementModifierDurations' in unit) {
    const expired = (unit as any).decrementModifierDurations();

    // Log expired modifiers to combat log
    for (const modifier of expired) {
      const message = `${modifier.sourceName} wore off from ${unit.name}`;
      // TODO: Add to combat log
      console.log(message);
    }
  }

  return state;
}
```

## YAML Configuration Examples

### Passive Ability (Permanent Modifier)

```yaml
- id: "meat-shield-001"
  name: "Meat Shield"
  description: "Increases HP by 50"
  abilityType: "Passive"
  experiencePrice: 500
  tags:
    - "defensive"
    - "health"
  effects:
    - type: "stat-permanent"
      target: "self"
      value: 50
      params:
        stat: "maxHealth"
```

### Buff Action (Temporary Modifier)

```yaml
- id: "strength-001"
  name: "Strength"
  description: "Increases a unit's Physical Power by 6 for 5 turns"
  abilityType: "Action"
  experiencePrice: 200
  tags:
    - "magic"
    - "buff"
  costs:
    - type: "mana"
      amount: 6
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: false
    validTargets:
      - "ally"
      - "self"
  effects:
    - type: "stat-bonus"
      target: "target"
      value: 6
      duration: 5
      params:
        stat: "physicalPower"
```

### Debuff Action (Temporary Penalty)

```yaml
- id: "weakness-001"
  name: "Weakness"
  description: "Decreases a unit's Physical Power by 6 for 5 turns"
  abilityType: "Action"
  experiencePrice: 200
  tags:
    - "magic"
    - "debuff"
  costs:
    - type: "mana"
      amount: 6
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: false
    validTargets:
      - "enemy"
  effects:
    - type: "stat-penalty"
      target: "target"
      value: -6  # Negative value for penalty
      duration: 5
      params:
        stat: "physicalPower"
```

## Implementation Checklist

### Phase 1: Core Data Structures ✅ COMPLETE
- [x] Create `StatModifier` interface in `models/combat/StatModifier.ts`
- [x] Create `StatType` type definition
- [x] Create `StatModifierJSON` interface for serialization
- [x] Write unit tests for data structures

### Phase 2: HumanoidUnit Integration ✅ COMPLETE
- [x] Add `_statModifiers` array to HumanoidUnit
- [x] Implement `addStatModifier()` method
- [x] Implement `removeStatModifier()` method
- [x] Implement `removeStatModifiersBySource()` method
- [x] Implement `getModifiersForStat()` method (implemented as private `getStatModifierTotal()`)
- [x] Implement `decrementModifierDurations()` method
- [x] Implement `getStatModifierTotal()` private helper
- [x] Write unit tests for modifier management (24 comprehensive tests)

### Phase 3: Stat Getter Updates ✅ COMPLETE
- [x] Update `maxHealth` getter to include modifiers
- [x] Update `maxMana` getter to include modifiers
- [x] Update `physicalPower` getter to include modifiers
- [x] Update `magicPower` getter to include modifiers
- [x] Update `speed` getter to include modifiers
- [x] Update `movement` getter to include modifiers
- [x] Update `physicalEvade` getter to include modifiers
- [x] Update `magicEvade` getter to include modifiers
- [x] Update `courage` getter to include modifiers
- [x] Update `attunement` getter to include modifiers
- [x] Write unit tests for modified stat calculations

### Phase 4: Passive Ability Integration ⏳ PENDING
- [ ] Update `assignPassiveAbility()` to apply stat modifiers
- [ ] Update `assignPassiveAbility()` to remove old modifiers when changing
- [ ] Test passive ability stat bonuses
- [ ] Test passive ability swapping

### Phase 5: Serialization ✅ COMPLETE
- [x] Add `statModifiers` field to `HumanoidUnitJSON`
- [x] Update `toJSON()` to serialize stat modifiers
- [x] Update `fromJSON()` to deserialize stat modifiers
- [x] Test save/load with active modifiers
- [x] Test save/load with expired modifiers

### Phase 6: Duration Tracking
- [ ] Integrate `decrementModifierDurations()` into `UnitTurnPhaseHandler`
- [ ] Add combat log messages for expired modifiers
- [ ] Test modifier expiration timing
- [ ] Test permanent modifiers never expire

### Phase 7: Ability Effect Application
- [ ] Create `applyStatModifierEffect()` helper function
- [ ] Integrate with `AbilityExecutor` (when implemented)
- [ ] Test temporary buff application
- [ ] Test temporary debuff application
- [ ] Test multiple modifiers stacking

### Phase 8: UI Integration
- [ ] Display active buffs/debuffs on unit info panel
- [ ] Show buff/debuff icons above units
- [ ] Show duration remaining for temporary effects
- [ ] Add visual indicators (green for buffs, red for debuffs)

## Testing Strategy

### Unit Tests

```typescript
describe('StatModifier System', () => {
  test('Adding stat modifier increases stat value', () => {
    const unit = createTestUnit();
    const basePower = unit.physicalPower;

    unit.addStatModifier({
      id: 'test-1',
      stat: 'physicalPower',
      value: 10,
      duration: -1,
      source: 'test',
      sourceName: 'Test',
    });

    expect(unit.physicalPower).toBe(basePower + 10);
  });

  test('Multiple modifiers stack', () => {
    const unit = createTestUnit();
    const basePower = unit.physicalPower;

    unit.addStatModifier({
      id: 'test-1',
      stat: 'physicalPower',
      value: 10,
      duration: 0,
      source: 'test1',
      sourceName: 'Test 1',
    });

    unit.addStatModifier({
      id: 'test-2',
      stat: 'physicalPower',
      value: 5,
      duration: 0,
      source: 'test2',
      sourceName: 'Test 2',
    });

    expect(unit.physicalPower).toBe(basePower + 15);
  });

  test('Negative modifiers reduce stats', () => {
    const unit = createTestUnit();
    const basePower = unit.physicalPower;

    unit.addStatModifier({
      id: 'test-1',
      stat: 'physicalPower',
      value: -5,
      duration: -1,
      source: 'test',
      sourceName: 'Test',
    });

    expect(unit.physicalPower).toBe(basePower - 5);
  });

  test('Stats never go below minimum', () => {
    const unit = createTestUnit();

    unit.addStatModifier({
      id: 'test-1',
      stat: 'physicalPower',
      value: -1000,
      duration: -1,
      source: 'test',
      sourceName: 'Test',
    });

    expect(unit.physicalPower).toBe(0); // Min is 0
  });

  test('Modifier duration decrements correctly', () => {
    const unit = createTestUnit();

    unit.addStatModifier({
      id: 'test-1',
      stat: 'physicalPower',
      value: 10,
      duration: 3,
      source: 'test',
      sourceName: 'Test',
    });

    const expired1 = unit.decrementModifierDurations();
    expect(expired1.length).toBe(0);
    expect(unit.statModifiers[0].duration).toBe(2);

    const expired2 = unit.decrementModifierDurations();
    expect(expired2.length).toBe(0);
    expect(unit.statModifiers[0].duration).toBe(1);

    const expired3 = unit.decrementModifierDurations();
    expect(expired3.length).toBe(1);
    expect(unit.statModifiers.length).toBe(0);
  });

  test('Permanent modifiers never expire', () => {
    const unit = createTestUnit();

    unit.addStatModifier({
      id: 'test-1',
      stat: 'physicalPower',
      value: 10,
      duration: -1,
      source: 'test',
      sourceName: 'Test',
    });

    for (let i = 0; i < 100; i++) {
      unit.decrementModifierDurations();
    }

    expect(unit.statModifiers.length).toBe(1);
    expect(unit.statModifiers[0].duration).toBe(-1);
  });

  test('Removing modifiers by source', () => {
    const unit = createTestUnit();

    unit.addStatModifier({
      id: 'test-1',
      stat: 'physicalPower',
      value: 10,
      duration: -1,
      source: 'ability-1',
      sourceName: 'Ability 1',
    });

    unit.addStatModifier({
      id: 'test-2',
      stat: 'speed',
      value: 5,
      duration: -1,
      source: 'ability-1',
      sourceName: 'Ability 1',
    });

    unit.addStatModifier({
      id: 'test-3',
      stat: 'physicalPower',
      value: 5,
      duration: -1,
      source: 'ability-2',
      sourceName: 'Ability 2',
    });

    const removed = unit.removeStatModifiersBySource('ability-1');
    expect(removed).toBe(2);
    expect(unit.statModifiers.length).toBe(1);
    expect(unit.statModifiers[0].source).toBe('ability-2');
  });
});
```

## Files to Create

- `models/combat/StatModifier.ts` - StatModifier interface and types

## Files to Modify

- `models/combat/HumanoidUnit.ts` - Add stat modifier system
- `models/combat/CombatUnit.ts` - Update interface documentation
- `models/combat/phases/UnitTurnPhaseHandler.ts` - Duration countdown
- `react-app/src/data/ability-database.yaml` - Add effect configurations

## Estimated Complexity

**Time Estimate**: 8-12 hours total

- Phase 1 (Data Structures): 1 hour
- Phase 2 (HumanoidUnit Integration): 2-3 hours
- Phase 3 (Stat Getter Updates): 1-2 hours
- Phase 4 (Passive Integration): 1 hour
- Phase 5 (Serialization): 1-2 hours
- Phase 6 (Duration Tracking): 1 hour
- Phase 7 (Effect Application): 1-2 hours
- Phase 8 (UI Integration): 2-3 hours (optional for MVP)

**Risk Level**: Low
- Well-defined requirements
- Straightforward implementation
- No external dependencies
- Builds on existing HumanoidUnit infrastructure

## Success Criteria

This system is complete when:
1. ✅ Stat modifiers can be added and removed from units
2. ✅ Stat getters correctly calculate base + modifiers
3. ✅ Passive abilities apply permanent stat modifiers
4. ✅ Temporary modifiers countdown correctly
5. ✅ Expired modifiers are automatically removed
6. ✅ Modifiers serialize/deserialize correctly
7. ✅ Multiple modifiers stack correctly
8. ✅ Stats respect minimum values (never negative)
9. ✅ All unit tests pass

---

**Next Steps After Completion**:
1. Implement `AbilityExecutor` to use stat modifiers for buff/debuff abilities
2. Add combat log integration for modifier application/expiration
3. Create UI panels to display active buffs/debuffs
4. Extend to support more complex effects (damage over time, shields, etc.)

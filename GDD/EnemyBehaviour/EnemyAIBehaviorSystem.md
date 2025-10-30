# Enemy AI Behavior System

**Version:** 1.0
**Last Updated:** Thu, Oct 30, 2025
**Status:** Design Phase

## Purpose

This document defines the AI behavior system for enemy units during the `unit-turn` phase. The system uses a **Priority Queue** architecture where behaviors are evaluated in priority order, and the first valid behavior determines the unit's action for that turn.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Interfaces](#core-interfaces)
4. [AI Context](#ai-context)
5. [Behavior Definitions](#behavior-definitions)
6. [Action Planning](#action-planning)
7. [Integration Points](#integration-points)
8. [Configuration Examples](#configuration-examples)
9. [Implementation Phases](#implementation-phases)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### Design Goals

- **Simple & Deterministic**: Priority-based evaluation is easy to understand and debug
- **Flexible Configuration**: Enemies can be configured with different behavior lists
- **Reusable Infrastructure**: Leverages existing pathfinding, range calculation, and combat systems
- **Testable**: Each behavior can be unit tested independently
- **Extensible**: New behaviors can be added without modifying existing code

### High-Level Flow

```
1. Enemy unit's turn begins (actionTimer >= 100)
2. EnemyTurnStrategy queries behavior list in priority order
3. First behavior with canExecute() === true is selected
4. Behavior.decide() returns an AIDecision
5. EnemyTurnStrategy returns TurnAction based on decision
6. UnitTurnPhaseHandler executes the action
```

---

## Architecture

### Priority Queue Pattern

Each enemy unit has an ordered list of behaviors sorted by priority (highest first). On the enemy's turn, the AI:

1. Evaluates each behavior in priority order
2. Checks `canExecute()` for each behavior
3. Executes `decide()` on the **first** valid behavior
4. Returns the resulting `TurnAction`

This creates a clear decision hierarchy:
- High-priority behaviors handle urgent situations (e.g., defeat low-HP enemies)
- Mid-priority behaviors handle tactical opportunities (e.g., attack nearest)
- Low-priority behaviors handle fallback cases (e.g., end turn)

### Why Priority Queue?

**Advantages over Utility-Based AI:**
- Simpler to understand: "If A, else if B, else C"
- Easier to configure: Just set priority numbers
- More predictable: Same situation always produces same action
- Sufficient for tactical RPG AI (used by FFT, XCOM, Fire Emblem)
- Can add utility scoring *within* individual behaviors later if needed

---

## Core Interfaces

### AIBehavior Interface

```typescript
interface AIBehavior {
  /** Unique identifier for this behavior type */
  readonly type: string;

  /** Priority value (higher = evaluated first) */
  readonly priority: number;

  /** Optional configuration data specific to this behavior */
  readonly config?: unknown;

  /**
   * Determines if this behavior can execute in the current context
   * @returns true if this behavior is valid, false to skip to next behavior
   */
  canExecute(context: AIContext): boolean;

  /**
   * Decides the action to take (only called if canExecute() returned true)
   * @returns AIDecision with movement/action plan, or null if no valid action
   */
  decide(context: AIContext): AIDecision | null;
}
```

### AIDecision Type

```typescript
interface AIDecision {
  /** Optional movement to a new position */
  movement?: {
    destination: Position;
    path: Position[]; // Pre-calculated path for animation
  };

  /** Optional action to perform */
  action?: {
    type: 'attack' | 'ability' | 'delay' | 'end-turn';
    target?: Position; // Required for attack/ability
    abilityId?: string; // Required for ability
  };

  /** Order of execution */
  order: 'move-first' | 'act-first' | 'move-only' | 'act-only';
}
```

### AIContext Type

The context object provides all information needed for decision-making:

```typescript
interface AIContext {
  // Self
  readonly self: CombatUnit;
  readonly selfPosition: Position;

  // Allies and enemies
  readonly alliedUnits: ReadonlyArray<UnitPlacement>;
  readonly enemyUnits: ReadonlyArray<UnitPlacement>;

  // Map data
  readonly map: CombatMap;
  readonly manifest: CombatUnitManifest;

  // Pre-calculated data (for performance)
  readonly movementRange: Position[];
  readonly attackRange?: AttackRangeTiles; // From current position

  // Helper methods
  getUnitsInRange(range: number, from?: Position): UnitPlacement[];
  getUnitsInAttackRange(from?: Position): UnitPlacement[];
  calculatePath(to: Position): Position[] | null;
  calculateAttackRangeFrom(position: Position): AttackRangeTiles;
  predictDamage(target: CombatUnit, weapon?: Equipment): number;
  predictHitChance(target: CombatUnit, weapon?: Equipment): number;
  canDefeat(target: CombatUnit): boolean; // Damage >= target.health
  getDistance(from: Position, to: Position): number; // Manhattan distance
}

interface UnitPlacement {
  unit: CombatUnit;
  position: Position;
}
```

---

## AI Context

### Context Builder

The `AIContext` is built at the start of each enemy turn by `EnemyTurnStrategy`:

```typescript
class AIContextBuilder {
  static build(
    self: CombatUnit,
    selfPosition: Position,
    state: CombatState
  ): AIContext {
    // 1. Partition units into allies and enemies
    const alliedUnits = [];
    const enemyUnits = [];

    for (const placement of state.unitManifest.getAllUnits()) {
      if (placement.unit === self) continue; // Skip self

      if (placement.unit.isPlayerControlled === self.isPlayerControlled) {
        alliedUnits.push(placement);
      } else {
        enemyUnits.push(placement);
      }
    }

    // 2. Calculate movement range
    const movementRange = MovementRangeCalculator.calculateReachableTiles(
      selfPosition,
      self.movement,
      state.map,
      state.unitManifest,
      { activeUnit: self }
    );

    // 3. Calculate attack range from current position
    const attackRange = AttackRangeCalculator.calculateAttackRange(
      selfPosition,
      self, // Uses unit's weapon range
      state.map,
      state.unitManifest
    );

    // 4. Return context with helper methods
    return {
      self,
      selfPosition,
      alliedUnits: Object.freeze(alliedUnits),
      enemyUnits: Object.freeze(enemyUnits),
      map: state.map,
      manifest: state.unitManifest,
      movementRange: Object.freeze(movementRange),
      attackRange,

      // Helper methods
      getUnitsInRange: (range, from = selfPosition) => { /* ... */ },
      getUnitsInAttackRange: (from = selfPosition) => { /* ... */ },
      calculatePath: (to) => { /* ... */ },
      calculateAttackRangeFrom: (position) => { /* ... */ },
      predictDamage: (target, weapon) => { /* ... */ },
      predictHitChance: (target, weapon) => { /* ... */ },
      canDefeat: (target) => { /* ... */ },
      getDistance: (from, to) => Math.abs(from.x - to.x) + Math.abs(from.y - to.y),
    };
  }
}
```

---

## Behavior Definitions

### 1. DefeatNearbyOpponent

**Priority:** 100 (highest)
**Description:** If this unit can defeat a nearby enemy this turn (damage >= enemy health), move and attack to eliminate them.

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  // Check if any enemy can be defeated
  for (const { unit, position } of context.enemyUnits) {
    if (context.canDefeat(unit)) {
      // Check if in current attack range
      if (context.attackRange?.validTargets.some(pos =>
        pos.x === position.x && pos.y === position.y
      )) {
        return true;
      }

      // Check if in movement + attack range
      for (const movePos of context.movementRange) {
        const attackFromMove = context.calculateAttackRangeFrom(movePos);
        if (attackFromMove.validTargets.some(pos =>
          pos.x === position.x && pos.y === position.y
        )) {
          return true;
        }
      }
    }
  }

  return false;
}

decide(context: AIContext): AIDecision | null {
  // Find all defeatable enemies with positions
  const defeatable = context.enemyUnits.filter(({ unit }) =>
    context.canDefeat(unit)
  );

  // Find nearest defeatable enemy
  let nearestTarget = null;
  let nearestDistance = Infinity;
  let bestMovePosition = null;

  for (const { unit, position: targetPos } of defeatable) {
    // Check if in current attack range (no movement needed)
    if (context.attackRange?.validTargets.some(pos =>
      pos.x === targetPos.x && pos.y === targetPos.y
    )) {
      const distance = context.getDistance(context.selfPosition, targetPos);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestTarget = targetPos;
        bestMovePosition = null; // No movement needed
      }
    } else {
      // Check movement + attack range
      for (const movePos of context.movementRange) {
        const attackFromMove = context.calculateAttackRangeFrom(movePos);
        if (attackFromMove.validTargets.some(pos =>
          pos.x === targetPos.x && pos.y === targetPos.y
        )) {
          const distance = context.getDistance(movePos, targetPos);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestTarget = targetPos;
            bestMovePosition = movePos;
          }
        }
      }
    }
  }

  if (!nearestTarget) return null;

  // Build decision
  if (bestMovePosition) {
    // Move then attack
    return {
      movement: {
        destination: bestMovePosition,
        path: context.calculatePath(bestMovePosition)!,
      },
      action: {
        type: 'attack',
        target: nearestTarget,
      },
      order: 'move-first',
    };
  } else {
    // Attack only
    return {
      action: {
        type: 'attack',
        target: nearestTarget,
      },
      order: 'act-only',
    };
  }
}
```

---

### 2. AttackNearestOpponent

**Priority:** 80
**Description:** Attack the nearest enemy. If multiple enemies are equidistant, choose the one with the highest hit chance.

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  // Can execute if any enemy is in attack range OR movement+attack range
  if (context.attackRange?.validTargets.length > 0) {
    return true;
  }

  // Check movement + attack range
  for (const movePos of context.movementRange) {
    const attackFromMove = context.calculateAttackRangeFrom(movePos);
    if (attackFromMove.validTargets.length > 0) {
      return true;
    }
  }

  return false;
}

decide(context: AIContext): AIDecision | null {
  let bestTarget = null;
  let bestMovePosition = null;
  let bestDistance = Infinity;
  let bestHitChance = -1;

  // Check current attack range
  for (const targetPos of context.attackRange?.validTargets ?? []) {
    const targetUnit = context.manifest.getUnitAt(targetPos);
    if (!targetUnit) continue;

    const distance = context.getDistance(context.selfPosition, targetPos);
    const hitChance = context.predictHitChance(targetUnit);

    // Prefer closer OR same distance with higher hit chance
    if (distance < bestDistance ||
        (distance === bestDistance && hitChance > bestHitChance)) {
      bestDistance = distance;
      bestHitChance = hitChance;
      bestTarget = targetPos;
      bestMovePosition = null;
    }
  }

  // Check movement + attack range
  for (const movePos of context.movementRange) {
    const attackFromMove = context.calculateAttackRangeFrom(movePos);

    for (const targetPos of attackFromMove.validTargets) {
      const targetUnit = context.manifest.getUnitAt(targetPos);
      if (!targetUnit) continue;

      const distance = context.getDistance(movePos, targetPos);
      const hitChance = context.predictHitChance(targetUnit);

      if (distance < bestDistance ||
          (distance === bestDistance && hitChance > bestHitChance)) {
        bestDistance = distance;
        bestHitChance = hitChance;
        bestTarget = targetPos;
        bestMovePosition = movePos;
      }
    }
  }

  if (!bestTarget) return null;

  // Build decision
  if (bestMovePosition) {
    return {
      movement: {
        destination: bestMovePosition,
        path: context.calculatePath(bestMovePosition)!,
      },
      action: {
        type: 'attack',
        target: bestTarget,
      },
      order: 'move-first',
    };
  } else {
    return {
      action: {
        type: 'attack',
        target: bestTarget,
      },
      order: 'act-only',
    };
  }
}
```

---

### 3. AggressiveTowardSpecificUnit

**Priority:** 90
**Description:** Always move toward and attack a specific target unit (e.g., boss targeting player's healer).

**Config:**
```typescript
interface AggressiveTowardSpecificUnitConfig {
  targetName: string; // Name of the unit to target
}
```

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  const config = this.config as AggressiveTowardSpecificUnitConfig;

  // Check if target exists
  return context.enemyUnits.some(({ unit }) => unit.name === config.targetName);
}

decide(context: AIContext): AIDecision | null {
  const config = this.config as AggressiveTowardSpecificUnitConfig;

  // Find target
  const target = context.enemyUnits.find(({ unit }) =>
    unit.name === config.targetName
  );
  if (!target) return null;

  // If in attack range, attack
  if (context.attackRange?.validTargets.some(pos =>
    pos.x === target.position.x && pos.y === target.position.y
  )) {
    return {
      action: {
        type: 'attack',
        target: target.position,
      },
      order: 'act-only',
    };
  }

  // Find best movement position (closest to target)
  let bestMovePosition = null;
  let bestDistance = Infinity;
  let canAttackAfterMove = false;

  for (const movePos of context.movementRange) {
    const attackFromMove = context.calculateAttackRangeFrom(movePos);
    const distance = context.getDistance(movePos, target.position);

    // Prioritize positions that allow attack
    if (attackFromMove.validTargets.some(pos =>
      pos.x === target.position.x && pos.y === target.position.y
    )) {
      if (!canAttackAfterMove || distance < bestDistance) {
        bestDistance = distance;
        bestMovePosition = movePos;
        canAttackAfterMove = true;
      }
    } else if (!canAttackAfterMove && distance < bestDistance) {
      // Move closer even if can't attack yet
      bestDistance = distance;
      bestMovePosition = movePos;
    }
  }

  if (!bestMovePosition) {
    // No valid movement, end turn
    return {
      action: { type: 'end-turn' },
      order: 'act-only',
    };
  }

  // Move toward target
  if (canAttackAfterMove) {
    return {
      movement: {
        destination: bestMovePosition,
        path: context.calculatePath(bestMovePosition)!,
      },
      action: {
        type: 'attack',
        target: target.position,
      },
      order: 'move-first',
    };
  } else {
    return {
      movement: {
        destination: bestMovePosition,
        path: context.calculatePath(bestMovePosition)!,
      },
      order: 'move-only',
    };
  }
}
```

---

### 4. AggressiveTowardCasters

**Priority:** 85
**Description:** Prioritize attacking units with secondary classes (assumed to be casters/magic users).

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  // Check if any casters exist in enemy units
  const casters = context.enemyUnits.filter(({ unit }) =>
    unit.secondaryClass !== null
  );

  if (casters.length === 0) return false;

  // Check if any caster is in attack range OR movement+attack range
  for (const { position: targetPos } of casters) {
    if (context.attackRange?.validTargets.some(pos =>
      pos.x === targetPos.x && pos.y === targetPos.y
    )) {
      return true;
    }

    for (const movePos of context.movementRange) {
      const attackFromMove = context.calculateAttackRangeFrom(movePos);
      if (attackFromMove.validTargets.some(pos =>
        pos.x === targetPos.x && pos.y === targetPos.y
      )) {
        return true;
      }
    }
  }

  return false;
}

decide(context: AIContext): AIDecision | null {
  // Filter to casters only
  const casters = context.enemyUnits.filter(({ unit }) =>
    unit.secondaryClass !== null
  );

  // Use same logic as AttackNearestOpponent but only for casters
  // (implementation identical to AttackNearestOpponent.decide() with filtered list)
  // ... (see AttackNearestOpponent for full implementation)
}
```

---

### 5. AggressiveTowardMelee

**Priority:** 85
**Description:** Prioritize attacking units without secondary classes (assumed to be melee/physical fighters).

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  // Check if any melee units exist in enemy units
  const meleeUnits = context.enemyUnits.filter(({ unit }) =>
    unit.secondaryClass === null
  );

  // (Same structure as AggressiveTowardCasters but inverted filter)
  // ...
}

decide(context: AIContext): AIDecision | null {
  // Filter to melee units only
  const meleeUnits = context.enemyUnits.filter(({ unit }) =>
    unit.secondaryClass === null
  );

  // Use same logic as AttackNearestOpponent but only for melee units
  // ...
}
```

---

### 6. SupportAllies

**Priority:** 70
**Description:** Cast buff abilities on allies, prioritizing those without buffs.

**Future Implementation** (requires ability system integration)

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  // Check if unit has support abilities
  const supportAbilities = Array.from(context.self.learnedAbilities).filter(
    ability => ability.type === 'action' && ability.effects.some(
      effect => effect.type === 'buff'
    )
  );

  if (supportAbilities.length === 0) return false;

  // Check if any allies are in ability range
  // (requires ability range calculation - future work)
  return true;
}

decide(context: AIContext): AIDecision | null {
  // Find best ally to buff
  // Prioritize allies without buffs
  // Cast highest-priority support ability
  // (requires status effect tracking - future work)
  return null;
}
```

---

### 7. DebuffOpponent

**Priority:** 75
**Description:** Cast debuff abilities on enemies.

**Future Implementation** (requires ability system integration)

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  // Check if unit has debuff abilities
  // Check if any enemies are in ability range
  return false; // Not implemented yet
}

decide(context: AIContext): AIDecision | null {
  // Find best enemy to debuff
  // Prioritize enemies without debuffs
  // Cast highest-priority debuff ability
  return null;
}
```

---

### 8. HealAllies

**Priority:** 95 (high priority)
**Description:** Cast healing abilities on wounded allies, prioritizing those with lowest health percentage.

**Future Implementation** (requires ability system integration)

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  // Check if unit has healing abilities
  const healingAbilities = Array.from(context.self.learnedAbilities).filter(
    ability => ability.type === 'action' && ability.effects.some(
      effect => effect.type === 'heal'
    )
  );

  if (healingAbilities.length === 0) return false;

  // Check if any allies are wounded
  const woundedAllies = context.alliedUnits.filter(({ unit }) =>
    unit.wounds > 0
  );

  return woundedAllies.length > 0;
}

decide(context: AIContext): AIDecision | null {
  // Find ally with lowest health percentage
  let lowestHealthPct = 1.0;
  let targetAlly = null;

  for (const { unit, position } of context.alliedUnits) {
    const healthPct = unit.health / unit.maxHealth;
    if (healthPct < lowestHealthPct) {
      lowestHealthPct = healthPct;
      targetAlly = { unit, position };
    }
  }

  if (!targetAlly) return null;

  // Select best healing ability
  // Move into healing range if needed
  // Cast healing ability
  // (requires ability range calculation and casting - future work)
  return null;
}
```

---

### 9. DefaultBehavior (Fallback)

**Priority:** 0 (lowest)
**Description:** Fallback behavior if no other behavior can execute. Ends turn.

**Logic:**
```typescript
canExecute(context: AIContext): boolean {
  return true; // Always valid as fallback
}

decide(context: AIContext): AIDecision | null {
  return {
    action: {
      type: 'end-turn',
    },
    order: 'act-only',
  };
}
```

---

## Action Planning

### Turn Budget

Each enemy turn has:
- **1 movement action** (move up to `movement` tiles)
- **1 standard action** (attack, ability, delay, end-turn)

These can be performed in either order or separately:
- `order: 'move-first'` - Move, then act
- `order: 'act-first'` - Act, then move (future use case)
- `order: 'move-only'` - Move only
- `order: 'act-only'` - Act only (no movement)

### Decision Execution Flow

```
1. EnemyTurnStrategy receives AIDecision from behavior
2. Converts AIDecision to TurnAction (existing interface)
3. Returns TurnAction to UnitTurnPhaseHandler
4. Phase handler executes movement (if present)
5. Phase handler executes action (if present)
6. Turn ends, returns to action-timer phase
```

---

## Integration Points

### EnemyTurnStrategy Changes

```typescript
class EnemyTurnStrategy implements TurnStrategy {
  private behaviors: AIBehavior[];
  private context: AIContext | null = null;

  constructor(
    unit: CombatUnit,
    position: Position,
    state: CombatState,
    behaviors: AIBehavior[]
  ) {
    // Sort behaviors by priority (highest first)
    this.behaviors = [...behaviors].sort((a, b) => b.priority - a.priority);

    // Build AI context
    this.context = AIContextBuilder.build(unit, position, state);
  }

  update(deltaTime: number, state: CombatState): TurnAction | null {
    // Thinking delay (existing behavior)
    this.thinkingTimer += deltaTime;
    if (this.thinkingTimer < this.thinkingDuration) {
      return null;
    }

    // Evaluate behaviors
    if (!this.actionDecided && this.context) {
      for (const behavior of this.behaviors) {
        if (behavior.canExecute(this.context)) {
          const decision = behavior.decide(this.context);
          if (decision) {
            this.actionDecided = this.convertDecisionToAction(decision);
            break;
          }
        }
      }

      // Fallback if no behavior returned valid decision
      if (!this.actionDecided) {
        this.actionDecided = { type: 'end-turn' };
      }
    }

    return this.actionDecided;
  }

  private convertDecisionToAction(decision: AIDecision): TurnAction {
    // Convert AIDecision to TurnAction format
    // (implementation depends on TurnAction interface)
  }
}
```

### MonsterUnit / CombatEncounter Configuration

```typescript
interface EnemyPlacement {
  enemyId: string;
  position: Position;
  behaviors?: AIBehaviorConfig[]; // Optional custom behaviors
}

interface AIBehaviorConfig {
  type: string;
  priority: number;
  config?: unknown;
}

// Example usage in encounter definition:
const encounter = new CombatEncounter({
  // ...
  enemyPlacements: [
    {
      enemyId: 'goblin',
      position: { x: 10, y: 5 },
      behaviors: [
        { type: 'AttackNearestOpponent', priority: 80 },
        { type: 'DefaultBehavior', priority: 0 },
      ],
    },
    {
      enemyId: 'goblin-shaman',
      position: { x: 12, y: 5 },
      behaviors: [
        { type: 'HealAllies', priority: 95 },
        { type: 'AggressiveTowardCasters', priority: 85 },
        { type: 'DefaultBehavior', priority: 0 },
      ],
    },
  ],
});
```

### Default Behaviors

If no behaviors are specified, enemies use a default set:

```typescript
const DEFAULT_ENEMY_BEHAVIORS: AIBehaviorConfig[] = [
  { type: 'DefeatNearbyOpponent', priority: 100 },
  { type: 'AttackNearestOpponent', priority: 80 },
  { type: 'DefaultBehavior', priority: 0 },
];
```

---

## Configuration Examples

### Aggressive Melee Enemy (Goblin)

```typescript
behaviors: [
  { type: 'DefeatNearbyOpponent', priority: 100 },
  { type: 'AttackNearestOpponent', priority: 80 },
  { type: 'DefaultBehavior', priority: 0 },
]
```

**Result:** Tries to finish off low-HP enemies, otherwise attacks nearest.

---

### Tactical Caster Hunter (Assassin)

```typescript
behaviors: [
  { type: 'DefeatNearbyOpponent', priority: 100 },
  { type: 'AggressiveTowardCasters', priority: 90 },
  { type: 'AttackNearestOpponent', priority: 70 },
  { type: 'DefaultBehavior', priority: 0 },
]
```

**Result:** Prioritizes finishing enemies, then targets casters, then nearest enemy.

---

### Support Healer (Cleric)

```typescript
behaviors: [
  { type: 'HealAllies', priority: 95 },
  { type: 'SupportAllies', priority: 80 },
  { type: 'AttackNearestOpponent', priority: 50 },
  { type: 'DefaultBehavior', priority: 0 },
]
```

**Result:** Heals wounded allies first, buffs allies second, attacks as last resort.

---

### Boss with Specific Target (Dragon targeting healer)

```typescript
behaviors: [
  {
    type: 'AggressiveTowardSpecificUnit',
    priority: 100,
    config: { targetName: 'Maria' } // Player's healer
  },
  { type: 'AttackNearestOpponent', priority: 70 },
  { type: 'DefaultBehavior', priority: 0 },
]
```

**Result:** Always pursues Maria, falls back to nearest enemy if Maria defeated.

---

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)
- [ ] Define `AIBehavior`, `AIDecision`, `AIContext` interfaces
- [ ] Implement `AIContextBuilder` class
- [ ] Create behavior registry system
- [ ] Update `EnemyTurnStrategy` to use behavior list
- [ ] Implement `DefaultBehavior` (fallback)

### Phase 2: Basic Attack Behaviors
- [ ] Implement `AttackNearestOpponent`
- [ ] Implement `DefeatNearbyOpponent`
- [ ] Add default behavior list to `MonsterUnit` / `CombatEncounter`
- [ ] Test with simple encounters

### Phase 3: Tactical Behaviors
- [ ] Implement `AggressiveTowardCasters`
- [ ] Implement `AggressiveTowardMelee`
- [ ] Implement `AggressiveTowardSpecificUnit`
- [ ] Test with mixed enemy compositions

### Phase 4: Ability-Based Behaviors (Future)
- [ ] Implement `SupportAllies` (requires ability system)
- [ ] Implement `DebuffOpponent` (requires ability system)
- [ ] Implement `HealAllies` (requires ability system)
- [ ] Add status effect tracking to `AIContext`

---

## Future Enhancements

### Utility Scoring (Hybrid Approach)

Within individual behaviors, add utility scoring for tie-breaking:

```typescript
// Example: If multiple enemies are equidistant, score them
const targetScores = equidistantEnemies.map(enemy => ({
  enemy,
  score: scoreTarget(enemy), // 0-100 based on health, threat, etc.
}));

const bestTarget = targetScores.reduce((best, current) =>
  current.score > best.score ? current : best
);
```

### Dynamic Priority Adjustment

Behaviors could adjust their priority based on context:

```typescript
interface AIBehavior {
  // ...
  getPriority(context: AIContext): number; // Dynamic priority
}
```

### Learning / Adaptation

Track player patterns and adjust behavior priorities over time (advanced feature).

### Behavior Composition

Chain multiple behaviors together:

```typescript
behaviors: [
  { type: 'Composite', config: {
    primary: 'AttackNearestOpponent',
    fallback: 'MoveTowardNearestEnemy'
  }},
]
```

---

## Testing Strategy

### Unit Tests

Each behavior should have:
1. Test for `canExecute()` returning true when valid
2. Test for `canExecute()` returning false when invalid
3. Test for `decide()` returning correct `AIDecision`
4. Edge case tests (no enemies, blocked paths, etc.)

### Integration Tests

1. Create test encounters with specific layouts
2. Configure enemy with specific behavior list
3. Run turn, verify correct action chosen
4. Test priority ordering (higher priority should override lower)

### Manual Testing

1. Create encounters showcasing each behavior
2. Observe enemy decision-making
3. Verify behavior feels logical and challenging
4. Tune priority values and config as needed

---

## Related Files

### Existing Files to Modify
- [strategies/EnemyTurnStrategy.ts](../../react-app/src/models/combat/strategies/EnemyTurnStrategy.ts) - Add behavior system
- [CombatEncounter.ts](../../react-app/src/models/combat/CombatEncounter.ts) - Add behavior configuration
- [MonsterUnit.ts](../../react-app/src/models/combat/MonsterUnit.ts) - Add default behaviors

### New Files to Create
- `ai/AIBehavior.ts` - Core interfaces
- `ai/AIContext.ts` - Context builder
- `ai/behaviors/DefeatNearbyOpponent.ts`
- `ai/behaviors/AttackNearestOpponent.ts`
- `ai/behaviors/AggressiveTowardSpecificUnit.ts`
- `ai/behaviors/AggressiveTowardCasters.ts`
- `ai/behaviors/AggressiveTowardMelee.ts`
- `ai/behaviors/SupportAllies.ts` (future)
- `ai/behaviors/DebuffOpponent.ts` (future)
- `ai/behaviors/HealAllies.ts` (future)
- `ai/behaviors/DefaultBehavior.ts`
- `ai/BehaviorRegistry.ts` - Factory for creating behaviors by type

---

**End of EnemyAIBehaviorSystem.md**

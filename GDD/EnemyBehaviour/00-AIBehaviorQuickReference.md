# Enemy AI Behavior System - Quick Reference

**Purpose:** Token-efficient reference for AI agents working on Enemy AI Behavior implementation

**Last Updated:** 2025-10-30 (Phase 1 Complete)

---

## Quick Index

- [Overview](#overview) - What is the AI Behavior System?
- [Implementation Phases](#implementation-phases) - Chronological implementation guide
- [Current Status](#current-status) - What's done, what's next
- [Key Files](#key-files) - Where to find critical code
- [Technical Patterns](#technical-patterns) - Important implementation details
- [Next Steps](#next-steps) - Upcoming work

---

## Overview

The **Enemy AI Behavior System** provides priority-based decision-making for enemy units during combat. Behaviors are evaluated in priority order (highest first), and the first valid behavior executes its decision.

### Core Features

1. **Priority-Based Evaluation** - Behaviors sorted by priority (highest first), first valid behavior wins
2. **AIContext Builder** - Immutable context with pre-calculated data (movement range, attack range, helper methods)
3. **Behavior Registry** - Factory pattern for creating behaviors from configurations
4. **Decision System** - Behaviors return AIDecision with optional movement + action
5. **Extensible Design** - Easy to add new behaviors without modifying core system

### User Flow Summary

```
Enemy unit turn starts
    ↓
Build AIContext (movement range, attack range, partitioned units)
    ↓
Evaluate behaviors in priority order (highest first)
    ↓
First behavior where canExecute() === true
    ↓
Call decide() to get AIDecision
    ↓
Convert AIDecision to TurnAction
    ↓
Execute action (currently: end-turn only in Phase 1)
    ↓
Turn ends
```

---

## Implementation Phases

### ✅ Phase 1: Core Infrastructure
**Plan:** [01-CoreInfrastructurePlan.md](./01-CoreInfrastructurePlan.md)
**Branch:** `enemy-ai-core-infra`
**Status:** Complete ✅

**What Was Done:**
- Created core type system (AIBehavior, AIContext, AIDecision interfaces)
- Implemented AIContextBuilder with pre-calculation and helper methods
- Created DefaultBehavior fallback (always ends turn)
- Built BehaviorRegistry factory with priority sorting
- Integrated with EnemyTurnStrategy (context building, behavior evaluation)
- Updated documentation (CombatHierarchy.md)
- TypeScript compilation successful

**Key Files Created (5 files):**
- `ai/types/AIBehavior.ts` - Core interfaces
- `ai/types/AIContext.ts` - Context interface and builder
- `ai/behaviors/DefaultBehavior.ts` - Fallback behavior
- `ai/BehaviorRegistry.ts` - Factory and registry
- `ai/index.ts` - Barrel export

**Key Files Modified (2 files):**
- `strategies/EnemyTurnStrategy.ts` - Integrated AI system
- `CombatHierarchy.md` - Documentation updated

**Technical Highlights:**
- **Immutability:** All context arrays frozen with `Object.freeze()`
- **Performance:** Context built once per turn, not per frame
- **WeakMap Ready:** Future-ready for Phase 2 unit tracking
- **Type Safety:** Full TypeScript type checking throughout
- **100% Backward Compatible:** No breaking changes to existing code

**AIContext Helper Methods:**
```typescript
getUnitsInRange(range, from?)         // Manhattan distance search
getUnitsInAttackRange(from?)          // Enemy units in attack range
calculatePath(to)                     // Pathfinding to destination
calculateAttackRangeFrom(position)    // Attack range from position
predictDamage(target, weapon?)        // Damage prediction
predictHitChance(target, weapon?)     // Hit chance prediction
canDefeat(target)                     // Check if one-hit kill
getDistance(from, to)                 // Manhattan distance
```

---

### 📋 Phase 2: Attack Behaviors (Planned)
**Plan:** [02-AttackBehaviorsPlan.md](./02-AttackBehaviorsPlan.md)
**Status:** Not Started

**What Will Be Done:**
- Implement `AttackNearestOpponent` behavior (priority 80)
  - Attacks closest enemy in current attack range
  - No movement, pure attack behavior
- Implement `DefeatNearbyOpponent` behavior (priority 100)
  - Finds enemy that can be one-shot killed
  - Moves into range if needed, then attacks
- Update `convertDecisionToAction()` to handle movement + attack
- Add WeakMap for unit position tracking (avoid duplicate name issues)
- Integration testing with actual combat

**Success Criteria:**
- [ ] Enemies attack nearest opponent if in range
- [ ] Enemies prioritize one-shot kills
- [ ] Movement + attack decisions execute correctly
- [ ] Combat log shows AI actions
- [ ] No performance degradation

---

### 📋 Phase 3: Tactical Behaviors (Planned)
**Plan:** [03-TacticalBehaviorsPlan.md](./03-TacticalBehaviorsPlan.md)
**Status:** Not Started

**What Will Be Done:**
- Implement `AggressiveTowardCasters` behavior (priority 85-90)
  - Targets units with high Magic Power or Attunement
  - Moves toward casters if not in range
- Implement `AggressiveTowardMelee` behavior (priority 85-90)
  - Targets units with high Physical Power or Courage
  - Moves toward melee fighters if not in range
- Add unit type classification helpers in AIContext
- Add threat scoring system

**Success Criteria:**
- [ ] Enemies prioritize targeting casters or melee based on config
- [ ] Enemies move strategically toward high-value targets
- [ ] Behavior priority balances with attack behaviors

---

### 📋 Phase 4: Ability-Based Behaviors (Future)
**Plan:** [04-AbilityBehaviorsPlan.md](./04-AbilityBehaviorsPlan.md) (not yet written)
**Status:** Not Started

**What Will Be Done:**
- Implement `HealAllies` behavior (priority 95)
- Implement `SupportAllies` behavior (priority 90)
- Implement `DebuffOpponent` behavior (priority 85)
- Extend AIDecision to support ability usage
- Add ability range calculation helpers

---

## Current Status

### Completed ✅
- [x] AIBehavior interface (type, priority, config, canExecute, decide)
- [x] AIBehaviorConfig interface (type, priority, optional config)
- [x] AIDecision interface (movement, action, order)
- [x] AIContext interface (self, allies, enemies, map, helpers)
- [x] AIContextBuilder class (build method, pre-calculations)
- [x] 10+ AIContext helper methods (pathfinding, predictions, queries)
- [x] DefaultBehavior implementation (fallback, priority 0)
- [x] BehaviorRegistry singleton (register, create, createMany)
- [x] DEFAULT_ENEMY_BEHAVIORS configuration
- [x] EnemyTurnStrategy integration (context building, evaluation)
- [x] convertDecisionToAction() for end-turn and delay
- [x] TypeScript compilation successful
- [x] Documentation in CombatHierarchy.md
- [x] Backward compatibility maintained

### In Progress 🚧
- None (Phase 1 complete, ready for testing)

### Not Started 📋
- [ ] AttackNearestOpponent behavior (Phase 2)
- [ ] DefeatNearbyOpponent behavior (Phase 2)
- [ ] Movement + attack action conversion (Phase 2)
- [ ] WeakMap unit tracking (Phase 2)
- [ ] AggressiveTowardCasters behavior (Phase 3)
- [ ] AggressiveTowardMelee behavior (Phase 3)
- [ ] HealAllies behavior (Phase 4)
- [ ] SupportAllies behavior (Phase 4)
- [ ] DebuffOpponent behavior (Phase 4)

---

## Key Files

### Core AI System (Phase 1)
- **`ai/types/AIBehavior.ts`** - Core interfaces (AIBehavior, AIDecision, AIBehaviorConfig)
- **`ai/types/AIContext.ts`** - Context interface, AIContextBuilder, UnitPlacement
- **`ai/behaviors/DefaultBehavior.ts`** - Fallback behavior (ends turn)
- **`ai/BehaviorRegistry.ts`** - Factory, registry, DEFAULT_ENEMY_BEHAVIORS
- **`ai/index.ts`** - Barrel export for public API

### Integration
- **`strategies/EnemyTurnStrategy.ts`** - Behavior evaluation, context building, decision conversion

### Documentation
- **`CombatHierarchy.md`** - Section 3.5 documents AI system architecture
- **`GDD/EnemyBehaviour/EnemyAIBehaviorSystem.md`** - Full design document
- **`GDD/EnemyBehaviour/01-CoreInfrastructurePlan.md`** - Phase 1 implementation plan

### Future Behaviors (Phase 2+)
- **`ai/behaviors/AttackNearestOpponent.ts`** (not yet created)
- **`ai/behaviors/DefeatNearbyOpponent.ts`** (not yet created)
- **`ai/behaviors/AggressiveTowardCasters.ts`** (not yet created)
- **`ai/behaviors/AggressiveTowardMelee.ts`** (not yet created)

---

## Technical Patterns

### Behavior Evaluation Flow
```typescript
EnemyTurnStrategy.decideAction():
1. Check if context exists
2. For each behavior in behaviors array (sorted by priority):
   a. Call behavior.canExecute(context)
   b. If true: Call behavior.decide(context)
   c. If decision returned: Convert to TurnAction, return
3. Fallback: Return end-turn (should never reach due to DefaultBehavior)
```

### AIContext Building Flow
```
EnemyTurnStrategy.onTurnStart(unit, position, state):
1. Call AIContextBuilder.build(unit, position, state)
2. Partition all units into allies and enemies (excludes self)
3. Calculate movement range (MovementRangeCalculator)
4. Calculate attack range if weapon equipped (AttackRangeCalculator)
5. Get default weapon helper closure
6. Create context object with:
   - Immutable data (frozen arrays)
   - Helper methods (closures over state/position)
7. Return frozen context
```

### Priority-Based Behavior System
```
Behavior Priority Ranges (0-100):
- 100: Critical actions (one-hit kills)
- 90-99: High priority (healing, support)
- 80-89: Combat actions (attacks, debuffs)
- 70-79: Tactical positioning
- 0-69: Low priority / fallbacks
- 0: DefaultBehavior (always valid, always last)

Evaluation:
- Behaviors sorted on creation (BehaviorRegistry.createMany)
- First behavior where canExecute() === true wins
- Others never evaluated (short-circuit)
```

### AIDecision Structure
```typescript
AIDecision {
  movement?: {
    destination: Position    // Final position
    path: Position[]        // Full path (excludes start, includes end)
  }
  action?: {
    type: 'attack' | 'ability' | 'delay' | 'end-turn'
    target?: Position       // Required for attack/ability
    abilityId?: string      // Required for ability
  }
  order: 'move-first' | 'act-first' | 'move-only' | 'act-only'
}
```

### Immutability Pattern
```typescript
// AIContextBuilder ensures immutability
alliedUnits: Object.freeze(alliedUnits)
enemyUnits: Object.freeze(enemyUnits)
movementRange: Object.freeze(movementRange)

// Context built once per turn, never mutated
// Avoids per-frame allocations
// Safe to pass to multiple behaviors
```

### WeakMap Pattern (Phase 2+)
```typescript
// Future: Avoid duplicate unit name issues
private unitPositions = new WeakMap<CombatUnit, Position>()

// Build once per turn
for (const placement of state.unitManifest.getAllUnits()) {
  this.unitPositions.set(placement.unit, placement.position);
}

// Query without name collisions
const pos = this.unitPositions.get(unit);
```

---

## Next Steps

### Immediate (Ready for Testing)
- Manual testing of Phase 1 infrastructure
  1. Start combat encounter with enemy units
  2. Verify enemies take turns (should see thinking delay)
  3. Check console for `[AI] {unit.name} chose behavior: DefaultBehavior`
  4. Confirm enemies end turn without errors
  5. Verify no performance degradation

### Short-term (Phase 2: Attack Behaviors)
1. Implement `AttackNearestOpponent` behavior
   - `canExecute()`: Check if any enemies in attack range
   - `decide()`: Find nearest enemy, return attack decision
2. Implement `DefeatNearbyOpponent` behavior
   - `canExecute()`: Check if any enemies can be one-shot killed (in range or movement+range)
   - `decide()`: Find defeatable enemy, calculate path if needed, return move+attack decision
3. Update `convertDecisionToAction()` in EnemyTurnStrategy
   - Handle movement decisions
   - Handle attack decisions
   - Handle combined movement + attack
4. Add WeakMap unit tracking (avoid duplicate name lookups)
5. Register behaviors in BehaviorRegistry
6. Create test encounter configs with new behaviors
7. Integration testing

### Medium-term (Phase 3: Tactical Behaviors)
1. Add unit classification helpers to AIContext
   - `isCaster(unit)` - High Magic Power or Attunement
   - `isMelee(unit)` - High Physical Power or Courage
2. Implement `AggressiveTowardCasters` behavior
   - Priority 85-90
   - Targets high Magic Power/Attunement units
   - Moves toward casters if not in range
3. Implement `AggressiveTowardMelee` behavior
   - Priority 85-90
   - Targets high Physical Power/Courage units
   - Moves toward melee fighters if not in range
4. Add threat scoring system
5. Test tactical positioning and target prioritization

### Long-term (Phase 4: Ability Behaviors)
1. Extend AIDecision to support ability usage
2. Add ability range calculation helpers
3. Implement healing, support, and debuff behaviors
4. Test complex ability-based strategies

---

## Reference Documents

- **[EnemyAIBehaviorSystem.md](./EnemyAIBehaviorSystem.md)** - Full design document (system architecture, behavior specs)
- **[01-CoreInfrastructurePlan.md](./01-CoreInfrastructurePlan.md)** - Phase 1 implementation plan (complete)
- **[02-AttackBehaviorsPlan.md](./02-AttackBehaviorsPlan.md)** - Phase 2 implementation plan (planned)
- **[03-TacticalBehaviorsPlan.md](./03-TacticalBehaviorsPlan.md)** - Phase 3 implementation plan (planned)
- **[CombatHierarchy.md](../../CombatHierarchy.md)** - Section 3.5 documents AI system
- **[GeneralGuidelines.md](../../GeneralGuidelines.md)** - Coding standards and patterns

---

## Common Questions

**Q: Why use priority-based evaluation instead of utility-based scoring?**
A: Priority-based is simpler, more predictable, and easier to debug. Behaviors are explicitly ordered by designer intent. First valid behavior wins - no complex scoring calculations or unpredictable emergent behavior.

**Q: Why build AIContext once per turn instead of per behavior?**
A: Performance. Building context involves expensive calculations (movement range, attack range, pathfinding). Building once and reusing for all behaviors avoids redundant work. Context is immutable so it's safe to share.

**Q: Why freeze arrays with Object.freeze()?**
A: Enforces immutability at runtime. Prevents accidental mutations that could cause bugs. Follows functional programming principles - context is read-only input, behaviors return new decisions.

**Q: What happens if no behaviors return a valid decision?**
A: DefaultBehavior (priority 0) always returns valid decision (end-turn). It should always be the last behavior in the list. If somehow all behaviors fail, EnemyTurnStrategy has a fallback that logs a warning and ends turn.

**Q: Can behaviors access game state outside AIContext?**
A: No. All game state is passed through AIContext. This keeps behaviors pure functions (input → output) and makes them easier to test, debug, and reason about.

**Q: Why use a factory pattern (BehaviorRegistry) instead of direct instantiation?**
A: Allows behaviors to be configured via JSON/YAML encounter definitions. Game designers can specify behavior lists without touching code. Registry validates behavior types and provides clear error messages.

**Q: How do I add a new behavior?**
A:
1. Create new class implementing AIBehavior interface
2. Implement `canExecute(context)` - return true if behavior is valid
3. Implement `decide(context)` - return AIDecision or null
4. Register in BehaviorRegistry: `BehaviorRegistry.register('MyBehavior', (priority, config) => new MyBehavior(priority, config))`
5. Add to encounter configs: `{ type: 'MyBehavior', priority: 85 }`

**Q: Why does DefaultBehavior have priority 0?**
A: Priority 0 is lowest. DefaultBehavior is the fallback - it should only execute if no other behavior is valid. Higher priority behaviors (80-100) run first.

**Q: What's the difference between canExecute() and decide()?**
A: `canExecute()` is a fast check (Is this behavior applicable right now?). `decide()` does the actual work (What should I do?). Separating them allows short-circuit evaluation - if `canExecute()` returns false, `decide()` never runs.

**Q: Why return null from decide() instead of always returning a decision?**
A: Allows behaviors to bail out after deeper analysis. `canExecute()` does quick checks, `decide()` can discover the situation is more complex (e.g., "enemy in range" but all paths blocked). Returning null lets the next behavior try.

**Q: How does movement + attack work?**
A: In Phase 2, behaviors will return:
```typescript
{
  movement: { destination, path },
  action: { type: 'attack', target },
  order: 'move-first'  // Execute movement, then attack
}
```
EnemyTurnStrategy converts this to appropriate TurnActions in sequence.

**Q: Why does AIContext include predictDamage() and predictHitChance()?**
A: Behaviors need to evaluate attack effectiveness. "Can I one-shot this enemy?" requires damage prediction. "Is this attack likely to hit?" requires hit chance. These helpers use the same CombatCalculations formulas as actual attacks.

**Q: What's UnitPlacement?**
A: Simple container: `{ unit: CombatUnit, position: Position }`. Used for allied and enemy unit lists in AIContext. Couples unit with its current position for convenient access.

**Q: Why does EnemyTurnStrategy still calculate movementRange separately?**
A: Backward compatibility. Existing code may reference `strategy.getMovementRange()`. We keep the old field populated even though it's also in AIContext. No breaking changes to existing systems.

**Q: Can one behavior call another behavior's logic?**
A: No. Behaviors are independent and evaluated sequentially. If you need shared logic, put it in AIContext helper methods or create utility functions. Behaviors should be self-contained.

**Q: How do I test a behavior?**
A:
1. Create mock AIContext with test data
2. Call `behavior.canExecute(mockContext)` - assert true/false
3. Call `behavior.decide(mockContext)` - assert expected AIDecision
4. Unit tests can validate behavior logic without full combat system

**Q: Why use Object.freeze() instead of TypeScript readonly?**
A: `readonly` is compile-time only. `Object.freeze()` enforces immutability at runtime, catching bugs that slip through type checking. Defense in depth.

---

**End of Quick Reference**

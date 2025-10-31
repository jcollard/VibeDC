# Enemy AI Behavior System - Quick Reference

**Purpose:** Token-efficient reference for AI agents working on Enemy AI Behavior implementation

**Last Updated:** Thu, Oct 30, 2025 (Phase 2 Complete, Phase 3-4 Deferred) <!-- Use `date` command when updating - do not delete this note -->

---

## Quick Index

- [Overview](#overview) - What is the AI Behavior System?
- [Implementation Phases](#implementation-phases) - Chronological implementation guide
- [Current Status](#current-status) - What's done, what's next
- [Key Files](#key-files) - Where to find critical code
- [Technical Patterns](#technical-patterns) - Important implementation details
- [Next Steps](#next-steps) - Upcoming work
- [Design Notes & Deferred Items](#design-notes--deferred-items) - What we didn't implement and why
- [Common Questions](#common-questions) - FAQ with answers

---

## Overview

The **Enemy AI Behavior System** provides priority-based decision-making for enemy units during combat. Behaviors are evaluated in priority order (highest first), and the first valid behavior executes its decision.

### Core Features

1. **Priority-Based Evaluation** - Behaviors sorted by priority (highest first), first valid behavior wins
2. **AIContext Builder** - Immutable context with pre-calculated data (movement range, attack range, helper methods)
3. **Behavior Registry** - Factory pattern for creating behaviors from configurations
4. **Decision System** - Behaviors return AIDecision with optional movement + action
5. **Action Economy System** ⭐ - Units can perform multiple actions per turn (move THEN attack)
6. **Behavior Filtering** ⭐ - Behaviors filtered based on available actions (canMove, canAct)
7. **Extensible Design** - Easy to add new behaviors without modifying core system

### User Flow Summary

```
Enemy unit turn starts
    ↓
Build AIContext (movement range, attack range, partitioned units, hasMoved, hasActed)
    ↓
Filter behaviors based on action economy (canMove, canAct)
    ↓
Evaluate valid behaviors in priority order (highest first)
    ↓
First behavior where canExecute() === true
    ↓
Call decide() to get AIDecision
    ↓
Convert AIDecision to TurnAction
    ↓
Execute action (move, attack, end-turn)
    ↓
If action completed (move/attack): Re-evaluate behaviors with updated action state
    ↓
Repeat until canMove=false AND canAct=false, or DefaultBehavior chosen
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

**AIContext Data & Methods:**
```typescript
// Action State (Phase 2)
readonly hasMoved: boolean            // Has unit moved this turn?
readonly hasActed: boolean            // Has unit acted this turn?
readonly canMove: boolean             // Can still move? (!hasMoved && movementRange > 0)
readonly canAct: boolean              // Can still act? (!hasActed)

// Helper Methods
getUnitsInRange(range, from?)         // Manhattan distance search
getUnitsInAttackRange(from?)          // Enemy units in attack range
calculatePath(to)                     // Pathfinding to destination
calculateAttackRangeFrom(position)    // Attack range from position (uses unarmed if no weapon)
predictDamage(target, weapon?)        // Damage prediction (handles unarmed)
predictHitChance(target, weapon?)     // Hit chance prediction
canDefeat(target)                     // Check if one-hit kill
getDistance(from, to)                 // Manhattan distance
```

---

### ✅ Phase 2: Attack Behaviors
**Plan:** [02-AttackBehaviorsPlan.md](./02-AttackBehaviorsPlan.md) | **Actual:** [02-AttackBehaviorsPlan-ACTUAL.md](./02-AttackBehaviorsPlan-ACTUAL.md)
**Branch:** `enemy-ai-02-attack-behaviours`
**Status:** Complete ✅

**What Was Done:**
- Implemented `AttackNearestOpponent` behavior (priority 80) - attack-only, no movement
- Implemented `DefeatNearbyOpponent` behavior (priority 100) - move+attack for one-shot kills
- Implemented `MoveTowardNearestOpponent` behavior (priority 10) - move-only when can't attack ⭐ NEW
- **Action Economy System** ⭐ - Units can perform multiple actions per turn (move THEN attack)
  - Added `requiresMove` and `requiresAction` fields to AIBehavior
  - Added `hasMoved`, `hasActed`, `canMove`, `canAct` to AIContext
  - Implemented re-evaluation loop after each action completes
- **Unarmed Attack Support** ⭐ - Enemies without weapons can attack at range 1
- Added WeakMap for unit position tracking in AIContextBuilder
- Updated `convertDecisionToAction()` to handle movement + attack with pending actions
- **Debug Infrastructure** ⭐ - Console logging gated behind `CombatConstants.AI.DEBUG_LOGGING`
- **Constants Extraction** ⭐ - All magic numbers moved to `CombatConstants.AI`

**Success Criteria:**
- [x] Enemies attack nearest opponent if in range ✅
- [x] Enemies prioritize one-shot kills ✅
- [x] Enemies can move THEN attack on same turn ✅
- [x] Movement + attack decisions execute correctly ✅
- [x] Combat log shows AI actions ✅
- [x] No performance degradation ✅
- [x] Unarmed attacks work correctly ✅
- [x] Action economy filtering works ✅

**Key Files Created (5 files):**
- `ai/behaviors/AttackNearestOpponent.ts` (75 lines)
- `ai/behaviors/DefeatNearbyOpponent.ts` (137 lines)
- `ai/behaviors/MoveTowardNearestOpponent.ts` (104 lines) ⭐ NEW
- `GDD/EnemyBehaviour/Phase2CodeReview.md` (601 lines)
- `GDD/EnemyBehaviour/02-AttackBehaviorsPlan-ACTUAL.md` (comparison doc)

**Key Files Modified (11 files):**
- `ai/types/AIBehavior.ts` - Added action economy requirements (+12 lines)
- `ai/types/AIContext.ts` - Added action state tracking (+100 lines)
- `ai/behaviors/DefaultBehavior.ts` - Added action requirements (+2 lines)
- `ai/BehaviorRegistry.ts` - Registered 3 new behaviors (+18 lines)
- `strategies/TurnStrategy.ts` - Updated signature (+13 lines)
- `strategies/EnemyTurnStrategy.ts` - Re-evaluation + filtering (+175 lines)
- `strategies/PlayerTurnStrategy.ts` - Signature compatibility (+4 lines)
- `UnitTurnPhaseHandler.ts` - Action economy re-evaluation (+121 lines)
- `utils/CombatCalculations.ts` - Unarmed attack support (+16 lines)
- `CombatConstants.ts` - AI constants section (+9 lines)
- `ai/index.ts` - Exported new behaviors (+3 lines)

**Code Review:** 98% compliance, APPROVED ✅ ([Phase2CodeReview.md](./Phase2CodeReview.md))

---

### 🚫 Phase 3: Tactical Behaviors (DEFERRED - Post-1.0)
**Plan:** [03-TacticalBehaviorsPlan.md](./03-TacticalBehaviorsPlan.md)
**Status:** Deferred to Post-1.0
**Decision Date:** Thu, Oct 30, 2025

**Rationale for Deferral:**
- Phase 1-2 provide sufficient AI for playable game
- Diminishing returns on AI complexity without player abilities
- Better to focus on core game loop and player features first
- Can revisit after first playable build

**Planned Behaviors (If Time Allows):**
- **⭐ PRIORITY:** `AggressiveTowardSpecificUnit` behavior (priority 90)
  - Targets specific unit by name (e.g., boss targets healer)
  - High gameplay impact for boss/special encounters
  - ~2 hours implementation effort
  - **Implement this first if adding any Phase 3 behaviors**
- `AggressiveTowardCasters` behavior (priority 85-90)
  - Targets units with high Magic Power or Attunement
- `AggressiveTowardMelee` behavior (priority 85-90)
  - Targets units with high Physical Power or Courage
- Unit type classification helpers in AIContext
- Threat scoring system

---

### 🚫 Phase 4: Ability-Based Behaviors (DEFERRED - Post-1.0)
**Plan:** [04-AbilityBehaviorsPlan.md](./04-AbilityBehaviorsPlan.md) (not yet written)
**Status:** Deferred to Post-1.0
**Decision Date:** Thu, Oct 30, 2025

**Rationale for Deferral:**
- Requires player ability system to be implemented first
- Enemy abilities have limited value without player counterplay
- Better to complete player class abilities, then mirror for enemies

**Planned Behaviors:**
- `HealAllies` behavior (priority 95)
- `SupportAllies` behavior (priority 90)
- `DebuffOpponent` behavior (priority 85)
- Extend AIDecision to support ability usage
- Add ability range calculation helpers

---

## Current Status

### Completed ✅

**Phase 1: Core Infrastructure**
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

**Phase 2: Attack Behaviors**
- [x] Action Economy System (requiresMove, requiresAction fields)
- [x] Action state tracking (hasMoved, hasActed, canMove, canAct)
- [x] Behavior filtering based on action economy
- [x] Re-evaluation loop after actions complete
- [x] AttackNearestOpponent behavior (priority 80)
- [x] DefeatNearbyOpponent behavior (priority 100)
- [x] MoveTowardNearestOpponent behavior (priority 10)
- [x] Movement + attack action conversion
- [x] Pending action handling for move-first decisions
- [x] WeakMap unit tracking in AIContextBuilder
- [x] Unarmed attack support (range 1, PhysicalPower only)
- [x] Debug logging gating (CombatConstants.AI.DEBUG_LOGGING)
- [x] Constants extraction (CombatConstants.AI section)
- [x] Code review complete (98% compliance)

### In Progress 🚧
- None (Phase 2 complete, Phase 3-4 deferred)

### Deferred (Post-1.0) 🚫
- [ ] AggressiveTowardSpecificUnit behavior (Phase 3) ⭐ IMPLEMENT FIRST IF TIME
- [ ] AggressiveTowardCasters behavior (Phase 3)
- [ ] AggressiveTowardMelee behavior (Phase 3)
- [ ] HealAllies behavior (Phase 4)
- [ ] SupportAllies behavior (Phase 4)
- [ ] DebuffOpponent behavior (Phase 4)

---

## Key Files

### Core AI System (Phase 1)
- **`ai/types/AIBehavior.ts`** - Core interfaces (AIBehavior, AIDecision, AIBehaviorConfig) + action economy
- **`ai/types/AIContext.ts`** - Context interface, AIContextBuilder, UnitPlacement, action state
- **`ai/behaviors/DefaultBehavior.ts`** - Fallback behavior (ends turn)
- **`ai/BehaviorRegistry.ts`** - Factory, registry, DEFAULT_ENEMY_BEHAVIORS
- **`ai/index.ts`** - Barrel export for public API

### Attack Behaviors (Phase 2)
- **`ai/behaviors/AttackNearestOpponent.ts`** - Attack nearest enemy in range (attack-only)
- **`ai/behaviors/DefeatNearbyOpponent.ts`** - Move and attack to one-shot kill (move+attack)
- **`ai/behaviors/MoveTowardNearestOpponent.ts`** - Move toward nearest enemy (move-only)

### Integration
- **`strategies/EnemyTurnStrategy.ts`** - Behavior evaluation, filtering, context building, re-evaluation
- **`strategies/PlayerTurnStrategy.ts`** - Updated for action state compatibility
- **`strategies/TurnStrategy.ts`** - Interface with action state parameters
- **`UnitTurnPhaseHandler.ts`** - Action economy re-evaluation loop
- **`utils/CombatCalculations.ts`** - Unarmed attack support
- **`CombatConstants.ts`** - AI configuration constants

### Documentation
- **`CombatHierarchy.md`** - Section 3.5 documents AI system architecture
- **`GDD/EnemyBehaviour/EnemyAIBehaviorSystem.md`** - Full design document
- **`GDD/EnemyBehaviour/01-CoreInfrastructurePlan.md`** - Phase 1 implementation plan
- **`GDD/EnemyBehaviour/02-AttackBehaviorsPlan.md`** - Phase 2 original plan
- **`GDD/EnemyBehaviour/02-AttackBehaviorsPlan-ACTUAL.md`** - Phase 2 actual implementation
- **`GDD/EnemyBehaviour/Phase2CodeReview.md`** - Phase 2 code review (98% compliance)

### Future Behaviors (Phase 3+)
- **`ai/behaviors/AggressiveTowardCasters.ts`** (not yet created)
- **`ai/behaviors/AggressiveTowardMelee.ts`** (not yet created)
- **`ai/behaviors/AggressiveTowardSpecificUnit.ts`** (not yet created)
- **`ai/behaviors/HealAllies.ts`** (not yet created)
- **`ai/behaviors/SupportAllies.ts`** (not yet created)
- **`ai/behaviors/DebuffOpponent.ts`** (not yet created)

---

## Technical Patterns

### Behavior Evaluation Flow
```typescript
EnemyTurnStrategy.decideAction():
1. Check for pending action from previous move-first decision
   - If pending: Return attack action immediately
2. Check if context exists
3. Filter behaviors based on action economy:
   - Skip behaviors that require move if canMove=false
   - Skip behaviors that require action if canAct=false
4. For each valid behavior in filtered array (sorted by priority):
   a. Call behavior.canExecute(context)
   b. If true: Call behavior.decide(context)
   c. If decision returned: Convert to TurnAction, return
5. Fallback: Return end-turn (should never reach due to DefaultBehavior)
```

### AIContext Building Flow
```
EnemyTurnStrategy.onTurnStart(unit, position, state, hasMoved=false, hasActed=false):
1. Call AIContextBuilder.build(unit, position, state, hasMoved, hasActed)
2. Build WeakMap for unit position tracking (O(1) lookups)
3. Partition all units into allies and enemies (excludes self)
4. Calculate movement range (MovementRangeCalculator)
5. Calculate attack range:
   - If weapon equipped: Use weapon min/max range
   - If unarmed: Use range 1 (melee, from CombatConstants.AI.UNARMED_ATTACK_RANGE)
6. Calculate action economy state:
   - canMove = !hasMoved && movementRange.length > 0
   - canAct = !hasActed
7. Get default weapon helper closure
8. Create context object with:
   - Immutable data (frozen arrays)
   - Action state (hasMoved, hasActed, canMove, canAct)
   - Helper methods (closures over state/position)
9. Return frozen context
```

### Priority-Based Behavior System
```
Behavior Priority Ranges (0-100):
- 100: Critical actions (DefeatNearbyOpponent - one-shot kills)
- 90-99: High priority (healing, support) - future
- 80-89: Combat actions (AttackNearestOpponent - attacks, debuffs)
- 70-79: Tactical positioning - future
- 10-69: Movement/positioning (MoveTowardNearestOpponent)
- 0: DefaultBehavior (always valid, always last)

Evaluation:
- Behaviors sorted on creation (BehaviorRegistry.createMany)
- Filtered based on action economy (requiresMove, requiresAction)
- First behavior where canExecute() === true wins
- Others never evaluated (short-circuit)

Current DEFAULT_ENEMY_BEHAVIORS:
1. DefeatNearbyOpponent (priority 100, requiresMove=false, requiresAction=true)
2. AttackNearestOpponent (priority 80, requiresMove=false, requiresAction=true)
3. MoveTowardNearestOpponent (priority 10, requiresMove=true, requiresAction=false)
4. DefaultBehavior (priority 0, requiresMove=false, requiresAction=false)
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

### WeakMap Pattern (Phase 2) ✅
```typescript
// AIContextBuilder - Avoids duplicate unit name issues
private static unitPositions = new WeakMap<CombatUnit, Position>()

// Build once per turn, cleared on rebuild
for (const placement of state.unitManifest.getAllUnits()) {
  this.unitPositions.set(placement.unit, placement.position);
}

// Query without name collisions (O(1) lookup)
const pos = this.unitPositions.get(unit);
```

### Action Economy Pattern (Phase 2) ⭐ NEW
```typescript
// AIBehavior interface requirements
interface AIBehavior {
  readonly requiresMove: boolean;   // Does behavior need movement available?
  readonly requiresAction: boolean; // Does behavior need action available?
  // ...
}

// AIContext action state
interface AIContext {
  readonly hasMoved: boolean;  // Has unit moved this turn?
  readonly hasActed: boolean;  // Has unit acted this turn?
  readonly canMove: boolean;   // Can unit still move? (!hasMoved && movementRange.length > 0)
  readonly canAct: boolean;    // Can unit still act? (!hasActed)
  // ...
}

// Behavior filtering (EnemyTurnStrategy)
const validBehaviors = this.behaviors.filter(behavior => {
  if (behavior.requiresMove && !context.canMove) return false;
  if (behavior.requiresAction && !context.canAct) return false;
  return true;
});

// Re-evaluation after actions (UnitTurnPhaseHandler)
// After movement completes:
this.strategy.onTurnStart(unit, newPosition, state, true, this.hasActed);

// After attack completes:
this.strategy.onTurnStart(unit, position, state, this.hasMoved, true);

// Loop continues until canMove=false AND canAct=false, or DefaultBehavior chosen
```

---

## Next Steps

### Immediate (Current Work)
- [x] Manual testing of Phase 2 behaviors ✅
  1. Enemies attack nearest opponent ✅
  2. Enemies prioritize one-shot kills ✅
  3. Enemies move then attack on same turn ✅
  4. Unarmed attacks work correctly ✅
  5. Debug logging can be toggled ✅
- [x] Phase 2 complete and working ✅
- [x] Documentation updated to reflect deferral decision ✅

### Short-term (Core Game Features - NEXT)
**Focus on making the game playable before enhancing AI further:**

1. **Player Class Abilities** (High Priority)
   - Implement basic player attacks, heals, buffs
   - Unlocks strategic depth for player
   - Can be mirrored for enemy abilities later

2. **Combat Balance** (High Priority)
   - Enemy stat tuning
   - Damage/health balance
   - Difficulty curve across encounters

3. **Win/Loss Conditions** (Essential)
   - Victory detection
   - Game over handling
   - Reward/progression system

4. **Core Game Loop** (Essential)
   - Encounter flow (setup → combat → rewards → next)
   - Save/load system completeness
   - Basic UI polish

5. **Playtesting** (Critical)
   - Get feedback on what's fun
   - Identify what's actually missing vs nice-to-have

### Long-term (Post-1.0 AI Enhancements)
**Only after core game is playable:**

**If Time Allows - Quick Win:**
- Implement `AggressiveTowardSpecificUnit` behavior (~2 hours)
  - Enables boss/special enemy scenarios
  - High gameplay impact for low effort
  - Creates memorable scripted encounters

**Phase 3: Tactical Behaviors (Deferred)**
1. Add unit classification helpers to AIContext
2. Implement `AggressiveTowardCasters` behavior (priority 85-90)
3. Implement `AggressiveTowardMelee` behavior (priority 85-90)
4. Test tactical positioning and target prioritization

**Phase 4: Ability-Based Behaviors (Deferred)**
1. Extend AIDecision to support ability usage
2. Add ability range calculation helpers
3. Implement `HealAllies` behavior (priority 95)
4. Implement `SupportAllies` behavior (priority 90)
5. Implement `DebuffOpponent` behavior (priority 85)
6. Benefits from action economy (heal then move, buff then attack, etc.)

---

## Design Notes & Deferred Items

### Phase 1 Implementation Notes

**✅ Implemented:**
- Core type system (AIBehavior, AIContext, AIDecision)
- AIContextBuilder with pre-calculations
- DefaultBehavior fallback
- BehaviorRegistry factory pattern
- EnemyTurnStrategy integration
- 100% backward compatibility

**Code Review:** ✅ 100% GeneralGuidelines.md compliance ([Phase1-CodeReview.md](./Phase1-CodeReview.md))

### Phase 2 Implementation Notes

**✅ Implemented (Beyond Original Plan):**
- AttackNearestOpponent, DefeatNearbyOpponent behaviors (as planned)
- MoveTowardNearestOpponent behavior (NEW - not in plan)
- Action Economy System (NEW - major enhancement)
  - Multi-action support (move THEN attack)
  - Behavior filtering based on action requirements
  - Re-evaluation loop after each action
- Unarmed Attack Support (NEW - discovered requirement)
  - Range 1 for unarmed
  - Uses PhysicalPower only, no weapon bonuses
- WeakMap Unit Tracking (as planned)
- Debug Logging Gating (NEW - post-review improvement)
- Constants Extraction (NEW - post-review improvement)

**Code Review:** ✅ 98% GeneralGuidelines.md compliance ([Phase2CodeReview.md](./Phase2CodeReview.md))

**Bugs Fixed During Implementation:**
1. Move+attack pending action lost (fixed with pending action check)
2. AI turn stalling after attack (fixed canAct flag management)
3. Thinking delay after re-evaluation (fixed timer skip)
4. Infinite move attempts (fixed turn ending on failed moves)
5. Move-only actions didn't end turn (fixed with pending action check)
6. Unarmed enemies can't attack (fixed with unarmed support)
7. **Player action menu not disabling after attack** (Phase 2 post-merge bug)
   - **Root Cause:** `canAct` flag used for two conflicting purposes:
     - Animation gating (prevent updates during animations) ✅ Correct
     - Action economy tracking (has player acted?) ❌ Wrong approach
   - **Symptom:** Player could attack multiple times per turn
   - **Fix:** Split responsibilities:
     - `canAct` (internal) - Controls animation/update gating
     - `hasActed` (internal) - Tracks if action performed this turn
     - `getCanAct()` (public) - Returns `!hasActed` for menu state
   - **Lesson:** Don't overload single flag for multiple purposes
   - **Location:** UnitTurnPhaseHandler.ts (completeAttack + getCanAct)
8. **Player cannot move after attacking** (Phase 2 post-merge bug)
   - **Root Cause:** `canAct` remained `false` after attack, blocking strategy.update()
   - **Symptom:** Move button worked but clicking tiles did nothing
   - **Fix:** Restore `canAct = true` after attack completes (for all units)
   - **Why:** Strategy needs `canAct = true` to process player input (movement)
   - **Location:** UnitTurnPhaseHandler.ts:1254 (completeAttack method)

**Deviations from Plan:**
- AttackNearestOpponent simplified to attack-only (cleaner design)
- Added MoveTowardNearestOpponent for move-only behavior
- Scope much larger than planned (+2418 lines vs ~100 lines)
- Time ~6 hours vs 3-4 hours estimated

**See:** [02-AttackBehaviorsPlan-ACTUAL.md](./02-AttackBehaviorsPlan-ACTUAL.md) for full comparison

### Phase 3-4 Deferral Decision

**Date:** Thu, Oct 30, 2025
**Decision:** Defer Phase 3 (Tactical Behaviors) and Phase 4 (Ability-Based Behaviors) to Post-1.0

**Rationale:**
1. **Playable game NOW** - Phase 1-2 provide sufficient AI for engaging combat
2. **Diminishing returns** - Advanced targeting has minimal impact without player abilities
3. **Missing player features** - Enemy abilities need player counterplay to be meaningful
4. **Scope management** - Better to ship complete, simpler game than incomplete, complex one
5. **Strong foundation** - Action economy system ready for future complex behaviors

**Current AI Capabilities (Sufficient for 1.0):**
- ✅ Enemies attack intelligently (nearest target, hit chance tie-breaker)
- ✅ Enemies prioritize one-shot kills (tactical feel)
- ✅ Enemies move and attack on same turn (action economy)
- ✅ Enemies advance toward combat (not passive)

**If Time Allows:**
- Implement `AggressiveTowardSpecificUnit` only (~2 hours)
- Enables boss/special encounters with targeted AI
- High gameplay impact, low implementation cost

**Next Priorities:**
1. Player class abilities (attacks, heals, buffs)
2. Combat balance and difficulty tuning
3. Win/loss conditions and game loop
4. Playtesting and feedback

### Still Deferred

1. **Explicit Equipment.damageType Field** (Future Enhancement)
   - **Current:** AIContext infers damage type from weapon modifiers
   - **Logic:** If weapon has non-zero magic power modifiers → magical, else physical
   - **Reason:** Equipment class doesn't have `damageType` field yet
   - **Impact:** Low - inference matches current game behavior
   - **Future:** When Equipment gains explicit `damageType`, update AIContext helpers

2. **Unit Tests** (Recommended for Phase 3)
   - **Why:** No unit tests for AI system yet
   - **Reason:** Manual testing validates correctness, code review verified quality
   - **Impact:** Low - comprehensive manual testing completed
   - **Future:** Add unit test suite before or during Phase 3

3. **Performance Profiling** (Continuous)
   - **Current:** <4ms overhead per turn measured
   - **Result:** No performance issues detected
   - **Future:** Continue monitoring as behaviors grow in complexity

### Known Limitations (By Design)

**Current Scope (Phase 2):**
- ✅ Enemies can attack and move on same turn
- ✅ Enemies can perform multiple sequential actions
- ✅ No ability usage yet (Phase 4)
- ✅ No healing/support behaviors yet (Phase 4)
- ✅ No advanced tactical targeting yet (Phase 3)

**These are intentional - Phase 2 focuses on combat fundamentals.**

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

**Q: How does the action economy system work?**
A: Units can perform multiple actions per turn. Each behavior declares what it needs (`requiresMove`, `requiresAction`). The context tracks what the unit has done (`hasMoved`, `hasActed`) and what's available (`canMove`, `canAct`). After each action completes, behaviors are re-evaluated with updated state. The turn ends when no more valid behaviors can execute (usually when `canMove=false` AND `canAct=false`).

**Q: Can a unit move twice or attack twice?**
A: No. Each action type can only be performed once per turn. Once `hasMoved=true`, all behaviors with `requiresMove=true` are filtered out. Same for `hasActed` and `requiresAction`. The action economy system prevents duplicate action types.

**Q: What happens if a behavior returns move-first but the unit has already moved?**
A: If `hasMoved=true`, behaviors with `requiresMove=true` are filtered out before evaluation. They never get a chance to decide. This prevents invalid move decisions.

**Q: How do I toggle debug logging?**
A: Set `CombatConstants.AI.DEBUG_LOGGING` to `false` in `CombatConstants.ts`. All AI debug logs are gated behind this flag. Warning and error logs remain ungated.

**Q: What's the difference between AttackNearestOpponent and DefeatNearbyOpponent?**
A: `AttackNearestOpponent` (priority 80) only attacks enemies already in range (attack-only, no movement). `DefeatNearbyOpponent` (priority 100) will move into range if needed to one-shot kill a weak enemy (move+attack). DefeatNearby has higher priority because eliminating enemies is tactically more valuable.

**Q: Why add MoveTowardNearestOpponent?**
A: It's a fallback for when enemies can't reach attack range this turn. Instead of standing still (DefaultBehavior), they move closer to combat. This creates more dynamic and aggressive AI behavior. Priority 10 puts it just above DefaultBehavior (priority 0).

**Q: How does unarmed attack work?**
A: If a unit has no weapon equipped, attack range defaults to 1 (melee). Damage uses only PhysicalPower with no modifiers or multipliers (0 modifier, 1.0 multiplier). This is defined in `CombatConstants.AI.UNARMED_ATTACK_RANGE/MODIFIER/MULTIPLIER`.

**Q: Why doesn't Phase 1 use WeakMap for unit tracking?**
A: Phase 2 added WeakMap tracking. It's now used in AIContextBuilder for O(1) unit position lookups without duplicate name issues. See [Design Notes](#design-notes--deferred-items) for details.

**Q: How does AIContext determine weapon damage type without Equipment.damageType field?**
A: AIContext infers damage type from weapon modifiers: if weapon has non-zero magic power modifiers → magical, else physical. This matches current game behavior (AttackMenuContent hardcodes 'physical'). When Equipment gains explicit `damageType` field, we'll update the helpers. See [Design Notes](#design-notes--deferred-items) for details.

**Q: Where are the unit tests for the AI system?**
A: Unit tests are recommended for Phase 3. Phases 1 and 2 used comprehensive manual testing and code reviews (100% and 98% compliance respectively). Manual testing validates all behaviors work correctly. See [Design Notes](#design-notes--deferred-items) for testing roadmap.

**Q: What items were consciously deferred?**
A: See the [Design Notes & Deferred Items](#design-notes--deferred-items) section for a complete list with rationale. Key items: Equipment.damageType field (future enhancement), unit tests (recommended for Phase 3), performance profiling (continuous, <4ms overhead measured).

---

**End of Quick Reference**

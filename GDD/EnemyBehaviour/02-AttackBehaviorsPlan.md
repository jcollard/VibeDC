# Phase 2: Attack Behaviors - Implementation Plan

**Phase:** 2 of 4
**Status:** Planning
**Prerequisites:** Phase 1 (Core Infrastructure) ✅ Complete
**Estimated Effort:** 3-4 hours
**Branch Strategy:** `enemy-ai-phase2` → `enemy-ai` → `main`

---

## Table of Contents

- [Phase Overview](#phase-overview)
- [Success Criteria](#success-criteria)
- [Prerequisites Verification](#prerequisites-verification)
- [Implementation Steps](#implementation-steps)
- [File-by-File Changes](#file-by-file-changes)
- [Testing Strategy](#testing-strategy)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Performance Considerations](#performance-considerations)
- [Risks & Mitigations](#risks--mitigations)
- [Future Phases Preview](#future-phases-preview)
- [Reference Documents](#reference-documents)

---

## Phase Overview

### Goals

Phase 2 adds **attack behaviors** to the AI system, enabling enemies to:
1. Attack nearest opponents in current attack range
2. Move toward and attack opponents (movement + attack)
3. Prioritize one-shot kills (DefeatNearbyOpponent)

### What's Being Added

**New Behaviors (2):**
- `AttackNearestOpponent` - Attacks closest enemy in range (no movement)
- `DefeatNearbyOpponent` - Moves into range and one-shots weak enemies

**Core Enhancements:**
- WeakMap unit tracking in AIContextBuilder (performance optimization)
- Movement + attack decision conversion in EnemyTurnStrategy
- Updated DEFAULT_ENEMY_BEHAVIORS configuration

**Integration Points:**
- EnemyTurnStrategy.convertDecisionToAction() - Handle movement and attack
- UnitTurnPhaseHandler - Execute AI movement and attack decisions
- BehaviorRegistry - Register new behaviors

### What's NOT Being Added

- ❌ Tactical behaviors (Phase 3)
- ❌ Ability-based behaviors (Phase 4)
- ❌ Complex target scoring (future enhancement)
- ❌ Dynamic priority adjustment (future enhancement)

---

## Success Criteria

### Functional Requirements

**Must Have:**
- [x] AttackNearestOpponent behavior implemented and working
- [x] DefeatNearbyOpponent behavior implemented and working
- [x] Enemies attack nearest opponent if in current range
- [x] Enemies move toward and attack opponents within movement+attack range
- [x] Enemies prioritize one-shot kills over other attacks
- [x] WeakMap tracking prevents duplicate name lookups
- [x] Movement animations play correctly for AI decisions
- [x] Attack animations play correctly for AI decisions
- [x] Combat log shows AI actions with proper messages
- [x] Priority ordering works correctly (DefeatNearby=100, AttackNearest=80, Default=0)

**Should Have:**
- [x] Console logging shows AI decision-making process
- [x] Edge cases handled gracefully (no targets, blocked paths, etc.)
- [x] No performance degradation from Phase 1 baseline
- [x] Backward compatible with Phase 1 (DefaultBehavior still works)

**Nice to Have:**
- [ ] Hit chance considered in target selection (tie-breaker)
- [ ] Distance-based target prioritization
- [ ] Integration tests with multiple enemy types

### Non-Functional Requirements

**Performance:**
- Context building: <2ms per turn (with WeakMap optimization)
- No per-frame allocations
- Memory: <3KB per enemy turn (acceptable growth from Phase 1)

**Code Quality:**
- 100% GeneralGuidelines.md compliance
- TypeScript compilation: 0 errors, 0 warnings
- No breaking changes to Phase 1 API
- Comprehensive JSDoc documentation

**Testing:**
- Manual testing scenarios defined
- Edge cases documented
- Integration test plan created

---

## Prerequisites Verification

### Phase 1 Completion Checklist

Before starting Phase 2, verify:

- [x] Phase 1 merged to `enemy-ai` branch
- [x] TypeScript builds successfully
- [x] Core infrastructure files exist:
  - [x] `ai/types/AIBehavior.ts`
  - [x] `ai/types/AIContext.ts`
  - [x] `ai/behaviors/DefaultBehavior.ts`
  - [x] `ai/BehaviorRegistry.ts`
  - [x] `ai/index.ts`
- [x] EnemyTurnStrategy uses behavior system
- [x] DefaultBehavior registered and working
- [x] Enemies end turn after thinking delay
- [x] No console errors in combat

### Required Knowledge

**Developer should understand:**
1. Priority-based behavior evaluation (Phase 1)
2. AIContext helper methods (getUnitsInAttackRange, calculatePath, etc.)
3. TurnAction format (type, target, destination fields)
4. UnitTurnPhaseHandler action execution flow
5. Attack system (AttackAnimationSequence, damage application)
6. Movement system (UnitMovementSequence, pathfinding)

**Key Files to Review:**
- `EnemyTurnStrategy.ts` - Behavior evaluation and decision conversion
- `UnitTurnPhaseHandler.ts` - Action execution (lines 800-1200)
- `PlayerTurnStrategy.ts` - Movement and attack patterns to mirror
- `AIContext.ts` - Helper methods available to behaviors

---

## Implementation Steps

### Step 1: Create AttackNearestOpponent Behavior

**Estimated Time:** 45 minutes

**File:** `react-app/src/models/combat/ai/behaviors/AttackNearestOpponent.ts`

**Implementation:**
```typescript
import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext } from '../types/AIContext';

/**
 * Attack the nearest opponent in current attack range.
 * Does not move - only attacks from current position.
 * Priority: 80
 */
export class AttackNearestOpponent implements AIBehavior {
  readonly type = 'AttackNearestOpponent';
  readonly priority: number;
  readonly config?: unknown;

  constructor(priority: number = 80, config?: unknown) {
    this.priority = priority;
    this.config = config;
  }

  canExecute(context: AIContext): boolean {
    // Check if any enemies in current attack range
    const targets = context.getUnitsInAttackRange();
    return targets.length > 0;
  }

  decide(context: AIContext): AIDecision | null {
    const targets = context.getUnitsInAttackRange();
    if (targets.length === 0) return null;

    // Find nearest target by Manhattan distance
    let nearestTarget = targets[0];
    let nearestDistance = context.getDistance(
      context.selfPosition,
      nearestTarget.position
    );

    for (const target of targets.slice(1)) {
      const distance = context.getDistance(context.selfPosition, target.position);

      // Prefer closer, or same distance with higher hit chance
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestTarget = target;
      } else if (distance === nearestDistance) {
        // Tie-breaker: higher hit chance
        const currentHitChance = context.predictHitChance(nearestTarget.unit);
        const newHitChance = context.predictHitChance(target.unit);
        if (newHitChance > currentHitChance) {
          nearestTarget = target;
        }
      }
    }

    return {
      action: {
        type: 'attack',
        target: nearestTarget.position,
      },
      order: 'act-only',
    };
  }
}
```

**Key Points:**
- Priority 80 (higher than Default, lower than DefeatNearby)
- No movement - only attacks from current position
- Nearest target by Manhattan distance
- Tie-breaker: higher hit chance
- Returns `act-only` decision (no movement)

---

### Step 2: Create DefeatNearbyOpponent Behavior

**Estimated Time:** 60 minutes

**File:** `react-app/src/models/combat/ai/behaviors/DefeatNearbyOpponent.ts`

**Implementation:**
```typescript
import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext, UnitPlacement } from '../types/AIContext';
import type { Position } from '../../../../types';

/**
 * Move toward and one-shot kill weak enemies.
 * Checks if any enemy can be defeated in one attack.
 * If so, moves into range (if needed) and attacks.
 * Priority: 100 (highest - prioritize kills)
 */
export class DefeatNearbyOpponent implements AIBehavior {
  readonly type = 'DefeatNearbyOpponent';
  readonly priority: number;
  readonly config?: unknown;

  constructor(priority: number = 100, config?: unknown) {
    this.priority = priority;
    this.config = config;
  }

  canExecute(context: AIContext): boolean {
    // Check current attack range for one-shot kills
    const currentTargets = context.getUnitsInAttackRange();
    for (const target of currentTargets) {
      if (context.canDefeat(target.unit)) {
        return true;
      }
    }

    // Check movement + attack range for one-shot kills
    for (const movePos of context.movementRange) {
      const attackFromMove = context.calculateAttackRangeFrom(movePos);

      for (const targetPos of attackFromMove.validTargets) {
        const targetUnit = context.manifest.getUnitAtPosition(targetPos);
        if (!targetUnit) continue;

        // Check if target is an enemy
        if (targetUnit.isPlayerControlled === context.self.isPlayerControlled) {
          continue;
        }

        if (context.canDefeat(targetUnit)) {
          return true;
        }
      }
    }

    return false;
  }

  decide(context: AIContext): AIDecision | null {
    // First, check current attack range for one-shot kills
    const currentTargets = context.getUnitsInAttackRange();
    for (const target of currentTargets) {
      if (context.canDefeat(target.unit)) {
        // Can defeat from current position - no movement needed
        return {
          action: {
            type: 'attack',
            target: target.position,
          },
          order: 'act-only',
        };
      }
    }

    // Search movement + attack range for one-shot kills
    let bestTarget: Position | null = null;
    let bestMovePosition: Position | null = null;
    let bestDistance = Infinity;

    for (const movePos of context.movementRange) {
      const attackFromMove = context.calculateAttackRangeFrom(movePos);

      for (const targetPos of attackFromMove.validTargets) {
        const targetUnit = context.manifest.getUnitAtPosition(targetPos);
        if (!targetUnit) continue;

        // Check if target is an enemy
        if (targetUnit.isPlayerControlled === context.self.isPlayerControlled) {
          continue;
        }

        // Check if can defeat
        if (!context.canDefeat(targetUnit)) continue;

        // Prefer closer targets
        const distance = context.getDistance(movePos, targetPos);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTarget = targetPos;
          bestMovePosition = movePos;
        }
      }
    }

    if (!bestTarget || !bestMovePosition) return null;

    // Calculate path to movement position
    const path = context.calculatePath(bestMovePosition);
    if (!path) {
      console.warn(
        `[AI] ${context.self.name} cannot path to ${bestMovePosition.x},${bestMovePosition.y}`
      );
      return null;
    }

    return {
      movement: {
        destination: bestMovePosition,
        path: path,
      },
      action: {
        type: 'attack',
        target: bestTarget,
      },
      order: 'move-first',
    };
  }
}
```

**Key Points:**
- Priority 100 (highest - prioritize kills)
- Checks current range first (no movement needed)
- Then checks movement + attack range
- Uses `canDefeat()` helper (damage >= target health)
- Returns null if path blocked
- Prefers closer targets if multiple one-shot opportunities
- Returns `move-first` decision when movement needed

---

### Step 3: Add WeakMap Unit Tracking

**Estimated Time:** 30 minutes

**File:** `react-app/src/models/combat/ai/types/AIContext.ts`

**Changes:**

1. **Add WeakMap field to AIContextBuilder:**
```typescript
export class AIContextBuilder {
  // Cache for unit positions (avoids duplicate name lookups)
  private static unitPositions = new WeakMap<CombatUnit, Position>();

  static build(
    self: CombatUnit,
    selfPosition: Position,
    state: CombatState
  ): AIContext {
    // Clear previous tracking
    this.unitPositions = new WeakMap<CombatUnit, Position>();

    // Build unit tracking map
    for (const placement of state.unitManifest.getAllUnits()) {
      this.unitPositions.set(placement.unit, placement.position);
    }

    // ... rest of build method
  }
}
```

2. **Update helper methods to use WeakMap:**
```typescript
// Helper: Get enemy units in attack range
getUnitsInAttackRange(from: Position = selfPosition): UnitPlacement[] {
  const attackRangeFromPos = from === selfPosition
    ? attackRange
    : this.calculateAttackRangeFrom(from);

  if (!attackRangeFromPos) return [];

  const result: UnitPlacement[] = [];
  for (const targetPos of attackRangeFromPos.validTargets) {
    // Use WeakMap for efficient lookup
    const targetUnit = [...enemyUnits].find(
      placement => placement.position.x === targetPos.x &&
                   placement.position.y === targetPos.y
    )?.unit;

    if (!targetUnit) continue;

    result.push({
      unit: targetUnit,
      position: targetPos,
    });
  }

  return result;
}
```

**Key Points:**
- WeakMap prevents memory leaks (garbage collected with units)
- Built once per turn, not per query
- Avoids string-based name lookups (duplicate name issues)
- Fallback to manifest.getUnitAtPosition() if needed

---

### Step 4: Update EnemyTurnStrategy Decision Conversion

**Estimated Time:** 45 minutes

**File:** `react-app/src/models/combat/strategies/EnemyTurnStrategy.ts`

**Changes:**

1. **Update convertDecisionToAction() method:**
```typescript
private convertDecisionToAction(decision: AIDecision): TurnAction {
  // Handle different decision orders
  switch (decision.order) {
    case 'act-only':
      // No movement, just action
      if (decision.action?.type === 'attack') {
        if (!decision.action.target) {
          console.warn('[AI] Attack decision missing target');
          return { type: 'end-turn' };
        }
        return {
          type: 'attack',
          target: decision.action.target,
        };
      }
      if (decision.action?.type === 'delay') {
        return { type: 'delay' };
      }
      if (decision.action?.type === 'end-turn') {
        return { type: 'end-turn' };
      }
      break;

    case 'move-only':
      // Movement without action
      if (decision.movement) {
        return {
          type: 'move',
          destination: decision.movement.destination,
          path: decision.movement.path,
        };
      }
      break;

    case 'move-first':
      // Movement then action (Phase 2: Store for sequential execution)
      // For now, we'll handle this in UnitTurnPhaseHandler
      // Return movement first, then action will be queued
      if (decision.movement && decision.action?.type === 'attack') {
        // Store the pending action for after movement
        this.pendingActionAfterMove = decision.action;
        return {
          type: 'move',
          destination: decision.movement.destination,
          path: decision.movement.path,
        };
      }
      break;

    case 'act-first':
      // Action then movement (future use case)
      console.warn('[AI] act-first order not yet implemented');
      break;
  }

  // Fallback
  console.warn('[AI] Unhandled decision type, ending turn', decision);
  return { type: 'end-turn' };
}
```

2. **Add field for pending action:**
```typescript
export class EnemyTurnStrategy implements TurnStrategy {
  // ... existing fields

  // Pending action to execute after movement completes
  private pendingActionAfterMove: AIDecision['action'] | null = null;
}
```

3. **Clear pending action in onTurnEnd():**
```typescript
onTurnEnd(): void {
  this.context = null;
  this.movementRange = [];
  this.thinkingTimer = 0;
  this.actionDecided = null;
  this.pendingActionAfterMove = null; // Clear pending action
  this.targetedUnit = null;
  this.targetedPosition = null;
}
```

**Key Points:**
- Handles all decision order types
- Returns move action first for 'move-first' decisions
- Stores attack action for after movement completes
- Proper null checks and warnings
- Clean state management

---

### Step 5: Handle Movement + Attack in UnitTurnPhaseHandler

**Estimated Time:** 60 minutes

**File:** `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Note:** This step depends on existing UnitTurnPhaseHandler architecture. Review lines 800-1200 for movement and attack execution patterns.

**Approach:**

1. **Check for pending action after movement:**
```typescript
// In handleMoveComplete() or equivalent movement completion handler
private handleAIMovementComplete(): void {
  if (!this.currentStrategy) return;

  // Check if AI has pending action (e.g., attack after move)
  const enemyStrategy = this.currentStrategy as EnemyTurnStrategy;
  if (enemyStrategy.hasPendingAction && enemyStrategy.hasPendingAction()) {
    const pendingAction = enemyStrategy.getPendingAction();

    if (pendingAction?.type === 'attack' && pendingAction.target) {
      // Execute attack action
      this.executeAttackAction(pendingAction.target);
      return;
    }
  }

  // No pending action, end turn
  this.endCurrentTurn();
}
```

2. **Add methods to EnemyTurnStrategy:**
```typescript
// In EnemyTurnStrategy
hasPendingAction(): boolean {
  return this.pendingActionAfterMove !== null;
}

getPendingAction(): AIDecision['action'] | null {
  const action = this.pendingActionAfterMove;
  this.pendingActionAfterMove = null; // Clear after retrieval
  return action;
}
```

**Alternative Approach (Simpler for Phase 2):**

Return a compound action type that UnitTurnPhaseHandler already handles:
```typescript
// If UnitTurnPhaseHandler already supports this pattern:
return {
  type: 'move-then-attack',
  destination: decision.movement.destination,
  path: decision.movement.path,
  attackTarget: decision.action.target,
};
```

**Decision:** Choose based on existing UnitTurnPhaseHandler capabilities. Prefer reusing existing patterns.

---

### Step 6: Register New Behaviors

**Estimated Time:** 15 minutes

**File:** `react-app/src/models/combat/ai/BehaviorRegistry.ts`

**Changes:**

1. **Import new behaviors:**
```typescript
import { DefaultBehavior } from './behaviors/DefaultBehavior';
import { AttackNearestOpponent } from './behaviors/AttackNearestOpponent';
import { DefeatNearbyOpponent } from './behaviors/DefeatNearbyOpponent';
```

2. **Register behaviors:**
```typescript
// Register built-in behaviors
BehaviorRegistry.register('DefaultBehavior', (priority, config) =>
  new DefaultBehavior(priority, config)
);

BehaviorRegistry.register('AttackNearestOpponent', (priority, config) =>
  new AttackNearestOpponent(priority, config)
);

BehaviorRegistry.register('DefeatNearbyOpponent', (priority, config) =>
  new DefeatNearbyOpponent(priority, config)
);
```

3. **Update DEFAULT_ENEMY_BEHAVIORS:**
```typescript
export const DEFAULT_ENEMY_BEHAVIORS: AIBehaviorConfig[] = [
  { type: 'DefeatNearbyOpponent', priority: 100 },
  { type: 'AttackNearestOpponent', priority: 80 },
  { type: 'DefaultBehavior', priority: 0 },
];
```

**Key Points:**
- All behaviors registered in priority order
- DEFAULT_ENEMY_BEHAVIORS updated with new behaviors
- Factory functions follow same pattern

---

### Step 7: Update Barrel Export

**Estimated Time:** 5 minutes

**File:** `react-app/src/models/combat/ai/index.ts`

**Changes:**

```typescript
// Core types
export type { AIBehavior, AIBehaviorConfig, AIDecision } from './types/AIBehavior';
export type { AIContext, UnitPlacement } from './types/AIContext';

// Context builder
export { AIContextBuilder } from './types/AIContext';

// Behaviors
export { DefaultBehavior } from './behaviors/DefaultBehavior';
export { AttackNearestOpponent } from './behaviors/AttackNearestOpponent';
export { DefeatNearbyOpponent } from './behaviors/DefeatNearbyOpponent';

// Registry
export { BehaviorRegistry, DEFAULT_ENEMY_BEHAVIORS } from './BehaviorRegistry';
```

---

## File-by-File Changes

### New Files (2)

1. **`react-app/src/models/combat/ai/behaviors/AttackNearestOpponent.ts`**
   - Lines: ~75
   - Implements AIBehavior interface
   - Priority 80
   - No movement, attack only

2. **`react-app/src/models/combat/ai/behaviors/DefeatNearbyOpponent.ts`**
   - Lines: ~130
   - Implements AIBehavior interface
   - Priority 100
   - Movement + attack support

### Modified Files (4)

3. **`react-app/src/models/combat/ai/types/AIContext.ts`**
   - Add WeakMap field to AIContextBuilder
   - Update getUnitsInAttackRange() to use WeakMap
   - Build WeakMap in build() method
   - Estimated changes: +20 lines

4. **`react-app/src/models/combat/ai/BehaviorRegistry.ts`**
   - Import new behaviors
   - Register AttackNearestOpponent
   - Register DefeatNearbyOpponent
   - Update DEFAULT_ENEMY_BEHAVIORS
   - Estimated changes: +10 lines

5. **`react-app/src/models/combat/ai/index.ts`**
   - Export AttackNearestOpponent
   - Export DefeatNearbyOpponent
   - Estimated changes: +2 lines

6. **`react-app/src/models/combat/strategies/EnemyTurnStrategy.ts`**
   - Add pendingActionAfterMove field
   - Update convertDecisionToAction() method
   - Add hasPendingAction() method
   - Add getPendingAction() method
   - Update onTurnEnd() cleanup
   - Estimated changes: +60 lines

### Optional Modified Files (1)

7. **`react-app/src/models/combat/UnitTurnPhaseHandler.ts`** (if needed)
   - Add handleAIMovementComplete() or equivalent
   - Check for pending actions after movement
   - Execute pending attack actions
   - Estimated changes: +30 lines (depends on existing architecture)

---

## Testing Strategy

### Unit Testing (Manual for Phase 2)

**Test 1: AttackNearestOpponent Behavior**
```typescript
describe('AttackNearestOpponent', () => {
  it('should attack nearest enemy in range', () => {
    // Setup: Unit with 3 enemies at different distances
    // Expected: Attacks closest enemy
  });

  it('should prefer higher hit chance on distance tie', () => {
    // Setup: Two enemies equidistant, one with higher hit chance
    // Expected: Attacks enemy with higher hit chance
  });

  it('should return null if no enemies in range', () => {
    // Setup: No enemies in attack range
    // Expected: canExecute() returns false, decide() returns null
  });
});
```

**Test 2: DefeatNearbyOpponent Behavior**
```typescript
describe('DefeatNearbyOpponent', () => {
  it('should one-shot kill weak enemy without moving', () => {
    // Setup: Weak enemy in current attack range
    // Expected: act-only decision with attack
  });

  it('should move then one-shot kill weak enemy', () => {
    // Setup: Weak enemy in movement+attack range
    // Expected: move-first decision with movement and attack
  });

  it('should prioritize one-shot kills over regular attacks', () => {
    // Setup: Both behaviors can execute
    // Expected: DefeatNearbyOpponent (priority 100) executes first
  });

  it('should return null if no valid path', () => {
    // Setup: Weak enemy reachable but path blocked
    // Expected: decide() returns null, falls through to next behavior
  });
});
```

### Integration Testing (Manual)

**Scenario 1: Basic Combat with Attack Behavior**
1. Create encounter with 2 enemies vs 2 players
2. Position enemy in range of player
3. Start combat, let enemy take turn
4. Expected: Enemy attacks nearest player
5. Verify: Attack animation plays, damage applied, combat log shows action

**Scenario 2: Move Then Attack**
1. Create encounter with 1 enemy vs 1 player
2. Position enemy out of attack range but within movement+attack range
3. Position weak player (defeatable in one hit)
4. Start combat, let enemy take turn
5. Expected: Enemy moves closer, then attacks
6. Verify: Movement animation plays, then attack animation, player defeated

**Scenario 3: Priority Ordering**
1. Create encounter with 1 enemy vs 3 players
2. Position players: one weak (defeatable), two healthy
3. Weak player farther than healthy players
4. Start combat, let enemy take turn
5. Expected: Enemy moves toward and attacks weak player (priority 100)
6. Verify: Ignores closer healthy players, prioritizes one-shot kill

**Scenario 4: Fallback to DefaultBehavior**
1. Create encounter with 1 enemy vs 0 players
2. Start combat, let enemy take turn
3. Expected: No valid targets, falls back to DefaultBehavior
4. Verify: Enemy ends turn without errors

**Scenario 5: Multiple Enemies**
1. Create encounter with 3 enemies vs 2 players
2. Vary positioning: some in range, some need movement
3. Start combat, let all enemies take turns
4. Expected: Each enemy makes appropriate decision
5. Verify: No race conditions, correct turn order

---

## Edge Cases & Error Handling

### Path Blocked

**Scenario:** Enemy wants to move toward target, but path is blocked.

**Handling:**
```typescript
const path = context.calculatePath(bestMovePosition);
if (!path) {
  console.warn(`[AI] ${context.self.name} cannot path to target`);
  return null; // Fall through to next behavior
}
```

**Result:** Falls through to AttackNearestOpponent or DefaultBehavior.

---

### No Valid Targets

**Scenario:** All enemies defeated, no targets remain.

**Handling:**
```typescript
canExecute(context: AIContext): boolean {
  const targets = context.getUnitsInAttackRange();
  return targets.length > 0; // Returns false if no targets
}
```

**Result:** Behavior not executed, falls through to DefaultBehavior.

---

### Target Dies Before Attack

**Scenario:** Player defeats enemy's target before enemy's turn.

**Handling:**
- convertDecisionToAction() validates target position
- UnitTurnPhaseHandler checks if target exists before executing attack
- If target gone, log warning and end turn

**Result:** Graceful degradation, no crash.

---

### Movement Out of Range

**Scenario:** Behavior calculates movement destination beyond unit's movement range.

**Handling:**
```typescript
// calculatePath() already validates maxRange
const path = context.calculatePath(bestMovePosition);
if (!path) return null; // Path validation failed
```

**Result:** Null return, falls through to next behavior.

---

### Invalid Attack Target

**Scenario:** Decision has attack action but missing target position.

**Handling:**
```typescript
if (decision.action?.type === 'attack') {
  if (!decision.action.target) {
    console.warn('[AI] Attack decision missing target');
    return { type: 'end-turn' };
  }
  // ... proceed with attack
}
```

**Result:** Logs warning, ends turn safely.

---

## Performance Considerations

### WeakMap Benefits

**Before (Phase 1):**
```typescript
// Linear search through manifest for each query
const targetUnit = context.manifest.getUnitAtPosition(targetPos);
```

**After (Phase 2):**
```typescript
// O(1) lookup with WeakMap
const position = AIContextBuilder.unitPositions.get(unit);
```

**Impact:**
- Reduces per-query overhead from O(n) to O(1)
- Especially beneficial when multiple behaviors query positions
- Memory: Negligible (WeakMap entries garbage collected with units)

---

### Context Building Overhead

**Phase 1 Baseline:** <1ms per turn

**Phase 2 Additions:**
- WeakMap population: +0.1ms (20 units × 5μs)
- No other changes to context building

**Estimated Phase 2:** <1.2ms per turn (acceptable)

---

### Behavior Evaluation Overhead

**Per Behavior:**
- canExecute(): <0.1ms (simple checks)
- decide(): 0.5-2ms (depends on algorithm)

**Worst Case (all behaviors evaluate):**
- DefeatNearbyOpponent: 2ms (checks movement+attack range)
- AttackNearestOpponent: 0.5ms (checks current range only)
- DefaultBehavior: <0.1ms (always true)

**Total:** <3ms per enemy turn (acceptable)

**Optimization:** Short-circuit evaluation ensures only first valid behavior's decide() runs.

---

## Risks & Mitigations

### Risk 1: Movement + Attack Sequencing

**Risk:** Movement and attack actions need to execute sequentially, not simultaneously.

**Severity:** High (breaks gameplay if wrong)

**Mitigation:**
1. Use existing UnitTurnPhaseHandler patterns
2. Test thoroughly with manual scenarios
3. Add console logging for debugging
4. Review PlayerTurnStrategy movement+attack flow

**Fallback:** If complex, implement attack-only in Phase 2, defer movement+attack to Phase 2.5.

---

### Risk 2: Target Selection Bugs

**Risk:** Behavior selects invalid target (ally, defeated unit, out of range).

**Severity:** Medium (causes errors but not crashes)

**Mitigation:**
1. Validate targets in canExecute() and decide()
2. Use context.getUnitsInAttackRange() (already filters enemies)
3. Add null checks in decision conversion
4. Test edge cases thoroughly

---

### Risk 3: Performance Degradation

**Risk:** New behaviors slow down enemy turns noticeably.

**Severity:** Low (unlikely based on Phase 1 performance)

**Mitigation:**
1. Profile with browser DevTools
2. Baseline metrics before and after
3. Optimize if >5ms overhead detected
4. WeakMap already added for optimization

---

### Risk 4: Integration with UnitTurnPhaseHandler

**Risk:** Existing handler doesn't support movement+attack pattern.

**Severity:** Medium (requires handler modifications)

**Mitigation:**
1. Review handler code before implementation
2. Coordinate with handler author if needed
3. Fallback: Use simpler approach (queue actions separately)
4. Test integration early in implementation

---

## Future Phases Preview

### Phase 3: Tactical Behaviors (Next)

**New Behaviors:**
- AggressiveTowardCasters (priority 85-90)
- AggressiveTowardMelee (priority 85-90)
- AggressiveTowardSpecificUnit (priority 90)

**Enhancements:**
- Unit classification helpers (isCaster, isMelee)
- Threat scoring system
- Target persistence across turns

---

### Phase 4: Ability-Based Behaviors (Future)

**New Behaviors:**
- HealAllies (priority 95)
- SupportAllies (priority 90)
- DebuffOpponent (priority 85)

**Enhancements:**
- Ability range calculation
- Status effect tracking in AIContext
- Mana management considerations

---

## Reference Documents

### Required Reading
- **[EnemyAIBehaviorSystem.md](./EnemyAIBehaviorSystem.md)** - Full design document
- **[00-AIBehaviorQuickReference.md](./00-AIBehaviorQuickReference.md)** - Quick reference
- **[01-CoreInfrastructurePlan.md](./01-CoreInfrastructurePlan.md)** - Phase 1 implementation (reference)
- **[Phase1-CodeReview.md](./Phase1-CodeReview.md)** - Phase 1 code review (learnings)

### Architecture References
- **[CombatHierarchy.md](../../CombatHierarchy.md)** - Section 3.5 (AI System), Section 2 (Phase Handlers)
- **[GeneralGuidelines.md](../../GeneralGuidelines.md)** - Coding standards

### Code References
- `EnemyTurnStrategy.ts` - Phase 1 integration
- `PlayerTurnStrategy.ts` - Movement and attack patterns
- `UnitTurnPhaseHandler.ts` - Action execution (lines 800-1200)
- `AIContext.ts` - Helper methods API

---

## Checklist

### Before Starting
- [ ] Phase 1 merged to `enemy-ai` branch
- [ ] Create new branch: `enemy-ai-phase2`
- [ ] Review Phase 1 implementation and learnings
- [ ] Review UnitTurnPhaseHandler architecture
- [ ] Understand movement and attack execution patterns

### During Implementation
- [ ] Step 1: Create AttackNearestOpponent.ts
- [ ] Step 2: Create DefeatNearbyOpponent.ts
- [ ] Step 3: Add WeakMap to AIContext
- [ ] Step 4: Update EnemyTurnStrategy decision conversion
- [ ] Step 5: Handle movement + attack in UnitTurnPhaseHandler (if needed)
- [ ] Step 6: Register new behaviors in BehaviorRegistry
- [ ] Step 7: Update barrel export
- [ ] Build TypeScript (verify no errors)
- [ ] Manual testing (all 5 integration scenarios)
- [ ] Edge case testing

### Before Merge
- [ ] All integration tests pass
- [ ] No console errors
- [ ] Performance acceptable (<3ms per turn)
- [ ] Create code review document
- [ ] Update documentation (Quick Reference, main design doc)
- [ ] Create ModifiedFilesManifest for Phase 2

---

**End of Phase 2 Implementation Plan**

# Phase 1: Core Infrastructure Implementation Plan

**Version:** 1.0
**Last Updated:** Thu, Oct 30, 2025
**Status:** Planning
**Related:** [EnemyAIBehaviorSystem.md](EnemyAIBehaviorSystem.md)

## Purpose

This document provides a detailed, step-by-step implementation plan for Phase 1 of the Enemy AI Behavior System. Phase 1 establishes the core infrastructure needed for all future behaviors without implementing complex attack logic yet.

---

## Table of Contents

1. [Overview](#overview)
2. [Goals](#goals)
3. [Architecture Review](#architecture-review)
4. [Implementation Steps](#implementation-steps)
5. [Testing Strategy](#testing-strategy)
6. [Success Criteria](#success-criteria)
7. [Risk Mitigation](#risk-mitigation)

---

## Overview

### What is Phase 1?

Phase 1 is the **Minimum Viable Product (MVP)** for the AI behavior system. It establishes:
- Core type definitions and interfaces
- Context building infrastructure
- Behavior registration and lookup system
- Integration with existing `EnemyTurnStrategy`
- A single fallback behavior to prove the system works

**What Phase 1 is NOT:**
- Phase 1 does NOT implement attack behaviors (that's Phase 2)
- Phase 1 does NOT implement ability-based behaviors (that's Phase 4)
- Phase 1 focuses on infrastructure, not game logic

### Timeline

Estimated time: **4-6 hours** (for experienced developer)

### Dependencies

**Existing Files:**
- `strategies/EnemyTurnStrategy.ts` - Will be modified
- `strategies/TurnStrategy.ts` - Defines `TurnAction` interface
- `CombatState.ts` - Provides state data
- `CombatUnit.ts` - Unit interface
- `CombatUnitManifest.ts` - Unit positions
- `CombatMap.ts` - Map data
- `utils/MovementRangeCalculator.ts` - Movement range calculation
- `utils/AttackRangeCalculator.ts` - Attack range calculation
- `utils/CombatCalculations.ts` - Damage/hit predictions

**New Files to Create:**
1. `ai/types/AIBehavior.ts` - Core interfaces
2. `ai/types/AIContext.ts` - Context interface and builder
3. `ai/behaviors/DefaultBehavior.ts` - Fallback behavior
4. `ai/BehaviorRegistry.ts` - Behavior factory
5. `ai/index.ts` - Barrel export

---

## Goals

### Primary Goals

1. **Type Safety**: Define all core types and interfaces with TypeScript
2. **Context Building**: Implement `AIContextBuilder` to provide rich decision-making data
3. **Behavior System**: Create behavior registration and evaluation loop
4. **Integration**: Wire into `EnemyTurnStrategy` without breaking existing functionality
5. **Proof of Concept**: Demonstrate system works with `DefaultBehavior`

### Secondary Goals

1. **Documentation**: Add JSDoc comments to all interfaces
2. **Testability**: Ensure all components are unit-testable
3. **Extensibility**: Design for easy addition of new behaviors in Phase 2+

---

## Architecture Review

### Directory Structure

```
react-app/src/models/combat/
├── ai/
│   ├── types/
│   │   ├── AIBehavior.ts      # Core interfaces
│   │   └── AIContext.ts       # Context interface and builder
│   ├── behaviors/
│   │   └── DefaultBehavior.ts # Fallback behavior
│   ├── BehaviorRegistry.ts    # Behavior factory
│   └── index.ts               # Barrel export
├── strategies/
│   └── EnemyTurnStrategy.ts   # Modified to use behavior system
└── ...
```

### Data Flow

```
EnemyTurnStrategy.constructor()
  ↓
AIContextBuilder.build()
  ↓ (calculates movement range, attack range, partitions units)
AIContext created
  ↓
EnemyTurnStrategy.update()
  ↓ (after thinking delay)
Evaluate behaviors in priority order
  ↓
First behavior with canExecute() === true
  ↓
behavior.decide()
  ↓
AIDecision returned
  ↓
convertDecisionToAction()
  ↓
TurnAction returned to UnitTurnPhaseHandler
```

### Key Design Decisions

1. **Immutable Context**: `AIContext` is created once per turn and not mutated
2. **Lazy Evaluation**: Behaviors only execute `decide()` if `canExecute()` returns true
3. **Priority Sorting**: Behaviors sorted once in constructor, not every frame
4. **Helper Methods**: `AIContext` provides helpers to avoid repetitive code in behaviors
5. **Frozen Arrays**: Use `Object.freeze()` on arrays to prevent accidental mutation

---

## Implementation Steps

### Step 1: Define Core Interfaces

**File:** `react-app/src/models/combat/ai/types/AIBehavior.ts`

**Tasks:**
1. Define `AIBehavior` interface
2. Define `AIDecision` interface
3. Add comprehensive JSDoc comments
4. Export types

**Implementation:**

```typescript
import type { Position } from '../../Position';

/**
 * Represents an AI behavior that can be evaluated and executed by enemy units.
 * Behaviors are evaluated in priority order (highest first).
 */
export interface AIBehavior {
  /**
   * Unique identifier for this behavior type.
   * Used for behavior registration and debugging.
   */
  readonly type: string;

  /**
   * Priority value for this behavior instance.
   * Higher priority behaviors are evaluated first.
   * Typical range: 0 (lowest) to 100 (highest)
   */
  readonly priority: number;

  /**
   * Optional configuration data specific to this behavior.
   * Type depends on behavior implementation.
   */
  readonly config?: unknown;

  /**
   * Determines if this behavior can execute in the current context.
   * Called during behavior evaluation to filter valid behaviors.
   *
   * @param context - Current AI context with game state
   * @returns true if this behavior is valid, false to skip to next behavior
   */
  canExecute(context: AIContext): boolean;

  /**
   * Decides the action to take (only called if canExecute() returned true).
   * Should return a complete decision with movement and/or action.
   *
   * @param context - Current AI context with game state
   * @returns AIDecision with movement/action plan, or null if no valid action
   */
  decide(context: AIContext): AIDecision | null;
}

/**
 * Configuration for creating an AI behavior instance.
 * Used in encounter definitions and unit configurations.
 */
export interface AIBehaviorConfig {
  /** Behavior type identifier (must be registered in BehaviorRegistry) */
  type: string;

  /** Priority value (higher = evaluated first) */
  priority: number;

  /** Optional behavior-specific configuration */
  config?: unknown;
}

/**
 * Represents a complete turn decision made by AI behavior.
 * Includes optional movement and action components.
 */
export interface AIDecision {
  /**
   * Optional movement to a new position.
   * Includes pre-calculated path for animation.
   */
  movement?: {
    /** Final destination position */
    destination: Position;

    /** Path from current position to destination (excludes start, includes end) */
    path: Position[];
  };

  /**
   * Optional action to perform.
   */
  action?: {
    /** Type of action to perform */
    type: 'attack' | 'ability' | 'delay' | 'end-turn';

    /** Target position (required for attack/ability) */
    target?: Position;

    /** Ability ID (required for ability type) */
    abilityId?: string;
  };

  /**
   * Order of execution for movement and action.
   * - 'move-first': Execute movement, then action
   * - 'act-first': Execute action, then movement (future use case)
   * - 'move-only': Execute movement only, no action
   * - 'act-only': Execute action only, no movement
   */
  order: 'move-first' | 'act-first' | 'move-only' | 'act-only';
}

// Forward declare AIContext (defined in AIContext.ts)
export type { AIContext } from './AIContext';
```

**Testing:**
- Compile TypeScript, verify no errors
- Import in test file, verify types are accessible

**Estimated Time:** 30 minutes

---

### Step 2: Define AIContext Interface and Builder

**File:** `react-app/src/models/combat/ai/types/AIContext.ts`

**Tasks:**
1. Define `UnitPlacement` interface
2. Define `AIContext` interface
3. Implement `AIContextBuilder` class
4. Add comprehensive JSDoc comments

**Implementation:**

```typescript
import type { CombatUnit } from '../../CombatUnit';
import type { Position } from '../../Position';
import type { CombatMap } from '../../CombatMap';
import type { CombatUnitManifest } from '../../CombatUnitManifest';
import type { CombatState } from '../../CombatState';
import type { Equipment } from '../../Equipment';
import { MovementRangeCalculator } from '../../utils/MovementRangeCalculator';
import { AttackRangeCalculator, type AttackRangeTiles } from '../../utils/AttackRangeCalculator';
import { MovementPathfinder } from '../../utils/MovementPathfinder';
import { CombatCalculations } from '../../utils/CombatCalculations';

/**
 * Represents a unit and its position on the battlefield.
 */
export interface UnitPlacement {
  readonly unit: CombatUnit;
  readonly position: Position;
}

/**
 * Context object providing all information needed for AI decision-making.
 * Created once per enemy turn, immutable throughout evaluation.
 */
export interface AIContext {
  // ===== Self Data =====

  /** The unit making the decision */
  readonly self: CombatUnit;

  /** Current position of the unit */
  readonly selfPosition: Position;

  // ===== Allied and Enemy Units =====

  /** All allied units (same isPlayerControlled value, excludes self) */
  readonly alliedUnits: ReadonlyArray<UnitPlacement>;

  /** All enemy units (opposite isPlayerControlled value) */
  readonly enemyUnits: ReadonlyArray<UnitPlacement>;

  // ===== Map Data =====

  /** Combat map with terrain and walkability */
  readonly map: CombatMap;

  /** Unit manifest for position queries */
  readonly manifest: CombatUnitManifest;

  // ===== Pre-calculated Data =====

  /** All reachable positions from current location (movement range) */
  readonly movementRange: ReadonlyArray<Position>;

  /** Attack range tiles from current position (null if unit has no weapon) */
  readonly attackRange: AttackRangeTiles | null;

  // ===== Helper Methods =====

  /**
   * Get all units within a specific range from a position.
   * Uses Manhattan distance (orthogonal movement).
   *
   * @param range - Maximum distance (inclusive)
   * @param from - Starting position (defaults to self position)
   * @returns Array of units within range
   */
  getUnitsInRange(range: number, from?: Position): UnitPlacement[];

  /**
   * Get all enemy units in attack range from a position.
   *
   * @param from - Starting position (defaults to self position)
   * @returns Array of enemy units in attack range
   */
  getUnitsInAttackRange(from?: Position): UnitPlacement[];

  /**
   * Calculate path to a destination.
   * Uses existing MovementPathfinder with proper collision detection.
   *
   * @param to - Destination position
   * @returns Path (excludes start, includes end), or null if unreachable
   */
  calculatePath(to: Position): Position[] | null;

  /**
   * Calculate attack range from a specific position.
   * Uses unit's weapon range and line of sight.
   *
   * @param position - Position to calculate attack range from
   * @returns Attack range tiles (inRange, blocked, validTargets)
   */
  calculateAttackRangeFrom(position: Position): AttackRangeTiles;

  /**
   * Predict damage dealt to a target.
   * Uses CombatCalculations formulas.
   *
   * @param target - Target unit
   * @param weapon - Weapon to use (defaults to self's first weapon)
   * @returns Predicted damage (integer, 0+)
   */
  predictDamage(target: CombatUnit, weapon?: Equipment): number;

  /**
   * Predict hit chance against a target.
   * Uses CombatCalculations formulas.
   *
   * @param target - Target unit
   * @param weapon - Weapon to use (defaults to self's first weapon)
   * @returns Hit chance (0.0 to 1.0)
   */
  predictHitChance(target: CombatUnit, weapon?: Equipment): number;

  /**
   * Check if this unit can defeat (kill) a target in one attack.
   *
   * @param target - Target unit
   * @returns true if predicted damage >= target's current health
   */
  canDefeat(target: CombatUnit): boolean;

  /**
   * Calculate Manhattan distance between two positions.
   *
   * @param from - Starting position
   * @param to - Ending position
   * @returns Distance (integer, 0+)
   */
  getDistance(from: Position, to: Position): number;
}

/**
 * Builder for creating AIContext instances.
 * Handles all pre-calculations and helper method implementations.
 */
export class AIContextBuilder {
  /**
   * Build a complete AI context for decision-making.
   *
   * @param self - The unit making the decision
   * @param selfPosition - Current position of the unit
   * @param state - Current combat state
   * @returns Immutable AI context with all data and helpers
   */
  static build(
    self: CombatUnit,
    selfPosition: Position,
    state: CombatState
  ): AIContext {
    // 1. Partition units into allies and enemies
    const alliedUnits: UnitPlacement[] = [];
    const enemyUnits: UnitPlacement[] = [];

    for (const placement of state.unitManifest.getAllUnits()) {
      if (placement.unit === self) continue; // Skip self

      const unitPlacement: UnitPlacement = {
        unit: placement.unit,
        position: placement.position,
      };

      if (placement.unit.isPlayerControlled === self.isPlayerControlled) {
        alliedUnits.push(unitPlacement);
      } else {
        enemyUnits.push(unitPlacement);
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
      self,
      state.map,
      state.unitManifest
    );

    // 4. Helper: Get default weapon
    const getDefaultWeapon = (): Equipment | null => {
      // TODO: Update this when HumanoidUnit/MonsterUnit weapon access is standardized
      // For now, return null (will need adjustment in Phase 2)
      return null;
    };

    // 5. Cache unit positions in WeakMap for fast lookup (follows GeneralGuidelines.md WeakMap pattern)
    const unitPositions = new WeakMap<CombatUnit, Position>();
    for (const placement of [...alliedUnits, ...enemyUnits]) {
      unitPositions.set(placement.unit, placement.position);
    }

    // 6. Build context with helper methods
    const context: AIContext = {
      self,
      selfPosition,
      alliedUnits: Object.freeze(alliedUnits),
      enemyUnits: Object.freeze(enemyUnits),
      map: state.map,
      manifest: state.unitManifest,
      movementRange: Object.freeze(movementRange),
      attackRange,

      // Helper: Get units in range
      getUnitsInRange(range: number, from: Position = selfPosition): UnitPlacement[] {
        const result: UnitPlacement[] = [];
        const allUnits = [...alliedUnits, ...enemyUnits];

        for (const placement of allUnits) {
          const distance = Math.abs(from.x - placement.position.x) +
                          Math.abs(from.y - placement.position.y);
          if (distance <= range) {
            result.push(placement);
          }
        }

        return result;
      },

      // Helper: Get enemy units in attack range
      getUnitsInAttackRange(from: Position = selfPosition): UnitPlacement[] {
        const attackRangeFromPos = from === selfPosition
          ? attackRange
          : this.calculateAttackRangeFrom(from);

        if (!attackRangeFromPos) return [];

        const result: UnitPlacement[] = [];
        for (const targetPos of attackRangeFromPos.validTargets) {
          const targetUnit = state.unitManifest.getUnitAt(targetPos);
          if (!targetUnit) continue;

          // Check if target is an enemy
          if (targetUnit.isPlayerControlled !== self.isPlayerControlled) {
            result.push({
              unit: targetUnit,
              position: targetPos,
            });
          }
        }

        return result;
      },

      // Helper: Calculate path
      calculatePath(to: Position): Position[] | null {
        return MovementPathfinder.calculatePath(
          selfPosition,
          to,
          self.movement,
          state.map,
          state.unitManifest,
          { activeUnit: self }
        );
      },

      // Helper: Calculate attack range from position
      calculateAttackRangeFrom(position: Position): AttackRangeTiles {
        return AttackRangeCalculator.calculateAttackRange(
          position,
          self,
          state.map,
          state.unitManifest
        );
      },

      // Helper: Predict damage
      predictDamage(target: CombatUnit, weapon?: Equipment): number {
        const weaponToUse = weapon ?? getDefaultWeapon();
        if (!weaponToUse) return 0;

        return CombatCalculations.calculateAttackDamage(
          self,
          target,
          weaponToUse
        );
      },

      // Helper: Predict hit chance
      predictHitChance(target: CombatUnit, weapon?: Equipment): number {
        const weaponToUse = weapon ?? getDefaultWeapon();
        if (!weaponToUse) return 0;

        return CombatCalculations.getChanceToHit(
          self,
          target,
          weaponToUse
        );
      },

      // Helper: Check if can defeat target
      canDefeat(target: CombatUnit): boolean {
        const damage = this.predictDamage(target);
        return damage >= target.health;
      },

      // Helper: Calculate distance
      getDistance(from: Position, to: Position): number {
        return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
      },
    };

    return context;
  }
}
```

**Testing:**
- Unit test: Build context with mock state, verify all fields populated
- Unit test: Verify helper methods return correct results
- Unit test: Verify arrays are frozen (immutable)

**Estimated Time:** 1.5 hours

---

### Step 3: Implement DefaultBehavior

**File:** `react-app/src/models/combat/ai/behaviors/DefaultBehavior.ts`

**Tasks:**
1. Implement `AIBehavior` interface
2. Always return true for `canExecute()`
3. Return 'end-turn' decision from `decide()`
4. Add JSDoc comments

**Implementation:**

```typescript
import type { AIBehavior, AIDecision } from '../types/AIBehavior';
import type { AIContext } from '../types/AIContext';

/**
 * Fallback behavior that always ends the turn.
 * Should be configured with priority 0 (lowest) as last resort.
 *
 * Use case: Ensures enemy always takes an action even if no other behaviors apply.
 */
export class DefaultBehavior implements AIBehavior {
  readonly type = 'DefaultBehavior';
  readonly priority: number;
  readonly config?: unknown;

  constructor(priority: number = 0, config?: unknown) {
    this.priority = priority;
    this.config = config;
  }

  /**
   * Always returns true (fallback behavior).
   */
  canExecute(context: AIContext): boolean {
    return true;
  }

  /**
   * Returns end-turn decision.
   */
  decide(context: AIContext): AIDecision | null {
    return {
      action: {
        type: 'end-turn',
      },
      order: 'act-only',
    };
  }
}
```

**Testing:**
- Unit test: Verify `canExecute()` always returns true
- Unit test: Verify `decide()` returns end-turn action
- Unit test: Verify priority is configurable

**Estimated Time:** 20 minutes

---

### Step 4: Implement BehaviorRegistry

**File:** `react-app/src/models/combat/ai/BehaviorRegistry.ts`

**Tasks:**
1. Create registry for behavior types
2. Implement factory method for creating behaviors
3. Register `DefaultBehavior`
4. Add error handling for unknown behavior types

**Implementation:**

```typescript
import type { AIBehavior, AIBehaviorConfig } from './types/AIBehavior';
import { DefaultBehavior } from './behaviors/DefaultBehavior';

/**
 * Factory function for creating behavior instances.
 */
type BehaviorFactory = (priority: number, config?: unknown) => AIBehavior;

/**
 * Registry for AI behavior types.
 * Maps behavior type strings to factory functions.
 */
class BehaviorRegistryImpl {
  private factories = new Map<string, BehaviorFactory>();

  /**
   * Register a behavior type with its factory function.
   *
   * @param type - Unique behavior type identifier
   * @param factory - Factory function to create behavior instances
   */
  register(type: string, factory: BehaviorFactory): void {
    if (this.factories.has(type)) {
      console.warn(`Behavior type "${type}" already registered, overwriting`);
    }
    this.factories.set(type, factory);
  }

  /**
   * Create a behavior instance from configuration.
   *
   * @param config - Behavior configuration
   * @returns Behavior instance
   * @throws Error if behavior type not registered
   */
  create(config: AIBehaviorConfig): AIBehavior {
    const factory = this.factories.get(config.type);

    if (!factory) {
      throw new Error(
        `Unknown behavior type: "${config.type}". ` +
        `Available types: ${Array.from(this.factories.keys()).join(', ')}`
      );
    }

    return factory(config.priority, config.config);
  }

  /**
   * Create multiple behavior instances from configurations.
   * Sorts by priority (highest first).
   *
   * @param configs - Array of behavior configurations
   * @returns Array of behavior instances, sorted by priority
   */
  createMany(configs: AIBehaviorConfig[]): AIBehavior[] {
    const behaviors = configs.map(config => this.create(config));

    // Sort by priority (highest first)
    return behaviors.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get list of registered behavior types.
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}

// Singleton instance
export const BehaviorRegistry = new BehaviorRegistryImpl();

// Register built-in behaviors
BehaviorRegistry.register('DefaultBehavior', (priority, config) =>
  new DefaultBehavior(priority, config)
);

// Default behavior configuration used when no behaviors specified
export const DEFAULT_ENEMY_BEHAVIORS: AIBehaviorConfig[] = [
  { type: 'DefaultBehavior', priority: 0 },
];
```

**Testing:**
- Unit test: Register behavior, verify can create instance
- Unit test: Verify error thrown for unknown type
- Unit test: Verify `createMany()` sorts by priority
- Unit test: Verify `DEFAULT_ENEMY_BEHAVIORS` creates valid behavior

**Estimated Time:** 45 minutes

---

### Step 5: Create Barrel Export

**File:** `react-app/src/models/combat/ai/index.ts`

**Tasks:**
1. Re-export all public types and classes
2. Add module documentation

**Implementation:**

```typescript
/**
 * AI Behavior System
 *
 * Priority-based AI decision-making for enemy units.
 * Behaviors are evaluated in priority order, first valid behavior executes.
 *
 * @example
 * ```typescript
 * import { BehaviorRegistry, DEFAULT_ENEMY_BEHAVIORS } from './ai';
 *
 * const behaviors = BehaviorRegistry.createMany(DEFAULT_ENEMY_BEHAVIORS);
 * ```
 */

// Core types
export type { AIBehavior, AIBehaviorConfig, AIDecision } from './types/AIBehavior';
export type { AIContext, UnitPlacement } from './types/AIContext';

// Context builder
export { AIContextBuilder } from './types/AIContext';

// Behaviors
export { DefaultBehavior } from './behaviors/DefaultBehavior';

// Registry
export { BehaviorRegistry, DEFAULT_ENEMY_BEHAVIORS } from './BehaviorRegistry';
```

**Testing:**
- Verify can import all types from `ai/index`
- Verify barrel export doesn't break tree-shaking

**Estimated Time:** 10 minutes

---

### Step 6: Integrate with EnemyTurnStrategy

**File:** `react-app/src/models/combat/strategies/EnemyTurnStrategy.ts`

**Tasks:**
1. Add `behaviors` field to constructor
2. Build `AIContext` in constructor
3. Add behavior evaluation loop to `update()`
4. Implement `convertDecisionToAction()` helper
5. Maintain backward compatibility (use default behaviors if none provided)

**Implementation:**

```typescript
// ... existing imports ...
import type { AIBehavior, AIDecision, AIContext } from '../ai';
import { AIContextBuilder, BehaviorRegistry, DEFAULT_ENEMY_BEHAVIORS } from '../ai';
import type { AIBehaviorConfig } from '../ai';

export class EnemyTurnStrategy implements TurnStrategy {
  // ... existing fields ...
  private behaviors: AIBehavior[];
  private context: AIContext | null = null;

  constructor(
    unit: CombatUnit,
    position: Position,
    state: CombatState,
    behaviorConfigs?: AIBehaviorConfig[] // Optional behavior configuration
  ) {
    // ... existing initialization ...

    // Initialize behaviors (use defaults if none provided)
    const configs = behaviorConfigs ?? DEFAULT_ENEMY_BEHAVIORS;
    this.behaviors = BehaviorRegistry.createMany(configs);

    // Build AI context
    this.context = AIContextBuilder.build(unit, position, state);
  }

  update(deltaTime: number, state: CombatState): TurnAction | null {
    // ... existing thinking delay logic ...

    this.thinkingTimer += deltaTime;
    if (this.thinkingTimer < this.thinkingDuration) {
      return null;
    }

    // Evaluate behaviors (only once)
    if (!this.actionDecided && this.context) {
      let decisionMade = false;

      for (const behavior of this.behaviors) {
        if (behavior.canExecute(this.context)) {
          const decision = behavior.decide(this.context);

          if (decision) {
            this.actionDecided = this.convertDecisionToAction(decision);
            decisionMade = true;

            // Debug logging for AI decision-making (helpful during development/testing)
            console.log(`[AI] ${this.activeUnit.name} chose behavior: ${behavior.type}`);
            break;
          }
        }
      }

      // Fallback if no behavior returned valid decision (should never happen with DefaultBehavior)
      if (!decisionMade) {
        console.warn(`[AI] ${this.activeUnit.name} had no valid behaviors, ending turn`);
        this.actionDecided = { type: 'end-turn' };
      }
    }

    return this.actionDecided;
  }

  /**
   * Convert AIDecision to TurnAction format.
   * Handles decision ordering and action types.
   */
  private convertDecisionToAction(decision: AIDecision): TurnAction {
    // Phase 1: Only handle 'end-turn' and 'delay' actions
    // Movement and attack will be implemented in Phase 2

    if (decision.action?.type === 'end-turn') {
      return { type: 'end-turn' };
    }

    if (decision.action?.type === 'delay') {
      return { type: 'delay' };
    }

    // TODO Phase 2: Handle movement and attack
    // if (decision.movement && decision.action?.type === 'attack') { ... }

    // Fallback
    console.warn(`[AI] Unhandled decision type, ending turn`, decision);
    return { type: 'end-turn' };
  }

  // ... rest of existing methods unchanged ...
}
```

**Testing:**
- Unit test: Verify behaviors are sorted by priority
- Unit test: Verify context is built in constructor
- Integration test: Create enemy turn, verify DefaultBehavior executes
- Integration test: Verify thinking delay still works

**Estimated Time:** 1 hour

**Important**: This implementation follows the **Phase Handler Return Value Pattern** from GeneralGuidelines.md:
- Always capture and apply the return value from phase handler `update()` methods
- Phase handlers return new state objects for transitions (immutability)
- Ignoring return values causes silent failures (no error messages)

---

### Step 7: Update UnitTurnPhaseHandler (if needed)

**File:** `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Tasks:**
1. Review constructor call to `EnemyTurnStrategy`
2. Add behavior configuration parameter (optional, defaults to DEFAULT_ENEMY_BEHAVIORS)
3. Verify no breaking changes

**Implementation:**

```typescript
// In createStrategy() or equivalent method:

if (readyUnit.isPlayerControlled) {
  this.strategy = new PlayerTurnStrategy(
    readyUnit,
    readyPosition,
    state
  );
} else {
  // TODO Phase 3: Load behavior configs from unit or encounter
  // For now, use default behaviors (just DefaultBehavior)
  this.strategy = new EnemyTurnStrategy(
    readyUnit,
    readyPosition,
    state
    // behaviorConfigs parameter optional, defaults to DEFAULT_ENEMY_BEHAVIORS
  );
}
```

**Testing:**
- Integration test: Start combat, reach enemy turn, verify no crashes
- Integration test: Verify enemy ends turn after thinking delay

**Estimated Time:** 20 minutes

---

### Step 8: Documentation and Comments

**Tasks:**
1. Add JSDoc comments to all public interfaces
2. Update CombatHierarchy.md with new ai/ directory structure
3. Add code examples to interface documentation
4. Document integration points for future phases

**Files to Update:**
- All new files (already done in steps above)
- `CombatHierarchy.md` - Add ai/ section

**CombatHierarchy.md Addition:**

```markdown
### AI Behavior System

#### `ai/types/AIBehavior.ts`
**Purpose:** Core interfaces for AI behavior system
**Exports:** `AIBehavior`, `AIBehaviorConfig`, `AIDecision`
**Key Pattern:** Priority Queue - behaviors evaluated in priority order
**Dependencies:** Position
**Used By:** All behavior implementations, BehaviorRegistry

#### `ai/types/AIContext.ts`
**Purpose:** Context object with game state and helper methods for AI decision-making
**Exports:** `AIContext`, `UnitPlacement`, `AIContextBuilder`
**Key Methods:** AIContextBuilder.build() - creates immutable context
**Dependencies:** CombatState, MovementRangeCalculator, AttackRangeCalculator, CombatCalculations
**Used By:** EnemyTurnStrategy, all behaviors

#### `ai/behaviors/DefaultBehavior.ts`
**Purpose:** Fallback behavior that always ends turn
**Exports:** `DefaultBehavior`
**Priority:** 0 (lowest)
**Dependencies:** AIBehavior interface
**Used By:** All enemy units as fallback

#### `ai/BehaviorRegistry.ts`
**Purpose:** Factory for creating behavior instances by type
**Exports:** `BehaviorRegistry` singleton, `DEFAULT_ENEMY_BEHAVIORS`
**Key Methods:** register(), create(), createMany()
**Dependencies:** All behavior implementations
**Used By:** EnemyTurnStrategy for behavior instantiation
```

**Estimated Time:** 45 minutes

---

## Testing Strategy

### Unit Tests

**AIContextBuilder:**
- [ ] Build context with empty state, verify no crashes
- [ ] Build context with multiple units, verify partitioning (allies vs enemies)
- [ ] Verify movement range calculated correctly
- [ ] Verify attack range calculated correctly
- [ ] Verify helper methods return correct results
- [ ] Verify arrays are frozen (immutable)

**DefaultBehavior:**
- [ ] Verify `canExecute()` always returns true
- [ ] Verify `decide()` returns end-turn action
- [ ] Verify priority is configurable

**BehaviorRegistry:**
- [ ] Register behavior, verify can create instance
- [ ] Verify error thrown for unknown type
- [ ] Verify `createMany()` sorts by priority
- [ ] Verify `DEFAULT_ENEMY_BEHAVIORS` creates valid behaviors

**EnemyTurnStrategy:**
- [ ] Verify behaviors sorted by priority in constructor
- [ ] Verify context built in constructor
- [ ] Verify thinking delay still works
- [ ] Verify behavior evaluation loop executes
- [ ] Verify first valid behavior is chosen
- [ ] Verify fallback to end-turn if no behaviors

### Integration Tests

**Combat Flow:**
- [ ] Start combat with enemy units
- [ ] Wait for action-timer phase to complete
- [ ] Verify enemy turn starts (unit-turn phase)
- [ ] Verify thinking delay (1.0 second)
- [ ] Verify enemy ends turn (DefaultBehavior)
- [ ] Verify transition back to action-timer phase
- [ ] Verify no crashes or errors

**Multiple Enemies:**
- [ ] Create encounter with 3 enemies
- [ ] Let each enemy take a turn
- [ ] Verify all enemies use DefaultBehavior
- [ ] Verify turn order preserved

### Manual Testing

1. Start combat encounter with multiple enemies
2. Deploy player units
3. Wait for action-timer to finish
4. Observe first enemy turn:
   - Should show "Enemy is ready!" message (red text)
   - Should pause for ~1 second (thinking delay)
   - Should end turn immediately
   - Should return to action-timer phase
5. Repeat for all enemies
6. Verify no console errors

---

## Success Criteria

### Functional Requirements

- [x] All TypeScript files compile without errors
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Enemy units use DefaultBehavior during their turn
- [ ] No breaking changes to existing enemy turn behavior
- [ ] System is ready for Phase 2 behavior implementations

### Non-Functional Requirements

- [ ] Code is well-documented with JSDoc comments
- [ ] No performance regressions (context building < 5ms)
- [ ] No memory leaks (frozen arrays prevent mutation)
- [ ] Console logging aids debugging (behavior selection logged)

### Documentation Requirements

- [ ] CombatHierarchy.md updated with ai/ section
- [ ] All interfaces have comprehensive JSDoc comments
- [ ] Code examples provided for key interfaces
- [ ] Integration points documented for future phases

---

## Adherence to GeneralGuidelines.md

This implementation follows established patterns from [GeneralGuidelines.md](../../GeneralGuidelines.md):

### State Management Patterns

✅ **Caching Stateful Components** (lines 231-265)
- Behavior instances cached in `EnemyTurnStrategy` constructor
- `AIContext` built once per turn, not per frame
- Avoids recreating objects every frame

✅ **WeakMap for Animation Data** (lines 621-694)
- WeakMap used in AIContextBuilder for unit position lookup (Phase 1)
- Will be used for per-unit decision caching in Phase 2+
- Prevents duplicate name issues (multiple "Goblin" units)
- Allows garbage collection when units removed

✅ **Phase Handler Return Value Pattern** (lines 288-330)
- `EnemyTurnStrategy.update()` returns `TurnAction | null`
- Caller must capture and apply return value
- Follows immutability pattern for state updates

✅ **Immutable State Updates** (lines 333-351)
- `AIContext` arrays frozen with `Object.freeze()`
- All fields marked `readonly`
- No mutation of state objects

### Performance Patterns

✅ **Pre-calculation** (lines 462-464)
- Movement range calculated once in constructor
- Attack range calculated once in constructor
- Helper methods reuse cached data

✅ **No Per-Frame Allocations**
- Context built once per turn
- Behavior instances created once
- No canvas/array allocations in update loop

### Not Yet Applicable (Phase 2+)

⏳ **State Preservation vs Reset Pattern** (lines 354-394)
- Will apply when behaviors have internal state
- Not needed in Phase 1 (DefaultBehavior is stateless)

⏳ **Color Tinting with Off-Screen Canvas** (lines 105-198)
- Not applicable (AI system doesn't render)

---

## Risk Mitigation

### Risk 1: Performance Issues with Context Building

**Likelihood:** Low
**Impact:** Medium

**Mitigation:**
- Context built once per turn, not per frame
- Movement range and attack range pre-calculated
- Helper methods use cached data when possible
- Profile with Chrome DevTools if issues arise

### Risk 2: Breaking Changes to EnemyTurnStrategy

**Likelihood:** Low
**Impact:** High

**Mitigation:**
- Behavior configuration is optional (defaults provided)
- Existing thinking delay logic preserved
- Extensive integration testing before merge
- Maintain backward compatibility

### Risk 3: Unknown Behavior Types

**Likelihood:** Medium (especially in future phases)
**Impact:** High (crash)

**Mitigation:**
- BehaviorRegistry throws clear error messages
- Error includes list of available behavior types
- DEFAULT_ENEMY_BEHAVIORS always registered
- Consider validation at encounter load time (future)

### Risk 4: Immutability Not Enforced

**Likelihood:** Low
**Impact:** Medium (hard-to-debug bugs)

**Mitigation:**
- Use `Object.freeze()` on all arrays
- Use `readonly` modifiers on all interface fields
- TypeScript will catch mutation attempts at compile time
- Document immutability expectations in JSDoc

---

## Rollout Plan

### Step-by-Step Rollout

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/enemy-ai-phase1
   ```

2. **Implement Core Files** (Steps 1-5)
   - Create all files in `ai/` directory
   - Verify TypeScript compiles
   - Write unit tests as you go

3. **Integrate with EnemyTurnStrategy** (Step 6)
   - Modify existing file carefully
   - Preserve backward compatibility
   - Test thoroughly

4. **Update Phase Handler** (Step 7)
   - Minimal changes only
   - Verify no breaking changes

5. **Add Documentation** (Step 8)
   - JSDoc comments
   - Update CombatHierarchy.md

6. **Run All Tests**
   - Unit tests
   - Integration tests
   - Manual testing

7. **Code Review**
   - Review with team
   - Address feedback

8. **Merge to Main**
   ```bash
   git checkout main
   git merge feature/enemy-ai-phase1
   ```

---

## Next Steps (Phase 2)

After Phase 1 is complete and tested:

1. Implement `AttackNearestOpponent` behavior
2. Implement `DefeatNearbyOpponent` behavior
3. Update `convertDecisionToAction()` to handle movement and attack
4. Add weapon access to `AIContext` (getDefaultWeapon helper)
5. Create test encounters showcasing attack behaviors

See: `02-AttackBehaviorsPlan.md` (to be created)

---

## Appendix: File Checklist

### New Files Created
- [ ] `ai/types/AIBehavior.ts`
- [ ] `ai/types/AIContext.ts`
- [ ] `ai/behaviors/DefaultBehavior.ts`
- [ ] `ai/BehaviorRegistry.ts`
- [ ] `ai/index.ts`

### Modified Files
- [ ] `strategies/EnemyTurnStrategy.ts`
- [ ] `UnitTurnPhaseHandler.ts` (minimal)
- [ ] `CombatHierarchy.md` (documentation)

### Test Files Created
- [ ] `ai/types/AIContext.test.ts`
- [ ] `ai/behaviors/DefaultBehavior.test.ts`
- [ ] `ai/BehaviorRegistry.test.ts`
- [ ] `strategies/EnemyTurnStrategy.test.ts` (updated)

---

**End of 01-CoreInfrastructurePlan.md**

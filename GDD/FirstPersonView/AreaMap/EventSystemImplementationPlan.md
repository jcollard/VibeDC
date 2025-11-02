# Area Map Event System - Implementation Plan

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [EventSystemOverview.md](./EventSystemOverview.md), [AreaMapSystemOverview.md](./AreaMapSystemOverview.md), [GeneralGuidelines.md](../../../GeneralGuidelines.md)

## Purpose

This document provides a detailed, step-by-step implementation plan for building the Event System for AreaMaps. It breaks down each phase into specific tasks with code examples, testing checkpoints, and validation steps.

## Prerequisites

Before starting implementation:
- ✅ Read [EventSystemOverview.md](./EventSystemOverview.md) completely
- ✅ Read [GeneralGuidelines.md](../../../GeneralGuidelines.md) sections:
  - "State Management" - Immutable updates, const object pattern
  - "TypeScript Patterns" - Const objects instead of enums
  - "Performance Patterns" - Caching, object pooling
- ✅ Understand AreaMap system (already implemented)
- ✅ Understand FirstPersonView movement system

## Guidelines Compliance Notes

This implementation follows key patterns from [GeneralGuidelines.md](../../../GeneralGuidelines.md):

### ✅ Const Object Pattern (Not Enums)
All type definitions use `const` objects with `as const` instead of TypeScript enums:
```typescript
export const EventTrigger = { OnEnter: "on-enter", OnStep: "on-step", OnExit: "on-exit" } as const;
export type EventTrigger = typeof EventTrigger[keyof typeof EventTrigger];
```

### ✅ Immutable State Updates
All actions return NEW game state instead of mutating:
```typescript
execute(state: GameState): GameState {
  return {
    ...state,
    globalVariables: new Map(state.globalVariables).set(name, value),
  };
}
```

### ✅ Type Guards
Boolean type guards for runtime validation:
```typescript
export function isEventTrigger(value: string): value is EventTrigger
```

### ✅ Discriminated Unions
Preconditions and actions use discriminated unions for JSON serialization:
```typescript
interface EventPreconditionJSON {
  type: string;  // Discriminator
  [key: string]: unknown;
}
```

## Implementation Order

The system should be built in this order to minimize dependencies and enable incremental testing:

```
Phase 1: Core Type Definitions (no dependencies)
    ↓
Phase 2: Event Trigger System (depends on Phase 1)
    ↓
Phase 3: Precondition System (depends on Phase 1)
    ↓
Phase 4: Action System (depends on Phase 1)
    ↓
Phase 5: EventArea and AreaEvent (depends on Phases 2, 3, 4)
    ↓
Phase 6: EventProcessor (depends on all previous phases)
    ↓
Phase 7: AreaMap Integration (depends on Phase 5)
    ↓
Phase 8: YAML Parsing (depends on Phases 5, 7)
    ↓
Phase 9: FirstPersonView Integration (depends on Phase 6)
    ↓
Phase 10: Testing and Examples (depends on all phases)
```

---

## Phase 1: Core Type Definitions

**Goal:** Create all TypeScript interfaces and types with no implementation logic.

**Duration:** 2 hours

**Dependencies:** None

### Step 1.1: Create EventTrigger Type

**File:** `react-app/src/models/area/EventTrigger.ts`

```typescript
/**
 * Event trigger types determine when events fire based on player movement.
 *
 * Guidelines Compliance:
 * - Uses const object pattern instead of enum (GeneralGuidelines.md)
 * - Provides type guard for runtime validation
 */

export const EventTrigger = {
  /**
   * OnEnter: Fires when player enters area (was NOT in area previous frame)
   */
  OnEnter: "on-enter",

  /**
   * OnStep: Fires every frame player is in area (was in area previous frame)
   */
  OnStep: "on-step",

  /**
   * OnExit: Fires when player exits area (was in area previous frame)
   */
  OnExit: "on-exit",
} as const;

export type EventTrigger = typeof EventTrigger[keyof typeof EventTrigger];

/**
 * Type guard to check if a string is a valid EventTrigger
 */
export function isEventTrigger(value: string): value is EventTrigger {
  return Object.values(EventTrigger).includes(value as EventTrigger);
}
```

**Testing Checkpoint:**
```typescript
// Quick REPL test
import { EventTrigger, isEventTrigger } from './EventTrigger';

console.assert(EventTrigger.OnEnter === 'on-enter');
console.assert(EventTrigger.OnStep === 'on-step');
console.assert(EventTrigger.OnExit === 'on-exit');
console.assert(isEventTrigger('on-enter') === true);
console.assert(isEventTrigger('invalid') === false);
```

### Step 1.2: Create EventPrecondition Interface

**File:** `react-app/src/models/area/EventPrecondition.ts`

```typescript
/**
 * Base interface for event preconditions.
 * Preconditions determine if an event should fire based on game state.
 *
 * All preconditions in an event must return true for the event to fire.
 */
export interface EventPrecondition {
  /**
   * Type discriminator for JSON serialization
   */
  type: string;

  /**
   * Evaluates if this precondition is met
   * @param state Current game state
   * @returns true if precondition is met, false otherwise
   */
  evaluate(state: GameState): boolean;

  /**
   * Serializes the precondition to JSON
   */
  toJSON(): EventPreconditionJSON;
}

/**
 * JSON representation of an event precondition
 */
export interface EventPreconditionJSON {
  type: string;
  [key: string]: unknown;
}

/**
 * Placeholder for GameState - will be defined later or imported from game state system
 */
export interface GameState {
  globalVariables: Map<string, string | number | boolean>;
  // ... other game state fields
}
```

### Step 1.3: Create EventAction Interface

**File:** `react-app/src/models/area/EventAction.ts`

```typescript
/**
 * Base interface for event actions.
 * Actions are executed when an event fires (after preconditions pass).
 *
 * Guidelines Compliance:
 * - Actions return NEW game state (immutable pattern)
 * - Never mutate input state
 */
export interface EventAction {
  /**
   * Type discriminator for JSON serialization
   */
  type: string;

  /**
   * Executes this action, returning modified game state.
   *
   * IMPORTANT: Always return a NEW state object (immutability)
   * @param state Current game state
   * @returns Modified game state
   */
  execute(state: GameState): GameState;

  /**
   * Serializes the action to JSON
   */
  toJSON(): EventActionJSON;
}

/**
 * JSON representation of an event action
 */
export interface EventActionJSON {
  type: string;
  [key: string]: unknown;
}

/**
 * Import GameState interface
 */
import type { GameState } from './EventPrecondition';
```

### Step 1.4: Create EventArea and AreaEvent Interfaces

**File:** `react-app/src/models/area/EventArea.ts`

```typescript
import type { EventTrigger } from './EventTrigger';
import type { EventPrecondition } from './EventPrecondition';
import type { EventAction } from './EventAction';

/**
 * Represents a single event that can be triggered in an event area
 */
export interface AreaEvent {
  /**
   * Unique identifier for this event (within parent EventArea)
   */
  id: string;

  /**
   * When this event should trigger
   */
  trigger: EventTrigger;

  /**
   * Conditions that must ALL be true for event to fire
   */
  preconditions: EventPrecondition[];

  /**
   * Actions to execute when event fires (in order)
   */
  actions: EventAction[];

  /**
   * If true, event only triggers once per game (not once per entry)
   */
  oneTime?: boolean;

  /**
   * Tracks if one-time event has been triggered
   */
  triggered?: boolean;

  /**
   * Optional human-readable description
   */
  description?: string;
}

/**
 * Represents a rectangular area on the map that can trigger events
 */
export interface EventArea {
  /**
   * Unique identifier for this event area
   */
  id: string;

  /**
   * Top-left X coordinate (grid position)
   */
  x: number;

  /**
   * Top-left Y coordinate (grid position)
   */
  y: number;

  /**
   * Width in tiles
   */
  width: number;

  /**
   * Height in tiles
   */
  height: number;

  /**
   * Events that can trigger in this area
   */
  events: AreaEvent[];

  /**
   * Optional human-readable description
   */
  description?: string;
}

/**
 * JSON representation of an EventArea
 */
export interface EventAreaJSON {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  events: AreaEventJSON[];
  description?: string;
}

/**
 * JSON representation of an AreaEvent
 */
export interface AreaEventJSON {
  id: string;
  trigger: EventTrigger;
  preconditions: EventPreconditionJSON[];
  actions: EventActionJSON[];
  oneTime?: boolean;
  triggered?: boolean;
  description?: string;
}

import type { EventPreconditionJSON } from './EventPrecondition';
import type { EventActionJSON } from './EventAction';
```

### Step 1.5: Create Index Export File

**File:** `react-app/src/models/area/index.ts`

Update to include new exports:

```typescript
// ... existing exports

// Event system exports
export * from './EventTrigger';
export * from './EventPrecondition';
export * from './EventAction';
export * from './EventArea';
```

### Phase 1 Validation

✅ All type files compile without errors
✅ No circular dependencies
✅ Can import types from index file
✅ Type guards work correctly

**Test Command:**
```bash
npm run build
```

---

## Phase 2: Event Trigger System

**Goal:** Implement trigger detection logic (already mostly in type definitions).

**Duration:** 30 minutes

**Dependencies:** Phase 1

### Step 2.1: Add Helper Methods to EventArea

This phase is mostly complete from Phase 1. Just add helper methods if needed:

**File:** `react-app/src/models/area/EventArea.ts` (update)

```typescript
/**
 * Helper function to check if a position is within the event area bounds
 */
export function isPositionInEventArea(area: EventArea, x: number, y: number): boolean {
  return x >= area.x &&
         x < area.x + area.width &&
         y >= area.y &&
         y < area.y + area.height;
}
```

### Phase 2 Validation

✅ Helper function compiles
✅ Bounds checking logic is correct
✅ Edge cases handled (position exactly on boundary)

---

## Phase 3: Precondition System

**Goal:** Implement all three precondition types.

**Duration:** 2 hours

**Dependencies:** Phase 1

### Step 3.1: Implement GlobalVariableIs

**File:** `react-app/src/models/area/preconditions/GlobalVariableIs.ts`

```typescript
import type { EventPrecondition, EventPreconditionJSON, GameState } from '../EventPrecondition';

/**
 * Checks if a global variable equals a specific value.
 *
 * Guidelines Compliance:
 * - Pure function (no side effects)
 * - Returns boolean result
 */
export class GlobalVariableIs implements EventPrecondition {
  readonly type = "GlobalVariableIs";

  constructor(
    public readonly variableName: string,
    public readonly expectedValue: string | number | boolean
  ) {}

  evaluate(state: GameState): boolean {
    const actualValue = state.globalVariables.get(this.variableName);
    return actualValue === this.expectedValue;
  }

  toJSON(): EventPreconditionJSON {
    return {
      type: this.type,
      variableName: this.variableName,
      expectedValue: this.expectedValue,
    };
  }

  static fromJSON(json: EventPreconditionJSON): GlobalVariableIs {
    if (json.type !== "GlobalVariableIs") {
      throw new Error(`Invalid type for GlobalVariableIs: ${json.type}`);
    }
    return new GlobalVariableIs(
      json.variableName as string,
      json.expectedValue as string | number | boolean
    );
  }
}
```

### Step 3.2: Implement GlobalVariableIsGreaterThan

**File:** `react-app/src/models/area/preconditions/GlobalVariableIsGreaterThan.ts`

```typescript
import type { EventPrecondition, EventPreconditionJSON, GameState } from '../EventPrecondition';

/**
 * Checks if a global variable (number) is greater than a threshold.
 */
export class GlobalVariableIsGreaterThan implements EventPrecondition {
  readonly type = "GlobalVariableIsGreaterThan";

  constructor(
    public readonly variableName: string,
    public readonly threshold: number
  ) {}

  evaluate(state: GameState): boolean {
    const value = state.globalVariables.get(this.variableName);
    if (typeof value !== 'number') {
      return false;
    }
    return value > this.threshold;
  }

  toJSON(): EventPreconditionJSON {
    return {
      type: this.type,
      variableName: this.variableName,
      threshold: this.threshold,
    };
  }

  static fromJSON(json: EventPreconditionJSON): GlobalVariableIsGreaterThan {
    if (json.type !== "GlobalVariableIsGreaterThan") {
      throw new Error(`Invalid type for GlobalVariableIsGreaterThan: ${json.type}`);
    }
    return new GlobalVariableIsGreaterThan(
      json.variableName as string,
      json.threshold as number
    );
  }
}
```

### Step 3.3: Implement GlobalVariableIsLessThan

**File:** `react-app/src/models/area/preconditions/GlobalVariableIsLessThan.ts`

```typescript
import type { EventPrecondition, EventPreconditionJSON, GameState } from '../EventPrecondition';

/**
 * Checks if a global variable (number) is less than a threshold.
 */
export class GlobalVariableIsLessThan implements EventPrecondition {
  readonly type = "GlobalVariableIsLessThan";

  constructor(
    public readonly variableName: string,
    public readonly threshold: number
  ) {}

  evaluate(state: GameState): boolean {
    const value = state.globalVariables.get(this.variableName);
    if (typeof value !== 'number') {
      return false;
    }
    return value < this.threshold;
  }

  toJSON(): EventPreconditionJSON {
    return {
      type: this.type,
      variableName: this.variableName,
      threshold: this.threshold,
    };
  }

  static fromJSON(json: EventPreconditionJSON): GlobalVariableIsLessThan {
    if (json.type !== "GlobalVariableIsLessThan") {
      throw new Error(`Invalid type for GlobalVariableIsLessThan: ${json.type}`);
    }
    return new GlobalVariableIsLessThan(
      json.variableName as string,
      json.threshold as number
    );
  }
}
```

### Step 3.4: Create Precondition Factory

**File:** `react-app/src/models/area/preconditions/PreconditionFactory.ts`

```typescript
import type { EventPrecondition, EventPreconditionJSON } from '../EventPrecondition';
import { GlobalVariableIs } from './GlobalVariableIs';
import { GlobalVariableIsGreaterThan } from './GlobalVariableIsGreaterThan';
import { GlobalVariableIsLessThan } from './GlobalVariableIsLessThan';

/**
 * Factory for creating precondition instances from JSON.
 * Centralizes deserialization logic.
 */
export class PreconditionFactory {
  static fromJSON(json: EventPreconditionJSON): EventPrecondition {
    switch (json.type) {
      case "GlobalVariableIs":
        return GlobalVariableIs.fromJSON(json);
      case "GlobalVariableIsGreaterThan":
        return GlobalVariableIsGreaterThan.fromJSON(json);
      case "GlobalVariableIsLessThan":
        return GlobalVariableIsLessThan.fromJSON(json);
      default:
        throw new Error(`Unknown precondition type: ${json.type}`);
    }
  }
}
```

### Step 3.5: Create Precondition Index

**File:** `react-app/src/models/area/preconditions/index.ts`

```typescript
export * from './GlobalVariableIs';
export * from './GlobalVariableIsGreaterThan';
export * from './GlobalVariableIsLessThan';
export * from './PreconditionFactory';
```

### Phase 3 Validation

Create test file: `react-app/src/models/area/__tests__/EventPreconditions.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { GlobalVariableIs } from '../preconditions/GlobalVariableIs';
import { GlobalVariableIsGreaterThan } from '../preconditions/GlobalVariableIsGreaterThan';
import { GlobalVariableIsLessThan } from '../preconditions/GlobalVariableIsLessThan';
import { PreconditionFactory } from '../preconditions/PreconditionFactory';
import type { GameState } from '../EventPrecondition';

describe('EventPreconditions', () => {
  const createTestState = (variables: Record<string, string | number | boolean>): GameState => ({
    globalVariables: new Map(Object.entries(variables)),
  });

  describe('GlobalVariableIs', () => {
    it('should return true when variable matches expected value', () => {
      const precondition = new GlobalVariableIs('hasKey', true);
      const state = createTestState({ hasKey: true });
      expect(precondition.evaluate(state)).toBe(true);
    });

    it('should return false when variable does not match', () => {
      const precondition = new GlobalVariableIs('hasKey', true);
      const state = createTestState({ hasKey: false });
      expect(precondition.evaluate(state)).toBe(false);
    });

    it('should return false when variable does not exist', () => {
      const precondition = new GlobalVariableIs('hasKey', true);
      const state = createTestState({});
      expect(precondition.evaluate(state)).toBe(false);
    });

    it('should serialize and deserialize correctly', () => {
      const precondition = new GlobalVariableIs('visited', true);
      const json = precondition.toJSON();
      const restored = GlobalVariableIs.fromJSON(json);

      expect(restored.variableName).toBe('visited');
      expect(restored.expectedValue).toBe(true);
    });
  });

  describe('GlobalVariableIsGreaterThan', () => {
    it('should return true when variable is greater than threshold', () => {
      const precondition = new GlobalVariableIsGreaterThan('gold', 100);
      const state = createTestState({ gold: 150 });
      expect(precondition.evaluate(state)).toBe(true);
    });

    it('should return false when variable equals threshold', () => {
      const precondition = new GlobalVariableIsGreaterThan('gold', 100);
      const state = createTestState({ gold: 100 });
      expect(precondition.evaluate(state)).toBe(false);
    });

    it('should return false when variable is not a number', () => {
      const precondition = new GlobalVariableIsGreaterThan('gold', 100);
      const state = createTestState({ gold: 'invalid' });
      expect(precondition.evaluate(state)).toBe(false);
    });
  });

  describe('GlobalVariableIsLessThan', () => {
    it('should return true when variable is less than threshold', () => {
      const precondition = new GlobalVariableIsLessThan('health', 10);
      const state = createTestState({ health: 5 });
      expect(precondition.evaluate(state)).toBe(true);
    });

    it('should return false when variable equals threshold', () => {
      const precondition = new GlobalVariableIsLessThan('health', 10);
      const state = createTestState({ health: 10 });
      expect(precondition.evaluate(state)).toBe(false);
    });
  });

  describe('PreconditionFactory', () => {
    it('should create GlobalVariableIs from JSON', () => {
      const json = { type: 'GlobalVariableIs', variableName: 'test', expectedValue: true };
      const precondition = PreconditionFactory.fromJSON(json);
      expect(precondition).toBeInstanceOf(GlobalVariableIs);
    });

    it('should throw error for unknown type', () => {
      const json = { type: 'Unknown', variableName: 'test' };
      expect(() => PreconditionFactory.fromJSON(json)).toThrow('Unknown precondition type');
    });
  });
});
```

**Run Tests:**
```bash
npm test -- EventPreconditions.test.ts
```

---

## Phase 4: Action System

**Goal:** Implement all five action types.

**Duration:** 3 hours

**Dependencies:** Phase 1

### Step 4.1: Implement ShowMessage Action

**File:** `react-app/src/models/area/actions/ShowMessage.ts`

```typescript
import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';

/**
 * Shows a message in the player's log/message area.
 *
 * Guidelines Compliance:
 * - Returns NEW game state (immutable)
 * - Never mutates input state
 */
export class ShowMessage implements EventAction {
  readonly type = "ShowMessage";

  constructor(public readonly message: string) {}

  execute(state: GameState): GameState {
    // Add message to player message log
    // NOTE: Actual messageLog structure may vary based on game state implementation
    return {
      ...state,
      messageLog: [...(state.messageLog || []), {
        text: this.message,
        timestamp: Date.now(),
      }],
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      message: this.message,
    };
  }

  static fromJSON(json: EventActionJSON): ShowMessage {
    if (json.type !== "ShowMessage") {
      throw new Error(`Invalid type for ShowMessage: ${json.type}`);
    }
    return new ShowMessage(json.message as string);
  }
}
```

### Step 4.2: Implement Teleport Action

**File:** `react-app/src/models/area/actions/Teleport.ts`

```typescript
import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';
import type { CardinalDirection } from '../InteractiveObject';

/**
 * Teleports player to a different map and position.
 */
export class Teleport implements EventAction {
  readonly type = "Teleport";

  constructor(
    public readonly targetMapId: string,
    public readonly targetX: number,
    public readonly targetY: number,
    public readonly targetDirection: CardinalDirection
  ) {}

  execute(state: GameState): GameState {
    // Load target map, set player position and direction
    return {
      ...state,
      currentMapId: this.targetMapId,
      playerPosition: { x: this.targetX, y: this.targetY },
      playerDirection: this.targetDirection,
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      targetMapId: this.targetMapId,
      targetX: this.targetX,
      targetY: this.targetY,
      targetDirection: this.targetDirection,
    };
  }

  static fromJSON(json: EventActionJSON): Teleport {
    if (json.type !== "Teleport") {
      throw new Error(`Invalid type for Teleport: ${json.type}`);
    }
    return new Teleport(
      json.targetMapId as string,
      json.targetX as number,
      json.targetY as number,
      json.targetDirection as CardinalDirection
    );
  }
}
```

### Step 4.3: Implement Rotate Action

**File:** `react-app/src/models/area/actions/Rotate.ts`

```typescript
import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';
import type { CardinalDirection } from '../InteractiveObject';

/**
 * Rotates the player to face a specific direction.
 */
export class Rotate implements EventAction {
  readonly type = "Rotate";

  constructor(public readonly newDirection: CardinalDirection) {}

  execute(state: GameState): GameState {
    return {
      ...state,
      playerDirection: this.newDirection,
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      newDirection: this.newDirection,
    };
  }

  static fromJSON(json: EventActionJSON): Rotate {
    if (json.type !== "Rotate") {
      throw new Error(`Invalid type for Rotate: ${json.type}`);
    }
    return new Rotate(json.newDirection as CardinalDirection);
  }
}
```

### Step 4.4: Implement StartEncounter Action

**File:** `react-app/src/models/area/actions/StartEncounter.ts`

```typescript
import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';

/**
 * Starts a combat encounter.
 */
export class StartEncounter implements EventAction {
  readonly type = "StartEncounter";

  constructor(public readonly encounterId: string) {}

  execute(state: GameState): GameState {
    // Transition to combat with specified encounter
    return {
      ...state,
      combatState: {
        active: true,
        encounterId: this.encounterId,
      },
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      encounterId: this.encounterId,
    };
  }

  static fromJSON(json: EventActionJSON): StartEncounter {
    if (json.type !== "StartEncounter") {
      throw new Error(`Invalid type for StartEncounter: ${json.type}`);
    }
    return new StartEncounter(json.encounterId as string);
  }
}
```

### Step 4.5: Implement SetGlobalVariable Action

**File:** `react-app/src/models/area/actions/SetGlobalVariable.ts`

```typescript
import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';

/**
 * Sets a global variable to a specific value.
 *
 * Guidelines Compliance:
 * - Creates NEW Map instance (immutable)
 * - Never mutates existing state.globalVariables
 */
export class SetGlobalVariable implements EventAction {
  readonly type = "SetGlobalVariable";

  constructor(
    public readonly variableName: string,
    public readonly value: string | number | boolean
  ) {}

  execute(state: GameState): GameState {
    // Create NEW Map with updated variable (immutability)
    const newVariables = new Map(state.globalVariables);
    newVariables.set(this.variableName, this.value);

    return {
      ...state,
      globalVariables: newVariables,
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      variableName: this.variableName,
      value: this.value,
    };
  }

  static fromJSON(json: EventActionJSON): SetGlobalVariable {
    if (json.type !== "SetGlobalVariable") {
      throw new Error(`Invalid type for SetGlobalVariable: ${json.type}`);
    }
    return new SetGlobalVariable(
      json.variableName as string,
      json.value as string | number | boolean
    );
  }
}
```

### Step 4.6: Create Action Factory

**File:** `react-app/src/models/area/actions/ActionFactory.ts`

```typescript
import type { EventAction, EventActionJSON } from '../EventAction';
import { ShowMessage } from './ShowMessage';
import { Teleport } from './Teleport';
import { Rotate } from './Rotate';
import { StartEncounter } from './StartEncounter';
import { SetGlobalVariable } from './SetGlobalVariable';

/**
 * Factory for creating action instances from JSON.
 * Centralizes deserialization logic.
 */
export class ActionFactory {
  static fromJSON(json: EventActionJSON): EventAction {
    switch (json.type) {
      case "ShowMessage":
        return ShowMessage.fromJSON(json);
      case "Teleport":
        return Teleport.fromJSON(json);
      case "Rotate":
        return Rotate.fromJSON(json);
      case "StartEncounter":
        return StartEncounter.fromJSON(json);
      case "SetGlobalVariable":
        return SetGlobalVariable.fromJSON(json);
      default:
        throw new Error(`Unknown action type: ${json.type}`);
    }
  }
}
```

### Step 4.7: Create Action Index

**File:** `react-app/src/models/area/actions/index.ts`

```typescript
export * from './ShowMessage';
export * from './Teleport';
export * from './Rotate';
export * from './StartEncounter';
export * from './SetGlobalVariable';
export * from './ActionFactory';
```

### Step 4.8: Update GameState Interface

**File:** `react-app/src/models/area/EventPrecondition.ts` (update)

Add necessary fields to GameState interface:

```typescript
/**
 * Game state interface (extend as needed)
 */
export interface GameState {
  globalVariables: Map<string, string | number | boolean>;
  messageLog?: Array<{ text: string; timestamp: number }>;
  currentMapId?: string;
  playerPosition?: { x: number; y: number };
  playerDirection?: CardinalDirection;
  combatState?: { active: boolean; encounterId: string };
  // ... other game state fields
}

import type { CardinalDirection } from './InteractiveObject';
```

### Phase 4 Validation

Create test file: `react-app/src/models/area/__tests__/EventActions.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ShowMessage } from '../actions/ShowMessage';
import { Teleport } from '../actions/Teleport';
import { Rotate } from '../actions/Rotate';
import { StartEncounter } from '../actions/StartEncounter';
import { SetGlobalVariable } from '../actions/SetGlobalVariable';
import { ActionFactory } from '../actions/ActionFactory';
import type { GameState } from '../EventPrecondition';

describe('EventActions', () => {
  const createTestState = (): GameState => ({
    globalVariables: new Map(),
    messageLog: [],
    currentMapId: 'test-map',
    playerPosition: { x: 0, y: 0 },
    playerDirection: 'North',
  });

  describe('ShowMessage', () => {
    it('should add message to log', () => {
      const action = new ShowMessage('Hello World');
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.messageLog).toHaveLength(1);
      expect(newState.messageLog![0].text).toBe('Hello World');
    });

    it('should not mutate original state', () => {
      const action = new ShowMessage('Test');
      const state = createTestState();
      const originalLog = state.messageLog;

      action.execute(state);

      expect(state.messageLog).toBe(originalLog);
      expect(state.messageLog).toHaveLength(0);
    });

    it('should serialize and deserialize correctly', () => {
      const action = new ShowMessage('Test Message');
      const json = action.toJSON();
      const restored = ShowMessage.fromJSON(json);

      expect(restored.message).toBe('Test Message');
    });
  });

  describe('Teleport', () => {
    it('should change map and position', () => {
      const action = new Teleport('new-map', 10, 20, 'South');
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.currentMapId).toBe('new-map');
      expect(newState.playerPosition).toEqual({ x: 10, y: 20 });
      expect(newState.playerDirection).toBe('South');
    });

    it('should not mutate original state', () => {
      const action = new Teleport('new-map', 10, 20, 'South');
      const state = createTestState();

      action.execute(state);

      expect(state.currentMapId).toBe('test-map');
      expect(state.playerPosition).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Rotate', () => {
    it('should change player direction', () => {
      const action = new Rotate('East');
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.playerDirection).toBe('East');
    });
  });

  describe('StartEncounter', () => {
    it('should activate combat with encounter ID', () => {
      const action = new StartEncounter('goblin-ambush');
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.combatState?.active).toBe(true);
      expect(newState.combatState?.encounterId).toBe('goblin-ambush');
    });
  });

  describe('SetGlobalVariable', () => {
    it('should create new variable', () => {
      const action = new SetGlobalVariable('hasKey', true);
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.globalVariables.get('hasKey')).toBe(true);
    });

    it('should update existing variable', () => {
      const state = createTestState();
      state.globalVariables.set('count', 5);

      const action = new SetGlobalVariable('count', 10);
      const newState = action.execute(state);

      expect(newState.globalVariables.get('count')).toBe(10);
    });

    it('should not mutate original state', () => {
      const action = new SetGlobalVariable('test', 'value');
      const state = createTestState();
      const originalVars = state.globalVariables;

      action.execute(state);

      expect(state.globalVariables).toBe(originalVars);
      expect(state.globalVariables.has('test')).toBe(false);
    });
  });

  describe('ActionFactory', () => {
    it('should create ShowMessage from JSON', () => {
      const json = { type: 'ShowMessage', message: 'test' };
      const action = ActionFactory.fromJSON(json);
      expect(action).toBeInstanceOf(ShowMessage);
    });

    it('should throw error for unknown type', () => {
      const json = { type: 'Unknown' };
      expect(() => ActionFactory.fromJSON(json)).toThrow('Unknown action type');
    });
  });
});
```

**Run Tests:**
```bash
npm test -- EventActions.test.ts
```

---

## Phase 5: EventArea and AreaEvent Implementation

**Goal:** Complete implementation with helper methods.

**Duration:** 1 hour

**Dependencies:** Phases 2, 3, 4

### Step 5.1: Add Helper Methods to EventArea

**File:** `react-app/src/models/area/EventArea.ts` (update)

Add utility methods:

```typescript
/**
 * Gets all events in this area with a specific trigger type
 */
export function getEventsByTrigger(area: EventArea, trigger: EventTrigger): AreaEvent[] {
  return area.events.filter(event => event.trigger === trigger);
}

/**
 * Gets all one-time events that have not been triggered yet
 */
export function getPendingOneTimeEvents(area: EventArea): AreaEvent[] {
  return area.events.filter(event => event.oneTime && !event.triggered);
}
```

### Phase 5 Validation

✅ Helper methods compile
✅ Methods return correct results
✅ No side effects (pure functions)

---

## Phase 6: EventProcessor Implementation

**Goal:** Implement core event processing logic.

**Duration:** 3 hours

**Dependencies:** All previous phases

### Step 6.1: Create EventProcessor Class

**File:** `react-app/src/utils/EventProcessor.ts`

```typescript
import type { AreaMap } from '../models/area/AreaMap';
import type { EventArea, AreaEvent } from '../models/area/EventArea';
import { EventTrigger } from '../models/area/EventTrigger';
import type { GameState } from '../models/area/EventPrecondition';
import { isPositionInEventArea } from '../models/area/EventArea';

/**
 * Processes events based on player movement.
 *
 * Guidelines Compliance:
 * - Returns NEW game state (immutable pattern)
 * - No side effects except logging
 * - Efficient O(n) processing where n = number of event areas
 */
export class EventProcessor {
  /**
   * Process movement and trigger appropriate events.
   *
   * Algorithm:
   * 1. Determine which event areas contain previous and current positions
   * 2. Calculate entered, stayed-in, and exited areas
   * 3. Process OnExit events (player leaving areas)
   * 4. Process OnEnter events (player entering new areas)
   * 5. Process OnStep events (player still in areas)
   *
   * @param gameState Current game state
   * @param areaMap Current area map
   * @param previousX Previous player X position
   * @param previousY Previous player Y position
   * @param currentX Current player X position
   * @param currentY Current player Y position
   * @returns Modified game state after processing events
   */
  processMovement(
    gameState: GameState,
    areaMap: AreaMap,
    previousX: number,
    previousY: number,
    currentX: number,
    currentY: number
  ): GameState {
    let newState = gameState;

    // Get event areas at previous and current positions
    const previousAreas = new Set(
      (areaMap.eventAreas || [])
        .filter(area => isPositionInEventArea(area, previousX, previousY))
        .map(area => area.id)
    );

    const currentAreas = new Set(
      (areaMap.eventAreas || [])
        .filter(area => isPositionInEventArea(area, currentX, currentY))
        .map(area => area.id)
    );

    // Determine area transitions
    const enteredAreaIds = Array.from(currentAreas).filter(id => !previousAreas.has(id));
    const stayedInAreaIds = Array.from(currentAreas).filter(id => previousAreas.has(id));
    const exitedAreaIds = Array.from(previousAreas).filter(id => !currentAreas.has(id));

    // Get EventArea objects
    const eventAreasMap = new Map((areaMap.eventAreas || []).map(area => [area.id, area]));

    // Process OnExit events first (player leaving areas)
    for (const areaId of exitedAreaIds) {
      const area = eventAreasMap.get(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnExit);
      }
    }

    // Process OnEnter events (player entering new areas)
    for (const areaId of enteredAreaIds) {
      const area = eventAreasMap.get(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnEnter);
      }
    }

    // Process OnStep events (player still in areas)
    for (const areaId of stayedInAreaIds) {
      const area = eventAreasMap.get(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnStep);
      }
    }

    return newState;
  }

  /**
   * Process all events in an area with matching trigger type.
   *
   * @param gameState Current game state
   * @param area Event area to process
   * @param triggerType Trigger type to match
   * @returns Modified game state
   */
  private processAreaEvents(
    gameState: GameState,
    area: EventArea,
    triggerType: EventTrigger
  ): GameState {
    let newState = gameState;

    for (const event of area.events) {
      // Skip if trigger type doesn't match
      if (event.trigger !== triggerType) {
        continue;
      }

      // Skip if one-time event already triggered
      if (event.oneTime && this.isEventTriggered(newState, event.id)) {
        continue;
      }

      // Evaluate all preconditions
      const allPreconditionsPass = event.preconditions.every(precondition => {
        try {
          return precondition.evaluate(newState);
        } catch (error) {
          console.error(`Error evaluating precondition in event ${event.id}:`, error);
          return false;
        }
      });

      if (!allPreconditionsPass) {
        continue;
      }

      // Execute all actions in order
      for (const action of event.actions) {
        try {
          newState = action.execute(newState);
        } catch (error) {
          console.error(`Error executing action in event ${event.id}:`, error);
        }
      }

      // Mark one-time event as triggered
      if (event.oneTime) {
        newState = this.markEventTriggered(newState, event.id);
      }
    }

    return newState;
  }

  /**
   * Check if a one-time event has been triggered.
   *
   * @param state Game state
   * @param eventId Event ID to check
   * @returns true if event has been triggered
   */
  private isEventTriggered(state: GameState, eventId: string): boolean {
    return state.triggeredEventIds?.has(eventId) ?? false;
  }

  /**
   * Mark a one-time event as triggered.
   *
   * Guidelines Compliance:
   * - Creates NEW Set (immutable pattern)
   *
   * @param state Game state
   * @param eventId Event ID to mark
   * @returns Modified game state
   */
  private markEventTriggered(state: GameState, eventId: string): GameState {
    const newTriggeredIds = new Set(state.triggeredEventIds || new Set());
    newTriggeredIds.add(eventId);

    return {
      ...state,
      triggeredEventIds: newTriggeredIds,
    };
  }
}
```

### Step 6.2: Update GameState Interface

**File:** `react-app/src/models/area/EventPrecondition.ts` (update)

Add triggeredEventIds field:

```typescript
export interface GameState {
  globalVariables: Map<string, string | number | boolean>;
  triggeredEventIds?: Set<string>;
  // ... other fields
}
```

### Phase 6 Validation

Create test file: `react-app/src/utils/__tests__/EventProcessor.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EventProcessor } from '../EventProcessor';
import { AreaMap } from '../../models/area/AreaMap';
import { EventTrigger } from '../../models/area/EventTrigger';
import { GlobalVariableIs } from '../../models/area/preconditions/GlobalVariableIs';
import { SetGlobalVariable } from '../../models/area/actions/SetGlobalVariable';
import { ShowMessage } from '../../models/area/actions/ShowMessage';
import type { EventArea, AreaEvent } from '../../models/area/EventArea';
import type { GameState } from '../../models/area/EventPrecondition';
import type { AreaMapTile } from '../../models/area/AreaMapTile';
import { TileBehavior } from '../../models/area/TileBehavior';

describe('EventProcessor', () => {
  let processor: EventProcessor;
  let testMap: AreaMap;
  let testState: GameState;

  beforeEach(() => {
    processor = new EventProcessor();

    // Create simple 5x5 test map
    const grid: AreaMapTile[][] = Array(5).fill(null).map(() =>
      Array(5).fill(null).map(() => ({
        behavior: TileBehavior.Floor,
        walkable: true,
        passable: true,
        spriteId: 'test-floor',
      }))
    );

    const eventArea: EventArea = {
      id: 'test-area',
      x: 1,
      y: 1,
      width: 2,
      height: 2,
      events: [
        {
          id: 'enter-event',
          trigger: EventTrigger.OnEnter,
          preconditions: [],
          actions: [new ShowMessage('Entered area')],
        },
        {
          id: 'step-event',
          trigger: EventTrigger.OnStep,
          preconditions: [],
          actions: [new ShowMessage('Stepped in area')],
        },
        {
          id: 'exit-event',
          trigger: EventTrigger.OnExit,
          preconditions: [],
          actions: [new ShowMessage('Exited area')],
        },
      ],
    };

    testMap = new AreaMap(
      'test-map',
      'Test Map',
      'A test map',
      5,
      5,
      grid,
      'test-tileset',
      { x: 0, y: 0, direction: 'North' },
      [],
      [],
      undefined,
      [eventArea]
    );

    testState = {
      globalVariables: new Map(),
      messageLog: [],
      triggeredEventIds: new Set(),
    };
  });

  describe('OnEnter trigger', () => {
    it('should fire when player enters area', () => {
      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.messageLog).toHaveLength(1);
      expect(newState.messageLog![0].text).toBe('Entered area');
    });

    it('should not fire when player is already in area', () => {
      const newState = processor.processMovement(testState, testMap, 1, 1, 1, 2);

      const enterMessages = newState.messageLog!.filter(m => m.text === 'Entered area');
      expect(enterMessages).toHaveLength(0);
    });
  });

  describe('OnStep trigger', () => {
    it('should fire when player steps within area', () => {
      const newState = processor.processMovement(testState, testMap, 1, 1, 1, 2);

      expect(newState.messageLog!.some(m => m.text === 'Stepped in area')).toBe(true);
    });

    it('should not fire when player enters area (not already in)', () => {
      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.messageLog!.some(m => m.text === 'Stepped in area')).toBe(false);
    });
  });

  describe('OnExit trigger', () => {
    it('should fire when player exits area', () => {
      const newState = processor.processMovement(testState, testMap, 1, 1, 0, 0);

      expect(newState.messageLog!.some(m => m.text === 'Exited area')).toBe(true);
    });

    it('should not fire when player was not in area', () => {
      const newState = processor.processMovement(testState, testMap, 0, 0, 3, 3);

      expect(newState.messageLog!.some(m => m.text === 'Exited area')).toBe(false);
    });
  });

  describe('Preconditions', () => {
    it('should not fire event if preconditions fail', () => {
      // Add event with failing precondition
      const area = testMap.eventAreas![0];
      area.events.push({
        id: 'conditional-event',
        trigger: EventTrigger.OnEnter,
        preconditions: [new GlobalVariableIs('hasKey', true)],
        actions: [new ShowMessage('Has key')],
      });

      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.messageLog!.some(m => m.text === 'Has key')).toBe(false);
    });

    it('should fire event if all preconditions pass', () => {
      testState.globalVariables.set('hasKey', true);

      const area = testMap.eventAreas![0];
      area.events.push({
        id: 'conditional-event',
        trigger: EventTrigger.OnEnter,
        preconditions: [new GlobalVariableIs('hasKey', true)],
        actions: [new ShowMessage('Has key')],
      });

      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.messageLog!.some(m => m.text === 'Has key')).toBe(true);
    });
  });

  describe('One-time events', () => {
    it('should only fire once', () => {
      const area = testMap.eventAreas![0];
      area.events.push({
        id: 'one-time-event',
        trigger: EventTrigger.OnEnter,
        preconditions: [],
        actions: [new ShowMessage('One time only')],
        oneTime: true,
      });

      // First entry
      const state1 = processor.processMovement(testState, testMap, 0, 0, 1, 1);
      expect(state1.messageLog!.some(m => m.text === 'One time only')).toBe(true);
      expect(state1.triggeredEventIds!.has('one-time-event')).toBe(true);

      // Exit and re-enter
      const state2 = processor.processMovement(state1, testMap, 1, 1, 0, 0);
      const state3 = processor.processMovement(state2, testMap, 0, 0, 1, 1);

      // Should not have additional "One time only" message
      const count = state3.messageLog!.filter(m => m.text === 'One time only').length;
      expect(count).toBe(1);
    });
  });

  describe('Action execution order', () => {
    it('should execute actions in order', () => {
      const area = testMap.eventAreas![0];
      area.events.push({
        id: 'ordered-event',
        trigger: EventTrigger.OnEnter,
        preconditions: [],
        actions: [
          new SetGlobalVariable('step', 1),
          new SetGlobalVariable('step', 2),
          new SetGlobalVariable('step', 3),
        ],
      });

      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.globalVariables.get('step')).toBe(3);
    });
  });
});
```

**Run Tests:**
```bash
npm test -- EventProcessor.test.ts
```

---

## Phase 7: AreaMap Integration

**Goal:** Add eventAreas field to AreaMap and update serialization.

**Duration:** 1 hour

**Dependencies:** Phase 5

### Step 7.1: Update AreaMap Class

**File:** `react-app/src/models/area/AreaMap.ts` (update)

Add eventAreas field and helper methods:

```typescript
import type { EventArea } from './EventArea';
import { isPositionInEventArea } from './EventArea';

export class AreaMap {
  // ... existing fields

  /**
   * Optional event areas on this map
   */
  readonly eventAreas?: EventArea[];

  constructor(
    // ... existing parameters
    eventAreas?: EventArea[]
  ) {
    // ... existing initialization
    this.eventAreas = eventAreas ?? [];
  }

  /**
   * Gets all event areas that contain the specified position.
   *
   * @param x Grid X coordinate
   * @param y Grid Y coordinate
   * @returns Array of event areas containing this position
   */
  getEventAreasAt(x: number, y: number): EventArea[] {
    if (!this.eventAreas) {
      return [];
    }

    return this.eventAreas.filter(area => isPositionInEventArea(area, x, y));
  }

  /**
   * Gets a specific event area by ID.
   *
   * @param id Event area ID
   * @returns Event area or undefined if not found
   */
  getEventAreaById(id: string): EventArea | undefined {
    return this.eventAreas?.find(area => area.id === id);
  }

  // Update toJSON method
  toJSON(): AreaMapJSON {
    return {
      // ... existing fields
      eventAreas: this.eventAreas,
    };
  }

  // Update fromJSON method
  static fromJSON(json: AreaMapJSON): AreaMap {
    return new AreaMap(
      // ... existing parameters
      json.eventAreas
    );
  }
}
```

### Step 7.2: Update AreaMapJSON Interface

**File:** `react-app/src/models/area/AreaMap.ts` (update)

```typescript
export interface AreaMapJSON {
  // ... existing fields
  eventAreas?: EventAreaJSON[];
}

import type { EventAreaJSON } from './EventArea';
```

### Phase 7 Validation

✅ AreaMap compiles with new field
✅ Serialization preserves eventAreas
✅ Helper methods return correct results

**Test:**
```typescript
const map = new AreaMap(/* ... */, [testEventArea]);
expect(map.getEventAreasAt(1, 1)).toHaveLength(1);
expect(map.getEventAreaById('test-area')).toBeDefined();
```

---

## Phase 8: YAML Parsing

**Goal:** Extend AreaMapParser to parse event areas from YAML.

**Duration:** 2 hours

**Dependencies:** Phases 5, 7

### Step 8.1: Update AreaMapYAML Interface

**File:** `react-app/src/utils/AreaMapParser.ts` (update)

```typescript
import type { EventAreaJSON } from '../models/area/EventArea';

export interface AreaMapYAML {
  // ... existing fields
  eventAreas?: EventAreaJSON[];
}
```

### Step 8.2: Update parseAreaMapFromYAML Function

**File:** `react-app/src/utils/AreaMapParser.ts` (update)

```typescript
import { PreconditionFactory } from '../models/area/preconditions/PreconditionFactory';
import { ActionFactory } from '../models/area/actions/ActionFactory';
import type { EventArea, AreaEvent } from '../models/area/EventArea';
import { isEventTrigger } from '../models/area/EventTrigger';

export function parseAreaMapFromYAML(
  areaData: AreaMapYAML,
  tileset: AreaMapTileSet
): AreaMap {
  // ... existing parsing logic

  // Parse event areas if present
  let eventAreas: EventArea[] | undefined;
  if (areaData.eventAreas) {
    eventAreas = areaData.eventAreas.map(areaJson => parseEventArea(areaJson, areaData.id));
  }

  // Create AreaMap instance with event areas
  return new AreaMap(
    // ... existing parameters
    eventAreas
  );
}

/**
 * Parses an event area from JSON.
 *
 * @param areaJson Event area JSON data
 * @param mapId Parent map ID (for error messages)
 * @returns Parsed EventArea
 */
function parseEventArea(areaJson: EventAreaJSON, mapId: string): EventArea {
  // Validate required fields
  if (!areaJson.id || typeof areaJson.x !== 'number' || typeof areaJson.y !== 'number') {
    throw new Error(`Invalid event area in map '${mapId}': missing required fields`);
  }

  // Validate bounds
  if (areaJson.width <= 0 || areaJson.height <= 0) {
    throw new Error(
      `Invalid event area '${areaJson.id}' in map '${mapId}': width and height must be positive`
    );
  }

  // Parse events
  const events: AreaEvent[] = areaJson.events.map(eventJson =>
    parseAreaEvent(eventJson, areaJson.id, mapId)
  );

  return {
    id: areaJson.id,
    x: areaJson.x,
    y: areaJson.y,
    width: areaJson.width,
    height: areaJson.height,
    events,
    description: areaJson.description,
  };
}

/**
 * Parses an area event from JSON.
 *
 * @param eventJson Event JSON data
 * @param areaId Parent area ID
 * @param mapId Parent map ID (for error messages)
 * @returns Parsed AreaEvent
 */
function parseAreaEvent(
  eventJson: AreaEventJSON,
  areaId: string,
  mapId: string
): AreaEvent {
  // Validate trigger type
  if (!isEventTrigger(eventJson.trigger)) {
    throw new Error(
      `Invalid trigger type '${eventJson.trigger}' in event '${eventJson.id}' ` +
      `(area '${areaId}', map '${mapId}')`
    );
  }

  // Parse preconditions
  const preconditions = eventJson.preconditions.map(precondJson => {
    try {
      return PreconditionFactory.fromJSON(precondJson);
    } catch (error) {
      throw new Error(
        `Error parsing precondition in event '${eventJson.id}' ` +
        `(area '${areaId}', map '${mapId}'): ${error}`
      );
    }
  });

  // Parse actions
  const actions = eventJson.actions.map(actionJson => {
    try {
      return ActionFactory.fromJSON(actionJson);
    } catch (error) {
      throw new Error(
        `Error parsing action in event '${eventJson.id}' ` +
        `(area '${areaId}', map '${mapId}'): ${error}`
      );
    }
  });

  return {
    id: eventJson.id,
    trigger: eventJson.trigger,
    preconditions,
    actions,
    oneTime: eventJson.oneTime,
    triggered: eventJson.triggered,
    description: eventJson.description,
  };
}
```

### Phase 8 Validation

Create test file: `react-app/src/utils/__tests__/AreaMapParserEvents.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { parseAreaMapFromYAML, type AreaMapYAML } from '../AreaMapParser';
import type { AreaMapTileSet } from '../../models/area/AreaMapTileSet';
import { TileBehavior } from '../../models/area/TileBehavior';
import { EventTrigger } from '../../models/area/EventTrigger';

describe('AreaMapParser - Event Areas', () => {
  const createTestTileset = (): AreaMapTileSet => ({
    id: 'test-tileset',
    name: 'Test',
    tileTypes: [
      {
        char: '.',
        behavior: TileBehavior.Floor,
        walkable: true,
        passable: true,
        spriteId: 'floor',
      },
    ],
  });

  it('should parse event areas from YAML', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...\n...\n...',
      playerSpawn: { x: 1, y: 1, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          events: [
            {
              id: 'event-1',
              trigger: EventTrigger.OnEnter,
              preconditions: [
                {
                  type: 'GlobalVariableIs',
                  variableName: 'test',
                  expectedValue: true,
                },
              ],
              actions: [
                {
                  type: 'ShowMessage',
                  message: 'Test message',
                },
              ],
            },
          ],
        },
      ],
    };

    const map = parseAreaMapFromYAML(yaml, tileset);

    expect(map.eventAreas).toHaveLength(1);
    expect(map.eventAreas![0].id).toBe('area-1');
    expect(map.eventAreas![0].events).toHaveLength(1);
    expect(map.eventAreas![0].events[0].id).toBe('event-1');
  });

  it('should throw error for invalid trigger type', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          events: [
            {
              id: 'event-1',
              trigger: 'invalid' as any,
              preconditions: [],
              actions: [],
            },
          ],
        },
      ],
    };

    expect(() => parseAreaMapFromYAML(yaml, tileset)).toThrow('Invalid trigger type');
  });
});
```

**Run Tests:**
```bash
npm test -- AreaMapParserEvents.test.ts
```

---

## Phase 9: FirstPersonView Integration

**Goal:** Integrate EventProcessor with movement system.

**Duration:** 2 hours

**Dependencies:** Phase 6

### Step 9.1: Update FirstPersonView State

Add necessary state tracking for events:

```typescript
// In FirstPersonView component or game state manager

interface FirstPersonViewState {
  // ... existing state
  previousPlayerX: number;
  previousPlayerY: number;
  gameState: GameState;  // Contains globalVariables, triggeredEventIds, etc.
}
```

### Step 9.2: Integrate EventProcessor with Movement

**File:** `react-app/src/components/FirstPersonView.tsx` (or similar)

```typescript
import { EventProcessor } from '../utils/EventProcessor';

// In component
const eventProcessor = useMemo(() => new EventProcessor(), []);

// In movement handler
const handleMovement = useCallback((direction: CardinalDirection) => {
  const result = validateMovement(currentMap, playerX, playerY, direction);

  if (result.success) {
    const previousX = playerX;
    const previousY = playerY;
    const newX = result.finalX;
    const newY = result.finalY;

    // Update player position
    setPlayerX(newX);
    setPlayerY(newY);

    // Process events AFTER position update
    const newGameState = eventProcessor.processMovement(
      gameState,
      currentMap,
      previousX,
      previousY,
      newX,
      newY
    );

    // Update game state with event results
    setGameState(newGameState);

    // Handle any state changes from events (teleport, combat, etc.)
    handleEventStateChanges(newGameState);
  }
}, [playerX, playerY, currentMap, gameState, eventProcessor]);

/**
 * Handle state changes triggered by events.
 *
 * Examples:
 * - Teleport action changed currentMapId
 * - StartEncounter action activated combat
 */
const handleEventStateChanges = useCallback((newState: GameState) => {
  // Handle map change (Teleport action)
  if (newState.currentMapId && newState.currentMapId !== currentMap.id) {
    const newMap = AreaMapRegistry.getById(newState.currentMapId);
    if (newMap) {
      setCurrentMap(newMap);
      if (newState.playerPosition) {
        setPlayerX(newState.playerPosition.x);
        setPlayerY(newState.playerPosition.y);
      }
      if (newState.playerDirection) {
        setPlayerDirection(newState.playerDirection);
      }
    }
  }

  // Handle combat start (StartEncounter action)
  if (newState.combatState?.active) {
    startCombat(newState.combatState.encounterId);
  }

  // Handle messages (ShowMessage action)
  if (newState.messageLog && newState.messageLog.length > previousMessageCount) {
    const newMessages = newState.messageLog.slice(previousMessageCount);
    displayMessages(newMessages);
  }
}, [currentMap, previousMessageCount]);
```

### Phase 9 Validation

✅ Events fire on player movement
✅ OnEnter/OnStep/OnExit triggers work correctly
✅ Preconditions gate event execution
✅ Actions modify game state correctly
✅ Teleport action changes maps
✅ Messages display in UI

---

## Phase 10: Testing and Examples

**Goal:** Create comprehensive tests and example YAML files.

**Duration:** 2 hours

**Dependencies:** All previous phases

### Step 10.1: Create Example YAML Files

**File:** `react-app/src/data/area-map-database.yaml` (update)

Add example area with events:

```yaml
areas:
  # ... existing areas

  - id: event-demo-map
    name: "Event System Demo"
    description: "Demonstrates all event system features"
    tilesetId: dungeon-grey-stone
    grid: |-
      ##########
      #........#
      #........#
      #...D....#
      #........#
      ##########
    playerSpawn: { x: 2, y: 2, direction: North }

    eventAreas:
      # Welcome message on first entry
      - id: entrance-area
        x: 1
        y: 1
        width: 3
        height: 2
        description: "Shows welcome message on first visit"
        events:
          - id: first-visit
            trigger: on-enter
            oneTime: true
            preconditions:
              - type: GlobalVariableIs
                variableName: "visited-demo"
                expectedValue: false
            actions:
              - type: ShowMessage
                message: "Welcome to the Event System Demo!"
              - type: SetGlobalVariable
                variableName: "visited-demo"
                value: true

      # Door unlock puzzle
      - id: door-area
        x: 4
        y: 3
        width: 1
        height: 1
        description: "Door that unlocks with key"
        events:
          # Try without key
          - id: door-locked
            trigger: on-step
            preconditions:
              - type: GlobalVariableIs
                variableName: "has-demo-key"
                expectedValue: false
            actions:
              - type: ShowMessage
                message: "The door is locked. You need a key."

          # Unlock with key
          - id: door-unlock
            trigger: on-step
            oneTime: true
            preconditions:
              - type: GlobalVariableIs
                variableName: "has-demo-key"
                expectedValue: true
            actions:
              - type: ShowMessage
                message: "You use the key to unlock the door!"
              - type: SetGlobalVariable
                variableName: "door-unlocked"
                value: true

      # Item pickup
      - id: key-area
        x: 7
        y: 1
        width: 1
        height: 1
        description: "Key pickup location"
        events:
          - id: pickup-key
            trigger: on-step
            oneTime: true
            preconditions: []
            actions:
              - type: ShowMessage
                message: "You found a key!"
              - type: SetGlobalVariable
                variableName: "has-demo-key"
                value: true

      # Counter example
      - id: step-counter-area
        x: 5
        y: 4
        width: 3
        height: 1
        description: "Counts steps with preconditions"
        events:
          # Initialize counter
          - id: init-counter
            trigger: on-enter
            oneTime: true
            preconditions: []
            actions:
              - type: SetGlobalVariable
                variableName: "step-count"
                value: 0

          # Increment on each step
          - id: count-steps
            trigger: on-step
            preconditions: []
            actions:
              # NOTE: This is simplified - real implementation would need
              # an IncrementVariable action or JavaScript evaluation
              - type: ShowMessage
                message: "You stepped in the counting area"

          # Message when leaving after 5+ steps
          - id: many-steps-message
            trigger: on-exit
            preconditions:
              - type: GlobalVariableIsGreaterThan
                variableName: "step-count"
                threshold: 4
            actions:
              - type: ShowMessage
                message: "You took many steps in that area!"
```

### Step 10.2: Create Integration Test

**File:** `react-app/src/__tests__/EventSystemIntegration.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AreaMapDataLoader } from '../services/AreaMapDataLoader';
import { AreaMapRegistry } from '../utils/AreaMapRegistry';
import { EventProcessor } from '../utils/EventProcessor';
import type { GameState } from '../models/area/EventPrecondition';

describe('Event System Integration', () => {
  let processor: EventProcessor;
  let gameState: GameState;

  beforeEach(async () => {
    // Load test data
    await AreaMapDataLoader.loadAll();

    processor = new EventProcessor();
    gameState = {
      globalVariables: new Map(),
      messageLog: [],
      triggeredEventIds: new Set(),
    };
  });

  it('should process events in demo map', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    expect(map).toBeDefined();

    // Enter entrance area
    let state = processor.processMovement(gameState, map!, 2, 2, 2, 1);

    // Should have welcome message
    expect(state.messageLog!.some(m => m.text.includes('Welcome'))).toBe(true);
    expect(state.globalVariables.get('visited-demo')).toBe(true);

    // Re-enter should not show message again (one-time)
    state = processor.processMovement(state, map!, 2, 2, 2, 1);
    const welcomeCount = state.messageLog!.filter(m => m.text.includes('Welcome')).length;
    expect(welcomeCount).toBe(1);
  });

  it('should handle door unlock sequence', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    let state = gameState;

    // Try door without key
    state = processor.processMovement(state, map!, 4, 2, 4, 3);
    expect(state.messageLog!.some(m => m.text.includes('locked'))).toBe(true);

    // Get key
    state = processor.processMovement(state, map!, 6, 1, 7, 1);
    expect(state.globalVariables.get('has-demo-key')).toBe(true);

    // Try door with key
    state = processor.processMovement(state, map!, 4, 2, 4, 3);
    expect(state.messageLog!.some(m => m.text.includes('unlock'))).toBe(true);
    expect(state.globalVariables.get('door-unlocked')).toBe(true);
  });
});
```

### Step 10.3: Create Documentation

**File:** `react-app/src/models/area/README.md` (create)

```markdown
# Area Map Event System

## Quick Start

### Defining Events in YAML

```yaml
eventAreas:
  - id: my-event-area
    x: 5
    y: 5
    width: 3
    height: 3
    events:
      - id: my-event
        trigger: on-enter
        preconditions:
          - type: GlobalVariableIs
            variableName: "has-key"
            expectedValue: true
        actions:
          - type: ShowMessage
            message: "You unlocked the door!"
```

### Processing Events in Code

```typescript
import { EventProcessor } from '@/utils/EventProcessor';

const processor = new EventProcessor();

// After player movement
const newState = processor.processMovement(
  gameState,
  currentMap,
  previousX,
  previousY,
  currentX,
  currentY
);
```

## Event Types

### Triggers
- `on-enter`: Fires when player enters area (wasn't in area before)
- `on-step`: Fires every step within area
- `on-exit`: Fires when player exits area

### Preconditions
- `GlobalVariableIs`: Check if variable equals value
- `GlobalVariableIsGreaterThan`: Check if variable > threshold
- `GlobalVariableIsLessThan`: Check if variable < threshold

### Actions
- `ShowMessage`: Display message to player
- `Teleport`: Move player to different map/position
- `Rotate`: Change player facing direction
- `StartEncounter`: Trigger combat encounter
- `SetGlobalVariable`: Set/update global variable

## Examples

See `area-map-database.yaml` for complete examples.
```

### Phase 10 Validation

✅ All integration tests pass
✅ Example YAML loads without errors
✅ Events work correctly in demo map
✅ Documentation is clear and complete

**Run All Tests:**
```bash
npm test
npm run build
```

---

## Success Criteria

This implementation is complete when:
1. ✅ All type definitions compile without errors
2. ✅ Three trigger types work correctly (OnEnter, OnStep, OnExit)
3. ✅ Three precondition types work (GlobalVariableIs, IsGreaterThan, IsLessThan)
4. ✅ Five action types work (ShowMessage, Teleport, Rotate, StartEncounter, SetGlobalVariable)
5. ✅ EventProcessor correctly determines which events to fire
6. ✅ One-time events fire only once and persist
7. ✅ Events integrate with FirstPersonView movement system
8. ✅ YAML parsing works for event areas
9. ✅ All tests pass
10. ✅ Example YAML demonstrates all features

## Estimated Complexity

**Total Duration:** 12-16 hours

- Phase 1: Core Type Definitions - 2 hours
- Phase 2: Event Trigger System - 0.5 hours
- Phase 3: Precondition System - 2 hours
- Phase 4: Action System - 3 hours
- Phase 5: EventArea Implementation - 1 hour
- Phase 6: EventProcessor - 3 hours
- Phase 7: AreaMap Integration - 1 hour
- Phase 8: YAML Parsing - 2 hours
- Phase 9: FirstPersonView Integration - 2 hours
- Phase 10: Testing and Examples - 2 hours

**Risk Level:** Low-Medium

- Clear requirements
- Follows existing patterns
- No complex algorithms
- Main risk: State management complexity across movement system

## Dependencies

- **Requires**: AreaMap system (completed)
- **Requires**: Global game state management
- **Relates To**: FirstPersonView movement system
- **Relates To**: Combat encounter system (for StartEncounter)
- **Relates To**: Message/log system (for ShowMessage)

## Notes

- Event system is fully extensible - new preconditions and actions can be added easily
- Plugin architecture makes testing straightforward
- Immutable state pattern ensures no side effects
- YAML-driven design allows non-programmers to create events
- Performance is efficient (O(n) where n = number of event areas)

---

## Phase 11: Developer Panel Integration

**Goal:** Create visual event area editor in AreaMapRegistryPanel.

**Duration:** 8-10 hours

**Dependencies:** Phases 1-10

This phase adds event editing capabilities to the existing AreaMapRegistryPanel.tsx developer tool. The panel should allow visual editing of event areas, events, preconditions, and actions with the same level of polish as the existing map editing tools.

### Step 11.1: Add "Events" Tool to Tool Selection

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx` (update)

Add a new tool mode for event editing:

```typescript
// Add to existing ToolMode type
type ToolMode = "paint" | "object" | "spawn" | "encounter" | "events";

// Add to tool selection UI
const toolModes: { mode: ToolMode; label: string; icon: string }[] = [
  { mode: "paint", label: "Paint", icon: "🎨" },
  { mode: "object", label: "Object", icon: "🚪" },
  { mode: "spawn", label: "Spawn", icon: "👤" },
  { mode: "encounter", label: "Encounter", icon: "⚔️" },
  { mode: "events", label: "Events", icon: "⚡" },
];

// In component state
const [selectedTool, setSelectedTool] = useState<ToolMode>("paint");
const [selectedEventArea, setSelectedEventArea] = useState<string | null>(null);
const [isCreatingEventArea, setIsCreatingEventArea] = useState(false);
const [eventAreaStartPos, setEventAreaStartPos] = useState<{ x: number; y: number } | null>(null);
```

**Testing Checkpoint:**
- Tool selection UI shows "Events" option
- Clicking "Events" tool switches to event editing mode
- Event tool icon displays correctly

### Step 11.2: Create Event Area Visual Overlay

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx` (update)

Add visual overlay to display event areas on the grid:

```typescript
/**
 * Renders event area overlays on the map grid.
 * Shows rectangles with different colors for each event area.
 */
const renderEventAreaOverlays = () => {
  if (!selectedMap || selectedTool !== "events") {
    return null;
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {(selectedMap.eventAreas || []).map((area, index) => {
        const isSelected = selectedEventArea === area.id;

        return (
          <div
            key={area.id}
            style={{
              position: 'absolute',
              left: area.x * TILE_SIZE,
              top: area.y * TILE_SIZE,
              width: area.width * TILE_SIZE,
              height: area.height * TILE_SIZE,
              border: isSelected ? '3px solid #00ff00' : '2px solid #ffff00',
              backgroundColor: isSelected
                ? 'rgba(0, 255, 0, 0.2)'
                : 'rgba(255, 255, 0, 0.1)',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEventArea(area.id);
            }}
          >
            {/* Area label */}
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: 2,
                fontSize: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '2px 4px',
                borderRadius: '2px',
              }}
            >
              {area.id} ({area.events.length} events)
            </div>
          </div>
        );
      })}

      {/* Show area being created */}
      {isCreatingEventArea && eventAreaStartPos && (
        <div
          style={{
            position: 'absolute',
            left: eventAreaStartPos.x * TILE_SIZE,
            top: eventAreaStartPos.y * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            border: '2px dashed #00ff00',
            backgroundColor: 'rgba(0, 255, 0, 0.3)',
          }}
        />
      )}
    </div>
  );
};
```

**Testing Checkpoint:**
- Event areas display as colored overlays on grid
- Selected event area highlights in different color
- Event area labels show ID and event count
- Overlays don't interfere with grid interaction

### Step 11.3: Implement Event Area Creation

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx` (update)

Add drag-to-create functionality for event areas:

```typescript
/**
 * Handles grid click for event area creation.
 * First click sets start position, second click creates area.
 */
const handleEventAreaGridClick = (x: number, y: number) => {
  if (!selectedMap) return;

  if (!isCreatingEventArea) {
    // Start creating new area
    setIsCreatingEventArea(true);
    setEventAreaStartPos({ x, y });
  } else if (eventAreaStartPos) {
    // Complete area creation
    const minX = Math.min(eventAreaStartPos.x, x);
    const minY = Math.min(eventAreaStartPos.y, y);
    const maxX = Math.max(eventAreaStartPos.x, x);
    const maxY = Math.max(eventAreaStartPos.y, y);

    const newArea: EventArea = {
      id: `area-${Date.now()}`,
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      events: [],
      description: 'New event area',
    };

    // Add to map
    const updatedMap = {
      ...selectedMap,
      eventAreas: [...(selectedMap.eventAreas || []), newArea],
    };

    setSelectedMap(updatedMap);
    setSelectedEventArea(newArea.id);
    setIsCreatingEventArea(false);
    setEventAreaStartPos(null);
  }
};

/**
 * Grid click handler that routes to appropriate tool handler
 */
const handleGridClick = (x: number, y: number) => {
  switch (selectedTool) {
    case "paint":
      handlePaintClick(x, y);
      break;
    case "object":
      handleObjectClick(x, y);
      break;
    case "spawn":
      handleSpawnClick(x, y);
      break;
    case "encounter":
      handleEncounterClick(x, y);
      break;
    case "events":
      handleEventAreaGridClick(x, y);
      break;
  }
};
```

**Testing Checkpoint:**
- Click once to start event area creation
- Click again to complete rectangle
- New event area appears in overlay
- Event area has unique ID and correct bounds

### Step 11.4: Create Event Area Properties Panel

**File:** `react-app/src/components/developer/EventAreaPropertiesPanel.tsx`

Create new component for editing event area properties:

```typescript
import React from 'react';
import type { EventArea, AreaEvent } from '../../models/area/EventArea';
import { EventTrigger } from '../../models/area/EventTrigger';

interface EventAreaPropertiesPanelProps {
  eventArea: EventArea;
  onChange: (updated: EventArea) => void;
  onDelete: () => void;
}

export const EventAreaPropertiesPanel: React.FC<EventAreaPropertiesPanelProps> = ({
  eventArea,
  onChange,
  onDelete,
}) => {
  const handleFieldChange = (field: keyof EventArea, value: any) => {
    onChange({ ...eventArea, [field]: value });
  };

  const handleAddEvent = () => {
    const newEvent: AreaEvent = {
      id: `event-${Date.now()}`,
      trigger: EventTrigger.OnEnter,
      preconditions: [],
      actions: [],
      description: 'New event',
    };

    onChange({
      ...eventArea,
      events: [...eventArea.events, newEvent],
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    onChange({
      ...eventArea,
      events: eventArea.events.filter(e => e.id !== eventId),
    });
  };

  return (
    <div style={{ padding: '10px', backgroundColor: '#2a2a2a', color: 'white' }}>
      <h3>Event Area: {eventArea.id}</h3>

      {/* Basic properties */}
      <div style={{ marginBottom: '10px' }}>
        <label>
          ID:
          <input
            type="text"
            value={eventArea.id}
            onChange={(e) => handleFieldChange('id', e.target.value)}
            style={{ width: '100%', marginLeft: '5px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>
          Description:
          <input
            type="text"
            value={eventArea.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            style={{ width: '100%', marginLeft: '5px' }}
          />
        </label>
      </div>

      {/* Position and size (read-only for now) */}
      <div style={{ marginBottom: '10px', fontSize: '12px', opacity: 0.7 }}>
        Position: ({eventArea.x}, {eventArea.y})<br />
        Size: {eventArea.width} × {eventArea.height}
      </div>

      {/* Events list */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4>Events ({eventArea.events.length})</h4>
          <button onClick={handleAddEvent} style={{ padding: '5px 10px' }}>
            + Add Event
          </button>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px' }}>
          {eventArea.events.map((event, index) => (
            <div
              key={event.id}
              style={{
                padding: '10px',
                marginBottom: '5px',
                backgroundColor: '#3a3a3a',
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{event.id}</strong>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  style={{ padding: '2px 8px', fontSize: '12px' }}
                >
                  Delete
                </button>
              </div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                Trigger: {event.trigger}<br />
                Preconditions: {event.preconditions.length}<br />
                Actions: {event.actions.length}
                {event.oneTime && <><br />One-time event</>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete area button */}
      <button
        onClick={onDelete}
        style={{
          marginTop: '20px',
          padding: '10px',
          width: '100%',
          backgroundColor: '#d32f2f',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Delete Event Area
      </button>
    </div>
  );
};
```

**Testing Checkpoint:**
- Properties panel shows event area details
- Can edit ID and description
- Can add new events
- Can delete events
- Can delete entire event area

### Step 11.5: Create Event Editor Component

**File:** `react-app/src/components/developer/EventEditor.tsx`

Create detailed event editor:

```typescript
import React, { useState } from 'react';
import type { AreaEvent } from '../../models/area/EventArea';
import { EventTrigger } from '../../models/area/EventTrigger';
import { PreconditionBuilder } from './PreconditionBuilder';
import { ActionBuilder } from './ActionBuilder';

interface EventEditorProps {
  event: AreaEvent;
  onChange: (updated: AreaEvent) => void;
  onClose: () => void;
}

export const EventEditor: React.FC<EventEditorProps> = ({
  event,
  onChange,
  onClose,
}) => {
  const handleFieldChange = (field: keyof AreaEvent, value: any) => {
    onChange({ ...event, [field]: value });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        maxHeight: '80vh',
        backgroundColor: '#2a2a2a',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Edit Event: {event.id}</h2>
        <button onClick={onClose} style={{ padding: '5px 15px' }}>
          Close
        </button>
      </div>

      {/* Event ID */}
      <div style={{ marginBottom: '15px' }}>
        <label>
          Event ID:
          <input
            type="text"
            value={event.id}
            onChange={(e) => handleFieldChange('id', e.target.value)}
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
          />
        </label>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '15px' }}>
        <label>
          Description:
          <input
            type="text"
            value={event.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
          />
        </label>
      </div>

      {/* Trigger type */}
      <div style={{ marginBottom: '15px' }}>
        <label>
          Trigger:
          <select
            value={event.trigger}
            onChange={(e) => handleFieldChange('trigger', e.target.value)}
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
          >
            <option value={EventTrigger.OnEnter}>On Enter</option>
            <option value={EventTrigger.OnStep}>On Step</option>
            <option value={EventTrigger.OnExit}>On Exit</option>
          </select>
        </label>
      </div>

      {/* One-time checkbox */}
      <div style={{ marginBottom: '15px' }}>
        <label>
          <input
            type="checkbox"
            checked={event.oneTime || false}
            onChange={(e) => handleFieldChange('oneTime', e.target.checked)}
            style={{ marginRight: '10px' }}
          />
          One-time event (fires only once per game)
        </label>
      </div>

      {/* Preconditions section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Preconditions ({event.preconditions.length})</h3>
        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '10px' }}>
          All preconditions must be true for event to fire
        </div>

        <PreconditionBuilder
          preconditions={event.preconditions}
          onChange={(preconditions) => handleFieldChange('preconditions', preconditions)}
        />
      </div>

      {/* Actions section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Actions ({event.actions.length})</h3>
        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '10px' }}>
          Actions execute in order when event fires
        </div>

        <ActionBuilder
          actions={event.actions}
          onChange={(actions) => handleFieldChange('actions', actions)}
        />
      </div>
    </div>
  );
};
```

**Testing Checkpoint:**
- Event editor modal opens
- Can edit all event properties
- Trigger type dropdown works
- One-time checkbox works
- Precondition and action builders display

### Step 11.6: Create Precondition Builder Component

**File:** `react-app/src/components/developer/PreconditionBuilder.tsx`

```typescript
import React, { useState } from 'react';
import type { EventPrecondition } from '../../models/area/EventPrecondition';
import { GlobalVariableIs } from '../../models/area/preconditions/GlobalVariableIs';
import { GlobalVariableIsGreaterThan } from '../../models/area/preconditions/GlobalVariableIsGreaterThan';
import { GlobalVariableIsLessThan } from '../../models/area/preconditions/GlobalVariableIsLessThan';

interface PreconditionBuilderProps {
  preconditions: EventPrecondition[];
  onChange: (preconditions: EventPrecondition[]) => void;
}

type PreconditionType = 'GlobalVariableIs' | 'GlobalVariableIsGreaterThan' | 'GlobalVariableIsLessThan';

export const PreconditionBuilder: React.FC<PreconditionBuilderProps> = ({
  preconditions,
  onChange,
}) => {
  const [selectedType, setSelectedType] = useState<PreconditionType>('GlobalVariableIs');

  const handleAdd = () => {
    let newPrecondition: EventPrecondition;

    switch (selectedType) {
      case 'GlobalVariableIs':
        newPrecondition = new GlobalVariableIs('variable', true);
        break;
      case 'GlobalVariableIsGreaterThan':
        newPrecondition = new GlobalVariableIsGreaterThan('variable', 0);
        break;
      case 'GlobalVariableIsLessThan':
        newPrecondition = new GlobalVariableIsLessThan('variable', 0);
        break;
    }

    onChange([...preconditions, newPrecondition]);
  };

  const handleDelete = (index: number) => {
    onChange(preconditions.filter((_, i) => i !== index));
  };

  const handleEdit = (index: number, updated: EventPrecondition) => {
    const newPreconditions = [...preconditions];
    newPreconditions[index] = updated;
    onChange(newPreconditions);
  };

  return (
    <div>
      {/* Precondition list */}
      <div style={{ marginBottom: '10px' }}>
        {preconditions.map((precondition, index) => (
          <PreconditionEditor
            key={index}
            precondition={precondition}
            onChange={(updated) => handleEdit(index, updated)}
            onDelete={() => handleDelete(index)}
          />
        ))}
      </div>

      {/* Add new precondition */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as PreconditionType)}
          style={{ flex: 1, padding: '5px' }}
        >
          <option value="GlobalVariableIs">Variable Equals</option>
          <option value="GlobalVariableIsGreaterThan">Variable Greater Than</option>
          <option value="GlobalVariableIsLessThan">Variable Less Than</option>
        </select>
        <button onClick={handleAdd} style={{ padding: '5px 15px' }}>
          + Add
        </button>
      </div>
    </div>
  );
};

/**
 * Individual precondition editor
 */
const PreconditionEditor: React.FC<{
  precondition: EventPrecondition;
  onChange: (updated: EventPrecondition) => void;
  onDelete: () => void;
}> = ({ precondition, onChange, onDelete }) => {
  const renderFields = () => {
    if (precondition instanceof GlobalVariableIs) {
      return (
        <>
          <input
            type="text"
            value={precondition.variableName}
            onChange={(e) =>
              onChange(new GlobalVariableIs(e.target.value, precondition.expectedValue))
            }
            placeholder="Variable name"
            style={{ flex: 1, padding: '5px' }}
          />
          <input
            type="text"
            value={String(precondition.expectedValue)}
            onChange={(e) => {
              // Try to parse as number or boolean
              let value: string | number | boolean = e.target.value;
              if (value === 'true') value = true;
              else if (value === 'false') value = false;
              else if (!isNaN(Number(value))) value = Number(value);
              onChange(new GlobalVariableIs(precondition.variableName, value));
            }}
            placeholder="Expected value"
            style={{ flex: 1, padding: '5px' }}
          />
        </>
      );
    } else if (precondition instanceof GlobalVariableIsGreaterThan) {
      return (
        <>
          <input
            type="text"
            value={precondition.variableName}
            onChange={(e) =>
              onChange(new GlobalVariableIsGreaterThan(e.target.value, precondition.threshold))
            }
            placeholder="Variable name"
            style={{ flex: 1, padding: '5px' }}
          />
          <input
            type="number"
            value={precondition.threshold}
            onChange={(e) =>
              onChange(new GlobalVariableIsGreaterThan(precondition.variableName, Number(e.target.value)))
            }
            placeholder="Threshold"
            style={{ flex: 1, padding: '5px' }}
          />
        </>
      );
    } else if (precondition instanceof GlobalVariableIsLessThan) {
      return (
        <>
          <input
            type="text"
            value={precondition.variableName}
            onChange={(e) =>
              onChange(new GlobalVariableIsLessThan(e.target.value, precondition.threshold))
            }
            placeholder="Variable name"
            style={{ flex: 1, padding: '5px' }}
          />
          <input
            type="number"
            value={precondition.threshold}
            onChange={(e) =>
              onChange(new GlobalVariableIsLessThan(precondition.variableName, Number(e.target.value)))
            }
            placeholder="Threshold"
            style={{ flex: 1, padding: '5px' }}
          />
        </>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '5px',
        marginBottom: '5px',
        padding: '5px',
        backgroundColor: '#3a3a3a',
        borderRadius: '4px',
      }}
    >
      <div style={{ fontSize: '12px', padding: '5px', minWidth: '80px' }}>
        {precondition.type}
      </div>
      {renderFields()}
      <button onClick={onDelete} style={{ padding: '5px 10px' }}>
        X
      </button>
    </div>
  );
};
```

**Testing Checkpoint:**
- Can add new preconditions
- Can select precondition type
- Can edit precondition fields
- Can delete preconditions
- Value parsing works (string/number/boolean)

### Step 11.7: Create Action Builder Component

**File:** `react-app/src/components/developer/ActionBuilder.tsx`

```typescript
import React, { useState } from 'react';
import type { EventAction } from '../../models/area/EventAction';
import { ShowMessage } from '../../models/area/actions/ShowMessage';
import { Teleport } from '../../models/area/actions/Teleport';
import { Rotate } from '../../models/area/actions/Rotate';
import { StartEncounter } from '../../models/area/actions/StartEncounter';
import { SetGlobalVariable } from '../../models/area/actions/SetGlobalVariable';
import type { CardinalDirection } from '../../models/area/InteractiveObject';

interface ActionBuilderProps {
  actions: EventAction[];
  onChange: (actions: EventAction[]) => void;
}

type ActionType = 'ShowMessage' | 'Teleport' | 'Rotate' | 'StartEncounter' | 'SetGlobalVariable';

export const ActionBuilder: React.FC<ActionBuilderProps> = ({
  actions,
  onChange,
}) => {
  const [selectedType, setSelectedType] = useState<ActionType>('ShowMessage');

  const handleAdd = () => {
    let newAction: EventAction;

    switch (selectedType) {
      case 'ShowMessage':
        newAction = new ShowMessage('Your message here');
        break;
      case 'Teleport':
        newAction = new Teleport('map-id', 0, 0, 'North');
        break;
      case 'Rotate':
        newAction = new Rotate('North');
        break;
      case 'StartEncounter':
        newAction = new StartEncounter('encounter-id');
        break;
      case 'SetGlobalVariable':
        newAction = new SetGlobalVariable('variable', true);
        break;
    }

    onChange([...actions, newAction]);
  };

  const handleDelete = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const handleEdit = (index: number, updated: EventAction) => {
    const newActions = [...actions];
    newActions[index] = updated;
    onChange(newActions);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newActions = [...actions];
    [newActions[index - 1], newActions[index]] = [newActions[index], newActions[index - 1]];
    onChange(newActions);
  };

  const handleMoveDown = (index: number) => {
    if (index === actions.length - 1) return;
    const newActions = [...actions];
    [newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]];
    onChange(newActions);
  };

  return (
    <div>
      {/* Action list */}
      <div style={{ marginBottom: '10px' }}>
        {actions.map((action, index) => (
          <ActionEditor
            key={index}
            action={action}
            index={index}
            totalCount={actions.length}
            onChange={(updated) => handleEdit(index, updated)}
            onDelete={() => handleDelete(index)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
          />
        ))}
      </div>

      {/* Add new action */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ActionType)}
          style={{ flex: 1, padding: '5px' }}
        >
          <option value="ShowMessage">Show Message</option>
          <option value="Teleport">Teleport</option>
          <option value="Rotate">Rotate</option>
          <option value="StartEncounter">Start Encounter</option>
          <option value="SetGlobalVariable">Set Variable</option>
        </select>
        <button onClick={handleAdd} style={{ padding: '5px 15px' }}>
          + Add
        </button>
      </div>
    </div>
  );
};

/**
 * Individual action editor
 */
const ActionEditor: React.FC<{
  action: EventAction;
  index: number;
  totalCount: number;
  onChange: (updated: EventAction) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}> = ({ action, index, totalCount, onChange, onDelete, onMoveUp, onMoveDown }) => {
  const renderFields = () => {
    if (action instanceof ShowMessage) {
      return (
        <input
          type="text"
          value={action.message}
          onChange={(e) => onChange(new ShowMessage(e.target.value))}
          placeholder="Message text"
          style={{ flex: 1, padding: '5px' }}
        />
      );
    } else if (action instanceof Teleport) {
      return (
        <>
          <input
            type="text"
            value={action.targetMapId}
            onChange={(e) =>
              onChange(new Teleport(e.target.value, action.targetX, action.targetY, action.targetDirection))
            }
            placeholder="Map ID"
            style={{ flex: 1, padding: '5px' }}
          />
          <input
            type="number"
            value={action.targetX}
            onChange={(e) =>
              onChange(new Teleport(action.targetMapId, Number(e.target.value), action.targetY, action.targetDirection))
            }
            placeholder="X"
            style={{ width: '60px', padding: '5px' }}
          />
          <input
            type="number"
            value={action.targetY}
            onChange={(e) =>
              onChange(new Teleport(action.targetMapId, action.targetX, Number(e.target.value), action.targetDirection))
            }
            placeholder="Y"
            style={{ width: '60px', padding: '5px' }}
          />
          <select
            value={action.targetDirection}
            onChange={(e) =>
              onChange(new Teleport(action.targetMapId, action.targetX, action.targetY, e.target.value as CardinalDirection))
            }
            style={{ padding: '5px' }}
          >
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </>
      );
    } else if (action instanceof Rotate) {
      return (
        <select
          value={action.newDirection}
          onChange={(e) => onChange(new Rotate(e.target.value as CardinalDirection))}
          style={{ flex: 1, padding: '5px' }}
        >
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
        </select>
      );
    } else if (action instanceof StartEncounter) {
      return (
        <input
          type="text"
          value={action.encounterId}
          onChange={(e) => onChange(new StartEncounter(e.target.value))}
          placeholder="Encounter ID"
          style={{ flex: 1, padding: '5px' }}
        />
      );
    } else if (action instanceof SetGlobalVariable) {
      return (
        <>
          <input
            type="text"
            value={action.variableName}
            onChange={(e) =>
              onChange(new SetGlobalVariable(e.target.value, action.value))
            }
            placeholder="Variable name"
            style={{ flex: 1, padding: '5px' }}
          />
          <input
            type="text"
            value={String(action.value)}
            onChange={(e) => {
              let value: string | number | boolean = e.target.value;
              if (value === 'true') value = true;
              else if (value === 'false') value = false;
              else if (!isNaN(Number(value))) value = Number(value);
              onChange(new SetGlobalVariable(action.variableName, value));
            }}
            placeholder="Value"
            style={{ flex: 1, padding: '5px' }}
          />
        </>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '5px',
        marginBottom: '5px',
        padding: '5px',
        backgroundColor: '#3a3a3a',
        borderRadius: '4px',
        alignItems: 'center',
      }}
    >
      {/* Order controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          style={{ padding: '2px 6px', fontSize: '10px' }}
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === totalCount - 1}
          style={{ padding: '2px 6px', fontSize: '10px' }}
        >
          ▼
        </button>
      </div>

      <div style={{ fontSize: '12px', padding: '5px', minWidth: '100px' }}>
        {action.type}
      </div>
      {renderFields()}
      <button onClick={onDelete} style={{ padding: '5px 10px' }}>
        X
      </button>
    </div>
  );
};
```

**Testing Checkpoint:**
- Can add new actions
- Can select action type
- Can edit action-specific fields
- Can delete actions
- Can reorder actions (up/down arrows)
- All 5 action types work correctly

### Step 11.8: Update Export Function

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx` (update)

Update the YAML export function to include event areas:

```typescript
// Around line 191 in exportToYAML function
const exportToYAML = (map: AreaMap): string => {
  const json: any = {
    id: map.id,
    name: map.name,
    description: map.description,
    tilesetId: map.tilesetId,
    grid: gridToASCII(map),
    playerSpawn: map.playerSpawn,
    interactiveObjects: map.interactiveObjects,
    npcSpawns: map.npcSpawns,
    encounterZones: map.encounterZones,
    // ADD: Export event areas with serialized preconditions and actions
    eventAreas: map.eventAreas?.map(area => ({
      id: area.id,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      description: area.description,
      events: area.events.map(event => ({
        id: event.id,
        trigger: event.trigger,
        oneTime: event.oneTime,
        description: event.description,
        preconditions: event.preconditions.map(p => p.toJSON()),
        actions: event.actions.map(a => a.toJSON()),
      })),
    })),
  };

  return yaml.stringify(json);
};
```

**Testing Checkpoint:**
- Export includes eventAreas section
- Preconditions serialize correctly (toJSON)
- Actions serialize correctly (toJSON)
- Exported YAML can be re-imported

### Step 11.9: Integrate Components into Main Panel

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx` (update)

Wire up all the new components:

```typescript
// Add state for event editing
const [editingEvent, setEditingEvent] = useState<AreaEvent | null>(null);
const [editingEventAreaId, setEditingEventAreaId] = useState<string | null>(null);

// In render method
return (
  <div style={{ /* existing styles */ }}>
    {/* Existing tool selection, map list, etc. */}

    {/* Event area overlays */}
    {renderEventAreaOverlays()}

    {/* Side panel content */}
    <div style={{ /* existing panel styles */ }}>
      {selectedTool === 'events' && selectedEventArea && selectedMap && (
        <EventAreaPropertiesPanel
          eventArea={selectedMap.eventAreas!.find(a => a.id === selectedEventArea)!}
          onChange={(updated) => {
            const updatedMap = {
              ...selectedMap,
              eventAreas: selectedMap.eventAreas!.map(a =>
                a.id === selectedEventArea ? updated : a
              ),
            };
            setSelectedMap(updatedMap);
          }}
          onDelete={() => {
            const updatedMap = {
              ...selectedMap,
              eventAreas: selectedMap.eventAreas!.filter(a => a.id !== selectedEventArea),
            };
            setSelectedMap(updatedMap);
            setSelectedEventArea(null);
          }}
        />
      )}

      {/* Other tool panels */}
    </div>

    {/* Event editor modal (overlays everything) */}
    {editingEvent && editingEventAreaId && (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 999,
          }}
          onClick={() => setEditingEvent(null)}
        />

        {/* Editor */}
        <EventEditor
          event={editingEvent}
          onChange={(updated) => {
            const updatedMap = {
              ...selectedMap!,
              eventAreas: selectedMap!.eventAreas!.map(area =>
                area.id === editingEventAreaId
                  ? {
                      ...area,
                      events: area.events.map(e =>
                        e.id === updated.id ? updated : e
                      ),
                    }
                  : area
              ),
            };
            setSelectedMap(updatedMap);
            setEditingEvent(updated);
          }}
          onClose={() => setEditingEvent(null)}
        />
      </>
    )}
  </div>
);
```

**Testing Checkpoint:**
- Event properties panel shows when event area selected
- Clicking event in list opens event editor modal
- Event editor modal appears with backdrop
- Closing modal returns to properties panel
- All edits persist in selectedMap state

### Phase 11 Validation

**Comprehensive Test Checklist:**

✅ **Tool Selection**
- Events tool appears in tool list
- Clicking events tool activates event editing mode
- Other tools deactivate when events tool selected

✅ **Event Area Visualization**
- Event areas display as colored overlays on grid
- Selected event area highlights differently
- Event area labels show ID and event count
- Overlays update when areas added/removed

✅ **Event Area Creation**
- Click-drag creates new event area
- Created area has correct bounds (min/max calculation)
- New area appears in overlay immediately
- New area has unique auto-generated ID

✅ **Event Area Editing**
- Can edit event area ID
- Can edit event area description
- Can view position and size (read-only)
- Can delete event area
- Changes persist in map state

✅ **Event Management**
- Can add new events to area
- Can delete events from area
- Can click event to open editor
- Event list shows summary (trigger, counts)

✅ **Event Editing**
- Can edit event ID and description
- Can change trigger type (OnEnter/OnStep/OnExit)
- Can toggle one-time checkbox
- Modal closes and saves changes

✅ **Precondition Building**
- Can add all 3 precondition types
- Can edit precondition fields
- Can delete preconditions
- Value parsing works (string/number/boolean)

✅ **Action Building**
- Can add all 5 action types
- Can edit action-specific fields
- Can delete actions
- Can reorder actions (important for execution order!)
- All field types work (text, number, dropdown)

✅ **YAML Export**
- Export includes eventAreas section
- Preconditions serialize via toJSON()
- Actions serialize via toJSON()
- Exported YAML is valid and re-importable

✅ **Integration**
- All components work together
- State updates propagate correctly
- No console errors
- UI is responsive and intuitive

**Run Final Tests:**
```bash
npm run build
# Manual testing in developer panel
```

### Phase 11 Implementation Notes

**State Management:**
- EventArea and AreaEvent changes update AreaMap in component state
- Changes persist until user clicks "Export to YAML"
- No auto-save to avoid accidental overwrites

**UI/UX Considerations:**
- Visual overlays make event areas discoverable
- Color coding helps distinguish selected vs unselected
- Modal editor prevents cluttering main panel
- Action reordering is critical (execution order matters!)
- Value type inference makes editing easier (auto-detect number/boolean)

**Extensibility:**
- Easy to add new precondition types (update dropdown + factory)
- Easy to add new action types (update dropdown + factory)
- Component structure is modular and reusable

**Performance:**
- Overlays use CSS positioning (no canvas redraw)
- State updates are localized to affected components
- No unnecessary re-renders

**Known Limitations:**
- Event area position/size not editable via UI (use delete + recreate)
- No undo/redo functionality
- No copy/paste for events
- No validation for duplicate IDs (user responsibility)

**Future Enhancements (Out of Scope):**
- Drag handles to resize event areas
- Copy/paste events between areas
- Event area templates library
- Visual trigger type indicators on overlay
- Event testing mode (simulate player movement)
- Undo/redo stack

---

## Updated Success Criteria

This implementation is complete when all Phase 1-10 criteria are met PLUS:

11. ✅ Developer panel has "Events" tool mode
12. ✅ Event areas display as visual overlays on grid
13. ✅ Can create event areas with click-drag
14. ✅ Can edit event area properties (ID, description)
15. ✅ Can add/delete events in event areas
16. ✅ Event editor modal opens for detailed editing
17. ✅ Can configure all trigger types
18. ✅ Can add/edit/delete all 3 precondition types
19. ✅ Can add/edit/delete/reorder all 5 action types
20. ✅ Export to YAML includes complete event area data

## Updated Estimated Complexity

**Total Duration:** 20-26 hours (was 12-16 hours)

- Phases 1-10: 12-16 hours (unchanged)
- **Phase 11: Developer Panel Integration - 8-10 hours**
  - Step 11.1: Tool selection - 0.5 hours
  - Step 11.2: Visual overlay - 1 hour
  - Step 11.3: Area creation - 1 hour
  - Step 11.4: Properties panel - 1 hour
  - Step 11.5: Event editor - 1.5 hours
  - Step 11.6: Precondition builder - 1.5 hours
  - Step 11.7: Action builder - 2 hours
  - Step 11.8: Export update - 0.5 hours
  - Step 11.9: Integration - 1 hour

**Risk Level:** Low-Medium (unchanged)

- UI complexity is moderate
- State management straightforward (local component state)
- Follows existing panel patterns
- Main risk: Component integration and state updates

---

**End of Implementation Plan**

For design details, see [EventSystemOverview.md](./EventSystemOverview.md)

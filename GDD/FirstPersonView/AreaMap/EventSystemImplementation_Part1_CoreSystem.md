# Event System Implementation - Part 1: Core System

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [EventSystemImplementationPlan.md](./EventSystemImplementationPlan.md), [EventSystemOverview.md](./EventSystemOverview.md)

## Purpose

This document covers Phases 1-6 of the Event System implementation, focusing on building the core event system infrastructure without UI or game integration. By the end of this part, you will have a fully testable event system with comprehensive unit tests.

## Scope: Phases 1-6

- **Phase 1:** Core Type Definitions
- **Phase 2:** Event Trigger System
- **Phase 3:** Precondition System
- **Phase 4:** Action System
- **Phase 5:** EventArea and AreaEvent Implementation
- **Phase 6:** EventProcessor Implementation

## Duration Estimate

**10-12 hours total**

## Prerequisites

Before starting:
- ✅ Read [EventSystemOverview.md](./EventSystemOverview.md) completely
- ✅ Read [GeneralGuidelines.md](../../../GeneralGuidelines.md) sections:
  - "State Management" - Immutable updates, const object pattern
  - "TypeScript Patterns" - Const objects instead of enums
  - "Performance Patterns" - Caching, object pooling
- ✅ Understand that this part does NOT integrate with the game yet

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

**File:** `react-app/src/models/area/index.ts` (update)

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

**Goal:** Implement trigger detection logic.

**Duration:** 30 minutes

**Dependencies:** Phase 1

### Step 2.1: Add Helper Methods to EventArea

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

### Phase 2 Validation

✅ Helper functions compile
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

### Step 4.1: Update GameState Interface

**File:** `react-app/src/models/area/EventPrecondition.ts` (update)

Add necessary fields to GameState interface:

```typescript
import type { CardinalDirection } from './InteractiveObject';

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
  triggeredEventIds?: Set<string>;
  // ... other game state fields
}
```

### Step 4.2: Implement ShowMessage Action

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

### Step 4.3: Implement Teleport Action

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

### Step 4.4: Implement Rotate Action

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

### Step 4.5: Implement StartEncounter Action

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

### Step 4.6: Implement SetGlobalVariable Action

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

### Step 4.7: Create Action Factory

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

### Step 4.8: Create Action Index

**File:** `react-app/src/models/area/actions/index.ts`

```typescript
export * from './ShowMessage';
export * from './Teleport';
export * from './Rotate';
export * from './StartEncounter';
export * from './SetGlobalVariable';
export * from './ActionFactory';
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

**Goal:** Complete implementation with helper methods (already done in Phase 2).

**Duration:** 1 hour

**Dependencies:** Phases 2, 3, 4

This phase is mostly complete from Phase 2. Verify all helper methods are in place.

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

## Part 1 Completion Checklist

✅ **Phase 1: Core Type Definitions**
- EventTrigger type and type guard
- EventPrecondition interface
- EventAction interface
- EventArea and AreaEvent interfaces
- Index exports

✅ **Phase 2: Event Trigger System**
- Helper functions for position checking
- Helper functions for filtering events

✅ **Phase 3: Precondition System**
- GlobalVariableIs implementation
- GlobalVariableIsGreaterThan implementation
- GlobalVariableIsLessThan implementation
- PreconditionFactory
- Comprehensive tests

✅ **Phase 4: Action System**
- ShowMessage implementation
- Teleport implementation
- Rotate implementation
- StartEncounter implementation
- SetGlobalVariable implementation
- ActionFactory
- Comprehensive tests

✅ **Phase 5: EventArea Implementation**
- All helper methods in place

✅ **Phase 6: EventProcessor**
- Movement processing algorithm
- Trigger detection (OnEnter/OnStep/OnExit)
- Precondition evaluation
- Action execution
- One-time event tracking
- Comprehensive tests

## Final Validation

**Run all tests:**
```bash
npm test
npm run build
```

**Expected Results:**
- All tests pass
- No TypeScript compilation errors
- No console warnings
- Event system is fully functional (isolated from game)

## Next Steps

After Part 1 is complete, proceed to:
- **Part 2: Integration & Data** - Connect event system to AreaMap, YAML parsing, and FirstPersonView
- **Part 3: Developer Tools & Polish** - Build visual event editor and create example content

---

**End of Part 1 Implementation Document**

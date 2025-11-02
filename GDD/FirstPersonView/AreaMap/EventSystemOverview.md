# Area Map Event System - Design Document

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [AreaMapSystemOverview.md](./AreaMapSystemOverview.md), [AreaMapImplementationPlan.md](./AreaMapImplementationPlan.md), [GeneralGuidelines.md](../../../GeneralGuidelines.md)

## Purpose

This document describes the Event System for AreaMaps. Events allow maps to respond dynamically to player movement with location-based triggers (EventAreas) that can execute actions (show messages, teleport, start encounters, etc.) when certain conditions (preconditions) are met.

## Feature Summary

The Event System provides:
- **EventArea**: Rectangular zones on the map that trigger events based on player position
- **Event Triggers**: OnEnter, OnStep, OnExit - different activation patterns
- **Preconditions**: Conditional logic to determine if an event should fire (global variable checks)
- **Event Actions**: Effects that occur when an event triggers (messages, teleportation, encounters, variable changes)
- **Global Variable System**: String-keyed value store for tracking game state
- **State Tracking**: Events remember which areas the player was in to handle OnExit correctly

## Core Concepts

### Event Flow

```
Player moves to new position
    ↓
Check all EventAreas containing player
    ↓
For each EventArea:
    ↓
For each Event in EventArea:
    ↓
Does Trigger Type match? (OnEnter/OnStep/OnExit)
    ↓
Do ALL Preconditions pass?
    ↓
Execute ALL Event Actions in order
    ↓
Continue to next event/area
```

### Event Types

**OnEnter Event**
- **Triggers**: When player moves INTO an EventArea (they were NOT in it before)
- **Use Case**: "Welcome to the Dark Forest" message when first entering area
- **Frequency**: Once per entry into the area
- **Example**: Player at (5,5) moves to (6,6) which is inside EventArea-1 for first time

**OnStep Event**
- **Triggers**: Every time player lands on ANY tile within EventArea
- **Use Case**: Damaging lava floor that hurts every step
- **Frequency**: Every movement within the area
- **Example**: Player at (6,6) moves to (6,7), both inside EventArea-2

**OnExit Event**
- **Triggers**: When player moves OUT OF an EventArea (they were in it before)
- **Use Case**: "You leave the safety of the town" message
- **Frequency**: Once per exit from the area
- **Example**: Player at (6,6) inside EventArea-1 moves to (5,5) outside EventArea-1

### EventArea Structure

An EventArea defines a rectangular region with multiple events:

```typescript
interface EventArea {
  id: string;                    // Unique identifier
  x: number;                     // Top-left X coordinate
  y: number;                     // Top-left Y coordinate
  width: number;                 // Width in tiles
  height: number;                // Height in tiles
  events: AreaEvent[];           // Events that can trigger in this area
  description?: string;          // Human-readable description
}
```

**Key Properties:**
- Rectangular bounds (x, y, width, height)
- Can overlap with other EventAreas (multiple areas can contain same tile)
- Contains array of events, all tied to this area
- Events fire independently (multiple events can trigger from same movement)

### AreaEvent Structure

An AreaEvent defines when and what happens:

```typescript
interface AreaEvent {
  id: string;                    // Unique identifier (within area)
  trigger: EventTrigger;         // When to fire (OnEnter/OnStep/OnExit)
  preconditions: EventPrecondition[];  // Conditions that must ALL be true
  actions: EventAction[];        // Actions to execute in order
  oneTime?: boolean;             // If true, event only triggers once ever
  triggered?: boolean;           // Tracks if one-time event has fired
  description?: string;          // Human-readable description
}
```

**Event Lifecycle:**
1. Trigger type checked (based on player movement)
2. All preconditions evaluated (must ALL pass)
3. If preconditions pass, actions execute sequentially
4. If oneTime flag set, mark as triggered (won't fire again)

### Event Triggers

```typescript
export const EventTrigger = {
  OnEnter: "on-enter",     // Fire when player enters area (wasn't in it before)
  OnStep: "on-step",       // Fire every step within area
  OnExit: "on-exit",       // Fire when player exits area (was in it before)
} as const;

export type EventTrigger = typeof EventTrigger[keyof typeof EventTrigger];
```

**Trigger Detection Logic:**
- Requires tracking previous player position and active event areas
- Compare previous active areas with current active areas
- OnEnter: Area is in current but NOT in previous
- OnStep: Area is in BOTH current AND previous
- OnExit: Area is in previous but NOT in current

### Event Preconditions

Preconditions gate whether an event fires. ALL preconditions must pass.

```typescript
/**
 * Base interface for event preconditions
 */
export interface EventPrecondition {
  type: string;
  toJSON(): EventPreconditionJSON;
  evaluate(state: GameState): boolean;
}

/**
 * Checks if global variable equals a specific value
 */
export class GlobalVariableIs implements EventPrecondition {
  type = "GlobalVariableIs";

  constructor(
    public variableName: string,
    public expectedValue: string | number | boolean
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
}

/**
 * Checks if global variable (number) is greater than threshold
 */
export class GlobalVariableIsGreaterThan implements EventPrecondition {
  type = "GlobalVariableIsGreaterThan";

  constructor(
    public variableName: string,
    public threshold: number
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
}

/**
 * Checks if global variable (number) is less than threshold
 */
export class GlobalVariableIsLessThan implements EventPrecondition {
  type = "GlobalVariableIsLessThan";

  constructor(
    public variableName: string,
    public threshold: number
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
}
```

**Precondition Evaluation:**
- All preconditions in an event must return `true`
- If any precondition returns `false`, event does not fire
- Preconditions have access to global game state
- Preconditions do NOT modify state (pure functions)

### Event Actions

Actions define what happens when an event fires. Execute sequentially.

```typescript
/**
 * Base interface for event actions
 */
export interface EventAction {
  type: string;
  toJSON(): EventActionJSON;
  execute(state: GameState): GameState;
}

/**
 * Shows a message in the player's log/message area
 */
export class ShowMessage implements EventAction {
  type = "ShowMessage";

  constructor(public message: string) {}

  execute(state: GameState): GameState {
    // Add message to player message log
    return {
      ...state,
      messageLog: [...state.messageLog, {
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
}

/**
 * Teleports player to a different map and position
 */
export class Teleport implements EventAction {
  type = "Teleport";

  constructor(
    public targetMapId: string,
    public targetX: number,
    public targetY: number,
    public targetDirection: CardinalDirection
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
}

/**
 * Rotates the player to face a specific direction
 */
export class Rotate implements EventAction {
  type = "Rotate";

  constructor(public newDirection: CardinalDirection) {}

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
}

/**
 * Starts a combat encounter
 */
export class StartEncounter implements EventAction {
  type = "StartEncounter";

  constructor(public encounterId: string) {}

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
}

/**
 * Sets a global variable to a specific value
 */
export class SetGlobalVariable implements EventAction {
  type = "SetGlobalVariable";

  constructor(
    public variableName: string,
    public value: string | number | boolean
  ) {}

  execute(state: GameState): GameState {
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
}
```

**Action Execution:**
- Actions execute in order defined in event
- Each action receives game state, returns modified game state
- Actions CAN modify state (side effects)
- Failed actions should log errors but not crash
- Later actions receive state modified by earlier actions

### Global Variable System

Global variables are string-keyed values used for game state tracking.

```typescript
/**
 * Global variable store (part of GameState)
 */
interface GameState {
  globalVariables: Map<string, string | number | boolean>;
  // ... other game state fields
}
```

**Variable Naming Conventions:**
- Use descriptive names: `"has-dark-forest-key"`, `"wolves-defeated-count"`, `"town-reputation"`
- Boolean flags: `"has-*"`, `"is-*"`, `"visited-*"`
- Counters: `"*-count"`, `"*-times"`
- States: `"*-state"`, `"*-status"`

**Variable Types:**
- `string`: IDs, states, text values
- `number`: Counters, thresholds, numeric values
- `boolean`: Flags, toggles

**Variable Lifecycle:**
- Created: When SetGlobalVariable action executes
- Read: By preconditions during event evaluation
- Modified: By SetGlobalVariable action (overwrites)
- Persisted: Saved with game state (serialization)

### Event State Tracking

The event system must track which EventAreas the player was in during previous frame.

```typescript
/**
 * Event tracking state (part of GameState or FirstPersonViewState)
 */
interface EventSystemState {
  /**
   * IDs of EventAreas that contained player in previous frame
   */
  previousActiveEventAreas: Set<string>;

  /**
   * IDs of events that have been triggered (for oneTime events)
   */
  triggeredEventIds: Set<string>;
}
```

**Tracking Logic:**
1. After player movement, calculate current active event areas
2. Compare with `previousActiveEventAreas` to determine triggers
3. Fire appropriate events (OnEnter/OnStep/OnExit)
4. Update `previousActiveEventAreas` with current active areas
5. If event has `oneTime: true` and fires, add to `triggeredEventIds`

## Data Structures

### EventArea

```typescript
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
```

### AreaEvent

```typescript
export interface AreaEvent {
  /**
   * Unique identifier (within parent EventArea)
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
```

### EventTrigger Type

```typescript
export const EventTrigger = {
  OnEnter: "on-enter",
  OnStep: "on-step",
  OnExit: "on-exit",
} as const;

export type EventTrigger = typeof EventTrigger[keyof typeof EventTrigger];

export function isEventTrigger(value: string): value is EventTrigger {
  return Object.values(EventTrigger).includes(value as EventTrigger);
}
```

### JSON Serialization Types

```typescript
export interface EventAreaJSON {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  events: AreaEventJSON[];
  description?: string;
}

export interface AreaEventJSON {
  id: string;
  trigger: EventTrigger;
  preconditions: EventPreconditionJSON[];
  actions: EventActionJSON[];
  oneTime?: boolean;
  triggered?: boolean;
  description?: string;
}

export interface EventPreconditionJSON {
  type: string;
  [key: string]: unknown;
}

export interface EventActionJSON {
  type: string;
  [key: string]: unknown;
}
```

## YAML Definition Format

### EventArea Definition in AreaMap YAML

```yaml
areas:
  - id: forest-entrance
    name: "Forest Entrance"
    tilesetId: forest-outdoor
    grid: |-
      TTTTTTTTTTT
      T.........T
      T.........T
      T.....D...T
      T.........T
      TTTTTTTTTTT
    playerSpawn: { x: 5, y: 3, direction: North }

    # Event areas defined here
    eventAreas:
      # Welcome message when entering forest
      - id: forest-entry-zone
        x: 1
        y: 1
        width: 9
        height: 4
        description: "Triggers when player first enters forest"
        events:
          # OnEnter event with precondition
          - id: first-visit-message
            trigger: on-enter
            oneTime: true
            description: "Shows welcome message on first visit only"
            preconditions:
              - type: GlobalVariableIs
                variableName: "visited-forest"
                expectedValue: false
            actions:
              - type: ShowMessage
                message: "You enter the Dark Forest. An eerie silence surrounds you."
              - type: SetGlobalVariable
                variableName: "visited-forest"
                value: true

      # Encounter zone that triggers if player hasn't defeated wolves
      - id: wolf-ambush-zone
        x: 4
        y: 1
        width: 3
        height: 3
        description: "Wolf ambush area"
        events:
          - id: wolf-encounter
            trigger: on-step
            oneTime: true
            description: "Triggers wolf combat on first step in area"
            preconditions:
              - type: GlobalVariableIs
                variableName: "wolves-defeated"
                expectedValue: false
            actions:
              - type: ShowMessage
                message: "A pack of wolves emerges from the trees!"
              - type: StartEncounter
                encounterId: "forest-wolves-1"

      # Damage zone (lava floor)
      - id: lava-floor
        x: 2
        y: 4
        width: 7
        height: 1
        description: "Damaging lava floor"
        events:
          - id: lava-damage
            trigger: on-step
            description: "Deals damage every step on lava"
            preconditions: []  # No preconditions, always fires
            actions:
              - type: ShowMessage
                message: "The searing heat burns your feet! You take 5 damage."
              # Future: DealDamage action

      # Exit message
      - id: forest-exit-zone
        x: 5
        y: 3
        width: 1
        height: 1
        description: "Doorway out of forest"
        events:
          - id: leaving-forest
            trigger: on-exit
            description: "Message when leaving through doorway"
            preconditions: []
            actions:
              - type: ShowMessage
                message: "You leave the Dark Forest behind."
              - type: Teleport
                targetMapId: "town-square"
                targetX: 10
                targetY: 10
                targetDirection: South
```

### Complete Example: Quest Event Chain

```yaml
areas:
  - id: treasure-vault
    name: "Ancient Vault"
    tilesetId: dungeon-grey-stone
    grid: |-
      ##########
      #........#
      #...C....#
      #........#
      #....D...#
      ##########
    playerSpawn: { x: 5, y: 4, direction: North }

    eventAreas:
      # Locked door requires key
      - id: vault-door
        x: 5
        y: 4
        width: 1
        height: 1
        events:
          # Try to enter without key
          - id: door-locked-message
            trigger: on-enter
            preconditions:
              - type: GlobalVariableIs
                variableName: "has-vault-key"
                expectedValue: false
            actions:
              - type: ShowMessage
                message: "The vault door is sealed. You need a key."
              - type: Rotate
                newDirection: South  # Turn player around

          # Enter with key
          - id: door-unlock
            trigger: on-enter
            oneTime: true
            preconditions:
              - type: GlobalVariableIs
                variableName: "has-vault-key"
                expectedValue: true
            actions:
              - type: ShowMessage
                message: "The key fits perfectly. The vault opens."
              - type: SetGlobalVariable
                variableName: "vault-unlocked"
                value: true

      # Treasure chest area
      - id: treasure-chest-area
        x: 4
        y: 2
        width: 1
        height: 1
        events:
          # Chest requires vault to be unlocked
          - id: chest-locked
            trigger: on-step
            preconditions:
              - type: GlobalVariableIs
                variableName: "vault-unlocked"
                expectedValue: false
            actions:
              - type: ShowMessage
                message: "You can't reach the chest. The vault is sealed."

          # Open chest when vault unlocked
          - id: chest-open
            trigger: on-step
            oneTime: true
            preconditions:
              - type: GlobalVariableIs
                variableName: "vault-unlocked"
                expectedValue: true
              - type: GlobalVariableIs
                variableName: "chest-opened"
                expectedValue: false
            actions:
              - type: ShowMessage
                message: "You open the ancient chest and find the legendary sword!"
              - type: SetGlobalVariable
                variableName: "chest-opened"
                value: true
              - type: SetGlobalVariable
                variableName: "has-legendary-sword"
                value: true
```

## Integration with AreaMap

### Adding EventAreas to AreaMap

Update `AreaMap` class:

```typescript
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
   * Gets all event areas that contain the specified position
   */
  getEventAreasAt(x: number, y: number): EventArea[] {
    if (!this.eventAreas) {
      return [];
    }

    return this.eventAreas.filter(area =>
      x >= area.x &&
      x < area.x + area.width &&
      y >= area.y &&
      y < area.y + area.height
    );
  }

  /**
   * Gets a specific event area by ID
   */
  getEventAreaById(id: string): EventArea | undefined {
    return this.eventAreas?.find(area => area.id === id);
  }
}
```

### Update AreaMapJSON

```typescript
export interface AreaMapJSON {
  // ... existing fields
  eventAreas?: EventAreaJSON[];
}
```

## Event Processing System

### EventProcessor Class

```typescript
/**
 * Processes events based on player movement
 */
export class EventProcessor {
  /**
   * Process movement and trigger appropriate events
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

    // Get previous and current active event areas
    const previousAreas = new Set(areaMap.getEventAreasAt(previousX, previousY).map(a => a.id));
    const currentAreas = new Set(areaMap.getEventAreasAt(currentX, currentY).map(a => a.id));

    // Determine which areas were entered, stepped in, or exited
    const enteredAreas = Array.from(currentAreas).filter(id => !previousAreas.has(id));
    const stayedInAreas = Array.from(currentAreas).filter(id => previousAreas.has(id));
    const exitedAreas = Array.from(previousAreas).filter(id => !currentAreas.has(id));

    // Process OnExit events first (player leaving areas)
    for (const areaId of exitedAreas) {
      const area = areaMap.getEventAreaById(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnExit);
      }
    }

    // Process OnEnter events (player entering new areas)
    for (const areaId of enteredAreas) {
      const area = areaMap.getEventAreaById(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnEnter);
      }
    }

    // Process OnStep events (player still in areas)
    for (const areaId of stayedInAreas) {
      const area = areaMap.getEventAreaById(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnStep);
      }
    }

    return newState;
  }

  /**
   * Process all events in an area with matching trigger type
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
      if (event.oneTime && newState.triggeredEventIds.has(event.id)) {
        continue;
      }

      // Evaluate all preconditions
      const allPreconditionsPass = event.preconditions.every(precondition =>
        precondition.evaluate(newState)
      );

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
        const newTriggeredIds = new Set(newState.triggeredEventIds);
        newTriggeredIds.add(event.id);
        newState = {
          ...newState,
          triggeredEventIds: newTriggeredIds,
        };
      }
    }

    return newState;
  }
}
```

### Integration with FirstPersonView

```typescript
// In FirstPersonInputHandler or movement system

// After successful movement validation
const result = validateMovement(areaMap, playerX, playerY, direction);

if (result.success) {
  const previousX = playerX;
  const previousY = playerY;
  const newX = result.finalX;
  const newY = result.finalY;

  // Update player position
  setPlayerPosition(newX, newY);

  // Process events
  const eventProcessor = new EventProcessor();
  const newGameState = eventProcessor.processMovement(
    gameState,
    areaMap,
    previousX,
    previousY,
    newX,
    newY
  );

  // Update game state
  setGameState(newGameState);
}
```

## Future Extensions

### Additional Preconditions

**ItemInInventory**
```typescript
class ItemInInventory implements EventPrecondition {
  constructor(public itemId: string, public quantity: number = 1) {}

  evaluate(state: GameState): boolean {
    return state.inventory.has(this.itemId) &&
           state.inventory.getQuantity(this.itemId) >= this.quantity;
  }
}
```

**QuestCompleted**
```typescript
class QuestCompleted implements EventPrecondition {
  constructor(public questId: string) {}

  evaluate(state: GameState): boolean {
    return state.completedQuests.has(this.questId);
  }
}
```

**TimeOfDay**
```typescript
class TimeOfDay implements EventPrecondition {
  constructor(public minHour: number, public maxHour: number) {}

  evaluate(state: GameState): boolean {
    const hour = state.gameTime.hour;
    return hour >= this.minHour && hour <= this.maxHour;
  }
}
```

**PartySize**
```typescript
class PartySize implements EventPrecondition {
  constructor(public comparison: '<' | '>' | '=', public size: number) {}

  evaluate(state: GameState): boolean {
    const partySize = state.party.length;
    switch (this.comparison) {
      case '<': return partySize < this.size;
      case '>': return partySize > this.size;
      case '=': return partySize === this.size;
    }
  }
}
```

### Additional Actions

**PlaySound**
```typescript
class PlaySound implements EventAction {
  constructor(public soundId: string, public volume: number = 1.0) {}

  execute(state: GameState): GameState {
    // Trigger sound system
    SoundManager.play(this.soundId, this.volume);
    return state;
  }
}
```

**SpawnNPC**
```typescript
class SpawnNPC implements EventAction {
  constructor(
    public npcId: string,
    public x: number,
    public y: number,
    public direction: CardinalDirection
  ) {}

  execute(state: GameState): GameState {
    // Add NPC to current map
    return {
      ...state,
      npcs: [...state.npcs, {
        id: this.npcId,
        x: this.x,
        y: this.y,
        direction: this.direction,
      }],
    };
  }
}
```

**ModifyTile**
```typescript
class ModifyTile implements EventAction {
  constructor(
    public x: number,
    public y: number,
    public newTileChar: string
  ) {}

  execute(state: GameState): GameState {
    // Change tile in current map (e.g., open secret passage)
    // Would require modifying AreaMap to be mutable or create new instance
    return state;
  }
}
```

**GiveItem**
```typescript
class GiveItem implements EventAction {
  constructor(public itemId: string, public quantity: number = 1) {}

  execute(state: GameState): GameState {
    return {
      ...state,
      inventory: state.inventory.add(this.itemId, this.quantity),
    };
  }
}
```

**DealDamage**
```typescript
class DealDamage implements EventAction {
  constructor(public amount: number, public damageType: string = "environmental") {}

  execute(state: GameState): GameState {
    // Damage player or party
    return {
      ...state,
      party: state.party.map(member => ({
        ...member,
        health: Math.max(0, member.health - this.amount),
      })),
    };
  }
}
```

**StartDialogue**
```typescript
class StartDialogue implements EventAction {
  constructor(public dialogueId: string) {}

  execute(state: GameState): GameState {
    return {
      ...state,
      dialogueState: {
        active: true,
        dialogueId: this.dialogueId,
      },
    };
  }
}
```

### Composite Preconditions

**AND Logic** (current default)
```yaml
preconditions:
  - type: GlobalVariableIs
    variableName: "has-key"
    expectedValue: true
  - type: GlobalVariableIsGreaterThan
    variableName: "gold"
    threshold: 100
# Both must be true
```

**OR Logic** (future)
```yaml
preconditions:
  - type: AnyOf
    conditions:
      - type: GlobalVariableIs
        variableName: "has-gold-key"
        expectedValue: true
      - type: GlobalVariableIs
        variableName: "has-silver-key"
        expectedValue: true
# Either can be true
```

**NOT Logic** (future)
```yaml
preconditions:
  - type: Not
    condition:
      type: GlobalVariableIs
      variableName: "wolves-defeated"
      expectedValue: true
# Inverts condition
```

## Guidelines Compliance

### ✅ Const Object Pattern (Not Enums)

```typescript
export const EventTrigger = {
  OnEnter: "on-enter",
  OnStep: "on-step",
  OnExit: "on-exit",
} as const;

export type EventTrigger = typeof EventTrigger[keyof typeof EventTrigger];
```

### ✅ Immutable State Updates

All actions return NEW game state:

```typescript
execute(state: GameState): GameState {
  return {
    ...state,
    globalVariables: new Map(state.globalVariables).set(name, value),
  };
}
```

### ✅ Type Guards

```typescript
export function isEventTrigger(value: string): value is EventTrigger {
  return Object.values(EventTrigger).includes(value as EventTrigger);
}
```

### ✅ Discriminated Unions for JSON

Preconditions and actions use `type` field for discrimination:

```typescript
interface EventPreconditionJSON {
  type: string;  // Discriminator
  [key: string]: unknown;
}
```

## Implementation Plan

See [EventSystemImplementationPlan.md](./EventSystemImplementationPlan.md) for detailed step-by-step implementation.

**Phases:**
1. Core Type Definitions (EventArea, AreaEvent, EventTrigger)
2. Precondition System (GlobalVariableIs, IsGreaterThan, IsLessThan)
3. Action System (ShowMessage, Teleport, Rotate, StartEncounter, SetGlobalVariable)
4. EventProcessor (movement detection, event triggering)
5. AreaMap Integration (add eventAreas field, serialization)
6. YAML Parsing (extend AreaMapParser for event areas)
7. FirstPersonView Integration (hook into movement system)
8. Testing (unit tests, integration tests, YAML examples)

## Testing Checklist

### Event Triggering
- [ ] OnEnter fires when player enters area (not in previous frame)
- [ ] OnStep fires every frame player is in area
- [ ] OnExit fires when player leaves area (was in previous frame)
- [ ] Multiple events in same area can all trigger
- [ ] Overlapping event areas both trigger correctly

### Preconditions
- [ ] GlobalVariableIs returns true for matching value
- [ ] GlobalVariableIs returns false for non-matching value
- [ ] GlobalVariableIsGreaterThan works with numbers
- [ ] GlobalVariableIsLessThan works with numbers
- [ ] All preconditions must pass for event to fire
- [ ] Event doesn't fire if any precondition fails

### Actions
- [ ] ShowMessage adds message to log
- [ ] Teleport changes map and position
- [ ] Rotate changes player direction
- [ ] StartEncounter triggers combat
- [ ] SetGlobalVariable creates/updates variable
- [ ] Actions execute in order
- [ ] Later actions receive state modified by earlier actions

### One-Time Events
- [ ] OneTime event fires only once per game
- [ ] OneTime event is saved in triggeredEventIds
- [ ] OneTime event doesn't fire again after reload

### Edge Cases
- [ ] Event areas at map edge work correctly
- [ ] Overlapping event areas don't interfere
- [ ] Player teleported by action doesn't trigger events at destination
- [ ] Empty preconditions array (always fires)
- [ ] Empty actions array (no-op event)

## Performance Considerations

### Event Area Lookup
- **Cost**: O(n) where n = number of event areas on map
- **Optimization**: Use spatial hash or quadtree for large maps (future)
- **Expected**: <10 event areas per map, negligible cost

### Event Processing
- **Worst Case**: All events check preconditions and fire
- **Typical**: 0-3 events fire per movement
- **Optimization**: Cache precondition results if expensive (future)

### Memory
- **EventArea Storage**: ~100 bytes per area
- **Global Variables**: Map<string, primitive>, ~10-100 entries typical
- **Triggered Event IDs**: Set<string>, grows with one-time events
- **Total**: <10KB per game session

## Success Criteria

This feature is complete when:
1. EventArea can be defined in YAML with rectangular bounds
2. Three trigger types work correctly (OnEnter, OnStep, OnExit)
3. Three precondition types work (GlobalVariableIs, IsGreaterThan, IsLessThan)
4. Five action types work (ShowMessage, Teleport, Rotate, StartEncounter, SetGlobalVariable)
5. Global variable system stores and retrieves values
6. EventProcessor correctly determines which events to fire
7. One-time events fire only once and persist across sessions
8. Events integrate with FirstPersonView movement system
9. YAML examples demonstrate common use cases
10. Tests pass for all core functionality

---

**Estimated Complexity**: Medium-High (12-16 hours)
- Core type definitions: 2 hours
- Precondition system: 2 hours
- Action system: 3 hours
- EventProcessor logic: 3 hours
- Integration: 2 hours
- YAML parsing: 2 hours
- Testing: 2-4 hours

**Risk Level**: Low-Medium
- Clear requirements
- Follows existing patterns
- No complex algorithms
- Main risk: State management complexity

## Dependencies

- **Requires**: AreaMap system (completed)
- **Requires**: Global game state management
- **Relates To**: FirstPersonView movement system
- **Relates To**: Combat encounter system (for StartEncounter)
- **Relates To**: Message/log system (for ShowMessage)

## Notes

- Event system is data-driven and easily extensible
- Preconditions and actions use plugin architecture (easy to add new types)
- Global variables provide flexible state tracking
- Event areas can overlap (multiple events from different areas can trigger)
- One-time events are saved globally (not per-area)
- Future: Consider event priority/ordering if needed
- Future: Consider event cancellation/interruption mechanisms

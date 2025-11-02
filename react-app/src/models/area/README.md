# Area Map Event System

## Overview

The Event System allows you to trigger actions based on player movement within defined areas on maps. Events can show messages, modify variables, teleport players, start combat encounters, and more.

## Quick Start

### Defining Events in YAML

```yaml
eventAreas:
  - id: my-event-area
    x: 5
    y: 5
    width: 3
    height: 3
    description: "Optional description"
    events:
      - id: my-event
        trigger: on-enter
        oneTime: true  # Optional: only fire once
        preconditions:
          - type: GlobalVariableIs
            variableName: "has-key"
            expectedValue: true
        actions:
          - type: ShowMessage
            message: "You unlocked the door!"
          - type: SetGlobalVariable
            variableName: "door-unlocked"
            value: true
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

Events fire based on player movement:

- **`on-enter`**: Fires when player enters area (was NOT in area previous frame)
- **`on-step`**: Fires every frame player is in area (was in area previous frame)
- **`on-exit`**: Fires when player exits area (was in area previous frame)

### Preconditions

All preconditions must be true for an event to fire:

#### GlobalVariableIs
Check if a variable equals a specific value.

```yaml
- type: GlobalVariableIs
  variableName: "has-key"
  expectedValue: true
```

#### GlobalVariableIsGreaterThan
Check if a number variable is greater than a threshold.

```yaml
- type: GlobalVariableIsGreaterThan
  variableName: "gold"
  threshold: 100
```

#### GlobalVariableIsLessThan
Check if a number variable is less than a threshold.

```yaml
- type: GlobalVariableIsLessThan
  variableName: "health"
  threshold: 10
```

### Actions

Actions execute in order when an event fires:

#### ShowMessage
Display a message to the player.

```yaml
- type: ShowMessage
  message: "You found a treasure chest!"
```

#### SetGlobalVariable
Set or update a global variable.

```yaml
- type: SetGlobalVariable
  variableName: "has-key"
  value: true
```

#### Teleport
Move player to a different map and position.

```yaml
- type: Teleport
  targetMapId: "dungeon-level-2"
  targetX: 5
  targetY: 10
  targetDirection: South
```

#### Rotate
Change the player's facing direction.

```yaml
- type: Rotate
  newDirection: North
```

#### StartEncounter
Trigger a combat encounter.

```yaml
- type: StartEncounter
  encounterId: "goblin-ambush"
```

## Common Patterns

### One-Time Pickup

```yaml
- id: treasure-chest
  x: 10
  y: 5
  width: 1
  height: 1
  events:
    - id: open-chest
      trigger: on-step
      oneTime: true
      preconditions: []
      actions:
        - type: ShowMessage
          message: "You found 100 gold!"
        - type: SetGlobalVariable
          variableName: "chest-1-opened"
          value: true
```

### Locked Door

```yaml
- id: locked-door
  x: 15
  y: 8
  width: 1
  height: 1
  events:
    # Door locked
    - id: door-locked-message
      trigger: on-step
      preconditions:
        - type: GlobalVariableIs
          variableName: "has-door-key"
          expectedValue: false
      actions:
        - type: ShowMessage
          message: "The door is locked."

    # Door unlocked
    - id: door-unlock
      trigger: on-step
      oneTime: true
      preconditions:
        - type: GlobalVariableIs
          variableName: "has-door-key"
          expectedValue: true
      actions:
        - type: ShowMessage
          message: "The door opens!"
        - type: Teleport
          targetMapId: "next-room"
          targetX: 2
          targetY: 2
          targetDirection: North
```

### Progressive Story

```yaml
- id: story-trigger
  x: 20
  y: 10
  width: 3
  height: 3
  events:
    # First visit
    - id: story-1
      trigger: on-enter
      oneTime: true
      preconditions:
        - type: GlobalVariableIs
          variableName: "story-progress"
          expectedValue: 0
      actions:
        - type: ShowMessage
          message: "You hear a strange noise..."
        - type: SetGlobalVariable
          variableName: "story-progress"
          value: 1

    # Second visit
    - id: story-2
      trigger: on-enter
      oneTime: true
      preconditions:
        - type: GlobalVariableIs
          variableName: "story-progress"
          expectedValue: 1
      actions:
        - type: ShowMessage
          message: "The noise is getting louder!"
        - type: SetGlobalVariable
          variableName: "story-progress"
          value: 2

    # Third visit - trigger encounter
    - id: story-3
      trigger: on-enter
      oneTime: true
      preconditions:
        - type: GlobalVariableIs
          variableName: "story-progress"
          expectedValue: 2
      actions:
        - type: ShowMessage
          message: "A monster appears!"
        - type: StartEncounter
          encounterId: "boss-fight"
```

## Best Practices

1. **Use descriptive IDs** - Make event IDs clear and unique (e.g., `entrance-welcome` not `event1`)

2. **One-time for important events** - Use `oneTime: true` for pickups, story triggers, etc.

3. **Test preconditions thoroughly** - Ensure variable names match exactly

4. **Order matters for actions** - Actions execute sequentially, so order them logically

5. **Use appropriate triggers**:
   - `on-enter` for welcome messages, area transitions
   - `on-step` for continuous effects, interactive objects
   - `on-exit` for goodbye messages, area cleanup

6. **Avoid overlapping areas** - Multiple overlapping areas can cause confusing behavior

7. **Use variables for state** - Track progress with global variables instead of relying on triggered event IDs

## Developer Tools

Use the AreaMapRegistryPanel to visually create and edit event areas:

1. Open the developer panel (usually F12 or a dev menu)
2. Select "Events" tool mode
3. Click-drag to create event areas
4. Click an area to edit its properties
5. Add events, preconditions, and actions through the UI
6. Export to YAML when done

## Examples

See `event-demo-map` in `area-map-database.yaml` for a complete working example demonstrating all features.

## Troubleshooting

**Events not firing:**
- Check trigger type matches player movement
- Verify preconditions are met (use console logging)
- Ensure event area bounds are correct
- Check if event is one-time and already triggered

**Wrong execution order:**
- Remember: OnExit → OnEnter → OnStep
- Actions execute in the order defined
- Events in same area execute in the order defined

**Performance issues:**
- Event processing is O(n) where n = number of event areas
- Keep number of event areas reasonable (< 100 per map)
- Use preconditions to gate expensive actions

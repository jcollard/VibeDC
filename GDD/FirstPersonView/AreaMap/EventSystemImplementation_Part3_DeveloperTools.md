# Event System Implementation - Part 3: Developer Tools & Polish

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [EventSystemImplementationPlan.md](./EventSystemImplementationPlan.md), [EventSystemImplementation_Part1_CoreSystem.md](./EventSystemImplementation_Part1_CoreSystem.md), [EventSystemImplementation_Part2_Integration.md](./EventSystemImplementation_Part2_Integration.md)

## Purpose

This document covers Phases 10-11 of the Event System implementation, focusing on testing, examples, and building a visual event editor in the AreaMapRegistryPanel developer tool.

## Scope: Phases 10-11

- **Phase 10:** Testing and Examples
- **Phase 11:** Developer Panel Integration

## Duration Estimate

**8-10 hours total**

## Prerequisites

Before starting:
- ✅ **Parts 1 and 2 must be complete** - Core system and integration working
- ✅ Events fire correctly in-game
- ✅ Understand existing AreaMapRegistryPanel structure
- ✅ Familiar with React component patterns used in the project
- ✅ Review [GeneralGuidelines.md](../../../GeneralGuidelines.md) sections:
  - "UI Component State" (Lines 231-265)
  - "State Preservation vs. Reset Pattern" (Lines 354-395)
  - "Performance Considerations" (Lines 1278-1324)

## Key Guidelines for This Implementation

**From GeneralGuidelines.md, this implementation must follow:**

1. **UI Component State** (Lines 231-265)
   - Cache interactive components that maintain state (buttons, lists)
   - Don't recreate components every frame
   - Store as instance variables: `private button: Button | null = null`
   - Only recreate on phase/context changes

2. **Performance Patterns** (Lines 1286-1324)
   - Cache off-screen canvases if rendering every frame
   - Don't create new canvas objects in render loops
   - Reuse buffers across frames

3. **State Preservation vs. Reset** (Lines 354-395)
   - Provide separate methods: `setItems()` vs `updateItems()`
   - Reset scroll on context change (switching areas)
   - Preserve scroll on data update (list changes)

4. **Implementation Planning** (Lines 1842-2017)
   - This phase already HAS a plan (Phase 11 from original doc)
   - Follow the detailed step-by-step implementation
   - Don't skip steps or deviate without documenting

---

## Phase 10: Testing and Examples

**Goal:** Create comprehensive tests and example YAML files.

**Duration:** 2 hours

**Dependencies:** All previous phases

### Step 10.1: Create Example YAML Files

**File:** `react-app/src/data/area-map-database.yaml` (update)

Add example area with comprehensive event demonstrations:

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
            preconditions: []
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

      # Exit event example
      - id: step-counter-area
        x: 5
        y: 4
        width: 3
        height: 1
        description: "Counts steps and messages on exit"
        events:
          # Initialize counter
          - id: init-counter
            trigger: on-enter
            oneTime: true
            preconditions: []
            actions:
              - type: SetGlobalVariable
                variableName: "entered-counter-area"
                value: true

          # Increment on each step
          - id: count-steps
            trigger: on-step
            preconditions: []
            actions:
              - type: ShowMessage
                message: "You stepped in the counting area"

          # Message when leaving
          - id: exit-message
            trigger: on-exit
            preconditions:
              - type: GlobalVariableIs
                variableName: "entered-counter-area"
                value: true
            actions:
              - type: ShowMessage
                message: "Thanks for visiting the counting area!"
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

  it('should load demo map with event areas', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    expect(map).toBeDefined();
    expect(map!.eventAreas).toBeDefined();
    expect(map!.eventAreas!.length).toBeGreaterThan(0);
  });

  it('should process events in demo map', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    expect(map).toBeDefined();

    // Enter entrance area (x: 1-3, y: 1-2)
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

    // Try door without key (x: 4, y: 3)
    state = processor.processMovement(state, map!, 4, 2, 4, 3);
    expect(state.messageLog!.some(m => m.text.includes('locked'))).toBe(true);

    // Get key (x: 7, y: 1)
    state = processor.processMovement(state, map!, 6, 1, 7, 1);
    expect(state.globalVariables.get('has-demo-key')).toBe(true);

    // Try door with key
    state = processor.processMovement(state, map!, 4, 2, 4, 3);
    expect(state.messageLog!.some(m => m.text.includes('unlock'))).toBe(true);
    expect(state.globalVariables.get('door-unlocked')).toBe(true);
  });

  it('should fire exit events', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    let state = gameState;

    // Enter counter area (x: 5-7, y: 4)
    state = processor.processMovement(state, map!, 5, 3, 5, 4);
    expect(state.globalVariables.get('entered-counter-area')).toBe(true);

    // Exit counter area
    state = processor.processMovement(state, map!, 5, 4, 5, 3);
    expect(state.messageLog!.some(m => m.text.includes('Thanks for visiting'))).toBe(true);
  });
});
```

### Step 10.3: Create Documentation

**File:** `react-app/src/models/area/README.md` (create)

```markdown
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
```

### Phase 10 Validation

✅ Example YAML loads without errors
✅ Integration tests pass
✅ Documentation is clear and complete
✅ Manual testing confirms all examples work

**Run Tests:**
```bash
npm test
npm run build
```

---

## Phase 11: Developer Panel Integration

**Goal:** Create visual event area editor in AreaMapRegistryPanel.

**Duration:** 8 hours

**Dependencies:** Phases 1-10

This phase adds event editing capabilities to the existing AreaMapRegistryPanel.tsx developer tool.

### Step 11.1: Add "Events" Tool to Tool Selection

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx` (update)

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

### Step 11.2: Create Event Area Visual Overlay

Add visual overlay component to display event areas:

```typescript
/**
 * Renders event area overlays on the map grid.
 */
const renderEventAreaOverlays = () => {
  if (!selectedMap || selectedTool !== "events") {
    return null;
  }

  const TILE_SIZE = 32; // Adjust to your tile size

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
    </div>
  );
};
```

### Step 11.3: Implement Event Area Creation

```typescript
/**
 * Handles grid click for event area creation.
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

### Step 11.4-11.7: Create Event Editing Components

Due to the complexity of the UI components, here's the structure:

**File Structure:**
```
components/developer/
  ├── AreaMapRegistryPanel.tsx (main panel - update)
  ├── EventAreaPropertiesPanel.tsx (new - basic area properties)
  ├── EventEditor.tsx (new - detailed event editor modal)
  ├── PreconditionBuilder.tsx (new - precondition list/editor)
  └── ActionBuilder.tsx (new - action list/editor with reordering)
```

**Key Features to Implement:**

1. **EventAreaPropertiesPanel** - Shows when area selected:
   - Edit area ID and description
   - View position/size (read-only)
   - List of events (clickable to edit)
   - Add/delete event buttons
   - Delete area button

2. **EventEditor** - Modal for editing individual events:
   - Edit event ID, description
   - Select trigger type (dropdown)
   - One-time checkbox
   - Precondition builder component
   - Action builder component

3. **PreconditionBuilder** - Manages precondition list:
   - Add precondition dropdown (3 types)
   - Edit precondition fields inline
   - Delete precondition button
   - Type-specific field editors

4. **ActionBuilder** - Manages action list:
   - Add action dropdown (5 types)
   - Edit action fields inline
   - Delete action button
   - **Up/Down arrows for reordering** (important!)
   - Type-specific field editors

**Guidelines Compliance Notes:**

**UI Component State** (Lines 231-265):
```typescript
// ✅ GOOD: Cache components that maintain state
class EventAreaPropertiesPanel {
  private eventList: EventListComponent | null = null;

  render() {
    if (!this.eventList) {
      this.eventList = new EventListComponent({ onClick: ... });
    }
    this.eventList.setEvents(this.eventArea.events);
    this.eventList.render(ctx, region);
  }
}

// ❌ BAD: Recreate every render
render() {
  const eventList = new EventListComponent({ onClick: ... }); // Lost state!
  eventList.render(ctx, region);
}
```

**Performance** (Lines 1286-1324):
- Don't create canvases in render loops
- Cache off-screen buffers if used for preview rendering
- Reuse buffer across multiple event area overlays if possible

**Implementation Note:** The full component code is provided in the original EventSystemImplementationPlan.md (lines 2680-3451). Copy those implementations, adapting them to your project's styling and patterns.

### Step 11.8: Update Export Function

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx` (update)

Update YAML export to include event areas:

```typescript
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

### Phase 11 Validation

**Comprehensive Test Checklist:**

✅ **Tool Selection**
- Events tool appears in tool list
- Clicking events tool activates event editing mode

✅ **Event Area Visualization**
- Event areas display as colored overlays
- Selected area highlights differently
- Labels show ID and event count

✅ **Event Area Creation**
- Click-drag creates new event area
- Area has correct bounds
- New area appears immediately

✅ **Event Area Editing**
- Can edit ID and description
- Can view position/size
- Can delete event area

✅ **Event Management**
- Can add new events
- Can delete events
- Can click event to open editor

✅ **Event Editing**
- Can edit all event properties
- Can change trigger type
- Can toggle one-time
- Modal saves changes

✅ **Precondition Building**
- Can add all 3 types
- Can edit fields
- Can delete preconditions

✅ **Action Building**
- Can add all 5 types
- Can edit fields
- Can delete actions
- **Can reorder actions**

✅ **YAML Export**
- Export includes eventAreas
- Serialization works correctly
- Exported YAML re-imports successfully

---

## Part 3 Completion Checklist

✅ **Phase 10: Testing and Examples**
- Example YAML with comprehensive demonstrations
- Integration tests
- Documentation (README.md)
- Manual testing validation

✅ **Phase 11: Developer Panel Integration**
- Events tool mode
- Visual event area overlays
- Click-drag area creation
- Event area properties panel
- Event editor modal
- Precondition builder
- Action builder with reordering
- YAML export with events
- All validation tests pass

## Final Validation

**Run all tests:**
```bash
npm test
npm run build
```

**Manual Testing:**
1. Open developer panel
2. Select "Events" tool
3. Create event areas by clicking
4. Add events to areas
5. Configure preconditions and actions
6. Test action reordering
7. Export to YAML
8. Verify exported YAML loads correctly
9. Test events in-game

## Success Criteria

The entire Event System implementation (Parts 1-3) is complete when:

1. ✅ All type definitions compile
2. ✅ Three trigger types work (OnEnter, OnStep, OnExit)
3. ✅ Three precondition types work
4. ✅ Five action types work
5. ✅ EventProcessor correctly processes events
6. ✅ One-time events persist
7. ✅ Events integrate with FirstPersonView
8. ✅ YAML parsing works
9. ✅ All tests pass
10. ✅ Example content demonstrates all features
11. ✅ Developer panel has visual event editor
12. ✅ Can create/edit/delete event areas
13. ✅ Can configure all event properties
14. ✅ Export includes complete event data

## Estimated Total Effort

**Parts 1-3 Combined:** 20-26 hours
- Part 1: 10-12 hours
- Part 2: 5-6 hours
- Part 3: 8-10 hours

**Risk Level:** Low-Medium
- Clear requirements
- Follows existing patterns
- Incremental validation at each phase
- Main risk: UI component integration

---

**End of Part 3 Implementation Document**

**You have now completed the full Event System implementation plan!**

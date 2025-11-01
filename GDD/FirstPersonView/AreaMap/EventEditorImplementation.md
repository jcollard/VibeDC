# Event Editor Implementation Plan

**Version:** 1.0
**Created:** 2025-11-01
**Status:** 📋 PLANNING
**Related:** [EventSystemOverview.md](./EventSystemOverview.md), [EventSystemImplementation_Part3_DeveloperTools.md](./EventSystemImplementation_Part3_DeveloperTools.md)

## Purpose

This document provides a comprehensive, step-by-step implementation plan for adding visual event editing capabilities to the existing AreaMapRegistryPanel. This follows the existing patterns in the panel (paint, object, spawn, encounter tools) and adds an "events" tool mode for creating and editing EventAreas.

## Overview

**What we're building:**
- Visual event area creation (click-drag rectangles on map grid)
- Event area selection and editing (click to select, show properties)
- Event editor modal (add/edit/delete events within an area)
- Precondition builder (add/edit/delete preconditions)
- Action builder (add/edit/delete/reorder actions)
- YAML export integration (include eventAreas in export)

**Design Philosophy:**
- Follow existing AreaMapRegistryPanel patterns exactly
- Reuse existing components where possible (buttons, inputs, modals)
- Maintain consistency with existing tool modes (paint, object, spawn, encounter)
- Keep it simple and functional (no over-engineering)

## Architecture Decisions

### 1. Component Structure

**Main Component: AreaMapRegistryPanel.tsx (modified)**
- Add 'events' to EditorTool type
- Add state for event editing (selectedEventArea, isCreatingEventArea, eventAreaStartPos)
- Add event area rendering in grid overlay
- Add event area creation handler
- Add event area click handler

**New Components:**
- **EventAreaPropertiesPanel** - Inline panel (like existing object/spawn panels)
- **EventEditorModal** - Full-screen modal for editing individual events
- **PreconditionList** - Simple list component for preconditions
- **ActionList** - Simple list component with reordering for actions

**NOT creating separate files for builders** - keep everything inline following the existing pattern of having tools render their UI in the right sidebar.

### 2. State Management

**Event Editing State (added to AreaMapRegistryPanel):**
```typescript
// Event area editing state
const [selectedEventArea, setSelectedEventArea] = useState<string | null>(null);
const [isCreatingEventArea, setIsCreatingEventArea] = useState(false);
const [eventAreaStartPos, setEventAreaStartPos] = useState<{ x: number; y: number } | null>(null);
const [eventEditorVisible, setEventEditorVisible] = useState(false);
const [editingEventId, setEditingEventId] = useState<string | null>(null);
```

**Event Data (stored in editedMap.eventAreas):**
- EventAreas are part of AreaMapJSON
- Modified through setEditedMap() like other map properties
- Immutable updates (spread operator)

### 3. Visual Design Patterns

**Event Area Overlay (following existing patterns):**
- Render similar to encounter zones (semi-transparent rectangles)
- Selected area: green border + brighter fill
- Unselected areas: yellow border + lighter fill
- Label in top-left corner: `{area.id} ({area.events.length} events)`
- Click to select, click grid to create new

**Right Sidebar Layout (following existing patterns):**
```
When tool = 'events':
  ┌─────────────────────────────┐
  │ Event Areas                 │
  ├─────────────────────────────┤
  │ [+ Create New Area]         │
  │                             │
  │ Selected: entrance-area     │
  │ Position: (1, 1)            │
  │ Size: 3x2                   │
  │ Description: [input]        │
  │                             │
  │ Events (2):                 │
  │ • first-visit (on-enter)    │
  │   [Edit] [Delete]           │
  │ • re-entry (on-enter)       │
  │   [Edit] [Delete]           │
  │                             │
  │ [+ Add Event]               │
  │ [Delete Area]               │
  └─────────────────────────────┘
```

**Event Editor Modal (new full-screen modal):**
```
┌─────────────────────────────────────────────────────────┐
│ Edit Event: first-visit                       [X Close] │
├─────────────────────────────────────────────────────────┤
│ Event ID: [first-visit________________]                │
│ Description: [Shows welcome message___________]         │
│                                                         │
│ Trigger: [on-enter ▼]                                  │
│ ☑ One-time event                                       │
│                                                         │
│ ┌─── Preconditions ──────────────────────────────────┐ │
│ │ (All must be true)                                 │ │
│ │                                                    │ │
│ │ No preconditions                                   │ │
│ │ [+ Add Precondition ▼]                            │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Actions ────────────────────────────────────────┐ │
│ │ (Execute in order)                                 │ │
│ │                                                    │ │
│ │ 1. ShowMessage                          [↑] [↓] [X]│ │
│ │    Message: [Welcome to the Event System Demo!]   │ │
│ │                                                    │ │
│ │ 2. SetGlobalVariable                    [↑] [↓] [X]│ │
│ │    Variable: [visited-demo____]                    │ │
│ │    Value: [true_______________]                    │ │
│ │                                                    │ │
│ │ [+ Add Action ▼]                                  │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│                               [Save] [Cancel]           │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Add Events Tool Mode (1 hour)

**Goal:** Add 'events' as a tool option and render event area overlays.

#### Step 1.1: Update EditorTool Type

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** Line 54

**Change:**
```typescript
// OLD
type EditorTool = 'paint' | 'object' | 'spawn' | 'encounter';

// NEW
type EditorTool = 'paint' | 'object' | 'spawn' | 'encounter' | 'events';
```

#### Step 1.2: Add Event State Variables

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** After line 78 (after lastDragPos state)

**Add:**
```typescript
// Event editing state
const [selectedEventArea, setSelectedEventArea] = useState<string | null>(null);
const [isCreatingEventArea, setIsCreatingEventArea] = useState(false);
const [eventAreaStartPos, setEventAreaStartPos] = useState<{ x: number; y: number } | null>(null);
const [eventEditorVisible, setEventEditorVisible] = useState(false);
const [editingEventId, setEditingEventId] = useState<string | null>(null);
```

#### Step 1.3: Add Events Tool Button

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** Around line 1250 (in tool selection section)

**Add after "Encounters" button:**
```typescript
<button
  onClick={() => setCurrentTool('events')}
  style={{
    padding: '6px 12px',
    background: currentTool === 'events' ? 'rgba(156, 39, 176, 0.5)' : 'rgba(255,255,255,0.1)',
    border: currentTool === 'events' ? '2px solid purple' : '1px solid #666',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  }}
>
  Events
</button>
```

#### Step 1.4: Render Event Area Overlays

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** In renderGrid() function, after encounter zones rendering (around line 796)

**Add:**
```typescript
// Render event areas (only in events mode)
if (currentTool === 'events' && editedMap?.eventAreas) {
  for (const area of editedMap.eventAreas) {
    const isSelected = selectedEventArea === area.id;

    cells.push(
      <div
        key={`event-area-${area.id}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEventArea(area.id);
        }}
        style={{
          position: 'absolute',
          left: area.x * CELL_SIZE,
          top: area.y * CELL_SIZE,
          width: area.width * CELL_SIZE,
          height: area.height * CELL_SIZE,
          background: isSelected ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 0, 0.1)',
          border: isSelected ? '3px solid green' : '2px solid yellow',
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 2,
          left: 2,
          fontSize: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '2px 4px',
          borderRadius: '2px',
        }}>
          {area.id} ({area.events.length} events)
        </div>
      </div>
    );
  }
}
```

### Phase 2: Event Area Creation (1.5 hours)

**Goal:** Enable click-drag creation of event areas.

#### Step 2.1: Update handleTileClick for Events Mode

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** In handleTileClick function (around line 346)

**Add before the closing brace:**
```typescript
else if (currentTool === 'events') {
  handleEventAreaClick(x, y);
}
```

#### Step 2.2: Implement handleEventAreaClick

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** After handleTileClick function (around line 388)

**Add:**
```typescript
const handleEventAreaClick = (x: number, y: number) => {
  if (!isEditing || !editedMap) return;

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

    // Add to map using immutable pattern
    setEditedMap({
      ...editedMap,
      eventAreas: [...(editedMap.eventAreas || []), newArea],
    });

    setSelectedEventArea(newArea.id);
    setIsCreatingEventArea(false);
    setEventAreaStartPos(null);
  }
};
```

**Note:** Import EventArea type at top of file:
```typescript
import type { EventArea } from '../../models/area/EventArea';
```

#### Step 2.3: Visual Feedback During Creation

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** In renderGrid(), after event area rendering

**Add:**
```typescript
// Show preview while creating event area
if (isCreatingEventArea && eventAreaStartPos && currentTool === 'events') {
  // We'd need to track mouse position for live preview
  // For simplicity, show just the start position marker
  cells.push(
    <div
      key="event-area-preview"
      style={{
        position: 'absolute',
        left: eventAreaStartPos.x * CELL_SIZE,
        top: eventAreaStartPos.y * CELL_SIZE,
        width: CELL_SIZE,
        height: CELL_SIZE,
        background: 'rgba(255, 255, 0, 0.5)',
        border: '2px dashed yellow',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '16px',
        color: 'white',
      }}>
        +
      </div>
    </div>
  );
}
```

### Phase 3: Event Area Properties Panel (1 hour)

**Goal:** Show selected event area properties in right sidebar.

#### Step 3.1: Add Event Properties Section

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** In right sidebar render section (around line 1388), add new condition

**Add after encounter tool section:**
```typescript
{currentTool === 'events' && (
  <>
    <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>Event Areas</div>

    {!selectedEventArea ? (
      <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '12px' }}>
        Click two points on the map to create an event area
      </div>
    ) : (
      <>
        {renderEventAreaProperties()}
      </>
    )}
  </>
)}
```

#### Step 3.2: Implement renderEventAreaProperties

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** After renderTilePalette function (around line 910)

**Add:**
```typescript
const renderEventAreaProperties = () => {
  if (!editedMap || !selectedEventArea) return null;

  const area = editedMap.eventAreas?.find(a => a.id === selectedEventArea);
  if (!area) return null;

  return (
    <>
      <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid #666', borderRadius: '4px' }}>
        <div style={{ fontSize: '11px', marginBottom: '8px', fontWeight: 'bold' }}>Area: {area.id}</div>

        <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>
          Position: ({area.x}, {area.y})
        </div>
        <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '8px' }}>
          Size: {area.width} x {area.height}
        </div>

        <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>Description:</div>
        <input
          type="text"
          value={area.description || ''}
          onChange={(e) => handleUpdateEventAreaDescription(area.id, e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid #666',
            borderRadius: '3px',
            color: '#fff',
            fontSize: '10px',
            fontFamily: 'monospace',
            marginBottom: '8px',
          }}
        />

        <button
          onClick={() => handleDeleteEventArea(area.id)}
          style={{
            width: '100%',
            padding: '6px',
            background: 'rgba(244, 67, 54, 0.3)',
            border: '1px solid rgba(244, 67, 54, 0.6)',
            borderRadius: '3px',
            color: '#fff',
            fontSize: '10px',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Delete Area
        </button>
      </div>

      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
        Events ({area.events.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
        {area.events.map((event, index) => (
          <div
            key={event.id}
            style={{
              padding: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '4px',
              fontSize: '10px',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{event.id}</div>
            <div style={{ color: '#aaa', marginBottom: '4px' }}>Trigger: {event.trigger}</div>
            {event.oneTime && (
              <div style={{ color: '#ff0', fontSize: '9px', marginBottom: '4px' }}>⚡ One-time</div>
            )}
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              <button
                onClick={() => handleEditEvent(area.id, event.id)}
                style={{
                  flex: 1,
                  padding: '4px',
                  background: 'rgba(33, 150, 243, 0.3)',
                  border: '1px solid rgba(33, 150, 243, 0.6)',
                  borderRadius: '3px',
                  color: '#fff',
                  fontSize: '9px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteEvent(area.id, event.id)}
                style={{
                  flex: 1,
                  padding: '4px',
                  background: 'rgba(244, 67, 54, 0.3)',
                  border: '1px solid rgba(244, 67, 54, 0.6)',
                  borderRadius: '3px',
                  color: '#fff',
                  fontSize: '9px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => handleAddEvent(area.id)}
        style={{
          width: '100%',
          padding: '8px',
          background: 'rgba(76, 175, 80, 0.3)',
          border: '1px solid rgba(76, 175, 80, 0.6)',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '11px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontWeight: 'bold',
        }}
      >
        + Add Event
      </button>
    </>
  );
};
```

#### Step 3.3: Implement Event Area Handlers

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** After handleEventAreaClick (around line 420)

**Add:**
```typescript
const handleUpdateEventAreaDescription = (areaId: string, description: string) => {
  if (!editedMap) return;

  setEditedMap({
    ...editedMap,
    eventAreas: editedMap.eventAreas?.map(area =>
      area.id === areaId ? { ...area, description } : area
    ),
  });
};

const handleDeleteEventArea = (areaId: string) => {
  if (!editedMap) return;
  if (!confirm(`Delete event area "${areaId}"?`)) return;

  setEditedMap({
    ...editedMap,
    eventAreas: editedMap.eventAreas?.filter(area => area.id !== areaId),
  });

  setSelectedEventArea(null);
};

const handleAddEvent = (areaId: string) => {
  setSelectedEventArea(areaId);
  setEditingEventId(null); // null = new event
  setEventEditorVisible(true);
};

const handleEditEvent = (areaId: string, eventId: string) => {
  setSelectedEventArea(areaId);
  setEditingEventId(eventId);
  setEventEditorVisible(true);
};

const handleDeleteEvent = (areaId: string, eventId: string) => {
  if (!editedMap) return;
  if (!confirm(`Delete event "${eventId}"?`)) return;

  setEditedMap({
    ...editedMap,
    eventAreas: editedMap.eventAreas?.map(area =>
      area.id === areaId
        ? {
            ...area,
            events: area.events.filter(e => e.id !== eventId),
          }
        : area
    ),
  });
};
```

### Phase 4: Event Editor Modal (2.5 hours)

**Goal:** Create modal for editing individual events.

#### Step 4.1: Create EventEditorModal Component

**File:** `react-app/src/components/developer/EventEditorModal.tsx` (NEW FILE)

**Content:**
```typescript
import { useState, useEffect } from 'react';
import type { AreaEvent } from '../../models/area/EventArea';
import type { EventPrecondition } from '../../models/area/EventPrecondition';
import type { EventAction } from '../../models/area/EventAction';
import { EventTrigger } from '../../models/area/EventTrigger';
import { PreconditionFactory } from '../../models/area/preconditions/PreconditionFactory';
import { ActionFactory } from '../../models/area/actions/ActionFactory';

interface EventEditorModalProps {
  event: AreaEvent | null; // null = creating new event
  onSave: (event: AreaEvent) => void;
  onCancel: () => void;
}

export const EventEditorModal: React.FC<EventEditorModalProps> = ({
  event,
  onSave,
  onCancel,
}) => {
  // Initialize state from event or create new
  const [eventId, setEventId] = useState(event?.id || `event-${Date.now()}`);
  const [description, setDescription] = useState(event?.description || '');
  const [trigger, setTrigger] = useState(event?.trigger || EventTrigger.OnEnter);
  const [oneTime, setOneTime] = useState(event?.oneTime || false);
  const [preconditions, setPreconditions] = useState<EventPrecondition[]>(event?.preconditions || []);
  const [actions, setActions] = useState<EventAction[]>(event?.actions || []);

  const handleSave = () => {
    const newEvent: AreaEvent = {
      id: eventId,
      trigger,
      preconditions,
      actions,
      oneTime,
      description,
    };

    onSave(newEvent);
  };

  const handleAddPrecondition = (type: string) => {
    let newPrecondition: EventPrecondition;

    switch (type) {
      case 'GlobalVariableIs':
        newPrecondition = PreconditionFactory.fromJSON({
          type: 'GlobalVariableIs',
          variableName: 'new-variable',
          expectedValue: true,
        });
        break;
      case 'GlobalVariableIsGreaterThan':
        newPrecondition = PreconditionFactory.fromJSON({
          type: 'GlobalVariableIsGreaterThan',
          variableName: 'new-variable',
          threshold: 0,
        });
        break;
      case 'GlobalVariableIsLessThan':
        newPrecondition = PreconditionFactory.fromJSON({
          type: 'GlobalVariableIsLessThan',
          variableName: 'new-variable',
          threshold: 10,
        });
        break;
      default:
        return;
    }

    setPreconditions([...preconditions, newPrecondition]);
  };

  const handleUpdatePrecondition = (index: number, updates: Partial<any>) => {
    const updated = [...preconditions];
    const current = updated[index];
    const currentJSON = current.toJSON();

    // Recreate from JSON with updates
    updated[index] = PreconditionFactory.fromJSON({
      ...currentJSON,
      ...updates,
    });

    setPreconditions(updated);
  };

  const handleDeletePrecondition = (index: number) => {
    setPreconditions(preconditions.filter((_, i) => i !== index));
  };

  const handleAddAction = (type: string) => {
    let newAction: EventAction;

    switch (type) {
      case 'ShowMessage':
        newAction = ActionFactory.fromJSON({
          type: 'ShowMessage',
          message: 'New message',
        });
        break;
      case 'SetGlobalVariable':
        newAction = ActionFactory.fromJSON({
          type: 'SetGlobalVariable',
          variableName: 'new-variable',
          value: true,
        });
        break;
      case 'Teleport':
        newAction = ActionFactory.fromJSON({
          type: 'Teleport',
          targetMapId: 'map-id',
          targetX: 0,
          targetY: 0,
          targetDirection: 'North',
        });
        break;
      case 'Rotate':
        newAction = ActionFactory.fromJSON({
          type: 'Rotate',
          newDirection: 'North',
        });
        break;
      case 'StartEncounter':
        newAction = ActionFactory.fromJSON({
          type: 'StartEncounter',
          encounterId: 'encounter-id',
        });
        break;
      default:
        return;
    }

    setActions([...actions, newAction]);
  };

  const handleUpdateAction = (index: number, updates: Partial<any>) => {
    const updated = [...actions];
    const current = updated[index];
    const currentJSON = current.toJSON();

    // Recreate from JSON with updates
    updated[index] = ActionFactory.fromJSON({
      ...currentJSON,
      ...updates,
    });

    setActions(updated);
  };

  const handleDeleteAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleMoveActionUp = (index: number) => {
    if (index === 0) return;
    const updated = [...actions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setActions(updated);
  };

  const handleMoveActionDown = (index: number) => {
    if (index === actions.length - 1) return;
    const updated = [...actions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setActions(updated);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 3000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '2px solid #666',
        background: 'rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
          {event ? `Edit Event: ${event.id}` : 'Create New Event'}
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* Event Properties */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Event ID:</div>
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'monospace',
              marginBottom: '12px',
            }}
          />

          <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Description:</div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'monospace',
              marginBottom: '12px',
            }}
          />

          <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Trigger:</div>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'monospace',
              marginBottom: '12px',
            }}
          >
            <option value={EventTrigger.OnEnter}>on-enter</option>
            <option value={EventTrigger.OnStep}>on-step</option>
            <option value={EventTrigger.OnExit}>on-exit</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={oneTime}
              onChange={(e) => setOneTime(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px' }}>One-time event (fires only once)</span>
          </label>
        </div>

        {/* Preconditions */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid #666',
          borderRadius: '4px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
            Preconditions
          </div>
          <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '12px' }}>
            (All must be true for event to fire)
          </div>

          {preconditions.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginBottom: '12px' }}>
              No preconditions (event always fires)
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {preconditions.map((precondition, index) => (
                <div key={index} style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid #666',
                  borderRadius: '4px',
                }}>
                  {renderPrecondition(precondition, index, handleUpdatePrecondition, handleDeletePrecondition)}
                </div>
              ))}
            </div>
          )}

          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAddPrecondition(e.target.value);
                e.target.value = '';
              }
            }}
            style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(76, 175, 80, 0.3)',
              border: '1px solid rgba(76, 175, 80, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            <option value="">+ Add Precondition</option>
            <option value="GlobalVariableIs">GlobalVariableIs</option>
            <option value="GlobalVariableIsGreaterThan">GlobalVariableIsGreaterThan</option>
            <option value="GlobalVariableIsLessThan">GlobalVariableIsLessThan</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid #666',
          borderRadius: '4px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
            Actions
          </div>
          <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '12px' }}>
            (Execute in order)
          </div>

          {actions.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginBottom: '12px' }}>
              No actions (event does nothing)
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {actions.map((action, index) => (
                <div key={index} style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid #666',
                  borderRadius: '4px',
                }}>
                  {renderAction(
                    action,
                    index,
                    handleUpdateAction,
                    handleDeleteAction,
                    handleMoveActionUp,
                    handleMoveActionDown,
                    index === 0,
                    index === actions.length - 1
                  )}
                </div>
              ))}
            </div>
          )}

          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAddAction(e.target.value);
                e.target.value = '';
              }
            }}
            style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(76, 175, 80, 0.3)',
              border: '1px solid rgba(76, 175, 80, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            <option value="">+ Add Action</option>
            <option value="ShowMessage">ShowMessage</option>
            <option value="SetGlobalVariable">SetGlobalVariable</option>
            <option value="Teleport">Teleport</option>
            <option value="Rotate">Rotate</option>
            <option value="StartEncounter">StartEncounter</option>
          </select>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '16px 20px',
        borderTop: '2px solid #666',
        background: 'rgba(0,0,0,0.5)',
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            background: 'rgba(244, 67, 54, 0.3)',
            border: '1px solid rgba(244, 67, 54, 0.6)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            background: 'rgba(76, 175, 80, 0.3)',
            border: '1px solid rgba(76, 175, 80, 0.6)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          Save Event
        </button>
      </div>
    </div>
  );
};

// Helper render functions
function renderPrecondition(
  precondition: EventPrecondition,
  index: number,
  onUpdate: (index: number, updates: Partial<any>) => void,
  onDelete: (index: number) => void
) {
  const json = precondition.toJSON();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{json.type}</div>
        <button
          onClick={() => onDelete(index)}
          style={{
            padding: '2px 6px',
            background: 'rgba(244, 67, 54, 0.3)',
            border: '1px solid rgba(244, 67, 54, 0.6)',
            borderRadius: '3px',
            color: '#fff',
            fontSize: '9px',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Delete
        </button>
      </div>

      {json.type === 'GlobalVariableIs' && (
        <>
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Variable Name:</div>
          <input
            type="text"
            value={json.variableName as string}
            onChange={(e) => onUpdate(index, { variableName: e.target.value })}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
              marginBottom: '8px',
            }}
          />
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Expected Value:</div>
          <input
            type="text"
            value={String(json.expectedValue)}
            onChange={(e) => {
              // Try to parse as boolean or number
              let value: any = e.target.value;
              if (value === 'true') value = true;
              else if (value === 'false') value = false;
              else if (!isNaN(Number(value)) && value !== '') value = Number(value);
              onUpdate(index, { expectedValue: value });
            }}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          />
        </>
      )}

      {(json.type === 'GlobalVariableIsGreaterThan' || json.type === 'GlobalVariableIsLessThan') && (
        <>
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Variable Name:</div>
          <input
            type="text"
            value={json.variableName as string}
            onChange={(e) => onUpdate(index, { variableName: e.target.value })}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
              marginBottom: '8px',
            }}
          />
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Threshold:</div>
          <input
            type="number"
            value={json.threshold as number}
            onChange={(e) => onUpdate(index, { threshold: Number(e.target.value) })}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          />
        </>
      )}
    </div>
  );
}

function renderAction(
  action: EventAction,
  index: number,
  onUpdate: (index: number, updates: Partial<any>) => void,
  onDelete: (index: number) => void,
  onMoveUp: (index: number) => void,
  onMoveDown: (index: number) => void,
  isFirst: boolean,
  isLast: boolean
) {
  const json = action.toJSON();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{index + 1}. {json.type}</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onMoveUp(index)}
            disabled={isFirst}
            style={{
              padding: '2px 6px',
              background: isFirst ? 'rgba(100,100,100,0.3)' : 'rgba(33, 150, 243, 0.3)',
              border: '1px solid ' + (isFirst ? '#666' : 'rgba(33, 150, 243, 0.6)'),
              borderRadius: '3px',
              color: isFirst ? '#666' : '#fff',
              fontSize: '9px',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
            }}
          >
            ↑
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={isLast}
            style={{
              padding: '2px 6px',
              background: isLast ? 'rgba(100,100,100,0.3)' : 'rgba(33, 150, 243, 0.3)',
              border: '1px solid ' + (isLast ? '#666' : 'rgba(33, 150, 243, 0.6)'),
              borderRadius: '3px',
              color: isLast ? '#666' : '#fff',
              fontSize: '9px',
              cursor: isLast ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
            }}
          >
            ↓
          </button>
          <button
            onClick={() => onDelete(index)}
            style={{
              padding: '2px 6px',
              background: 'rgba(244, 67, 54, 0.3)',
              border: '1px solid rgba(244, 67, 54, 0.6)',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '9px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {json.type === 'ShowMessage' && (
        <>
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Message:</div>
          <textarea
            value={json.message as string}
            onChange={(e) => onUpdate(index, { message: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
        </>
      )}

      {json.type === 'SetGlobalVariable' && (
        <>
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Variable Name:</div>
          <input
            type="text"
            value={json.variableName as string}
            onChange={(e) => onUpdate(index, { variableName: e.target.value })}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
              marginBottom: '8px',
            }}
          />
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Value:</div>
          <input
            type="text"
            value={String(json.value)}
            onChange={(e) => {
              // Try to parse as boolean or number
              let value: any = e.target.value;
              if (value === 'true') value = true;
              else if (value === 'false') value = false;
              else if (!isNaN(Number(value)) && value !== '') value = Number(value);
              onUpdate(index, { value });
            }}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          />
        </>
      )}

      {json.type === 'Teleport' && (
        <>
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Target Map ID:</div>
          <input
            type="text"
            value={json.targetMapId as string}
            onChange={(e) => onUpdate(index, { targetMapId: e.target.value })}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
              marginBottom: '8px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>X:</div>
              <input
                type="number"
                value={json.targetX as number}
                onChange={(e) => onUpdate(index, { targetX: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid #666',
                  borderRadius: '3px',
                  color: '#fff',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Y:</div>
              <input
                type="number"
                value={json.targetY as number}
                onChange={(e) => onUpdate(index, { targetY: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid #666',
                  borderRadius: '3px',
                  color: '#fff',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Direction:</div>
          <select
            value={json.targetDirection as string}
            onChange={(e) => onUpdate(index, { targetDirection: e.target.value })}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          >
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </>
      )}

      {json.type === 'Rotate' && (
        <>
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>New Direction:</div>
          <select
            value={json.newDirection as string}
            onChange={(e) => onUpdate(index, { newDirection: e.target.value })}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          >
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </>
      )}

      {json.type === 'StartEncounter' && (
        <>
          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#aaa' }}>Encounter ID:</div>
          <input
            type="text"
            value={json.encounterId as string}
            onChange={(e) => onUpdate(index, { encounterId: e.target.value })}
            style={{
              width: '100%',
              padding: '4px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #666',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          />
        </>
      )}
    </div>
  );
}
```

#### Step 4.2: Integrate EventEditorModal

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** At top of file, add import:
```typescript
import { EventEditorModal } from './EventEditorModal';
```

**Location:** At bottom of component render, after tileset editor modal (around line 1403):
```typescript
{/* Event editor modal */}
{eventEditorVisible && selectedEventArea && (
  <EventEditorModal
    event={editingEventId ? getCurrentEvent() : null}
    onSave={handleSaveEvent}
    onCancel={() => {
      setEventEditorVisible(false);
      setEditingEventId(null);
    }}
  />
)}
```

**Location:** Add helper functions before render (around line 810):
```typescript
const getCurrentEvent = (): AreaEvent | null => {
  if (!editedMap || !selectedEventArea || !editingEventId) return null;

  const area = editedMap.eventAreas?.find(a => a.id === selectedEventArea);
  if (!area) return null;

  return area.events.find(e => e.id === editingEventId) || null;
};

const handleSaveEvent = (event: AreaEvent) => {
  if (!editedMap || !selectedEventArea) return;

  setEditedMap({
    ...editedMap,
    eventAreas: editedMap.eventAreas?.map(area => {
      if (area.id !== selectedEventArea) return area;

      // If editing existing event, replace it
      if (editingEventId) {
        return {
          ...area,
          events: area.events.map(e => e.id === editingEventId ? event : e),
        };
      }

      // Otherwise, add new event
      return {
        ...area,
        events: [...area.events, event],
      };
    }),
  });

  setEventEditorVisible(false);
  setEditingEventId(null);
};
```

### Phase 5: YAML Export Integration (30 minutes)

**Goal:** Include eventAreas in YAML export.

#### Step 5.1: Update handleExportMaps

**File:** `react-app/src/components/developer/AreaMapRegistryPanel.tsx`

**Location:** In handleExportMaps function (around line 176-191)

**Change:**
```typescript
// OLD
return {
  id: json.id,
  name: json.name,
  description: json.description,
  tilesetId: json.tilesetId,
  grid: gridToASCII(map),
  playerSpawn: json.playerSpawn,
  interactiveObjects: json.interactiveObjects,
  npcSpawns: json.npcSpawns,
  encounterZones: json.encounterZones,
};

// NEW
return {
  id: json.id,
  name: json.name,
  description: json.description,
  tilesetId: json.tilesetId,
  grid: gridToASCII(map),
  playerSpawn: json.playerSpawn,
  interactiveObjects: json.interactiveObjects,
  npcSpawns: json.npcSpawns,
  encounterZones: json.encounterZones,
  eventAreas: json.eventAreas, // ADD THIS LINE
};
```

### Phase 6: Testing and Validation (1 hour)

**Goal:** Test all features and fix bugs.

#### Test Checklist:

**Event Area Creation:**
- [ ] Click-drag creates rectangular event area
- [ ] Area appears with correct bounds
- [ ] Area is automatically selected
- [ ] Multiple areas can be created without overlap issues

**Event Area Selection:**
- [ ] Click event area selects it (green border)
- [ ] Properties show in right sidebar
- [ ] Description can be edited
- [ ] Delete button removes area

**Event Management:**
- [ ] Add Event button opens modal
- [ ] Event list shows all events
- [ ] Edit button opens modal with event data
- [ ] Delete button removes event

**Event Editor:**
- [ ] All fields editable
- [ ] Trigger dropdown works
- [ ] One-time checkbox works
- [ ] Can add all 3 precondition types
- [ ] Can edit precondition fields
- [ ] Can delete preconditions
- [ ] Can add all 5 action types
- [ ] Can edit action fields
- [ ] Can reorder actions (up/down)
- [ ] Can delete actions
- [ ] Save updates event correctly
- [ ] Cancel discards changes

**YAML Export:**
- [ ] Export includes eventAreas
- [ ] Exported YAML is valid
- [ ] Re-importing works correctly

**Integration:**
- [ ] Switching tools doesn't break state
- [ ] Saving map preserves event areas
- [ ] Cancel editing discards event changes

## Common Issues and Solutions

### Issue 1: Type Imports

**Problem:** EventArea, EventPrecondition, EventAction types not found.

**Solution:** Add proper imports:
```typescript
import type { EventArea, AreaEvent } from '../../models/area/EventArea';
import type { EventPrecondition } from '../../models/area/EventPrecondition';
import type { EventAction } from '../../models/area/EventAction';
import { EventTrigger } from '../../models/area/EventTrigger';
import { PreconditionFactory } from '../../models/area/preconditions/PreconditionFactory';
import { ActionFactory } from '../../models/area/actions/ActionFactory';
```

### Issue 2: Immutable State Updates

**Problem:** State not updating correctly.

**Solution:** Always use spread operator and create new objects:
```typescript
// GOOD
setEditedMap({
  ...editedMap,
  eventAreas: editedMap.eventAreas?.map(area =>
    area.id === areaId ? { ...area, description } : area
  ),
});

// BAD
editedMap.eventAreas[0].description = description; // Mutates state!
```

### Issue 3: Factory Pattern for JSON Deserialization

**Problem:** Preconditions/Actions not creating class instances from JSON.

**Solution:** Use factories:
```typescript
// Create from JSON
const precondition = PreconditionFactory.fromJSON({
  type: 'GlobalVariableIs',
  variableName: 'test',
  expectedValue: true,
});

const action = ActionFactory.fromJSON({
  type: 'ShowMessage',
  message: 'Hello',
});
```

## File Summary

**Modified Files:**
1. `react-app/src/components/developer/AreaMapRegistryPanel.tsx` - Add events tool mode, state, handlers, UI

**New Files:**
1. `react-app/src/components/developer/EventEditorModal.tsx` - Event editor modal component

**Total Lines of Code:** ~800 lines (500 in modal, 300 in panel modifications)

## Estimated Time

**Total:** 7-8 hours

- Phase 1: Add Events Tool Mode - 1 hour
- Phase 2: Event Area Creation - 1.5 hours
- Phase 3: Event Area Properties Panel - 1 hour
- Phase 4: Event Editor Modal - 2.5 hours
- Phase 5: YAML Export Integration - 30 minutes
- Phase 6: Testing and Validation - 1 hour

## Success Criteria

The event editor is complete when:

1. ✅ "Events" tool mode appears in tool selection
2. ✅ Event areas render as colored overlays on map
3. ✅ Click-drag creates new event areas
4. ✅ Clicking area selects it and shows properties
5. ✅ Can edit area description
6. ✅ Can delete event area
7. ✅ Can add new events to area
8. ✅ Can edit existing events
9. ✅ Can delete events
10. ✅ Event editor modal supports all precondition types
11. ✅ Event editor modal supports all action types
12. ✅ Actions can be reordered with up/down buttons
13. ✅ YAML export includes eventAreas
14. ✅ Exported maps can be re-imported successfully
15. ✅ All features work without console errors

---

**Implementation Status:** 📋 READY TO IMPLEMENT

**Next Step:** Begin Phase 1 - Add Events Tool Mode

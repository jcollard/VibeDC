# Turn Order Unit Selection Implementation Plan

**Date:** 2025-10-27
**Feature:** Enable unit selection by clicking sprites in TurnOrderRenderer
**Branch:** select-unit-from-atb
**Priority:** Medium
**Complexity:** Low

---

## Overview

Currently, users can click on units in the map view to select them and view their stats/movement range. This plan adds the ability to click on unit sprites in the **TurnOrderRenderer** (top panel) to achieve the same result. This improves UX by allowing unit selection from either the map or the turn order display.

The TurnOrderRenderer already has the infrastructure for click handling (`onUnitClick` callback), but it's not currently connected to the UnitTurnPhaseHandler's selection logic. This plan wires them together.

---

## Requirements

### Visual Specifications
- No new visual elements required
- Existing unit sprites in TurnOrderRenderer become clickable
- Selected unit displays same cursors/highlights as map selection:
  - Red target cursor on selected unit (existing behavior)
  - Yellow movement range highlights (existing behavior)
  - Unit info panel updates to show selected unit (existing behavior)

### Behavior Specifications
- Clicking a unit sprite in the turn order panel selects that unit
- Same behavior as clicking the unit on the map:
  - Sets targeted unit
  - Calculates and displays movement range
  - Updates info panel
  - Adds "Selected [unit name]" message to combat log
- Click priority (already established in TurnOrderRenderer):
  1. Scroll arrows (if visible)
  2. Unit sprites
  3. Panel background (no action)

### Technical Requirements
- Must follow GeneralGuidelines.md patterns
- Reuse existing selection logic from `handleMapClick()`
- No performance regressions
- Type-safe event handling

---

## Implementation Tasks

### 1. Extract Unit Selection Logic (Foundation)

**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**
```typescript
/**
 * Select a unit and calculate its movement range.
 * Called by both map clicks and turn order clicks.
 */
private selectUnit(unit: CombatUnit, position: Position): void {
  this.targetedUnit = unit;
  this.targetedUnitPosition = position;

  // Calculate movement range for this unit
  this.movementRange = MovementRangeCalculator.calculateReachableTiles({
    startPosition: this.targetedUnitPosition,
    movement: this.targetedUnit.movement,
    map: this.currentState.map, // Will need to store state reference
    unitManifest: this.currentState.unitManifest,
    activeUnit: this.targetedUnit
  });
}

/**
 * Clear the currently selected unit and movement range.
 */
private clearSelection(): void {
  this.targetedUnit = null;
  this.targetedUnitPosition = null;
  this.movementRange = [];
}
```

**Rationale:**
Extracting selection logic into dedicated methods follows DRY principle and makes the code more testable. Both map clicks and turn order clicks can call the same selection method.

**Challenge:**
The `selectUnit()` method needs access to `CombatState` (for map/manifest), but it's called from `handleMapClick()` which receives state as a parameter. We'll need to either:
- **Option A:** Pass state to `selectUnit()` as a parameter
- **Option B:** Store a reference to the current state in `updatePhase()`

**Decision:** Use Option A (pass state as parameter) to avoid storing mutable state references.

---

### 2. Wire TurnOrderRenderer Click Handler (Integration)

**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**
```typescript
getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
  // ... existing turn order logic ...

  // Create or update cached renderer (maintains scroll state)
  if (!this.turnOrderRenderer) {
    this.turnOrderRenderer = new TurnOrderRenderer(
      sortedUnits,
      state.tickCount || 0
    );

    // Set click handler to select unit when clicked
    this.turnOrderRenderer.setClickHandler((unit: CombatUnit) => {
      this.handleTurnOrderUnitClick(unit, state);
    });
  } else {
    // Update units in existing renderer (preserves scroll offset)
    this.turnOrderRenderer.updateUnits(sortedUnits);
    this.turnOrderRenderer.updateTickCount(state.tickCount || 0);
  }

  return this.turnOrderRenderer;
}

/**
 * Handle unit clicks from the turn order panel
 */
private handleTurnOrderUnitClick(unit: CombatUnit, state: CombatState): void {
  // Find the unit's position on the map
  const placement = state.unitManifest.getAllUnits().find(p => p.unit === unit);

  if (!placement) {
    console.warn(`[UnitTurnPhaseHandler] Clicked unit not found in manifest: ${unit.name}`);
    return;
  }

  // Use shared selection logic
  this.selectUnit(unit, placement.position, state);

  // Add combat log message
  this.pendingLogMessages.push(`Selected ${unit.name}`);
}
```

**Rationale:**
- Reuses existing `setClickHandler()` method from TurnOrderRenderer
- Follows the same pattern as map click handling
- Logs to combat log for user feedback

**Challenge:**
The `getTopPanelRenderer()` receives state as a parameter, but the click handler will be called later (asynchronously) when the user clicks. At that point, the state might have changed.

**Solutions:**
1. **Capture state in closure** - The click handler captures the current state from `getTopPanelRenderer()`. This is safe because:
   - Phase handlers are recreated on phase transitions
   - State changes within the same phase update via `updatePhase()` return value
   - The user can't click during state transitions (single-threaded)

2. **Store state reference** - Store `currentState` in instance variable during `updatePhase()` and reference it in click handler. This ensures the handler always uses the latest state.

**Decision:** Use Solution 2 (store state reference) for consistency with the rest of the codebase and to ensure we always use the latest state.

---

### 3. Update Map Click Handler (Refactor)

**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**
```typescript
handleMapClick(
  context: MouseEventContext,
  state: CombatState,
  _encounter: CombatEncounter
): PhaseEventResult {
  const { tileX, tileY } = context;

  if (tileX === undefined || tileY === undefined) {
    return { handled: false };
  }

  // Check if a unit is at this position
  const unit = state.unitManifest.getUnitAtPosition({ x: tileX, y: tileY });

  if (unit) {
    // Use shared selection logic
    this.selectUnit(unit, { x: tileX, y: tileY }, state);

    return {
      handled: true,
      logMessage: `Selected ${unit.name}`
    };
  } else {
    // Clear selection if clicking empty tile
    this.clearSelection();

    return {
      handled: true,
      logMessage: `Clicked tile (${tileX}, ${tileY})`
    };
  }
}
```

**Rationale:**
Simplifies `handleMapClick()` by delegating to shared selection logic. No functional change, just cleaner code.

---

### 4. Store State Reference (State Management)

**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**
```typescript
export class UnitTurnPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // ... existing fields ...

  // Store current state for click handlers
  private currentState: CombatState | null = null;

  // ... existing methods ...

  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // Store state reference for click handlers
    this.currentState = state;

    // ... rest of existing updatePhase logic ...
  }
}
```

**Rationale:**
Click handlers need access to the current state (for manifest lookups). Storing a reference ensures handlers always use the latest state.

**Safety:**
This is safe because:
- Phase handlers are recreated on phase transitions
- State is immutable (new objects on changes)
- Reference is updated every frame in `updatePhase()`

---

## Testing Plan

- [ ] Click unit sprite in turn order panel selects that unit
- [ ] Selected unit shows red cursor on map
- [ ] Movement range displays correctly (yellow tiles)
- [ ] Info panel updates to show selected unit stats
- [ ] Combat log shows "Selected [unit name]" message
- [ ] Clicking another unit in turn order changes selection
- [ ] Clicking empty map tile clears turn order selection
- [ ] Clicking unit on map still works (no regression)
- [ ] Scroll arrows in turn order still work (priority over unit clicks)
- [ ] Works correctly with 8+ units (scrolling)
- [ ] No visual regressions
- [ ] No performance regressions

---

## Implementation Order

1. **Task 4: Store State Reference** - Foundation for click handlers (no dependencies)
2. **Task 1: Extract Selection Logic** - Refactor existing code (depends on #1)
3. **Task 3: Update Map Click Handler** - Use new selection methods (depends on #2)
4. **Task 2: Wire Turn Order Click Handler** - Add new functionality (depends on #1, #2, #4)
5. **Testing** - Verify all behaviors (depends on all above)

---

## Notes & Decisions

### Decision: State Reference vs. Parameter Passing

**Choice:** Store `currentState` reference in instance variable
**Alternative:** Pass state to `selectUnit()` and capture in closure
**Rationale:**
- Simpler code (no closure state capture)
- Consistent with how other handlers work
- Always uses latest state (updated every frame)
- Safe because phase handlers are recreated on transitions

**Tradeoff:** Adds one instance variable (negligible memory)

### Decision: Reuse Existing Click Infrastructure

**Choice:** Use `TurnOrderRenderer.setClickHandler()`
**Alternative:** Create new event handling in `getTopPanelRenderer()`
**Rationale:**
- TurnOrderRenderer already has click detection logic
- Already handles priority (scroll arrows vs. units)
- Already calculates sprite bounds
- No need to duplicate click detection logic

### Guidelines Compliance

- ✅ Reuses existing selection logic (DRY principle)
- ✅ Type-safe event handling (TypeScript)
- ✅ Caches stateful components (TurnOrderRenderer)
- ✅ No performance regressions (reuses existing logic)
- ✅ Follows existing patterns (click handlers, callbacks)
- ✅ Clear separation of concerns (renderer handles clicks, handler handles logic)

### Performance Considerations

- No additional rendering (existing sprites become clickable)
- No additional calculations (reuses movement range logic)
- Click handler is O(1) lookup (manifest lookup by unit instance)
- No memory leaks (callbacks cleared when phase handler is recreated)

---

## Success Criteria

✅ All visual specs met (no new visuals, existing behavior)
✅ All behavioral specs met (click units in turn order to select)
✅ All tests pass
✅ No regressions (map clicks, scroll arrows still work)
✅ 100% compliance with GeneralGuidelines.md
✅ Performance within acceptable limits (no new allocations)

---

**End of Implementation Plan**

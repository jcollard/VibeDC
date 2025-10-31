# Phase 2: Turn Order and Action Timer - Detailed Implementation Guide

**Version:** 1.0
**Created:** 2025-10-31
**Status:** Ready for Implementation
**Prerequisites:** Phase 1 (Visual Representation) must be completed
**Related:** [KOFeatureOverview.md](./KOFeatureOverview.md), [01-VisualRepresentation.md](./01-VisualRepresentation.md), [CombatHierarchy.md](../../CombatHierarchy.md)

---

## Overview

### Goal
Update turn order display to show KO'd units at the end with grey tint and "KO" label, and prevent KO'd units from accumulating action timer progress or getting turns.

### Rationale
- Combines visual turn order changes with mechanical action timer behavior
- Turn order display and action timer logic are tightly coupled
- Both systems use the same sorting logic for KO'd units
- Testing both together provides comprehensive validation
- Reduces integration overhead between related systems

### What This Phase Implements

**Visual Changes:**
1. KO'd units appear at the END of the turn order list
2. KO'd unit sprites have grey tint in turn order display
3. "KO" label replaces ticks-until-ready number for KO'd units

**Mechanical Changes:**
1. KO'd units' action timers do NOT accumulate (stay at 0)
2. KO'd units NEVER trigger transition to unit turn phase
3. Turn order sorting places KO'd units at end consistently

### Files to Modify
1. `models/combat/managers/renderers/TurnOrderRenderer.ts` (visual + sorting)
2. `models/combat/ActionTimerPhaseHandler.ts` (timer accumulation + sorting)
3. `models/combat/UnitTurnPhaseHandler.ts` (ready unit selection + sorting)

### Important: TurnOrderRenderer Lifecycle

**Note on Component Caching:**
Per GeneralGuidelines.md, `TurnOrderRenderer` instances are cached in phase handlers (not recreated each frame) because they maintain scroll state. This guide modifies the existing cached instance's `render()` method and adds a helper method, but does NOT change the caching pattern itself. The renderer instance continues to live for the entire combat encounter.

**Why This Matters:**
- The `getSortedUnits()` helper method (Step 2.1) will be called each frame
- Sorting ~15 units per frame is acceptable (<0.1ms)
- No need to cache sorted arrays (would violate Guidelines: stale data risk)
- Scroll state remains in the renderer instance (unchanged)

---

## Prerequisites Check

Before starting Phase 2, verify Phase 1 is complete:

```typescript
// In browser console during combat
const unit = window.combatState.unitManifest.getAllUnits()[0].unit;

// Should exist and work
console.assert(typeof unit.isKnockedOut === 'boolean', 'isKnockedOut getter missing');

// Should be defined
console.assert(CombatConstants.KNOCKED_OUT !== undefined, 'KNOCKED_OUT constants missing');
console.assert(CombatConstants.KNOCKED_OUT.TURN_ORDER_TEXT === 'KO', 'Turn order text incorrect');
console.assert(CombatConstants.KNOCKED_OUT.TURN_ORDER_COLOR === '#ff0000', 'Turn order color incorrect');

// Visual check: KO a unit and verify grey tint + red "KO" text on map
unit.wounds = unit.maxHealth;
// Should see grey unit with red "KO" text on map
```

If any assertions fail, complete Phase 1 first.

---

## Step-by-Step Implementation

### Step 2.1: Update TurnOrderRenderer - Add Sorting Helper

**File:** `models/combat/managers/renderers/TurnOrderRenderer.ts`

**Location:** Add as a private method near other helper methods (likely after constructor, before `render()`)

**Find the class structure:**
```typescript
export class TurnOrderRenderer {
  // ... private fields ...

  constructor(...) {
    // ...
  }

  // ADD NEW METHOD HERE (before render())

  render(...) {
    // ...
  }
}
```

**Code to Add:**
```typescript
  /**
   * Returns units sorted with active units first (by ticks-until-ready),
   * then KO'd units at the end.
   *
   * Active units are sorted by:
   * 1. Ticks-until-ready (ascending) - units closer to acting appear first
   * 2. Name (alphabetically) - tiebreaker for units with same ticks
   *
   * KO'd units are unsorted and appear at the end (order doesn't matter).
   *
   * @returns Sorted array of units (active first, KO'd last)
   */
  private getSortedUnits(units: CombatUnit[]): CombatUnit[] {
    // Partition units into active and KO'd
    const activeUnits = units.filter(u => !u.isKnockedOut);
    const koUnits = units.filter(u => u.isKnockedOut);

    // Sort active units by ticks-until-ready (ascending), then alphabetically
    activeUnits.sort((a, b) => {
      // Calculate ticks remaining until actionTimer reaches 100
      const ticksA = Math.ceil((100 - a.actionTimer) / a.speed);
      const ticksB = Math.ceil((100 - b.actionTimer) / b.speed);

      // Primary sort: ticks-until-ready (ascending)
      if (ticksA !== ticksB) {
        return ticksA - ticksB;
      }

      // Tiebreaker: alphabetical by name
      return a.name.localeCompare(b.name);
    });

    // Return active units first, then KO'd units (unsorted)
    return [...activeUnits, ...koUnits];
  }
```

**Rationale:**
- Separates sorting logic from rendering logic (single responsibility principle)
- Active units sorted by ticks-until-ready (existing logic, preserved)
- KO'd units unsorted at end (order doesn't matter for KO'd units)
- Uses spread operator for clean concatenation (no mutation)
- Alphabetical tiebreaker ensures deterministic ordering

**Why Use Getter Instead of Map/WeakMap:**
- `isKnockedOut` is derived from `wounds >= maxHealth` (implemented in Phase 1)
- No need for separate storage or cache invalidation
- No risk of stale data (always reflects current wounds/maxHealth state)
- Follows GeneralGuidelines.md principle: use getters for derived state
- Simpler code (no additional data structure to maintain)

**Guidelines Compliance:**
- ✅ No per-frame allocations (filter/sort operate on existing arrays)
- ✅ Uses getter (`u.isKnockedOut`) for derived state
- ✅ No stored state
- ✅ Pure function (no side effects)

---

### Step 2.2: Update TurnOrderRenderer - Use Sorted Units in Render

**File:** `models/combat/managers/renderers/TurnOrderRenderer.ts`

**Location:** In the `render()` method, find where units are prepared for rendering

**Find This Pattern (approximate structure):**
```typescript
render(
  ctx: CanvasRenderingContext2D,
  units: CombatUnit[],  // <-- Input units
  // ... other parameters ...
) {
  // ... early setup ...

  // Calculate visible range
  const visibleStartIndex = this.scrollOffset;
  const visibleEndIndex = Math.min(units.length, visibleStartIndex + maxVisibleUnits);
  const visibleUnits = units.slice(visibleStartIndex, visibleEndIndex);

  // Render loop
  for (let i = 0; i < visibleUnits.length; i++) {
    // ...
  }
}
```

**Replace the visible units calculation with:**
```typescript
  // Sort units: active first (by ticks-until-ready), KO'd at end
  const sortedUnits = this.getSortedUnits(units);

  // Calculate visible range based on sorted order
  const visibleStartIndex = this.scrollOffset;
  const visibleEndIndex = Math.min(sortedUnits.length, visibleStartIndex + maxVisibleUnits);
  const visibleUnits = sortedUnits.slice(visibleStartIndex, visibleEndIndex);
```

**Important:** Also update the scroll clamping logic to use `sortedUnits.length`:

**Find scroll offset calculation (likely near the visible range calculation):**
```typescript
// Clamp scroll offset to valid range
const maxOffset = Math.max(0, units.length - maxVisibleUnits);
this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
```

**Replace with:**
```typescript
// Clamp scroll offset to valid range (after sorting)
const maxOffset = Math.max(0, sortedUnits.length - maxVisibleUnits);
this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
```

**Rationale:**
- Uses helper method for clean separation
- Preserves scroll offset behavior (no breaking changes)
- `sortedUnits` replaces raw `units` in all subsequent calculations
- Scroll clamping ensures valid range after sorting

**Guidelines Compliance:**
- ✅ No additional allocations (just replaces which array is sliced)
- ✅ Preserves existing rendering logic
- ✅ No breaking changes to public API

---

### Step 2.3: Update TurnOrderRenderer - Apply Grey Tint

**File:** `models/combat/managers/renderers/TurnOrderRenderer.ts`

**Location:** In the `render()` method, in the unit rendering loop where sprites are drawn

**Before modifying the render loop, ensure CombatConstants is imported:**
```typescript
import { CombatConstants } from '../../CombatConstants';
```

If already imported, skip this step. Check the top of the file for existing imports.

**Find the sprite rendering code (approximate):**
```typescript
for (let i = 0; i < visibleUnits.length; i++) {
  const unit = visibleUnits[i];

  // Calculate position
  const unitX = /* ... calculation ... */;
  const unitY = /* ... calculation ... */;

  // Render unit sprite
  SpriteRenderer.renderSpriteById(
    ctx,
    unit.spriteId,
    spriteImages,
    spriteSize,
    unitX,
    unitY,
    /* ... other params ... */
  );

  // Render other UI elements (name, ticks, etc.)
  // ...
}
```

**Wrap the sprite rendering with filter application:**
```typescript
  // Apply grey tint for KO'd units
  if (unit.isKnockedOut) {
    ctx.filter = CombatConstants.KNOCKED_OUT.TINT_FILTER;
  }

  // Render unit sprite
  SpriteRenderer.renderSpriteById(
    ctx,
    unit.spriteId,
    spriteImages,
    spriteSize,
    unitX,
    unitY,
    /* ... other params ... */
  );

  // Reset filter (prevent bleed to other elements)
  if (unit.isKnockedOut) {
    ctx.filter = 'none';
  }
```

**Rationale:**
- Same grey tint as map rendering (Phase 1) - consistency
- Filter applied before render, reset after (no bleed to text/UI)
- Simple conditional - negligible performance impact
- Uses centralized constant

**Guidelines Compliance:**
- ✅ Uses Canvas Filter API (hardware-accelerated)
- ✅ Always resets filter after use
- ✅ No per-frame allocations
- ✅ Uses centralized constants

---

### Step 2.4: Update TurnOrderRenderer - Replace Ticks with "KO" Label

**File:** `models/combat/managers/renderers/TurnOrderRenderer.ts`

**Location:** In the `render()` method, where ticks-until-ready is rendered below the unit sprite

**Find the ticks rendering code (approximate):**
```typescript
  // Calculate ticks-until-ready
  const ticksUntilReady = Math.ceil((100 - unit.actionTimer) / unit.speed);

  // Render ticks below sprite
  FontAtlasRenderer.renderText(
    ctx,
    ticksUntilReady.toString(),
    textX,
    textY,
    fontId,
    fontAtlasImage,
    1,  // scale
    'center',
    '#ffffff'  // White
  );
```

**Replace with conditional rendering:**
```typescript
  // Render "KO" label for knocked out units, ticks for active units
  if (unit.isKnockedOut) {
    // Render red "KO" label
    const koText = CombatConstants.KNOCKED_OUT.TURN_ORDER_TEXT;
    const koColor = CombatConstants.KNOCKED_OUT.TURN_ORDER_COLOR;

    FontAtlasRenderer.renderText(
      ctx,
      koText,
      textX,
      textY,
      fontId,
      fontAtlasImage,
      1,  // scale
      'center',
      koColor  // Red
    );
  } else {
    // Render ticks-until-ready for active units
    const ticksUntilReady = Math.ceil((100 - unit.actionTimer) / unit.speed);

    FontAtlasRenderer.renderText(
      ctx,
      ticksUntilReady.toString(),
      textX,
      textY,
      fontId,
      fontAtlasImage,
      1,  // scale
      'center',
      '#ffffff'  // White
    );
  }
```

**Rationale:**
- Conditional rendering based on KO status
- Uses centralized constants for "KO" text and red color
- Preserves existing ticks-until-ready logic for active units
- Clear visual distinction (red "KO" vs white number)

**Coordinate Rounding Note:**
If `textX` or `textY` are calculated (not tile-aligned), ensure they're rounded for pixel-perfect rendering per GeneralGuidelines.md:
```typescript
const textX = Math.floor(calculatedX);
const textY = Math.floor(calculatedY);
```

If coordinates are already integers from tile calculations, explicit rounding is optional but recommended for future-proofing.

**Guidelines Compliance:**
- ✅ Uses FontAtlasRenderer (not ctx.fillText)
- ✅ Uses centralized constants
- ✅ No per-frame allocations (just primitives)
- ✅ Coordinates rounded for pixel-perfect rendering (if calculated)

---

### Step 2.5: Update ActionTimerPhaseHandler - Prevent Timer Accumulation

**File:** `models/combat/ActionTimerPhaseHandler.ts`

**Location:** In the tick simulation logic, where action timers are incremented

**Find the timer increment loop (likely in `updatePhase()` or similar method):**

Look for patterns like:
- `unit.actionTimer +=`
- `simulateTicks()`
- Loop over `getAllUnits()` with timer calculations

**Find This Pattern (approximate):**
```typescript
// Increment action timers for each tick
for (const placement of allUnits) {
  const unit = placement.unit;
  const currentTimer = unit.actionTimer;
  const increment = unit.speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER;
  const newTimer = currentTimer + increment;

  // Update timer (may use mutation or state update pattern)
  (unit as any)._actionTimer = newTimer;
}
```

**Add KO check at the start of the loop:**
```typescript
// Increment action timers for each tick (skip KO'd units)
for (const placement of allUnits) {
  const unit = placement.unit;

  // Skip knocked out units - they don't accumulate action timer
  if (unit.isKnockedOut) {
    // Ensure timer stays at 0 (defensive - should already be 0)
    (unit as any)._actionTimer = 0;
    continue;
  }

  // Accumulate timer for active units (existing logic)
  const currentTimer = unit.actionTimer;
  const increment = unit.speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER;
  const newTimer = currentTimer + increment;

  // Update timer
  (unit as any)._actionTimer = newTimer;
}
```

**Rationale:**
- KO'd units' timers forced to 0 (no accumulation)
- `continue` skips rest of loop body (clear intent, avoids nesting)
- Preserves existing timer calculation for active units
- Defensive programming (ensures timer is 0, even if corrupted)

**Important Note:** The actual timer update mechanism may vary. Adapt the code to match the existing pattern in the file.

**How to Identify the Timer Update Pattern:**

1. **Search for `_actionTimer` in the file:**
   - If found: Likely uses direct mutation pattern
   - Example: `(unit as any)._actionTimer = value`

2. **Search for `WeakMap` or `Map` declarations:**
   - If found with timer-related names: Likely uses timer map pattern
   - Example: `unitTimers.set(unit, value)`

3. **Search for `{ ...state` returns in updatePhase():**
   - If found: Likely uses immutable state updates
   - Example: `return { ...state, updatedTimers: newTimersMap }`

**Adapt based on what you find:**
- If direct mutation: Use `(unit as any)._actionTimer = 0` as shown above
- If timer map: Use `unitTimers.set(unit, 0)` instead
- If state updates: Create new state with timer set to 0

Match the existing pattern you find.

**Guidelines Compliance:**
- ✅ Uses getter (`unit.isKnockedOut`)
- ✅ No additional allocations
- ✅ Early return pattern (continue)
- ✅ Preserves existing logic

---

### Step 2.6: Update ActionTimerPhaseHandler - Sort Turn Order

**File:** `models/combat/ActionTimerPhaseHandler.ts`

**Location:** Where the turn order is prepared for display (likely in `getInfoPanelContext()` or where `TurnOrderRenderer` is called)

**Find where units are passed to TurnOrderRenderer (approximate):**
```typescript
// Prepare turn order for display
const turnOrderRenderer = new TurnOrderRenderer(/* ... */);
turnOrderRenderer.render(ctx, allUnits, /* ... */);
```

OR find turn order sorting logic:
```typescript
// Sort units for turn order display
const turnOrder = allUnits.sort((a, b) => {
  const ticksA = Math.ceil((100 - a.actionTimer) / a.speed);
  const ticksB = Math.ceil((100 - b.actionTimer) / b.speed);
  if (ticksA !== ticksB) return ticksA - ticksB;
  return a.name.localeCompare(b.name);
});
```

**Important:** TurnOrderRenderer now handles sorting internally (Step 2.2), so you may NOT need to change ActionTimerPhaseHandler if it just passes raw units.

**IF sorting exists in ActionTimerPhaseHandler, replace it with:**
```typescript
// Partition units: active and KO'd
const activeUnits = allUnits.filter(u => !u.isKnockedOut);
const koUnits = allUnits.filter(u => u.isKnockedOut);

// Sort active units by ticks-until-ready (ascending)
activeUnits.sort((a, b) => {
  const ticksA = Math.ceil((100 - a.actionTimer) / a.speed);
  const ticksB = Math.ceil((100 - b.actionTimer) / b.speed);
  if (ticksA !== ticksB) return ticksA - ticksB;
  return a.name.localeCompare(b.name);
});

// Combine: active first, KO'd at end
const turnOrder = [...activeUnits, ...koUnits];
```

**IF no sorting exists (units passed directly to TurnOrderRenderer):**
```typescript
// No changes needed - TurnOrderRenderer handles sorting (Step 2.2)
```

**Rationale:**
- Matches TurnOrderRenderer sorting (Step 2.1)
- KO'd units appear at end consistently
- May not be needed if TurnOrderRenderer handles it

---

### Step 2.7: Update UnitTurnPhaseHandler - Skip KO'd in Ready Unit Selection

**File:** `models/combat/UnitTurnPhaseHandler.ts`

**Location:** Where the ready unit is identified (likely in constructor or `enterPhase()`)

**Find the ready unit selection logic:**

Look for patterns like:
- `find(u => u.actionTimer >= 100)`
- `getReadyUnit()`
- Loop checking `actionTimer >= 100`

**Find This Pattern (approximate):**
```typescript
// Find first ready unit (actionTimer >= 100)
const readyUnit = turnOrder.find(u => u.actionTimer >= 100);

if (!readyUnit) {
  console.error('No ready unit found - should not happen');
  return null;
}
```

**Add KO check to the condition:**
```typescript
// Find first ready unit (actionTimer >= 100, skip KO'd)
const readyUnit = turnOrder.find(u => !u.isKnockedOut && u.actionTimer >= 100);

if (!readyUnit) {
  console.error('No ready unit found - should not happen');
  return null;
}
```

**Rationale:**
- Simple additional check
- KO'd units never selected for turns (even if timer is 100+)
- Preserves existing ready unit logic
- Defense against edge cases (e.g., timer manually set to 100 via console)

**Alternative Pattern:** If the code uses a loop instead of `find()`:
```typescript
// Find first ready unit
let readyUnit = null;
for (const unit of turnOrder) {
  // Skip KO'd units
  if (unit.isKnockedOut) continue;

  if (unit.actionTimer >= 100) {
    readyUnit = unit;
    break;
  }
}
```

**Guidelines Compliance:**
- ✅ Uses getter (`unit.isKnockedOut`)
- ✅ No additional allocations
- ✅ Simple boolean check

---

### Step 2.8: Update UnitTurnPhaseHandler - Sort Turn Order

**File:** `models/combat/UnitTurnPhaseHandler.ts`

**Location:** Where turn order is prepared for TurnOrderRenderer (likely in `getInfoPanelContext()`)

**Find where units are passed to TurnOrderRenderer (approximate):**
```typescript
// Prepare turn order for display
const turnOrderRenderer = new TurnOrderRenderer(/* ... */);
turnOrderRenderer.render(ctx, allUnits, /* ... */);
```

**Important:** Same as Step 2.6 - TurnOrderRenderer now handles sorting internally (Step 2.2).

**IF sorting exists in UnitTurnPhaseHandler, apply same logic as Step 2.6:**
```typescript
// Partition units: active and KO'd
const activeUnits = allUnits.filter(u => !u.isKnockedOut);
const koUnits = allUnits.filter(u => u.isKnockedOut);

// Sort active units by ticks-until-ready
activeUnits.sort((a, b) => {
  const ticksA = Math.ceil((100 - a.actionTimer) / a.speed);
  const ticksB = Math.ceil((100 - b.actionTimer) / b.speed);
  if (ticksA !== ticksB) return ticksA - ticksB;
  return a.name.localeCompare(b.name);
});

// Combine: active first, KO'd at end
const turnOrder = [...activeUnits, ...koUnits];
```

**IF no sorting exists:**
```typescript
// No changes needed - TurnOrderRenderer handles sorting (Step 2.2)
```

**Rationale:**
- Consistency across both phase handlers
- KO'd units always at end in turn order display

---

## Testing Phase 2

### Build Verification

```bash
cd react-app
npm run build
```

**Expected:** No TypeScript errors

### Manual Test 1: Turn Order Display

**Setup:**
1. Start combat encounter
2. Open browser console
3. KO multiple units:
   ```javascript
   const units = window.combatState.unitManifest.getAllUnits();

   // KO first two units
   units[0].unit.wounds = units[0].unit.maxHealth;
   units[1].unit.wounds = units[1].unit.maxHealth;
   ```

**Verify:**
- ✅ KO'd units appear at END of turn order list (below all active units)
- ✅ KO'd unit sprites have grey tint in turn order display
- ✅ "KO" label (red) appears below KO'd unit sprites
- ✅ Active units show ticks-until-ready (white number) normally
- ✅ Turn order updates correctly when new units become KO'd

### Manual Test 2: Action Timer Accumulation

**Setup:**
1. Start combat, wait for action-timer phase
2. Open browser console
3. KO one unit:
   ```javascript
   const units = window.combatState.unitManifest.getAllUnits();
   units[0].unit.wounds = units[0].unit.maxHealth;
   ```
4. Watch action timer tick animation for several seconds

**Verify:**
- ✅ KO'd unit's action timer stays at 0 (no accumulation)
- ✅ Active units' timers increase normally
- ✅ KO'd unit never triggers transition to unit-turn phase
- ✅ Turn order display shows KO'd unit at end with "KO" label

### Manual Test 3: Ready Unit Selection

**Setup:**
1. Start combat, reach action-timer phase
2. Use console to set a KO'd unit's timer to 100:
   ```javascript
   const units = window.combatState.unitManifest.getAllUnits();

   // KO a unit
   units[0].unit.wounds = units[0].unit.maxHealth;

   // Manually force timer to 100 (should be ignored)
   (units[0].unit as any)._actionTimer = 100;
   ```
3. Wait for action timer phase to complete

**Verify:**
- ✅ KO'd unit NOT selected for turn (even with timer = 100)
- ✅ Next active unit with timer >= 100 gets the turn
- ✅ No errors in console

### Manual Test 4: Scroll Behavior

**Setup:**
1. Create encounter with 10+ units (or use console to add more)
2. Scroll down in turn order display
3. KO several units via console

**Verify:**
- ✅ Scroll position preserved when units become KO'd
- ✅ Scroll range clamped correctly (no invalid scroll states)
- ✅ Can still scroll through all units (active + KO'd)
- ✅ KO'd units always at end regardless of scroll position

### Edge Cases to Test

1. **All Units KO'd Except One:**
   - KO all but one unit
   - Verify: Last unit still gets turns, appears first in turn order

2. **Unit Becomes KO'd During Turn:**
   - Start a unit's turn
   - KO that unit via console (simulate mid-turn damage)
   - Verify: Turn continues normally (Phase 2 doesn't handle mid-turn KO)

3. **Multiple Units Same Ticks:**
   - Set multiple units to same actionTimer value
   - Verify: Alphabetical ordering preserved (tiebreaker)

4. **Revival:**
   - KO a unit
   - Revive it: `unit.wounds = 0`
   - Verify: Unit rejoins active list, timer accumulates again

### Performance Check

**Test in combat with 15+ units (10 active, 5+ KO'd):**
- ✅ 60 FPS maintained
- ✅ No stutter during action timer ticks
- ✅ Turn order display scrolls smoothly

**Expected Impact:**
- Sorting ~15 units per frame: <0.1ms
- Filter checks: <0.05ms per unit
- Total overhead: <2ms per frame (well under 16.67ms budget)

---

## Acceptance Criteria

### Visual Requirements
- ✅ KO'd units appear at END of turn order list
- ✅ KO'd unit sprites have grey tint (same as map)
- ✅ "KO" label (red) appears below KO'd sprites
- ✅ Active units show white ticks-until-ready normally
- ✅ Turn order scrolling works correctly

### Mechanical Requirements
- ✅ KO'd units' action timers stay at 0
- ✅ KO'd units never trigger unit-turn phase
- ✅ Active units accumulate timer normally
- ✅ Ready unit selection skips KO'd units
- ✅ Manually setting KO'd unit timer to 100 - unit still skipped

### Integration Requirements
- ✅ No visual glitches or rendering errors
- ✅ No console errors or warnings
- ✅ Scroll state preserved correctly
- ✅ Performance maintained (60 FPS)
- ✅ TypeScript compiles clean

---

## Troubleshooting

### Issue: KO'd units not appearing at end of turn order

**Cause:** TurnOrderRenderer not using sorted units
**Fix:** Verify Step 2.2 - ensure `getSortedUnits()` is called and `sortedUnits` used in slice

### Issue: KO'd units accumulating timer

**Cause:** Missing or incorrect KO check in timer increment loop
**Fix:** Verify Step 2.5 - ensure `if (unit.isKnockedOut) continue` at start of loop

### Issue: Grey tint bleeding to other UI elements

**Cause:** `ctx.filter = 'none'` not called after sprite render
**Fix:** Verify Step 2.3 - ensure filter reset in both branches

### Issue: "KO" label not appearing in turn order

**Cause:** Conditional rendering not implemented
**Fix:** Verify Step 2.4 - ensure `if (unit.isKnockedOut)` wraps "KO" text rendering

### Issue: KO'd unit getting selected for turn

**Cause:** Missing KO check in ready unit selection
**Fix:** Verify Step 2.7 - ensure `!u.isKnockedOut &&` in find condition

---

## Rollback Plan

If issues arise, revert the following files:

1. `models/combat/managers/renderers/TurnOrderRenderer.ts`
   - Remove `getSortedUnits()` method
   - Revert `render()` to use unsorted units

2. `models/combat/ActionTimerPhaseHandler.ts`
   - Remove KO check in timer increment loop
   - Revert turn order sorting (if modified)

3. `models/combat/UnitTurnPhaseHandler.ts`
   - Remove KO check in ready unit selection
   - Revert turn order sorting (if modified)

**Effect:** KO'd units will accumulate timer again and appear in normal turn order positions.

---

## Next Steps

After Phase 2 is complete and tested:
- **Phase 3:** Movement and Pathfinding (allow units to path through KO'd units)
- **Phase 4:** Attack Range and AI Integration (exclude KO'd units from targeting)

---

## Success Criteria Summary

Phase 2 is complete when:
- ✅ Build succeeds with no TypeScript errors
- ✅ All manual tests pass
- ✅ All acceptance criteria met
- ✅ No performance degradation
- ✅ No visual glitches

Once complete, update `KOFeatureImplementationPlan.md` with implementation notes and proceed to Phase 3.

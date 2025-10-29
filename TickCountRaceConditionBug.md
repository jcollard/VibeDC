# Tick Count Race Condition Bug

**Status:** Identified - Not Yet Fixed
**Date:** 2025-10-29
**Related Files:**
- [TurnOrderRenderer.ts](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts)
- [ActionTimerPhaseHandler.ts](react-app/src/models/combat/ActionTimerPhaseHandler.ts)
- [UnitTurnPhaseHandler.ts](react-app/src/models/combat/UnitTurnPhaseHandler.ts)
- [CombatState.ts](react-app/src/models/combat/CombatState.ts)

## Symptom

During the Action Timer Phase, the timer correctly ticks up and displays the current tick count (e.g., 347). However, **sometimes** after switching to the Unit Turn Phase and back to Action Timer Phase, the timer resets to a previous value (e.g., 330) instead of continuing from where it left off.

The bug is intermittent because it depends on the timing of when the renderer is first accessed after a phase transition.

## Root Cause

### Single Source of Truth Violated

`CombatState.tickCount` is intended to be the single source of truth for the global tick counter. However, `TurnOrderRenderer` caches its own copy of `tickCount` in a private field:

```typescript
// TurnOrderRenderer.ts:12
private tickCount: number;
```

This cached value is:
1. Set during construction: `TurnOrderRenderer(units, tickCount)` - [TurnOrderRenderer.ts:40-54](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts#L40-L54)
2. Updated via: `updateTickCount(tickCount)` - [TurnOrderRenderer.ts:81-83](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts#L81-L83)
3. Read during render: `this.tickCount.toString()` - [TurnOrderRenderer.ts:296](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts#L296)

### Renderer Instance Caching

Each phase handler caches its **own separate instance** of `TurnOrderRenderer`:

**ActionTimerPhaseHandler.ts:136:**
```typescript
private turnOrderRenderer: TurnOrderRenderer | null = null;
```

**UnitTurnPhaseHandler.ts:66:**
```typescript
private turnOrderRenderer: TurnOrderRenderer | null = null;
```

These are different instances, each with their own cached `tickCount` value.

### The Race Condition

**Scenario 1: First transition (Action Timer → Unit Turn)**
1. ActionTimerPhaseHandler finishes animation at tick 347
2. Sets `state.tickCount = 347` - [ActionTimerPhaseHandler.ts:332](react-app/src/models/combat/ActionTimerPhaseHandler.ts#L332)
3. Transitions to unit-turn phase
4. UnitTurnPhaseHandler creates **new** renderer with `state.tickCount || 0` - [UnitTurnPhaseHandler.ts:666](react-app/src/models/combat/UnitTurnPhaseHandler.ts#L666)
5. **Works correctly** because new renderer reads from state ✓

**Scenario 2: Return transition (Unit Turn → Action Timer) - THE BUG**
1. UnitTurnPhaseHandler executes action (Delay/End Turn)
2. Returns state with `phase: 'action-timer'` - [UnitTurnPhaseHandler.ts:496](react-app/src/models/combat/UnitTurnPhaseHandler.ts#L496)
3. State preserves `tickCount: 347` via spread operator - [UnitTurnPhaseHandler.ts:495](react-app/src/models/combat/UnitTurnPhaseHandler.ts#L495)
4. ActionTimerPhaseHandler's `updatePhase()` is called
5. **ActionTimerPhaseHandler still has its cached renderer from the previous action-timer session!**
6. The cached renderer's internal `tickCount` field has the **old value** (e.g., 330)
7. `getTopPanelRenderer()` eventually calls `updateTickCount(currentTickNumber)` - [ActionTimerPhaseHandler.ts:672](react-app/src/models/combat/ActionTimerPhaseHandler.ts#L672)
8. **BUT** if the renderer is used before this line executes, it displays the stale value

### Timing-Dependent Manifestation

The bug is intermittent because:
- If `getTopPanelRenderer()` is called **before** the first render, `updateTickCount()` runs and the bug doesn't appear
- If there's a render cycle **between** phase transition and `updateTickCount()` being called, the stale value is displayed
- The cached renderer persists across multiple action-timer → unit-turn → action-timer cycles

### Data Flow Diagram

```
Action Timer Phase (tick 330)
  ├─ ActionTimerPhaseHandler.turnOrderRenderer.tickCount = 330
  └─ Simulates to tick 347
     └─ Sets state.tickCount = 347 ✓
     └─ Transitions to unit-turn

Unit Turn Phase (tick 347)
  ├─ UnitTurnPhaseHandler.turnOrderRenderer = new TurnOrderRenderer(units, 347) ✓
  └─ Executes Delay action
     └─ Returns {...state, phase: 'action-timer'} (tickCount: 347 preserved) ✓

Action Timer Phase (tick 347) ← BUG HERE
  ├─ ActionTimerPhaseHandler.turnOrderRenderer STILL EXISTS (cached)
  ├─ ActionTimerPhaseHandler.turnOrderRenderer.tickCount = 330 ✗ (STALE!)
  ├─ updatePhase() reads state.tickCount = 347 ✓
  └─ getTopPanelRenderer() eventually calls updateTickCount(347)
     └─ BUT renderer may be used before this call completes
```

## Fix Options

### Option 1: Eager Update in updatePhase() (Minimal Change)

**Approach:** Ensure `updateTickCount()` is called immediately in `updatePhase()` before any rendering.

**Change Location:** [ActionTimerPhaseHandler.ts:210](react-app/src/models/combat/ActionTimerPhaseHandler.ts#L210)

```typescript
// Apply pending action timer mutation FIRST
if (state.pendingActionTimerMutation) {
  const { unit, newValue } = state.pendingActionTimerMutation;
  (unit as any)._actionTimer = newValue;

  // Clear the pending mutation from state
  state = {
    ...state,
    pendingActionTimerMutation: undefined
  };

  // ← ADD THIS: Update cached renderer's tickCount immediately
  if (this.turnOrderRenderer) {
    this.turnOrderRenderer.updateTickCount(state.tickCount || 0);
  }
}
```

**Pros:**
- Minimal code change (3 lines)
- Low risk
- Preserves existing architecture

**Cons:**
- Still violates single source of truth principle
- Requires remembering to call `updateTickCount()` in multiple places
- Doesn't prevent future similar bugs

### Option 2: Pass tickCount to render() (Better Design) ⭐ RECOMMENDED

**Approach:** Make `TurnOrderRenderer.render()` accept `tickCount` as a parameter instead of caching it.

**Changes Required:**

1. **TurnOrderRenderer.ts:** Remove cached `tickCount` field, accept as render parameter
   - Remove: `private tickCount: number;` - [Line 12](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts#L12)
   - Modify constructor: Remove `tickCount` parameter logic - [Lines 40-54](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts#L40-L54)
   - Remove method: `updateTickCount()` - [Lines 81-83](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts#L81-L83)
   - Add parameter to `render()`: `tickCount: number` - [Line 217](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts#L217)
   - Use parameter: `tickCount.toString()` instead of `this.tickCount.toString()` - [Line 296](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts#L296)

2. **TopPanelRenderer.ts:** Update interface signature
   - Modify `render()` signature to accept `tickCount?: number` parameter

3. **ActionTimerPhaseHandler.ts:** Pass `tickCount` to renderer
   - Remove all `updateTickCount()` calls - [Line 672](react-app/src/models/combat/ActionTimerPhaseHandler.ts#L672)
   - Update render call sites to pass `currentTickNumber`

4. **UnitTurnPhaseHandler.ts:** Pass `tickCount` to renderer
   - Remove `updateTickCount()` call - [Line 676](react-app/src/models/combat/UnitTurnPhaseHandler.ts#L676)
   - Update render call sites to pass `state.tickCount || 0`

5. **CombatLayoutManager.ts:** Pass `tickCount` through to renderer
   - Accept `tickCount` parameter in relevant methods
   - Pass through to `renderer.render()` calls

**Pros:**
- Establishes `CombatState.tickCount` as the true single source of truth
- Prevents entire class of similar bugs
- Makes data flow explicit and easier to reason about
- Follows React/functional programming patterns (props down)

**Cons:**
- More files to modify (5+ files)
- Requires threading `tickCount` through multiple layers
- Higher risk due to more changes
- Need to update `TopPanelRenderer` interface (affects all implementations)

### Option 3: Hybrid - Pass tickCount Only When Needed

**Approach:** Keep cached `tickCount` but make it optional. Pass as parameter when available, fall back to cached value otherwise.

**Not Recommended:** This is the worst of both worlds - maintains complexity while adding new code paths.

## Recommended Solution

**Option 2** is the better long-term solution because:
1. It properly establishes `CombatState` as the single source of truth
2. It prevents similar bugs in the future
3. The data flow becomes explicit: `CombatState.tickCount` → `render(tickCount)` → display
4. It's more testable (render becomes a pure function of inputs)

However, it requires careful implementation because:
- `TopPanelRenderer` is an interface used by multiple renderers
- Need to ensure all render call sites are updated
- Risk of breaking other panel renderers if they don't handle the new parameter

## Testing the Fix

After implementing the fix, test these scenarios:

1. **Normal Flow:**
   - Start action-timer phase
   - Let timer tick from 0 to first ready unit
   - Verify tick count increases correctly

2. **Delay Action:**
   - Execute Delay action during unit-turn
   - Return to action-timer phase
   - Verify tick count **does not reset** to old value

3. **End Turn Action:**
   - Execute End Turn action during unit-turn
   - Return to action-timer phase
   - Verify tick count **does not reset** to old value

4. **Multiple Cycles:**
   - Go through multiple action-timer → unit-turn → action-timer cycles
   - Verify tick count always continues from correct value
   - Check for accumulating errors

5. **Save/Load:**
   - Save state during action-timer phase
   - Load state
   - Verify tick count displays correctly after load

## Notes

- The spread operator `{...state}` in [UnitTurnPhaseHandler.ts:495](react-app/src/models/combat/UnitTurnPhaseHandler.ts#L495) correctly preserves `tickCount` - this is NOT the bug
- The bug is entirely in the **renderer caching** mechanism, not in state management
- This is a classic example of cached derived state becoming stale when the source of truth updates

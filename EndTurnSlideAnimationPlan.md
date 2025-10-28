# End Turn / Delay Turn Slide Animation Implementation Plan

## Overview
When a unit delays or ends their turn (setting AT to 50 or 0), the turn order panel should smoothly animate the position change. Units should slide to their new positions, with units sliding in from off-screen (right side) and sliding out to off-screen as needed.

## Current Behavior
1. User clicks "Delay" or "End Turn" in unit-turn phase
2. UnitTurnPhaseHandler sets AT to 50 or 0 and transitions to action-timer phase
3. ActionTimerPhaseHandler immediately starts discrete tick animation
4. **Problem**: No slide animation shown for the immediate AT change

## Desired Behavior
1. User clicks "Delay" or "End Turn" in unit-turn phase
2. UnitTurnPhaseHandler sets AT to 50 or 0 and transitions to action-timer phase **with a flag**
3. ActionTimerPhaseHandler detects the flag and:
   - Calculates new turn order based on updated AT values
   - Triggers slide animation in TurnOrderRenderer
   - Waits for slide to complete (0.25s)
   - Then starts normal discrete tick animation
4. Units slide smoothly to new positions, including sliding in/out from right edge

## Architecture Decision

### Option A: Slide in unit-turn phase (before transition)
**Pros**: Clean separation - animation completes before phase change
**Cons**: Unit-turn phase becomes responsible for turn order rendering, breaks phase responsibility model

### Option B: Slide in action-timer phase (after transition) ⭐ CHOSEN
**Pros**:
- Action-timer phase already manages turn order and TurnOrderRenderer
- Can reuse existing slide animation system
- Natural fit - AT has already changed, just need to show it

**Cons**: Action-timer phase needs a new "immediate slide" mode before discrete ticks start

### Solution: Add `pendingSlideAnimation` flag to CombatState
- UnitTurnPhaseHandler sets flag when transitioning after Delay/End Turn
- ActionTimerPhaseHandler detects flag and triggers immediate slide
- Flag is cleared after slide completes

## Implementation Tasks

### Task 1: Add `pendingSlideAnimation` flag to CombatState
**File**: `CombatState.ts`

Add optional field to CombatState interface:
```typescript
export interface CombatState {
  // ... existing fields ...

  /**
   * Flag indicating that a slide animation should be triggered immediately
   * when entering action-timer phase (e.g., after Delay/End Turn action)
   * Cleared by ActionTimerPhaseHandler after triggering the slide
   */
  pendingSlideAnimation?: boolean;
}
```

Also update:
- `CombatStateJSON` interface
- `serializeCombatState()` function
- `deserializeCombatState()` function

**Test**: Build should pass with no type errors

---

### Task 2: Set flag in UnitTurnPhaseHandler when executing Delay/End Turn
**File**: `UnitTurnPhaseHandler.ts`

**Location**: `executeAction()` method (around line 358)

**Changes**:
1. When returning new state after Delay or End Turn, include `pendingSlideAnimation: true`

**Before**:
```typescript
return {
  ...state,
  phase: 'action-timer' as const
};
```

**After**:
```typescript
return {
  ...state,
  phase: 'action-timer' as const,
  pendingSlideAnimation: true
};
```

**Why**: Signals to ActionTimerPhaseHandler that an immediate slide is needed

**Test**: Clicking Delay/End Turn should set the flag (verify with console.log in ActionTimerPhaseHandler)

---

### Task 3: Add animation mode tracking to ActionTimerPhaseHandler
**File**: `ActionTimerPhaseHandler.ts`

**Location**: Class fields (around line 141)

**Add new fields**:
```typescript
// Animation mode: 'immediate-slide' | 'discrete-ticks' | 'idle'
private animationMode: 'immediate-slide' | 'discrete-ticks' | 'idle' = 'idle';
```

**Why**: Track whether we're showing immediate slide or discrete tick animation

**Guidelines compliance**:
- Uses simple state enum (no complex state machine needed)
- Clear naming convention

---

### Task 4: Refactor updatePhase to handle immediate slide mode
**File**: `ActionTimerPhaseHandler.ts`

**Location**: `updatePhase()` method (around line 212)

**Current flow**:
```
1. Check victory/defeat
2. Calculate turn if not calculated
3. Animate through discrete ticks
4. Return state
```

**New flow**:
```
1. Check victory/defeat
2. Calculate turn if not calculated
3. Check if pendingSlideAnimation flag is set
   a. If set: trigger immediate slide, set mode to 'immediate-slide', clear flag
4. If mode is 'immediate-slide':
   a. Update slide animation
   b. If complete: transition to 'discrete-ticks' mode
5. If mode is 'discrete-ticks':
   a. Animate through discrete ticks (existing logic)
6. Return state
```

**Pseudo-code**:
```typescript
protected updatePhase(state: CombatState, encounter: CombatEncounter, deltaTime: number): CombatState | null {
  // Check victory/defeat (existing code)

  // Only calculate once when entering this phase
  if (!this.turnCalculated) {
    this.startAnimation(state.unitManifest, state.tickCount ?? 0);
    this.turnCalculated = true;
  }

  // Check for pending slide animation (immediate slide after Delay/End Turn)
  if (state.pendingSlideAnimation && this.animationMode === 'idle') {
    this.triggerImmediateSlide(state.unitManifest);
    this.animationMode = 'immediate-slide';

    // Clear flag from state
    return {
      ...state,
      pendingSlideAnimation: false
    };
  }

  // Handle immediate slide mode
  if (this.animationMode === 'immediate-slide') {
    const slideInProgress = this.turnOrderRenderer?.updateSlideAnimation(deltaTime);

    if (!slideInProgress) {
      // Slide complete, transition to discrete ticks mode
      this.animationMode = 'discrete-ticks';
      this.isAnimating = true; // Start discrete tick animation
    }

    return state; // Stay in action-timer phase during slide
  }

  // Handle discrete ticks mode (existing animation logic)
  if (this.animationMode === 'discrete-ticks' && this.isAnimating) {
    // ... existing discrete tick animation code ...
  }

  return state;
}
```

**Guidelines compliance**:
- Direct mutation for units (not needed here)
- Spread operator for CombatState ✅
- No renderFrame() calls ✅

---

### Task 5: Implement triggerImmediateSlide method
**File**: `ActionTimerPhaseHandler.ts`

**Location**: New private method (add after `startPositionSlideAnimation()`, around line 441)

**Implementation**:
```typescript
/**
 * Trigger an immediate slide animation when entering action-timer phase
 * after a Delay or End Turn action. Calculates new turn order based on
 * current AT values and triggers slide animation in TurnOrderRenderer.
 *
 * @param manifest Current unit manifest
 */
private triggerImmediateSlide(
  manifest: import('./CombatUnitManifest').CombatUnitManifest
): void {
  if (!this.turnOrderRenderer) {
    console.warn('[ActionTimerPhaseHandler] Cannot trigger immediate slide: no renderer');
    return;
  }

  // Calculate current turn order based on actual AT values
  const allUnits = manifest.getAllUnits();
  const units = allUnits.map(p => p.unit);

  // Build map of current timer values
  const currentTimers = new Map<CombatUnit, number>();
  for (const unit of units) {
    currentTimers.set(unit, unit.actionTimer);
  }

  // Calculate new turn order using existing helper
  const newTurnOrder = this.calculateTurnOrder(units, currentTimers);

  // Trigger slide animation in renderer
  this.turnOrderRenderer.startSlideAnimation(newTurnOrder);

  console.log('[ActionTimerPhaseHandler] Triggered immediate slide animation');
}
```

**Why**: Encapsulates the logic for calculating and triggering the immediate slide

**Guidelines compliance**:
- Uses existing `calculateTurnOrder()` helper (no code duplication)
- Reuses `startSlideAnimation()` from TurnOrderRenderer

---

### Task 6: Update getTopPanelRenderer to handle immediate slide mode
**File**: `ActionTimerPhaseHandler.ts`

**Location**: `getTopPanelRenderer()` method (around line 478)

**Issue**: When in immediate-slide mode, we don't have tick snapshots yet

**Solution**:
```typescript
getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
  // Determine which turn order to use
  let sortedUnits: CombatUnit[];
  let currentTickNumber: number;

  // NEW: Handle immediate-slide mode (no snapshots yet)
  if (this.animationMode === 'immediate-slide') {
    // Calculate turn order based on current AT values
    const units = state.unitManifest.getAllUnits().map(placement => placement.unit);
    const unitTimers = new Map<CombatUnit, number>();
    for (const unit of units) {
      unitTimers.set(unit, unit.actionTimer);
    }
    sortedUnits = this.calculateTurnOrder(units, unitTimers);
    currentTickNumber = state.tickCount || 0;
  }
  // Use snapshots if available (discrete-ticks mode)
  else if (this.tickSnapshots.length > 0 && this.currentTickIndex < this.tickSnapshots.length) {
    const snapshot = this.tickSnapshots[this.currentTickIndex];
    sortedUnits = snapshot.turnOrder;
    currentTickNumber = snapshot.tickNumber;
  }
  // Fallback: calculate manually
  else {
    const units = state.unitManifest.getAllUnits().map(placement => placement.unit);
    const unitTimers = new Map<CombatUnit, number>();
    for (const unit of units) {
      unitTimers.set(unit, unit.actionTimer);
    }
    sortedUnits = this.calculateTurnOrder(units, unitTimers);
    currentTickNumber = state.tickCount || 0;
  }

  // Create or update cached renderer (maintains scroll state)
  if (!this.turnOrderRenderer) {
    this.turnOrderRenderer = new TurnOrderRenderer(sortedUnits, currentTickNumber);
  } else {
    this.turnOrderRenderer.updateUnits(sortedUnits);
    this.turnOrderRenderer.updateTickCount(currentTickNumber);
  }

  return this.turnOrderRenderer;
}
```

**Why**: Ensures turn order is correctly calculated in all animation modes

---

### Task 7: Reset animation mode when leaving action-timer phase
**File**: `ActionTimerPhaseHandler.ts`

**Location**: `updatePhase()` method - when transitioning to unit-turn

**Current code** (around line 269):
```typescript
return {
  ...state,
  phase: 'unit-turn',
  tickCount: finalSnapshot.tickNumber
};
```

**Add before return**:
```typescript
// Reset animation mode for next time we enter action-timer phase
this.animationMode = 'idle';

return {
  ...state,
  phase: 'unit-turn',
  tickCount: finalSnapshot.tickNumber
};
```

**Why**: Clean up state when exiting phase

---

### Task 8: Handle edge case - unit already at correct position
**File**: `ActionTimerPhaseHandler.ts`

**Location**: `triggerImmediateSlide()` method

**Issue**: If turn order doesn't change (rare but possible), we still need to transition to discrete-ticks mode

**Solution**: Check if order actually changed:
```typescript
private triggerImmediateSlide(
  manifest: import('./CombatUnitManifest').CombatUnitManifest
): void {
  if (!this.turnOrderRenderer) {
    console.warn('[ActionTimerPhaseHandler] Cannot trigger immediate slide: no renderer');
    return;
  }

  // Get current turn order from renderer
  const currentOrder = this.turnOrderRenderer.getUnits(); // Need to add this getter

  // Calculate new turn order
  const allUnits = manifest.getAllUnits();
  const units = allUnits.map(p => p.unit);
  const currentTimers = new Map<CombatUnit, number>();
  for (const unit of units) {
    currentTimers.set(unit, unit.actionTimer);
  }
  const newTurnOrder = this.calculateTurnOrder(units, currentTimers);

  // Check if order actually changed
  const orderChanged = !this.arraysEqual(currentOrder, newTurnOrder);

  if (orderChanged) {
    // Trigger slide animation
    this.turnOrderRenderer.startSlideAnimation(newTurnOrder);
    console.log('[ActionTimerPhaseHandler] Triggered immediate slide animation');
  } else {
    // No animation needed, but still update units
    this.turnOrderRenderer.updateUnits(newTurnOrder);
    console.log('[ActionTimerPhaseHandler] No slide needed - order unchanged');
  }
}

/**
 * Helper to compare two unit arrays for equality
 */
private arraysEqual(a: CombatUnit[], b: CombatUnit[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
```

**Also need to add getter to TurnOrderRenderer**:
```typescript
// In TurnOrderRenderer.ts
getUnits(): CombatUnit[] {
  return this.units;
}
```

**Why**: Avoid triggering animation when no visual change is needed

---

### Task 9: Add getter to TurnOrderRenderer
**File**: `TurnOrderRenderer.ts`

**Location**: Add after `setClickHandler()` method (around line 88)

**Implementation**:
```typescript
/**
 * Get the current units array
 * Used to check if turn order has changed before triggering slide animation
 */
getUnits(): CombatUnit[] {
  return this.units;
}
```

**Why**: Needed by Task 8 to compare turn orders

---

### Task 10: Fix slide animation for units off-screen (slide in/out behavior)
**File**: `TurnOrderRenderer.ts`

**Location**: `startSlideAnimation()` method (around line 94)

**Current issue**: Only handles units visible on screen (indices 0-7)

**Solution**: Handle units that are off-screen:
```typescript
startSlideAnimation(newOrder: CombatUnit[]): void {
  if (!this.cachedRegion) {
    console.warn('[TurnOrderRenderer] Cannot start slide animation: region not cached');
    return;
  }

  // Reset scroll to show first 8 units during animation (per user requirement)
  this.scrollOffset = 0;

  // Calculate current X positions based on current units array
  const currentXPositions = this.calculateUnitXPositions(this.units, this.cachedRegion);
  for (let i = 0; i < this.units.length; i++) {
    const unit = this.units[i];
    if (i < this.maxVisibleUnits) {
      // Unit is visible, use calculated position
      this.previousPositions.set(unit, currentXPositions[i]);
    } else {
      // Unit is off-screen to the right, start from beyond right edge
      // Add spriteSize to ensure it starts completely off-screen
      const rightEdgeX = this.cachedRegion.x + this.cachedRegion.width + this.spriteSize;
      this.previousPositions.set(unit, rightEdgeX);
    }
  }

  // Calculate target X positions based on new order
  const targetXPositions = this.calculateUnitXPositions(newOrder, this.cachedRegion);
  for (let i = 0; i < newOrder.length; i++) {
    const unit = newOrder[i];
    if (i < this.maxVisibleUnits) {
      // Unit will be visible, use calculated position
      this.targetPositions.set(unit, targetXPositions[i]);
    } else {
      // Unit will be off-screen to the right, target is beyond right edge
      // Add spriteSize to ensure it ends completely off-screen
      const rightEdgeX = this.cachedRegion.x + this.cachedRegion.width + this.spriteSize;
      this.targetPositions.set(unit, rightEdgeX);
    }
  }

  // Update units array to new order
  this.units = newOrder;

  // Start animation
  this.slideAnimationActive = true;
  this.slideAnimationElapsedTime = 0;
}
```

**Why**: Creates slide-in effect for units entering view and slide-out for units leaving

**Visual behavior**:
- Unit at position 9 sliding to position 3: slides in from beyond right edge to position 3
- Unit at position 2 sliding to position 10: slides out from position 2 to beyond right edge

---

### Task 11: Add clipping to TurnOrderRenderer to hide units outside panel
**File**: `TurnOrderRenderer.ts`

**Location**: `render()` method (around line 163)

**Issue**: Units sliding past panel edge will render outside the panel bounds

**Solution**: Add canvas clipping region before rendering units:
```typescript
render(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  _fontId: string,
  _fontAtlasImage: HTMLImageElement | null,
  spriteImages: Map<string, HTMLImageElement>,
  spriteSize: number,
  smallFontAtlasImage?: HTMLImageElement | null
): void {
  // Cache region at start of render (for slide animation)
  this.cachedRegion = region;

  // Render "Action Timers" title... (existing code)
  // Render clock sprite... (existing code)
  // Render tick count... (existing code)

  // NEW: Save context state and set clipping region for unit rendering
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.width, region.height);
  ctx.clip();

  // Calculate visible window based on scroll position
  const startIndex = this.scrollOffset;
  // ... existing unit rendering code ...

  // NEW: Restore context state (removes clipping)
  ctx.restore();

  // Render scroll arrows if needed (AFTER restoring - arrows should not be clipped)
  this.renderScrollArrows(ctx, region, spriteImages, spriteSize);
}
```

**Why**: Prevents units from rendering outside the panel boundaries during slide animation

**Guidelines compliance**:
- Uses canvas clipping (standard Canvas API) ✅
- Saves/restores context state properly ✅
- Scroll arrows rendered after clipping is removed ✅

---

### Task 12: Disable action buttons after first click (prevent double-click)
**File**: `ActionsMenuContent.ts`

**Location**: Add state field and update render/click logic

**Add field** (around line 38):
```typescript
export class ActionsMenuContent implements PanelContent {
  private readonly config: ActionsMenuConfig;
  private readonly buttons: ActionButton[];
  private hoveredButtonIndex: number | null = null;
  private buttonsDisabled: boolean = false; // NEW: Disable after first click
```

**Add setter method**:
```typescript
/**
 * Enable or disable all buttons (used to prevent double-clicks)
 */
setButtonsDisabled(disabled: boolean): void {
  this.buttonsDisabled = disabled;
  // Update all button states
  for (const button of this.buttons) {
    button.enabled = !disabled;
  }
}
```

**Update handleClick** (around line 109):
```typescript
handleClick(
  relativeX: number,
  relativeY: number
): PanelClickResult {
  // NEW: Ignore clicks if buttons are disabled
  if (this.buttonsDisabled) {
    return null;
  }

  const buttonIndex = this.getButtonIndexAt(relativeX, relativeY);

  if (buttonIndex !== null) {
    const button = this.buttons[buttonIndex];

    if (button.enabled) {
      // Disable buttons immediately after click
      this.setButtonsDisabled(true);

      return {
        type: 'action-selected',
        actionId: button.id
      };
    }
  }

  return null;
}
```

**Why**: Prevents player from clicking Delay/End Turn multiple times rapidly

---

### Task 13: Wire up button disable logic in UnitTurnPhaseHandler
**File**: `UnitTurnPhaseHandler.ts`

**Location**: `getInfoPanelContent()` method and `executeAction()` method

**Issue**: ActionsMenuContent needs to be re-enabled when unit-turn phase starts again

**Solution**: Reset button state when creating/returning panel content:
```typescript
getInfoPanelContent(
  context: InfoPanelContext,
  state: CombatState,
  _encounter: CombatEncounter
): PanelContent | null {
  // ... existing strategy-based content logic ...

  // If showing actions menu (player turn strategy)
  if (context.type === 'actions') {
    if (!this.actionsMenuContent) {
      this.actionsMenuContent = new ActionsMenuContent({
        title: 'Actions',
        titleColor: '#FFA500',
        padding: 4,
        lineSpacing: 14
      });
    }

    // NEW: Re-enable buttons when entering unit-turn phase
    this.actionsMenuContent.setButtonsDisabled(false);

    return this.actionsMenuContent;
  }

  // ... rest of method ...
}
```

**Also need to cache ActionsMenuContent** (add field around line 60):
```typescript
// Cached actions menu content (per GeneralGuidelines.md - cache stateful components)
private actionsMenuContent: ActionsMenuContent | null = null;
```

**Why**: Ensures buttons are enabled when player's turn starts, but disabled after clicking

**Note**: Buttons are already disabled in Task 12 when clicked. This re-enables them for the next turn.

---

## Testing Checklist

### Build Verification
- [ ] `npm run build` succeeds with no errors
- [ ] No TypeScript type errors
- [ ] No unused variables

### Functional Testing

#### Basic Slide Animation
- [ ] Start combat with 4+ units at different speeds
- [ ] Wait for action-timer phase to complete and unit-turn to start
- [ ] Click "Delay" - unit's AT should change to 50
- [ ] Verify smooth slide animation plays (0.25s duration)
- [ ] Verify turn order updates correctly after slide
- [ ] Verify TIME counter remains unchanged during immediate slide

#### End Turn Animation
- [ ] In unit-turn phase, click "End Turn"
- [ ] Verify unit slides to end of turn order (AT = 0)
- [ ] Verify animation is smooth
- [ ] Verify discrete tick animation starts after slide completes

#### Slide In/Out Behavior
- [ ] Start combat with 10+ units (more than 8 visible)
- [ ] Delay a fast unit that's at position 1-2
- [ ] Verify unit slides backward and off-screen if new position > 8
- [ ] End turn for a slow unit at position 9+
- [ ] Verify unit slides in from right edge to visible position

#### Edge Cases
- [ ] Delay/End Turn when unit is already at correct position (no slide needed)
- [ ] Click button multiple times rapidly (should ignore after first click)
- [ ] Button state resets when new unit-turn phase starts (buttons re-enabled)
- [ ] Delay/End Turn as last action before victory (should not crash)
- [ ] Units sliding completely off-screen are clipped at panel edge

#### Animation Sequencing
- [ ] Immediate slide completes before discrete ticks start
- [ ] No visual "jump" between slide and discrete ticks
- [ ] Scroll position resets to 0 during slide (per user requirement)
- [ ] AT values display correctly during slide (no interpolation)

### Performance
- [ ] No frame drops during slide animation
- [ ] No memory leaks with repeated Delay/End Turn
- [ ] Console shows expected log messages (no warnings/errors)

---

## Success Criteria

1. ✅ When Delay or End Turn is clicked, turn order panel smoothly animates the change
2. ✅ Units slide to new positions over 0.25 seconds
3. ✅ Units slide in from right edge when entering visible area (position 8+)
4. ✅ Units slide out to right edge when leaving visible area
5. ✅ Immediate slide completes before discrete tick animation starts
6. ✅ No visual glitches or jumps between animations
7. ✅ Build succeeds with no errors
8. ✅ All guidelines followed (WeakMap usage, no renderFrame calls, proper state management)

---

## Open Questions

### Q1: Should the immediate slide reset scroll position like the discrete tick animation does?
**Your answer**: Yes, reset to position 0 (per DiscreteTickAnimationPlan requirement)

### Q2: What if user clicks Delay/End Turn rapidly multiple times?
**Current behavior**: Each click triggers new action, flag is set again
**Proposed**: Let current slide finish, queue is handled by phase transitions naturally
**Your answer**: Player should only be allowed to click the button once. Buttons should be disabled after first click until action completes.

**Implementation note**: Add `actionInProgress` flag to UnitTurnPhaseHandler's PlayerTurnStrategy. Disable buttons in ActionsMenuContent when flag is true.

### Q3: Should we show a different slide duration for immediate slides vs discrete tick slides?
**Current**: Both use 0.25s (POSITION_SLIDE_DURATION)
**Alternative**: Immediate slides could be faster (0.15s) for snappier feel
**Your answer**: Option A - Use same 0.25s duration for consistency.

### Q4: When sliding out units (position > 8), should they slide past the right edge or disappear at edge?
**Option A**: Slide past edge and disappear (smooth but units go off-screen)
**Option B**: Slide to edge and stop there (units stack at edge during animation)
**Your answer**: Option A - Slide past the panel edge smoothly. Note: This is the panel edge, not screen edge.

**Implementation note**: Need to add clipping to TurnOrderRenderer.render() to prevent units from rendering outside panel bounds during slide animation.

---

## Performance Considerations

### Memory
- **WeakMaps**: Using WeakMaps for position tracking (follows guidelines) ✅
- **Cached renderer**: Reusing TurnOrderRenderer instance ✅
- **No new allocations**: Reusing existing slide animation system ✅

### Computation
- **Pre-calculated positions**: Positions calculated once at slide start ✅
- **Simple interpolation**: Linear interpolation (no expensive easing) ✅
- **Minimal recalculation**: Turn order calculated once per immediate slide ✅

### Rendering
- **No unnecessary renders**: Animation only updates during slide ✅
- **Coordinate rounding**: Following pixel-perfect rendering guidelines ✅

---

## Guidelines Compliance Checklist

- [x] Uses WeakMap for per-unit animation data (previousPositions, targetPositions)
- [x] Caches TurnOrderRenderer instance
- [x] No renderFrame() calls in event handlers
- [x] Direct mutation for CombatUnit fields (AT already mutated in UnitTurnPhaseHandler)
- [x] Spread operator for CombatState updates
- [x] Reuses existing slide animation system (no duplication)
- [x] Clear state management with animationMode enum
- [x] Follows rendering pipeline Z-ordering (no visual overlay changes)
- [x] Pre-calculates positions (avoids recalculation each frame)
- [x] Proper phase responsibility (action-timer handles turn order animation)

---

## Implementation Order

Execute tasks in order 1-13:
1. Task 1: Add flag to CombatState ← Foundation
2. Task 9: Add getter to TurnOrderRenderer ← Support for later tasks
3. Task 11: Add clipping to TurnOrderRenderer ← Rendering foundation
4. Task 10: Fix slide in/out behavior ← Animation improvements
5. Task 12: Disable action buttons after first click ← UX improvement
6. Task 13: Wire up button disable logic ← Complete button disabling
7. Task 2: Set flag in UnitTurnPhaseHandler ← Signal
8. Task 3: Add animation mode tracking ← State management
9. Task 4: Refactor updatePhase ← Core logic
10. Task 5: Implement triggerImmediateSlide ← Animation trigger
11. Task 6: Update getTopPanelRenderer ← Rendering support
12. Task 7: Reset animation mode on phase exit ← Cleanup
13. Task 8: Handle edge case - no position change ← Robustness

**Dependencies**:
- Task 8 depends on Task 9 (needs getUnits() getter)
- Task 4 depends on Task 3 (needs animationMode field)
- Task 5 depends on Task 9 (uses getUnits() to avoid redundant slides)
- Task 10 depends on Task 11 (clipping must be in place for slide-out)
- Task 13 depends on Task 12 (needs setButtonsDisabled() method)
- Tasks 10-11 are independent of Tasks 2-8 (can be done first)
- Tasks 12-13 are independent of animation logic (button state management)

**Estimated complexity**: Medium-High (13 discrete tasks, multiple files, clear dependencies)

# Discrete Tick Animation Implementation Plan

**Date:** 2025-01-28
**Feature:** Refactor Action Timer animation to use discrete ticks with position sliding
**Priority:** Medium
**Complexity:** Moderate-High

---

## Overview

Currently, the Action Timer phase uses smooth continuous animation where unit timer values interpolate smoothly from start to target over 1 second. This plan refactors the animation to use discrete ticks (default 0.5s per tick) where:
1. Timer values update discretely at each tick interval (no smooth interpolation)
2. The TIME counter increments discretely at each tick
3. When turn order changes during a tick, units slide smoothly to their new positions

This provides clearer visual feedback about discrete game time progression while maintaining smooth visual transitions for layout changes.

---

## Requirements

### Visual Specifications

**Tick Animation:**
- Configurable tick interval (default: 0.5 seconds)
- TIME counter updates discretely at each tick (no interpolation)
- Unit AT values update discretely at each tick (no interpolation)
- Display `Math.floor(actionTimer)` for each unit

**Position Sliding:**
- When a unit's position in turn order changes between ticks, animate sliding to new position
- Slide duration: within the tick interval (e.g., 0.25s for smooth transition within 0.5s tick)
- Slide easing: linear (or ease-out for smoother feel - to be determined)
- Multiple units can slide simultaneously if needed

**Edge Cases:**
- If two units swap positions, both should slide
- If a unit moves multiple positions (e.g., position 3 → position 1), slide the full distance
- During sliding, continue displaying the unit's current AT value (no value changes during slide)

### Behavior Specifications

**Tick Progression:**
1. On phase entry, calculate all discrete ticks until first unit reaches AT >= 100
2. Store per-unit timer values at each tick (discrete snapshots)
3. Animate through ticks at configurable interval (default 0.5s)
4. At each tick boundary:
   - Update displayed TIME counter
   - Update displayed AT values for all units
   - Recalculate turn order based on new AT values
   - If order changed, trigger position slide animation

**Turn Order Calculation:**
- Sort by AT descending, then by name ascending (existing behavior)
- Calculate at start of each tick (before displaying new values)
- Compare to previous tick's order to detect position changes

**Animation Phases per Tick:**
```
Tick N starts (0.0s)
  ↓
Calculate new turn order (instant)
  ↓
If order changed:
  Start slide animation (0.0s - 0.25s)
  ↓
Update AT values (at tick boundary, 0.0s)
  ↓
Tick N ends (0.5s)
  ↓
Tick N+1 starts
```

### Technical Requirements

- Must follow GeneralGuidelines.md patterns (WeakMap, caching, rendering rules)
- Configurable tick interval constant (seconds per tick)
- Configurable slide duration constant (seconds for position animation)
- No `renderFrame()` calls in event handlers
- Units remain mutable objects (direct field mutation for AT values)
- CombatState remains immutable (spread operator for state transitions)

---

## Implementation Tasks

### Task 1: Add Configuration Constants (Foundation)

**Files:**
- `ActionTimerPhaseHandler.ts`

**Changes:**
```typescript
// At top of file with other constants
/**
 * Time (in seconds) to display each discrete tick during animation
 * Default: 0.5s per tick (2 ticks per second)
 */
const TICK_DISPLAY_DURATION = 0.5;

/**
 * Time (in seconds) for units to slide to new positions when order changes
 * Should be less than TICK_DISPLAY_DURATION for smooth transitions
 * Default: 0.25s (half of tick duration)
 */
const POSITION_SLIDE_DURATION = 0.25;
```

**Rationale:** These constants control animation timing and should be easy to tune.

---

### Task 2: Refactor Tick Data Storage (Foundation)

**Files:**
- `ActionTimerPhaseHandler.ts`

**Changes:**
```typescript
// Replace current WeakMap storage with per-tick snapshots
interface TickSnapshot {
  tickNumber: number; // Absolute tick number (from CombatState.tickCount)
  unitTimers: Map<CombatUnit, number>; // Unit -> AT value at this tick
  turnOrder: CombatUnit[]; // Sorted turn order at this tick
}

private tickSnapshots: TickSnapshot[] = []; // All ticks from start to target
private currentTickIndex: number = 0; // Index into tickSnapshots array
```

**Rationale:** We need to store complete snapshots for each tick (AT values + turn order) to enable discrete updates and position change detection.

**Implementation Details:**
1. In `startAnimation()`, simulate ticks as before
2. For each tick, create a `TickSnapshot` with:
   - Current timer values for all units
   - Calculated turn order (sorted by AT desc, name asc)
3. Store all snapshots in array
4. During animation, step through snapshots discretely

---

### Task 3: Implement Discrete Tick Animation (Core Logic)

**Files:**
- `ActionTimerPhaseHandler.ts` (`updatePhase()` method)

**Changes:**
```typescript
protected updatePhase(...): CombatState | null {
  // ... victory/defeat checks ...

  if (!this.turnCalculated) {
    this.startAnimation(state.unitManifest, state.tickCount ?? 0);
    this.turnCalculated = true;
  }

  if (this.isAnimating) {
    this.animationElapsedTime += deltaTime;

    // Calculate which tick we should be displaying
    const targetTickIndex = Math.floor(this.animationElapsedTime / TICK_DISPLAY_DURATION);

    // If we've moved to a new tick
    if (targetTickIndex > this.currentTickIndex && targetTickIndex < this.tickSnapshots.length) {
      this.currentTickIndex = targetTickIndex;
      const snapshot = this.tickSnapshots[this.currentTickIndex];

      // Update all unit AT values (discrete update, no interpolation)
      for (const [unit, timerValue] of snapshot.unitTimers.entries()) {
        (unit as any)._actionTimer = timerValue;
      }

      // Check if turn order changed
      if (this.turnOrderChanged(snapshot.turnOrder)) {
        // Trigger slide animation in TurnOrderRenderer
        // (Task 4 will implement this)
        this.startPositionSlideAnimation(snapshot.turnOrder);
      }

      // Update displayed turn order
      this.cachedTurnOrderRenderer?.updateUnits(snapshot.turnOrder);
    }

    // Check if animation complete
    if (this.currentTickIndex >= this.tickSnapshots.length - 1) {
      // Final tick reached - check if slide animation is still playing
      const slideInProgress = this.cachedTurnOrderRenderer?.updateSlideAnimation(deltaTime);

      if (!slideInProgress) {
        // Slide complete (or no slide) - transition to unit-turn phase
        this.isAnimating = false;

        // Apply final tick values
        const finalSnapshot = this.tickSnapshots[this.tickSnapshots.length - 1];
        for (const [unit, timerValue] of finalSnapshot.unitTimers.entries()) {
          (unit as any)._actionTimer = timerValue;
        }

        // Transition to unit-turn phase
        const readyUnit = this.getReadyUnit(state.unitManifest);
        if (readyUnit) {
          return {
            ...state,
            phase: 'unit-turn',
            tickCount: finalSnapshot.tickNumber
          };
        }
      }
      // If slide still in progress, stay in this phase and continue animating
    }
  }

  return state;
}
```

**Helper Methods:**
```typescript
private turnOrderChanged(newOrder: CombatUnit[]): boolean {
  if (this.currentTickIndex === 0) return false; // First tick, no previous order
  const previousSnapshot = this.tickSnapshots[this.currentTickIndex - 1];
  const previousOrder = previousSnapshot.turnOrder;

  // Compare arrays
  if (previousOrder.length !== newOrder.length) return true;
  for (let i = 0; i < previousOrder.length; i++) {
    if (previousOrder[i] !== newOrder[i]) return true;
  }
  return false;
}
```

**Rationale:** This changes from continuous interpolation to discrete stepping through pre-calculated tick snapshots.

---

### Task 4: Add Position Sliding to TurnOrderRenderer (Animation System)

**Files:**
- `TurnOrderRenderer.ts`

**Changes:**
```typescript
export class TurnOrderRenderer implements TopPanelRenderer {
  // ... existing fields ...

  // Position slide animation state
  private slideAnimationActive: boolean = false;
  private slideAnimationStartTime: number = 0;
  private slideAnimationDuration: number = 0.25; // seconds (configurable)
  private previousPositions: WeakMap<CombatUnit, number> = new WeakMap(); // Unit -> X coordinate
  private targetPositions: WeakMap<CombatUnit, number> = new WeakMap(); // Unit -> X coordinate

  /**
   * Start a slide animation for units that changed positions
   * Called by ActionTimerPhaseHandler when turn order changes
   */
  startSlideAnimation(newOrder: CombatUnit[], region: PanelRegion): void {
    // Reset scroll to show first 8 units during animation (per user requirement)
    this.scrollOffset = 0;

    // Calculate current X positions based on current units array
    const currentXPositions = this.calculateUnitXPositions(this.units, region);
    for (let i = 0; i < this.units.length; i++) {
      this.previousPositions.set(this.units[i], currentXPositions[i]);
    }

    // Calculate target X positions based on new order
    const targetXPositions = this.calculateUnitXPositions(newOrder, region);
    for (let i = 0; i < newOrder.length; i++) {
      this.targetPositions.set(newOrder[i], targetXPositions[i]);
    }

    // Update units array to new order
    this.units = newOrder;

    // Start animation
    this.slideAnimationActive = true;
    this.slideAnimationStartTime = 0;
  }

  /**
   * Update slide animation progress
   * Called each frame during animation
   */
  updateSlideAnimation(deltaTime: number): boolean {
    if (!this.slideAnimationActive) return false;

    this.slideAnimationStartTime += deltaTime;
    const progress = Math.min(this.slideAnimationStartTime / this.slideAnimationDuration, 1.0);

    if (progress >= 1.0) {
      this.slideAnimationActive = false;
      return false; // Animation complete
    }

    return true; // Animation still in progress
  }

  /**
   * Calculate X positions for an array of units
   */
  private calculateUnitXPositions(units: CombatUnit[], region: PanelRegion): number[] {
    const visibleUnits = units.slice(this.scrollOffset, this.scrollOffset + this.maxVisibleUnits);
    const totalVisibleUnits = visibleUnits.length;
    const totalWidth = totalVisibleUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;
    const startX = region.x + (region.width - totalWidth) / 2;

    const positions: number[] = [];
    let currentX = startX;
    for (const unit of visibleUnits) {
      positions.push(currentX);
      currentX += this.spriteSize + this.spriteSpacing;
    }
    return positions;
  }

  /**
   * Render with slide animation support
   */
  render(...): void {
    // ... render title and TIME counter (unchanged) ...

    // Calculate visible units
    const startIndex = this.scrollOffset;
    const endIndex = Math.min(this.scrollOffset + this.maxVisibleUnits, this.units.length);
    const visibleUnits = this.units.slice(startIndex, endIndex);

    // If slide animation active, interpolate positions
    if (this.slideAnimationActive) {
      const progress = Math.min(this.slideAnimationStartTime / this.slideAnimationDuration, 1.0);

      for (const unit of visibleUnits) {
        const previousX = this.previousPositions.get(unit);
        const targetX = this.targetPositions.get(unit);

        if (previousX !== undefined && targetX !== undefined) {
          // Linear interpolation (or ease-out if desired)
          const currentX = previousX + (targetX - previousX) * progress;
          this.renderUnitAtPosition(ctx, unit, currentX, spriteY, spriteImages, spriteSize, smallFontAtlasImage);
        } else {
          // Unit wasn't in previous order or isn't in target order
          // Just render at target position
          const targetXPositions = this.calculateUnitXPositions(this.units, region);
          const index = visibleUnits.indexOf(unit);
          if (index >= 0) {
            this.renderUnitAtPosition(ctx, unit, targetXPositions[index], spriteY, spriteImages, spriteSize, smallFontAtlasImage);
          }
        }
      }
    } else {
      // No animation, render at static positions
      const positions = this.calculateUnitXPositions(this.units, region);
      for (let i = 0; i < visibleUnits.length; i++) {
        this.renderUnitAtPosition(ctx, visibleUnits[i], positions[i], spriteY, spriteImages, spriteSize, smallFontAtlasImage);
      }
    }

    // ... render scroll arrows (unchanged) ...
  }

  /**
   * Helper method to render a unit at a specific X position
   */
  private renderUnitAtPosition(
    ctx: CanvasRenderingContext2D,
    unit: CombatUnit,
    x: number,
    y: number,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number,
    smallFontAtlasImage: HTMLImageElement | null
  ): void {
    // Render sprite
    SpriteRenderer.renderSpriteById(ctx, unit.spriteId, spriteImages, spriteSize, x, y, this.spriteSize, this.spriteSize);

    // Render AT value
    if (smallFontAtlasImage) {
      const timerValue = Math.floor(unit.actionTimer);
      const timerText = timerValue.toString();
      const textX = x + this.spriteSize / 2;
      const textY = y + this.spriteSize;
      FontAtlasRenderer.renderText(ctx, timerText, textX, textY, '7px-04b03', smallFontAtlasImage, 1, 'center', '#ffffff');
    }
  }
}
```

**Rationale:** The renderer needs to track previous and target positions for each unit and interpolate during the slide animation.

**Challenge:** TurnOrderRenderer needs access to `region` during `startSlideAnimation()`, but it doesn't currently cache the region. We'll need to either:
- Option A: Pass region to `startSlideAnimation()` (requires ActionTimerPhaseHandler to know the region)
- Option B: Cache region in `render()` and use cached value in `startSlideAnimation()`

**Recommendation:** Option B (cache region), as it's cleaner and doesn't require passing layout information to the phase handler.

---

### Task 5: Wire Up Slide Animation (Integration)

**Files:**
- `ActionTimerPhaseHandler.ts`

**Changes:**
```typescript
private startPositionSlideAnimation(newOrder: CombatUnit[]): void {
  if (this.cachedTurnOrderRenderer) {
    // Region will be cached by TurnOrderRenderer from last render call
    this.cachedTurnOrderRenderer.startSlideAnimation(newOrder);
  }
}
```

**Files:**
- `TurnOrderRenderer.ts`

**Changes:**
```typescript
// Add field to cache region
private cachedRegion: PanelRegion | null = null;

render(...): void {
  // Cache region at start of render
  this.cachedRegion = region;

  // ... rest of render logic ...
}

startSlideAnimation(newOrder: CombatUnit[]): void {
  if (!this.cachedRegion) {
    console.warn('[TurnOrderRenderer] Cannot start slide animation: region not cached');
    return;
  }

  // ... rest of slide animation logic ...
}
```

**Rationale:** TurnOrderRenderer needs region information to calculate X positions for sliding.

---

### Task 6: Update Slide Animation Each Frame (Animation Loop)

**Files:**
- `ActionTimerPhaseHandler.ts`

**Changes:**
```typescript
protected updatePhase(...): CombatState | null {
  // ... existing animation logic ...

  // Update slide animation in TurnOrderRenderer
  if (this.cachedTurnOrderRenderer && this.isAnimating) {
    this.cachedTurnOrderRenderer.updateSlideAnimation(deltaTime);
  }

  // ... rest of update logic ...
}
```

**Rationale:** The slide animation needs to progress each frame based on deltaTime.

---

### Task 7: Update TIME Counter Discretely (Visual Polish)

**Files:**
- `ActionTimerPhaseHandler.ts`

**Changes:**
```typescript
// In updatePhase(), when moving to new tick:
if (targetTickIndex > this.currentTickIndex && targetTickIndex < this.tickSnapshots.length) {
  this.currentTickIndex = targetTickIndex;
  const snapshot = this.tickSnapshots[this.currentTickIndex];

  // Update TIME counter (discrete)
  if (this.cachedTurnOrderRenderer) {
    this.cachedTurnOrderRenderer.updateTickCount(snapshot.tickNumber);
  }

  // ... rest of tick update logic ...
}
```

**Rationale:** TIME counter should update discretely at each tick boundary, matching the AT value updates.

---

## Testing Plan

### Manual Testing Checklist

**Basic Tick Animation:**
- [ ] TIME counter increments discretely (no smooth animation)
- [ ] TIME counter updates at 0.5s intervals (default)
- [ ] Unit AT values update discretely at each tick
- [ ] AT values display as `Math.floor(actionTimer)`
- [ ] No smooth interpolation of AT values between ticks

**Position Sliding:**
- [ ] When a unit's position changes, it slides smoothly to new position
- [ ] Slide animation completes within tick interval (0.25s default)
- [ ] Multiple units can slide simultaneously
- [ ] Units swap positions correctly (both units slide)
- [ ] Units sliding multiple positions (e.g., 3→1) animate correctly

**Edge Cases:**
- [ ] First tick (no previous order): no sliding animation
- [ ] All units have same AT: no position changes, no sliding
- [ ] One unit reaches 100 while others are low: position changes trigger slides
- [ ] Scrolling turn order: sliding only affects visible units
- [ ] Phase transition: animation completes cleanly, no visual glitches

**Configuration:**
- [ ] Changing TICK_DISPLAY_DURATION affects animation speed
- [ ] Changing POSITION_SLIDE_DURATION affects slide speed
- [ ] Slide duration < tick duration: smooth transitions
- [ ] Slide duration = tick duration: slides complete exactly at tick boundary

**Integration:**
- [ ] Delay action: returns to action-timer, animation works correctly
- [ ] End Turn action: returns to action-timer, animation works correctly
- [ ] Save/Load: tick count persists, animation restarts correctly
- [ ] No renderFrame() violations (follows guidelines)

---

## Implementation Order

1. **Task 1**: Add configuration constants (independent)
2. **Task 2**: Refactor tick data storage (foundation for Task 3)
3. **Task 3**: Implement discrete tick animation (depends on Task 2)
4. **Task 4**: Add position sliding to TurnOrderRenderer (independent, can be done in parallel with Task 3)
5. **Task 5**: Wire up slide animation (depends on Tasks 3 & 4)
6. **Task 6**: Update slide animation each frame (depends on Task 5)
7. **Task 7**: Update TIME counter discretely (polish, depends on Task 3)

**Parallelization Opportunity:**
- Tasks 2 & 4 can be done in parallel (different files, no dependencies)

---

## Questions for User (ANSWERED)

1. **Slide Easing:** Should position slides use:
   - **Linear** (constant speed): Simpler, more "mechanical" feel
   - **Ease-out** (fast→slow): Smoother, more "natural" feel
   - **Ease-in-out** (slow→fast→slow): Most polished, but may feel sluggish

   **Answer:** ✅ **Linear** (agreed with recommendation)

2. **Multiple Position Changes:** If a unit moves multiple positions in one tick (e.g., position 3 → position 1, jumping over two units), should it:
   - **Slide the full distance**: Unit slides from old X to new X directly
   - **Step through intermediate positions**: Unit "bounces" through intermediate slots

   **Answer:** ✅ **Slide the full distance** (agreed with recommendation)

3. **Slide During Final Tick:** If turn order changes on the final tick (the tick where someone reaches AT=100), should we:
   - **Skip the slide** and transition immediately to unit-turn phase
   - **Show the slide** and delay transition until slide completes

   **Answer:** ✅ **Show the slide** (user wants to see the transition, different from recommendation)

4. **Configurable Constants Location:** Should TICK_DISPLAY_DURATION and POSITION_SLIDE_DURATION be:
   - **File-level constants** in ActionTimerPhaseHandler.ts (simple, but requires code change)
   - **CombatConstants** entries (more discoverable, easier to tune)

   **Answer:** ✅ **File-level constants** (agreed with recommendation)

5. **Scrolling During Slide:** If the user scrolls the turn order panel while a slide animation is active, should we:
   - **Cancel the slide** and jump to final positions
   - **Continue the slide** for visible units only
   - **Prevent scrolling** during slide (lock the UI)

   **Answer:** ✅ **Always reset to show position 0-7** (reset scroll to first 8 units when animation starts, different from recommendation)

---

## Notes & Decisions

### Decision: Discrete Tick Snapshots vs. Continuous Calculation

**Choice:** Pre-calculate all tick snapshots and store in array

**Alternative:** Calculate turn order on-the-fly at each tick interval

**Rationale:**
- Pre-calculation ensures deterministic behavior (same result each time)
- Easier to debug (can inspect all snapshots)
- Avoids recalculating turn order multiple times
- Memory overhead is negligible (8-12 units × 10-20 ticks × ~20 bytes = ~2-5 KB)

**Tradeoff:** Slightly more memory usage, but negligible for typical combat scenarios.

### Decision: Slide Animation in Renderer vs. Phase Handler

**Choice:** Implement slide animation state in TurnOrderRenderer

**Alternative:** Implement slide animation state in ActionTimerPhaseHandler and pass interpolation progress to renderer

**Rationale:**
- Renderer is responsible for visual presentation
- Keeps animation state close to rendering logic
- Easier to test renderer in isolation
- Follows single-responsibility principle

**Tradeoff:** Renderer becomes slightly more complex, but cleaner separation of concerns.

### Guidelines Compliance

- ✅ Uses SpriteRenderer exclusively for sprites
- ✅ Uses FontAtlasRenderer exclusively for text
- ✅ Caches TurnOrderRenderer (stateful component)
- ✅ WeakMap for unit→position mapping (garbage collection friendly)
- ✅ Discrete updates via array indexing (no continuous interpolation in core logic)
- ✅ No renderFrame() calls in event handlers (animation driven by update loop)
- ✅ Direct mutation for CombatUnit._actionTimer (follows existing pattern)
- ✅ Immutable CombatState updates (spread operator for phase transitions)

### Performance Considerations

**Tick Snapshot Storage:**
- Typical combat: 8 units, 15 ticks, ~20 bytes per entry = ~2.4 KB
- Worst case: 12 units, 30 ticks, ~20 bytes per entry = ~7.2 KB
- Memory impact: Negligible

**Turn Order Comparison:**
- O(N) comparison per tick where N = number of units (typically 4-12)
- Performed once per tick (every 0.5s)
- CPU impact: Negligible

**Position Slide Animation:**
- WeakMap lookups: O(1) per unit per frame
- Interpolation calculations: O(N) per frame where N = visible units (max 8)
- 60 fps × 8 units × 3 operations = 1440 operations/sec
- CPU impact: Negligible (simple arithmetic)

**Overall:** Performance impact is minimal. The refactor simplifies logic by removing continuous interpolation.

---

## Success Criteria

✅ TIME counter updates discretely at configurable interval (default 0.5s)
✅ Unit AT values update discretely at each tick (no smooth interpolation)
✅ Units slide smoothly to new positions when turn order changes
✅ Multiple units can slide simultaneously without visual glitches
✅ All existing functionality preserved (Delay, End Turn, save/load)
✅ Build succeeds with no warnings
✅ 100% compliance with GeneralGuidelines.md
✅ No performance regressions (60 fps maintained)
✅ Configuration constants easy to tune (TICK_DISPLAY_DURATION, POSITION_SLIDE_DURATION)

---

## Relevant Context from Guidelines and Architecture

### GeneralGuidelines.md - Key Patterns

#### WeakMap for Animation Data (Lines 577-651)
**Pattern:** Use WeakMap with unit instances as keys for temporary animation data
```typescript
// Correct: Works with duplicate unit names
private startTimers: WeakMap<CombatUnit, number> = new WeakMap();
private targetTimers: WeakMap<CombatUnit, number> = new WeakMap();

// Store data keyed by unit instance
this.startTimers.set(unit, unit.actionTimer);

// Wrong: Breaks with duplicate names
private startTimers: Map<string, number> = new Map();
this.startTimers.set(unit.name, unit.actionTimer); // Multiple "Goblin" units overwrite!
```

**Benefits:**
- Works correctly with duplicate unit names (multiple "Goblin" units)
- Automatic garbage collection when units removed
- Type-safe (compiler prevents wrong key type)

**Current Implementation:** ActionTimerPhaseHandler already uses this pattern for startTimers and targetTimers - preserve this in refactor.

#### State Preservation vs Reset Pattern (Lines 311-351)
**Pattern:** Separate methods for explicit reset vs state preservation
```typescript
// Explicit reset - user changed context
setItems(items: Item[]): void {
  this.items = items;
  this.scrollOffset = 0; // Reset to start
}

// Preserve state - data updated within same context
updateItems(items: Item[]): void {
  this.items = items;
  // Clamp scroll to valid range if list shrunk
  const maxOffset = Math.max(0, this.items.length - this.visibleCount);
  this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
}
```

**Current Implementation:** TurnOrderRenderer already has this pattern:
- `setUnits()` - resets scroll state (used on phase entry)
- `updateUnits()` - preserves scroll state (used during animation)

**New Requirement:** `startSlideAnimation()` should reset scroll to 0 (show first 8 units) per user answer to Question 5.

#### Rendering Pipeline (Lines 910-1009)
**Pattern:** Phase handlers use dual-method rendering for Z-ordering
```typescript
interface CombatPhaseHandler {
  render?(...): void;    // BEFORE units (underlays: movement range, effects)
  renderUI?(...): void;  // AFTER units (overlays: cursors, UI)
}
```

**Render Order:**
1. Map terrain (tiles, walls)
2. Phase handler `render()` - Underlays
3. Deployment zones
4. Units
5. Phase handler `renderUI()` - Overlays
6. Layout UI (panels, combat log, buttons)

**Current Implementation:** ActionTimerPhaseHandler doesn't override render/renderUI (no visual overlays). This refactor doesn't add visual overlays, so no changes needed.

#### No renderFrame() in Event Handlers (Lines 236-242, 1323-1344)
**Rule:** Update state only in event handlers, let animation loop handle rendering
```typescript
// Wrong: Blocks animation loop
handleMouseMove(x, y) {
  this.hoveredItem = this.detectHover(x, y);
  renderFrame(); // Can fire 100+ times/second!
}

// Correct: Fast state update, rendering happens in animation loop
handleMouseMove(x, y) {
  this.hoveredItem = this.detectHover(x, y);
  // Animation loop will render on next frame (~16ms)
}
```

**Application:** This refactor doesn't add new event handlers, but keep in mind for future work.

#### Immutable State Updates (Lines 288-308)
**Rule:** Always create new state objects with spread operator
```typescript
// Correct: Create new state object
return {
  ...state,
  phase: 'battle' as const,
  tickCount: finalTickNumber
};

// Wrong: Mutates state, breaks React change detection
state.phase = 'battle';
return state;
```

**Application:** Task 3 transition to unit-turn phase already uses spread operator correctly.

#### Direct Mutation for CombatUnit Fields (Lines 409-450)
**Pattern:** CombatUnit objects are mutable, update fields directly (not spread operator)
```typescript
// Correct: Direct mutation preserves object identity
(unit as any)._actionTimer = newValue;

// Wrong: Creates new object, breaks WeakMap references
const updatedUnit = { ...unit, actionTimer: newValue };
```

**Rationale:** Using spread operator creates new object with different identity, breaking WeakMap references in CombatUnitManifest.

**Current Implementation:** ActionTimerPhaseHandler already uses direct mutation (line 219). Preserve this pattern in Task 3.

### CombatHierarchy.md - Relevant Architecture

#### ActionTimerPhaseHandler Current State (Lines 161-203)
**Current Functionality:**
- Simulates discrete tick increments until first unit reaches 100 AT
- Each tick: `actionTimer += speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER`
- Animates all units' action timers from current to final state over 1 second
- Shows turn order sorted by predicted turn order in top panel
- Displays current AT values below unit sprites
- Dynamically re-sorts units during animation as relative positions change

**Animation Pattern:**
- Uses WeakMap<CombatUnit, number> for per-unit start/target AT values
- Linear interpolation from current AT to final AT over 1 second
- Turn order updates every frame based on timeToReady calculation

**Caching Strategy:**
- Caches TurnOrderRenderer instance to preserve scroll state across animation frames
- Uses updateUnits() to update unit list without resetting scroll position
- Scroll state persists throughout animation phase

**Key Constants:**
- ACTION_TIMER_MULTIPLIER: 1 (controls combat pacing)
- TICK_SIZE: 1 (size of each discrete tick increment)
- animationDuration: 1.0 second (AT value animation time)

**Changes Needed:**
- Replace continuous interpolation with discrete tick snapshots
- Add TICK_DISPLAY_DURATION constant (0.5s per tick)
- Store TickSnapshot[] array instead of single target values
- Step through snapshots discretely instead of interpolating

#### TurnOrderRenderer Current Features (Lines 386-432)
**Rendering Features:**
- "Action Timers" title in orange at top
- Clock sprite with "TIME" label and tick counter
- Units centered horizontally, bottom-aligned
- Unit sprites with 12px spacing
- AT values displayed below each sprite in white

**Scrolling Features:**
- Displays up to 8 units at once
- Scroll arrows on right side (stacked vertically)
- Hold-to-scroll with 200ms repeat interval
- Scroll state preserved via updateUnits()
- Scroll state reset via setUnits()

**State Management:**
- Cached by phase handlers
- Maintains scroll offset across renders
- Uses updateUnits() to preserve scroll during animation
- Uses setUnits() to reset scroll when entering new context

**Changes Needed:**
- Add slide animation state (previousPositions, targetPositions WeakMaps)
- Add startSlideAnimation() method
- Add updateSlideAnimation() method returning boolean (animation in progress?)
- Cache region in render() for use in startSlideAnimation()
- Reset scroll to 0 in startSlideAnimation() per user requirement
- Interpolate X positions during slide animation in render()

#### Turn Order Calculation (Lines 232-236)
**Current Algorithm:**
- Calculates timeToReady = (100 - actionTimer) / speed for each unit
- Sorts ascending (soonest first), then alphabetically by name
- Same calculation used in ActionTimerPhaseHandler and UnitTurnPhaseHandler

**Changes Needed:**
- Store turn order in each TickSnapshot (pre-calculated)
- Compare previous tick's order to current tick's order to detect changes
- Trigger slide animation when order changes

#### Tick Counter Display (Lines 59-60, 392-407)
**Current Implementation:**
- CombatState.tickCount (optional number) - persists across phases
- ActionTimerPhaseHandler updates tickCount on phase transition
- TurnOrderRenderer displays tick counter below clock sprite
- Constructor overload accepts tickCount parameter

**Changes Needed:**
- Store tickNumber in each TickSnapshot
- Update TurnOrderRenderer.updateTickCount() on each tick transition
- Final tick's tickNumber written to state.tickCount on phase transition

---

**End of Implementation Plan**

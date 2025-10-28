# Turn Order Scrolling Implementation Plan

**Feature:** Add horizontal scrolling to TurnOrderRenderer when more than 8 units are present

**Date:** 2025-10-27

**Related Files:**
- Implementation: [react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts](react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts)
- Reference: [react-app/src/models/combat/layouts/CombatLayoutManager.ts](react-app/src/models/combat/layouts/CombatLayoutManager.ts) (map scrolling arrows)
- Guidelines: [GeneralGuidelines.md](GeneralGuidelines.md)
- Combat Hierarchy: [CombatHierarchy.md](CombatHierarchy.md)

---

## Overview

Currently, TurnOrderRenderer displays a maximum of 8 combat units in the turn order panel. When more than 8 units are present, only the first 8 are shown. This plan adds horizontal scrolling with left/right arrow buttons to allow users to view all units.

---

## Requirements

1. **Scrolling behavior**: Show only a window of visible units (starting at 8)
2. **Arrow sprites**: Use same sprites as map scrolling (`minimap-6` for right, `minimap-8` for left)
3. **Arrow placement**: Right-aligned on the panel, no overlap with unit sprites
4. **Scroll amount**: 1 unit per arrow click
5. **Scroll state**: Reset to offset 0 when unit list changes

---

## Current Implementation Analysis

### TurnOrderRenderer.ts (Lines 127-141)
```typescript
// Calculate total width needed for all units
const totalUnits = Math.min(this.units.length, Math.floor(region.width / (this.spriteSize + this.spriteSpacing)));
const totalWidth = totalUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;

// Calculate starting X to center the units
const startX = region.x + (region.width - totalWidth) / 2;
```

**Current Logic:**
- Limits display to `Math.floor(region.width / 24)` units (~8-9 units depending on panel width)
- Centers the visible units horizontally
- No tracking of scroll position

### Layout Constraints
- **Panel region**: 240px wide × 24px tall (20 tiles × 2 tiles)
- **Clock area**: ~18px on left (clock sprite + TIME label + tick counter)
- **Available width**: 240px total
- **Unit spacing**: 12px sprite + 12px spacing = 24px per unit
- **Max visible units**: 8 (conservatively, to leave room for arrows)

---

## Implementation Plan

### 1. Add Scroll State Variables

**Location:** TurnOrderRenderer class instance variables

```typescript
export class TurnOrderRenderer implements TopPanelRenderer {
  private units: CombatUnit[];
  private tickCount: number;
  private onUnitClick?: (unit: CombatUnit) => void;
  private readonly spriteSpacing: number = 12;
  private readonly spriteSize: number = 12;

  // NEW: Scroll state
  private scrollOffset: number = 0; // Index of first visible unit
  private readonly maxVisibleUnits: number = 8; // Max units to show at once

  // NEW: Arrow button bounds for click detection
  private scrollRightButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private scrollLeftButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
```

**Rationale:**
- `scrollOffset`: Tracks the first visible unit index (0-based)
- `maxVisibleUnits`: Fixed at 8 to ensure consistent layout with arrows
- Button bounds: Same pattern as CombatLayoutManager for map scrolling (lines 21-24)

---

### 2. Reset Scroll Offset in setUnits()

**Location:** TurnOrderRenderer.setUnits() method (line 36)

```typescript
/**
 * Update the units to display and reset scroll position
 */
setUnits(units: CombatUnit[]): void {
  this.units = units;
  this.scrollOffset = 0; // Reset to start when units change
}
```

**Rationale:**
- New unit list = start from beginning (predictable behavior)
- Prevents scrollOffset from pointing beyond the new list length

---

### 3. Update render() Method

**Location:** TurnOrderRenderer.render() method (lines 47-182)

#### 3a. Calculate Visible Window

Replace lines 127-128 with:

```typescript
// Calculate visible window based on scroll position
const startIndex = this.scrollOffset;
const endIndex = Math.min(this.scrollOffset + this.maxVisibleUnits, this.units.length);
const visibleUnits = this.units.slice(startIndex, endIndex);

// Calculate total width for visible units
const totalVisibleUnits = visibleUnits.length;
const totalWidth = totalVisibleUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;
```

**Changes:**
- Use `scrollOffset` to determine visible window
- Slice units array to only visible units
- Keep centering logic but apply to visible units only

#### 3b. Render Arrow Buttons

Add after unit rendering loop (after line 181):

```typescript
// Render scroll arrows if needed
this.renderScrollArrows(ctx, region, spriteImages, spriteSize);
```

**New Method:**

```typescript
/**
 * Render left/right scroll arrows when appropriate
 */
private renderScrollArrows(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  spriteImages: Map<string, HTMLImageElement>,
  spriteSize: number
): void {
  const arrowSize = 12; // 1 tile (same as sprite size)

  // Calculate arrow Y position (vertically centered in panel)
  const arrowY = region.y + (region.height - arrowSize) / 2;

  // Right arrow (show if we can scroll right)
  if (this.canScrollRight()) {
    const arrowX = region.x + region.width - arrowSize; // Right edge

    SpriteRenderer.renderSpriteById(
      ctx,
      'minimap-6', // Right arrow sprite (same as map scrolling)
      spriteImages,
      spriteSize,
      arrowX,
      arrowY,
      arrowSize,
      arrowSize
    );

    // Store bounds for click detection
    this.scrollRightButtonBounds = {
      x: arrowX,
      y: arrowY,
      width: arrowSize,
      height: arrowSize
    };
  } else {
    this.scrollRightButtonBounds = null;
  }

  // Left arrow (show if we can scroll left)
  if (this.canScrollLeft()) {
    // Position left arrow to the right of the clock area
    // Clock is at x=4, width=12, so start at x=20 (with 4px padding)
    const arrowX = region.x + 20;

    SpriteRenderer.renderSpriteById(
      ctx,
      'minimap-8', // Left arrow sprite (same as map scrolling)
      spriteImages,
      spriteSize,
      arrowX,
      arrowY,
      arrowSize,
      arrowSize
    );

    // Store bounds for click detection
    this.scrollLeftButtonBounds = {
      x: arrowX,
      y: arrowY,
      width: arrowSize,
      height: arrowSize
    };
  } else {
    this.scrollLeftButtonBounds = null;
  }
}
```

**Rationale:**
- Follow CombatLayoutManager pattern (lines 249-377)
- Single 12x12 sprite per arrow (not stacked like map arrows)
- Right arrow: positioned at right edge of panel
- Left arrow: positioned after clock area on left
- Vertically centered in 24px panel height
- Store bounds for click detection (set to null when not visible)

---

### 4. Add Helper Methods

**Location:** TurnOrderRenderer class (new private methods)

```typescript
/**
 * Check if we can scroll left (not at start)
 */
private canScrollLeft(): boolean {
  return this.scrollOffset > 0;
}

/**
 * Check if we can scroll right (more units beyond visible window)
 */
private canScrollRight(): boolean {
  return this.scrollOffset + this.maxVisibleUnits < this.units.length;
}

/**
 * Scroll left by 1 unit (decrement offset)
 */
private scrollLeft(): void {
  if (this.canScrollLeft()) {
    this.scrollOffset = Math.max(0, this.scrollOffset - 1);
  }
}

/**
 * Scroll right by 1 unit (increment offset)
 */
private scrollRight(): void {
  if (this.canScrollRight()) {
    const maxOffset = Math.max(0, this.units.length - this.maxVisibleUnits);
    this.scrollOffset = Math.min(maxOffset, this.scrollOffset + 1);
  }
}
```

**Rationale:**
- Encapsulate scroll logic for clarity
- Prevent scrolling beyond valid range
- `maxOffset` calculation ensures we don't scroll past the end

---

### 5. Update handleClick() Method

**Location:** TurnOrderRenderer.handleClick() method (lines 184-224)

Replace entire method with:

```typescript
handleClick(x: number, y: number, region: PanelRegion): boolean {
  // Check if click is within the panel region
  if (x < region.x || x > region.x + region.width ||
      y < region.y || y > region.y + region.height) {
    return false;
  }

  // Priority 1: Check left arrow click
  if (this.scrollLeftButtonBounds &&
      x >= this.scrollLeftButtonBounds.x &&
      x <= this.scrollLeftButtonBounds.x + this.scrollLeftButtonBounds.width &&
      y >= this.scrollLeftButtonBounds.y &&
      y <= this.scrollLeftButtonBounds.y + this.scrollLeftButtonBounds.height) {
    this.scrollLeft();
    return true; // Event handled
  }

  // Priority 2: Check right arrow click
  if (this.scrollRightButtonBounds &&
      x >= this.scrollRightButtonBounds.x &&
      x <= this.scrollRightButtonBounds.x + this.scrollRightButtonBounds.width &&
      y >= this.scrollRightButtonBounds.y &&
      y <= this.scrollRightButtonBounds.y + this.scrollRightButtonBounds.height) {
    this.scrollRight();
    return true; // Event handled
  }

  // Priority 3: Check unit sprite clicks (existing logic, adjusted for scrollOffset)
  if (!this.onUnitClick) return false;

  // Calculate visible window (same as in render)
  const startIndex = this.scrollOffset;
  const endIndex = Math.min(this.scrollOffset + this.maxVisibleUnits, this.units.length);
  const visibleUnits = this.units.slice(startIndex, endIndex);

  // Calculate total width for visible units
  const totalVisibleUnits = visibleUnits.length;
  const totalWidth = totalVisibleUnits * (this.spriteSize + this.spriteSpacing) - this.spriteSpacing;

  // Calculate starting X to center the units
  const startX = region.x + (region.width - totalWidth) / 2;

  // Position sprites at the bottom of the panel
  const spriteY = region.y + region.height - this.spriteSize - 7 + 3;

  // Determine which unit was clicked
  let currentX = startX;

  for (const unit of visibleUnits) {
    // Check if we've exceeded the region width
    if (currentX + this.spriteSize > region.x + region.width) {
      break;
    }

    // Check if click is within this unit's sprite bounds
    if (x >= currentX && x < currentX + this.spriteSize &&
        y >= spriteY && y < spriteY + this.spriteSize) {
      this.onUnitClick(unit);
      return true;
    }

    // Move to next position
    currentX += this.spriteSize + this.spriteSpacing;
  }

  return false;
}
```

**Changes:**
1. Check arrow bounds first (priority order)
2. Call scroll methods and return true if arrow clicked
3. Use `visibleUnits` (sliced array) for unit click detection
4. Keep same sprite positioning logic as render()

**Rationale:**
- Arrow clicks have priority over unit clicks
- Same pattern as CombatLayoutManager.handleMapScrollClick() (lines 135-173)
- Ensure visible window calculation matches render() exactly

---

## Edge Cases & Validation

### Edge Case 1: 8 or Fewer Units
- **Behavior**: No arrows shown, existing behavior preserved
- **Test**: `scrollOffset = 0`, `canScrollLeft() = false`, `canScrollRight() = false`
- **Result**: Full list displayed, centered as before

### Edge Case 2: 9-16 Units
- **Initial state**: Right arrow visible, left arrow hidden
- **After scrolling right**: Both arrows visible
- **At end**: Left arrow visible, right arrow hidden

### Edge Case 3: Many Units (20+)
- **Behavior**: Smooth scrolling through all units, 8 at a time
- **Test**: Scroll to end, verify `scrollOffset = units.length - maxVisibleUnits`

### Edge Case 4: Unit List Changes Mid-Scroll
- **Behavior**: `setUnits()` resets `scrollOffset = 0`
- **Result**: User sees first 8 units after list update

### Edge Case 5: Arrow Overlap with Unit Sprites
- **Prevention**: Right arrow at `region.x + region.width - 12` (right edge)
- **Prevention**: Left arrow at `region.x + 20` (after clock area)
- **Validation**: Ensure unit centering calculation accounts for available width

---

## Visual Layout Examples

### Example 1: 8 Units (No Arrows)
```
[Clock] [TIME]    [Sprite1] [Sprite2] ... [Sprite8]
[Tick#]
```

### Example 2: 12 Units (Scrolled to Start)
```
[Clock] [TIME] [←]  [Sprite1] [Sprite2] ... [Sprite8]  [→]
[Tick#]
```

### Example 3: 12 Units (Scrolled Right)
```
[Clock] [TIME] [←]  [Sprite5] [Sprite6] ... [Sprite12]
[Tick#]
```

---

## Testing Strategy

### Manual Testing
1. **Test with 5 units**: Verify no arrows, all units visible
2. **Test with 8 units**: Verify no arrows, all units visible
3. **Test with 10 units**: Verify right arrow appears, left arrow hidden
4. **Click right arrow**: Verify scrolls to show units 2-9, left arrow appears
5. **Click right arrow again**: Verify scrolls to show units 3-10, right arrow disappears
6. **Click left arrow**: Verify scrolls back to units 2-9
7. **Test with 20 units**: Verify can scroll through entire list
8. **Change unit list**: Call `setUnits([...])`, verify scroll resets to 0

### Unit Test Scenarios (Future)
```typescript
describe('TurnOrderRenderer Scrolling', () => {
  it('should not show arrows with 8 or fewer units', () => { ... });
  it('should show right arrow with 9+ units', () => { ... });
  it('should show left arrow when scrolled right', () => { ... });
  it('should scroll right by 1 unit on arrow click', () => { ... });
  it('should scroll left by 1 unit on arrow click', () => { ... });
  it('should reset scroll offset when units change', () => { ... });
  it('should not scroll beyond end of list', () => { ... });
  it('should handle clicks on visible unit sprites', () => { ... });
});
```

---

## Implementation Checklist

- [ ] Add scroll state instance variables (`scrollOffset`, `maxVisibleUnits`, button bounds)
- [ ] Update `setUnits()` to reset `scrollOffset = 0`
- [ ] Update `render()` to calculate visible window from `scrollOffset`
- [ ] Implement `renderScrollArrows()` method
- [ ] Implement helper methods: `canScrollLeft()`, `canScrollRight()`, `scrollLeft()`, `scrollRight()`
- [ ] Update `handleClick()` to check arrow bounds first
- [ ] Update `handleClick()` to use visible window for unit clicks
- [ ] Test with 5, 8, 10, 20 units
- [ ] Test arrow click behavior (scroll left/right)
- [ ] Test unit click behavior with scrolling
- [ ] Test scroll reset when calling `setUnits()`
- [ ] Verify no visual overlap between arrows and units
- [ ] Verify arrows are vertically centered
- [ ] Update CombatHierarchy.md documentation (optional)

---

## Guidelines Compliance

### From GeneralGuidelines.md

✅ **Rendering Rules**
- Uses `SpriteRenderer.renderSpriteById()` for arrow sprites (not `ctx.drawImage()`)
- Uses `FontAtlasRenderer.renderText()` for text (not `ctx.fillText()`)
- Rounds coordinates to integers for pixel-perfect rendering

✅ **State Management**
- TurnOrderRenderer is already cached by TopPanelManager (not recreated every frame)
- Scroll state stored as instance variables (component-local state)
- No React state needed (doesn't trigger re-renders)

✅ **Performance**
- Slicing array is O(n) but n ≤ 20 (negligible)
- Arrow rendering only happens when bounds change
- No additional off-screen canvases needed

✅ **Coordinate Systems**
- Uses panel-relative coordinates (already established pattern)
- Click detection uses same coordinate calculations as rendering

---

## Future Enhancements (Out of Scope)

1. **Mouse wheel scrolling**: Detect wheel events on panel, scroll by 1-2 units
2. **Keyboard scrolling**: Arrow keys to scroll when panel is focused
3. **Scroll indicators**: Show "3 more" text instead of just arrows
4. **Smooth scroll animation**: Lerp between scroll positions over 200ms
5. **Page scrolling**: Scroll by `maxVisibleUnits` instead of 1 unit
6. **Auto-scroll to ready unit**: When unit reaches 100 AT, scroll to show them

---

## Related Files to Update

### Primary Implementation
- **react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts**: All changes

### Documentation (Optional)
- **CombatHierarchy.md**: Update TurnOrderRenderer section (lines 273-302) to mention scrolling

### Testing (Future)
- **react-app/src/models/combat/managers/renderers/TurnOrderRenderer.test.ts**: Create unit tests

---

## Estimated Complexity

- **Lines of Code**: ~80-100 new lines (helper methods, arrow rendering, updated click handling)
- **Risk**: Low (isolated to TurnOrderRenderer, no changes to other components)
- **Testing Effort**: Medium (manual testing with various unit counts)

---

**End of Plan**

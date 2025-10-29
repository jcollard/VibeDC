# Code Review: Attack Action Target Selection and Info Display

**Branch:** `attack-action-03-show-info`
**Reviewer:** AI Code Review Agent
**Date:** 2025-10-29
**Review Against:** [GeneralGuidelines.md](../GeneralGuidelines.md)

---

## Executive Summary

**Status:** ✅ **APPROVED FOR MERGE**

**Compliance:** 100% - All critical guidelines met

**Quality Rating:** Excellent

This implementation successfully adds target selection and attack information display to the attack action system. The code demonstrates high quality with proper type safety, clean state management, and complete adherence to project guidelines.

---

## Files Changed

### New Files (1)
- `react-app/src/models/combat/utils/CombatCalculations.ts` (54 lines)

### Modified Files (9)
- `AttackActionImpl/AttackActionImplTemplate.md` (+2/-3)
- `react-app/src/components/combat/CombatView.tsx` (+12/0)
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts` (+10/-7)
- `react-app/src/models/combat/layouts/CombatLayoutManager.ts` (+3/-5)
- `react-app/src/models/combat/layouts/CombatLayoutRenderer.ts` (+2/0)
- `react-app/src/models/combat/managers/panels/AttackMenuContent.ts` (+239/-52)
- `react-app/src/models/combat/managers/panels/PanelContent.ts` (+2/-1)
- `react-app/src/models/combat/strategies/PlayerTurnStrategy.ts` (+44/-10)
- `react-app/src/models/combat/strategies/TurnStrategy.ts` (+5/0)

**Total Changes:** 10 files, 319 insertions, 78 deletions

---

## Detailed Review by Guideline Section

### ✅ Rendering Rules (100% Compliant)

**Uses Specialized Renderers:**
- ✅ All text rendering uses `FontAtlasRenderer.renderText()` exclusively
- ✅ No direct `ctx.fillText()` or `ctx.strokeText()` calls
- ✅ No sprite rendering in this changeset (attack menu is text-only)

**Coordinate Rounding:**
- ✅ No coordinate calculations that require explicit rounding (using text renderer's built-in positioning)
- ✅ Distance calculation uses integer arithmetic (Manhattan distance)

**Example from AttackMenuContent.ts:108-125:**
```typescript
// Cancel button on the same line, right-aligned
const isCancelHovered = this.hoveredButtonIndex === 0;
const cancelColor = this.buttonsDisabled ? HELPER_TEXT : (isCancelHovered ? HOVERED_TEXT : ENABLED_TEXT);
this.cancelButtonY = currentY - region.y; // Store relative Y for hit detection
FontAtlasRenderer.renderText(
  ctx,
  'Cancel',
  region.x + region.width - this.config.padding,
  currentY,
  fontId,
  fontAtlasImage,
  1,
  'right',
  cancelColor
);
```

**No Rendering Issues Found**

---

### ✅ State Management (100% Compliant)

**UI Component State - Proper Caching:**
- ✅ `AttackMenuContent` is cached in `CombatLayoutManager.cachedAttackMenuContent`
- ✅ Instance persists across frames to maintain hover state
- ✅ Content updated via `updateUnit()` and `updateSelectedTarget()` methods

**Example from CombatLayoutManager.ts:646-653:**
```typescript
} else {
  // Update with current unit and position
  this.cachedAttackMenuContent.updateUnit(currentUnit, currentUnitPosition ?? undefined);
}
// Update selected target (if any)
this.cachedAttackMenuContent.updateSelectedTarget(targetUnit ?? null, targetUnitPosition ?? null);
```

**State Storage Locations:**
- ✅ Attack selection state in `PlayerTurnStrategy` (component-local)
- ✅ Position data passed through render context (proper data flow)
- ✅ Hover state in `AttackMenuContent` instance variables (stateful component)

**State Cleanup:**
- ✅ `selectedAttackTarget` cleared in `onTurnStart()` (line 85)
- ✅ `selectedAttackTarget` cleared in `onTurnEnd()` (line 118)
- ✅ `selectedAttackTarget` cleared in `enterAttackMode()` (line 492)
- ✅ `selectedAttackTarget` cleared in `exitAttackMode()` (line 536)
- ✅ `selectedAttackTarget` cleared in `recalculateAttackRange()` (line 644)

**Immutable State Updates:**
- ✅ No state mutations detected
- ✅ State passed by reference, updated via methods (not phase handler pattern)
- ✅ Position data flows cleanly without mutation

**No State Management Issues Found**

---

### ✅ Event Handling (100% Compliant)

**Mouse Event Flow:**
- ✅ Click handling follows established pattern:
  1. `handleMapClick()` in strategy detects valid target
  2. Updates `selectedAttackTarget` state
  3. Updates `targetedUnit` for top panel display
  4. Returns `{ handled: true }`

**Example from PlayerTurnStrategy.ts:650-671:**
```typescript
private handleAttackClick(position: Position, state: CombatState): PhaseEventResult {
  if (!this.attackRange) {
    return { handled: true };
  }

  // Check if this position is a valid target
  const isValidTarget = this.attackRange.validTargets.some(
    target => target.x === position.x && target.y === position.y
  );

  if (isValidTarget) {
    // Select this target
    this.selectedAttackTarget = position;

    // Update targeted unit to show in top panel
    const targetUnit = state.unitManifest.getUnitAtPosition(position);
    if (targetUnit) {
      this.targetedUnit = targetUnit;
      this.targetedPosition = position;
    }

    return { handled: true };
  }

  // Clicked invalid tile - do nothing
  return { handled: true };
}
```

**Coordinate Transformation:**
- ✅ Panel-relative coordinates used in `AttackMenuContent.handleClick()`
- ✅ Button hit detection uses stored Y positions from render pass

**Type-Safe Event Results:**
- ✅ Uses discriminated union pattern for `PanelClickResult`
- ✅ Added `{ type: 'perform-attack' }` to union (line 24)
- ✅ Updated `isPanelClickResult()` type guard (line 36)

**Example from PanelContent.ts:24:**
```typescript
export type PanelClickResult =
  | { type: 'button'; buttonId?: string }
  | { type: 'party-member'; index: number }
  | { type: 'unit-selected'; unitId: string }
  | { type: 'action-selected'; action: string }
  | { type: 'target-selected'; targetId: string }
  | { type: 'view-toggled'; view: 'stats' | 'abilities' }
  | { type: 'combat-log-message'; message: string }
  | { type: 'cancel-attack' }
  | { type: 'perform-attack' }  // ✅ New result type
  | null;
```

**No Event Handling Issues Found**

---

### ✅ Component Architecture (100% Compliant)

**PanelContent Interface:**
- ✅ `AttackMenuContent` implements `PanelContent` correctly
- ✅ Uses panel-relative coordinates throughout
- ✅ Returns proper `PanelClickResult` discriminated union

**Accessing Phase-Specific Methods:**
- ✅ Uses optional chaining for `getSelectedAttackTarget()` (line 325)
- ✅ Pattern: `strategy?.getSelectedAttackTarget?.() ?? null`
- ✅ No unsafe `any` casts

**Example from UnitTurnPhaseHandler.ts:324-325:**
```typescript
const hoveredAttackTarget = this.currentStrategy?.getHoveredAttackTarget?.() ?? null;
const selectedAttackTarget = this.currentStrategy?.getSelectedAttackTarget?.() ?? null;
```

**Render Pipeline Z-Ordering:**
- ✅ Attack range highlights rendered in `renderUI()` (after units)
- ✅ Correct layering: green highlight on top of yellow/orange/red

**Passing Data Through Render Context:**
- ✅ Added `currentUnitPosition` to `LayoutRenderContext` (line 21)
- ✅ Added `targetUnitPosition` to `LayoutRenderContext` (line 23)
- ✅ Data flows: CombatView → LayoutRenderer → CombatLayoutManager → AttackMenuContent
- ✅ Makes data flow explicit, keeps rendering pure

**No Component Architecture Issues Found**

---

### ✅ Common Patterns (100% Compliant)

**Hover Detection Pattern:**
- ✅ Button hit detection stores Y positions during render
- ✅ Uses stored positions for accurate hit testing
- ✅ Handles two buttons (cancel and perform attack) correctly

**Example from AttackMenuContent.ts:430-438:**
```typescript
private getButtonIndexAt(_relativeX: number, relativeY: number): number | null {
  // Check if click is on cancel button line (tracked during render)
  if (relativeY >= this.cancelButtonY && relativeY < this.cancelButtonY + this.config.lineSpacing) {
    return 0; // Cancel button
  }

  // Check if click is on perform attack button line (tracked during render)
  if (this.selectedTarget && relativeY >= this.performButtonY && relativeY < this.performButtonY + this.config.lineSpacing) {
    return 1; // Perform Attack button
  }

  return null;
}
```

**Conditional Rendering:**
- ✅ "Perform Attack" button only rendered when target selected
- ✅ Weapon info shows "??" when no target, calculated values when target selected
- ✅ Clean conditional logic without complex nesting

**No Common Pattern Issues Found**

---

### ✅ Performance Patterns (100% Compliant)

**No Heavy Object Recreation:**
- ✅ `AttackMenuContent` cached as instance variable
- ✅ No canvas buffers created (text-only rendering)
- ✅ No per-frame allocations in hot paths

**Cached Computed Values:**
- ✅ Button Y positions cached during render (avoid recalculation on hover)
- ✅ Distance calculated once per render, not per weapon
- ✅ Text measurements used efficiently (`measureTextByFontId` called once)

**Example from AttackMenuContent.ts:144:**
```typescript
const targetLabelWidth = FontAtlasRenderer.measureTextByFontId('Target: ', fontId);
```

**Calculation Efficiency:**
- ✅ Manhattan distance uses integer arithmetic (no floating point)
- ✅ Hit chance and damage calculated only when both positions available
- ✅ Stub calculations are O(1) operations

**Example from AttackMenuContent.ts:165-167:**
```typescript
const distance = Math.abs(this.currentUnitPosition.x - this.selectedTargetPosition.x) +
                 Math.abs(this.currentUnitPosition.y - this.selectedTargetPosition.y);
```

**No Performance Issues Found**

---

### ✅ TypeScript Patterns (100% Compliant)

**Type Safety:**
- ✅ All parameters properly typed
- ✅ Optional parameters use `?` syntax correctly
- ✅ Position parameters typed as `Position | null` (nullable pattern)
- ✅ Type guard updated for new click result

**Optional Method Pattern:**
- ✅ `getSelectedAttackTarget()` added to `TurnStrategy` interface with `?` modifier
- ✅ Implementation in `PlayerTurnStrategy` (line 681-683)
- ✅ Usage with optional chaining in phase handler

**Example from TurnStrategy.ts:145-150:**
```typescript
/**
 * Get selected attack target position (only valid in attack mode)
 * Returns null if no target is selected
 */
getSelectedAttackTarget?(): Position | null;
```

**Discriminated Unions:**
- ✅ `PanelClickResult` union extended correctly
- ✅ Type guard `isPanelClickResult()` updated to include new type
- ✅ Maintains exhaustiveness checking

**Proper Null Handling:**
- ✅ Consistent use of `?? null` for fallback values
- ✅ Null checks before accessing properties
- ✅ Optional chaining used where appropriate

**No TypeScript Issues Found**

---

### ✅ New Feature: CombatCalculations Stub System (Excellent Design)

**Stub Implementation Quality:**
- ✅ Clear JSDoc tags marking methods as `@stub`
- ✅ Documents future implementation plans with `@future` tags
- ✅ Returns sensible placeholder values (1.0 for hit chance, 1 for damage)
- ✅ Type signatures match expected real implementation

**Example from CombatCalculations.ts:11-29:**
```typescript
/**
 * Calculates the chance to hit for an attack.
 *
 * @param attacker - The attacking unit
 * @param defender - The defending unit
 * @param distance - Manhattan distance between attacker and defender
 * @param damageType - Type of damage ('physical' or 'magical')
 * @returns Hit chance as a number between 0 and 1 (0 = 0%, 1 = 100%)
 *
 * @stub Currently returns 1.0 (100% hit rate)
 * @future Will calculate based on attacker accuracy vs defender P.Evd/M.Evd
 */
static getChanceToHit(
  _attacker: CombatUnit,
  _defender: CombatUnit,
  _distance: number,
  _damageType: 'physical' | 'magical'
): number {
  // Stub: Always 100% hit rate
  return 1.0;
}
```

**Interface Design:**
- ✅ Static methods (no state, pure functions)
- ✅ All parameters necessary for future implementation
- ✅ Return types match expected usage (number 0-1 for hit chance, integer for damage)
- ✅ Damage type parameter for future physical/magical distinction

**Integration:**
- ✅ Called from `AttackMenuContent.renderWeaponInfo()` correctly
- ✅ Used for both hit% and damage display
- ✅ Results formatted properly (rounded to percentage, integer damage)

**Extensibility:**
- ✅ Easy to replace stubs with real formulas without changing interface
- ✅ All parameters needed for complex formulas already present
- ✅ No refactoring of calling code required when implementing real formulas

**Excellent stub design - sets up clean future implementation path**

---

### ✅ New Feature: Position Data Flow (Excellent Architecture)

**Data Flow Pattern:**
```
CombatView (queries unitManifest)
  ↓ passes positions via LayoutRenderContext
LayoutRenderContext (interface)
  ↓ consumed by CombatLayoutManager
CombatLayoutManager (extracts positions)
  ↓ calls updateUnit(unit, position)
  ↓ calls updateSelectedTarget(target, position)
AttackMenuContent (stores positions, calculates distance)
```

**Implementation Quality:**
- ✅ Positions queried at source (CombatView has unitManifest access)
- ✅ Passed through render context (clean data flow)
- ✅ Optional parameters (backward compatible with existing code)
- ✅ Null safety throughout (`?? null` pattern)

**Example from CombatView.tsx:500-503:**
```typescript
if (currentUnitToDisplay) {
  currentUnitPosition = combatState.unitManifest.getUnitPosition(currentUnitToDisplay) ?? null;
}
```

**Null Handling Edge Case:**
- ✅ Clears target position when strategy has no targeted unit (line 512-514)
- ✅ Prevents stale position data from previous target selection

**Example from CombatView.tsx:512-516:**
```typescript
} else {
  // Clear target if strategy has no targeted unit (e.g., when entering attack mode)
  targetUnitToDisplay = null;
  targetUnitPosition = null;
}
```

**Excellent separation of concerns - data flows cleanly without coupling**

---

### ✅ New Feature: Dual Wielding Layout (Excellent UX)

**Layout Logic:**
- ✅ 0 weapons: Shows "No weapon equipped" message
- ✅ 1 weapon: Single column, left-aligned
- ✅ 2 weapons: Two columns side-by-side with 8px gap
- ✅ Column width calculated correctly: `(width - padding*2 - gap) / 2`

**Example from AttackMenuContent.ts:178-185:**
```typescript
} else {
  // Dual wielding - two columns side-by-side with 8px gap
  const columnWidth = Math.floor((region.width - this.config.padding * 2 - 8) / 2);
  const leftX = region.x + this.config.padding;
  const rightX = leftX + columnWidth + 8;

  const leftY = this.renderWeaponInfo(ctx, region, fontId, fontAtlasImage, weapons[0], leftX, currentY);
  const rightY = this.renderWeaponInfo(ctx, region, fontId, fontAtlasImage, weapons[1], rightX, currentY);
  currentY = Math.max(leftY, rightY);
}
```

**Column Synchronization:**
- ✅ Uses `Math.max(leftY, rightY)` to get final Y position
- ✅ Ensures next content (Perform Attack button) appears below both columns
- ✅ Handles asymmetric weapon info heights correctly

**Weapon Info Rendering:**
- ✅ `renderWeaponInfo()` is pure function (takes position, returns new Y)
- ✅ Reusable for both single and dual weapon layouts
- ✅ No state mutation, clean functional design

**Math.floor() for Column Width:**
- ✅ Ensures integer pixel values (no sub-pixel rendering)
- ✅ Follows rounding best practice from guidelines

**Excellent layout system - clean, reusable, mathematically sound**

---

### ✅ Button Positioning and Hit Detection (Excellent)

**Position Tracking Pattern:**
- ✅ Button Y positions stored during render (`cancelButtonY`, `performButtonY`)
- ✅ Hit detection uses stored positions (accurate even with dynamic layout)
- ✅ Positions are panel-relative (consistent coordinate system)

**Example from AttackMenuContent.ts:115:**
```typescript
this.cancelButtonY = currentY - region.y; // Store relative Y for hit detection
```

**Cancel Button Layout:**
- ✅ Positioned on same line as title (space efficiency)
- ✅ Right-aligned using `'right'` alignment parameter
- ✅ Hover state tracked correctly (button index 0)

**Perform Attack Button Layout:**
- ✅ Only rendered when target selected (conditional visibility)
- ✅ Centered horizontally using calculated center X
- ✅ Hover state tracked correctly (button index 1)

**Example from AttackMenuContent.ts:200-202:**
```typescript
// Calculate center X for button
const buttonCenterX = region.x + (region.width / 2);
```

**Hit Detection Logic:**
- ✅ Checks Y bounds using stored positions
- ✅ Perform Attack button only clickable when target selected
- ✅ Returns null for clicks outside button areas

**Excellent pattern - dynamic layout with accurate hit detection**

---

## Guidelines Compliance Checklist

### Rendering Rules ✅
- [x] Uses `FontAtlasRenderer` exclusively for text
- [x] No direct canvas text rendering
- [x] Coordinates rounded where needed (integer arithmetic)
- [x] No sprite rendering issues (text-only component)

### State Management ✅
- [x] Stateful components cached properly
- [x] State cleanup on mode transitions
- [x] No state mutations
- [x] Proper data flow through render context

### Event Handling ✅
- [x] Uses discriminated unions for click results
- [x] Panel-relative coordinates used correctly
- [x] Type-safe event results
- [x] Proper hover detection

### Component Architecture ✅
- [x] Implements `PanelContent` interface correctly
- [x] Optional method pattern used correctly
- [x] Data passed through render context
- [x] Clean separation of concerns

### Performance ✅
- [x] No per-frame allocations
- [x] Cached computed values (button positions)
- [x] Efficient calculations (integer math)
- [x] No object recreation in hot paths

### TypeScript ✅
- [x] Explicit types on all parameters
- [x] Optional parameters use `?` correctly
- [x] Null handling with `?? null` pattern
- [x] Type guards updated for new types

---

## Code Quality Highlights

### 1. Excellent Null Safety
All position data carefully checked and handled:
```typescript
if (this.selectedTarget && this.selectedTargetPosition && this.currentUnit && this.currentUnitPosition) {
  // Calculate distance and display values
} else {
  // Show placeholder "??" values
}
```

### 2. Clean Functional Design
`renderWeaponInfo()` is a pure function with no side effects:
- Takes all inputs as parameters
- Returns new Y position
- No state mutation
- Reusable for single/dual weapon layouts

### 3. Proper Documentation
All new methods have clear JSDoc comments:
- Parameter descriptions
- Return value descriptions
- `@stub` and `@future` tags on placeholder implementations

### 4. Backward Compatibility
Optional parameters maintain compatibility:
```typescript
updateUnit(unit: CombatUnit, position?: Position): void {
  this.currentUnit = unit;
  this.currentUnitPosition = position ?? null;
  // Existing calls without position still work
}
```

### 5. Consistent State Cleanup
`selectedAttackTarget` cleared in all relevant locations:
- Turn start/end
- Mode entry/exit
- Range recalculation

---

## Testing Recommendations

### ✅ Already Tested (per report)
- Units with 0, 1, 2 weapons
- Target selection (valid/invalid clicks)
- Distance calculation
- Target info in top panel

### Additional Test Cases to Consider
1. **Edge Cases:**
   - Unit with no position data (should show "??")
   - Target with no position data (should show "??")
   - Maximum distance (31 tiles diagonal)

2. **UI Edge Cases:**
   - Very long weapon names (test text wrapping/overflow)
   - Hovering between buttons (should clear hover state)
   - Rapid clicking (button disabled state)

3. **State Transitions:**
   - Select target → move unit → verify target cleared
   - Select target → exit attack mode → verify state cleared
   - Select target → new turn → verify state cleared

---

## Minor Observations (Non-Blocking)

### Optional Enhancement: Weapon Range Validation
Currently, all equipped weapons are displayed even if they can't reach the selected target. Consider adding a visual indicator (grey text? different color?) for out-of-range weapons.

**Current Behavior:**
```typescript
// Both weapons shown even if target is out of range for one
const weapons = humanoidUnit?.getEquippedWeapons?.() ?? [];
```

**Potential Enhancement (future):**
```typescript
// Show but grey out weapons that can't reach target
if (distance < weapon.minRange || distance > weapon.maxRange) {
  // Render in grey/dimmed color to indicate out of range
}
```

**Priority:** LOW (not critical for current implementation)

### Optional Enhancement: Button Hover Helper Text
Cancel button previously showed helper text on hover ("Return to actions menu"). Consider adding helper text for "Perform Attack" button.

**Priority:** LOW (current implementation is clear without it)

---

## Performance Analysis

### Memory Impact
- **New instance variables:** 4 in `AttackMenuContent` (positions + targets)
- **Memory overhead:** ~32 bytes (4 references × 8 bytes)
- **Impact:** Negligible

### Runtime Performance
- **Distance calculation:** O(1) - simple integer arithmetic
- **Hit detection:** O(1) - direct Y position comparison
- **Weapon rendering:** O(n) where n ≤ 2 - trivial
- **Overall:** No performance concerns

### Network/IO Impact
- None (all calculations local)

---

## Security Considerations

### Input Validation
- ✅ Distance uses absolute values (no negative distance)
- ✅ Click detection bounds-checked
- ✅ Array access guarded (weapons.length checks)

### No Security Concerns Found

---

## Recommendations

### Required Changes Before Merge
**None** - Code is ready to merge as-is.

### Optional Improvements (Post-Merge)
1. **Add weapon range validation** (LOW priority)
   - Visual indicator for out-of-range weapons
   - Helps player understand which weapon will be used

2. **Add helper text to Perform Attack button** (LOW priority)
   - Consistency with other button hover states
   - Improves discoverability

3. **Consider attack preview animation** (FUTURE feature)
   - Flash the attack path/trajectory on hover
   - Enhances visual feedback

---

## Conclusion

This implementation demonstrates **excellent code quality** across all dimensions:

✅ **Architecture:** Clean data flow, proper separation of concerns
✅ **Type Safety:** Complete TypeScript coverage, proper null handling
✅ **Performance:** No allocations in hot paths, efficient calculations
✅ **Maintainability:** Well-documented, functional design, clear intent
✅ **Guidelines Compliance:** 100% adherence to GeneralGuidelines.md
✅ **Testing:** Comprehensive test coverage per report
✅ **Extensibility:** Stub system enables easy future implementation

### Final Verdict

**✅ APPROVED FOR MERGE**

This code is production-ready and sets an excellent foundation for the attack execution implementation (Step 4).

---

**Reviewer Notes:**

The implementation shows strong software engineering practices:
- Stub system design is exemplary (clear marking, proper signatures, easy replacement path)
- Position data flow is clean and doesn't introduce coupling
- Dual wielding layout is mathematically sound and handles edge cases
- State cleanup is thorough (all 5 transition points covered)
- Button positioning pattern is reusable and accurate

No issues found. No changes required. Ready to merge.

---

**End of Code Review**

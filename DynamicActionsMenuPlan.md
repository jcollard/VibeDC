# Dynamic Actions Menu Implementation Plan

**Date:** 2025-10-28
**Feature:** Dynamic Actions Menu with Unit-Based Action Buttons
**Branch:** TBD (to be created or continue in current branch)
**Priority:** High
**Complexity:** Medium

---

## Overview

Currently, ActionsMenuContent displays 2 hardcoded action buttons (Delay and End Turn). This plan extends the menu to display dynamic, unit-specific actions that adapt based on the active unit's stats and class configuration.

The menu will display:
- **Move**: "Move this unit up to {X} tiles" where X = unit.movement
- **Attack**: "Perform a basic attack with this unit's weapon"
- **{Primary Class}**: "Perform a {Primary Class} action" (using unit.unitClass.name)
- **{Secondary Class}**: "Perform a {Secondary Class} action" (conditionally shown if unit.secondaryClass exists)
- **Delay**: "Take no moves or actions and sets Action Timer to 50" (existing)
- **End Turn**: "Ends your turn and sets Action Timer to 0" (existing)

All buttons will be enabled initially. The menu will support hover tooltips that wrap text if needed. The menu must be updateable without recreating the entire component instance.

---

## Requirements

### Visual Specifications

**Colors:**
- Button text (enabled): `#ffffff` (ENABLED_TEXT from colors.ts)
- Button text (hovered): `#ffff00` (HOVERED_TEXT from colors.ts)
- Button text (disabled): `#888888` (DISABLED_TEXT from colors.ts)
- Helper text: `#888888` (HELPER_TEXT from colors.ts)
- Title: `#ffffff` (white)

**Font:**
- 7px-04b03 font for all text
- 8px line spacing (existing config)

**Layout:**
- Title: "ACTIONS"
- Blank line
- Action buttons (dynamic list based on unit)
- Spacing line after last button
- Helper text (on hover, wraps if needed)

### Behavioral Specifications

**Dynamic Button Generation:**
1. Menu must update when unit changes (new unit takes turn)
2. Movement button shows unit's movement stat
3. Primary class button shows unit's primary class name
4. Secondary class button only appears if unit has secondary class
5. Button order: Move, Attack, Primary Class, Secondary Class (if exists), Delay, End Turn

**Helper Text Display:**
- Shows at bottom of panel on hover
- Uses full panel width minus padding
- Wraps to multiple lines using existing wrapText() method
- Appears after spacing line below buttons

**State Management:**
- ActionsMenuContent must be cached (not recreated each frame per GeneralGuidelines.md)
- Provide updateUnit() method to refresh buttons without losing hover state
- Reset hover state when unit changes
- Disable buttons after click (existing pattern)

**Action IDs:**
- `'move'` - Move action
- `'attack'` - Attack action
- `'primary-class'` - Primary class action
- `'secondary-class'` - Secondary class action
- `'delay'` - Delay action (existing)
- `'end-turn'` - End turn action (existing)

### Technical Requirements

**Interface Changes:**
- Add unit parameter to ActionsMenuContent methods
- Update ActionButton interface to support dynamic labels
- Maintain backward compatibility with existing click handling

**Performance:**
- No per-frame allocations (cache component)
- Helper text wrapping computed on hover, not every frame
- Button list recreated only when unit changes

**Guidelines Compliance:**
- Follow State Preservation vs Reset Pattern from GeneralGuidelines.md
- Use updateUnit() to preserve hover state
- Cache component instance in UnitTurnPhaseHandler
- Use HELPER_TEXT color constant from colors.ts

---

## Implementation Tasks

### Task 1: Update ActionButton Interface (Foundation)

**Files:**
- [ActionsMenuContent.ts](react-app/src/models/combat/managers/panels/ActionsMenuContent.ts)

**Changes:**
```typescript
interface ActionButton {
  id: string;           // Action ID
  label: string;        // Display text (now dynamic)
  enabled: boolean;     // Whether button is clickable
  helperText: string;   // Description shown on hover (existing)
}
```

**Rationale:**
- Label is now dynamic instead of hardcoded
- Interface already supports helperText from previous feature
- No breaking changes needed

---

### Task 2: Add updateUnit() Method (Core Functionality)

**Files:**
- [ActionsMenuContent.ts](react-app/src/models/combat/managers/panels/ActionsMenuContent.ts)

**Changes:**
```typescript
/**
 * Update the action menu for a new unit without resetting hover state
 * @param unit - The combat unit whose turn it is
 */
updateUnit(unit: CombatUnit): void {
  // Store current unit reference
  this.currentUnit = unit;

  // Rebuild button list based on unit stats and classes
  this.buttons = this.buildButtonList(unit);

  // Validate hover index is still valid
  if (this.hoveredButtonIndex !== null &&
      this.hoveredButtonIndex >= this.buttons.length) {
    this.hoveredButtonIndex = null;
  }

  // Mark buttons as enabled (reset disabled state from previous turn)
  this.buttonsDisabled = false;
}

/**
 * Build dynamic button list based on unit's stats and classes
 */
private buildButtonList(unit: CombatUnit): ActionButton[] {
  const buttons: ActionButton[] = [];

  // Move button
  buttons.push({
    id: 'move',
    label: 'Move',
    enabled: true,
    helperText: `Move this unit up to ${unit.movement} tiles`
  });

  // Attack button
  buttons.push({
    id: 'attack',
    label: 'Attack',
    enabled: true,
    helperText: 'Perform a basic attack with this unit\'s weapon'
  });

  // Primary class button
  const primaryClassName = unit.unitClass.name;
  buttons.push({
    id: 'primary-class',
    label: primaryClassName,
    enabled: true,
    helperText: `Perform a ${primaryClassName} action`
  });

  // Secondary class button (conditional)
  if (unit.secondaryClass) {
    const secondaryClassName = unit.secondaryClass.name;
    buttons.push({
      id: 'secondary-class',
      label: secondaryClassName,
      enabled: true,
      helperText: `Perform a ${secondaryClassName} action`
    });
  }

  // Delay button
  buttons.push({
    id: 'delay',
    label: 'Delay',
    enabled: true,
    helperText: 'Take no moves or actions and sets Action Timer to 50'
  });

  // End Turn button
  buttons.push({
    id: 'end-turn',
    label: 'End Turn',
    enabled: true,
    helperText: 'Ends your turn and sets Action Timer to 0'
  });

  return buttons;
}
```

**Rationale:**
- Follows "State Preservation vs Reset Pattern" from GeneralGuidelines.md
- updateUnit() preserves hover state (clamping index if list shrinks)
- Separate buildButtonList() method for clarity and testability
- All buttons enabled by default per requirements
- Uses unit properties for dynamic labels and helper text

**New Instance Variables:**
```typescript
private currentUnit: CombatUnit | null = null;
```

---

### Task 3: Update Constructor to Support Optional Unit

**Files:**
- [ActionsMenuContent.ts](react-app/src/models/combat/managers/panels/ActionsMenuContent.ts)

**Changes:**
```typescript
constructor(config: ActionsMenuConfig, unit?: CombatUnit) {
  this.config = config;

  if (unit) {
    this.currentUnit = unit;
    this.buttons = this.buildButtonList(unit);
  } else {
    // Fallback: just Delay and End Turn if no unit provided
    this.currentUnit = null;
    this.buttons = [
      {
        id: 'delay',
        label: 'Delay',
        enabled: true,
        helperText: 'Take no moves or actions and sets Action Timer to 50'
      },
      {
        id: 'end-turn',
        label: 'End Turn',
        enabled: true,
        helperText: 'Ends your turn and sets Action Timer to 0'
      }
    ];
  }
}
```

**Rationale:**
- Backward compatible: works with or without unit
- Allows incremental rollout (phase handlers can pass unit when ready)
- Fallback ensures menu still works in edge cases

---

### Task 4: Update CombatLayoutManager Integration

**Files:**
- [CombatLayoutManager.ts](react-app/src/models/combat/managers/layouts/CombatLayoutManager.ts)

**Changes:**
```typescript
// In renderLayout() method, when creating ActionsMenuContent:

// Check if we need to create or update the actions menu content
if (isUnitTurnPhase && currentUnit) {
  // Check if we have cached ActionsMenuContent
  if (this.cachedActionsMenuContent) {
    // Update with new unit (preserves hover state)
    this.cachedActionsMenuContent.updateUnit(currentUnit);
  } else {
    // Create new instance with unit
    this.cachedActionsMenuContent = new ActionsMenuContent(
      {
        title: 'ACTIONS',
        titleColor: '#ffffff',
        padding: 3,
        lineSpacing: 8
      },
      currentUnit
    );
  }

  // Re-enable buttons for new turn
  this.cachedActionsMenuContent.setButtonsDisabled(false);

  // Set as bottom panel content
  this.bottomPanel.setContent(this.cachedActionsMenuContent);
}
```

**New Instance Variable:**
```typescript
private cachedActionsMenuContent: ActionsMenuContent | null = null;
```

**Rationale:**
- Follows caching pattern from GeneralGuidelines.md
- Preserves hover state across frames
- Calls updateUnit() when unit changes
- Re-enables buttons each turn

---

### Task 5: Import CombatUnit in ActionsMenuContent

**Files:**
- [ActionsMenuContent.ts](react-app/src/models/combat/managers/panels/ActionsMenuContent.ts)

**Changes:**
```typescript
import type { CombatUnit } from '../../../CombatUnit';
```

**Rationale:**
- Need CombatUnit type for updateUnit() parameter
- Use type-only import to avoid circular dependencies

---

### Task 6: Update UnitTurnPhaseHandler to Pass Unit

**Files:**
- [UnitTurnPhaseHandler.ts](react-app/src/models/combat/UnitTurnPhaseHandler.ts)

**Changes:**
```typescript
// In getInfoPanelContent() method:
getInfoPanelContent(): PanelContent | null {
  const activeUnit = this.getActiveUnit();
  if (!activeUnit) return null;

  // Create or update actions menu content
  if (!this.cachedActionsMenuContent) {
    this.cachedActionsMenuContent = new ActionsMenuContent(
      {
        title: 'ACTIONS',
        titleColor: '#ffffff',
        padding: 3,
        lineSpacing: 8
      },
      activeUnit
    );
  } else {
    // Update with current unit
    this.cachedActionsMenuContent.updateUnit(activeUnit);
  }

  // Re-enable buttons for this turn
  this.cachedActionsMenuContent.setButtonsDisabled(false);

  return this.cachedActionsMenuContent;
}
```

**New Instance Variable:**
```typescript
private cachedActionsMenuContent: ActionsMenuContent | null = null;
```

**Rationale:**
- UnitTurnPhaseHandler already manages active unit
- Natural place to pass unit to actions menu
- Caches component per GeneralGuidelines.md
- Re-enables buttons each turn

---

## Testing Plan

- [ ] Menu displays Move button with correct movement value
- [ ] Menu displays Attack button
- [ ] Menu displays primary class button with class name
- [ ] Menu displays secondary class button only if unit has secondary class
- [ ] Menu displays Delay and End Turn buttons
- [ ] Button order is correct (Move, Attack, Primary, Secondary?, Delay, End Turn)
- [ ] Helper text appears on hover at bottom of panel
- [ ] Helper text wraps correctly when exceeding panel width
- [ ] Helper text disappears when not hovering
- [ ] Buttons are enabled when unit's turn starts
- [ ] Buttons disable after click
- [ ] Hover state preserved when updateUnit() called with same unit
- [ ] Hover state reset when updateUnit() called with different unit
- [ ] Menu works for units without secondary class
- [ ] Menu updates correctly when switching between units
- [ ] No visual regressions in existing UI
- [ ] No performance degradation (check allocations)

---

## Implementation Order

1. **Task 5**: Add CombatUnit import (no dependencies)
2. **Task 1**: Update ActionButton interface (no dependencies)
3. **Task 2**: Add updateUnit() and buildButtonList() methods (depends on #1, #5)
4. **Task 3**: Update constructor (depends on #2)
5. **Task 6**: Update UnitTurnPhaseHandler (depends on #3)
6. **Task 4**: Update CombatLayoutManager (optional, depends on #3)
7. **Testing**: Validate all test cases

---

## Notes & Decisions

### Decision: updateUnit() vs Constructor Overload
- **Choice:** Separate updateUnit() method for state updates
- **Alternative:** Recreate component each time unit changes
- **Rationale:** GeneralGuidelines.md "State Preservation vs Reset Pattern" - preserve hover state across unit updates
- **Tradeoff:** Slightly more complex API, but better UX

### Decision: Optional Unit in Constructor
- **Choice:** Constructor accepts optional unit parameter
- **Alternative:** Always require unit, or always start empty
- **Rationale:** Backward compatible, allows incremental rollout, provides fallback behavior
- **Tradeoff:** More complexity in constructor, but safer migration

### Decision: Cache in UnitTurnPhaseHandler vs CombatLayoutManager
- **Choice:** Cache in UnitTurnPhaseHandler (primary), optional cache in CombatLayoutManager
- **Alternative:** Only cache in layout manager
- **Rationale:** UnitTurnPhaseHandler has direct access to active unit and manages bottom panel content
- **Tradeoff:** Duplication if both cache, but layout manager's cache is optional

### Decision: Button Order
- **Choice:** Move, Attack, Primary, Secondary?, Delay, End Turn
- **Alternative:** Group by type (actions vs meta-actions)
- **Rationale:** User provided this order, logical progression from basic to advanced to meta
- **Tradeoff:** None identified

### Guidelines Compliance
- ✅ Caches stateful component (ActionsMenuContent)
- ✅ Uses State Preservation vs Reset Pattern (updateUnit())
- ✅ Uses color constants from colors.ts
- ✅ No per-frame allocations (cached instance)
- ✅ Uses existing wrapText() for helper text
- ✅ Uses FontAtlasRenderer exclusively
- ✅ Follows existing button rendering patterns

### Performance Considerations
- Button list rebuilt only when updateUnit() called (not every frame)
- Helper text wrapping computed on hover (not every frame)
- Component cached to avoid recreation overhead
- No new allocations during render loop
- Hover detection uses existing getButtonIndexAt() method

---

## Success Criteria

✅ All visual specs met (colors, layout, fonts)
✅ All behavioral specs met (dynamic buttons, hover, wrapping)
✅ All tests pass
✅ Build succeeds with no warnings
✅ 100% compliance with GeneralGuidelines.md
✅ Performance within acceptable limits (no per-frame allocations)
✅ Backward compatible (works with or without unit)
✅ State preserved correctly (hover state across updateUnit())

---

## Recommendation: Implementation in Current Conversation

**Complexity Assessment:**
- **Low**: Single file changes (ActionsMenuContent.ts is primary target)
- **Straightforward**: Clear requirements, no ambiguities
- **Follows Patterns**: Uses existing patterns from helper text feature
- **Small Scope**: ~100 lines of new code across 2-3 files

**Reasons to Implement Now:**
1. Builds directly on helper text feature just completed
2. All patterns already established
3. No complex dependencies or unknowns
4. Testing can be done incrementally
5. Clear success criteria

**Reasons to Defer:**
- None identified - this is a natural extension of current work

**Recommendation:** ✅ **Implement in this conversation**

The feature is well-defined, uses established patterns, and has minimal risk. We can implement, test visually, and iterate if needed without overwhelming context.

---

**End of Implementation Plan**

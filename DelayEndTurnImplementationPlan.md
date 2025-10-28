# Delay and End Turn Action Implementation Plan

## Overview
Implement "Delay" and "End Turn" actions for the unit-turn phase, allowing players to control when units complete their turn and reset their action timers.

## Mechanics

### Delay Action
- **Effect**: Sets unit's actionTimer to exactly 50 (ignores overflow)
- **Purpose**: Wait for another unit without fully resetting timer
- **Example**: Unit at 100 → 50, Unit at 105 → 50
- **Log Message**: "[Unit Name] delays..."
- **Phase Transition**: Returns to action-timer phase

### End Turn Action
- **Effect**: Sets unit's actionTimer to exactly 0 (ignores overflow)
- **Purpose**: End turn immediately, full timer reset
- **Example**: Unit at 100 → 0, Unit at 105 → 0
- **Log Message**: "[Unit Name] ends turn."
- **Phase Transition**: Returns to action-timer phase

### Button Styling
- **Enabled**: White text on black background
- **Disabled**: Grey text on black background (future implementation)
- **Hovered**: Yellow text on black background
- **Position**: Bottom panel "ACTIONS" menu

## Architecture Considerations (CombatHierarchy.md)

### Affected Systems
1. **ActionsMenuContent** (panels) - Add button rendering and click handling
2. **PlayerTurnStrategy** (strategies) - Return TurnAction on button click
3. **UnitTurnPhaseHandler** (phase handlers) - Execute TurnAction, update state
4. **CombatState** (state) - Return new state with updated actionTimer
5. **CombatLogManager** (UI) - Display action messages

### Strategy Pattern Integration
- PlayerTurnStrategy handles button clicks, returns TurnAction
- EnemyTurnStrategy ignores these actions (AI will use different logic)
- UnitTurnPhaseHandler executes actions from both strategies uniformly

## Implementation Tasks

### 1. Update TurnAction Type
**File**: `react-app/src/models/combat/strategies/TurnStrategy.ts`

**Current**:
```typescript
export type TurnAction =
  | { type: 'wait' }
  | { type: 'move'; target: Position }
  | { type: 'attack'; target: Position }
  | { type: 'ability'; abilityId: string; target?: Position }
  | { type: 'end-turn' };
```

**Changes**:
- Rename `'wait'` → `'delay'` (matches user terminology)
- Keep `'end-turn'` as-is
- Remove unused actions for now (move, attack, ability will be added later)

**New**:
```typescript
export type TurnAction =
  | { type: 'delay' }      // Set actionTimer to 50
  | { type: 'end-turn' };  // Set actionTimer to 0
```

### 2. Implement ActionsMenuContent Buttons
**File**: `react-app/src/models/combat/managers/panels/ActionsMenuContent.ts`

**Changes**:
- Add button regions for "Delay" and "End Turn"
- Track hover state for each button
- Render buttons with appropriate colors:
  - Default: White text
  - Hovered: Yellow text
  - Disabled (future): Grey text
- Implement `handleClick()` to detect which button was clicked
- Implement `handleHover()` to track hover state
- Return `PanelClickResult` with `{ type: 'action-selected', actionId: 'delay' | 'end-turn' }`

**Button Layout** (using 7px-04b03 font, 8px line spacing):
```
Title: "ACTIONS" (line 0)
Blank line (line 1)
"Delay" button (line 2)
"End Turn" button (line 3)
```

**Guidelines Compliance**:
- Cache ActionsMenuContent instance in CombatLayoutManager ✅ (already done)
- Use FontAtlasRenderer for text rendering ✅
- Track hover state across frames (requires caching) ✅
- Use panel-relative coordinates for click detection ✅

### 3. Update PlayerTurnStrategy to Handle Button Clicks
**File**: `react-app/src/models/combat/strategies/PlayerTurnStrategy.ts`

**Changes**:
- Add method to handle action menu button clicks
- When button clicked, return appropriate TurnAction from `update()`
- Store pending action in instance variable
- Next frame, `update()` returns the TurnAction

**Flow**:
1. Button clicked in ActionsMenuContent → returns PanelClickResult
2. UnitTurnPhaseHandler receives click event (need to add handler)
3. Delegates to PlayerTurnStrategy
4. PlayerTurnStrategy stores pending action
5. Next `update()` call returns TurnAction

**Note**: This requires adding a way for phase handler to notify strategy of panel clicks. Two options:
- **Option A**: Add `handlePanelClick()` method to TurnStrategy interface
- **Option B**: Phase handler directly sets pending action on strategy

**Recommendation**: Option A (cleaner separation of concerns)

### 4. Update TurnStrategy Interface
**File**: `react-app/src/models/combat/strategies/TurnStrategy.ts`

**Add Method**:
```typescript
interface TurnStrategy {
  // ... existing methods ...

  /**
   * Handle action menu button click
   * Called when player selects an action from the menu
   *
   * @param actionId - The action selected ('delay', 'end-turn', etc.)
   */
  handleActionSelected(actionId: string): void;
}
```

**Implementation in PlayerTurnStrategy**:
- Store actionId in instance variable `pendingAction`
- Next `update()` returns corresponding TurnAction
- Clear pendingAction after returning

**Implementation in EnemyTurnStrategy**:
- No-op (enemies don't use action menu)

### 5. Connect Panel Clicks to Strategy
**File**: `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes**:
- Add `handleInfoPanelClick()` method (if not already present)
- Check if click result is `{ type: 'action-selected' }`
- Delegate to `currentStrategy.handleActionSelected(actionId)`
- Trigger re-render via returning state (no state change, just visual update)

**Note**: Check CombatPhaseHandler interface for info panel click handling signature.

### 6. Implement Action Execution
**File**: `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Location**: In `updatePhase()` where strategy returns TurnAction

**Current Code** (lines 321-332):
```typescript
// If strategy has decided on an action, execute it
if (action) {
  // TODO: Execute the action and transition back to action-timer phase
  // For now, just log the action
  console.log('[UnitTurnPhaseHandler] Action decided:', action);

  // Clean up strategy
  this.currentStrategy.onTurnEnd();

  // TODO: Execute action and return new state
  // For now, just stay in this phase
}
```

**New Implementation**:
```typescript
if (action) {
  // Execute the action
  const newState = this.executeAction(action, state);

  // Clean up strategy
  this.currentStrategy.onTurnEnd();

  // Return new state (transitions back to action-timer phase)
  return newState;
}
```

**Add Method**:
```typescript
private executeAction(action: TurnAction, state: CombatState): CombatState {
  if (!this.activeUnit) {
    console.warn('[UnitTurnPhaseHandler] No active unit for action execution');
    return state;
  }

  let newActionTimer: number;
  let logMessage: string;

  switch (action.type) {
    case 'delay':
      newActionTimer = 50;
      logMessage = `[color=${this.getUnitNameColor()}]${this.activeUnit.name}[/color] delays...`;
      break;

    case 'end-turn':
      newActionTimer = 0;
      logMessage = `[color=${this.getUnitNameColor()}]${this.activeUnit.name}[/color] ends turn.`;
      break;

    default:
      console.warn('[UnitTurnPhaseHandler] Unknown action type:', action);
      return state;
  }

  // Update unit's action timer
  const updatedUnit = {
    ...this.activeUnit,
    actionTimer: newActionTimer
  };

  // Update unit manifest with new unit
  const updatedManifest = state.unitManifest.updateUnit(updatedUnit);

  // Add message to combat log (via pending messages)
  this.pendingLogMessages.push(logMessage);

  // Return new state transitioning back to action-timer phase
  return {
    ...state,
    unitManifest: updatedManifest,
    phase: 'action-timer' as const
  };
}

private getUnitNameColor(): string {
  if (!this.activeUnit) return '#ffffff';
  return this.activeUnit.isPlayerControlled
    ? CombatConstants.UNIT_TURN.PLAYER_NAME_COLOR
    : CombatConstants.UNIT_TURN.ENEMY_NAME_COLOR;
}
```

**Guidelines Compliance**:
- Immutable state updates with spread operator ✅
- Returns new CombatState object ✅
- Uses CombatConstants for colors ✅

**Question**: Does `CombatUnitManifest` have an `updateUnit()` method?
- Need to check if we need to implement this
- Alternative: Remove unit, re-add with updated timer (if no update method exists)

### 7. Update CombatUnitManifest (if needed)
**File**: `react-app/src/models/combat/CombatUnitManifest.ts`

**Check**: Does `updateUnit()` method exist?

**If NO, Add Method**:
```typescript
/**
 * Update a unit's properties in the manifest
 * Preserves position and ID, updates unit reference
 */
updateUnit(updatedUnit: CombatUnit): CombatUnitManifest {
  // Find unit's ID using WeakMap
  const unitId = this.unitToId.get(updatedUnit);

  if (!unitId) {
    console.warn('[CombatUnitManifest] Cannot update unit: not found in manifest');
    return this;
  }

  // Get current placement
  const placement = this.units.get(unitId);
  if (!placement) {
    console.warn('[CombatUnitManifest] Unit ID exists but placement not found');
    return this;
  }

  // Create new placement with updated unit
  const newPlacement = {
    ...placement,
    unit: updatedUnit
  };

  // Create new manifest with updated placement
  const newUnits = new Map(this.units);
  newUnits.set(unitId, newPlacement);

  const newManifest = new CombatUnitManifest();
  newManifest.units = newUnits;
  newManifest.unitToId = new WeakMap(this.unitToId);
  newManifest.unitToId.set(updatedUnit, unitId); // Update WeakMap with new unit reference

  return newManifest;
}
```

**Alternative Approach** (if manifest is immutable and doesn't expose internals):
- Get unit position
- Remove old unit
- Add updated unit at same position
- This preserves immutability but is less efficient

**Guidelines Compliance**:
- Uses WeakMap for object-to-ID mapping ✅
- Returns new manifest instance (immutability) ✅

### 8. Handle Info Panel Clicks in CombatView
**File**: `react-app/src/components/combat/CombatView.tsx`

**Check**: Is there existing info panel click handling?

**If YES**: Ensure it forwards to phase handler's `handleInfoPanelClick()`

**If NO, Add Handler**:
- Listen for clicks on bottom panel region
- Convert to panel-relative coordinates
- Forward to `InfoPanelManager.handleClick()`
- Forward result to phase handler if `type === 'action-selected'`

**Note**: Check existing event handling patterns in CombatView to match style.

### 9. Testing Checklist

**Manual Testing**:
- [ ] Delay button visible in unit-turn phase
- [ ] End Turn button visible in unit-turn phase
- [ ] Hover over Delay button → text turns yellow
- [ ] Hover over End Turn button → text turns yellow
- [ ] Click Delay button → unit's actionTimer becomes 50
- [ ] Click Delay button → "[Unit] delays..." appears in combat log
- [ ] Click Delay button → returns to action-timer phase
- [ ] Click End Turn button → unit's actionTimer becomes 0
- [ ] Click End Turn button → "[Unit] ends turn." appears in combat log
- [ ] Click End Turn button → returns to action-timer phase
- [ ] Unit with actionTimer > 100 uses Delay → becomes exactly 50
- [ ] Unit with actionTimer > 100 uses End Turn → becomes exactly 0
- [ ] Player unit names in log messages are green
- [ ] Enemy unit names in log messages are red (when enemy AI uses these later)
- [ ] Buttons work for all units (different names, stats, positions)

**Edge Cases**:
- [ ] Last unit standing uses Delay → combat continues
- [ ] Last unit standing uses End Turn → combat continues
- [ ] Multiple rapid clicks don't cause double-actions
- [ ] Clicking outside buttons doesn't trigger actions

## File Change Summary

### New Files
None (all changes to existing files)

### Modified Files
1. `strategies/TurnStrategy.ts` - Update TurnAction type, add handleActionSelected()
2. `strategies/PlayerTurnStrategy.ts` - Implement action menu handling
3. `strategies/EnemyTurnStrategy.ts` - Add no-op handleActionSelected()
4. `managers/panels/ActionsMenuContent.ts` - Implement buttons with hover/click
5. `UnitTurnPhaseHandler.ts` - Execute actions, update state, handle panel clicks
6. `CombatUnitManifest.ts` - Add updateUnit() method (if not exists)
7. `CombatView.tsx` - Connect panel clicks to phase handler (if not already done)

### Documentation Updates
- Update `CombatHierarchy.md` ActionsMenuContent section (no longer stub)
- Update `CombatHierarchy.md` TurnAction types documentation
- Update `CombatHierarchy.md` PlayerTurnStrategy with action handling

## Implementation Order

1. **Update TurnStrategy interface** (TurnAction type + handleActionSelected method)
2. **Implement ActionsMenuContent buttons** (render + hover + click)
3. **Implement PlayerTurnStrategy action handling** (store pending action)
4. **Implement EnemyTurnStrategy stub** (no-op handleActionSelected)
5. **Check/Add CombatUnitManifest.updateUnit()** (if needed)
6. **Implement action execution in UnitTurnPhaseHandler** (executeAction method)
7. **Wire up panel clicks to strategy** (handleInfoPanelClick)
8. **Test thoroughly** (all buttons, all scenarios)
9. **Update documentation** (CombatHierarchy.md)

## Questions Resolved

1. **Delay mechanics**: Set actionTimer to exactly 50 (no overflow) ✅
2. **End Turn mechanics**: Set actionTimer to exactly 0 (no overflow) ✅
3. **Phase transition**: Both actions return to action-timer phase ✅
4. **Button availability**: Always available (disabled state is future work) ✅
5. **Keyboard shortcuts**: Not implemented ✅
6. **Combat log messages**: Yes, show messages for both actions ✅
7. **Button styling**: White (enabled), Yellow (hover), Grey (disabled - future) ✅

## Future Enhancements (Not in This Implementation)

- Button disabled state (visible but grey, not clickable)
- Move action with pathfinding
- Attack action with target selection
- Ability action with ability menu
- Keyboard shortcuts
- Button tooltips explaining what each action does
- Animation/feedback when button is pressed
- Sound effects for actions

---

**End of Plan**

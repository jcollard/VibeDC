# Attack Menu Implementation

**Commit:** `70ed5a0863ca4ed9cc62fec5ffa09f5a41345bf5`
**Date:** 2025-10-29
**Status:** ✅ Complete

## Overview

Implemented a placeholder attack menu panel that displays when the player clicks the "Attack" action during combat. This is the first step in implementing the full attack action system as detailed in `AttackActionOverview.md`.

## What Was Implemented

### 1. AttackMenuContent Panel
**File:** `react-app/src/models/combat/managers/panels/AttackMenuContent.ts`

A new panel component that shows:
- **Title:** `"{UNIT NAME} ATTACK"` (e.g., "GOBLIN ATTACK") in dark red (#8B0000)
- **Placeholder Text:** "Implementation coming soon"
- **Cancel Button:** Returns user to the normal actions menu

Features:
- Implements `PanelContent` interface
- Hover highlighting on Cancel button
- Helper text on hover: "Return to actions menu"
- Proper bounds checking and event handling
- Follows existing panel patterns from `ActionsMenuContent`

### 2. Attack Mode State Management
**File:** `react-app/src/models/combat/strategies/PlayerTurnStrategy.ts`

Added attack selection mode to the player turn strategy:
- Added `'attackSelection'` to `StrategyMode` type
- `enterAttackMode()` - Switches to attack mode, exits move mode if active
- `exitAttackMode()` - Returns to normal mode
- `toggleAttackMode()` - Toggles attack mode on/off
- `handleCancelAttack()` - Handles cancel action from attack menu
- Updated `handleActionSelected()` to handle 'attack' action

Attack mode and move mode are mutually exclusive - activating one cancels the other.

### 3. Phase Handler Integration
**File:** `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

Extended phase handler to support attack mode:
- Updated `getActiveAction()` to return `'attack'` when in attack selection mode
- Added `handleCancelAttack()` to delegate cancel action to strategy

### 4. Panel Switching Logic
**File:** `react-app/src/models/combat/layouts/CombatLayoutManager.ts`

Updated layout manager to switch between panels based on active action:
- Added `cachedAttackMenuContent` instance variable
- Modified `renderBottomInfoPanel()` to check `activeAction` parameter
- When `activeAction === 'attack'`: Shows `AttackMenuContent`
- Otherwise: Shows `ActionsMenuContent` as normal
- Properly caches and reuses panel instances per guidelines

### 5. View Layer Integration
**File:** `react-app/src/components/combat/CombatView.tsx`

Connected the attack mode to the view:
- Retrieves `activeAction` from phase handler before rendering
- Passes `activeAction` to `layoutRenderer.renderLayout()`
- Added handler for `'cancel-attack'` click result
- Eliminates duplicate `handler` and `activeAction` variable declarations

### 6. Type System Updates

**File:** `react-app/src/models/combat/managers/panels/PanelContent.ts`
- Added `{ type: 'cancel-attack' }` to `PanelClickResult` union
- Updated `isPanelClickResult()` type guard

**File:** `react-app/src/models/combat/layouts/CombatLayoutRenderer.ts`
- Added `activeAction?: string | null` to `LayoutRenderContext` interface

**File:** `react-app/src/models/combat/managers/panels/index.ts`
- Exported `AttackMenuContent` and `AttackMenuConfig`

## User Flow

1. **Entering Attack Mode:**
   - Player clicks "Attack" button in actions menu
   - Attack button highlights green (via existing `ACTIVE_COLOR` logic)
   - Bottom panel switches to show `AttackMenuContent`
   - Panel displays unit name + "ATTACK" title

2. **Exiting Attack Mode:**
   - Player clicks "Cancel" button in attack menu
   - Strategy exits attack mode
   - Bottom panel switches back to `ActionsMenuContent`
   - Attack button returns to white (normal state)

## Design Decisions

1. **No Combat Log Message:** Originally included a combat log message when entering attack mode. Removed per user request to keep the UI clean.

2. **Panel Caching:** Created separate `cachedAttackMenuContent` instance rather than reusing `cachedBottomPanelContent` to maintain proper state isolation between different panel types.

3. **Mutual Exclusion:** Attack mode and move mode are mutually exclusive. Entering one automatically exits the other to prevent conflicting states.

4. **Color Consistency:** Used dark red (#8B0000) for attack menu title per `AttackActionOverview.md` specification.

5. **Button Highlighting:** Leveraged existing `activeButtonId` mechanism in `ActionsMenuContent` to highlight the Attack button green when active.

## Files Modified

- `react-app/src/components/combat/CombatView.tsx` (+20 lines)
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts` (+19 lines)
- `react-app/src/models/combat/layouts/CombatLayoutManager.ts` (+40 lines)
- `react-app/src/models/combat/layouts/CombatLayoutRenderer.ts` (+1 line)
- `react-app/src/models/combat/managers/panels/PanelContent.ts` (+2 lines)
- `react-app/src/models/combat/managers/panels/index.ts` (+2 lines)
- `react-app/src/models/combat/strategies/PlayerTurnStrategy.ts` (+54 lines)

## Files Created

- `react-app/src/models/combat/managers/panels/AttackMenuContent.ts` (230 lines)

**Total Changes:** 8 files modified, 1 file created, 369 insertions, 30 deletions

## Compliance Review

✅ **GeneralGuidelines.md Compliance:**
- Properly caches panel instances
- Uses `FontAtlasRenderer.renderText()` exclusively
- Implements discriminated union pattern for click results
- Follows panel-relative coordinate system
- Proper type safety with interfaces
- Runtime type checking where needed
- Follows existing architectural patterns

## Next Steps

This placeholder menu sets up the foundation for the full attack action implementation. Future work will include:
- Weapon selection UI
- Target selection visualization
- Attack range calculation and display
- Damage calculation and application
- Attack animations
- Combat log integration

## Testing Notes

Build successful with no TypeScript errors. The attack menu:
- Displays correctly when Attack is clicked
- Shows unit name in title
- Cancel button works correctly
- Hover states work as expected
- Panel switching is smooth
- No console errors or warnings

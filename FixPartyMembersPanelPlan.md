# Fix Party Members Panel Hover Bug

## Problem Summary

After the recent refactor, hovering over party members in the deployment phase no longer highlights them by changing their name color. The hover detection works (clicking still functions), but the visual feedback is broken.

## Root Cause Analysis

### Issue 1: Phase Handler Creates Separate Instance for Hover Detection

**Location:** [CombatView.tsx:812-846](react-app/src/components/combat/CombatView.tsx#L812-L846) and [DeploymentPhaseHandler.ts:453](react-app/src/models/combat/DeploymentPhaseHandler.ts#L453)

**In the working commit (2d3495e):**
```typescript
// Simple direct flow:
const hoverResult = bottomInfoPanelManager.handleHover(canvasX, canvasY, panelRegion);
// Returns number directly from PartyMembersContent.handleHover()
hoveredPartyMemberRef.current = hoverResult; // Update ref immediately
// Next frame: CombatLayoutManager calls updateHoveredIndex(hoveredPartyMemberRef.current)
```

**In the current broken refactored code:**
```typescript
// Complex flow through phase handler:
const phaseHoverResult = deploymentHandler.handleInfoPanelHover(relativeX, relativeY, ...);
// Phase handler uses a SEPARATE hoverDetectionContent instance (line 453)!
// This separate instance is NOT the same as what CombatLayoutManager caches
hoveredPartyMemberRef.current = data.memberIndex;
// Next frame: CombatLayoutManager updates its cached instance, but hover detection used a different instance!
```

**THE REAL PROBLEM:** The refactor introduced `handleInfoPanelHover()` which creates its own `hoverDetectionContent` instance for hover detection. This instance is SEPARATE from the instance that `CombatLayoutManager` caches and renders. Even though `hoveredPartyMemberRef.current` is updated correctly, the cached rendering instance never gets its hover state updated because hover detection happened on a different instance entirely!

### Issue 2: Multiple PartyMembersContent Instances (Violation of GeneralGuidelines.md)

**Locations where instances are created:**

1. **[DeploymentPhaseHandler.ts:508](react-app/src/models/combat/DeploymentPhaseHandler.ts#L508)** - `getInfoPanelContent()`
   - Creates a NEW instance every time it's called
   - This is called by `CombatLayoutManager` to get content for rendering
   - ❌ **Violates caching principle**

2. **[DeploymentPhaseHandler.ts:453](react-app/src/models/combat/DeploymentPhaseHandler.ts#L453)** - `handleInfoPanelHover()`
   - Creates a separate cached instance (`this.hoverDetectionContent`)
   - Used only for hover detection geometry calculations
   - ❌ **Duplicate instance**

3. **[CombatLayoutManager.ts:480](react-app/src/models/combat/layouts/CombatLayoutManager.ts#L480)** - `updateBottomInfoPanel()`
   - Caches the content from `getInfoPanelContent()` as `this.cachedBottomPanelContent`
   - Updates hover state via `updateHoveredIndex()` at [line 467](react-app/src/models/combat/layouts/CombatLayoutManager.ts#L467)
   - ✅ **This is the correct place for caching**

**Problem:** The `DeploymentPhaseHandler.getInfoPanelContent()` creates a fresh instance every frame, which gets cached by `CombatLayoutManager`. But the hover detection in `DeploymentPhaseHandler.handleInfoPanelHover()` uses a different instance entirely!

## Solution Plan

### Primary Fix: Use Single Cached Instance for Both Rendering AND Hover Detection

**Root Cause:** The phase handler creates a separate `hoverDetectionContent` instance (line 453) that is NEVER rendered. Meanwhile, `CombatLayoutManager` caches a completely different instance for rendering. Hover detection happens on one instance, rendering happens on another!

**Solution:** Make the phase handler cache and return THE SAME instance for both hover detection and rendering.

**Changes needed:**

1. **DeploymentPhaseHandler.ts:**
   - Rename `hoverDetectionContent` to `cachedPartyMembersContent` (clearer purpose)
   - Update `getInfoPanelContent()` to create/return `cachedPartyMembersContent` (not a new instance every time!)
   - In `handleInfoPanelHover()`, continue using `cachedPartyMembersContent` for hover detection
   - **KEY CHANGE:** In `handleInfoPanelHover()`, call `cachedPartyMembersContent.updateHoveredIndex()` to update the instance's internal hover state IMMEDIATELY when hover changes

2. **CombatLayoutManager.ts:**
   - **KEEP** lines 467-468 that call `updateHoveredIndex()` - this is still correct as a fallback
   - However, the hover state will already be updated by the phase handler, so this becomes redundant but harmless
   - The key is that it's now updating the SAME instance that was used for hover detection

### Detailed Hover State Flow (After Fix)

**Fixed hover state flow:**

1. Mouse moves → `CombatView.handleCanvasMouseMove()` is called
2. `DeploymentPhaseHandler.handleInfoPanelHover()` is called with panel-relative coordinates
3. Phase handler calls `this.cachedPartyMembersContent.handleHover()` to detect if hovering
4. **CRITICAL FIX:** Phase handler immediately calls `this.cachedPartyMembersContent.updateHoveredIndex(hoveredIndex)` to update the instance
5. Phase handler returns the hovered member index to `CombatView`
6. `CombatView` updates `hoveredPartyMemberRef.current`
7. Next animation frame (~16ms later):
   - `CombatLayoutManager` calls phase handler's `getInfoPanelContent()`
   - Phase handler returns `cachedPartyMembersContent` (THE SAME INSTANCE that was updated in step 4!)
   - `CombatLayoutManager` may call `updateHoveredIndex()` again (harmless, already updated)
   - Panel renders with correct hover state

**Why this works:**
- **ONE** cached instance is used for BOTH hover detection AND rendering
- Hover state is updated on the instance immediately when mouse moves
- The instance persists across frames with its updated hover state
- Follows GeneralGuidelines.md (lines 103-108) for caching components with hover state

## Implementation Steps

1. **Refactor DeploymentPhaseHandler.ts (Primary Fix)**
   - Rename `hoverDetectionContent` field to `cachedPartyMembersContent` for clarity
   - Update `getInfoPanelContent()` to:
     - Create `cachedPartyMembersContent` if it doesn't exist
     - Update party units on existing instance if needed
     - Return the cached instance (DON'T create new instances!)
   - Update `handleInfoPanelHover()` to:
     - Use `cachedPartyMembersContent` for hover detection (same as before)
     - **CRITICAL:** After detecting hover, call `cachedPartyMembersContent.updateHoveredIndex(hoveredIndex)` immediately
     - This ensures the instance that will be rendered has the correct hover state

2. **CombatLayoutManager.ts**
   - **NO CHANGES REQUIRED** - Keep existing logic at lines 467-468
   - These lines become redundant but harmless (instance is already updated)
   - OR optionally remove them if we trust the phase handler to always update hover state

3. **Test the fix**
   - Verify hover highlights party member names with correct color (#ccaa00)
   - Verify hover changes are immediate (no lag)
   - Verify clicking still deploys units correctly
   - Verify only ONE `PartyMembersContent` instance exists during deployment phase
   - Verify Enter Combat button still works correctly

## Expected Outcome

- ✅ Hovering over party members highlights their names in dark yellow (#ccaa00)
- ✅ Only ONE `PartyMembersContent` instance exists during deployment phase
- ✅ Follows GeneralGuidelines.md caching principles
- ✅ Clicking to deploy units continues to work correctly

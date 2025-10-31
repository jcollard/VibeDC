# Defeat Screen Feature - Phased Implementation Plan

**Version:** 1.1
**Created:** 2025-10-31
**Updated:** 2025-10-31 (Added GeneralGuidelines.md compliance notes)
**Related:** [DefeatScreenFeatureOverview.md](./DefeatScreenFeatureOverview.md), [CombatHierarchy.md](../../CombatHierarchy.md), [GeneralGuidelines.md](../../GeneralGuidelines.md)

## Purpose

This document provides a phased, step-by-step implementation plan for the Defeat Screen feature, organized into 4 logical phases that can be tested incrementally. Each phase builds on the previous one and follows all patterns from GeneralGuidelines.md.

---

## Quick Index

- [Implementation Philosophy](#implementation-philosophy)
- [Phase Overview](#phase-overview)
- [Phase 1: Defeat Condition System](#phase-1-defeat-condition-system)
- [Phase 2: Initial State Serialization](#phase-2-initial-state-serialization)
- [Phase 3: Defeat Modal Rendering](#phase-3-defeat-modal-rendering)
- [Phase 4: Input Handling & Try Again](#phase-4-input-handling--try-again)
- [Testing Strategy](#testing-strategy)
- [Guidelines Compliance Checklist](#guidelines-compliance-checklist)
- [Performance Considerations](#performance-considerations)
- [Rollback Plan](#rollback-plan)

---

## Implementation Philosophy

### Incremental Development
- Each phase is independently testable
- Foundation built first (defeat detection), UI last
- State management before rendering (data before presentation)
- No "big bang" integration - continuous testing

### Guidelines Compliance
- **Rendering Rules**: Use SpriteRenderer and FontAtlasRenderer exclusively
- **State Management**: Immutable state updates, serialize/deserialize correctly
- **Performance**: No per-frame allocations, cache where appropriate
- **Type Safety**: Use TypeScript interfaces, avoid `any`
- **Error Handling**: Graceful degradation for missing data

### Testing Focus
- Manual testing after each phase
- Browser console for state inspection
- Victory/defeat precedence validation
- Edge cases tested continuously

---

## Phase Overview

| Phase | Description | Files | Complexity | Time Est. | Actual Time | Status | Guide |
|-------|-------------|-------|------------|-----------|-------------|--------|-------|
| 1 | Defeat Condition System | 4 | Low | 1.5 hours | - | 📋 TODO | [Below](#phase-1-defeat-condition-system) |
| 2 | Initial State Serialization | 3 | Medium | 2 hours | - | 📋 TODO | [Below](#phase-2-initial-state-serialization) |
| 3 | Defeat Modal Rendering | 4 | Medium-High | 3 hours | - | 📋 TODO | [Below](#phase-3-defeat-modal-rendering) |
| 4 | Input Handling & Try Again | 4 | Medium | 2.5 hours | - | 📋 TODO | [Below](#phase-4-input-handling--try-again) |
| **Total** | - | **15 files** | - | **~9 hours** | - | 📋 TODO | - |

---

## Phase 1: Defeat Condition System

### Goal
Create the `CombatDefeatCondition` interface and default implementation (`AllPlayersKnockedOutCondition`), add 'defeat' to `CombatPhase` type, and integrate defeat checking into `UnitTurnPhaseHandler`.

### Rationale
- Establishes the foundation for defeat detection
- Reuses existing KO feature (`isKnockedOut` getter)
- Simple, testable logic before UI complexity
- No visual changes yet (easier to validate logic)

### Files to Create
1. `models/combat/CombatDefeatCondition.ts`

### Files to Modify
1. `models/combat/CombatState.ts`
2. `models/combat/phases/UnitTurnPhaseHandler.ts`
3. `models/combat/index.ts` (exports)

### Implementation Steps

#### Step 1.1: Create CombatDefeatCondition Interface and Implementations
**File:** `models/combat/CombatDefeatCondition.ts` (NEW FILE)

**Code to Add:**
```typescript
import type { CombatState } from "./CombatState";

/**
 * Defines a condition that determines if combat has been lost.
 * Allows for custom defeat scenarios beyond the default "all players KO'd".
 */
export interface CombatDefeatCondition {
  /**
   * Evaluates whether the defeat condition has been met.
   * @param state Current combat state
   * @returns true if combat is lost, false otherwise
   */
  evaluate(state: CombatState): boolean;

  /**
   * Human-readable description of this defeat condition
   */
  description: string;

  /**
   * Serializes the condition to JSON for save/load
   */
  toJSON(): CombatDefeatConditionJSON;
}

export interface CombatDefeatConditionJSON {
  type: string;
  description: string;
  [key: string]: unknown;
}

/**
 * Default defeat condition: All player-controlled units are knocked out.
 */
export class AllPlayersKnockedOutCondition implements CombatDefeatCondition {
  description = "All player units are knocked out";

  evaluate(state: CombatState): boolean {
    const allUnits = state.unitManifest.getAllUnits();
    const playerUnits = allUnits.filter(p => !p.unit.isEnemy);

    // If no player units exist, combat is not lost (edge case)
    if (playerUnits.length === 0) {
      return false;
    }

    // Defeat if ALL player units are KO'd
    return playerUnits.every(p => p.unit.isKnockedOut);
  }

  toJSON(): CombatDefeatConditionJSON {
    return {
      type: "AllPlayersKnockedOut",
      description: this.description,
    };
  }

  static fromJSON(_json: CombatDefeatConditionJSON): AllPlayersKnockedOutCondition {
    return new AllPlayersKnockedOutCondition();
  }
}

/**
 * Factory for creating CombatDefeatCondition instances from JSON.
 */
export class CombatDefeatConditionFactory {
  static fromJSON(json: CombatDefeatConditionJSON): CombatDefeatCondition {
    switch (json.type) {
      case "AllPlayersKnockedOut":
        return AllPlayersKnockedOutCondition.fromJSON(json);
      default:
        throw new Error(`Unknown defeat condition type: ${json.type}`);
    }
  }
}
```

**Rationale:**
- Similar structure to `CombatPredicate.ts` for consistency
- Default implementation uses `isKnockedOut` getter from KO feature
- Factory pattern for deserialization extensibility
- Handles edge case of no player units gracefully

#### Step 1.2: Add 'defeat' to CombatPhase Type
**File:** `models/combat/CombatState.ts`

**Location:** Find the `CombatPhase` type definition (likely near top of file)

**Find This Code:**
```typescript
export type CombatPhase = 'deployment' | 'enemy-deployment' | 'action-timer' | 'unit-turn' | 'victory';
```

**Replace With:**
```typescript
export type CombatPhase = 'deployment' | 'enemy-deployment' | 'action-timer' | 'unit-turn' | 'victory' | 'defeat';
```

**Rationale:**
- Simple type extension
- Enables TypeScript type checking for defeat phase
- Required for phase handler selection

**TypeScript Pattern Note:**
We're extending the `CombatPhase` type union with `'defeat'`. This follows the same pattern as other phases.

Alternative pattern (per GeneralGuidelines.md) if we needed enum-like behavior:
```typescript
const CombatPhase = {
  DEPLOYMENT: 'deployment',
  DEFEAT: 'defeat',
  // ...
} as const;
type CombatPhase = (typeof CombatPhase)[keyof typeof CombatPhase];
```
However, our simple string union is cleaner for this use case.

#### Step 1.3: Add Defeat Condition Checking to UnitTurnPhaseHandler
**File:** `models/combat/phases/UnitTurnPhaseHandler.ts`

**Location:** At the END of the `update()` method, after all turn actions complete, before returning to action-timer phase

**Import at Top of File:**
```typescript
import { AllPlayersKnockedOutCondition } from "../CombatDefeatCondition";
```

**Add Before Transition to Action-Timer Phase:**
```typescript
// Check defeat condition at end of turn
// (Victory condition should be checked first - victory takes precedence)
const defeatCondition = new AllPlayersKnockedOutCondition();

if (defeatCondition.evaluate(newState)) {
  // Add combat log message
  newState.combatLog.addEntry({
    message: "The enemies have triumphed over you!",
    color: "#ff0000",  // Red
  });

  // Transition to defeat phase
  return { ...newState, phase: 'defeat' };
}

// Otherwise, transition to action-timer phase as normal
```

**Important:** Ensure this check happens AFTER victory condition checks (if they exist in this handler). Victory should take precedence over defeat.

**Rationale:**
- Defeat checked at end of each unit turn (not mid-turn)
- Combat log message added immediately when defeat detected
- Simple phase transition (just change phase property)
- New state returned with defeat phase

#### Step 1.4: Export CombatDefeatCondition Types
**File:** `models/combat/index.ts`

**Add Exports:**
```typescript
export type { CombatDefeatCondition, CombatDefeatConditionJSON } from "./CombatDefeatCondition";
export { AllPlayersKnockedOutCondition, CombatDefeatConditionFactory } from "./CombatDefeatCondition";
```

**Rationale:**
- Makes types accessible to other modules
- Follows existing export pattern in index.ts

### Testing Phase 1

**Build Test:**
```bash
npm run build
```
**Expected:** No TypeScript errors

**Manual Test (Browser Console):**
```javascript
// Test 1: Normal combat state (no defeat)
const units = window.combatState.unitManifest.getAllUnits();
const playerUnits = units.filter(p => !p.unit.isEnemy);
console.log(`Player units: ${playerUnits.length}`);
console.log(`KO'd players: ${playerUnits.filter(p => p.unit.isKnockedOut).length}`);
// Expected: Some players alive, phase is NOT 'defeat'

// Test 2: KO all player units
playerUnits.forEach(p => {
  p.unit.wounds = p.unit.maxHealth;
});

// Complete the current unit's turn (wait for turn to end naturally or trigger phase transition)
// Expected: Combat log shows "The enemies have triumphed over you!"
// Expected: combatState.phase === 'defeat'

// Test 3: Check defeat condition directly
const { AllPlayersKnockedOutCondition } = await import('./models/combat/CombatDefeatCondition');
const condition = new AllPlayersKnockedOutCondition();
console.log(condition.evaluate(window.combatState));  // Should be true
```

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] 'defeat' is a valid CombatPhase value
- [ ] `AllPlayersKnockedOutCondition` evaluates correctly
- [ ] Defeat condition triggers when all players KO'd at end of unit turn
- [ ] Combat log message appears when defeat detected
- [ ] State transitions to 'defeat' phase
- [ ] No crash or errors when defeat condition met
- [ ] Victory condition takes precedence over defeat (if both met)

**Edge Cases:**
- All enemies KO'd same turn as last player (victory should trigger, not defeat)
- No player units in combat (should not trigger defeat)
- Defeat triggered mid-animation (should complete animation first)

**Rollback:** Delete `CombatDefeatCondition.ts`, revert changes to `CombatState.ts`, `UnitTurnPhaseHandler.ts`, and `index.ts`.

---

## Phase 2: Initial State Serialization

### Goal
Add `initialStateSnapshot` field to `CombatState`, serialize combat state at the start of the first action-timer phase, and ensure proper serialization/deserialization.

### Rationale
- Required for "Try Again" functionality
- Must happen before defeat can occur
- Tests serialization system thoroughly
- Independent of UI (can be tested in console)

### Files to Modify
1. `models/combat/CombatState.ts`
2. `models/combat/phases/DeploymentPhaseHandler.ts` OR wherever transition from deployment to action-timer happens
3. `models/combat/CombatSaveData.ts` (if separate serialization module exists)

### Implementation Steps

#### Step 2.1: Add initialStateSnapshot Field to CombatState
**File:** `models/combat/CombatState.ts`

**Location:** In the `CombatState` interface/class definition, add new field

**Code to Add:**
```typescript
/**
 * Snapshot of the initial combat state (after deployment, before first action-timer phase).
 * Used for "Try Again" functionality on the defeat screen.
 * Null if combat was loaded from a save or if not yet initialized.
 */
initialStateSnapshot: CombatStateJSON | null;
```

**In Constructor/Factory (if applicable):**
```typescript
initialStateSnapshot: null,  // Will be set at start of combat
```

**Rationale:**
- Captures full combat state for retry functionality
- Null by default (set during transition to action-timer)
- Uses existing `CombatStateJSON` type from serialization system

#### Step 2.2: Add Serialization Logic in Deployment-to-ActionTimer Transition
**File:** `models/combat/phases/DeploymentPhaseHandler.ts` (or wherever phase transition occurs)

**Location:** Where deployment phase transitions to action-timer phase (likely in `update()` method)

**Import at Top:**
```typescript
import { serializeCombatState } from "../CombatSaveData";  // Adjust path as needed
```

**Find This Code (approximate):**
```typescript
// Transition from deployment to action-timer
return {
  ...state,
  phase: 'action-timer',
};
```

**Replace With:**
```typescript
// Serialize initial state for "Try Again" functionality
// Only do this if initialStateSnapshot is not already set (first time only)
let initialSnapshot = state.initialStateSnapshot;

if (initialSnapshot === null) {
  try {
    // Create snapshot before transitioning to action-timer
    initialSnapshot = serializeCombatState(state);
  } catch (error) {
    console.error("Failed to serialize initial combat state:", error);
    // Continue without snapshot (Try Again will be disabled)
    initialSnapshot = null;
  }
}

// Transition to action-timer with initial snapshot
return {
  ...state,
  initialStateSnapshot: initialSnapshot,
  phase: 'action-timer',
};
```

**Rationale:**
- Captures state after player deployment is finalized
- Only serializes once (checks if null first)
- Graceful error handling (continues without snapshot)
- Snapshot includes all units, positions, action timers, etc.

#### Step 2.3: Update Serialization/Deserialization (if needed)
**File:** `models/combat/CombatSaveData.ts` (or wherever serialization is defined)

**Location:** Ensure `CombatStateJSON` includes `initialStateSnapshot` field

**If `CombatStateJSON` Type Exists, Add:**
```typescript
export interface CombatStateJSON {
  // ... existing fields ...
  initialStateSnapshot?: CombatStateJSON | null;  // Optional for backward compatibility
}
```

**In `serializeCombatState()` Function:**
```typescript
export function serializeCombatState(state: CombatState): CombatStateJSON {
  return {
    // ... existing serialization ...
    initialStateSnapshot: state.initialStateSnapshot,  // Include snapshot in serialization
  };
}
```

**In `deserializeCombatState()` Function:**
```typescript
export function deserializeCombatState(json: CombatStateJSON): CombatState {
  return {
    // ... existing deserialization ...
    initialStateSnapshot: json.initialStateSnapshot ?? null,  // Restore snapshot if present
  };
}
```

**Rationale:**
- Ensures snapshot survives save/load cycles
- Backward compatible (optional field)
- Recursive serialization (snapshot contains snapshot field, but it's always null in snapshot)

#### Step 2.4: Handle Recursive Serialization Edge Case
**Important:** When serializing the initial snapshot, ensure the snapshot itself does NOT have an `initialStateSnapshot` (avoid infinite recursion).

**In Serialization Logic (Step 2.2):**
```typescript
// Create snapshot before transitioning to action-timer
// Ensure the snapshot itself has no initialStateSnapshot (avoid recursion)
const stateForSnapshot = {
  ...state,
  initialStateSnapshot: null,  // Don't include snapshot in snapshot
};
initialSnapshot = serializeCombatState(stateForSnapshot);
```

**Rationale:**
- Prevents infinite recursion during serialization
- Snapshot captures current state, not previous snapshots
- Keeps serialized data size reasonable

### Testing Phase 2

**Build Test:**
```bash
npm run build
```
**Expected:** No TypeScript errors

**Manual Test (Browser Console):**
```javascript
// Test 1: Check initial state before action-timer
console.log(window.combatState.initialStateSnapshot);
// Expected: null (during deployment)

// Test 2: Complete deployment and enter action-timer phase
// (Let combat progress naturally OR manually trigger transition)

// Test 3: Check initial state after action-timer starts
console.log(window.combatState.initialStateSnapshot);
// Expected: CombatStateJSON object with all unit data

// Test 4: Verify snapshot contents
const snapshot = window.combatState.initialStateSnapshot;
console.log(snapshot.units.length);  // Should match current units
console.log(snapshot.phase);  // Should be 'deployment' or 'action-timer' (depending on when captured)

// Test 5: Test deserialization
const { deserializeCombatState } = await import('./models/combat/CombatSaveData');
const restored = deserializeCombatState(snapshot);
console.log(restored.unitManifest.getAllUnits().length);  // Should match original

// Test 6: Verify no infinite recursion
console.log(snapshot.initialStateSnapshot);  // Should be null (not nested)
```

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] `initialStateSnapshot` field exists on `CombatState`
- [ ] Snapshot is null during deployment phase
- [ ] Snapshot is populated after first transition to action-timer
- [ ] Snapshot contains full combat state (units, positions, timers)
- [ ] Snapshot does NOT contain nested `initialStateSnapshot` (no recursion)
- [ ] Deserialization successfully recreates combat state
- [ ] Error during serialization does not crash combat (graceful degradation)

**Edge Cases:**
- Serialization fails (catch error, continue with null snapshot)
- Combat loaded from save (snapshot already exists, don't overwrite)
- Very large combat state (ensure serialization performance is acceptable)

**Performance Check:**
```javascript
// Measure serialization time
const start = performance.now();
const snapshot = serializeCombatState(window.combatState);
const elapsed = performance.now() - start;
console.log(`Serialization took ${elapsed.toFixed(2)}ms`);
// Expected: <50ms for typical combat (acceptable one-time cost)
```

**Rollback:** Revert changes to `CombatState.ts`, `DeploymentPhaseHandler.ts`, and `CombatSaveData.ts`.

---

## Phase 3: Defeat Modal Rendering

### Goal
Create `DefeatPhaseHandler` and `DefeatModalRenderer`, add defeat screen constants, render full-screen overlay and centered modal with title and buttons (no interactivity yet).

### Rationale
- Most complex phase (UI rendering)
- Can be visually tested without full functionality
- Establishes UI layout before input handling
- Uses existing panel rendering patterns

### GeneralGuidelines.md Compliance Notes for Phase 3

**Rendering Rules:**
- ✅ Use `FontAtlasRenderer` for all text (title, buttons, helper text)
- ✅ Use `SpriteRenderer` for panel backgrounds (if implementing nine-slice)
- ✅ Round all coordinates with `Math.floor()` for pixel-perfect rendering
- ✅ Never use `ctx.fillText()` or `ctx.strokeText()`
- ✅ Ensure `ctx.imageSmoothingEnabled = false` (should be set globally)

**Performance:**
- ✅ Cache renderer instance (not recreated every frame)
- ✅ No per-frame allocations in render methods
- ✅ Button bounds calculation acceptable (~0.1ms, not a hot path)

### Files to Create
1. `models/combat/phases/DefeatPhaseHandler.ts`
2. `models/combat/rendering/DefeatModalRenderer.ts`

### Files to Modify
1. `models/combat/CombatConstants.ts`
2. `models/combat/CombatView.tsx` (or wherever phase handlers are selected)

### Implementation Steps

#### Step 3.1: Add DEFEAT_SCREEN Constants
**File:** `models/combat/CombatConstants.ts`

**Location:** After existing sections (e.g., after `KNOCKED_OUT` section)

**Code to Add:**
```typescript
/**
 * Constants for defeat screen modal and overlay
 */
DEFEAT_SCREEN: {
  // Overlay
  OVERLAY_OPACITY: 0.5 as const,
  OVERLAY_COLOR: '#000000' as const,

  // Modal dimensions
  MODAL_WIDTH: 200 as const,
  MODAL_PADDING: 16 as const,
  BUTTON_SPACING: 8 as const,
  HELPER_SPACING: 4 as const,

  // Title
  TITLE_TEXT: 'Defeat' as const,
  TITLE_FONT_ID: 'dungeonslant' as const,
  TITLE_SIZE: 12 as const,
  TITLE_COLOR: '#ff0000' as const,  // Red

  // Buttons
  BUTTON_FONT_ID: '7px-04b03' as const,
  BUTTON_SIZE: 7 as const,
  BUTTON_COLOR_NORMAL: '#ffffff' as const,
  BUTTON_COLOR_HOVER: '#ffff00' as const,  // Yellow

  // Helper text
  HELPER_FONT_ID: '7px-04b03' as const,
  HELPER_SIZE: 5 as const,
  HELPER_COLOR: '#aaaaaa' as const,  // Light grey

  // Text content
  TRY_AGAIN_TEXT: 'Try Again' as const,
  TRY_AGAIN_HELPER: 'Restart this encounter to try again' as const,
  SKIP_TEXT: 'Skip Encounter' as const,
  SKIP_HELPER: 'Skips this encounter and all rewards' as const,

  // Combat log
  DEFEAT_MESSAGE: 'The enemies have triumphed over you!' as const,
} as const,
```

**Rationale:**
- Centralizes all defeat screen configuration
- Uses `as const` for literal types and immutability
- Reuses existing font IDs (dungeonslant for title, 7px-04b03 for UI)
- Red title for danger/failure emphasis
- Yellow hover state matches existing UI (ActionsMenu)

#### Step 3.2: Create DefeatModalRenderer
**File:** `models/combat/rendering/DefeatModalRenderer.ts` (NEW FILE)

**Code to Add:**
```typescript
import { CombatConstants } from "../CombatConstants";
import { FontAtlasRenderer } from "../../../utils/FontAtlasRenderer";
import { FontRegistry } from "../../../utils/FontRegistry";
import type { CombatState } from "../CombatState";

/**
 * Renders the defeat screen modal: overlay, panel, title, buttons, and helper text.
 */
export class DefeatModalRenderer {
  /**
   * Renders the complete defeat modal on the given context.
   * @param ctx Canvas rendering context
   * @param state Current combat state
   * @param hoveredButton Which button is currently hovered (or null)
   * @param fonts Font atlas images
   * @param panelBounds Bounds of the map panel for centering
   */
  render(
    ctx: CanvasRenderingContext2D,
    state: CombatState,
    hoveredButton: 'try-again' | 'skip' | null,
    fonts: Map<string, HTMLImageElement>,
    panelBounds: { width: number; height: number }
  ): void {
    // 1. Render full-screen overlay
    this.renderOverlay(ctx, panelBounds);

    // 2. Calculate modal position (center of panel)
    const modalX = Math.floor((panelBounds.width - CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH) / 2);
    const modalY = Math.floor(panelBounds.height / 3);  // Upper third for visibility

    // 3. Render modal panel background (using existing nine-slice panel rendering)
    this.renderPanelBackground(ctx, modalX, modalY);

    // 4. Render title
    this.renderTitle(ctx, modalX, modalY, fonts);

    // 5. Render buttons
    const buttonY = this.renderButtons(ctx, modalX, modalY, hoveredButton, fonts);

    // 6. Render helper text
    this.renderHelperText(ctx, modalX, buttonY, fonts);
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, panelBounds: { width: number; height: number }): void {
    ctx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.DEFEAT_SCREEN.OVERLAY_OPACITY})`;
    ctx.fillRect(0, 0, panelBounds.width, panelBounds.height);
  }

  private renderPanelBackground(ctx: CanvasRenderingContext2D, modalX: number, modalY: number): void {
    // TODO: Use existing nine-slice panel rendering system
    // Should use SpriteRenderer.renderSpriteById() for panel sprites (per GeneralGuidelines.md)
    // Example: SpriteRenderer.renderSpriteById(ctx, 'ui-simple-4', spriteImages, 12, x, y, width, height)
    // For now, simple rectangle background
    const modalWidth = CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH;
    const modalHeight = 150;  // Approximate height, will adjust based on content

    ctx.fillStyle = '#000000';
    ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
  }

  private renderTitle(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalY: number,
    fonts: Map<string, HTMLImageElement>
  ): void {
    const titleFont = FontRegistry.getFont(CombatConstants.DEFEAT_SCREEN.TITLE_FONT_ID);
    const titleFontImage = fonts.get(CombatConstants.DEFEAT_SCREEN.TITLE_FONT_ID);

    if (!titleFont || !titleFontImage) {
      console.warn("Defeat title font not loaded");
      return;
    }

    const titleText = CombatConstants.DEFEAT_SCREEN.TITLE_TEXT;
    const titleWidth = FontAtlasRenderer.measureTextWidth(titleText, titleFont);

    // Center horizontally within modal
    const titleX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - titleWidth) / 2);
    const titleY = modalY + CombatConstants.DEFEAT_SCREEN.MODAL_PADDING;

    FontAtlasRenderer.renderTextWithShadow(
      ctx,
      titleText,
      titleX,
      titleY,
      titleFontImage,
      titleFont,
      CombatConstants.DEFEAT_SCREEN.TITLE_COLOR
    );
  }

  private renderButtons(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalY: number,
    hoveredButton: 'try-again' | 'skip' | null,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const buttonFont = FontRegistry.getFont(CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID);
    const buttonFontImage = fonts.get(CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID);

    if (!buttonFont || !buttonFontImage) {
      console.warn("Defeat button font not loaded");
      return modalY + 80;  // Return approximate Y position
    }

    // Starting Y position for buttons (below title)
    let currentY = modalY + CombatConstants.DEFEAT_SCREEN.MODAL_PADDING * 3;

    // Button 1: Try Again
    const tryAgainColor = hoveredButton === 'try-again'
      ? CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_HOVER
      : CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_NORMAL;

    const tryAgainText = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_TEXT;
    const tryAgainWidth = FontAtlasRenderer.measureTextWidth(tryAgainText, buttonFont);
    const tryAgainX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - tryAgainWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      tryAgainText,
      tryAgainX,
      currentY,
      buttonFontImage,
      buttonFont,
      tryAgainColor
    );

    currentY += buttonFont.glyphHeight + CombatConstants.DEFEAT_SCREEN.BUTTON_SPACING;

    // Button 2: Skip Encounter
    const skipColor = hoveredButton === 'skip'
      ? CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_HOVER
      : CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_NORMAL;

    const skipText = CombatConstants.DEFEAT_SCREEN.SKIP_TEXT;
    const skipWidth = FontAtlasRenderer.measureTextWidth(skipText, buttonFont);
    const skipX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - skipWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      skipText,
      skipX,
      currentY,
      buttonFontImage,
      buttonFont,
      skipColor
    );

    currentY += buttonFont.glyphHeight + CombatConstants.DEFEAT_SCREEN.HELPER_SPACING;

    return currentY;  // Return Y position for helper text
  }

  private renderHelperText(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    startY: number,
    fonts: Map<string, HTMLImageElement>
  ): void {
    const helperFont = FontRegistry.getFont(CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID);
    const helperFontImage = fonts.get(CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID);

    if (!helperFont || !helperFontImage) {
      console.warn("Defeat helper font not loaded");
      return;
    }

    let currentY = startY;

    // Helper 1: Try Again
    const tryAgainHelper = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_HELPER;
    const tryAgainHelperWidth = FontAtlasRenderer.measureTextWidth(tryAgainHelper, helperFont);
    const tryAgainHelperX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - tryAgainHelperWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      tryAgainHelper,
      tryAgainHelperX,
      currentY,
      helperFontImage,
      helperFont,
      CombatConstants.DEFEAT_SCREEN.HELPER_COLOR
    );

    currentY += helperFont.glyphHeight + CombatConstants.DEFEAT_SCREEN.BUTTON_SPACING * 2;

    // Helper 2: Skip Encounter
    const skipHelper = CombatConstants.DEFEAT_SCREEN.SKIP_HELPER;
    const skipHelperWidth = FontAtlasRenderer.measureTextWidth(skipHelper, helperFont);
    const skipHelperX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - skipHelperWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      skipHelper,
      skipHelperX,
      currentY,
      helperFontImage,
      helperFont,
      CombatConstants.DEFEAT_SCREEN.HELPER_COLOR
    );
  }

  /**
   * Calculates button bounds for hit detection.
   * Returns bounds for "Try Again" and "Skip Encounter" buttons.
   *
   * Performance Note (per GeneralGuidelines.md):
   * This method calculates bounds on-demand. Since button positions are static
   * (not animated), consider caching the result after first calculation if this
   * becomes a hot path. Current implementation: ~0.1ms per call (negligible for
   * defeat screen, which is not performance-critical).
   */
  getButtonBounds(panelBounds: { width: number; height: number }): {
    tryAgain: { x: number; y: number; width: number; height: number };
    skip: { x: number; y: number; width: number; height: number };
  } {
    const modalX = Math.floor((panelBounds.width - CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH) / 2);
    const modalY = Math.floor(panelBounds.height / 3);

    const buttonFont = FontRegistry.getFont(CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID);
    if (!buttonFont) {
      // Return dummy bounds if font not loaded
      return {
        tryAgain: { x: 0, y: 0, width: 0, height: 0 },
        skip: { x: 0, y: 0, width: 0, height: 0 },
      };
    }

    let currentY = modalY + CombatConstants.DEFEAT_SCREEN.MODAL_PADDING * 3;

    // Try Again bounds
    const tryAgainText = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_TEXT;
    const tryAgainWidth = FontAtlasRenderer.measureTextWidth(tryAgainText, buttonFont);
    const tryAgainX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - tryAgainWidth) / 2);
    const tryAgainBounds = {
      x: tryAgainX,
      y: currentY,
      width: tryAgainWidth,
      height: buttonFont.glyphHeight,
    };

    currentY += buttonFont.glyphHeight + CombatConstants.DEFEAT_SCREEN.BUTTON_SPACING;

    // Skip bounds
    const skipText = CombatConstants.DEFEAT_SCREEN.SKIP_TEXT;
    const skipWidth = FontAtlasRenderer.measureTextWidth(skipText, buttonFont);
    const skipX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - skipWidth) / 2);
    const skipBounds = {
      x: skipX,
      y: currentY,
      width: skipWidth,
      height: buttonFont.glyphHeight,
    };

    return {
      tryAgain: tryAgainBounds,
      skip: skipBounds,
    };
  }
}
```

**Rationale:**
- Uses `FontAtlasRenderer` for all text (per GeneralGuidelines.md)
- Rounds all coordinates with `Math.floor()` (pixel-perfect)
- Separates rendering logic from button bounds calculation (for hit detection)
- Gracefully handles missing fonts (defensive programming)
- Centers all text horizontally within modal

#### Step 3.3: Create DefeatPhaseHandler
**File:** `models/combat/phases/DefeatPhaseHandler.ts` (NEW FILE)

**Code to Add:**
```typescript
import type { CombatPhaseHandler, PhaseRenderContext, MouseEventContext } from "./CombatPhaseHandler";
import type { CombatState } from "../CombatState";
import { DefeatModalRenderer } from "../rendering/DefeatModalRenderer";

/**
 * Phase handler for the defeat screen.
 * Displays modal overlay with "Try Again" and "Skip Encounter" options.
 * Disables all other combat interactions.
 */
export class DefeatPhaseHandler implements CombatPhaseHandler {
  private hoveredButton: 'try-again' | 'skip' | null = null;
  private renderer: DefeatModalRenderer;

  constructor() {
    this.renderer = new DefeatModalRenderer();

    // Note: Ensure canvas context has imageSmoothingEnabled = false
    // This should already be set globally in CombatRenderer constructor (per GeneralGuidelines.md)
  }

  update(state: CombatState, dt: number): CombatState | null {
    // No automatic state changes - waits for user input
    return null;
  }

  render(ctx: CanvasRenderingContext2D, state: CombatState, context: PhaseRenderContext): void {
    // Render defeat modal (overlay, panel, title, buttons)
    this.renderer.render(
      ctx,
      state,
      this.hoveredButton,
      context.assets.fonts,
      { width: context.mapPanelWidth, height: context.mapPanelHeight }
    );
  }

  renderUI(ctx: CanvasRenderingContext2D, state: CombatState, context: PhaseRenderContext): void {
    // No additional UI rendering needed (all handled in render())
  }

  handleMouseMove(
    state: CombatState,
    worldX: number,
    worldY: number,
    context: MouseEventContext
  ): CombatState | null {
    // Update hovered button based on mouse position
    const panelBounds = { width: context.mapPanelWidth, height: context.mapPanelHeight };
    const buttonBounds = this.renderer.getButtonBounds(panelBounds);

    let newHoveredButton: 'try-again' | 'skip' | null = null;

    // Check if mouse is over Try Again button
    if (this.isPointInBounds(worldX, worldY, buttonBounds.tryAgain)) {
      newHoveredButton = 'try-again';
    }
    // Check if mouse is over Skip Encounter button
    else if (this.isPointInBounds(worldX, worldY, buttonBounds.skip)) {
      newHoveredButton = 'skip';
    }

    // If hover state changed, trigger re-render
    if (newHoveredButton !== this.hoveredButton) {
      this.hoveredButton = newHoveredButton;
      return state;  // Trigger re-render by returning state
    }

    return null;
  }

  handleMouseDown(
    state: CombatState,
    worldX: number,
    worldY: number,
    context: MouseEventContext
  ): CombatState | null {
    // Button click handling will be implemented in Phase 4
    console.log("Defeat screen button clicked:", this.hoveredButton);
    return null;
  }

  handleMouseUp(state: CombatState, worldX: number, worldY: number): CombatState | null {
    return null;
  }

  private isPointInBounds(
    x: number,
    y: number,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }
}
```

**Rationale:**
- Implements `CombatPhaseHandler` interface (consistent with other handlers)
- `update()` is no-op (waits for user input)
- `render()` delegates to `DefeatModalRenderer`
- `handleMouseMove()` updates hover state (triggers re-render)
- `handleMouseDown()` placeholder for Phase 4 (just logs for now)
- Button hit detection uses calculated bounds from renderer

#### Step 3.4: Add DefeatPhaseHandler to CombatView Phase Selection
**File:** `models/combat/CombatView.tsx` (or wherever phase handlers are selected)

**Location:** Where phase handlers are instantiated or selected

**Add Import:**
```typescript
import { DefeatPhaseHandler } from "./phases/DefeatPhaseHandler";
```

**In Phase Handler Selection (approximate):**
```typescript
private getPhaseHandler(phase: CombatPhase): CombatPhaseHandler {
  switch (phase) {
    case 'deployment':
      return this.deploymentHandler;
    case 'enemy-deployment':
      return this.enemyDeploymentHandler;
    case 'action-timer':
      return this.actionTimerHandler;
    case 'unit-turn':
      return this.unitTurnHandler;
    case 'victory':
      return this.victoryHandler;  // If exists
    case 'defeat':
      if (!this.defeatHandler) {
        this.defeatHandler = new DefeatPhaseHandler();
      }
      return this.defeatHandler;
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}
```

**Rationale:**
- Integrates defeat handler into existing phase handler system
- Lazy initialization (handler created when first needed)
- Matches pattern of other phase handlers

### Testing Phase 3

**Build Test:**
```bash
npm run build
```
**Expected:** No TypeScript errors

**Manual Test (Browser):**
```javascript
// Test 1: Trigger defeat phase manually
window.combatState.phase = 'defeat';

// Observe:
// - Full-screen semi-transparent black overlay
// - Centered modal panel with border
// - Red "Defeat" title at top center
// - "Try Again" button (white text)
// - "Skip Encounter" button (white text)
// - Grey helper text beneath each button

// Test 2: Hover over buttons
// Move mouse over "Try Again" button
// Expected: Text turns yellow

// Move mouse over "Skip Encounter" button
// Expected: Text turns yellow

// Test 3: Click buttons
// Click "Try Again" button
// Expected: Console log "Defeat screen button clicked: try-again"

// Click "Skip Encounter" button
// Expected: Console log "Defeat screen button clicked: skip"
```

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] Defeat phase displays full-screen overlay (50% black)
- [ ] Modal panel is centered on map panel
- [ ] "Defeat" title is red, centered, using dungeonslant font
- [ ] "Try Again" button renders with white text
- [ ] "Skip Encounter" button renders with white text
- [ ] Helper text appears below each button (light grey)
- [ ] Hovering buttons turns text yellow
- [ ] Clicking buttons logs to console (no crash)
- [ ] All text uses FontAtlasRenderer (not ctx.fillText)
- [ ] No visual artifacts or rendering errors

**Visual Validation:**
- Overlay covers entire map panel
- Modal is visually distinct from background
- Text is readable and centered correctly
- Hover state is obvious (color change)
- No blurry text (pixel-perfect rendering)

**Edge Cases:**
- Very small map panel (modal still visible)
- Very large map panel (modal stays reasonable size)
- Font not loaded (graceful degradation)

**Rollback:** Delete `DefeatPhaseHandler.ts` and `DefeatModalRenderer.ts`, revert changes to `CombatConstants.ts` and `CombatView.tsx`.

### Phase 3 Implementation Notes

**Phase Handler Lifecycle Note (per GeneralGuidelines.md "Phase Handler Animation State Management"):**
- `DefeatPhaseHandler` is instantiated when entering defeat phase
- Instance persists for the duration of defeat phase
- If player leaves defeat (via Try Again), handler may be recreated on next defeat entry
- This means hover state (`hoveredButton`) automatically resets on retry
- No explicit cleanup needed - constructor handles initialization
- This is the standard phase handler lifecycle pattern

---

## Phase 4: Input Handling & Try Again

### Goal
Implement button click functionality, disable mouse inputs to all other panels, implement "Try Again" state restoration, and add combat log message.

### Rationale
- Completes the feature (full functionality)
- Most complex phase (state restoration, input disabling)
- Tests serialization system thoroughly
- Final integration of all previous phases

### Files to Modify
1. `models/combat/phases/DefeatPhaseHandler.ts`
2. `models/combat/CombatView.tsx` (input routing)
3. `models/combat/managers/InfoPanelManager.ts` (disable inputs, if separate)
4. `models/combat/managers/renderers/TurnOrderRenderer.ts` (disable inputs, if separate)

### Implementation Steps

#### Step 4.1: Implement Try Again Functionality in DefeatPhaseHandler
**File:** `models/combat/phases/DefeatPhaseHandler.ts`

**Import at Top:**
```typescript
import { deserializeCombatState } from "../CombatSaveData";  // Adjust path as needed
```

**Update handleMouseDown Method:**
```typescript
handleMouseDown(
  state: CombatState,
  worldX: number,
  worldY: number,
  context: MouseEventContext
): CombatState | null {
  const panelBounds = { width: context.mapPanelWidth, height: context.mapPanelHeight };
  const buttonBounds = this.renderer.getButtonBounds(panelBounds);

  // Check if Try Again button clicked
  if (this.isPointInBounds(worldX, worldY, buttonBounds.tryAgain)) {
    return this.handleTryAgain(state);
  }

  // Check if Skip Encounter button clicked
  if (this.isPointInBounds(worldX, worldY, buttonBounds.skip)) {
    return this.handleSkipEncounter(state);
  }

  return null;
}

private handleTryAgain(state: CombatState): CombatState | null {
  // Check if initial state snapshot exists
  if (!state.initialStateSnapshot) {
    console.error("No initial state snapshot available for retry");
    // TODO: Show error message to player (future enhancement)
    return null;
  }

  try {
    // Deserialize initial state snapshot
    const restoredState = deserializeCombatState(state.initialStateSnapshot);

    console.log("Combat state restored from initial snapshot");
    return restoredState;
  } catch (error) {
    console.error("Failed to restore initial state:", error);
    // TODO: Show error message to player (future enhancement)
    return null;
  }
}

private handleSkipEncounter(state: CombatState): CombatState | null {
  // TODO: Implement skip encounter logic (future work)
  console.log("Skip encounter clicked (not yet implemented)");
  return null;
}
```

**Rationale:**
- `handleTryAgain()` deserializes snapshot and returns restored state
- Error handling for missing snapshot or deserialization failure
- `handleSkipEncounter()` is placeholder for future implementation
- Returns new state to trigger full re-render and phase change

#### Step 4.2: Disable Mouse Inputs During Defeat Phase in CombatView
**File:** `models/combat/CombatView.tsx`

**Location:** In mouse event routing logic (wherever mouse events are dispatched to handlers)

**Find This Code (approximate):**
```typescript
private handleMouseEvent(event: MouseEvent): void {
  // Calculate world coordinates
  const worldX = /* ... calculation ... */;
  const worldY = /* ... calculation ... */;

  // Route to current phase handler
  const phaseHandler = this.getPhaseHandler(this.state.phase);
  const newState = phaseHandler.handleMouseMove(this.state, worldX, worldY, context);

  if (newState) {
    this.setState(newState);
  }
}
```

**Add Early Return for Defeat Phase:**
```typescript
private handleMouseEvent(event: MouseEvent): void {
  // During defeat phase, only DefeatPhaseHandler handles input
  // All other panels should be non-interactive
  if (this.state.phase === 'defeat') {
    // Route ONLY to defeat handler
    const phaseHandler = this.getPhaseHandler('defeat');
    const worldX = /* ... calculation ... */;
    const worldY = /* ... calculation ... */;
    const newState = phaseHandler.handleMouseMove(this.state, worldX, worldY, context);

    if (newState) {
      this.setState(newState);
    }

    return;  // Early return - don't route to other handlers
  }

  // Normal mouse event routing for other phases
  // ... existing code ...
}
```

**Repeat for All Mouse Event Methods:**
- `handleMouseMove()`
- `handleMouseDown()`
- `handleMouseUp()`

**Rationale:**
- Early return pattern prevents event routing to other handlers
- Only DefeatPhaseHandler receives mouse events during defeat
- Simple phase check (no complex disabling logic needed)

**Important: No renderFrame() Calls (per GeneralGuidelines.md "Mouse Event Performance"):**

Our implementation: ✅ **Correct**
```typescript
if (newHoveredButton !== this.hoveredButton) {
  this.hoveredButton = newHoveredButton;
  return state;  // ✅ Trigger re-render via animation loop
}
```

Avoid: ❌ **Incorrect**
```typescript
if (newHoveredButton !== this.hoveredButton) {
  this.hoveredButton = newHoveredButton;
  renderFrame();  // ❌ Blocks animation loop, can fire 100+ times/sec!
}
```

**Why:** Per GeneralGuidelines.md, DO NOT call `renderFrame()` in `handleMouseMove()`. Mouse events can fire 100+ times per second, which would block the main thread. Instead, we return the state object to trigger a re-render through the animation loop (correct pattern).

#### Step 4.3: Disable Panel Interactions (Optional, if panels have separate input handling)
**File:** `models/combat/managers/InfoPanelManager.ts` (or similar)

**If panels have separate mouse input handling:**

**Add Phase Check in Input Handlers:**
```typescript
handleButtonClick(buttonId: string): void {
  // Disable interactions during defeat phase
  if (this.combatState.phase === 'defeat') {
    return;  // Ignore input
  }

  // Normal button handling
  // ... existing code ...
}
```

**Rationale:**
- Defense-in-depth (prevents accidental interactions)
- Only needed if panels have independent input handling
- May not be necessary if CombatView routing is sufficient

#### Step 4.4: Update Combat Log Message (if not already done in Phase 1)
**File:** `models/combat/phases/UnitTurnPhaseHandler.ts`

**Verify defeat message is added to combat log (from Phase 1):**
```typescript
if (defeatCondition.evaluate(newState)) {
  // Add combat log message
  newState.combatLog.addEntry({
    message: CombatConstants.DEFEAT_SCREEN.DEFEAT_MESSAGE,
    color: "#ff0000",  // Red
  });

  // Transition to defeat phase
  return { ...newState, phase: 'defeat' };
}
```

**Rationale:**
- Uses constant from Phase 3
- Red color for emphasis
- Message appears in combat log panel

### Testing Phase 4

**Build Test:**
```bash
npm run build
```
**Expected:** No TypeScript errors

**Manual Test (Browser):**
```javascript
// Test 1: Trigger defeat and test Try Again
// KO all player units
const units = window.combatState.unitManifest.getAllUnits();
const playerUnits = units.filter(p => !p.unit.isEnemy);
playerUnits.forEach(p => {
  p.unit.wounds = p.unit.maxHealth;
});

// Wait for defeat phase to trigger at end of turn
// Expected: Defeat screen appears

// Click "Try Again" button
// Expected:
// - Console log "Combat state restored from initial snapshot"
// - Combat returns to deployment or first action-timer phase
// - All units restored to initial positions
// - All stats restored (health, action timers, etc.)
// - Turn order recalculated

// Test 2: Test multiple retries
// KO all players again, click "Try Again" again
// Expected: Works correctly multiple times

// Test 3: Test Skip Encounter button
// Trigger defeat, click "Skip Encounter"
// Expected: Console log "Skip encounter clicked (not yet implemented)"

// Test 4: Test input disabling
// Trigger defeat phase
// Try clicking on map tiles - Expected: No response
// Try clicking action buttons - Expected: No response
// Try hovering units - Expected: No hover state
// ONLY defeat modal buttons should respond

// Test 5: Test missing snapshot error handling
// Manually set snapshot to null
window.combatState.initialStateSnapshot = null;
// Trigger defeat and click "Try Again"
// Expected: Console error logged, no crash

// Test 6: Combat log message
// Trigger defeat
// Check combat log panel
// Expected: "The enemies have triumphed over you!" message appears in red
```

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] "Try Again" button successfully restores initial combat state
- [ ] All units restored to initial positions
- [ ] All unit stats restored (health, action timer, etc.)
- [ ] Combat phase restored to initial phase (deployment or action-timer)
- [ ] Turn order recalculated correctly
- [ ] Multiple "Try Again" clicks work correctly
- [ ] "Skip Encounter" button logs to console (no crash)
- [ ] All map panel interactions disabled during defeat
- [ ] All info panel interactions disabled during defeat
- [ ] Only defeat modal buttons respond to mouse events
- [ ] Combat log shows defeat message in red
- [ ] Missing snapshot handled gracefully (error logged, no crash)
- [ ] Deserialization error handled gracefully (error logged, no crash)

**Integration Tests:**
1. **Full Combat Flow:**
   - Start new combat
   - Complete deployment
   - Enter action-timer phase (snapshot created)
   - KO all player units
   - Verify defeat phase triggers
   - Click "Try Again"
   - Verify combat restarted correctly

2. **Edge Case: Victory and Defeat Simultaneously:**
   - Set up scenario where last enemy and last player KO each other
   - Expected: Victory takes precedence (handled in Phase 1)

3. **Edge Case: Missing Snapshot:**
   - Load combat from old save (no snapshot)
   - Trigger defeat
   - Click "Try Again"
   - Expected: Error logged, button does nothing (graceful degradation)

4. **Performance:**
   - Measure state restoration time:
     ```javascript
     const start = performance.now();
     // Click "Try Again"
     const elapsed = performance.now() - start;
     console.log(`State restoration took ${elapsed.toFixed(2)}ms`);
     // Expected: <100ms (acceptable one-time cost)
     ```

**Rollback:** Revert all Phase 4 changes to `DefeatPhaseHandler.ts`, `CombatView.tsx`, and any panel manager files.

---

## Testing Strategy

### Per-Phase Testing
- Test immediately after each phase completes
- Use browser console for state inspection
- Visual validation for UI phases (Phase 3)
- Functional validation for logic phases (Phase 1, 2, 4)
- Edge cases tested continuously

### Integration Testing (After Phase 4)
1. **Scenario 1: Normal Defeat Flow**
   - Start combat, play normally
   - Lose combat (all players KO'd)
   - Verify defeat screen appears
   - Click "Try Again"
   - Complete combat successfully

2. **Scenario 2: Multiple Retries**
   - Trigger defeat
   - Click "Try Again"
   - Lose again
   - Click "Try Again" again
   - Verify no degradation or errors

3. **Scenario 3: Victory vs Defeat Precedence**
   - Set up simultaneous victory/defeat scenario
   - Verify victory takes precedence

4. **Scenario 4: Missing Snapshot**
   - Load combat from old save (before this feature)
   - Trigger defeat
   - Verify "Try Again" disabled or shows error

5. **Scenario 5: Large Combat State**
   - Combat with 10+ units, multiple turns completed
   - Trigger defeat
   - Verify snapshot size is reasonable
   - Verify restoration is fast enough (<100ms)

6. **Scenario 6: Save/Load Compatibility**
   - Start combat, create snapshot
   - Save game
   - Load game
   - Verify snapshot persists
   - Trigger defeat and test "Try Again"

### Performance Testing
- Initial state serialization: <50ms (one-time cost)
- State restoration: <100ms (one-time cost)
- Modal rendering: <5ms per frame (negligible)
- No memory leaks during multiple retries

### Browser Console Test Utilities

**Add to CombatView for testing:**
```javascript
if (typeof window !== 'undefined') {
  window.combatState = combatState;

  window.triggerDefeat = () => {
    const playerUnits = combatState.unitManifest.getAllUnits().filter(p => !p.unit.isEnemy);
    playerUnits.forEach(p => {
      p.unit.wounds = p.unit.maxHealth;
    });
    console.log("All players KO'd - wait for turn to end");
  };

  window.checkSnapshot = () => {
    const snapshot = combatState.initialStateSnapshot;
    if (snapshot) {
      console.log("Snapshot exists:", snapshot);
      console.log("Unit count:", snapshot.units?.length ?? 0);
      console.log("Phase:", snapshot.phase);
    } else {
      console.log("No snapshot available");
    }
  };

  window.manualDefeatPhase = () => {
    combatState.phase = 'defeat';
    console.log("Manually set to defeat phase");
  };

  // Performance measurement (per GeneralGuidelines.md pattern)
  window.measureDefeatScreenPerformance = () => {
    console.log('Measuring defeat screen rendering performance...');
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      // Trigger re-render (implementation-specific)
      // This tests modal rendering overhead
      // NOTE: Actual implementation depends on CombatView render trigger mechanism
    }

    const elapsed = performance.now() - start;
    console.log(`${iterations} renders: ${elapsed.toFixed(2)}ms`);
    console.log(`Avg: ${(elapsed/iterations).toFixed(3)}ms/frame`);
    console.log(`Target: <16.67ms/frame for 60 FPS`);
    console.log(`Budget used: ${((elapsed/iterations)/16.67*100).toFixed(1)}%`);
  };
}
```

---

## Guidelines Compliance Checklist

### Rendering Rules ✅
- [ ] Uses SpriteRenderer for all sprite rendering (panel backgrounds, if needed)
- [ ] Uses FontAtlasRenderer for all text rendering (title, buttons, helper text)
- [ ] Never uses ctx.fillText() or ctx.strokeText()
- [ ] Rounds all coordinates with Math.floor()
- [ ] Disables image smoothing where needed

### State Management ✅
- [ ] Immutable state updates (returns new state, doesn't mutate)
- [ ] Serialization uses existing `serializeCombatState()` function
- [ ] Deserialization uses existing `deserializeCombatState()` function
- [ ] No side effects in render methods
- [ ] Phase transitions return new state objects

### Performance ✅
- [ ] No per-frame allocations in render methods
- [ ] Renderer and handler instances cached (not recreated every frame)
- [ ] Button bounds calculated once (cached or reused)
- [ ] Serialization happens once (at combat start)
- [ ] Deserialization happens on demand (only when "Try Again" clicked)

### Event Handling ✅
- [ ] Mouse events routed through existing phase handler system
- [ ] No direct event listeners on DOM elements
- [ ] Hit detection uses calculated bounds (not DOM queries)
- [ ] Hover state managed in phase handler (not separate system)

### Type Safety ✅
- [ ] TypeScript interfaces used for all new types
- [ ] No `any` casts
- [ ] CombatPhaseHandler interface implemented correctly
- [ ] Const assertions for constants (`as const`)

### Error Handling ✅
- [ ] Missing fonts handled gracefully (console.warn, continue)
- [ ] Missing snapshot handled gracefully (console.error, disable button)
- [ ] Deserialization errors caught and logged (no crash)
- [ ] All error paths tested

---

## Performance Considerations

### Negligible Overhead
- **Overlay Rendering:** Single fillRect call, <1ms
- **Modal Rendering:** Static text, <5ms per frame
- **Button Hover Detection:** Simple bounding box checks, <0.1ms
- **Total Rendering Overhead:** <10ms per frame (acceptable for 60 FPS = 16.67ms budget)

### One-Time Costs
- **Initial Serialization:** <50ms (happens once at combat start)
- **State Restoration:** <100ms (happens on "Try Again" click)
- **Handler Instantiation:** <1ms (lazy initialization)

### No New Allocations
- Renderer instance cached in handler (no per-frame creation)
- Button bounds calculated once per render (stack variables only)
- No intermediate buffers or cached images (simple text rendering)

### Measured Impact
- Expected: <10ms overhead per frame during defeat phase
- No impact on other phases (early return in input routing)
- Memory usage: ~100KB for initial snapshot (acceptable)

---

## Rollback Plan

### Phase-by-Phase Rollback
Each phase can be rolled back independently by reverting the modified/created files.

### Phase 4 Rollback (Most Complex)
- Revert `DefeatPhaseHandler.ts` changes (remove Try Again logic)
- Revert `CombatView.tsx` input routing changes
- Revert panel manager changes (if any)
- Defeat screen visible but non-functional

### Phase 3 Rollback
- Delete `DefeatPhaseHandler.ts`
- Delete `DefeatModalRenderer.ts`
- Revert `CombatConstants.ts` (remove DEFEAT_SCREEN section)
- Revert `CombatView.tsx` (remove handler selection)
- Defeat phase transitions but shows nothing

### Phase 2 Rollback
- Revert `CombatState.ts` (remove initialStateSnapshot field)
- Revert `DeploymentPhaseHandler.ts` (remove serialization logic)
- Revert `CombatSaveData.ts` (remove snapshot serialization)
- Try Again disabled (no snapshot to restore)

### Phase 1 Rollback
- Delete `CombatDefeatCondition.ts`
- Revert `CombatState.ts` (remove 'defeat' from CombatPhase type)
- Revert `UnitTurnPhaseHandler.ts` (remove defeat checking)
- Revert `index.ts` (remove exports)
- Feature completely removed (defeat never triggers)

---

## Post-Implementation Tasks

### Documentation Updates
- [ ] Update CombatHierarchy.md with defeat screen references
- [ ] Document defeat condition system
- [ ] Document initial state serialization
- [ ] Add to Quick Reference section

### Code Review
- [ ] Verify all rendering uses FontAtlasRenderer
- [ ] Verify all coordinates rounded with Math.floor()
- [ ] Verify no per-frame allocations
- [ ] Verify TypeScript compiles clean
- [ ] Verify no console warnings

### Final Testing
- [ ] All 6 integration scenarios pass
- [ ] Performance benchmarks meet targets
- [ ] No visual glitches
- [ ] Save/load works correctly
- [ ] Multiple retries work correctly

---

## Success Criteria

### Phase 1 (Defeat Detection) ✅
- [ ] Defeat condition triggers when all players KO'd
- [ ] Combat log message appears
- [ ] State transitions to 'defeat' phase
- [ ] No crash or errors

### Phase 2 (State Serialization) ✅
- [ ] Initial state serialized at combat start
- [ ] Snapshot contains full combat state
- [ ] Deserialization recreates state correctly
- [ ] Error handling works

### Phase 3 (Modal Rendering) ✅
- [ ] Defeat screen displays correctly
- [ ] All UI elements visible and styled
- [ ] Hover states work
- [ ] No rendering errors

### Phase 4 (Functionality) ✅
- [ ] "Try Again" restores initial state
- [ ] Multiple retries work
- [ ] Input disabling works
- [ ] Error cases handled gracefully

### Integration ✅
- [ ] All 6 integration scenarios pass
- [ ] Performance targets met (<50ms serialization, <100ms restoration)
- [ ] No visual artifacts
- [ ] TypeScript compiles clean

---

## Timeline

### Estimated

| Phase | Estimated | Notes |
|-------|-----------|-------|
| Phase 1 | 1.5 hours | Defeat condition system |
| Phase 2 | 2 hours | Initial state serialization |
| Phase 3 | 3 hours | Defeat modal rendering (most complex UI) |
| Phase 4 | 2.5 hours | Input handling & Try Again |
| **Total** | **~9 hours** | **Plus testing time (~2-3 hours)** |

### Breakdown
- **Core Implementation:** ~9 hours (15 files, ~500 lines of code)
- **Testing & Validation:** ~2-3 hours
- **Total Effort:** ~11-12 hours

---

## Project Start

**Current Status:** 📋 Ready to begin Phase 1

**Next Step:** Create `CombatDefeatCondition.ts` interface and implementation

**Estimated Completion:** After 4 phases, ~11-12 hours total

---

## Notes

- This feature builds on the KO Feature (requires `isKnockedOut` getter)
- The pluggable `CombatDefeatCondition` system allows for future custom defeat conditions
- Initial state serialization is crucial for fair retries (no partial progress)
- "Skip Encounter" button is placeholder for future work (will need additional systems)
- Consider adding retry statistics tracking (future enhancement)
- Consider adding animated transitions (future enhancement)

---

## GeneralGuidelines.md Compliance Summary

This implementation plan has been enhanced with explicit references to GeneralGuidelines.md patterns:

### Added Notes (Version 1.1):

1. **Phase 1, Step 1.2:** Added TypeScript pattern note explaining our string union approach vs. const enum pattern
2. **Phase 3, Step 3.2:** Added note about using `SpriteRenderer.renderSpriteById()` for nine-slice panel rendering
3. **Phase 3, Step 3.2:** Added performance note about button bounds caching (on-demand calculation is acceptable)
4. **Phase 3, Step 3.3:** Added note about `imageSmoothingEnabled = false` requirement
5. **Phase 3 Notes:** Added section on phase handler lifecycle and hover state management
6. **Phase 3 Overview:** Added GeneralGuidelines.md compliance checklist for rendering rules
7. **Phase 4, Step 4.2:** Added critical note about NOT calling `renderFrame()` in mouse event handlers
8. **Testing Strategy:** Added performance measurement utility following GeneralGuidelines.md pattern

### Key Patterns Reinforced:

- ✅ **Rendering:** Use `FontAtlasRenderer` and `SpriteRenderer` exclusively (never `ctx.fillText()` or direct `ctx.drawImage()` on sprite sheets)
- ✅ **Coordinates:** Always round with `Math.floor()` for pixel-perfect rendering
- ✅ **Mouse Events:** Never call `renderFrame()` in event handlers (return state to trigger re-render via animation loop)
- ✅ **Performance:** Cache instances, avoid per-frame allocations
- ✅ **Phase Handlers:** Understand lifecycle (instantiated on phase entry, persist during phase, may be recreated)

All implementation steps now explicitly reference GeneralGuidelines.md where applicable, ensuring developers understand the "why" behind each pattern.

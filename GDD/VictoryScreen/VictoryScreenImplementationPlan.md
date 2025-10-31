# Victory Screen Implementation Plan

**Date:** 2025-10-31
**Feature:** Victory Screen with Item Looting System
**Branch:** victory-screen
**Priority:** High
**Complexity:** Medium-High

---

## Overview

This plan details the implementation of the Victory Screen feature for combat encounters. When all enemy units are knocked out, the combat system transitions to a victory phase displaying a modal overlay with rewards (experience, gold, items) and an interactive item looting system. Players can select which items to loot before exiting the encounter.

The implementation will closely follow the existing DefeatPhaseHandler pattern while adding complexity for the interactive item grid system.

## Reusable Components from Existing Codebase

### ✅ Already Implemented
1. **CombatPredicate System** ([CombatPredicate.ts:82](react-app/src/models/combat/CombatPredicate.ts#L82))
   - `AllEnemiesDefeatedPredicate` already exists - REUSE THIS
   - Evaluates to `true` when all enemy units are KO'd
   - Handles edge case (no enemies = victory)
   - Already has serialization support

2. **Phase Handler Pattern** ([DefeatPhaseHandler.ts](react-app/src/models/combat/DefeatPhaseHandler.ts))
   - Modal overlay rendering pattern
   - Mouse event handling (hover, click)
   - Phase transition logic
   - Can use as template for VictoryPhaseHandler

3. **Modal Renderer Pattern** ([DefeatModalRenderer.ts](react-app/src/models/combat/rendering/DefeatModalRenderer.ts))
   - Overlay rendering (full-screen semi-transparent)
   - Panel background with border
   - Title rendering with shadow
   - Button rendering with hover states
   - Helper text rendering
   - Bounds calculation for hit detection
   - Can use as template for VictoryModalRenderer

4. **Font System** ([CombatHierarchy.md:235](CombatHierarchy.md#L235))
   - `15px-dungeonslant` for title
   - `7px-04b03` for UI text
   - FontAtlasRenderer for pixel-perfect text
   - FontRegistry for font lookup

5. **Combat Constants Pattern** ([CombatConstants.ts:277](react-app/src/models/combat/CombatConstants.ts#L277))
   - DEFEAT_SCREEN section exists - create similar VICTORY_SCREEN section
   - Centralized colors, fonts, text strings
   - All visual constants in one place

### 🆕 New Implementation Required
1. **VictoryRewards Data Structure**
   - Experience, gold, items array
   - Random reward generation
   - Unique item selection from Equipment registry

2. **Item Grid Rendering**
   - 4x2 grid layout
   - Dynamic 0-8 items
   - Three-state colors (grey/yellow/green)
   - Item truncation for long names

3. **Item Selection System**
   - Click to toggle selection
   - Set-based tracking of looted items
   - "Loot All" bulk selection
   - Visual feedback on selection change

4. **Equipment Registry Integration**
   - Query all available items
   - Random selection without duplicates
   - Item name formatting

## Requirements

### Visual Specifications

**Modal Dimensions:**
- Width: 160px (wider than defeat modal: 120px)
- Height: Auto-calculated based on content
- Position: Centered horizontally and vertically

**Colors (Hex Codes):**
- Title: `#ffff00` (yellow, positive emphasis)
- Experience text: `#ffffff` (white)
- Gold text: `#ffff00` (yellow, gold color)
- Items header: `#ffffff` (white)
- Item normal: `#888888` (grey, not selected)
- Item hover: `#ffff00` (yellow, mouseover)
- Item selected: `#00ff00` (green, looted)
- Helper text: `#aaaaaa` (light grey)
- Buttons normal: `#ffffff` (white)
- Buttons hover: `#ffff00` (yellow)
- Overlay: `rgba(0, 0, 0, 0.7)` (70% black)
- Panel background: `#000000` (black)
- Panel border: `#ffffff` (white, 2px)

**Fonts:**
- Title: `15px-dungeonslant`
- UI elements: `7px-04b03`

**Spacing:**
- Top padding: 8px
- Title to rewards: 4px
- Experience to gold: 2px
- Gold to items header: 4px
- Items header to grid: 4px
- Item horizontal spacing: 4px
- Item vertical spacing: 2px
- Grid to helper text: 4px
- Helper text to buttons: 4px
- Button to button: 16px
- Bottom padding: 8px

**Item Grid:**
- Columns: 4 items per row
- Rows: 2 maximum (0-8 items total)
- Item width: 30px
- Item height: 7px (font height)

### Behavioral Specifications

**Victory Detection:**
- Check at end of each unit's turn (UnitTurnPhaseHandler)
- Use existing `AllEnemiesDefeatedPredicate.evaluate(state)`
- Check BEFORE defeat condition (victory takes precedence)
- Add victory message to combat log
- Transition to `phase='victory'`

**Item Interaction:**
- Default state: All items grey (not selected)
- Hover: Item turns yellow, helper text appears
- Click: Toggle selection (grey ↔ green)
- Multiple items can be selected simultaneously
- "Loot All" button: Select all items at once
- Can deselect items individually after "Loot All"

**Reward Generation:**
- Experience: Random 100-600 XP
- Gold: Random 10-110 gold
- Items: Random 0-8 unique items from Equipment registry
- No duplicate items in same reward pool

**Mouse Input Disabling:**
- Map panel: No tile/unit interactions
- Info panel: All buttons disabled
- Turn order panel: No hover/click
- Actions menu: Hidden
- Only active: Victory modal items and buttons

### Technical Requirements

**Compliance with GeneralGuidelines.md:**
- ✅ Use SpriteRenderer exclusively (no direct ctx.drawImage on sprite sheets)
- ✅ Use FontAtlasRenderer exclusively (no ctx.fillText)
- ✅ Always disable image smoothing: `ctx.imageSmoothingEnabled = false`
- ✅ Round all coordinates with `Math.floor()` for pixel-perfect rendering
- ✅ Cache stateful components (VictoryPhaseHandler instance, renderer instance)
- ✅ Use off-screen buffers only when needed (not needed for this feature)
- ✅ Return new state objects (immutability): `{ ...state, phase: 'victory' }`
- ✅ Never mutate state directly
- ✅ Use WeakMap for object-to-ID mapping if needed
- ✅ No `renderFrame()` calls in high-frequency mouse handlers
- ✅ Update state only, let animation loop handle rendering
- ✅ Cache renderer instance to avoid GC pressure

**Performance:**
- No more than 100 object allocations per frame
- Renderer instance cached in phase handler
- Item bounds calculated once per frame (not per item)
- Binary search for item name truncation (O(log n))

**Serialization:**
- Victory phase is transient (not saved)
- Rewards generated fresh on victory
- Looted items stored in phase handler state only

## Implementation Tasks

### Phase 1: Victory Constants (Foundation)
**Files:**
- `react-app/src/models/combat/CombatConstants.ts`

**Changes:**
```typescript
// Add after DEFEAT_SCREEN section
VICTORY_SCREEN: {
  // Overlay
  OVERLAY_OPACITY: 0.7,

  // Modal dimensions
  MODAL_WIDTH: 160,

  // Title
  TITLE_TEXT: 'VICTORY!',
  TITLE_FONT_ID: '15px-dungeonslant',
  TITLE_COLOR: '#ffff00', // Yellow

  // UI elements
  UI_FONT_ID: '7px-04b03',
  REWARD_TEXT_COLOR: '#ffffff', // White
  GOLD_TEXT_COLOR: '#ffff00', // Yellow (gold color)

  // Items section
  ITEMS_HEADER_TEXT: 'Items Found',
  ITEM_WIDTH: 30, // pixels per item
  ITEM_SPACING_H: 4, // horizontal spacing between items
  ITEM_SPACING_V: 2, // vertical spacing between rows
  ITEM_COLOR_NORMAL: '#888888', // Grey (not selected)
  ITEM_COLOR_HOVER: '#ffff00', // Yellow (hovered)
  ITEM_COLOR_SELECTED: '#00ff00', // Green (looted)

  // Helper text
  HELPER_TEXT: 'Click to loot',
  HELPER_COLOR: '#aaaaaa', // Light grey

  // Buttons
  LOOT_ALL_TEXT: 'Loot All',
  EXIT_TEXT: 'Exit Encounter',
  BUTTON_SPACING: 16, // spacing between buttons
  BUTTON_COLOR_NORMAL: '#ffffff', // White
  BUTTON_COLOR_HOVER: '#ffff00', // Yellow

  // Combat log
  VICTORY_MESSAGE: 'Victory! All enemies have been defeated!',
}
```

**Rationale:** Centralized constants prevent magic numbers, enable easy tweaking, follow existing pattern.

**Dependencies:** None

**Estimated Time:** 15 minutes

---

### Phase 2: Victory Rewards Data Structure
**Files:**
- `react-app/src/models/combat/CombatEncounter.ts`

**Changes:**
```typescript
// Add interface near top of file
export interface VictoryRewards {
  experience: number;
  gold: number;
  items: Equipment[];  // 0-8 items
}

// Add method to CombatEncounter class
getVictoryRewards(): VictoryRewards {
  // Placeholder implementation - generate random rewards
  const experience = Math.floor(Math.random() * 500) + 100; // 100-600 XP
  const gold = Math.floor(Math.random() * 100) + 10; // 10-110 gold

  // Select 0-8 random unique items from Equipment registry
  const allItems = Array.from(EquipmentRegistry.getAll().values());
  const itemCount = Math.floor(Math.random() * 9); // 0-8 items
  const items: Equipment[] = [];

  const selectedIndices = new Set<number>();
  while (items.length < itemCount && items.length < allItems.length) {
    const randomIndex = Math.floor(Math.random() * allItems.length);
    if (!selectedIndices.has(randomIndex)) {
      selectedIndices.add(randomIndex);
      items.push(allItems[randomIndex]);
    }
  }

  return { experience, gold, items };
}
```

**Rationale:** Encapsulates reward logic in encounter, enables future customization per encounter, uses Set for uniqueness guarantee.

**Dependencies:** Phase 1 (constants for future use)

**Import Requirements:**
```typescript
import { EquipmentRegistry } from '../equipment/EquipmentRegistry';
import type { Equipment } from '../equipment/Equipment';
```

**Estimated Time:** 30 minutes

---

### Phase 3: Victory Modal Renderer
**Files:**
- `react-app/src/models/combat/rendering/VictoryModalRenderer.ts` (NEW FILE)

**Changes:**
Create new file following DefeatModalRenderer pattern but with additions for:
- Experience and gold rendering (2 lines)
- "Items Found" header
- Item grid rendering (4x2 layout, 0-8 items)
- Item color based on hover/selection state
- Helper text (conditional, only when item hovered)
- Two buttons instead of one
- Dynamic modal height calculation
- getUIBounds() returning item bounds array + button bounds

**Key Methods:**
```typescript
export class VictoryModalRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    rewards: VictoryRewards,
    lootedItemIds: Set<string>,
    hoveredItemId: string | null,
    hoveredButton: 'loot-all' | 'exit' | null,
    fonts: Map<string, HTMLImageElement>,
    panelBounds: { width: number; height: number }
  ): void;

  private renderOverlay(...): void;
  private renderPanelBackground(...): void;
  private calculateModalHeight(...): number;
  private renderTitle(...): number;
  private renderRewards(...): number;  // NEW: XP and gold
  private renderItemsHeader(...): number;  // NEW
  private renderItemGrid(...): number;  // NEW: Complex, 4x2 grid
  private renderHelperText(...): number;  // Conditional
  private renderButtons(...): number;  // Two buttons
  private truncateItemName(...): string;  // NEW: Binary search

  getUIBounds(
    panelBounds: { width: number; height: number },
    rewards: VictoryRewards
  ): {
    items: Array<{ x: number; y: number; width: number; height: number }>;
    lootAllButton: { x: number; y: number; width: number; height: number };
    exitButton: { x: number; y: number; width: number; height: number };
  };
}
```

**Rationale:** Separates rendering logic from phase handler, enables testing, follows existing pattern, pixel-perfect calculations.

**Dependencies:** Phase 1 (constants), Phase 2 (VictoryRewards interface)

**Import Requirements:**
```typescript
import { CombatConstants } from '../CombatConstants';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';
import type { VictoryRewards } from '../CombatEncounter';
```

**Guidelines Compliance:**
- ✅ Uses FontAtlasRenderer exclusively
- ✅ All coordinates rounded with Math.floor()
- ✅ No direct state management (pure rendering)
- ✅ Returns Y position for sequential layout

**Estimated Time:** 3-4 hours

---

### Phase 4: Victory Phase Handler
**Files:**
- `react-app/src/models/combat/VictoryPhaseHandler.ts` (NEW FILE)

**Changes:**
Create new file following DefeatPhaseHandler pattern with additions for:
- Looted items tracking: `lootedItemIds: Set<string>`
- Item hover detection
- Item click handling (toggle selection)
- "Loot All" button handling
- "Exit Encounter" placeholder
- Pass rewards to renderer

**Key Structure:**
```typescript
export class VictoryPhaseHandler extends PhaseBase {
  private hoveredItemId: string | null = null;
  private hoveredButton: 'loot-all' | 'exit' | null = null;
  private lootedItemIds: Set<string> = new Set();
  private renderer: VictoryModalRenderer;
  private rewards: VictoryRewards;

  constructor(rewards: VictoryRewards) {
    super();
    this.rewards = rewards;
    this.renderer = new VictoryModalRenderer();
  }

  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    return { spriteIds: new Set<string>() };
  }

  protected updatePhase(...): CombatState | null {
    return null; // No automatic transitions
  }

  render(...): void {
    // Empty - all rendering in renderUI
  }

  renderUI(state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    const fonts = context.fontAtlasImages ?? new Map<string, HTMLImageElement>();
    this.renderer.render(
      context.ctx,
      this.rewards,
      this.lootedItemIds,
      this.hoveredItemId,
      this.hoveredButton,
      fonts,
      { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT }
    );
  }

  handleMouseMove(...): PhaseEventResult {
    // Check item hover + button hover
    // Update state, trigger re-render if changed
  }

  handleMouseDown(...): PhaseEventResult {
    // Check item click → toggle selection
    // Check "Loot All" → select all items
    // Check "Exit Encounter" → placeholder (console.log)
  }

  handleMouseUp(...): PhaseEventResult {
    return { handled: false };
  }

  private handleItemClick(itemId: string): void {
    if (this.lootedItemIds.has(itemId)) {
      this.lootedItemIds.delete(itemId);
    } else {
      this.lootedItemIds.add(itemId);
    }
  }

  private handleLootAll(): void {
    for (const item of this.rewards.items) {
      this.lootedItemIds.add(item.id);
    }
  }

  private handleExitEncounter(...): PhaseEventResult {
    console.log('[VictoryPhaseHandler] Exit encounter clicked (not yet implemented)');
    console.log('[VictoryPhaseHandler] Looted items:', Array.from(this.lootedItemIds));
    return { handled: true };
  }

  private isPointInBounds(...): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }
}
```

**Rationale:** Follows DefeatPhaseHandler pattern, encapsulates selection state, delegates rendering to renderer.

**Dependencies:** Phase 1 (constants), Phase 2 (VictoryRewards), Phase 3 (VictoryModalRenderer)

**Import Requirements:**
```typescript
import { PhaseBase } from './PhaseBase';
import type {
  PhaseRenderContext,
  MouseEventContext,
  PhaseSprites,
  PhaseEventResult
} from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter, VictoryRewards } from './CombatEncounter';
import { VictoryModalRenderer } from './rendering/VictoryModalRenderer';
import { CombatConstants } from './CombatConstants';
```

**Guidelines Compliance:**
- ✅ Caches renderer instance (avoids GC pressure)
- ✅ Returns new state objects (immutability)
- ✅ No renderFrame() calls in mouse handlers
- ✅ Uses Set for efficient item tracking

**Estimated Time:** 2-3 hours

---

### Phase 5: Victory Condition Integration
**Files:**
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**
```typescript
// In UnitTurnPhaseHandler class, add near top:
import { AllEnemiesDefeatedPredicate } from './CombatPredicate';

// Add instance variable:
private victoryCondition: AllEnemiesDefeatedPredicate = new AllEnemiesDefeatedPredicate();

// In the method that handles end-of-turn logic (likely in updatePhase or similar):
// Add BEFORE existing defeat check:

// Check victory condition FIRST (takes precedence over defeat)
if (this.victoryCondition.evaluate(state)) {
  console.log('[UnitTurnPhaseHandler] Victory condition met');

  // Add combat log message (deferred to renderUI when combatLog available)
  this.pendingLogMessages.push(CombatConstants.VICTORY_SCREEN.VICTORY_MESSAGE);

  // Transition to victory phase
  return {
    ...state,
    phase: 'victory' as const
  };
}

// Existing defeat check comes AFTER
if (this.defeatCondition.evaluate(state)) {
  // ... existing defeat logic
}
```

**Rationale:** Reuses existing `AllEnemiesDefeatedPredicate`, victory checked before defeat (player wins ties), follows existing defeat pattern.

**Dependencies:** Phase 1 (constants)

**Guidelines Compliance:**
- ✅ Returns new state object (immutability)
- ✅ Uses existing predicate system
- ✅ Victory takes precedence over defeat

**Estimated Time:** 30 minutes

---

### Phase 6: CombatView Integration
**Files:**
- `react-app/src/components/combat/CombatView.tsx`

**Changes:**
```typescript
// Add import
import { VictoryPhaseHandler } from '../../models/combat/VictoryPhaseHandler';

// In the useEffect that creates phase handlers (look for existing DefeatPhaseHandler check):
} else if (combatState.phase === 'defeat') {
  phaseHandlerRef.current = new DefeatPhaseHandler();
} else if (combatState.phase === 'victory') {
  // Generate rewards when entering victory phase
  const rewards = encounter.getVictoryRewards();
  phaseHandlerRef.current = new VictoryPhaseHandler(rewards);
}

// In the render section, update the special victory rendering (after defeat screen section):
// Render victory screen overlay (full screen, after all other UI)
if (combatState.phase === 'victory' && phaseHandlerRef.current.renderUI) {
  phaseHandlerRef.current.renderUI(combatState, activeEncounter, {
    ctx,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    tileSize: TILE_SIZE,
    spriteSize: SPRITE_SIZE,
    offsetX: 0,
    offsetY: 0,
    spriteImages: spriteImagesRef.current,
    fontAtlasImages: fontLoader.getAll(),
    combatLog: combatLogManager,
  });
}

// Optional: Add developer testing function (in useEffect with other dev functions)
(window as any).forceVictory = () => {
  console.log('[DEV] Forcing victory screen transition...');
  setCombatState(prevState => ({
    ...prevState,
    phase: 'victory' as const,
  }));
};

// Cleanup
return () => {
  // ... existing cleanups
  delete (window as any).forceVictory;
};
```

**Rationale:** Follows existing DefeatPhaseHandler pattern, generates rewards on phase entry, renders victory modal on top of all UI.

**Dependencies:** Phase 2 (getVictoryRewards), Phase 4 (VictoryPhaseHandler)

**Guidelines Compliance:**
- ✅ Creates fresh phase handler instance on phase entry
- ✅ Passes rewards as constructor parameter
- ✅ Victory modal rendered after all UI (Z-ordering)
- ✅ Dev function for testing

**Estimated Time:** 1 hour

---

### Phase 7: Mouse Input Disabling During Victory
**Files:**
- `react-app/src/components/combat/CombatView.tsx` (mouse event handlers)

**Changes:**
```typescript
// In handleCanvasMouseMove, handleCanvasMouseDown, etc.
// Add early return at the start of each handler:

if (combatState.phase === 'victory') {
  // Only victory phase handler processes events
  if (phaseHandlerRef.current.handleMouseMove) {
    phaseHandlerRef.current.handleMouseMove(
      { canvasX, canvasY },
      combatState,
      activeEncounter
    );
  }
  return; // Don't route to other handlers
}

// Similar pattern for other mouse handlers
```

**Rationale:** Ensures only victory modal responds to mouse events, prevents interactions with combat UI during victory.

**Dependencies:** Phase 4 (VictoryPhaseHandler), Phase 6 (CombatView integration)

**Guidelines Compliance:**
- ✅ Early return pattern (clear control flow)
- ✅ No renderFrame() calls (let animation loop handle it)

**Estimated Time:** 30 minutes

---

### Phase 8: Type Exports
**Files:**
- `react-app/src/models/combat/index.ts`

**Changes:**
```typescript
// Add exports
export type { VictoryRewards } from './CombatEncounter';
export { VictoryPhaseHandler } from './VictoryPhaseHandler';
export { VictoryModalRenderer } from './rendering/VictoryModalRenderer';
```

**Rationale:** Makes types and classes available for imports, follows existing export pattern.

**Dependencies:** Phase 2, Phase 3, Phase 4

**Estimated Time:** 5 minutes

---

### Phase 9: Developer Testing Function (forceVictory)
**Files:**
- `react-app/src/components/combat/CombatView.tsx`

**Purpose:** Add a developer-only function to force transition to victory phase for testing without needing to defeat all enemies.

**Changes:**
```typescript
// In the useEffect that exposes developer mode functions (where forceDefeat is defined)

useEffect(() => {
  // Expose developer mode functions to window (for testing)
  if (import.meta.env.DEV) {
    // ... existing functions (setHitRate, setDamage, clearAttackOverride, forceDefeat)

    // Expose forceVictory function (for testing victory screen)
    (window as any).forceVictory = () => {
      console.log('[DEV] Forcing victory screen transition...');
      setCombatState(prevState => ({
        ...prevState,
        phase: 'victory' as const,
      }));
    };
  }

  // Cleanup on unmount
  return () => {
    if (import.meta.env.DEV) {
      // ... existing cleanups
      delete (window as any).forceVictory;
    }
  };
}, []);
```

**Usage Instructions:**

**In Browser Console:**
```javascript
// Force victory screen to appear immediately
window.forceVictory();
```

**Testing Workflow:**
1. Start combat encounter normally
2. Deploy units in deployment phase
3. Wait for enemy deployment to complete
4. Open browser console (F12)
5. Type `window.forceVictory()` and press Enter
6. Victory screen should appear immediately

**What It Does:**
- Immediately transitions combat state to `phase='victory'`
- Triggers VictoryPhaseHandler creation in CombatView
- Generates random rewards (XP, gold, 0-8 items)
- Displays victory modal overlay
- Does NOT modify unit states (enemies remain alive in background)
- Useful for testing victory screen UI without playing through combat

**Testing Scenarios:**
```javascript
// Test victory screen from different phases
window.forceVictory();  // From action-timer phase
window.forceVictory();  // From unit-turn phase
window.forceVictory();  // From deployment phase (edge case)

// Test multiple times to see different random rewards
window.forceVictory();  // First time - random items
window.forceVictory();  // Again - different random items
```

**Similar to Existing forceDefeat:**
This follows the exact same pattern as the existing `window.forceDefeat()` function added for the defeat screen. Both functions:
- Only available in development mode (`import.meta.env.DEV`)
- Exposed to window object for console access
- Cleaned up on component unmount
- Transition to their respective phases immediately
- Used for rapid testing without playing through combat

**Rationale:**
- Essential for testing victory screen during development
- Allows rapid iteration on UI/UX without defeating enemies
- Enables testing with various reward configurations
- Follows existing pattern from DefeatPhaseHandler testing
- DEV-only, removed in production builds

**Dependencies:** Phase 6 (CombatView Integration)

**Estimated Time:** 10 minutes

**Testing:**
- [ ] window.forceVictory() is available in console (DEV mode)
- [ ] Calling forceVictory() transitions to victory phase
- [ ] Victory modal appears with random rewards
- [ ] Can call forceVictory() multiple times (different rewards each time)
- [ ] Works from any combat phase
- [ ] Function cleaned up on component unmount
- [ ] Function not available in production builds

---

## Testing Plan

### Victory Condition Tests
- [ ] All enemies KO'd triggers victory phase
- [ ] Victory phase transition happens after last enemy defeated
- [ ] Victory message appears in combat log
- [ ] Victory does NOT trigger if any enemy unit alive
- [ ] Victory check happens at end of each unit turn
- [ ] Victory checked BEFORE defeat (player wins ties)
- [ ] Works with 1 enemy
- [ ] Works with multiple enemies

### Visual Rendering Tests
- [ ] Overlay renders (full-screen, 70% black opacity)
- [ ] Modal renders centered on canvas
- [ ] "VICTORY!" title renders (dungeonslant font, yellow)
- [ ] Experience text renders with correct value (white)
- [ ] Gold text renders with correct value (yellow)
- [ ] "Items Found" header renders (white)
- [ ] Item grid layout correct (4 columns per row)
- [ ] 0 items: Empty grid area (no crash)
- [ ] 1 item: Shows in top-left of grid
- [ ] 2-7 items: All visible, correct positions
- [ ] 8 items: Full 4x2 grid populated
- [ ] Item colors correct: grey (default), yellow (hover), green (selected)
- [ ] Helper text shows "Click to loot" when hovering item
- [ ] Helper text hidden when not hovering item
- [ ] "Loot All" button renders
- [ ] "Exit Encounter" button renders
- [ ] Button hover states work (yellow when hovered)
- [ ] All text pixel-perfect (no blurriness)
- [ ] Modal border 2px white

### Item Interaction Tests
- [ ] Items start grey (not selected)
- [ ] Hovering item: turns yellow, helper appears
- [ ] Mouse leaves item: returns to previous color, helper disappears
- [ ] Clicking item: toggles grey → green
- [ ] Clicking selected item: toggles green → grey
- [ ] Multiple items can be selected simultaneously
- [ ] "Loot All" button: selects all items (all turn green)
- [ ] "Loot All" with 0 items: no crash
- [ ] "Loot All" with 1 item: selects the item
- [ ] "Loot All" with 8 items: selects all 8
- [ ] Can deselect items after "Loot All"
- [ ] Item selection persists across mouse movements
- [ ] Clicking between items: no state corruption

### Input Disabling Tests
- [ ] Map panel: no tile hover detection
- [ ] Map panel: no tile click detection
- [ ] Map panel: no unit hover detection
- [ ] Map panel: no unit click detection
- [ ] Info panel: no button interactions
- [ ] Turn order panel: no hover/click
- [ ] Actions menu: not visible
- [ ] Only victory modal items respond to mouse
- [ ] Only victory modal buttons respond to mouse

### Reward Generation Tests
- [ ] Experience value is random (100-600 range)
- [ ] Gold value is random (10-110 range)
- [ ] Item count is random (0-8)
- [ ] All items are unique (no duplicates)
- [ ] Items are valid Equipment instances
- [ ] Rewards regenerate on each victory
- [ ] Empty equipment registry: no crash (0 items)
- [ ] 1-7 items in registry: handles gracefully
- [ ] 8+ items in registry: selects up to 8

### Item Name Truncation Tests
- [ ] Short names (< 30px): display fully
- [ ] Long names (> 30px): truncate correctly
- [ ] Very long names: don't overflow grid
- [ ] Truncation uses binary search (performance)
- [ ] No visual artifacts from truncation

### Button Interaction Tests
- [ ] Hovering "Loot All": turns yellow
- [ ] Hovering "Exit Encounter": turns yellow
- [ ] Clicking "Loot All": selects all items
- [ ] Clicking "Exit Encounter": logs to console
- [ ] Button clicks don't affect item selection state
- [ ] Buttons aligned correctly (16px spacing)

### Edge Cases
- [ ] Victory during animation: completes animation first
- [ ] Last enemy and last player KO simultaneously: victory wins
- [ ] No enemies at start: victory immediate (edge case)
- [ ] Phase handler recreated on re-entry: fresh state
- [ ] Rewards generated fresh each victory
- [ ] Long item names truncated without crash
- [ ] Exit without looting any items: works
- [ ] Exit with partial looting: works
- [ ] Exit with all items looted: works
- [ ] Console logs show looted item IDs on exit

### Developer Functions (Phase 9)
- [ ] window.forceVictory() is available in console (DEV mode)
- [ ] window.forceVictory() transitions to victory phase
- [ ] Victory modal appears with random rewards after calling forceVictory()
- [ ] Can call forceVictory() multiple times (different rewards each time)
- [ ] forceVictory works from any phase (deployment, action-timer, unit-turn)
- [ ] Function cleaned up on unmount removes window.forceVictory
- [ ] Function not available in production builds (import.meta.env.DEV check)

## Implementation Order

1. **Phase 1: Victory Constants** (15 min) - No dependencies
2. **Phase 2: Victory Rewards Data** (30 min) - Depends on #1
3. **Phase 3: Victory Modal Renderer** (3-4 hours) - Depends on #1, #2
4. **Phase 4: Victory Phase Handler** (2-3 hours) - Depends on #1, #2, #3
5. **Phase 5: Victory Condition Integration** (30 min) - Depends on #1
6. **Phase 6: CombatView Integration** (1 hour) - Depends on #2, #4
7. **Phase 7: Mouse Input Disabling** (30 min) - Depends on #4, #6
8. **Phase 8: Type Exports** (5 min) - Depends on #2, #3, #4
9. **Phase 9: Developer Testing Function** (10 min) - Depends on #6

**Total Estimated Time:** 8.5-10.5 hours implementation + 3-4 hours testing = **11.5-14.5 hours total**

## Notes & Decisions

### Decision: Reuse AllEnemiesDefeatedPredicate
- **Choice:** Use existing `AllEnemiesDefeatedPredicate` from CombatPredicate.ts
- **Alternative:** Create new `CombatVictoryCondition` interface as in design doc
- **Rationale:**
  - Predicate system already exists and works
  - Less code duplication
  - Consistent with existing defeat condition pattern
  - Already has serialization support
  - No need for new abstraction layer
- **Tradeoff:** Slightly less flexible than custom interface, but sufficient for current needs

### Decision: Follow DefeatPhaseHandler Pattern Exactly
- **Choice:** Mirror DefeatPhaseHandler structure and patterns
- **Rationale:**
  - Proven pattern that works
  - Easy for developers to understand (consistency)
  - Reduces bugs from novel approaches
  - Guidelines-compliant from the start
- **Additions:** Item grid system, selection tracking, multiple buttons

### Decision: Generate Rewards on Phase Entry
- **Choice:** Call `encounter.getVictoryRewards()` in CombatView when creating VictoryPhaseHandler
- **Alternative:** Generate rewards in phase handler constructor
- **Rationale:**
  - CombatView has access to encounter
  - Phase handler is stateless except for UI state
  - Cleaner separation of concerns
  - Easier to test

### Decision: Use Set for Looted Items
- **Choice:** `lootedItemIds: Set<string>`
- **Alternative:** Array or Map
- **Rationale:**
  - O(1) add/remove/contains operations
  - No duplicates possible
  - Cleaner toggle logic
  - Idiomatic for uniqueness tracking

### Decision: Binary Search for Truncation
- **Choice:** Binary search to find longest fitting substring
- **Alternative:** Linear search or fixed truncation
- **Rationale:**
  - O(log n) vs O(n) performance
  - Pixel-perfect truncation (not character-based)
  - Handles variable-width fonts correctly
  - Professional implementation

### Decision: Placeholder for Exit Encounter
- **Choice:** Console.log only, no actual exit
- **Rationale:**
  - Exit requires inventory system (future feature)
  - Need overworld scene transition (not yet implemented)
  - XP/gold application system (future feature)
  - Better to stub cleanly than half-implement

### Guidelines Compliance Checklist

✅ **Rendering Rules:**
- Use FontAtlasRenderer exclusively (no ctx.fillText)
- Use SpriteRenderer exclusively (not needed for this feature)
- Always disable image smoothing
- Round all coordinates with Math.floor()
- No direct ctx.drawImage on sprite sheets

✅ **State Management:**
- Cache renderer instance (avoid GC pressure)
- Return new state objects (immutability)
- Never mutate state directly
- Use Set for efficient item tracking
- Phase handler recreated on re-entry (fresh state)

✅ **Event Handling:**
- No renderFrame() in mouse handlers
- Update state only, let animation loop render
- Early return for phase checking
- Coordinate transformation for hit detection

✅ **Component Architecture:**
- Separate renderer from phase handler
- Pure rendering functions
- State in phase handler, not renderer
- Clear separation of concerns

✅ **Performance Patterns:**
- Cache renderer instance
- Binary search for truncation (O(log n))
- No per-frame allocations
- Bounds calculated once per frame

✅ **TypeScript Patterns:**
- Use const objects instead of enums (if needed)
- Type-safe event results
- Discriminated unions for result types

## Performance Considerations

**Rendering:**
- Overlay: Single fillRect call (~0.01ms)
- Modal: Rectangle fill + stroke (~0.01ms)
- Text rendering: FontAtlasRenderer (8-10 calls, ~0.5ms total)
- Item grid: 0-8 text renders (~0.4ms worst case)
- Total: < 1ms per frame (negligible)

**Reward Generation:**
- One-time cost on phase entry
- Array iteration: O(n) where n = equipment count
- Set operations: O(1) per item
- Total: < 10ms even with 1000 items

**Input Handling:**
- Bounding box checks: 8 items + 2 buttons = 10 checks
- Each check: 4 comparisons (~0.001ms)
- Total: < 0.01ms per mouse event

**Memory:**
- VictoryPhaseHandler: ~200 bytes
- VictoryModalRenderer: ~200 bytes
- lootedItemIds Set: 8 items × 50 bytes = 400 bytes
- Total: < 1KB (negligible)

**No Performance Issues Expected**

## Future Extensions

### Phase 9 (Future): Item Tooltips
- Show full item stats on hover
- Display name, description, stats
- Positioned next to item (no overlap)

### Phase 10 (Future): Item Rarity Colors
- Common (white), Uncommon (green), Rare (blue), Epic (purple), Legendary (orange)
- Color-code items in grid by rarity
- Update selection colors to work with rarity

### Phase 11 (Future): Animated Rewards
- Count-up animation for XP/gold (0 → final value)
- Items fade in one-by-one (staggered)
- Green glow effect when item selected

### Phase 12 (Future): Equipment Comparison
- Show equipped item stats on hover
- Display stat differences (+2 ATK, -1 DEF)
- Color-code upgrades (green) vs downgrades (red)

### Phase 13 (Future): Auto-Loot Settings
- Setting: "Auto-loot items of rarity X or higher"
- Auto-select on victory screen entry
- Player can still deselect

### Phase 14 (Future): Inventory Full Warning
- Check inventory space before allowing exit
- Warning: "Inventory full. Discard items or reduce selection."
- Force player to deselect or open inventory

### Phase 15 (Future): Victory Statistics
- Display turns taken, damage dealt/taken, units lost
- Compare to best previous run
- Bonus XP/gold for good performance

### Phase 16 (Future): Exit Encounter Implementation
- Apply looted items to player inventory
- Award experience to party members
- Award gold to player purse
- Mark encounter as complete
- Transition to overworld scene
- Save game state

## Success Criteria

This feature is **COMPLETE** when:

1. ✅ Victory condition triggers correctly (all enemies KO'd)
2. ✅ Victory modal renders with all UI elements
3. ✅ Rewards display correctly (XP, gold, 0-8 items)
4. ✅ Item grid renders in 4x2 layout
5. ✅ Item selection works (click to toggle)
6. ✅ Item hover works (yellow + helper text)
7. ✅ "Loot All" selects all items
8. ✅ "Exit Encounter" placeholder works (console.log)
9. ✅ Mouse inputs disabled during victory
10. ✅ Combat log shows victory message
11. ✅ Victory checked before defeat
12. ✅ All edge cases handled gracefully
13. ✅ All tests pass
14. ✅ Build succeeds with no warnings
15. ✅ 100% compliance with GeneralGuidelines.md
16. ✅ Performance within acceptable limits (<1ms per frame)
17. ✅ No visual regressions
18. ✅ Code review approved

## Risk Assessment

**Low Risk:**
- Rendering system exists and works (DefeatPhaseHandler pattern)
- Font system proven and stable
- Constants pattern well-established
- Phase handler pattern well-understood

**Medium Risk:**
- Item grid layout (new complexity)
- Item selection state management (Set-based tracking)
- Reward generation randomness (edge cases)
- Equipment registry integration (dependency on external system)

**Mitigation Strategies:**
- Follow DefeatPhaseHandler pattern closely (reduce unknowns)
- Comprehensive testing of item grid (all 0-8 item counts)
- Test reward generation with empty registry
- Add console logging for debugging
- Implement dev function (window.forceVictory) early

## Dependencies

**Requires:**
- ✅ KO Feature (isKnockedOut property) - EXISTS
- ✅ Equipment system - EXISTS
- ✅ Equipment registry - EXISTS
- ✅ Panel rendering system - EXISTS
- ✅ Font system (dungeonslant, 7px-04b03) - EXISTS
- ✅ CombatPredicate system - EXISTS
- ✅ AllEnemiesDefeatedPredicate - EXISTS

**Relates To:**
- DefeatPhaseHandler (similar pattern)
- DefeatModalRenderer (similar rendering)

**No Blocking Dependencies** - Ready to implement!

---

**End of Victory Screen Implementation Plan**

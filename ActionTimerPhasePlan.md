# Action Timer Phase Implementation Plan

**Version:** 1.0
**Created:** 2025-10-27
**Status:** Ready for Implementation
**Related:** [CombatHierarchy.md](CombatHierarchy.md), [GeneralGuidelines.md](GeneralGuidelines.md)

---

## Overview

Refactor the `BattlePhase` to `ActionTimerPhase`, implementing an Active Time Battle (ATB) system where units' action timers fill based on their speed until they reach 100 and can take their turn.

### Goals

1. Rename `BattlePhaseHandler` → `ActionTimerPhaseHandler`
2. Rename `turnGauge` → `actionTimer` throughout the codebase
3. Implement action timer increment logic with configurable multiplier
4. Detect when units reach 100+ and transition to `UnitTurnPhase`
5. Update turn order display to show action timer values
6. Create stub `UnitTurnPhaseHandler` for future implementation
7. Replace `'battle'` phase with `'action-timer'` in type definitions

---

## Technical Specifications

### Action Timer Mechanics

- **Starting Value**: 0 at combat start
- **Increment Formula**: `actionTimer += speed * deltaTime * ACTION_TIMER_MULTIPLIER`
- **Default Multiplier**: 4
- **Ready Threshold**: ≥100
- **Turn Priority**: Highest action timer acts first
- **Tiebreaker**: Alphabetical by unit name

### Phase Transitions

```
action-timer → (unit ready) → unit-turn → (turn complete) → action-timer
```

### Configuration

```typescript
const ACTION_TIMER_MULTIPLIER = 4; // Constant in ActionTimerPhaseHandler
```

---

## Implementation Steps

### Step 1: Rename Phase Type Definition

**File**: `react-app/src/models/combat/CombatState.ts`

**Changes**:
- Update `CombatPhase` type: replace `'battle'` with `'action-timer'` and add `'unit-turn'`

```typescript
// Before
export type CombatPhase = 'deployment' | 'enemy-deployment' | 'battle' | 'victory' | 'defeat';

// After
export type CombatPhase = 'deployment' | 'enemy-deployment' | 'action-timer' | 'unit-turn' | 'victory' | 'defeat';
```

**Testing**:
- TypeScript compilation should succeed
- No type errors in files referencing `CombatPhase`

---

### Step 2: Rename CombatUnit Field (Interface)

**File**: `react-app/src/models/combat/CombatUnit.ts`

**Changes**:
- Rename `turnGauge` → `actionTimer` in interface
- Update JSDoc comments to reflect new terminology

```typescript
// Before (lines 105-111)
/**
 * Current turn gauge value (0-100)
 * Starts at 0 at combat start
 * Increases by speed each step
 * When reaches 100, unit takes their turn
 * Resets after unit's turn
 */
get turnGauge(): number;

// After
/**
 * Current action timer value (0-100+)
 * Starts at 0 at combat start
 * Increases by speed * deltaTime * ACTION_TIMER_MULTIPLIER each frame
 * When reaches 100+, unit is ready to take their turn
 * Overflow behavior determined by UnitTurnPhase
 */
get actionTimer(): number;
```

**Testing**:
- TypeScript compilation should show errors in implementation files (expected)
- Next steps will fix these errors

---

### Step 3: Rename CombatUnit Field (Implementations)

**Files**:
- `react-app/src/models/combat/HumanoidUnit.ts`
- `react-app/src/models/combat/MonsterUnit.ts`

**Changes in HumanoidUnit.ts**:
- Rename `_turnGauge` → `_actionTimer` (line 71)
- Rename getter `turnGauge()` → `actionTimer()` (lines 188-190)
- Update serialization: `turnGauge` → `actionTimer` in JSON interface and methods (lines 32, 562, 658)

```typescript
// Private field
private _actionTimer: number = 0;

// Getter
get actionTimer(): number {
  return this._actionTimer;
}

// In toJSON()
actionTimer: this._actionTimer,

// In fromJSON()
unit._actionTimer = json.actionTimer;
```

**Changes in MonsterUnit.ts**:
- Same renames as HumanoidUnit.ts
- Update corresponding JSON interface

**Changes in HumanoidUnitJSON interface** (lines 9-39):
```typescript
// Line 32
turnGauge: number;  // → actionTimer: number;
```

**Changes in MonsterUnitJSON interface**:
```typescript
// Similar rename
actionTimer: number;
```

**Testing**:
- Compile and verify no TypeScript errors in unit implementations
- Run unit tests:
  ```bash
  npm test -- HumanoidUnit.test.ts
  npm test -- MonsterUnit.test.ts
  ```
- Verify serialization/deserialization still works

---

### Step 4: Update CombatEffect and CombatUnitModifiers

**Files**:
- `react-app/src/models/combat/CombatEffect.ts`
- `react-app/src/models/combat/CombatUnitModifiers.ts`

**Search for**: Any references to `turnGauge` or `turnGuage` (check for typos)

**Expected**: May have references in stat modification logic

**Action**: Rename to `actionTimer` and update related logic/comments

**Testing**:
- Compile and run tests
- Verify effects that modify speed/turn gauge still function

---

### Step 5: Rename BattlePhaseHandler File

**Action**:
1. Rename file: `BattlePhaseHandler.ts` → `ActionTimerPhaseHandler.ts`
2. Update all imports in files that reference it

**Files to Update Imports**:
- `react-app/src/components/combat/CombatView.tsx`
- Any test files

**Testing**:
- Verify file rename doesn't break imports
- TypeScript compilation succeeds

---

### Step 6: Rename BattlePhaseHandler Class

**File**: `react-app/src/models/combat/ActionTimerPhaseHandler.ts` (renamed)

**Changes**:
- Rename class: `BattlePhaseHandler` → `ActionTimerPhaseHandler`
- Rename info panel: `BattleInfoPanelContent` → `ActionTimerInfoPanelContent`
- Update all JSDoc comments and console logs

```typescript
// Before
export class BattlePhaseHandler extends PhaseBase implements CombatPhaseHandler {
  console.log('[BattlePhaseHandler] Initialized');
}

// After
export class ActionTimerPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  console.log('[ActionTimerPhaseHandler] Initialized');
}
```

**Update Info Panel Text**:
```typescript
// Line 41
FontAtlasRenderer.renderText(
  ctx,
  'Action Timer Phase',  // Changed from 'Battle Phase'
  centerX,
  centerY - 10,
  // ...
);
```

**Testing**:
- TypeScript compilation succeeds
- Console logs show correct class name

---

### Step 7: Update CombatView Phase Switching

**File**: `react-app/src/components/combat/CombatView.tsx`

**Search for**: All references to `'battle'` phase

**Changes**:
1. Replace `'battle'` with `'action-timer'`
2. Update phase handler instantiation
3. Add case for `'unit-turn'` phase (stub)

**Example Changes**:
```typescript
// Phase handler creation
const phaseHandler = useMemo(() => {
  switch (combatState.phase) {
    case 'deployment':
      return new DeploymentPhaseHandler();
    case 'enemy-deployment':
      return new EnemyDeploymentPhaseHandler();
    case 'action-timer':  // Changed from 'battle'
      return new ActionTimerPhaseHandler();
    case 'unit-turn':
      return new UnitTurnPhaseHandler();  // New
    case 'victory':
      return new VictoryPhaseHandler();
    case 'defeat':
      return new DefeatPhaseHandler();
    default:
      return new ActionTimerPhaseHandler();
  }
}, [combatState.phase]);
```

**Search patterns**:
- `case 'battle':`
- `phase === 'battle'`
- `phase: 'battle'`

**Testing**:
- Compile and verify no hardcoded `'battle'` strings remain
- Run the app and verify phase transitions work

---

### Step 8: Implement Action Timer Increment Logic

**File**: `react-app/src/models/combat/ActionTimerPhaseHandler.ts`

**Add Configuration Constant** (after imports):
```typescript
/**
 * Multiplier for action timer fill rate
 * Formula: actionTimer += speed * deltaTime * ACTION_TIMER_MULTIPLIER
 * Higher values = faster combat pacing
 */
const ACTION_TIMER_MULTIPLIER = 4;
```

**Modify `updatePhase()` Method** (lines 144-171):

```typescript
protected updatePhase(
  state: CombatState,
  encounter: CombatEncounter,
  deltaTime: number
): CombatState | null {
  // Check victory/defeat conditions first
  if (encounter.isVictory(state)) {
    console.log('[ActionTimerPhaseHandler] Victory conditions met');
    return {
      ...state,
      phase: 'victory'
    };
  }

  if (encounter.isDefeat(state)) {
    console.log('[ActionTimerPhaseHandler] Defeat conditions met');
    return {
      ...state,
      phase: 'defeat'
    };
  }

  // Increment all units' action timers
  const updatedManifest = this.incrementActionTimers(state.unitManifest, deltaTime);

  // Check if any unit is ready to act (actionTimer >= 100)
  const readyUnit = this.getReadyUnit(updatedManifest);

  if (readyUnit) {
    // Transition to unit-turn phase
    console.log(`[ActionTimerPhaseHandler] ${readyUnit.unit.name} is ready to act (timer: ${readyUnit.unit.actionTimer})`);

    return {
      ...state,
      unitManifest: updatedManifest,
      phase: 'unit-turn'
    };
  }

  // No unit ready, update manifest with new timers
  if (updatedManifest !== state.unitManifest) {
    return {
      ...state,
      unitManifest: updatedManifest
    };
  }

  // No changes
  return state;
}
```

**Add Helper Method: `incrementActionTimers()`**:
```typescript
/**
 * Increment all units' action timers based on their speed
 * @param manifest Current unit manifest
 * @param deltaTime Time since last frame (seconds)
 * @returns New manifest with updated action timers
 */
private incrementActionTimers(
  manifest: CombatUnitManifest,
  deltaTime: number
): CombatUnitManifest {
  // IMPLEMENTATION NOTE: This requires CombatUnitManifest to provide
  // a method to update unit action timers immutably.
  // If not available, will need to create new manifest with updated units.

  // Get all unit placements
  const allUnits = manifest.getAllUnits();

  // For now, return same manifest as units are mutable
  // (Action timer will be updated directly on unit instances)
  for (const placement of allUnits) {
    const increment = placement.unit.speed * deltaTime * ACTION_TIMER_MULTIPLIER;

    // HACK: Direct mutation (not ideal, but matches current architecture)
    // TODO: Refactor to immutable updates when unit state management improves
    (placement.unit as any)._actionTimer += increment;
  }

  return manifest;
}
```

**Add Helper Method: `getReadyUnit()`**:
```typescript
/**
 * Find the unit with highest action timer if any are ready (>= 100)
 * Tiebreaker: alphabetical by name
 * @param manifest Current unit manifest
 * @returns Ready unit placement, or null if none ready
 */
private getReadyUnit(manifest: CombatUnitManifest): UnitPlacement | null {
  const allUnits = manifest.getAllUnits();

  // Filter units with actionTimer >= 100
  const readyUnits = allUnits.filter(p => p.unit.actionTimer >= 100);

  if (readyUnits.length === 0) {
    return null;
  }

  // Sort by actionTimer (descending), then by name (ascending)
  readyUnits.sort((a, b) => {
    // First by timer (highest first)
    if (b.unit.actionTimer !== a.unit.actionTimer) {
      return b.unit.actionTimer - a.unit.actionTimer;
    }
    // Then by name (alphabetical)
    return a.unit.name.localeCompare(b.unit.name);
  });

  return readyUnits[0];
}
```

**Testing**:
- Units' action timers should increment each frame
- When a unit reaches 100, phase should transition to `'unit-turn'`
- Log messages show correct unit name and timer value
- Tiebreaker works correctly (test with multiple units at exactly 100)

---

### Step 9: Update Turn Order Renderer

**File**: `react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts`

**Current Behavior** (lines 178-180 in BattlePhaseHandler):
```typescript
// Get all units and sort by speed (highest first)
const units = state.unitManifest.getAllUnits().map(placement => placement.unit);
const sortedUnits = units.sort((a, b) => b.speed - a.speed);
```

**New Behavior**:
- Sort by `actionTimer` (descending) instead of `speed`
- Show action timer value below each unit sprite

**Changes in ActionTimerPhaseHandler** (`getTopPanelRenderer()`):
```typescript
getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
  // Get all units and sort by actionTimer (highest first)
  const units = state.unitManifest.getAllUnits().map(placement => placement.unit);
  const sortedUnits = units.sort((a, b) => b.actionTimer - a.actionTimer);

  // Limit to 10 units for display
  const displayUnits = sortedUnits.slice(0, 10);

  return new TurnOrderRenderer(displayUnits);
}
```

**Changes in TurnOrderRenderer** (`render()` method, lines 34-66):

Add action timer text rendering below each sprite:

```typescript
render(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement | null,
  spriteImages: Map<string, HTMLImageElement>,
  spriteSize: number
): void {
  // Render units horizontally, starting from the left edge of the region
  let currentX = region.x;
  const spriteY = region.y;

  for (const unit of this.units) {
    // Check if we've exceeded the region width
    if (currentX + this.spriteSize > region.x + region.width) {
      break; // Stop rendering if we run out of space
    }

    // Render the unit sprite
    SpriteRenderer.renderSpriteById(
      ctx,
      unit.spriteId,
      spriteImages,
      spriteSize,
      currentX,
      spriteY,
      this.spriteSize,
      this.spriteSize
    );

    // Render action timer value below sprite (NEW)
    if (fontAtlasImage) {
      const timerValue = Math.floor(unit.actionTimer); // Round down for display
      const timerText = timerValue.toString();
      const textX = currentX + this.spriteSize / 2; // Center under sprite
      const textY = spriteY + this.spriteSize + 2; // 2px below sprite

      FontAtlasRenderer.renderText(
        ctx,
        timerText,
        textX,
        textY,
        fontId,
        fontAtlasImage,
        1, // scale
        'center', // alignment
        '#ffffff' // color
      );
    }

    // Move to next position
    currentX += this.spriteSize + this.spriteSpacing;
  }
}
```

**Testing**:
- Turn order panel shows units sorted by action timer (highest first)
- Action timer values display below each unit
- Values update each frame
- Only 10 units visible at most
- When units reach 100+, they stay at top of list

---

### Step 10: Create UnitTurnPhaseHandler (Stub)

**File**: `react-app/src/models/combat/UnitTurnPhaseHandler.ts` (NEW)

**Implementation**:
```typescript
import { PhaseBase } from './PhaseBase';
import type {
  CombatPhaseHandler,
  PhaseEventResult,
  PhaseRenderContext,
  MouseEventContext,
  PhaseSprites,
  InfoPanelContext
} from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { TopPanelRenderer } from './managers/TopPanelRenderer';
import type { PanelContent } from './managers/panels/PanelContent';
import { TurnOrderRenderer } from './managers/renderers/TurnOrderRenderer';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * Stub info panel content for unit turn phase
 */
class UnitTurnInfoPanelContent implements PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: { x: number; y: number; width: number; height: number },
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;

    FontAtlasRenderer.renderText(
      ctx,
      'Unit Turn Phase',
      centerX,
      centerY - 10,
      fontId,
      fontAtlasImage,
      1,
      'center',
      '#ffffff'
    );

    FontAtlasRenderer.renderText(
      ctx,
      'Turn actions coming soon',
      centerX,
      centerY + 10,
      fontId,
      fontAtlasImage,
      1,
      'center',
      '#888888'
    );
  }

  handleClick?(_relativeX: number, _relativeY: number): unknown {
    return { type: 'none' };
  }

  handleHover?(_relativeX: number, _relativeY: number): unknown {
    return null;
  }
}

/**
 * Unit turn phase handler - manages individual unit turns
 *
 * STUB IMPLEMENTATION: Framework for future turn mechanics
 *
 * Current functionality:
 * - Displays unit ready message in combat log
 * - Placeholder info panel
 * - Immediately returns to action-timer phase
 *
 * Future functionality:
 * - Action menu (Attack, Ability, Move, Wait, End Turn)
 * - Movement range display
 * - Target selection
 * - Action execution
 * - AI enemy turns
 * - Action timer reset/overflow handling
 */
export class UnitTurnPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  private infoPanelContent: UnitTurnInfoPanelContent | null = null;
  private messageWritten: boolean = false;

  constructor() {
    super();
    console.log('[UnitTurnPhaseHandler] Initialized');
  }

  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    const spriteIds = new Set<string>();
    return { spriteIds };
  }

  render(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // No overlays needed for stub
  }

  renderUI(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // No UI overlays needed for stub
  }

  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    _deltaTime: number
  ): CombatState | null {
    // Find the unit with highest action timer
    const allUnits = state.unitManifest.getAllUnits();
    const sortedUnits = allUnits.sort((a, b) => {
      if (b.unit.actionTimer !== a.unit.actionTimer) {
        return b.unit.actionTimer - a.unit.actionTimer;
      }
      return a.unit.name.localeCompare(b.unit.name);
    });

    if (sortedUnits.length > 0 && !this.messageWritten) {
      const readyUnit = sortedUnits[0].unit;

      // Write message to combat log via context
      console.log(`[UnitTurnPhaseHandler] ${readyUnit.name} is ready to act.`);

      // TODO: Add to combat log when available
      // context.combatLog?.addMessage(`${readyUnit.name} is ready to act.`);

      this.messageWritten = true;
    }

    // STUB: Immediately return to action-timer phase
    // TODO: Implement turn mechanics here

    // For now, just transition back after one frame
    if (this.messageWritten) {
      console.log('[UnitTurnPhaseHandler] Returning to action-timer phase (stub)');

      return {
        ...state,
        phase: 'action-timer'
      };
    }

    return state;
  }

  getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
    // Show same turn order as action-timer phase
    const units = state.unitManifest.getAllUnits().map(placement => placement.unit);
    const sortedUnits = units.sort((a, b) => b.actionTimer - a.actionTimer);
    const displayUnits = sortedUnits.slice(0, 10);

    return new TurnOrderRenderer(displayUnits);
  }

  getInfoPanelContent(
    _context: InfoPanelContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PanelContent | null {
    if (!this.infoPanelContent) {
      this.infoPanelContent = new UnitTurnInfoPanelContent();
    }

    return this.infoPanelContent;
  }

  handleMapClick(
    context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    console.log(`[UnitTurnPhaseHandler] Map clicked at tile (${context.tileX}, ${context.tileY})`);

    return {
      handled: true,
      logMessage: `Clicked tile (${context.tileX}, ${context.tileY})`
    };
  }

  handleMouseMove(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return {
      handled: false
    };
  }
}
```

**Testing**:
- Phase transitions to `unit-turn` when unit reaches 100
- Stub writes message to console log
- Phase immediately transitions back to `action-timer`
- Renders turn order in top panel
- Placeholder info panel displays

---

### Step 11: Update EnemyDeploymentPhaseHandler Transition

**File**: `react-app/src/models/combat/EnemyDeploymentPhaseHandler.ts`

**Search for**: Transition to `'battle'` phase

**Expected Location**: `updatePhase()` method

**Change**:
```typescript
// Before
return {
  ...state,
  phase: 'battle'
};

// After
return {
  ...state,
  phase: 'action-timer'
};
```

**Testing**:
- Complete enemy deployment phase
- Verify transition goes to `action-timer` instead of `battle`

---

### Step 12: Search and Replace Remaining References

**Search Patterns**:
1. `'battle'` (with quotes)
2. `BattlePhase` (class names, comments)
3. `turnGauge` / `turnGuage` (check for typos)

**Files to Check**:
- All `.ts` and `.tsx` files in `react-app/src/models/combat/`
- All test files
- `CombatHierarchy.md` documentation
- Any serialization/deserialization code

**Action**:
- Replace `'battle'` → `'action-timer'`
- Replace `BattlePhase` → `ActionTimerPhase` (in comments/docs)
- Replace `turnGauge` → `actionTimer`

**Testing**:
- Run full TypeScript compilation
- Search for lingering references:
  ```bash
  grep -r "battle" react-app/src/models/combat/
  grep -r "turnGauge\|turnGuage" react-app/src/models/combat/
  ```

---

### Step 13: Update Tests

**Files**:
- `react-app/src/models/combat/HumanoidUnit.test.ts`
- `react-app/src/models/combat/MonsterUnit.test.ts`
- `react-app/src/models/combat/CombatEncounter.test.ts` (if it exists)
- Any other test files referencing combat state/units

**Changes**:
1. Replace `turnGauge` → `actionTimer` in test assertions
2. Replace `'battle'` → `'action-timer'` in phase checks
3. Update serialization tests to use new field names
4. Add test cases for action timer increment logic
5. Add test cases for unit ready detection

**New Test Cases** (add to appropriate test file):

```typescript
describe('ActionTimerPhaseHandler', () => {
  it('should increment action timers each frame', () => {
    // Setup: Create encounter with units
    // Act: Call updatePhase() with deltaTime
    // Assert: Units' actionTimers increased correctly
  });

  it('should transition to unit-turn when unit reaches 100', () => {
    // Setup: Create unit with actionTimer = 99.5, speed = 10, deltaTime = 0.01
    // Act: Call updatePhase()
    // Assert: Phase is 'unit-turn'
  });

  it('should select unit with highest timer', () => {
    // Setup: Create multiple units with different timers (all >= 100)
    // Act: Call updatePhase()
    // Assert: Log shows correct unit selected
  });

  it('should break ties alphabetically', () => {
    // Setup: Create units "Zombie" and "Goblin" both at 100
    // Act: Call updatePhase()
    // Assert: "Goblin" selected (alphabetically first)
  });
});
```

**Testing**:
- Run all tests: `npm test`
- Verify serialization round-trips correctly
- All existing tests pass with renamed fields

---

### Step 14: Update CombatHierarchy.md Documentation

**File**: `CombatHierarchy.md`

**Changes**:

1. **Update BattlePhaseHandler section** (lines 136-156):
   - Rename to `ActionTimerPhaseHandler`
   - Update description to explain action timer logic
   - Note the `ACTION_TIMER_MULTIPLIER` constant
   - Document turn order sorting by action timer

2. **Add UnitTurnPhaseHandler section** (after ActionTimerPhaseHandler):
   ```markdown
   #### `UnitTurnPhaseHandler.ts`
   **Purpose:** Individual unit turn phase (STUB IMPLEMENTATION)
   **Exports:** `UnitTurnPhaseHandler`, `UnitTurnInfoPanelContent`
   **Key Methods:** updatePhase(), getTopPanelRenderer(), getInfoPanelContent()
   **Current Functionality:**
   - Identifies unit with highest action timer
   - Writes "{Unit Name} is ready to act." message
   - Immediately returns to action-timer phase
   **Future Functionality:**
   - Action menu (Attack, Ability, Move, Wait, End Turn)
   - Movement/attack range display
   - Target selection and action execution
   - Action timer reset/overflow handling
   - AI enemy turn logic
   **Dependencies:** PhaseBase, TurnOrderRenderer
   **Used By:** CombatView during unit-turn phase
   **Transitions To:** action-timer phase
   ```

3. **Update Phase Transition Flow** (line 623):
   ```markdown
   ### Phase Transition Flow
   1. **User action** → triggers phase transition (e.g., Enter Combat button)
   2. **Phase handler** → returns PhaseEventResult with transitionTo OR update() returns new state with different phase
   3. **CombatView** → updates state.phase
   4. **useEffect** → detects phase change, creates new phase handler
   5. **New phase handler** → initialized, getRequiredSprites() called
   6. **CinematicManager** → may play transition sequence
   7. **Render loop** → continues with new phase

   **Action Timer → Unit Turn Transition:**
   1. **ActionTimerPhaseHandler** → increments all units' action timers
   2. **Unit reaches 100+** → handler detects via getReadyUnit()
   3. **Return new state** → `{ ...state, phase: 'unit-turn' }`
   4. **CombatView** → captures updated state, calls setCombatState()
   5. **useEffect** → creates UnitTurnPhaseHandler
   6. **UnitTurnPhaseHandler** → writes message, immediately transitions back to 'action-timer'
   ```

4. **Update File Count** (line 754):
   - Increment "Phase Handlers" count from 5 to 6

**Testing**:
- Read through documentation to ensure accuracy
- Verify all section references are correct

---

### Step 15: Final Integration Testing

**Manual Test Scenarios**:

1. **Basic Action Timer Flow**:
   - Start a combat encounter
   - Observe action timers incrementing in turn order panel
   - Verify units move up/down in list as timers change
   - Verify fastest unit reaches 100 first

2. **Phase Transition**:
   - Wait for a unit to reach 100
   - Verify phase transitions to `unit-turn`
   - Verify console log shows "{Unit Name} is ready to act."
   - Verify phase immediately returns to `action-timer`

3. **Turn Order Display**:
   - Verify turn order panel shows units sorted by action timer
   - Verify timer values display below sprites
   - Verify values update every frame
   - Test with 10+ units to verify only 10 are shown

4. **Tiebreaker**:
   - Use save/load to set multiple units to exactly 100
   - Verify alphabetically first unit is selected

5. **Multiple Cycles**:
   - Let combat run through several turn cycles
   - Verify action timers continue working correctly
   - Verify phase transitions are smooth

6. **Serialization**:
   - Save combat state during action-timer phase
   - Load saved state
   - Verify action timers restored correctly
   - Verify phase continues correctly

**Automated Test Coverage**:
- Action timer increment calculation
- Ready unit detection (threshold 100)
- Turn priority sorting (highest first)
- Alphabetical tiebreaker
- Phase transition logic
- Serialization/deserialization of action timer values

**Performance Testing**:
- Monitor frame rate with 20+ units
- Verify action timer updates don't cause lag
- Profile `incrementActionTimers()` and `getReadyUnit()` methods

---

## Edge Cases and Considerations

### Edge Case 1: Multiple Units Ready Simultaneously

**Scenario**: Two units reach 100+ on the same frame

**Behavior**:
- Both will be >= 100
- `getReadyUnit()` sorts and selects highest timer
- If timers are equal, alphabetical tiebreaker applies

**Testing**: Set multiple units to 99.9, let them all cross threshold

---

### Edge Case 2: Very High Speed Units

**Scenario**: Unit with speed 100+ gains huge timer increments

**Behavior**:
- Action timer will exceed 100 significantly
- Selection still works correctly (highest timer)
- Future: Overflow carries to next turn

**Testing**: Create unit with speed 200, verify timer increments correctly

---

### Edge Case 3: Zero or Negative Speed

**Scenario**: Unit with speed 0 or negative (from status effects)

**Behavior**:
- Timer won't increment (or decrements)
- Unit will never become ready
- Other units will cycle normally

**Testing**: Set unit speed to 0, verify it never reaches 100

---

### Edge Case 4: Phase Transition During Animation

**Scenario**: Cinematic playing when unit becomes ready

**Behavior**:
- Animation loop checks `!cinematicPlaying` before calling `update()`
- Phase transition waits until cinematic completes
- Action timers continue incrementing during cinematic (potential issue)

**Consideration**: May need to pause action timer updates during cinematics

**Testing**: Trigger cinematic while unit is at 95-99, verify behavior

---

### Edge Case 5: Serialization with In-Flight Transition

**Scenario**: Save game right when unit hits 100 during `unit-turn` phase

**Behavior**:
- Phase saved as `'unit-turn'`
- Unit's action timer >= 100
- On load, stub runs and returns to `action-timer`
- Timer still >= 100, immediately triggers transition again

**Consideration**: May want to reset timer on phase transition in future

**Testing**: Save during unit-turn phase, load, verify behavior

---

### Edge Case 6: All Units Defeated Mid-Timer Update

**Scenario**: Last enemy defeated, but timers still updating

**Behavior**:
- `updatePhase()` checks victory/defeat BEFORE timer logic
- Transitions to victory phase immediately
- Timer updates never execute

**Testing**: Kill last enemy, verify immediate victory transition

---

## Rollback Plan

If implementation fails or causes critical bugs:

1. **Revert File Renames**:
   - `ActionTimerPhaseHandler.ts` → `BattlePhaseHandler.ts`
   - Restore class names

2. **Revert Field Renames**:
   - `actionTimer` → `turnGauge` in all files
   - Restore JSON field names

3. **Revert Phase Type**:
   - `'action-timer'` → `'battle'`
   - Remove `'unit-turn'` from type definition

4. **Delete Stub**:
   - Remove `UnitTurnPhaseHandler.ts`

5. **Restore Original Logic**:
   - Revert `updatePhase()` to original stub
   - Restore turn order sorting by speed

6. **Run Tests**:
   - Verify all tests pass
   - Verify serialization works

---

## Success Criteria

- [ ] All files compile without TypeScript errors
- [ ] All existing tests pass
- [ ] New tests for action timer logic pass
- [ ] Action timers increment correctly each frame
- [ ] Turn order display shows action timer values
- [ ] Units transition to `unit-turn` phase when ready
- [ ] Alphabetical tiebreaker works correctly
- [ ] Serialization round-trips preserve action timer values
- [ ] Documentation updated in CombatHierarchy.md
- [ ] No lingering references to `'battle'` or `turnGauge`
- [ ] Manual testing confirms expected behavior
- [ ] Performance is acceptable with 20+ units

---

## Future Enhancements (Out of Scope)

These improvements are noted for future work but not part of this plan:

1. **Timer Overflow Handling**: Subtract 100 from timer after turn instead of resetting to 0
2. **Speed Modifiers**: Status effects that change speed during combat
3. **Time Stop Effects**: Abilities that freeze timers for specific units
4. **Haste/Slow Effects**: Temporary speed multipliers
5. **Timer Display Scaling**: Show projected turn order further into future
6. **Timer Bars**: Visual bars instead of just numbers
7. **Configurable Multiplier**: UI control for ACTION_TIMER_MULTIPLIER
8. **AI Prediction**: AI uses action timer to predict when to use abilities

---

## Notes for Future Implementers

### Why Direct Mutation?

The `incrementActionTimers()` method directly mutates unit instances:
```typescript
(placement.unit as any)._actionTimer += increment;
```

**Rationale**:
- Current architecture doesn't support immutable unit updates
- CombatUnitManifest doesn't provide update methods
- Full immutability would require significant refactoring
- Mutation is isolated and doesn't break React change detection (manifest reference changes)

**Future Improvement**: Implement proper immutable update pattern when refactoring unit state management.

---

### ACTION_TIMER_MULTIPLIER Tuning

Default value of 4 is estimated, may need adjustment:
- **Too low**: Combat feels slow, turns take forever
- **Too high**: Combat feels frantic, hard to read turn order
- **Recommended**: Test with encounters of 2-4 units first, adjust to taste

Formula: At speed 10, timer fills in `100 / (10 * 4) = 2.5 seconds` (at 60 FPS)

---

### Console Logging

Extensive console logs included for debugging:
- Phase transitions
- Unit ready detection
- Timer values

**Recommendation**: Keep these during initial testing, remove or gate behind debug flag once stable.

---

**End of Plan**

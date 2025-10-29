# Attack Action - Modified Files Manifest

**Purpose:** Track all files created/modified during Attack Action implementation

**Last Updated:** 2025-10-29

---

## Summary Statistics

- **Files Created:** 5
- **Files Modified:** 8
- **Total Changed:** 13 files
- **Branches:** `attack-action`, `attack-action-preview-range`

---

## Files Created (5)

### Step 1: Attack Menu Panel

#### 1. `react-app/src/managers/panels/AttackMenuContent.ts`
**Lines:** ~230
**Purpose:** Attack menu panel UI component
**Created in:** `attack-action` branch (commit `70ed5a0`)
**Features:**
- Panel title "Attack" in orange
- Cancel button (bottom-right)
- Placeholder content area
- Implements `PanelContent` interface
- Click handling returns `{ type: 'cancel-attack' }`

**Key Methods:**
- `render()` - Renders panel with title and cancel button
- `handleClick()` - Detects cancel button clicks
- `handleHover()` - Detects cancel button hover

---

### Step 2: Attack Range Preview

#### 2. `react-app/src/models/combat/utils/LineOfSightCalculator.ts`
**Lines:** ~115
**Purpose:** Line of sight calculation using Bresenham's algorithm
**Created in:** `attack-action-preview-range` branch
**Features:**
- Bresenham's line algorithm implementation
- Traces line between two positions
- Blocks on walls (non-walkable terrain)
- Blocks on units (both friendly and enemy)
- Excludes start/end positions from blocking

**Key Methods:**
- `hasLineOfSight(options)` → `boolean` - Main entry point
- `getLinePositions(from, to)` → `Position[]` - Bresenham's algorithm

**Algorithm:** Standard Bresenham with integer-only arithmetic

---

#### 3. `react-app/src/models/combat/utils/AttackRangeCalculator.ts`
**Lines:** ~115
**Purpose:** Calculate attack range tiles using Manhattan distance
**Created in:** `attack-action-preview-range` branch
**Features:**
- Manhattan distance (orthogonal) range calculation
- Supports min/max weapon range
- Categorizes tiles into 3 arrays: `inRange`, `blocked`, `validTargets`
- Checks walls before line of sight (optimization)
- Supports friendly fire (all units are valid targets)

**Key Methods:**
- `calculateAttackRange(options)` → `AttackRangeTiles` - Main calculation
- `getTilesInRange(center, minRange, maxRange, map)` → `Position[]` - Manhattan distance helper

**Returns:**
```typescript
{
  inRange: Position[];      // All tiles within weapon range
  blocked: Position[];      // Tiles blocked by walls or no LOS
  validTargets: Position[]; // Tiles with units (any unit)
}
```

---

### Documentation Files

#### 4. `AttackActionImpl/02-AddRangePreview.md`
**Lines:** ~233
**Purpose:** Implementation summary for Step 2 (Range Preview)
**Created in:** `attack-action-preview-range` branch
**Contents:**
- Overview of range preview feature
- File changes summary
- Technical details (algorithms, color system, rendering)
- Testing notes
- Code review summary
- Performance highlights

---

#### 5. `AttackActionImpl/02-AddRangePreview-CodeReview.md`
**Lines:** ~500+
**Purpose:** Comprehensive code review against GeneralGuidelines.md
**Created in:** Documentation phase
**Contents:**
- Executive summary (APPROVED FOR MERGE)
- Detailed review by category (6 sections)
- Code excerpts with line numbers
- Minor recommendations (2 optional improvements)
- Guidelines compliance checklist
- Test coverage recommendations

---

## Files Modified (8)

### Step 1: Attack Menu Panel

#### 1. `react-app/src/models/combat/strategies/PlayerTurnStrategy.ts`
**Branch:** `attack-action` (commit `70ed5a0`)
**Changes:**
- Added `'attackSelection'` to `StrategyMode` type (line ~17)
- Added `handleActionSelected()` method - handles 'attack' action ID
- Added `toggleAttackMode()`, `enterAttackMode()`, `exitAttackMode()` methods
- Added `handleCancelAttack()` method - exits attack mode
- Added `getMode()` getter - returns current mode string

**Lines Modified:** ~50 added

---

#### 2. `react-app/src/models/combat/UnitTurnPhaseHandler.ts`
**Branch:** `attack-action` (commit `70ed5a0`)
**Changes:**
- Added `getActiveAction()` method - returns 'attack' when strategy mode is 'attackSelection'
- Added `handleCancelAttack()` method - delegates to strategy
- Added `handleActionSelected()` method - forwards to strategy

**Lines Modified:** ~30 added

**Key Methods Added:**
```typescript
getActiveAction(): string | null {
  const strategyMode = this.currentStrategy?.getMode() ?? 'normal';
  if (strategyMode === 'moveSelection') return 'move';
  if (strategyMode === 'attackSelection') return 'attack';
  return null;
}
```

---

#### 3. `react-app/src/managers/CombatLayoutManager.ts`
**Branch:** `attack-action` (commit `70ed5a0`)
**Changes:**
- Imports `AttackMenuContent`
- Updated `getBottomPanelContent()` logic:
  - Shows `AttackMenuContent` when `activeAction === 'attack'`
  - Shows `ActionsMenuContent` otherwise
- Panel switching based on active action state

**Lines Modified:** ~10 added/changed

**Logic:**
```typescript
if (activeAction === 'attack') {
  return this.getCachedAttackMenuContent();
} else {
  return this.getCachedActionsMenuContent(context);
}
```

---

#### 4. `react-app/src/views/CombatView.tsx`
**Branch:** `attack-action` (commit `70ed5a0`)
**Changes:**
- Added handling for `'cancel-attack'` click result type
- Calls `phaseHandler.handleCancelAttack()` when cancel clicked
- Triggers `renderFrame()` to update UI

**Lines Modified:** ~5 added

**Code:**
```typescript
case 'cancel-attack':
  if ('handleCancelAttack' in phaseHandlerRef.current) {
    (phaseHandlerRef.current as any).handleCancelAttack();
    renderFrame();
  }
  break;
```

---

### Step 2: Attack Range Preview

#### 5. `react-app/src/models/combat/CombatConstants.ts`
**Branch:** `attack-action-preview-range`
**Changes:**
- Added 6 color constants under `UNIT_TURN` section:
  - `ATTACK_RANGE_BASE_COLOR: '#ff0000'` (Red - base range)
  - `ATTACK_RANGE_BLOCKED_COLOR: '#ffffff'` (White - blocked tiles)
  - `ATTACK_TARGET_VALID_COLOR: '#ffff00'` (Yellow - valid targets)
  - `ATTACK_TARGET_HOVER_COLOR: '#ffa500'` (Orange - hovered target)
  - `ATTACK_TARGET_SELECTED_COLOR: '#00ff00'` (Green - selected target, future)
  - `ATTACK_RANGE_ALPHA: 0.33` (Semi-transparent)

**Lines Modified:** ~7 added

**Color Evolution:**
- Blocked color changed: `#808080` (grey) → `#1a1a1a` (black) → `#ffffff` (white)

---

#### 6. `react-app/src/models/combat/strategies/TurnStrategy.ts`
**Branch:** `attack-action-preview-range`
**Changes:**
- Added import for `AttackRangeTiles` type
- Added optional method `getAttackRange?(): AttackRangeTiles | null`
- Added optional method `getHoveredAttackTarget?(): Position | null`

**Lines Modified:** ~3 added

**Interface Addition:**
```typescript
/**
 * Get attack range tiles (only valid in attack mode)
 * Returns null if not in attack mode
 */
getAttackRange?(): AttackRangeTiles | null;

/**
 * Get hovered attack target position (only valid in attack mode)
 * Returns null if not hovering over a valid target
 */
getHoveredAttackTarget?(): Position | null;
```

---

#### 7. `react-app/src/models/combat/strategies/PlayerTurnStrategy.ts`
**Branch:** `attack-action-preview-range`
**Changes:**
- Added attack range state variables:
  - `attackRange: AttackRangeTiles | null` - Cached attack range
  - `hoveredAttackTarget: Position | null` - Currently hovered target
  - `attackRangeCachedPosition: Position | null` - Position used for calculation
- Updated `onTurnStart()` to reset attack state
- Updated `onTurnEnd()` to clean up attack state
- Updated `getMovementRange()` to return empty array in attack mode
- Updated `enterAttackMode()`:
  - Exits move mode if active
  - Deselects all units
  - Gets current position from manifest (not cached `activePosition`)
  - Retrieves weapon range from equipped weapons
  - Calculates attack range using `AttackRangeCalculator`
  - Caches position used for calculation
- Updated `exitAttackMode()` to re-select active unit
- Added `getAttackRange()` with position change detection and recalculation
- Added `getHoveredAttackTarget()` getter
- Added `updateHoveredAttackTarget(position)` - Checks if position is valid target
- Added `recalculateAttackRange()` - Recalculates when position changes
- Updated `handleMouseMove()` to update hovered target in attack mode

**Lines Modified:** ~150 added

**Key Algorithm (Position Change Detection):**
```typescript
getAttackRange(): AttackRangeTiles | null {
  if (this.activeUnit && this.currentState) {
    const currentPosition = this.currentState.unitManifest.getUnitPosition(this.activeUnit);
    if (currentPosition &&
        (currentPosition.x !== this.attackRangeCachedPosition.x ||
         currentPosition.y !== this.attackRangeCachedPosition.y)) {
      this.recalculateAttackRange(); // Position changed
    }
  }
  return this.attackRange;
}
```

---

#### 8. `react-app/src/models/combat/UnitTurnPhaseHandler.ts`
**Branch:** `attack-action-preview-range`
**Changes:**
- Updated `renderUI()` method to render attack range highlights
- Added priority-based color system using Map:
  1. Build Map of position → color
  2. Apply colors in priority order (red → white → yellow → orange)
  3. Render each tile exactly once with final color
- Renders attack range AFTER units (overlays, Z-order)
- Uses cached tinting buffer for semi-transparent rendering

**Lines Modified:** ~60 added to `renderUI()`

**Key Implementation:**
```typescript
// Build a map of position -> color (priority-based)
const tileColors = new Map<string, string>();

// Red for base range (lowest priority)
for (const position of attackRange.inRange) {
  tileColors.set(posKey(position), ATTACK_RANGE_BASE_COLOR);
}

// White for blocked (higher priority - overwrites red)
for (const position of attackRange.blocked) {
  tileColors.set(posKey(position), ATTACK_RANGE_BLOCKED_COLOR);
}

// Yellow for valid targets (even higher priority)
for (const position of attackRange.validTargets) {
  tileColors.set(posKey(position), ATTACK_TARGET_VALID_COLOR);
}

// Orange for hovered target (highest priority)
if (hoveredAttackTarget) {
  tileColors.set(posKey(hoveredAttackTarget), ATTACK_TARGET_HOVER_COLOR);
}

// Render each tile exactly once
for (const [key, color] of tileColors.entries()) {
  // ... render with final color
}
```

**Performance Optimization:**
- Single-color-per-tile approach reduces draw calls by ~75%
- Earlier iteration rendered 4 overlapping layers (red + white + yellow + orange)

---

## Minor Data File Changes (Not Implementation)

### Test Data Updates

#### 9. `react-app/src/data/equipment-definitions.yaml`
**Branch:** `attack-action-preview-range`
**Changes:** Equipment reordering (no functional changes)
**Purpose:** Cleanup/organization

---

#### 10. `react-app/src/data/party-definitions.yaml`
**Branch:** `attack-action-preview-range`
**Changes:** Updated party member equipment for testing attack ranges
**Equipment Changes:**
- Ramza: Flame Blade (1-2 range)
- Agrias: War Bow (2-5 range)
- Ovelia: Heavy Crossbow (2-3 range)

**Purpose:** Test different weapon ranges during development

---

## File Change Timeline

### Commit `70ed5a0` - Step 1: Attack Menu Panel
```
Created:
- managers/panels/AttackMenuContent.ts

Modified:
- strategies/PlayerTurnStrategy.ts
- UnitTurnPhaseHandler.ts
- managers/CombatLayoutManager.ts
- views/CombatView.tsx
```

### Branch `attack-action-preview-range` - Step 2: Range Preview
```
Created:
- utils/LineOfSightCalculator.ts
- utils/AttackRangeCalculator.ts

Modified:
- CombatConstants.ts
- strategies/TurnStrategy.ts
- strategies/PlayerTurnStrategy.ts
- UnitTurnPhaseHandler.ts
- data/equipment-definitions.yaml (minor)
- data/party-definitions.yaml (test data)
```

---

## File Categories

### Core Logic (Strategy Pattern)
- `strategies/PlayerTurnStrategy.ts` - Attack mode state, range calculation
- `strategies/TurnStrategy.ts` - Interface definitions

### Phase Handler
- `UnitTurnPhaseHandler.ts` - Rendering, active action state

### UI Components
- `managers/panels/AttackMenuContent.ts` - Attack menu panel

### Utilities
- `utils/AttackRangeCalculator.ts` - Range calculation
- `utils/LineOfSightCalculator.ts` - Line of sight checks

### Layout & View
- `managers/CombatLayoutManager.ts` - Panel switching
- `views/CombatView.tsx` - Event handling

### Constants
- `CombatConstants.ts` - Color definitions

### Data Files (Test)
- `data/equipment-definitions.yaml` - Equipment data
- `data/party-definitions.yaml` - Party data

---

## Lines of Code Added

### Step 1: Attack Menu Panel
- **Created:** ~230 lines (AttackMenuContent.ts)
- **Modified:** ~95 lines across 4 files
- **Total:** ~325 lines

### Step 2: Attack Range Preview
- **Created:** ~230 lines (2 utility files)
- **Modified:** ~220 lines across 5 files
- **Total:** ~450 lines

### Grand Total
- **New Code:** ~775 lines
- **Documentation:** ~733 lines (implementation docs + code review)
- **Overall:** ~1,508 lines for Attack Action (Steps 1-2)

---

## Impact Analysis

### High Impact (Core Logic)
- `PlayerTurnStrategy.ts` - Major state additions (~200 lines total)
- `UnitTurnPhaseHandler.ts` - Rendering and delegation (~90 lines total)

### Medium Impact (Infrastructure)
- `AttackMenuContent.ts` - New panel component (~230 lines)
- `AttackRangeCalculator.ts` - New utility (~115 lines)
- `LineOfSightCalculator.ts` - New utility (~115 lines)

### Low Impact (Glue Code)
- `CombatLayoutManager.ts` - Panel switching (~10 lines)
- `CombatView.tsx` - Event handling (~5 lines)
- `TurnStrategy.ts` - Interface extension (~3 lines)
- `CombatConstants.ts` - Color constants (~7 lines)

### No Impact (Test Data)
- `equipment-definitions.yaml` - Reordering only
- `party-definitions.yaml` - Test equipment changes

---

## Dependency Graph

```
CombatView.tsx
    ↓
UnitTurnPhaseHandler.ts
    ↓
PlayerTurnStrategy.ts
    ↓ (uses)
AttackRangeCalculator.ts
    ↓ (uses)
LineOfSightCalculator.ts

CombatLayoutManager.ts
    ↓ (renders)
AttackMenuContent.ts

UnitTurnPhaseHandler.ts
    ↓ (reads)
CombatConstants.ts
```

---

## Next Files to Modify (Step 3: Target Selection)

### Expected Changes
- `PlayerTurnStrategy.ts` - Add `selectedTarget` state, click handling
- `UnitTurnPhaseHandler.ts` - Render green highlight for selected target
- `AttackMenuContent.ts` - Display selected target, weapon stats, hit%, damage
- `utils/CombatCalculations.ts` (NEW) - Hit chance and damage stubs

---

**End of Manifest**

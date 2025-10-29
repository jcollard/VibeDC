# Attack Action - Modified Files Manifest

**Purpose:** Track all files created/modified during Attack Action implementation

**Last Updated:** 2025-10-29 (Step 3 Complete)

---

## Summary Statistics

- **Files Created:** 8
- **Files Modified:** 14
- **Total Changed:** 22 files
- **Branches:** `attack-action`, `attack-action-preview-range`, `attack-action-03-show-info`

---

## Files Created (8)

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

### Step 3: Target Selection and Attack Info Display

#### 6. `react-app/src/models/combat/utils/CombatCalculations.ts`
**Lines:** ~54
**Purpose:** Combat calculation utilities (stub implementations)
**Created in:** `attack-action-03-show-info` branch
**Features:**
- `getChanceToHit()` - Returns 1.0 (100% hit rate) as stub
- `calculateAttackDamage()` - Returns 1 (1 damage) as stub
- Properly typed parameters (attacker, defender, weapon, distance, damage type)
- Clear JSDoc comments marking methods as `@stub` with `@future` implementation notes
- Static utility class (no state)

**Key Methods:**
```typescript
static getChanceToHit(
  attacker: CombatUnit,
  defender: CombatUnit,
  distance: number,
  damageType: 'physical' | 'magical'
): number // Returns 0.0-1.0

static calculateAttackDamage(
  attacker: CombatUnit,
  weapon: Equipment,
  defender: CombatUnit,
  distance: number,
  damageType: 'physical' | 'magical'
): number // Returns integer damage
```

**Purpose:** Provides clean interface for future formula implementation without changing UI code

---

### Documentation Files (Step 3)

#### 7. `AttackActionImpl/03-AttackActionTargetInfo.md`
**Lines:** ~421
**Purpose:** Implementation summary for Step 3 (Target Selection)
**Created in:** `attack-action-03-show-info` branch
**Contents:**
- Overview of target selection feature
- New files created (1) and modified files (9)
- Features implemented (target selection, attack info display, dual wielding)
- Technical details (color system, data flow, layout)
- User experience flow (before/after target selection)
- Design decisions (5 key architectural choices)
- Code review summary section

---

#### 8. `AttackActionImpl/03-AttackActionTargetInfo-CodeReview.md`
**Lines:** ~639
**Purpose:** Comprehensive code review against GeneralGuidelines.md
**Created in:** Documentation phase
**Contents:**
- Executive summary (APPROVED FOR MERGE - 100% compliance)
- Detailed review by category (6 guideline sections)
- Code excerpts with line numbers and analysis
- New feature analysis (stub system, position flow, dual wielding)
- Performance analysis (memory impact, runtime performance)
- Minor observations (2 optional enhancements, non-blocking)

---

## Files Modified (14)

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

### Step 3: Target Selection and Attack Info Display

#### 9. `react-app/src/components/combat/CombatView.tsx`
**Branch:** `attack-action-03-show-info`
**Changes:**
- Added position data retrieval for current unit and target unit
- Queries `unitManifest.getUnitPosition()` for both units
- Passes `currentUnitPosition` and `targetUnitPosition` through render context
- Clears target when strategy has no targeted unit (prevents stale data)
- Ensures position data flows to layout system for distance calculations

**Lines Modified:** ~12 added

**Key Code:**
```typescript
if (currentUnitToDisplay) {
  currentUnitPosition = combatState.unitManifest.getUnitPosition(currentUnitToDisplay) ?? null;
}
// ...
if (targeted) {
  targetUnitToDisplay = targeted;
  targetUnitPosition = combatState.unitManifest.getUnitPosition(targeted) ?? null;
} else {
  // Clear target if strategy has no targeted unit
  targetUnitToDisplay = null;
  targetUnitPosition = null;
}
```

---

#### 10. `react-app/src/models/combat/UnitTurnPhaseHandler.ts`
**Branch:** `attack-action-03-show-info`
**Changes:**
- Added retrieval of `selectedAttackTarget` from strategy
- Updated attack range color priority system to 5 levels (was 4):
  1. Green (selected target) - highest priority ← NEW
  2. Orange (hovered target)
  3. Yellow (valid target)
  4. Grey/White (blocked)
  5. Red (base range) - lowest priority
- Renders selected target with green highlight on map

**Lines Modified:** ~10 added, ~7 modified

**Key Addition:**
```typescript
const selectedAttackTarget = this.currentStrategy?.getSelectedAttackTarget?.() ?? null;

// ...priority system...

// Override with green for selected target (highest priority)
if (selectedAttackTarget) {
  tileColors.set(posKey(selectedAttackTarget), CombatConstants.UNIT_TURN.ATTACK_TARGET_SELECTED_COLOR);
}
```

---

#### 11. `react-app/src/models/combat/layouts/CombatLayoutManager.ts`
**Branch:** `attack-action-03-show-info`
**Changes:**
- Extracts `currentUnitPosition` and `targetUnitPosition` from render context
- Passes position to `AttackMenuContent.updateUnit(unit, position)`
- Calls `AttackMenuContent.updateSelectedTarget(target, position)` with both target and position
- Ensures attack menu has access to position data for distance calculations

**Lines Modified:** ~3 added, ~5 modified

**Key Code:**
```typescript
const { currentUnit, currentUnitPosition, targetUnit, targetUnitPosition, /* ... */ } = context;

// Update with current unit and position
this.cachedAttackMenuContent.updateUnit(currentUnit, currentUnitPosition ?? undefined);

// Update selected target (if any)
this.cachedAttackMenuContent.updateSelectedTarget(targetUnit ?? null, targetUnitPosition ?? null);
```

---

#### 12. `react-app/src/models/combat/layouts/CombatLayoutRenderer.ts`
**Branch:** `attack-action-03-show-info`
**Changes:**
- Added `currentUnitPosition?: Position | null` to `LayoutRenderContext` interface
- Added `targetUnitPosition?: Position | null` to `LayoutRenderContext` interface
- Allows position data to flow from view layer to layout manager

**Lines Modified:** ~2 added (interface extension)

---

#### 13. `react-app/src/models/combat/managers/panels/AttackMenuContent.ts`
**Branch:** `attack-action-03-show-info`
**Changes:** **Major rewrite** - Transformed from placeholder to fully functional attack info panel

**New State Variables:**
- `currentUnitPosition: Position | null` - For distance calculations
- `selectedTarget: CombatUnit | null` - Currently selected target
- `selectedTargetPosition: Position | null` - Target position
- `cancelButtonY: number` - Button Y position for hit detection
- `performButtonY: number` - Button Y position for hit detection

**Updated Methods:**
- `updateUnit(unit, position?)` - Now accepts optional position parameter
- `updateSelectedTarget(target, position)` - NEW - Updates selected target and position

**New Panel Layout:**
- Title line: "ATTACK" (left) + "Cancel" button (right)
- Target line: "Target: " + target name (orange) or "Select a Target" (grey)
- Weapon info section: Single column or dual columns (dual wielding)
- Per-weapon display: Name, range, hit%, damage
- "Perform Attack" button: Centered, only visible when target selected

**New Private Method:**
- `renderWeaponInfo(ctx, region, fontId, fontAtlasImage, weapon, x, y)` - Renders weapon stats
- Returns new Y position (functional style)
- Calculates distance, hit chance, damage when target selected
- Shows "??" placeholders when no target

**Dual Wielding Support:**
- Two side-by-side columns with 8px gap
- Column width: `(width - padding*2 - gap) / 2`
- Uses `Math.max(leftY, rightY)` for synchronized positioning

**Lines Modified:** ~239 added, ~52 removed (net +187)

---

#### 14. `react-app/src/models/combat/managers/panels/PanelContent.ts`
**Branch:** `attack-action-03-show-info`
**Changes:**
- Added `{ type: 'perform-attack' }` to `PanelClickResult` union
- Updated `isPanelClickResult()` type guard to include 'perform-attack'

**Lines Modified:** ~2 added, ~1 modified

---

#### 15. `react-app/src/models/combat/strategies/PlayerTurnStrategy.ts`
**Branch:** `attack-action-03-show-info`
**Changes:**
- Added `selectedAttackTarget: Position | null` state variable
- Updated `onTurnStart()` to clear selected target
- Updated `onTurnEnd()` to clear selected target
- Updated `enterAttackMode()` to clear selected target
- Updated `exitAttackMode()` to clear selected target and hoveredTarget
- Updated `recalculateAttackRange()` to clear selected target (may no longer be valid)
- Updated `handleMapClick()` to delegate to `handleAttackClick()` in attack mode
- Added `handleAttackClick(position, state)` - NEW method:
  - Validates clicked position is in `validTargets[]`
  - Sets `selectedAttackTarget = position`
  - Updates `targetedUnit` for top panel display
- Added `getSelectedAttackTarget()` - NEW getter method

**Lines Modified:** ~44 added, ~10 modified

**Key Method:**
```typescript
private handleAttackClick(position: Position, state: CombatState): PhaseEventResult {
  if (!this.attackRange) return { handled: true };

  const isValidTarget = this.attackRange.validTargets.some(
    target => target.x === position.x && target.y === position.y
  );

  if (isValidTarget) {
    this.selectedAttackTarget = position;
    const targetUnit = state.unitManifest.getUnitAtPosition(position);
    if (targetUnit) {
      this.targetedUnit = targetUnit;
      this.targetedPosition = position;
    }
    return { handled: true };
  }

  return { handled: true };
}
```

---

#### 16. `react-app/src/models/combat/strategies/TurnStrategy.ts`
**Branch:** `attack-action-03-show-info`
**Changes:**
- Added optional method `getSelectedAttackTarget?(): Position | null`
- JSDoc comment documents that it returns null if no target selected

**Lines Modified:** ~5 added (interface extension)

---

#### 17. `AttackActionImpl/AttackActionImplTemplate.md`
**Branch:** `attack-action-03-show-info`
**Changes:**
- Updated to reference Quick Reference document
- Minor formatting improvements

**Lines Modified:** ~2 added, ~3 modified

---

## Minor Data File Changes (Not Implementation)

### Test Data Updates

#### 18. `react-app/src/data/equipment-definitions.yaml`
**Branch:** `attack-action-preview-range`
**Changes:** Equipment reordering (no functional changes)
**Purpose:** Cleanup/organization

---

#### 19. `react-app/src/data/party-definitions.yaml`
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

### Branch `attack-action-03-show-info` - Step 3: Target Selection
```
Created:
- utils/CombatCalculations.ts

Modified:
- components/combat/CombatView.tsx
- models/combat/UnitTurnPhaseHandler.ts
- models/combat/layouts/CombatLayoutManager.ts
- models/combat/layouts/CombatLayoutRenderer.ts
- models/combat/managers/panels/AttackMenuContent.ts (major rewrite)
- models/combat/managers/panels/PanelContent.ts
- models/combat/strategies/PlayerTurnStrategy.ts
- models/combat/strategies/TurnStrategy.ts
- AttackActionImpl/AttackActionImplTemplate.md (minor)
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
- `utils/CombatCalculations.ts` - Hit chance and damage calculations (stubs)

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

### Step 3: Target Selection and Attack Info
- **Created:** ~54 lines (CombatCalculations.ts)
- **Modified:** ~319 lines across 9 files (includes AttackMenuContent major rewrite)
- **Total:** ~373 lines

### Grand Total (Steps 1-3)
- **New Code:** ~1,202 lines
- **Documentation:** ~1,793 lines (implementation docs + code reviews)
- **Overall:** ~2,995 lines for Attack Action (Steps 1-3)

---

## Impact Analysis

### High Impact (Core Logic)
- `PlayerTurnStrategy.ts` - Major state additions (~290 lines total across all steps)
- `UnitTurnPhaseHandler.ts` - Rendering and delegation (~107 lines total across all steps)
- `AttackMenuContent.ts` - New panel component, major rewrite in Step 3 (~417 lines total)

### Medium Impact (Infrastructure)
- `AttackRangeCalculator.ts` - New utility (~115 lines)
- `LineOfSightCalculator.ts` - New utility (~115 lines)
- `CombatCalculations.ts` - New stub system (~54 lines)
- `CombatView.tsx` - Position data flow (~17 lines total)

### Low Impact (Glue Code)
- `CombatLayoutManager.ts` - Panel switching and position passing (~13 lines)
- `TurnStrategy.ts` - Interface extensions (~8 lines)
- `CombatLayoutRenderer.ts` - Interface extension (~2 lines)
- `PanelContent.ts` - Type union extension (~3 lines)
- `CombatConstants.ts` - Color constants (~7 lines)

### No Impact (Test Data)
- `equipment-definitions.yaml` - Reordering only
- `party-definitions.yaml` - Test equipment changes

---

## Dependency Graph

```
CombatView.tsx
    ↓ (provides position data)
LayoutRenderContext
    ↓
CombatLayoutManager.ts
    ↓ (passes positions)
AttackMenuContent.ts
    ↓ (uses for calculations)
CombatCalculations.ts

CombatView.tsx
    ↓
UnitTurnPhaseHandler.ts
    ↓
PlayerTurnStrategy.ts
    ↓ (uses)
AttackRangeCalculator.ts
    ↓ (uses)
LineOfSightCalculator.ts

UnitTurnPhaseHandler.ts
    ↓ (reads)
CombatConstants.ts
```

---

## Next Files to Modify (Step 4: Attack Execution)

### Expected Changes
- `UnitTurnPhaseHandler.ts` - Handle `'perform-attack'` click result, execute attack
- `AttackAnimationSequence.ts` (NEW) - Flicker and floating text animations
- `CombatCalculations.ts` - Use existing stub methods for hit/damage rolls
- `PlayerTurnStrategy.ts` - Exit attack mode after attack completes
- `CombatUnit.ts` or `HumanoidUnit.ts` - Apply damage, handle knockout
- `CombatLogManager.ts` - Add attack log messages (hit/miss/damage/knockout)

---

**End of Manifest**

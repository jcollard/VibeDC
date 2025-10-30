# Attack Action - Modified Files Manifest

**Purpose:** Track all files created/modified during Attack Action implementation

**Last Updated:** 2025-10-30 (Step 4 Complete + Bug Fixes)

---

## Summary Statistics

### Main Implementation (Steps 1-4)
- **Files Created:** 11
- **Files Modified:** 17
- **Total Changed:** 28 files
- **Branches:** `attack-action`, `attack-action-preview-range`, `attack-action-03-show-info`, `attack-action-04-perform-attack`

### Bug Fixes & Improvements
- **Files Modified:** 4
- **Branch:** `attack-action-bugs`
- **Focus:** Knockout detection fix, combat log message ordering, text readability

---

## Files Created (11)

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

### Step 4: Attack Execution and Animation

#### 9. `react-app/src/models/combat/AttackAnimationSequence.ts`
**Lines:** ~172
**Purpose:** Attack animation visual feedback system
**Created in:** `attack-action-04-perform-attack` branch
**Features:**
- Manages visual feedback for attack outcomes (hit/miss)
- Hit animation: Red flicker (1s) + floating damage number (2s)
- Miss animation: White "Miss" text floating upward (2s)
- Total duration: 3.0 seconds per attack
- Flicker interval: 150ms (alternating red overlay)
- Floating text moves 12px upward (1 tile)

**Key Methods:**
- `update(deltaTime)` → `boolean` - Updates animation progress, returns true when complete
- `isComplete()` → `boolean` - Checks if animation finished
- `render(ctx, tileSize, offsetX, offsetY, fontAtlasImage)` - Renders current animation frame
- `renderHitAnimation()` - Private: Red flicker + damage number
- `renderMissAnimation()` - Private: White "Miss" text

**Animation Timing:**
- Flicker phase: 0-1000ms (6-7 flickers at 150ms intervals)
- Float phase: 1000-3000ms (damage number or "Miss" text floats up)
- Total: 3000ms per attack

**Rendering:**
- Uses `FontAtlasRenderer` for text (damage numbers, "Miss" text)
- Uses `ctx.fillRect()` for red flicker overlay (semi-transparent)
- Proper coordinate rounding with `Math.floor()`
- Read-only properties prevent mutation

---

### Documentation Files (Step 4)

#### 10. `AttackActionImpl/04-AttackActionPerformAttack.md`
**Lines:** ~421
**Purpose:** Implementation summary for Step 4 (Attack Execution)
**Created in:** `attack-action-04-perform-attack` branch
**Contents:**
- Overview of attack execution and animation system
- Files created (1) and modified (5)
- Features implemented (attack execution, animations, dual wielding, knockout detection)
- Technical details (animation timing, damage application, developer tools)
- User experience flow (attack button → animation → completion)
- Design decisions (5 key architectural choices)
- Developer testing functions (setHitRate, setDamage, clearAttackOverride)

---

#### 11. `AttackActionImpl/04-AttackActionPerformAttack-CodeReview.md`
**Lines:** ~639
**Purpose:** Comprehensive code review against GeneralGuidelines.md
**Created in:** Documentation phase
**Contents:**
- Executive summary (APPROVED FOR MERGE - Full compliance)
- File-by-file analysis with compliance checklist
- Code quality assessment with strengths highlighted
- Performance analysis (memory, timing, per-frame costs)
- Minor recommendations (3 future enhancements, non-blocking)
- Testing recommendations (manual checklist, automated test ideas)
- Pre-merge checklist and suggested merge command

---

## Files Modified (17)

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

### Step 4: Attack Execution and Animation

#### 18. `react-app/src/models/combat/UnitTurnPhaseHandler.ts`
**Branch:** `attack-action-04-perform-attack`
**Changes:** **Major addition** - Attack execution, animation orchestration, damage application
**Lines Modified:** ~262 added

**New State Variables:**
- `attackAnimations: AttackAnimationSequence[]` - Array of animations (dual wielding support)
- `attackAnimationIndex: number` - Currently playing animation index
- `canAct: boolean` - Whether unit can perform actions this turn

**New Methods:**
- `handlePerformAttack()` - Entry point for "Perform Attack" button click
- `executeAttack(attacker, attackerPos, target, targetPos)` - Core attack execution:
  - Calculates Manhattan distance for range
  - Retrieves equipped weapons (left/right hand)
  - Rolls hit/miss using `CombatCalculations.getChanceToHit()`
  - Calculates damage using `CombatCalculations.calculateAttackDamage()`
  - Applies damage via `applyDamage()`
  - Creates attack animations (1 or 2 for dual wielding)
  - Adds combat log messages
  - Sets `canAct = false` immediately (prevents menu interaction during animation)
  - Clears attack range highlights
- `applyDamage(target, damage)` - Reduces target wounds, checks knockout:
  - Updates `target.wounds` (uses `setWounds()` if available)
  - Caps wounds at max health
  - Detects knockout when `wounds >= health`
  - Adds knockout message to combat log
- `completeAttack(state)` - Cleanup after animation finishes:
  - Clears animation arrays
  - Resets animation index
  - Returns state unchanged (stays in unit-turn phase)
- `getCanAct()` - Getter for canAct flag
- `handleActionSelected(actionId)` - Updated to handle 'perform-attack' action

**Updated Methods:**
- `updatePhase()` - Added attack animation update loop (lines 419-437):
  - Checks if animations are playing
  - Updates current animation with deltaTime
  - Advances to next animation when complete (dual wielding)
  - Calls `completeAttack()` when all animations finish
  - Returns state early to prevent other updates during animation
- `renderUI()` - Added attack animation rendering (lines 398-407):
  - Renders current animation if active
  - Extracts fontAtlasImage from context map
  - Passes rendering context to animation
- Constructor cleanup - Resets animation state on phase entry

**Dual Wielding Support:**
- Detects two weapons equipped in left/right hand
- Creates two sequential animations (6 seconds total)
- Independent hit rolls per weapon
- Cumulative damage application
- Combat log shows "First strike" and "Second strike"

**Key Implementation Details:**
- Sets `canAct = false` BEFORE animation starts (critical bug fix)
- Animation updates happen in main update loop (not per-frame render)
- Damage application uses fallback for units without `setWounds()` method
- Combat log messages use color tags for unit names

---

#### 19. `react-app/src/models/combat/utils/CombatCalculations.ts`
**Branch:** `attack-action-04-perform-attack`
**Changes:** **Developer override system added**
**Lines Modified:** ~65 added

**New State Variables:**
- `nextHitRateOverride: number | null` - Persistent hit rate override (static)
- `nextDamageOverride: number | null` - Persistent damage override (static)

**New Methods:**
- `setHitRate(hitRate)` - Developer function:
  - Sets persistent hit rate override (0-1 range)
  - Validates and clamps input (0-1)
  - Logs confirmation with `[DEV]` prefix
  - Persists until `clearAttackOverride()` called
- `setDamage(damage)` - Developer function:
  - Sets persistent damage override (integer)
  - Validates non-negative
  - Logs confirmation with `[DEV]` prefix
  - Persists until `clearAttackOverride()` called
- `clearAttackOverride()` - Clears all overrides:
  - Resets both hit rate and damage overrides to null
  - Logs feedback showing what was cleared
  - Provides confirmation even if no overrides active

**Updated Methods:**
- `getChanceToHit()` - Added override check:
  - Returns override value if set (logs usage)
  - Falls back to stub (1.0 = 100% hit rate)
- `calculateAttackDamage()` - Added override check:
  - Returns override value if set (logs usage)
  - Falls back to stub (1 damage)

**Console Logging:**
- All logs prefixed with `[DEV]` for easy filtering
- Logs when override is used (per attack)
- Logs when override is set/cleared
- Persistent override behavior documented in log messages

---

#### 20. `react-app/src/components/combat/CombatView.tsx`
**Branch:** `attack-action-04-perform-attack`
**Changes:** Developer functions exposed, perform-attack handler added
**Lines Modified:** ~40 added

**New useEffect Hook (lines 105-128):**
- Exposes developer functions to window object:
  - `window.setHitRate(n)` - Sets hit rate override
  - `window.setDamage(n)` - Sets damage override
  - `window.clearAttackOverride()` - Clears all overrides
- Cleanup function deletes window properties on unmount
- Empty dependency array (runs once on mount)

**Updated Click Handler (lines 969-976):**
- Added `'perform-attack'` case:
  - Checks phase is 'unit-turn'
  - Type-safe check for `handleActionSelected` method
  - Casts to `UnitTurnPhaseHandler` after verification
  - Calls `handleActionSelected('perform-attack')`
  - Returns early after handling

**Updated Panel State (lines 596-599):**
- Retrieves `canAct` from phase handler using `getCanAct()`
- Falls back to `true` if method not available
- Passes `canAct` to `ActionsMenuContent.updateUnit()`

---

#### 21. `react-app/src/models/combat/managers/panels/ActionsMenuContent.ts`
**Branch:** `attack-action-04-perform-attack`
**Changes:** Button disabling based on canAct flag
**Lines Modified:** +24 lines, -24 lines modified (parameter additions)

**Updated Method Signature:**
- `updateUnit(unit, hasMoved, activeAction, canResetMove, canAct = true)` - Added `canAct` parameter
- `buildButtonList(unit, hasMoved, canResetMove, canAct = true)` - Added `canAct` parameter
- Both default to `true` for backward compatibility

**Updated Button Logic:**
- **Attack button** (line 134):
  - Changed: `enabled: true` → `enabled: canAct`
  - Disables during attack animations
- **Primary class button** (line 143):
  - Changed: `enabled: true` → `enabled: canAct`
  - Disables during attack animations
- **Secondary class button** (line 153):
  - Changed: `enabled: true` → `enabled: canAct`
  - Disables during attack animations
- **Delay button** (line 160):
  - Changed: `enabled: !hasMoved` → `enabled: !hasMoved && canAct`
  - Combined condition: disabled if moved OR cannot act

**Purpose:**
- Prevents player from clicking menu buttons during attack animation
- Maintains consistent disabled state across all action buttons
- Prevents race conditions and animation interruption

---

#### 22. `AttackActionImpl/DeveloperTestingFunctions.md` (NEW)
**Branch:** `attack-action-04-perform-attack`
**Lines:** ~187
**Purpose:** Documentation for developer console testing functions
**Contents:**
- Overview of developer mode system
- Function reference for all 3 functions (setHitRate, setDamage, clearAttackOverride)
- Usage examples with code snippets
- Testing workflows (guaranteed hit, guaranteed miss, damage testing, clearing)
- Implementation details (where functions are defined, how they're exposed)
- Design decisions (why persistent, why window object, why clearAttackOverride)

---

### Bug Fixes & Improvements (Post-Step 4)

#### 23. `react-app/src/models/combat/UnitTurnPhaseHandler.ts`
**Branch:** `attack-action-bugs`
**Changes:** Fixed knockout detection logic and message ordering
**Lines Modified:** ~60 modified (3 bug fixes)

**Bug Fix 1: Knockout Detection (Line 1157)**
- **Before:** `if (target.wounds >= target.health)` ❌
- **After:** `if (target.wounds >= target.maxHealth)` ✅
- **Issue:** Used remaining HP instead of max HP capacity
- **Impact:** Units now correctly knocked out at proper threshold

**Bug Fix 2 & 3: Wound Capping (Lines 1150, 1153)**
- **Before:** `Math.min(newWounds, target.health)` ❌
- **After:** `Math.min(newWounds, target.maxHealth)` ✅
- **Issue:** Capped wounds at remaining HP, making wounded units harder to kill
- **Impact:** Damage application now works correctly

**Refactor: Knockout Message Timing**
- Removed knockout detection from `applyDamage()` method (lines 1136-1158)
- Added knockout check after single-weapon attack (lines 1080-1084)
- Added knockout check after dual-wield loop (lines 1135-1139)
- **Issue:** Knockout message appeared between dual-wield strikes
- **Impact:** Combat log now shows proper message order

**Updated Method:**
```typescript
private applyDamage(target: CombatUnit, damage: number): void {
  // Now only updates wounds, no knockout detection
  // Knockout checks moved to caller for proper message ordering
}
```

---

#### 24. `react-app/src/models/combat/CombatUnit.ts`
**Branch:** `attack-action-bugs`
**Changes:** Enhanced documentation for health/maxHealth/wounds
**Lines Modified:** +24 documentation lines

**Documentation Added (Lines 59-84):**
- Clarified `health` is calculated value (maxHealth - wounds)
- Emphasized to use `maxHealth` for knockout detection, NOT `health`
- Added example: maxHealth=100, wounds=30 → health=70
- Warned against common mistake of comparing wounds to health

**Purpose:** Prevent future developers from making the same knockout detection mistake

---

#### 25. `react-app/src/utils/FontAtlasRenderer.ts`
**Branch:** `attack-action-bugs`
**Changes:** Added `renderTextWithShadow()` method for improved text readability
**Lines Modified:** +61 added (new method)

**New Method (Lines 123-183):**
```typescript
static renderTextWithShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontId: string,
  atlasImage: HTMLImageElement,
  scale: number = 1,
  alignment: 'left' | 'center' | 'right' = 'left',
  color?: string,
  shadowColor: string = 'rgba(0, 0, 0, 0.8)',
  shadowOffsetX: number = 1,
  shadowOffsetY: number = 1
): number
```

**Features:**
- Renders text with configurable drop shadow
- Two `renderText()` calls: shadow first (offset), then main text
- Supports all alignments (left/center/right)
- Default: semi-transparent black shadow, 1px offset
- Returns text width (same as `renderText()`)

**Use Case:** Floating damage/miss text readable against any background

---

#### 26. `react-app/src/models/combat/AttackAnimationSequence.ts`
**Branch:** `attack-action-bugs`
**Changes:** Updated floating text to use shadows
**Lines Modified:** ~6 lines modified (2 method calls)

**Damage Number Animation (Lines 127-140):**
- **Before:** `FontAtlasRenderer.renderText(..., '#ff0000')`
- **After:** `FontAtlasRenderer.renderTextWithShadow(..., '#ff0000', 'black')`
- Red damage text with black shadow

**Miss Text Animation (Lines 160-172):**
- **Before:** `FontAtlasRenderer.renderText(..., '#ffffff')`
- **After:** `FontAtlasRenderer.renderTextWithShadow(..., '#ffffff', 'black')`
- White "Miss" text with black shadow

**Impact:** Floating text now readable over any tile/unit color

---

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

### Branch `attack-action-04-perform-attack` - Step 4: Attack Execution
```
Created:
- models/combat/AttackAnimationSequence.ts
- AttackActionImpl/DeveloperTestingFunctions.md
- AttackActionImpl/04-AttackActionPerformAttack.md
- AttackActionImpl/04-AttackActionPerformAttack-CodeReview.md

Modified:
- models/combat/UnitTurnPhaseHandler.ts (major addition - +262 lines)
- models/combat/utils/CombatCalculations.ts (developer override system)
- components/combat/CombatView.tsx (developer functions, perform-attack handler)
- models/combat/managers/panels/ActionsMenuContent.ts (button disabling)
```

### Branch `attack-action-bugs` - Bug Fixes & Improvements
```
Modified:
- models/combat/UnitTurnPhaseHandler.ts (knockout detection fix, message ordering)
- models/combat/CombatUnit.ts (documentation improvements)
- utils/FontAtlasRenderer.ts (added renderTextWithShadow method)
- models/combat/AttackAnimationSequence.ts (floating text uses shadows)
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

### Animation
- `AttackAnimationSequence.ts` - Attack visual feedback (hit/miss animations)

### Utilities
- `utils/AttackRangeCalculator.ts` - Range calculation
- `utils/LineOfSightCalculator.ts` - Line of sight checks
- `utils/CombatCalculations.ts` - Hit chance and damage calculations (stubs + developer overrides)

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

### Step 4: Attack Execution and Animation
- **Created:** ~172 lines (AttackAnimationSequence.ts)
- **Modified:** ~391 lines across 4 files (includes UnitTurnPhaseHandler major addition +262)
- **Documentation:** ~1,247 lines (DeveloperTestingFunctions.md + implementation doc + code review)
- **Total:** ~1,810 lines

### Grand Total (Steps 1-4)
- **New Code:** ~1,765 lines (production code)
- **Documentation:** ~3,040 lines (implementation docs + code reviews + developer docs)
- **Overall:** ~4,805 lines for Attack Action (Steps 1-4)

### Bug Fixes & Improvements
- **Modified Code:** ~91 lines (3 bug fixes + text shadow method)
- **Documentation:** ~85 lines (CombatUnit.ts comments + Quick Reference updates)
- **Total:** ~176 lines

### Combined Total (Steps 1-4 + Bug Fixes)
- **Production Code:** ~1,856 lines
- **Documentation:** ~3,125 lines
- **Overall:** ~4,981 lines

---

## Impact Analysis

### High Impact (Core Logic)
- `PlayerTurnStrategy.ts` - Major state additions (~290 lines total across all steps)
- `UnitTurnPhaseHandler.ts` - Rendering, delegation, attack execution (~429 lines total including bug fixes)
- `AttackMenuContent.ts` - New panel component, major rewrite in Step 3 (~417 lines total)

### Medium Impact (Infrastructure)
- `AttackRangeCalculator.ts` - New utility (~115 lines)
- `LineOfSightCalculator.ts` - New utility (~115 lines)
- `AttackAnimationSequence.ts` - New animation system (~178 lines including shadow updates)
- `CombatCalculations.ts` - Stub system + developer overrides (~119 lines)
- `CombatView.tsx` - Position data flow, developer functions (~57 lines total)
- `FontAtlasRenderer.ts` - Text rendering with shadow support (~61 lines added)
- `CombatUnit.ts` - Enhanced documentation (~24 lines documentation)

### Low Impact (Glue Code)
- `ActionsMenuContent.ts` - Button disabling logic (~24 lines modified)
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
    ↓ (reads colors)
CombatConstants.ts

# Step 4 additions:
UnitTurnPhaseHandler.ts
    ↓ (uses for attack execution)
CombatCalculations.ts (with developer overrides)

UnitTurnPhaseHandler.ts
    ↓ (creates and renders)
AttackAnimationSequence.ts
    ↓ (uses for text rendering)
FontAtlasRenderer

ActionsMenuContent.ts
    ← (receives canAct flag from)
UnitTurnPhaseHandler.ts
```

---

## Next Steps (Step 5 and Beyond)

### Potential Future Enhancements

**Step 5: Victory/Defeat Detection**
- Detect when all enemies are knocked out (victory condition)
- Detect when all player units are knocked out (defeat condition)
- Transition to victory/defeat phases (currently stubbed)
- Victory/defeat UI and phase handlers

**Step 6: Replace Stub Formulas**
- Implement actual hit chance formula in `CombatCalculations.getChanceToHit()`
- Implement actual damage formula in `CombatCalculations.calculateAttackDamage()`
- Consider factors: attacker stats, defender stats, weapon power, range, terrain
- Balance testing with real formulas

**Step 7: Advanced Combat Features**
- Counterattacks (when attacked in melee range)
- Critical hits (bonus damage chance)
- Status effects (poison, blind, etc.)
- Elemental damage types and resistances
- Weapon durability system

**Step 8: AI Attack Implementation**
- Enemy AI attack decision-making
- Target selection algorithms
- Range and positioning awareness
- Difficulty levels (conservative vs aggressive)

**Optimization Opportunities:**
- Extract damage application to shared `CombatDamage` utility
- Extract combat log message formatting to helper function
- Make animation speed configurable (user preference)
- Add override history tracking for complex debugging

---

## Status Summary

### ✅ Completed (Steps 1-4 + Bug Fixes)
1. ✅ **Step 1:** Attack menu panel with cancel button
2. ✅ **Step 2:** Attack range preview with line of sight
3. ✅ **Step 3:** Target selection and attack info display
4. ✅ **Step 4:** Attack execution, animations, developer testing tools
5. ✅ **Bug Fixes:** Knockout detection, combat log message ordering, text shadows

### 🚧 In Progress
- None (All work complete, ready for merge to main branch)

### 📋 Planned
- Step 5: Victory/Defeat detection
- Step 6: Real combat formulas
- Step 7: Advanced combat features
- Step 8: Enemy AI attacks

---

**End of Manifest**

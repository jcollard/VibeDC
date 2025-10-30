# Attack Action Overview

**Version:** 2.0
**Last Updated:** Wed, Oct 29, 2025
**Related:** [CombatHierarchy.md](CombatHierarchy.md)

## Purpose

This document describes the user experience and technical requirements for implementing the **Attack Action** feature during the Unit Turn Phase. Players will be able to select enemy targets within weapon range, view attack predictions, and execute attacks with visual feedback.

---

## User Experience Flow

### 1. Entering Attack Mode

**Preconditions:**
- Active unit's turn during Unit Turn Phase
- Unit has `canAct = true` (has not yet performed an action this turn)
- User is viewing the Actions Menu in bottom panel

**User Action:**
Player clicks the **"Attack"** button in the Actions Menu.

**System Response:**
- Actions Menu shows "Attack" button highlighted in **green** (#00ff00 / ACTIVE_COLOR) to indicate active mode
- Move, Delay, and primary/secondary class action buttons remain visible but **not** highlighted
- Attack menu content replaces action button list with attack-specific UI
- Bottom panel displays:
  - **Title:** "ATTACK" in dark red (#8B0000) at top
  - **Weapon Info Section:** Shows equipped weapon(s) with the following layout:
    - If **single weapon** (including two-handed weapons): One column centered
    - If **dual wielding** (two one-handed weapons): Two columns side-by-side with 8px gap
    - Each weapon column displays (top to bottom, left-aligned):
      - Weapon name in orange (#FFA500)
      - Range: "Range: X" (white text)
      - % to Hit: "Hit: XX%" (white text)
      - Damage: "Dmg: X-Y" (white text)
  - **Target Selection Section:** Below weapons with 2px spacing
    - Label: "Target:" in white
    - Value: "Select a Target" in grey initially, changes to "{TARGET NAME}" in orange when selected
  - **Cancel Attack Button:** Always visible and enabled, centered, below target section
    - Text: "Cancel Attack" in white
    - Spacing: Standard 8px line spacing
  - **Perform Attack Button:** Only visible when valid target selected
    - Text: "Perform Attack" in white
    - Position: Below Cancel Attack with ample spacing (16px gap) to prevent accidental clicks
    - Centered in panel

**Map Display:**
- All movement range highlights **cleared** from map
- Attack range highlights rendered (see Section 2)

**Top Panel:**
- Active unit info remains visible (name, stats, action timer)
- Unit info panel remains interactive for stat inspection

---

### 2. Attack Range Visualization

**Visual System:**

The map displays the attack range using a color-coded tile highlighting system:

**Base Attack Range (Red):**
- All tiles within weapon range are highlighted with **red** (#FF0000) semi-transparent overlay
- Range calculated orthogonally from attacker's position (Manhattan distance ≤ weapon range)
- Example: Weapon with range 3 highlights all tiles 1-3 tiles away (orthogonal movement)

**Line of Sight Blocking (Grey):**
- Tiles within range but **blocked by obstacles** are highlighted with **grey** (#808080) semi-transparent overlay
- Line of sight blocked by:
  - Non-walkable map tiles (walls, obstacles)
  - Other units (both friendly and enemy units block line of sight)
- Line of sight algorithm:
  - Uses Bresenham's line algorithm to trace path from attacker center to target center
  - Checks each cell along the path for walkability and unit occupation
  - If any cell is blocked, the target tile shows grey instead of red/yellow/orange/green

**Valid Enemy Targets (Yellow):**
- Enemy units within range AND with clear line of sight are highlighted with **yellow** (#FFFF00)
- These are clickable targets
- Takes precedence over red/grey base highlighting

**Hovered Target (Orange):**
- When mouse hovers over a valid enemy unit (yellow tile), that tile changes to **orange** (#FFA500)
- Only one tile can be orange at a time
- Hovering away returns tile to yellow

**Selected Target (Green):**
- When player clicks a valid enemy unit, that tile changes to **green** (#00FF00)
- Only one target can be selected at a time
- Clicking a different valid target moves the green highlight to the new target
- Selected target's info appears in top panel (see Section 3)

**Color Constants:**
All colors defined in `CombatConstants.ts`:
- `ATTACK_TITLE_COLOR` - #8B0000 (dark red for "ATTACK" title)
- `ATTACK_RANGE_BASE_COLOR` - #FF0000 (red for base attack range)
- `ATTACK_RANGE_BLOCKED_COLOR` - #FFFFFF (white for blocked tiles - no line of sight)
- `ATTACK_TARGET_VALID_COLOR` - #FFFF00 (yellow for valid enemy targets)
- `ATTACK_TARGET_HOVER_COLOR` - #FFA500 (orange for hovered target)
- `ATTACK_TARGET_SELECTED_COLOR` - #00FF00 (green for selected target)

**Z-Order (Bottom to Top):**
1. Map tiles (base layer)
2. Attack range highlights (red/grey) - rendered in phase handler `render()` method
3. Unit sprites
4. Target highlights (yellow/orange/green) - rendered in phase handler `renderUI()` method
5. UI overlays (cursors, etc.)

---

### 3. Line of Sight Examples (ASCII Art)

Below are examples showing how line of sight is calculated for various attacker-target configurations. Legend:
- `A` = Attacker
- `T` = Target
- `#` = Wall or other unit (blocks line of sight)
- `.` = Empty walkable space
- `*` = Tile along line of sight path

**Example 1: Straight Horizontal Shot (Clear)**
```
A**T
```
Line of sight: Clear
Target color: Yellow (valid target)

**Example 2: Straight Vertical Shot (Clear)**
```
A
*
*
T
```
Line of sight: Clear
Target color: Yellow (valid target)

**Example 3: Corner Peeking (Clear)**
```
##A
#.#
T##
```
Line from A to T passes through center-to-center:
- A at (2, 0) center: (2.5, 0.5)
- T at (0, 2) center: (0.5, 2.5)
- Bresenham traces: (2, 0) → (1, 1) → (0, 2)
- Cell (1, 1) is walkable (`.`)
- Line of sight: Clear
- Target color: Yellow (valid target)

**Example 4: Diagonal Shot Through Gap (Clear)**
```
#A..
..#.
.#..
T...
```
Line from A to T passes through:
- A at (1, 0) → T at (0, 3)
- Path: (1, 0) → (1, 1) → (0, 2) → (0, 3)
- All intermediate cells are walkable
- Line of sight: Clear
- Target color: Yellow (valid target)

**Example 5: Blocked by Wall**
```
A.#.T
```
Line from A to T:
- A at (0, 0) → T at (4, 0)
- Bresenham traces: (0, 0) → (1, 0) → (2, 0) → (3, 0) → (4, 0)
- Cell (2, 0) contains wall (`#`)
- Line of sight: Blocked
- Target color: Grey (blocked)

**Example 6: Blocked by Unit**
```
A.U.T
```
(U = friendly or enemy unit)
Line from A to T:
- Bresenham traces: (0, 0) → (1, 0) → (2, 0) → (3, 0) → (4, 0)
- Cell (2, 0) contains unit U
- Line of sight: Blocked
- Target color: Grey (blocked)

**Example 7: Steep Diagonal (Clear)**
```
..T
..*
.*.
A..
```
Line from A to T:
- A at (0, 3) → T at (2, 0)
- Bresenham approximates steep slope
- Path: (0, 3) → (1, 2) → (1, 1) → (2, 0)
- All intermediate cells walkable
- Line of sight: Clear
- Target color: Yellow (valid target)

**Example 8: Steep Diagonal (Blocked)**
```
..T
.#*
.*.
A..
```
Line from A to T:
- A at (0, 3) → T at (2, 0)
- Path: (0, 3) → (1, 2) → (1, 1) → (2, 0)
- Cell (1, 2) contains wall (`#`)
- Line of sight: Blocked
- Target color: Grey (blocked)

**Example 9: Shallow Diagonal (Clear)**
```
...A
..*.
.*..
T...
```
Line from A to T:
- A at (3, 0) → T at (0, 3)
- Bresenham approximates shallow slope
- Path: (3, 0) → (2, 1) → (1, 2) → (0, 3)
- All intermediate cells walkable
- Line of sight: Clear
- Target color: Yellow (valid target)

**Example 10: Knight's Move (Blocked by Corner Wall)**
```
#.T
A##
```
Line from A to T:
- A at (0, 1) → T at (2, 0)
- Bresenham traces: (0, 1) → (1, 1) → (1, 0) → (2, 0)
- Cell (1, 1) contains wall (`#`)
- Line of sight: Blocked
- Target color: Grey (blocked)

**Example 11: Long Range Clear Shot**
```
A......T
```
Line from A to T:
- Straight horizontal line
- All intermediate cells walkable
- Line of sight: Clear (assuming weapon range ≥ 7)
- Target color: Yellow (valid target)

**Example 12: Multiple Units in Range (Mixed)**
```
..T1.
.#T2.
A....
.U...
..T3.
```
(T1, T2, T3 = enemy targets; U = friendly unit)
- T1 at (2, 0): Clear line of sight → Yellow
- T2 at (2, 1): Blocked by wall `#` at (1, 1) → Grey
- T3 at (2, 4): Clear line of sight → Yellow
- When hovering T1 → Orange
- When clicking T1 → Green (T2 and T3 remain grey and yellow respectively)

---

### 4. Target Selection

**Hovering Over Tiles:**
- Moving mouse over **yellow** (valid target) tiles changes them to **orange**
- Hovering over grey tiles (blocked) or red tiles (empty range) has no effect
- Moving mouse away from yellow tile returns it to yellow

**Clicking a Valid Target:**
- Clicking an **orange** (hovered valid target) tile selects that enemy unit
- Selected tile changes from orange to **green**
- Previously selected target (if any) returns to yellow
- Only one target can be selected at a time

**Bottom Panel Updates:**
- Target label changes from "Target: Select a Target" to "Target: {TARGET NAME}"
- Target name displayed in orange (#FFA500)
- **Attack Prediction Section** appears below target name with 2px spacing:
  - If **single weapon**:
    - "Hit: XX%" (white text) - shows `getChanceToHit(attacker, defender, distance, 'physical')`
    - "Dmg: X-Y" (white text) - shows `calculateAttackDamage(attacker, weapon, defender, distance, 'physical')`
  - If **dual wielding**:
    - Two columns (same layout as weapon info section)
    - Left column: "Attack 1" label (grey), "Hit: XX%", "Dmg: X-Y"
    - Right column: "Attack 2" label (grey), "Hit: XX%", "Dmg: X-Y"
    - Each column uses respective weapon's stats for calculation
- **Perform Attack Button** becomes visible below Cancel Attack button

**Top Panel Updates:**
- Target unit's info displayed in top panel (same format as active unit info)
- Shows target's sprite, name (in red for enemies), stats, action timer
- Target's movement range is **not** displayed on map (attack mode suppresses this)

---

### 5. Canceling Attack Mode

**User Action:**
Player clicks **"Cancel Attack"** button (always visible and enabled in attack panel).

**System Response:**
- Attack panel closes
- Returns to normal Actions Menu with standard action buttons
- All attack range highlights **cleared** from map
- Top panel returns to showing only active unit's info
- Selected target (if any) is unselected
- Movement range highlights **not** restored (must click Move button again to re-enter move mode)
- "Attack" button in Actions Menu returns to white (not green) - no longer in active mode

**State Reset:**
- `canAct` remains `true` (no action was performed)
- Unit can select Move, Attack, or other actions again

---

### 6. Performing the Attack

**Preconditions:**
- Valid target selected (green tile on map)
- "Perform Attack" button visible and enabled

**User Action:**
Player clicks **"Perform Attack"** button.

**System Response:**

**6.1. Attack Execution:**

**Single Weapon Attack:**
1. Combat log message appears: "{ATTACKER NAME} attacks {TARGET NAME}..."
2. Roll attack using `getChanceToHit(attacker, defender, distance, 'physical')` (stub returns 1.0 = 100% hit for now)
3. If **hit**:
   - Calculate damage using `calculateAttackDamage(attacker, weapon, defender, distance, 'physical')` (stub returns 1 for now)
   - Update target's wounds (reduces HP)
   - Combat log: "{ATTACKER NAME} attacks {TARGET NAME} for {X} damage."
   - Animation (see Section 6.2)
4. If **miss**:
   - Combat log: "{ATTACKER NAME} attacks {TARGET NAME} but misses."
   - Animation (see Section 6.2)

**Dual Wielding Attack:**
1. Combat log message: "{ATTACKER NAME} attacks {TARGET NAME} with both weapons..."
2. **First attack (weapon 1):**
   - Roll attack independently using first weapon's stats
   - If hit: Calculate damage, update target's wounds, log: "First strike hits for {X} damage."
   - If miss: Log: "First strike misses."
   - Animation plays (see Section 6.2)
3. **Second attack (weapon 2):**
   - After first attack animation completes (2 seconds)
   - Roll attack independently using second weapon's stats
   - If hit: Calculate damage, update target's wounds, log: "Second strike hits for {Y} damage."
   - If miss: Log: "Second strike misses."
   - Animation plays (see Section 6.2)
4. Both attacks target the same enemy unit
5. Each attack rolls independently (can have different hit/miss outcomes)

**6.2. Attack Animation:**

**Before Animation Starts:**
- All attack range highlights (red/grey/yellow/orange/green) are **cleared** from map
- Player **cannot click anything** during animation (Cancel button disabled, map clicks disabled)
- Attack panel remains visible but unresponsive

**Miss Animation:**
- Text "Miss" appears on target unit's tile (centered on tile)
- Text color: White (#FFFFFF)
- Font: 7px-04b03
- Text slowly floats upward by 1 tile (12 pixels) over 2 seconds
- Linear interpolation: startY → startY - 12
- Text disappears after 2 seconds (no fade, just removal)

**Hit Animation:**
- Target tile **flickers red** (#FF0000) rapidly
- Flicker pattern: 200ms total duration, alternates every 50ms (red → normal → red → normal)
- After flicker completes (200ms), damage number appears
- Damage number displays: "{DAMAGE}" (e.g., "3")
- Text color: Red (#FF0000)
- Font: 7px-04b03
- Number slowly floats upward by 1 tile (12 pixels) over 2 seconds
- Linear interpolation: startY → startY - 12
- Number disappears after 2 seconds (no fade, just removal)

**Animation Timing (Single Weapon):**
- Total duration: 3.0 seconds
  - 0.0s - 1.0s: Red flicker (if hit, alternates every 150ms) OR "Miss" text begins floating (if miss)
  - 1.0s - 3.0s: Damage number floats upward (for hit) OR "Miss" continues floating (for miss)
- After animation completes, control returns to player

**Animation Timing (Dual Wielding):**
- First attack animation: 3.0 seconds
- Second attack animation: 3.0 seconds (starts after first completes)
- Total duration: 6.0 seconds
- If both hit: Two separate damage numbers appear (one after the other)
- If one hits, one misses: Shows appropriate animation for each

**6.3. Post-Attack State Updates:**

After animation completes:
- `canAct` set to `false` (unit has performed an action)
- `canResetMove` set to `false` (cannot reset move after attacking)
- Attack panel closes automatically
- Returns to Actions Menu with updated button states:
  - **Move button:** Enabled if `unitHasMoved = false`, disabled if `unitHasMoved = true`
  - **Attack button:** Disabled (greyed out)
  - **Primary/Secondary class buttons:** Disabled (greyed out)
  - **Delay button:** Disabled (greyed out)
  - **Reset Move button:** Not visible (only shows when `canResetMove = true`)
  - **End Turn button:** Enabled (only available action remaining)
- All attack range highlights remain cleared
- Top panel returns to showing active unit's info only

**6.4. Knocked Out Units:**

If target unit's HP reaches 0 after damage:
- Combat log message: "{TARGET NAME} was knocked out."
- Target unit sprite remains on map (future: may add knocked-out visual indicator)
- Unit no longer blocks movement or line of sight (future enhancement)

**6.5. Victory/Defeat Conditions:**

After attack resolves:
- Check victory condition: All enemy units at 0 HP → transition to Victory phase
- Check defeat condition: All player units at 0 HP → transition to Defeat phase

---

### 7. Attack After Movement

**Scenario:**
Player has already moved their unit this turn (`unitHasMoved = true`).

**User Experience:**
- Actions Menu shows Move button **disabled** (greyed out)
- Attack button remains **enabled** (white, clickable)
- Player can click Attack and follow same flow as Section 1-6
- After attacking, `canResetMove` is set to `false` (cannot undo movement after attacking)
- End Turn is the only remaining action available

**Scenario:**
Player attacks first, then wants to move.

**User Experience:**
- After attack completes, `canAct = false` but `unitHasMoved = false`
- Move button remains **enabled** if unit hasn't moved yet
- Player can click Move and execute movement normally
- After moving, End Turn is the only remaining action available

**Important:** Unit can perform **one movement** and **one action** per turn in any order, but only once each.

---

## Technical Architecture

### State Management

**UnitTurnPhaseHandler State:**
- `canAct: boolean` - Initialized based on unit at phase start, set to false after action
- `unitHasMoved: boolean` - Tracks if unit has moved this turn
- `canResetMove: boolean` - Tracks if Reset Move is available
- `attackMode: boolean` - New flag indicating if attack mode is active
- `selectedTarget: CombatUnit | null` - Currently selected target for attack
- `attackAnimation: AttackAnimation | null` - Active attack animation (if any)

**PlayerTurnStrategy State:**
- Handles attack mode entry/exit
- Manages target selection hover state
- Pre-calculates attack range on mode entry (similar to movement path caching)
- Stores `attackRangeTiles: Position[]` and `validTargets: CombatUnit[]`

### New Utilities

**`utils/AttackRangeCalculator.ts`:**
- `calculateAttackRange(attacker: Position, weapon: Equipment, map: CombatMap, manifest: CombatUnitManifest): Position[]`
- Returns array of positions within weapon range (orthogonal distance)
- Similar to `MovementRangeCalculator` but uses weapon range instead of Move stat

**`utils/LineOfSightCalculator.ts`:**
- `hasLineOfSight(from: Position, to: Position, map: CombatMap, manifest: CombatUnitManifest): boolean`
- Uses Bresenham's line algorithm to trace path
- Checks each cell for walkability and unit occupation
- Returns true if path is clear, false if blocked

**`utils/CombatCalculations.ts`:**
- `getChanceToHit(attacker: CombatUnit, defender: CombatUnit, distance: number, damageType: 'physical' | 'magical'): number`
  - Stub: Returns 1.0 (100% hit rate) for now
  - Future: Calculate based on P.Evd/M.Evd stats
- `calculateAttackDamage(attacker: CombatUnit, weapon: Equipment, defender: CombatUnit, distance: number, damageType: 'physical' | 'magical'): number`
  - Stub: Returns 1 (1 damage) for now
  - Future: Calculate based on P.Pow/M.Pow, weapon stats, defender stats

### Panel Content

**`managers/panels/AttackMenuContent.ts`:**
- Implements `PanelContent` interface
- Renders attack-specific UI (title, weapon info, target selection, buttons)
- Handles clicks for Cancel Attack and Perform Attack buttons
- Handles hover for button highlighting
- Returns `PanelClickResult` with `{ type: 'cancel-attack' }` or `{ type: 'perform-attack' }`

### Animation

**`AttackAnimationSequence.ts`:**
- Handles miss text / damage number floating animation
- Handles target tile red flicker for hits
- Updates each frame during animation
- Blocks input until complete
- Duration: 2.2 seconds per attack (0.2s flicker + 2.0s float)

### Enemy AI (Stub)

**`strategies/EnemyTurnStrategy.ts`:**
- Add method: `_evaluateAttackAction(): TurnAction | null` (stub for now)
- Future: Check for attackable targets, calculate best target, return `{ type: 'attack', target: Position }`
- For now: Returns `null` (enemy continues to End Turn immediately)

---

## Implementation Checklist

- [ ] Create `colors.ts` constants for attack colors (6 new colors)
- [ ] Create `utils/AttackRangeCalculator.ts` utility
- [ ] Create `utils/LineOfSightCalculator.ts` utility with Bresenham algorithm
- [ ] Create `utils/CombatCalculations.ts` with stub methods
- [ ] Create `managers/panels/AttackMenuContent.ts` panel
- [ ] Create `AttackAnimationSequence.ts` for attack animations
- [ ] Update `UnitTurnPhaseHandler.ts`:
  - Add `canAct` state initialization
  - Add attack mode state tracking
  - Add attack animation rendering in `renderUI()`
  - Handle attack range rendering in `render()`
  - Handle target selection in `handleMapClick()`
  - Handle attack execution and animation
- [ ] Update `PlayerTurnStrategy.ts`:
  - Add `enterAttackMode()` and `exitAttackMode()` methods
  - Add attack range calculation and caching
  - Add target hover/selection logic
  - Return attack action when target selected and button clicked
- [ ] Update `ActionsMenuContent.ts`:
  - Disable Attack/Delay/Primary/Secondary buttons when `canAct = false`
  - Show "Attack" button in green when attack mode active
- [ ] Update `CombatLayoutManager.ts`:
  - Switch to `AttackMenuContent` when attack mode active
  - Restore `ActionsMenuContent` when attack mode exits
- [ ] Add tests for line of sight calculation with various diagonal scenarios
- [ ] Add tests for dual wielding attack execution
- [ ] Stub `EnemyTurnStrategy` attack evaluation method

---

## Questions Resolved

1. **Attack range calculation:** Based on weapon range, orthogonal counting from attacker position
2. **Line of sight:** Bresenham's line algorithm, blocked by non-walkable tiles and units
3. **Dual wielding:** Two weapons equipped (not two-handed), performs two separate attacks with independent rolls
4. **Attack after move:** Yes, units can move then attack, or attack then move (one of each per turn)
5. **State management:** `canAct` tracked in `UnitTurnPhaseHandler`
6. **Enemy AI:** Stub for now, future implementation
7. **Mode switching:** Entering attack mode clears movement range, must cancel to switch modes
8. **Color scheme:** 6 new colors defined in `colors.ts`
9. **Two-handed weapons:** Just show single weapon, normal attack, no special properties
10. **Animation sequence:** Miss shows "Miss" floating up for 2s, Hit shows red flicker (200ms) then damage number floating for 2s
11. **Range highlighting:** Entire range highlighted with color-coded system (red base, grey blocked, yellow valid, orange hovered, green selected)

---

**End of AttackActionOverview.md**

# Attack Action - Quick Reference

**Purpose:** Token-efficient reference for AI agents working on Attack Action implementation

**Last Updated:** 2025-10-30 (Step 4 Complete + Bug Fixes)

---

## Quick Index

- [Overview](#overview) - What is the Attack Action feature?
- [Implementation Steps](#implementation-steps) - Chronological implementation guide
- [Current Status](#current-status) - What's done, what's next
- [Key Files](#key-files) - Where to find critical code
- [Technical Patterns](#technical-patterns) - Important implementation details
- [Next Steps](#next-steps) - Upcoming work

---

## Overview

The **Attack Action** allows units to attack enemies during the Unit Turn Phase. Players select targets within weapon range, view hit chance and damage predictions, and execute attacks with visual feedback.

### Core Features

1. **Attack Range Visualization** - Color-coded tiles (red=range, white=blocked, yellow=valid target, orange=hover, green=selected)
2. **Line of Sight** - Bresenham's algorithm checks if walls/units block attack paths
3. **Attack Menu Panel** - Shows weapon info, target selection, hit%, damage prediction
4. **Attack Execution** - Damage calculation, animations (flicker + floating numbers), combat log
5. **Dual Wielding** - Two independent attacks with separate rolls

### User Flow Summary

```
Click "Attack" button
    ↓
See range highlights (red=range, yellow=valid target, white=blocked)
    ↓
Hover over targets (orange highlight)
    ↓
Click target (green highlight, shows weapon info + hit%/damage)
    ↓
Click "Perform Attack" button
    ↓
Animation plays (3s per weapon: red flicker + floating damage/miss text)
    ↓
Damage applied, combat log updated, knockout detection
    ↓
Return to Actions menu (unit can still move if not moved yet)
```

---

## Implementation Steps

### ✅ Step 1: Add Attack Menu Panel
**File:** [01-AddAttackMenu.md](./01-AddAttackMenu.md)
**Branch:** `attack-action` (commit `70ed5a0`)
**Status:** Complete

**What Was Done:**
- Created `AttackMenuContent.ts` panel with title, placeholder text, Cancel button
- Added attack mode state to `PlayerTurnStrategy` (`'attackSelection'` mode)
- Panel switching logic in `CombatLayoutManager` (shows AttackMenuContent when `activeAction === 'attack'`)
- Attack button highlights green when active

**Key Files Created:**
- `managers/panels/AttackMenuContent.ts` (230 lines)

**Key Files Modified:**
- `PlayerTurnStrategy.ts` - Attack mode toggle methods
- `UnitTurnPhaseHandler.ts` - `getActiveAction()` returns 'attack' in attack mode
- `CombatLayoutManager.ts` - Panel switching based on active action
- `CombatView.tsx` - Handles 'cancel-attack' click result

---

### ✅ Step 2: Add Range Preview
**File:** [02-AddRangePreview.md](./02-AddRangePreview.md)
**Code Review:** [02-AddRangePreview-CodeReview.md](./02-AddRangePreview-CodeReview.md)
**Branch:** `attack-action-preview-range`
**Status:** Complete, approved for merge

**What Was Done:**
- Implemented Bresenham's line algorithm for line of sight (blocks on walls/units)
- Manhattan distance attack range calculation (orthogonal tiles)
- Color-coded tile rendering with priority system (one color per tile)
- Position-based recalculation (updates when unit moves)
- Hover detection for target highlighting

**Key Files Created:**
- `utils/LineOfSightCalculator.ts` - Bresenham's algorithm
- `utils/AttackRangeCalculator.ts` - Range calculation + categorization

**Key Files Modified:**
- `CombatConstants.ts` - 6 attack color constants + alpha
- `TurnStrategy.ts` - Optional `getAttackRange()`, `getHoveredAttackTarget()` methods
- `PlayerTurnStrategy.ts` - Attack range state, position tracking, recalculation
- `UnitTurnPhaseHandler.ts` - Priority-based rendering in `renderUI()`

**Technical Highlights:**
- **Single-color rendering:** Priority Map reduces draw calls by ~75%
- **Tinting buffer caching:** Avoids 720+ allocations/sec at 60fps
- **Position change detection:** Recalculates range when unit moves
- **100% GeneralGuidelines.md compliance** (see code review)

**Color System:**
```typescript
Priority (highest to lowest):
1. Orange (#ffa500) - Hovered target
2. Yellow (#ffff00) - Valid target
3. White (#ffffff) - Blocked (wall/no LOS)
4. Red (#ff0000) - Base range
Alpha: 0.33 (semi-transparent)
```

---

### ✅ Step 3: Target Selection and Attack Info Display
**File:** [03-AttackActionTargetInfo.md](./03-AttackActionTargetInfo.md)
**Code Review:** [03-AttackActionTargetInfo-CodeReview.md](./03-AttackActionTargetInfo-CodeReview.md)
**Branch:** `attack-action-03-show-info`
**Status:** Complete, approved for merge

**What Was Done:**
- Implemented target selection (click yellow/orange tiles)
- Selected targets turn green (highest priority color)
- Attack menu displays selected target name in orange
- Weapon info section shows name, range, hit%, damage for each weapon
- Dual wielding support (two-column layout with 8px gap)
- Hit% and damage calculations (stub formulas: 100% hit, 1 damage)
- "Perform Attack" button appears when target selected
- Position data flows from CombatView through layout system to attack menu

**Key Files Created:**
- `utils/CombatCalculations.ts` - Stub hit chance and damage calculations

**Key Files Modified:**
- `AttackMenuContent.ts` - Major rewrite to fully functional attack info panel
- `PlayerTurnStrategy.ts` - Target selection click handling, `getSelectedAttackTarget()` method
- `CombatView.tsx` - Position data retrieval and flow
- `UnitTurnPhaseHandler.ts` - Green highlight rendering for selected target
- `CombatLayoutManager.ts` - Position data passing to attack menu
- `TurnStrategy.ts` - Optional `getSelectedAttackTarget()` interface method
- `PanelContent.ts` - Added 'perform-attack' click result type

**Technical Highlights:**
- **Stub calculation system:** Clean interface for future formula implementation
- **Position data flow:** Queries at source, passes through context, no coupling
- **Dual wielding layout:** Mathematical column width calculation, synchronized rendering
- **Button positioning:** Y positions tracked during render for accurate hit detection
- **State cleanup:** Selected target cleared in 5 transition points
- **100% GeneralGuidelines.md compliance** (see code review)

**Color System (Updated):**
```typescript
Priority (highest to lowest):
1. Green (#00ff00) - Selected target ← NEW
2. Orange (#ffa500) - Hovered target
3. Yellow (#ffff00) - Valid target
4. White (#ffffff) - Blocked (wall/no LOS)
5. Red (#ff0000) - Base range
Alpha: 0.33 (semi-transparent)
```

---

### ✅ Step 4: Attack Execution and Animation
**File:** [04-AttackActionPerformAttack.md](./04-AttackActionPerformAttack.md)
**Code Review:** [04-AttackActionPerformAttack-CodeReview.md](./04-AttackActionPerformAttack-CodeReview.md)
**Developer Docs:** [DeveloperTestingFunctions.md](./DeveloperTestingFunctions.md)
**Branch:** `attack-action-04-perform-attack`
**Status:** Complete, approved for merge

**What Was Done:**
- Implemented attack execution with hit/miss rolls and damage application
- Created attack animation system (red flicker + floating damage numbers)
- Single weapon: One 3-second animation per attack
- Dual wielding: Two sequential 3-second animations (6s total)
- Combat log messages for all attack outcomes
- Knockout detection when wounds >= health
- Button disabling system (canAct flag prevents actions during animation)
- Developer testing functions for hit rate and damage overrides

**Key Files Created:**
- `models/combat/AttackAnimationSequence.ts` - Attack visual feedback system (172 lines)
- `AttackActionImpl/DeveloperTestingFunctions.md` - Developer console utilities (187 lines)

**Key Files Modified:**
- `UnitTurnPhaseHandler.ts` - Attack execution, animation orchestration (+262 lines)
- `CombatCalculations.ts` - Developer override system (+65 lines)
- `CombatView.tsx` - Developer functions exposed, perform-attack handler (+40 lines)
- `ActionsMenuContent.ts` - Button disabling based on canAct flag (+24/-24 lines)

**Technical Highlights:**
- **Attack Animation:** 3.0s total (1s red flicker at 150ms intervals + 2s floating text)
- **Dual Wielding:** Independent hit rolls per weapon, sequential animations
- **Button Disabling:** canAct=false set IMMEDIATELY before animation (prevents race conditions)
- **Developer Tools:** Persistent overrides for hit rate and damage testing
- **Damage Application:** Supports both setWounds() method and direct mutation fallback
- **Knockout Detection:** Checks wounds >= health, adds combat log message
- **100% GeneralGuidelines.md compliance** (see code review)

**Animation Timing:**
```typescript
Hit Animation:
- 0-1000ms: Red flicker (150ms intervals, ~6-7 flickers)
- 1000-3000ms: Damage number floats up 12px (1 tile)

Miss Animation:
- 0-3000ms: White "Miss" text floats up 12px

Dual Wielding:
- First attack: 0-3000ms
- Second attack: 3000-6000ms
```

**Developer Testing Functions:**
```javascript
// Browser console commands
setHitRate(0.5)        // 50% hit chance
setDamage(10)          // 10 damage per hit
clearAttackOverride()  // Reset to defaults
```

---

## Bug Fixes and Improvements (Post-Step 4)

### 🐛 Bug Fix 1: Knockout Detection Logic
**Branch:** `attack-action-bugs`
**Issue:** Knockout detection used `target.health` (remaining HP) instead of `target.maxHealth`
**Files Fixed:**
- `UnitTurnPhaseHandler.ts` (lines 1157, 1150, 1153)
- `CombatUnit.ts` (documentation clarified)

**Changes:**
- Fixed knockout check: `wounds >= maxHealth` (was `wounds >= health`)
- Fixed wound capping: `Math.min(newWounds, maxHealth)` (was using `health`)
- Added comprehensive documentation explaining health vs maxHealth semantics

**Impact:** Units are now correctly knocked out when total damage equals or exceeds max health capacity

---

### 🐛 Bug Fix 2: Dual-Wield Knockout Message Timing
**Branch:** `attack-action-bugs`
**Issue:** Knockout message appeared between two strike messages instead of after both
**File Fixed:** `UnitTurnPhaseHandler.ts` (lines 1136-1158, 1080-1084, 1135-1139)

**Root Cause:** `applyDamage()` immediately added knockout message during damage application

**Solution:**
- Removed knockout detection from `applyDamage()` (now only updates wounds)
- Added knockout check after single-weapon attack (after damage message)
- Added knockout check after dual-wield loop (after all strike messages)

**Impact:** Combat log now shows correct message order for dual-wielding knockouts

---

### ✨ Improvement 1: Text Shadow Support
**Branch:** `attack-action-bugs`
**File Created:** `FontAtlasRenderer.ts` - `renderTextWithShadow()` method (lines 123-183)

**Features:**
- Renders text with configurable drop shadow for improved readability
- Parameters: shadowColor (default black), shadowOffsetX/Y (default 1px)
- Uses two `renderText()` calls (shadow first, then main text)
- Works with all alignment options (left/center/right)

**Usage:**
```typescript
FontAtlasRenderer.renderTextWithShadow(
  ctx, text, x, y, fontId, atlasImage,
  scale, alignment, color, shadowColor, offsetX, offsetY
);
```

---

### ✨ Improvement 2: Floating Text Uses Shadows
**Branch:** `attack-action-bugs`
**File Modified:** `AttackAnimationSequence.ts` (lines 127-140, 160-172)

**Changes:**
- Damage numbers now render with black shadow
- Miss text now renders with black shadow
- Both use default 1px offset for crisp pixel-art effect

**Impact:** Floating damage/miss text is now readable against any background (tiles, units, terrain)

---

## Current Status

### Completed ✅
- [x] Attack menu panel structure
- [x] Attack mode state management
- [x] Panel switching (Actions ↔ Attack)
- [x] Line of sight calculation (Bresenham)
- [x] Attack range calculation (Manhattan distance)
- [x] Range visualization (color-coded tiles)
- [x] Position tracking and recalculation
- [x] Hover detection for targets
- [x] Target selection (click to select)
- [x] Weapon stats display in panel
- [x] Hit% and damage prediction (stub formulas)
- [x] Dual wielding UI support (two columns)
- [x] "Perform Attack" button
- [x] Attack execution (damage application)
- [x] Attack animations (red flicker, floating text with shadows)
- [x] Dual wielding execution (two sequential attacks)
- [x] Knockout detection (wounds >= maxHealth) - FIXED
- [x] Combat log messages (hit/miss/damage/knockout) - FIXED order
- [x] Button disabling during animations
- [x] Developer testing functions
- [x] Text shadow rendering utility
- [x] Improved floating text readability

### In Progress 🚧
- None (Step 4 complete, ready for merge to attack-action branch)

### Not Started 📋
- [ ] Victory/defeat condition checks (all enemies/players knocked out)
- [ ] Real combat formulas (replace stubs with actual calculations)
- [ ] Enemy AI attack evaluation
- [ ] Counterattacks
- [ ] Critical hits
- [ ] Status effects

---

## Key Files

### Core Attack Logic
- **`PlayerTurnStrategy.ts`** - Attack mode state, range calculation, target selection
- **`UnitTurnPhaseHandler.ts`** - Rendering, active action state, attack execution, animation orchestration
- **`AttackMenuContent.ts`** - Panel UI, button handling, button disabling

### Animation
- **`AttackAnimationSequence.ts`** - Attack visual feedback (red flicker, floating damage/miss text)

### Utilities
- **`AttackRangeCalculator.ts`** - Manhattan distance, tile categorization
- **`LineOfSightCalculator.ts`** - Bresenham's algorithm, blocking checks
- **`CombatCalculations.ts`** - Hit chance and damage calculations (stub formulas + developer overrides)
- **`FontAtlasRenderer.ts`** - Text rendering with shadow support (readability enhancement)

### Constants
- **`CombatConstants.ts`** - Color constants (6 attack colors + alpha)

### Layout
- **`CombatLayoutManager.ts`** - Panel switching logic
- **`CombatView.tsx`** - Event handling, active action retrieval, developer function exposure

---

## Technical Patterns

### Attack Mode State Machine
```typescript
PlayerTurnStrategy modes:
- 'normal' → Click "Attack" → 'attackSelection'
- 'attackSelection' → Click "Cancel Attack" → 'normal'
- 'moveSelection' ↔ 'attackSelection' (mutually exclusive)
```

### Attack Range Calculation Flow
```
1. enterAttackMode()
   ↓
2. Get current position from manifest (not cached activePosition)
   ↓
3. Get weapon range from equipped weapons
   ↓
4. AttackRangeCalculator.calculateAttackRange()
   ↓
5. For each tile in weapon range (Manhattan distance):
   - Is wall? → blocked[]
   - Has line of sight? No → blocked[]
   - Has unit? Yes → validTargets[]
   - Otherwise → inRange[]
   ↓
6. Cache result + position
   ↓
7. On next getAttackRange() call:
   - Compare current position to cached position
   - If changed → recalculate
   - Otherwise → return cached result
```

### Rendering Pipeline
```
render() method:
  - Movement range highlights (underlays)

[Units rendered by base system]

renderUI() method:
  - Attack range highlights (overlays) ← Renders ABOVE units
  - Priority Map ensures one color per tile
  - Cursors, animated units
```

### Line of Sight Algorithm
```
Bresenham's line algorithm:
1. Get all points along line from attacker to target
2. Exclude start (attacker) and end (target) positions
3. For each intermediate point:
   - Out of bounds? → No LOS
   - Non-walkable? → No LOS
   - Has unit? → No LOS
4. All clear? → Has LOS
```

---

## Next Steps

### Immediate (Ready for Merge)
- Merge `attack-action-04-perform-attack` → `attack-action` branch
- Run final testing suite (manual + automated if available)
- Consider merging `attack-action` → `main` for deployment

### Short-term (Step 5: Victory/Defeat)
1. Detect when all enemies are knocked out (victory condition)
2. Detect when all player units are knocked out (defeat condition)
3. Create victory/defeat phase handlers
4. Victory/defeat UI screens
5. Proper game state transitions

### Medium-term (Step 6: Real Combat Formulas)
1. Replace stub formulas with real combat calculations:
   - Hit chance: Attacker accuracy vs defender P.Evd/M.Evd
   - Damage: Weapon power + attacker P.Pow/M.Pow - defender defenses
   - Distance modifiers (accuracy penalty, damage falloff)
   - Critical hits (weapon crit chance)
2. Implement damage types:
   - Physical vs Magical attacks
   - Elemental affinities and resistances
   - Armor vs magic defense
3. Enemy AI attack evaluation
4. Status effects, special abilities (future enhancements)

---

## Reference Documents

- **[AttackActionOverview.md](../AttackActionOverview.md)** - Full specification (579 lines)
- **[01-AddAttackMenu.md](./01-AddAttackMenu.md)** - Step 1 implementation summary
- **[02-AddRangePreview.md](./02-AddRangePreview.md)** - Step 2 implementation summary
- **[02-AddRangePreview-CodeReview.md](./02-AddRangePreview-CodeReview.md)** - Step 2 code quality review
- **[03-AttackActionTargetInfo.md](./03-AttackActionTargetInfo.md)** - Step 3 implementation summary
- **[03-AttackActionTargetInfo-CodeReview.md](./03-AttackActionTargetInfo-CodeReview.md)** - Step 3 code quality review
- **[04-AttackActionPerformAttack.md](./04-AttackActionPerformAttack.md)** - Step 4 implementation summary
- **[04-AttackActionPerformAttack-CodeReview.md](./04-AttackActionPerformAttack-CodeReview.md)** - Step 4 code quality review
- **[DeveloperTestingFunctions.md](./DeveloperTestingFunctions.md)** - Developer console utilities
- **[ModifiedFilesManifest.md](./ModifiedFilesManifest.md)** - Complete file change tracking
- **[CombatHierarchy.md](../CombatHierarchy.md)** - Overall combat system architecture
- **[GeneralGuidelines.md](../GeneralGuidelines.md)** - Coding standards and patterns

---

## Common Questions

**Q: Why does attack range recalculate when unit moves?**
A: Attack range is based on current position. If unit moves during their turn before attacking, range must be recalculated from new position. We cache the position used for calculation and detect changes.

**Q: Why render attack range in `renderUI()` instead of `render()`?**
A: `renderUI()` runs AFTER units are drawn, so highlights appear on top of sprites. `render()` runs BEFORE units, so highlights would appear underneath.

**Q: Why use priority Map instead of multiple render passes?**
A: Rendering red, then grey, then yellow, then orange would create 4 overlapping layers (overdraw). Priority Map determines final color first, then renders each tile exactly once. Reduces draw calls by ~75%.

**Q: Why query manifest for position instead of using cached `activePosition`?**
A: `activePosition` is set at turn start and never updated. If unit moves, it becomes stale. Manifest is the authoritative source for current position.

**Q: What's the difference between attack mode and move mode?**
A: Move mode shows movement range (yellow tiles, pathfinding). Attack mode shows attack range (red/white/yellow tiles, line of sight). They're mutually exclusive - entering one exits the other.

**Q: Can units attack after moving?**
A: Yes. Units can perform one movement and one action per turn in any order. Move then attack, or attack then move (if haven't moved yet).

**Q: What are the developer testing functions for?**
A: The developer console functions (`setHitRate()`, `setDamage()`, `clearAttackOverride()`) allow testing attack scenarios without implementing real combat formulas. They override the stub calculations to test animations, UI states, knockout detection, etc. Overrides persist until explicitly cleared.

**Q: Why does the attack animation last 3 seconds instead of the original 2.2 seconds?**
A: User feedback during implementation indicated the flicker was too fast at 200ms. Final timing is 1 second flicker (150ms intervals) + 2 seconds floating text = 3 seconds total. For dual wielding: 6 seconds total (3s per weapon).

**Q: Why is canAct set to false BEFORE the animation starts?**
A: This was a critical bug fix. Initially canAct was set to false after the animation completed, which allowed the player to click menu buttons during the 3-6 second animation, causing race conditions and state bugs. Setting it false immediately prevents all interaction during animation playback.

**Q: How does knockout detection work?**
A: After applying damage, the system checks if `target.wounds >= target.maxHealth`. If true, the unit is knocked out and a combat log message is added. Victory/defeat detection (checking if all enemies/players are knocked out) is planned for Step 5.

**IMPORTANT:** This was fixed in the bug fix session - originally incorrectly used `target.health` (remaining HP) instead of `target.maxHealth` (max HP capacity).

**Q: Why was the knockout detection bug hard to catch?**
A: The naming is confusing: `health` is a getter that returns `maxHealth - wounds` (remaining HP), not the maximum. The bug was `wounds >= health` which compares "damage taken" to "HP remaining" - nonsensical logic. Correct is `wounds >= maxHealth` comparing total damage to max capacity. Documentation was added to prevent this in the future.

**Q: Why does the knockout message appear AFTER all strikes in dual-wielding?**
A: Originally `applyDamage()` immediately checked for knockout, causing the message to appear between strikes. Fixed by moving knockout detection to the caller after all damage messages are logged. This ensures proper message ordering: "First strike... Second strike... [target] was knocked out."

**Q: Why does floating text have shadows now?**
A: Damage numbers and "Miss" text can be difficult to read when appearing over same-colored tiles or units. Drop shadows (black, 1px offset) ensure text is readable against any background. The `renderTextWithShadow()` utility method was added to `FontAtlasRenderer` for this purpose.

---

**End of Quick Reference**

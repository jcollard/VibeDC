# Attack Action - Quick Reference

**Purpose:** Token-efficient reference for AI agents working on Attack Action implementation

**Last Updated:** 2025-10-29

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
Click "Attack" → See range highlights → Hover/click target → See prediction → Click "Perform Attack" → Animation plays → Unit done
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

### 🚧 Step 3: Target Selection (Planned)
**Status:** Not started

**Goals:**
- Click yellow/orange tiles to select target
- Selected tile turns green
- Update AttackMenuContent to show selected target name
- Display hit% and damage prediction for selected target
- Show "Perform Attack" button when target selected

**Key Work:**
- Update `PlayerTurnStrategy.handleMapClick()` to handle target selection
- Add `selectedTarget` state tracking
- Update `AttackMenuContent` to show weapon stats, hit%, damage
- Implement stub damage calculation (`CombatCalculations.ts`)

---

### 🚧 Step 4: Attack Execution (Planned)
**Status:** Not started

**Goals:**
- Click "Perform Attack" → execute attack
- Single weapon: One attack roll, damage application
- Dual wielding: Two sequential attacks (4.4s total animation)
- Combat log messages for hit/miss/damage/knockout
- Set `canAct = false` after attack

**Key Work:**
- Create `AttackAnimationSequence.ts` (flicker + floating text)
- Implement damage calculation in phase handler
- Update unit HP (wounds system)
- Handle knockout detection
- Disable Attack/Delay/Class buttons after attack

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

### In Progress 🚧
- [ ] Target selection (click to select)
- [ ] Weapon stats display in panel
- [ ] Hit% and damage prediction

### Not Started 📋
- [ ] Attack execution (damage application)
- [ ] Attack animations (flicker, floating numbers)
- [ ] Dual wielding support (two attacks)
- [ ] Knockout detection
- [ ] Victory/defeat condition checks
- [ ] Enemy AI attack evaluation (stub)

---

## Key Files

### Core Attack Logic
- **`PlayerTurnStrategy.ts`** - Attack mode state, range calculation, target selection
- **`UnitTurnPhaseHandler.ts`** - Rendering, active action state, attack execution
- **`AttackMenuContent.ts`** - Panel UI, button handling

### Utilities
- **`AttackRangeCalculator.ts`** - Manhattan distance, tile categorization
- **`LineOfSightCalculator.ts`** - Bresenham's algorithm, blocking checks
- **`CombatCalculations.ts`** - (Future) Hit chance, damage formulas

### Constants
- **`CombatConstants.ts`** - Color constants (6 attack colors + alpha)

### Layout
- **`CombatLayoutManager.ts`** - Panel switching logic
- **`CombatView.tsx`** - Event handling, active action retrieval

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

### Immediate (Step 3: Target Selection)
1. Add `selectedTarget: Position | null` to PlayerTurnStrategy
2. Update `handleMapClick()` to detect clicks on `validTargets[]`
3. Add `getSelectedTarget()` method to strategy interface
4. Update UnitTurnPhaseHandler rendering to show green highlight
5. Update AttackMenuContent to display:
   - Selected target name in orange
   - Weapon stats (name, range)
   - Placeholder hit%/damage (stubs)
   - "Perform Attack" button (visible when target selected)

### Short-term (Step 4: Attack Execution)
1. Create `utils/CombatCalculations.ts` with stub methods:
   - `getChanceToHit()` → returns 1.0 (100% hit)
   - `calculateAttackDamage()` → returns 1 (1 damage)
2. Create `AttackAnimationSequence.ts` for animations:
   - Red flicker (200ms, 50ms intervals)
   - Floating text (2s, moves up 12px)
   - "Miss" text (white) or damage number (red)
3. Update phase handler to execute attack:
   - Roll hit/miss using stub
   - Apply damage to target unit
   - Create animation sequence
   - Add combat log messages
   - Set `canAct = false` after completion

### Long-term
1. Implement real damage formulas (P.Pow, M.Pow, defenses)
2. Dual wielding support (two sequential attacks)
3. Knockout visual indicators
4. Enemy AI attack evaluation
5. Critical hits, status effects (future enhancements)

---

## Reference Documents

- **[AttackActionOverview.md](../AttackActionOverview.md)** - Full specification (579 lines)
- **[01-AddAttackMenu.md](./01-AddAttackMenu.md)** - Step 1 implementation summary
- **[02-AddRangePreview.md](./02-AddRangePreview.md)** - Step 2 implementation summary
- **[02-AddRangePreview-CodeReview.md](./02-AddRangePreview-CodeReview.md)** - Code quality review
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

---

**End of Quick Reference**

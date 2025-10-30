# CombatHierarchy.md Updates for Attack Action

**Date:** 2025-10-30 (Updated: Thu, Oct 30, 2025 11:27:38 AM)
**Branch:** `attack-action`
**Document Updated:** `CombatHierarchy.md` (v1.8 → v1.9)

---

## Summary

Updated `CombatHierarchy.md` to document all attack action components and features added in the attack-action branch. The hierarchy document now comprehensively covers the attack system architecture.

---

## Changes Made

### Version Update
- **Version:** 1.8 → 1.9
- **Last Updated:** Wed, Oct 29, 2025 → Thu, Oct 30, 2025 11:27:38 AM
- **Update Note:** "Added attack action components and utilities"
- **Timestamp Note:** Added HTML comment `<!-- Update using `date` command -->` for future maintainers

### Navigation Index Updates

Added new task mappings:
- **Attack action** → `AttackMenuContent.ts`, `AttackAnimationSequence.ts`
- **Combat formulas** → `CombatCalculations.ts`
- **Attack range** → `AttackRangeCalculator.ts`, `LineOfSightCalculator.ts`

### Quick Reference Updates

Added attack task reference:
```markdown
- **Add attack logic** → `AttackMenuContent` (panel), `CombatCalculations` (formulas),
  `AttackRangeCalculator` (range), `AttackAnimationSequence` (animation)
```

### Core State & Data Updates

#### `CombatConstants.ts` (lines 213-233)
Added attack range color constants:
- `ATTACK_RANGE_BASE_COLOR` - #ff0000 (red)
- `ATTACK_RANGE_BLOCKED_COLOR` - #ffffff (white)
- `ATTACK_TARGET_VALID_COLOR` - #ffff00 (yellow)
- `ATTACK_TARGET_HOVER_COLOR` - #ffa500 (orange)
- `ATTACK_TARGET_SELECTED_COLOR` - #00ff00 (green)
- Player/enemy name colors for combat log

### Phase Handler Updates

#### `UnitTurnPhaseHandler.ts` (lines 342-428)
**Key Methods Added:**
- `executeAttack()`, `handlePerformAttack()`, `handleCancelAttack()`, `getCanAct()`

**Current Functionality - Added:**
- Attack action execution with hit/miss rolls, damage, and animation
- Dynamic bottom panel (Actions menu OR Attack menu)
- Attack range highlights (5-level color priority)
- Attack animations (red flicker + floating damage, or "Miss" text)

**Attack Animation Section (New):**
- Hit: Red flicker (1s) + damage floats (2s) = 3s total
- Miss: "Miss" text floats (3s)
- Dual wielding: 6s total (two sequential animations)
- Buttons disabled during animation (canAct = false)
- Combat log messages with colored names
- Knockout detection (wounds >= maxHealth)

**State Tracking - Added:**
- `canAct`: Prevents actions during attack animation
- `attackAnimations`: Array of active attack animations
- `attackAnimationIndex`: Current animation for dual wielding

**Dependencies - Added:**
- `AttackAnimationSequence`, `CombatCalculations`

**Transitions - Updated:**
- Stays in phase after attack animation (no auto-advance)

### Turn Strategy Updates

#### `strategies/PlayerTurnStrategy.ts` (lines 446-483)
**Current Functionality - Added:**
- Attack mode: Click Attack button → attack range with 5-color priority
- Attack range: Manhattan distance + line of sight
- Target selection: Click valid target → turns green

**State Tracking - Added:**
- `mode`: Now includes `'attackSelection'`
- `attackRange`: Cached attack range (inRange, blocked, validTargets)
- `hoveredAttackTarget`: Orange highlight position
- `selectedAttackTarget`: Green highlight position
- `attackRangeCachedPosition`: Position for range calculation

**Attack Range Caching (New Section):**
- Calculates on `enterAttackMode()` based on weapon range
- Recalculates if unit position changes
- Cache cleared on `exitAttackMode()`

**Dependencies - Added:**
- `AttackRangeCalculator`

### Layout & UI Management Updates

#### `managers/panels/ActionsMenuContent.ts` (line 852)
**Dependencies - Updated:**
- Added `ACTIVE_COLOR` to colors.ts imports

#### `managers/panels/AttackMenuContent.ts` (NEW - lines 855-898)
**Purpose:** Attack action panel for weapon info, target selection, and attack predictions

**Key Features:**
- Title: "ATTACK" in dark red (#8B0000)
- Weapon info: Single/dual column layout
- Target selection with name display
- Cancel Attack button (always visible)
- Perform Attack button (only when target selected)
- Attack predictions using CombatCalculations

**State Management:**
- Cached in CombatLayoutManager
- `updateUnit()` and `updateSelectedTarget()` methods
- `setButtonsDisabled()` for animation control

### Cinematics & Animation Updates

#### `AttackAnimationSequence.ts` (NEW - lines 1047-1071)
**Purpose:** Animates attack visual feedback (hit/miss)

**Animation Behavior:**
- Hit: 3.0s (1s red flicker + 2s damage float)
- Miss: 3.0s ("Miss" text floats)
- Dual wielding: 6s total (sequential)
- Text shadows for readability

**Integration:**
- Phase handler creates sequence(s)
- Sequential rendering for dual wield
- Standalone interface (not CinematicSequence)

### Utilities & Predicates Updates

#### `utils/AttackRangeCalculator.ts` (NEW - lines 1154-1175)
**Purpose:** Calculates attack range with line of sight validation

**Algorithm:**
- Manhattan distance for range
- Bresenham's algorithm for LoS
- Categorizes: inRange, blocked, validTargets

**Line of Sight Rules:**
- Units block LoS
- Walls block LoS
- Uses LineOfSightCalculator

#### `utils/LineOfSightCalculator.ts` (NEW - lines 1177-1193)
**Purpose:** Bresenham line-of-sight checker

**Key Methods:**
- `hasLineOfSight()`: Returns boolean
- `getLinePositions()`: Returns path positions

**Algorithm:**
- Bresenham's line algorithm
- Checks intermediate tiles
- Blocks on walls and units

#### `utils/CombatCalculations.ts` (NEW - lines 1195-1219)
**Purpose:** Combat formulas for hit chance and damage

**Hit Chance Formula:**
- Physical: 100% - P.Evade + Courage bonus (3-97% clamped)
- Magical: 100% - M.Evade + Attunement bonus (3-97% clamped)

**Damage Formula:**
- Physical: (P.Pow + Weapon Mod) × Multiplier - Courage penalty
- Magical: (M.Pow + Weapon Mod) × Multiplier - Attunement penalty

**Developer Testing:**
- `setHitRate()`, `setDamage()`, `clearAttackOverride()`
- Exposed via window object

### File Count Update

**Total Files:** 60 → 65 (+5 new files)

**Breakdown Changes:**
- **Layout & UI:** 17 → 18 files (+AttackMenuContent)
- **Cinematics & Animation:** 8 → 9 files (+AttackAnimationSequence)
- **Utilities:** 2 → 5 files (+AttackRangeCalculator, +LineOfSightCalculator, +CombatCalculations)

**Note:** MovementPathfinder was already in the count but not explicitly listed in utilities section.

---

## New Components Documented

1. **AttackMenuContent.ts** - Attack panel UI
2. **AttackAnimationSequence.ts** - Attack animation
3. **AttackRangeCalculator.ts** - Range calculation utility
4. **LineOfSightCalculator.ts** - LoS validation utility
5. **CombatCalculations.ts** - Combat formulas

---

## Documentation Quality

All new components are documented with:
- ✅ Purpose statement
- ✅ Exports list
- ✅ Key methods
- ✅ Algorithm descriptions
- ✅ Dependencies
- ✅ Usage notes
- ✅ Integration patterns
- ✅ Performance characteristics

**Consistency:** All entries follow the existing CombatHierarchy.md documentation style and detail level.

---

## Verification

Verified that all attack-action branch additions are now documented in CombatHierarchy.md:
- ✅ Phase handler updates (UnitTurnPhaseHandler)
- ✅ Strategy updates (PlayerTurnStrategy)
- ✅ New panel content (AttackMenuContent)
- ✅ New animation (AttackAnimationSequence)
- ✅ New utilities (3 files)
- ✅ Constants updates (CombatConstants)
- ✅ File count updated

---

**Status:** ✅ CombatHierarchy.md fully updated for attack-action merge

# Attack Action Implementation - Step 4: Attack Execution and Animation

## Overview

This step implements the complete attack execution system, including hit/miss rolls, damage calculation, attack animations, dual wielding support, knockout detection, and developer testing tools. When a player clicks "Perform Attack", the system executes the attack, applies damage to the target, and plays visual feedback animations (red flicker for hits, white "Miss" text for misses).

## Branch Information

- **Source Branch**: `attack-action-04-perform-attack`
- **Target Branch**: `attack-action`
- **Status**: Ready to merge

## Changes Summary

### New Files Created (2)

1. **`react-app/src/models/combat/AttackAnimationSequence.ts`** (180 lines)
   - Manages attack animation visual feedback
   - Hit animation: Red flicker (1 second, 150ms intervals) + floating damage number (2 seconds)
   - Miss animation: White "Miss" text floating up (2 seconds)
   - Total duration: 3.0 seconds per attack
   - Handles damage number positioning and floating animation
   - Uses FontAtlasRenderer for text rendering
   - Supports variable damage values displayed on hit

2. **`DeveloperTestingFunctions.md`** (175 lines)
   - Complete documentation for developer console functions
   - `setHitRate(n)` - Override hit rate for testing (persists until cleared)
   - `setDamage(n)` - Override damage for testing (persists until cleared)
   - `clearAttackOverride()` - Clear all overrides
   - Usage examples and workflows
   - Implementation details and console logging info

### Modified Files (5)

3. **`react-app/src/models/combat/utils/CombatCalculations.ts`** (119 lines, +65/0)
   - Added developer mode override system (persists until cleared)
   - `nextHitRateOverride` and `nextDamageOverride` static properties
   - Updated `getChanceToHit()` to check for hit rate override
   - Updated `calculateAttackDamage()` to check for damage override
   - Added `setHitRate(hitRate: number)` - Set hit rate override with validation
   - Added `setDamage(damage: number)` - Set damage override with validation
   - Added `clearAttackOverride()` - Clear both overrides
   - Console logging for all override operations
   - Values clamped/validated automatically

4. **`react-app/src/models/combat/UnitTurnPhaseHandler.ts`** (1197 lines, +183/-8)
   - **Major Addition**: Complete attack execution system
   - Added attack animation state tracking:
     - `attackAnimations: AttackAnimationSequence[]` - Stores attack animations (can be multiple for dual wielding)
     - `attackAnimationIndex: number` - Tracks which animation is currently playing
     - `canAct: boolean` - Prevents actions after attack is performed
   - Updated `renderUI()` to render attack animations with font atlas
   - Updated `updatePhase()` to handle attack animation progression:
     - Updates current animation with deltaTime
     - Advances to next animation for dual wielding
     - Calls `completeAttack()` when all animations finish
   - Added `handlePerformAttack()` - Handles "Perform Attack" button clicks
   - Added `executeAttack()` - Core attack execution logic:
     - Sets `canAct = false` immediately (prevents menu interaction during animation)
     - Extracts equipped weapons (left/right hand)
     - Clears attack range highlights
     - Executes single or dual weapon attacks
     - Rolls hit/miss using `CombatCalculations.getChanceToHit()`
     - Calculates damage using `CombatCalculations.calculateAttackDamage()`
     - Applies damage to target
     - Creates attack animations
     - Adds combat log messages for all outcomes
   - Added `applyDamage()` - Applies damage to target unit:
     - Updates target wounds (increases HP loss)
     - Caps wounds at max health
     - Detects knockout when wounds >= health
     - Adds knockout message to combat log
   - Added `completeAttack()` - Cleanup after animation completes
   - Added `getCanAct()` - Getter for action availability
   - Updated `handleActionSelected()` to route 'perform-attack' actions
   - Reset `canAct`, `attackAnimations`, and `attackAnimationIndex` on turn start
   - Dual wielding support: Two sequential animations (6.0s total)

5. **`react-app/src/components/combat/CombatView.tsx`** (1584 lines, +22/-3)
   - Imported `CombatCalculations` for developer mode functions
   - Added `useEffect` hook to expose developer functions to window:
     - `window.setHitRate(n)` - Set hit rate override
     - `window.setDamage(n)` - Set damage override
     - `window.clearAttackOverride()` - Clear overrides
   - Added cleanup on component unmount (deletes window functions)
   - Added 'perform-attack' case to panel click handler:
     - Routes to `handleActionSelected('perform-attack')` on UnitTurnPhaseHandler
     - Triggers attack execution flow
   - Updated ActionsMenuContent state retrieval:
     - Added `canAct` getter call from phase handler
     - Passes `canAct` to `updateUnit()` call
     - Ensures buttons are disabled during attack animation

6. **`react-app/src/models/combat/managers/panels/ActionsMenuContent.ts`** (211 lines, +8/-8)
   - Updated `updateUnit()` signature to accept `canAct: boolean` parameter
   - Updated `buildButtonList()` signature to accept `canAct: boolean` parameter
   - Updated button enabled states based on `canAct`:
     - Attack button: `enabled: canAct`
     - Primary class button: `enabled: canAct`
     - Secondary class button: `enabled: canAct`
     - Delay button: `enabled: !hasMoved && canAct`
   - Updated console log messages to indicate override persistence
   - Move button already disabled by `hasMoved` logic

## Features Implemented

### 1. Attack Execution System
- **Button Handler**: "Perform Attack" button triggers attack execution
- **Weapon Detection**: Extracts left/right hand weapons from attacker
- **Distance Calculation**: Manhattan distance for range-based calculations
- **Hit/Miss Rolls**: Uses `CombatCalculations.getChanceToHit()` with random roll
- **Damage Calculation**: Uses `CombatCalculations.calculateAttackDamage()` for each hit
- **Damage Application**: Reduces target HP via wounds system
- **Knockout Detection**: Checks if target HP reaches 0
- **Combat Log Integration**: Messages for attacks, hits, misses, damage, knockouts
- **State Management**: `canAct` flag prevents multiple actions per turn

### 2. Attack Animation System
- **Hit Animation**:
  - Red flicker: 1 second (alternates every 150ms)
  - Floating damage number: 2 seconds (red text, moves up 12px)
  - Total: 3.0 seconds
- **Miss Animation**:
  - White "Miss" text: Floats up for 2 seconds
- **Animation Sequencing**: Sequential playback for dual wielding
- **Render Integration**: Animations rendered in `renderUI()` method
- **Font Atlas**: Uses 7px-04b03 font for text display
- **Centered Text**: Damage/miss text centered on target tile

### 3. Dual Wielding Support
- **Weapon Detection**: Identifies both left and right hand weapons
- **Sequential Attacks**: Two independent attack rolls
- **Independent Hit Rolls**: Each weapon rolls separately
- **Separate Animations**: 3 seconds per weapon (6 seconds total)
- **Combat Log Messages**: "First strike" and "Second strike" labels
- **Animation Queue**: Both animations stored, played sequentially

### 4. Button State Management
- **Immediate Disable**: `canAct` set to false at attack start (before animation)
- **Menu Interaction Prevention**: Buttons disabled during animation
- **Selective Disabling**: Attack, Primary, Secondary, Delay disabled
- **End Turn Remains**: End Turn button stays enabled
- **Reset Move Disabled**: `canResetMove` also set to false

### 5. Developer Testing Tools
- **Hit Rate Override**: `setHitRate(n)` - Set hit rate (0-1) until cleared
- **Damage Override**: `setDamage(n)` - Set damage value until cleared
- **Clear Overrides**: `clearAttackOverride()` - Reset to default calculations
- **Console Logging**: All operations logged with "[DEV]" prefix
- **Validation**: Values clamped/validated automatically
- **Persistence**: Overrides last until explicitly cleared
- **Window Exposure**: Functions available via browser console

## Technical Details

### Attack Execution Flow
```
1. User clicks "Perform Attack" button
   ↓
2. CombatView routes to UnitTurnPhaseHandler.handleActionSelected('perform-attack')
   ↓
3. handlePerformAttack() validates target and calls executeAttack()
   ↓
4. executeAttack():
   - Sets canAct = false immediately
   - Sets canResetMove = false
   - Clears attack range highlights
   - Exits attack mode
   ↓
5. For each equipped weapon:
   - Rolls hit/miss (getChanceToHit() vs random)
   - If HIT: calculateAttackDamage() → applyDamage() → create hit animation
   - If MISS: create miss animation
   - Adds combat log messages
   ↓
6. Stores animations in attackAnimations[]
   ↓
7. updatePhase() plays animations sequentially:
   - Updates current animation with deltaTime
   - Advances to next animation when complete
   - Calls completeAttack() when all done
   ↓
8. completeAttack() cleans up animation state
   ↓
9. Actions Menu shows disabled buttons (canAct = false)
```

### Animation Timing
```typescript
// Single Weapon
Hit Animation:  3.0s (1.0s flicker + 2.0s float)
Miss Animation: 2.0s (float only)

// Dual Wielding
Total Time: 6.0s (3.0s per weapon)
- First weapon:  3.0s
- Second weapon: 3.0s
```

### Damage Application
```typescript
// Wounds System (HP tracking)
currentWounds = target.wounds;          // Current HP loss
newWounds = currentWounds + damage;     // Add new damage
cappedWounds = min(newWounds, maxHP);   // Cap at max HP

// Knockout Check
if (target.wounds >= target.health) {
  // Unit is knocked out
  addKnockoutMessage();
}
```

### Hit/Miss Roll System
```typescript
// Get hit chance (0.0 to 1.0)
const hitChance = CombatCalculations.getChanceToHit(
  attacker,
  defender,
  distance,
  damageType
);

// Roll random number
const hitRoll = Math.random(); // 0.0 to 1.0

// Check hit
const isHit = hitRoll < hitChance;

// Currently: hitChance = 1.0 (100% hit rate stub)
// With override: hitChance = developer-set value
```

### Developer Override System
```typescript
// Setting overrides (persists until cleared)
setHitRate(0.5);   // 50% hit rate
setDamage(10);     // 10 damage

// Using overrides
getChanceToHit(...)
  → checks nextHitRateOverride
  → returns override if set
  → logs "[DEV] Using hit rate override: 50%"
  → does NOT clear override

calculateAttackDamage(...)
  → checks nextDamageOverride
  → returns override if set
  → logs "[DEV] Using damage override: 10"
  → does NOT clear override

// Clearing (manual)
clearAttackOverride();
  → sets both overrides to null
  → logs "[DEV] Attack overrides cleared"
```

### Combat Log Messages
```typescript
// Single Weapon Hit
"[color=#00cc00]Attacker[/color] attacks [color=#ff0000]Target[/color]..."
"[color=#00cc00]Attacker[/color] hits [color=#ff0000]Target[/color] for 1 damage."

// Single Weapon Miss
"[color=#00cc00]Attacker[/color] attacks [color=#ff0000]Target[/color] but misses."

// Dual Wielding
"[color=#00cc00]Attacker[/color] attacks [color=#ff0000]Target[/color] with both weapons..."
"First strike hits for 1 damage."
"Second strike misses."

// Knockout
"[color=#ff0000]Target[/color] was knocked out."
```

### Button State Logic
```typescript
// At attack start (executeAttack)
canAct = false;           // Prevents new actions
canResetMove = false;     // Prevents move reset

// Button enabled states (ActionsMenuContent.buildButtonList)
Move:      enabled: !hasMoved || canResetMove
Attack:    enabled: canAct        // ← DISABLED during animation
Primary:   enabled: canAct        // ← DISABLED during animation
Secondary: enabled: canAct        // ← DISABLED during animation
Delay:     enabled: !hasMoved && canAct  // ← DISABLED during animation
End Turn:  enabled: true          // ← ALWAYS ENABLED
```

## User Experience Flow

### Standard Attack (Single Weapon)
1. Player clicks "Perform Attack" button
2. Attack menu closes, returns to Actions Menu
3. Actions Menu buttons immediately disabled (greyed out)
4. Red flicker appears on target tile (1 second)
5. Damage number floats up in red (2 seconds)
6. Combat log shows: "Attacker hits Target for 1 damage."
7. Animation completes (3 seconds total)
8. Buttons remain disabled (canAct = false)
9. Player can only click "End Turn"

### Miss Animation
1. Player clicks "Perform Attack" button
2. Attack menu closes, returns to Actions Menu
3. Actions Menu buttons immediately disabled
4. No flicker (miss doesn't show flicker)
5. White "Miss" text floats up (2 seconds)
6. Combat log shows: "Attacker attacks Target but misses."
7. Animation completes
8. Buttons remain disabled

### Dual Wielding Attack
1. Player clicks "Perform Attack" button
2. Attack menu closes, buttons disabled
3. **First weapon animation** (3 seconds):
   - Red flicker on target (1s) if hit
   - Damage number floats up (2s) if hit
   - "Miss" floats up (2s) if miss
   - Combat log: "First strike hits for 1 damage." or "First strike misses."
4. **Second weapon animation** (3 seconds):
   - Same process for second weapon
   - Combat log: "Second strike hits for 1 damage." or "Second strike misses."
5. Total time: 6 seconds
6. Buttons remain disabled

### Knockout
1. Attack deals enough damage to reduce HP to 0
2. Normal hit animation plays
3. Combat log shows damage message
4. Combat log adds: "Target was knocked out."
5. Victory/defeat check performed (stubs currently)

### Developer Testing
```javascript
// In browser console during combat

// Test 50% hit rate
setHitRate(0.5);
// [DEV] Attack hit rate override set to: 50% (persists until cleared)

// Test high damage
setDamage(999);
// [DEV] Attack damage override set to: 999 (persists until cleared)

// Perform multiple attacks - all use overrides

// Clear overrides
clearAttackOverride();
// [DEV] Attack overrides cleared
```

## Build Status

✅ Build passes successfully
✅ No TypeScript errors
✅ All features working as designed

## Testing

The implementation has been tested with:
- Single weapon attacks (hit and miss)
- Dual wielding attacks (various hit/miss combinations)
- High damage values (knockout testing)
- Zero damage values (no knockout)
- Multiple sequential attacks on same target
- Attacks on different targets
- Developer override functions (setHitRate, setDamage, clearAttackOverride)
- Button state during animations (cannot interact)
- Animation timing (3s single, 6s dual)
- Combat log messages for all scenarios
- Flicker animation timing and visibility
- Floating text rendering and positioning

## Code Quality

### Type Safety
- All animation parameters properly typed
- Position types consistent throughout
- Equipment types validated (OneHandedWeapon, TwoHandedWeapon)
- CombatUnit type used consistently
- Return types explicit for all methods

### State Management
- `canAct` set immediately to prevent race conditions
- Animation state tracked in arrays for dual wielding
- Animation index tracks current position in sequence
- State cleared on turn start for new unit
- No state leakage between turns

### Performance
- Cached font atlas reference (not queried per frame)
- Animation update only runs when animations exist
- Integer math for all position calculations
- No allocations in render loop (pre-allocated arrays)
- Direct property access for fast reads

### Maintainability
- Clear method names (`executeAttack`, `applyDamage`, `completeAttack`)
- Comprehensive JSDoc comments
- Developer tools well-documented
- Stub calculations clearly marked
- Animation constants defined at class level
- Easy to adjust timing values

## Design Decisions

### 1. Set canAct = false Immediately
**Decision**: Set `canAct = false` at the START of `executeAttack()`, not at the end
**Rationale**:
- Prevents menu interaction during animation
- Avoids race condition where player clicks buttons before animation completes
- UI updates immediately show disabled buttons
- Matches expected behavior (action performed = cannot act again)

### 2. Persistent Developer Overrides
**Decision**: Overrides persist until `clearAttackOverride()` is called
**Rationale**:
- More convenient for testing (set once, test multiple attacks)
- Reduces console command repetition
- Clear intent with explicit clear function
- Better matches testing workflows

### 3. 1 Second Flicker Duration
**Decision**: Extended flicker from 200ms to 1 second (150ms intervals)
**Rationale**:
- More noticeable visual feedback
- Easier to see on fast displays
- Better matches impact feeling
- Still fast enough to maintain game pace

### 4. Sequential Dual Wielding Animations
**Decision**: Play dual wielding animations sequentially, not simultaneously
**Rationale**:
- Easier to read individual hit/miss results
- Clearer damage values (not overlapping)
- Follows turn-based game convention
- Simpler implementation (no parallel animation system needed)

### 5. Damage Applied During Animation Setup
**Decision**: Apply damage when creating animations, not after animation completes
**Rationale**:
- Simpler state management (no pending damage)
- HP updates immediately (can check knockout)
- Animation is purely visual feedback
- Matches expected behavior (attack resolves instantly, animation is flavor)

### 6. Exit Attack Mode Before Animation
**Decision**: Close attack panel and return to Actions Menu before animation plays
**Rationale**:
- Player sees action menu state immediately
- Clear feedback that action was performed
- Buttons disabled to prevent interaction
- Consistent with other action flows

## Files Modified

- `react-app/src/models/combat/utils/CombatCalculations.ts` (+65/0)
- `react-app/src/models/combat/UnitTurnPhaseHandler.ts` (+183/-8)
- `react-app/src/components/combat/CombatView.tsx` (+22/-3)
- `react-app/src/models/combat/managers/panels/ActionsMenuContent.ts` (+8/-8)

## Files Created

- `react-app/src/models/combat/AttackAnimationSequence.ts` (180 lines)
- `DeveloperTestingFunctions.md` (175 lines)

**Total Changes:** 5 files modified, 2 files created, 278 insertions, 19 deletions

## Next Steps

After merging this into `attack-action`:

### Step 5: Victory/Defeat Conditions
1. Implement victory phase:
   - Detect when all enemies are knocked out
   - Transition to victory phase
   - Display victory message and rewards
   - Return to overworld

2. Implement defeat phase:
   - Detect when all player units are knocked out
   - Transition to defeat phase
   - Display defeat message
   - Offer retry or return to overworld

3. Update knockout detection:
   - Remove knocked out units from turn order
   - Mark units as inactive on map
   - Update unit manifest state

### Step 6: Real Combat Formulas
1. Replace hit chance stub:
   - Factor in attacker accuracy stat
   - Factor in defender evasion (P.Evd for physical, M.Evd for magical)
   - Apply distance penalty (accuracy decreases with range)
   - Add weapon hit bonus modifiers

2. Replace damage stub:
   - Base damage from weapon power stat
   - Add attacker power (P.Pow for physical, M.Pow for magical)
   - Subtract defender defense (armor for physical, M.Def for magical)
   - Apply distance scaling (damage falloff at range)
   - Add critical hit system (weapon crit chance)
   - Add elemental affinity bonuses/penalties

3. Add damage variance:
   - Random variance (±10-20% of base damage)
   - Minimum damage floor (1 damage always deals at least 1)

### Step 7: Enemy AI Attack Logic
1. Implement enemy attack decision-making:
   - Scan for units in attack range
   - Calculate expected damage to each target
   - Prioritize targets (low HP, high threat, etc.)
   - Execute attack on optimal target
   - Use same attack execution flow as player

2. Add AI behaviors:
   - Aggressive (prioritize damage)
   - Defensive (prioritize survival)
   - Tactical (prioritize objectives)

### Step 8: Advanced Attack Features
1. Weapon abilities:
   - Special attacks per weapon type
   - Status effect application (poison, stun, etc.)
   - Multi-target attacks (sweep, cleave)
   - Charge attacks (skip turn to power up)

2. Counterattacks:
   - Defender can counter if in range
   - Counter damage calculation
   - Counter animation

3. Support attacks:
   - Adjacent allies can assist
   - Bonus damage from support
   - Support animation

## Summary

This step completes the core attack execution system. Players can now:
- Click "Perform Attack" to execute an attack
- See visual feedback (red flicker for hits, white "Miss" for misses)
- Watch damage numbers float up on hit
- Attack with dual wielding (two sequential attacks)
- See combat log messages for all outcomes
- Cannot perform multiple actions per turn (canAct enforcement)
- Cannot interact with menu during animations
- Knockouts are detected and logged

Developer testing tools allow easy testing of different hit rates and damage values without modifying code. The animation system provides clear visual feedback for attack results.

The stub calculation system is ready to be replaced with real formulas in the next step. All state transitions are clean, animations are smooth, and the system handles both single and dual wielding correctly.

The implementation follows the existing architectural patterns and is fully type-safe with no build errors.

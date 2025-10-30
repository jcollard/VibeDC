# Developer Testing Functions

This document describes the developer mode console functions available for testing the combat system.

## Attack Testing Functions

### `setHitRate(n)`

Sets the hit rate override for **all attacks until cleared**. The override persists across multiple attacks until `clearAttackOverride()` is called.

**Parameters:**
- `n` (number): Hit rate as a decimal between 0 and 1
  - `1.0` = 100% hit rate (always hits)
  - `0.5` = 50% hit rate
  - `0.0` = 0% hit rate (always misses)

**Examples:**
```javascript
// Force all attacks to miss until cleared
setHitRate(0);

// Force all attacks to have 50% hit rate
setHitRate(0.5);

// Force all attacks to always hit
setHitRate(1);
```

**Notes:**
- Values outside 0-1 will be clamped automatically
- Console logs will confirm when the override is set and used
- Override persists until explicitly cleared with `clearAttackOverride()`

---

### `setDamage(n)`

Sets the damage override for **all attacks until cleared**. The override persists across multiple attacks until `clearAttackOverride()` is called.

**Parameters:**
- `n` (number): Damage value (will be rounded to integer)
  - Negative values will be set to 0
  - Decimal values will be floored to the nearest integer

**Examples:**
```javascript
// Force all attacks to deal 10 damage until cleared
setDamage(10);

// Force all attacks to deal 0 damage
setDamage(0);

// Force all attacks to deal 999 damage
setDamage(999);
```

**Notes:**
- Console logs will confirm when the override is set and used
- Override persists until explicitly cleared with `clearAttackOverride()`
- Damage is capped at target's remaining HP

---

### `clearAttackOverride()`

Clears both hit rate and damage overrides, returning to default combat calculations.

**Parameters:**
- None

**Examples:**
```javascript
// Set overrides
setHitRate(0.5);
setDamage(10);

// Perform several attacks with these values...

// Clear all overrides
clearAttackOverride();

// Future attacks now use default calculations
```

**Notes:**
- Console logs will confirm when overrides are cleared
- Safe to call even if no overrides are active

---

## Usage Workflow

### Testing Hit Animation
```javascript
// 1. Start combat and select a unit to attack
// 2. In console, set damage to test different values
setDamage(5);

// 3. Perform multiple attacks and observe the red flicker + floating damage number
// 4. All attacks will use the override until cleared

// 5. Change the damage for different testing
setDamage(10);

// 6. Clear when done testing
clearAttackOverride();
```

### Testing Miss Animation
```javascript
// 1. Start combat and select a unit to attack
// 2. In console, force misses
setHitRate(0);

// 3. Perform multiple attacks and observe the white "Miss" text
// 4. All attacks will miss until cleared

// 5. Clear override to restore normal behavior
clearAttackOverride();
```

### Testing Mixed Hit/Miss
```javascript
// Set 50% hit rate
setHitRate(0.5);
setDamage(5);

// Perform multiple attacks to see random variation
// Some will hit (red flicker + damage), some will miss (white "Miss")

// Clear when done
clearAttackOverride();
```

### Testing Dual Wielding
```javascript
// 1. Equip a unit with two one-handed weapons
// 2. Set overrides before attacking
setHitRate(0.5);  // 50% chance for each weapon
setDamage(3);     // 3 damage per hit

// 3. Perform attacks - override applies to BOTH weapon attacks
// 4. Each weapon rolls independently using the override hit rate

// 5. Clear when done testing
clearAttackOverride();
```

### Testing High Damage
```javascript
// Test knockout animation
setDamage(999);  // Overkill damage to ensure knockout

// Perform attack to see knockout message and victory/defeat check

// Clear override when done
clearAttackOverride();
```

### Testing Multiple Units
```javascript
// Set overrides once
setHitRate(0.75);
setDamage(8);

// Attack with multiple different units
// All attacks use the same override values

// Clear when done with the test session
clearAttackOverride();
```

---

## Implementation Details

These functions are exposed to the `window` object when the CombatView component mounts and are cleaned up on unmount.

**Source Files:**
- Function definitions: [CombatCalculations.ts](react-app/src/models/combat/utils/CombatCalculations.ts)
- Window exposure: [CombatView.tsx](react-app/src/components/combat/CombatView.tsx)
- Usage: Hit rate is checked in `getChanceToHit()`, damage in `calculateAttackDamage()`

**Console Logging:**
- Setting override: `[DEV] Next attack hit rate set to: 50%`
- Using override: `[DEV] Using hit rate override: 50%`
- Warnings for invalid values: `[DEV] Hit rate must be between 0 and 1. Clamping value.`

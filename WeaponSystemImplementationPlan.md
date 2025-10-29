# Weapon System Implementation Plan

## Overview
Add weapon range properties to Equipment and enforce dual-wielding rules in HumanoidUnit to support the Attack action in combat.

## Background
Some equipment items are weapons that can be used to attack enemies. Weapons have a minimum and maximum attack range that determines which tiles a unit can target. Units may equip weapons in their left and right hand slots, with certain restrictions based on weapon type and dual-wielding capability.

## Goals
1. Add weapon range properties (minRange, maxRange) to Equipment
2. Enforce dual-wielding rules based on unit capabilities
3. Validate weapon compatibility when dual-wielding
4. Display weapon information in the UI
5. Ensure all existing data is migrated properly

## Key Rules

### Weapon Types
- **OneHandedWeapon**: Can be equipped in one hand
- **TwoHandedWeapon**: Requires both hands to be empty
- **Non-weapons** (Shield, Held, Head, Body, Accessory): Not affected by dual-wield rules

### Dual-Wielding Rules
- **canDualWield = false** (default):
  - Maximum 1 weapon can be equipped
  - Can still equip weapon + Shield/Held in different hands
- **canDualWield = true** (enabled by abilities):
  - Can equip 2 OneHandedWeapons
  - Both weapons must have identical minRange and maxRange

### Equipment Validation
- **TwoHandedWeapon**: Other hand slot must be completely empty
- **OneHandedWeapon (canDualWield = false)**: Other hand cannot have a weapon (but can have Shield/Held)
- **OneHandedWeapon (canDualWield = true)**: If other hand has a weapon, ranges must match exactly

## Implementation Tasks

### Phase 1: Equipment Foundation

#### Task 1: Update Equipment.ts
**File**: `react-app/src/models/combat/Equipment.ts`

Changes:
- Add optional properties: `minRange?: number` and `maxRange?: number`
- Update constructor signature to accept these parameters
- Add helper method:
  ```typescript
  isWeapon(): boolean {
    return this.type === 'OneHandedWeapon' || this.type === 'TwoHandedWeapon';
  }
  ```
- Ensure properties are stored and accessible

#### Task 2: Update EquipmentRegistry.ts
**File**: `react-app/src/utils/EquipmentRegistry.ts`

Changes:
- Update `EquipmentDefinition` interface:
  ```typescript
  export interface EquipmentDefinition {
    id: string;
    name: string;
    type: EquipmentType;
    modifiers?: { ... };
    multipliers?: { ... };
    allowedClasses?: string[];
    minRange?: number;  // ADD
    maxRange?: number;  // ADD
  }
  ```
- Update `register()` method to pass minRange and maxRange to Equipment constructor
- Update `toDefinition()` method to export these fields when they exist

#### Task 3: Update DataLoader.ts
**File**: `react-app/src/data/DataLoader.ts`

Changes:
- Update `EquipmentData` interface:
  ```typescript
  interface EquipmentData {
    id: string;
    name: string;
    type: EquipmentType;
    modifiers?: Record<string, number>;
    multipliers?: Record<string, number>;
    allowedClasses?: string[];
    minRange?: number;  // ADD
    maxRange?: number;  // ADD
  }
  ```
- Update `loadEquipment()` function to pass these fields to Equipment constructor

#### Task 4: Update equipment-definitions.yaml
**File**: `react-app/src/data/equipment-definitions.yaml`

Changes:
Add weapon ranges to all 6 existing weapons:

**OneHandedWeapon**:
- `iron-sword-001`: Add `minRange: 1` and `maxRange: 1`
- `steel-dagger-001`: Add `minRange: 1` and `maxRange: 1`
- `flame-blade-001`: Add `minRange: 1` and `maxRange: 1`

**TwoHandedWeapon**:
- `war-hammer-001`: Add `minRange: 1` and `maxRange: 1`
- `great-axe-001`: Add `minRange: 1` and `maxRange: 1`
- `magic-staff-001`: Add `minRange: 1` and `maxRange: 1`

All weapons start with melee range (1-1). Ranged weapons can be added later.

### Phase 2: HumanoidUnit Validation

#### Task 5: Add canDualWield property
**File**: `react-app/src/models/combat/HumanoidUnit.ts`

Changes:
- Add private property: `private _canDualWield: boolean = false;`
- Add getter: `get canDualWield(): boolean { return this._canDualWield; }`
- Add setter: `setCanDualWield(value: boolean): void { this._canDualWield = value; }`

#### Task 6: Implement equipLeftHand() validation
**File**: `react-app/src/models/combat/HumanoidUnit.ts`

Update `equipLeftHand()` method to validate before equipping:

```typescript
equipLeftHand(equipment: Equipment | null): boolean {
  // Allow unequipping
  if (equipment === null) {
    this._leftHand = null;
    return true;
  }

  // Validate TwoHandedWeapon: right hand must be empty
  if (equipment.type === 'TwoHandedWeapon') {
    if (this._rightHand !== null) {
      return false; // Cannot equip two-handed weapon with something in right hand
    }
  }

  // Validate OneHandedWeapon dual-wield rules
  if (equipment.type === 'OneHandedWeapon') {
    if (this._rightHand !== null && this._rightHand.isWeapon()) {
      // Right hand has a weapon
      if (!this._canDualWield) {
        return false; // Cannot dual-wield
      }
      // Can dual-wield, check range compatibility
      if (equipment.minRange !== this._rightHand.minRange ||
          equipment.maxRange !== this._rightHand.maxRange) {
        return false; // Ranges must match
      }
    }
  }

  this._leftHand = equipment;
  return true;
}
```

Change return type from `void` to `boolean`.

#### Task 7: Implement equipRightHand() validation
**File**: `react-app/src/models/combat/HumanoidUnit.ts`

Update `equipRightHand()` method with symmetric validation:

```typescript
equipRightHand(equipment: Equipment | null): boolean {
  // Allow unequipping
  if (equipment === null) {
    this._rightHand = null;
    return true;
  }

  // Validate TwoHandedWeapon: left hand must be empty
  if (equipment.type === 'TwoHandedWeapon') {
    if (this._leftHand !== null) {
      return false; // Cannot equip two-handed weapon with something in left hand
    }
  }

  // Validate OneHandedWeapon dual-wield rules
  if (equipment.type === 'OneHandedWeapon') {
    if (this._leftHand !== null && this._leftHand.isWeapon()) {
      // Left hand has a weapon
      if (!this._canDualWield) {
        return false; // Cannot dual-wield
      }
      // Can dual-wield, check range compatibility
      if (equipment.minRange !== this._leftHand.minRange ||
          equipment.maxRange !== this._leftHand.maxRange) {
        return false; // Ranges must match
      }
    }
  }

  this._rightHand = equipment;
  return true;
}
```

Change return type from `void` to `boolean`.

#### Task 8: Add getEquippedWeapons() helper
**File**: `react-app/src/models/combat/HumanoidUnit.ts`

Add helper method:

```typescript
/**
 * Get all weapons currently equipped in hand slots
 * @returns Array of equipped weapons (0-2 items)
 */
getEquippedWeapons(): Equipment[] {
  const weapons: Equipment[] = [];
  if (this._leftHand?.isWeapon()) {
    weapons.push(this._leftHand);
  }
  if (this._rightHand?.isWeapon()) {
    weapons.push(this._rightHand);
  }
  return weapons;
}
```

#### Task 9: Update JSON serialization
**File**: `react-app/src/models/combat/HumanoidUnit.ts`

Changes:
- Add `canDualWield: boolean` to `HumanoidUnitJSON` interface
- Update `toJSON()` method to include: `canDualWield: this._canDualWield`
- Update `fromJSON()` method to restore: `unit._canDualWield = json.canDualWield ?? false;`

### Phase 3: UI Display

#### Task 10: Update EquipmentInfoContent.ts
**File**: `react-app/src/models/combat/managers/panels/EquipmentInfoContent.ts`

Changes in `render()` method:
- After rendering equipment name, check if equipment is a weapon
- If weapon, add two lines before the stats grid:
  - "Type: Weapon" (white text)
  - "Range: {minRange}-{maxRange}" (white text, e.g., "Range: 1-1")
- Add appropriate spacing to maintain layout

Example display:
```
    Flame Blade      (orange, centered)
    Type: Weapon     (white)
    Range: 1-1       (white)

    HP      +5       (existing stats grid)
    ...
```

### Phase 4: Testing

#### Task 11: Test TwoHandedWeapon validation
**File**: `react-app/src/models/combat/HumanoidUnit.test.ts`

Add test cases:
- Cannot equip TwoHandedWeapon when other hand has any equipment
- Can equip TwoHandedWeapon when other hand is empty
- Equipping TwoHandedWeapon in left hand blocks right hand
- Equipping TwoHandedWeapon in right hand blocks left hand

#### Task 12: Test dual-wield disabled
**File**: `react-app/src/models/combat/HumanoidUnit.test.ts`

Add test cases:
- Cannot equip two OneHandedWeapons when canDualWield is false
- Can equip OneHandedWeapon + Shield when canDualWield is false
- Can equip OneHandedWeapon + Held item when canDualWield is false

#### Task 13: Test dual-wield enabled with range matching
**File**: `react-app/src/models/combat/HumanoidUnit.test.ts`

Add test cases:
- Can equip two OneHandedWeapons with matching ranges when canDualWield is true
- Cannot equip two OneHandedWeapons with mismatched ranges when canDualWield is true
- Test both minRange and maxRange must match

#### Task 14: Test weapon + non-weapon combinations
**File**: `react-app/src/models/combat/HumanoidUnit.test.ts`

Add test cases:
- OneHandedWeapon + Shield is always allowed
- OneHandedWeapon + Held is always allowed
- Shield + Held is always allowed (no weapons involved)

#### Task 15: Run all tests
**Command**: `npm test`

Verify:
- All new tests pass
- All existing tests still pass
- No regressions in equipment or unit behavior

## Files Modified

1. `react-app/src/models/combat/Equipment.ts`
2. `react-app/src/models/combat/HumanoidUnit.ts`
3. `react-app/src/models/combat/HumanoidUnit.test.ts`
4. `react-app/src/utils/EquipmentRegistry.ts`
5. `react-app/src/data/DataLoader.ts`
6. `react-app/src/data/equipment-definitions.yaml`
7. `react-app/src/models/combat/managers/panels/EquipmentInfoContent.ts`

## Future Work (Out of Scope)

These will be implemented later:
- Attack action implementation in combat
- Unarmed attack when no weapons equipped
- Abilities that enable dual-wielding (set canDualWield to true)
- Ranged weapons with minRange > 1
- Visual attack range display on combat grid
- Attack damage calculation using weapon stats

## Notes

- All existing weapons start with range 1-1 (melee)
- The `canDualWield` property defaults to false and will be set via abilities later
- Equipment validation now returns boolean instead of void to indicate success/failure
- Non-weapon equipment (Shield, Held, Head, Body, Accessory) is unaffected by weapon rules
- The isWeapon() helper method provides clean abstraction for weapon checks

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClass } from './UnitClass';
import { Equipment } from './Equipment';

describe('UnitClass Dual-Wield Feature', () => {
  let rogueClass: UnitClass;
  let fighterClass: UnitClass;
  let rogueUnit: HumanoidUnit;
  let fighterUnit: HumanoidUnit;

  beforeEach(() => {
    UnitClass.clearRegistry();
    Equipment.clearRegistry();

    // Create Rogue class with dual-wield enabled
    rogueClass = new UnitClass(
      'Rogue',
      'A nimble rogue class',
      [],
      [],
      {},
      {},
      new Map(),
      'rogue-class',
      [],
      undefined,
      true // canDualWield = true
    );

    // Create Fighter class without dual-wield
    fighterClass = new UnitClass(
      'Fighter',
      'A strong fighter class',
      [],
      [],
      {},
      {},
      new Map(),
      'fighter-class',
      [],
      undefined,
      false // canDualWield = false
    );

    rogueUnit = new HumanoidUnit(
      'Test Rogue',
      rogueClass,
      100, 50, 10, 5, 8, 4, 10, 7, 12, 6
    );

    fighterUnit = new HumanoidUnit(
      'Test Fighter',
      fighterClass,
      100, 50, 10, 5, 8, 4, 10, 7, 12, 6
    );
  });

  afterEach(() => {
    UnitClass.clearRegistry();
    Equipment.clearRegistry();
  });

  it('should allow Rogue class to dual-wield by default', () => {
    expect(rogueUnit.canDualWield).toBe(true);
  });

  it('should not allow Fighter class to dual-wield by default', () => {
    expect(fighterUnit.canDualWield).toBe(false);
  });

  it('should allow Rogue to equip two weapons without passive ability', () => {
    const dagger1 = new Equipment('Dagger 1', 'OneHandedWeapon', {}, {}, new Set(), 'dagger-1', 1, 1);
    const dagger2 = new Equipment('Dagger 2', 'OneHandedWeapon', {}, {}, new Set(), 'dagger-2', 1, 1);

    // Equip first dagger
    const result1 = rogueUnit.equipLeftHand(dagger1);
    expect(result1.success).toBe(true);

    // Equip second dagger (should work because Rogue can dual-wield)
    const result2 = rogueUnit.equipRightHand(dagger2);
    expect(result2.success).toBe(true);

    expect(rogueUnit.leftHand).toBe(dagger1);
    expect(rogueUnit.rightHand).toBe(dagger2);
  });

  it('should prevent Fighter from dual-wielding without passive ability', () => {
    const sword1 = new Equipment('Sword 1', 'OneHandedWeapon', {}, {}, new Set(), 'sword-1', 1, 1);
    const sword2 = new Equipment('Sword 2', 'OneHandedWeapon', {}, {}, new Set(), 'sword-2', 1, 1);

    // Equip first sword
    const result1 = fighterUnit.equipLeftHand(sword1);
    expect(result1.success).toBe(true);

    // Equip second sword (should fail because Fighter cannot dual-wield)
    const result2 = fighterUnit.equipRightHand(sword2);
    expect(result2.success).toBe(false);
    expect(result2.reason).toBe('cannot-dual-wield');

    expect(fighterUnit.leftHand).toBe(sword1);
    expect(fighterUnit.rightHand).toBeNull();
  });

  it('should allow Fighter to dual-wield after enabling the ability', () => {
    const sword1 = new Equipment('Sword 1', 'OneHandedWeapon', {}, {}, new Set(), 'sword-1', 1, 1);
    const sword2 = new Equipment('Sword 2', 'OneHandedWeapon', {}, {}, new Set(), 'sword-2', 1, 1);

    // Enable dual-wield capability
    fighterUnit.setCanDualWield(true);

    // Equip both swords (should now work)
    const result1 = fighterUnit.equipLeftHand(sword1);
    expect(result1.success).toBe(true);

    const result2 = fighterUnit.equipRightHand(sword2);
    expect(result2.success).toBe(true);

    expect(fighterUnit.leftHand).toBe(sword1);
    expect(fighterUnit.rightHand).toBe(sword2);
  });

  it('should check range compatibility for Rogue dual-wielding', () => {
    const meleeWeapon = new Equipment('Melee', 'OneHandedWeapon', {}, {}, new Set(), 'melee', 1, 1);
    const rangedWeapon = new Equipment('Ranged', 'OneHandedWeapon', {}, {}, new Set(), 'ranged', 2, 3);

    // Equip melee weapon
    rogueUnit.equipLeftHand(meleeWeapon);

    // Try to equip ranged weapon (should fail due to range mismatch)
    const result = rogueUnit.equipRightHand(rangedWeapon);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('dual-wield-range-mismatch');
  });
});

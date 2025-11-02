import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClass } from './UnitClass';
import { Equipment } from './Equipment';

describe('Equipment Stat Calculations', () => {
  let testUnit: HumanoidUnit;
  let testClass: UnitClass;

  beforeEach(() => {
    UnitClass.clearRegistry();
    Equipment.clearRegistry();

    testClass = new UnitClass(
      'Test Class',
      'A test class',
      [],
      [],
      { health: 0 },
      {},
      new Map(),
      'test-class'
    );

    testUnit = new HumanoidUnit(
      'Test Hero',
      testClass,
      100, // base health
      50,  // base mana
      10,  // base physical power
      5,   // base magic power
      8,   // base speed
      4,   // base movement
      10,  // base physical evade
      7,   // base magic evade
      12,  // base courage
      6    // base attunement
    );
  });

  afterEach(() => {
    UnitClass.clearRegistry();
    Equipment.clearRegistry();
  });

  it('should apply equipment modifiers to stats', () => {
    // Create armor with +20 health, +5 physical evade
    const armor = new Equipment(
      'Test Armor',
      'Body',
      { health: 20, physicalEvade: 5 },
      {}
    );

    testUnit.equipBody(armor);

    // Base health (100) + equipment modifier (20) = 120
    expect(testUnit.maxHealth).toBe(120);

    // Base physical evade (10) + equipment modifier (5) = 15
    expect(testUnit.physicalEvade).toBe(15);
  });

  it('should apply equipment multipliers to stats', () => {
    // Create accessory with x1.5 speed multiplier
    const accessory = new Equipment(
      'Swift Boots',
      'Accessory',
      {},
      { speed: 1.5 }
    );

    testUnit.equipAccessory(accessory);

    // Base speed (8) * equipment multiplier (1.5) = 12 (floored)
    expect(testUnit.speed).toBe(12);
  });

  it('should apply both modifiers and multipliers', () => {
    // Create equipment with +10 health and x1.2 multiplier
    const equipment = new Equipment(
      'Test Item',
      'Head',
      { health: 10 },
      { health: 1.2 }
    );

    testUnit.equipHead(equipment);

    // (Base health (100) + modifier (10)) * multiplier (1.2) = 132
    expect(testUnit.maxHealth).toBe(132);
  });

  it('should skip weapon power modifiers for weapons', () => {
    // Create weapon with physical power modifiers (should be ignored)
    const weapon = new Equipment(
      'Test Sword',
      'OneHandedWeapon',
      { physicalPower: 50, speed: 2 },
      {}
    );

    testUnit.equipLeftHand(weapon);

    // Physical power should NOT include weapon modifier
    expect(testUnit.physicalPower).toBe(10); // Base only

    // Speed SHOULD include weapon modifier
    expect(testUnit.speed).toBe(10); // Base (8) + modifier (2)
  });

  it('should skip weapon power multipliers for weapons', () => {
    // Create weapon with magic power multiplier (should be ignored)
    const weapon = new Equipment(
      'Magic Staff',
      'TwoHandedWeapon',
      {},
      { magicPower: 2.0, movement: 1.5 }
    );

    testUnit.equipLeftHand(weapon);

    // Magic power should NOT include weapon multiplier
    expect(testUnit.magicPower).toBe(5); // Base only

    // Movement SHOULD include weapon multiplier
    expect(testUnit.movement).toBe(6); // Base (4) * multiplier (1.5) = 6
  });

  it('should stack equipment from multiple slots', () => {
    const helm = new Equipment('Helm', 'Head', { health: 10 }, {});
    const armor = new Equipment('Armor', 'Body', { health: 20 }, {});
    const boots = new Equipment('Boots', 'Accessory', { health: 5 }, {});

    testUnit.equipHead(helm);
    testUnit.equipBody(armor);
    testUnit.equipAccessory(boots);

    // Base (100) + helm (10) + armor (20) + boots (5) = 135
    expect(testUnit.maxHealth).toBe(135);
  });

  it('should combine multiple multipliers correctly', () => {
    // Create two items with speed multipliers
    const boots = new Equipment('Boots', 'Accessory', {}, { speed: 1.5 });
    const weapon = new Equipment('Light Weapon', 'OneHandedWeapon', {}, { speed: 1.2 });

    testUnit.equipAccessory(boots);
    testUnit.equipLeftHand(weapon);

    // Base (8) * boots (1.5) * weapon (1.2) = 8 * 1.8 = 14.4 -> 14 (floored)
    expect(testUnit.speed).toBe(14);
  });

  it('should work with all stat types', () => {
    const superItem = new Equipment(
      'Super Item',
      'Accessory',
      {
        health: 50,
        mana: 25,
        physicalPower: 5,
        magicPower: 10,
        speed: 3,
        movement: 2,
        physicalEvade: 8,
        magicEvade: 6,
        courage: 4,
        attunement: 7
      },
      {}
    );

    testUnit.equipAccessory(superItem);

    expect(testUnit.maxHealth).toBe(150);
    expect(testUnit.maxMana).toBe(75);
    expect(testUnit.physicalPower).toBe(15);
    expect(testUnit.magicPower).toBe(15);
    expect(testUnit.speed).toBe(11);
    expect(testUnit.movement).toBe(6);
    expect(testUnit.physicalEvade).toBe(18);
    expect(testUnit.magicEvade).toBe(13);
    expect(testUnit.courage).toBe(16);
    expect(testUnit.attunement).toBe(13);
  });
});

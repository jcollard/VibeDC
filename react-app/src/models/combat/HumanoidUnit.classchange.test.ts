import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClass } from './UnitClass';
import { Equipment } from './Equipment';

describe('HumanoidUnit Class Change', () => {
  let fighterClass: UnitClass;
  let rogueClass: UnitClass;
  let apprenticeClass: UnitClass;
  let testUnit: HumanoidUnit;

  beforeEach(() => {
    UnitClass.clearRegistry();
    Equipment.clearRegistry();

    // Create Fighter class with starter config
    fighterClass = new UnitClass(
      'Fighter',
      'A strong fighter class',
      [],
      [],
      {},
      {},
      new Map(),
      'fighter',
      [],
      {
        baseHealth: 45,
        baseMana: 5,
        basePhysicalPower: 10,
        baseMagicPower: 5,
        baseSpeed: 8,
        baseMovement: 4,
        basePhysicalEvade: 10,
        baseMagicEvade: 7,
        baseCourage: 12,
        baseAttunement: 6
      },
      false // canDualWield
    );

    // Create Rogue class with starter config
    rogueClass = new UnitClass(
      'Rogue',
      'A nimble rogue class',
      [],
      [],
      {},
      {},
      new Map(),
      'rogue',
      [],
      {
        baseHealth: 30,
        baseMana: 15,
        basePhysicalPower: 8,
        baseMagicPower: 7,
        baseSpeed: 12,
        baseMovement: 5,
        basePhysicalEvade: 16,
        baseMagicEvade: 10,
        baseCourage: 10,
        baseAttunement: 10
      },
      true // canDualWield
    );

    // Create Apprentice class with starter config
    apprenticeClass = new UnitClass(
      'Apprentice',
      'A magic user class',
      [],
      [],
      {},
      {},
      new Map(),
      'apprentice',
      [],
      {
        baseHealth: 25,
        baseMana: 30,
        basePhysicalPower: 5,
        baseMagicPower: 15,
        baseSpeed: 7,
        baseMovement: 3,
        basePhysicalEvade: 8,
        baseMagicEvade: 14,
        baseCourage: 8,
        baseAttunement: 16
      },
      false // canDualWield
    );

    // Create a test unit starting as a Fighter
    testUnit = new HumanoidUnit(
      'Test Hero',
      fighterClass,
      45, 5, 10, 5, 8, 4, 10, 7, 12, 6,
      'default-humanoid',
      true
    );
  });

  afterEach(() => {
    UnitClass.clearRegistry();
    Equipment.clearRegistry();
  });

  it('should update base stats when changing to Rogue class', () => {
    // Verify initial stats (Fighter)
    expect(testUnit.maxHealth).toBe(45);
    expect(testUnit.maxMana).toBe(5);
    expect(testUnit.physicalPower).toBe(10);
    expect(testUnit.magicPower).toBe(5);
    expect(testUnit.speed).toBe(8);
    expect(testUnit.movement).toBe(4);
    expect(testUnit.physicalEvade).toBe(10);
    expect(testUnit.magicEvade).toBe(7);
    expect(testUnit.courage).toBe(12);
    expect(testUnit.attunement).toBe(6);

    // Change to Rogue class
    testUnit.setPrimaryClass(rogueClass);

    // Verify stats updated to Rogue base stats
    expect(testUnit.maxHealth).toBe(30);
    expect(testUnit.maxMana).toBe(15);
    expect(testUnit.physicalPower).toBe(8);
    expect(testUnit.magicPower).toBe(7);
    expect(testUnit.speed).toBe(12);
    expect(testUnit.movement).toBe(5);
    expect(testUnit.physicalEvade).toBe(16);
    expect(testUnit.magicEvade).toBe(10);
    expect(testUnit.courage).toBe(10);
    expect(testUnit.attunement).toBe(10);
  });

  it('should update base stats when changing to Apprentice class', () => {
    // Change to Apprentice class
    testUnit.setPrimaryClass(apprenticeClass);

    // Verify stats updated to Apprentice base stats
    expect(testUnit.maxHealth).toBe(25);
    expect(testUnit.maxMana).toBe(30);
    expect(testUnit.physicalPower).toBe(5);
    expect(testUnit.magicPower).toBe(15);
    expect(testUnit.speed).toBe(7);
    expect(testUnit.movement).toBe(3);
    expect(testUnit.physicalEvade).toBe(8);
    expect(testUnit.magicEvade).toBe(14);
    expect(testUnit.courage).toBe(8);
    expect(testUnit.attunement).toBe(16);
  });

  it('should update dual-wield capability when changing class', () => {
    // Fighter cannot dual-wield
    expect(testUnit.canDualWield).toBe(false);

    // Change to Rogue (can dual-wield)
    testUnit.setPrimaryClass(rogueClass);
    expect(testUnit.canDualWield).toBe(true);

    // Change to Apprentice (cannot dual-wield)
    testUnit.setPrimaryClass(apprenticeClass);
    expect(testUnit.canDualWield).toBe(false);
  });

  it('should preserve wounds ratio when changing class', () => {
    // Deal 15 wounds to Fighter (45 HP max, leaving 30/45 = 66.7% HP)
    testUnit.addWounds(15);
    expect(testUnit.health).toBe(30);
    expect(testUnit.wounds).toBe(15);

    // Change to Rogue class (30 HP max)
    testUnit.setPrimaryClass(rogueClass);

    // Wounds should remain at 15
    // But since max health is now 30, health should be 15 (30 - 15)
    expect(testUnit.maxHealth).toBe(30);
    expect(testUnit.wounds).toBe(15);
    expect(testUnit.health).toBe(15);
  });

  it('should cap wounds at new max health when changing to class with lower health', () => {
    // Deal 20 wounds to Fighter (45 HP max, leaving 25/45 HP)
    testUnit.addWounds(20);
    expect(testUnit.wounds).toBe(20);

    // Change to Apprentice class (25 HP max)
    testUnit.setPrimaryClass(apprenticeClass);

    // Max health is now 25, wounds remain at 20
    // Health should be 5 (25 - 20)
    expect(testUnit.maxHealth).toBe(25);
    expect(testUnit.wounds).toBe(20);
    expect(testUnit.health).toBe(5);
  });

  it('should preserve mana usage when changing class', () => {
    // Use 3 mana as Fighter (5 max)
    testUnit.useMana(3);
    expect(testUnit.mana).toBe(2);
    expect(testUnit.manaUsed).toBe(3);

    // Change to Rogue class (15 mana max)
    testUnit.setPrimaryClass(rogueClass);

    // Mana used should remain at 3
    // Current mana should be 12 (15 - 3)
    expect(testUnit.maxMana).toBe(15);
    expect(testUnit.manaUsed).toBe(3);
    expect(testUnit.mana).toBe(12);
  });

  it('should work with equipment modifiers after class change', () => {
    // Equip armor that adds +20 health
    const armor = new Equipment(
      'Test Armor',
      'Body',
      { health: 20 },
      {}
    );
    testUnit.equipBody(armor);

    // Fighter base health (45) + armor (20) = 65
    expect(testUnit.maxHealth).toBe(65);

    // Change to Rogue class
    testUnit.setPrimaryClass(rogueClass);

    // Rogue base health (30) + armor (20) = 50
    expect(testUnit.maxHealth).toBe(50);
  });

  it('should handle class change with stat modifiers active', () => {
    // Add a stat modifier for physical power
    testUnit.addStatModifier({
      id: 'test-buff-001',
      stat: 'physicalPower',
      value: 5,
      duration: 3,
      source: 'test-buff',
      sourceName: 'Test Buff'
    });

    // Fighter base (10) + modifier (5) = 15
    expect(testUnit.physicalPower).toBe(15);

    // Change to Rogue class
    testUnit.setPrimaryClass(rogueClass);

    // Rogue base (8) + modifier (5) = 13
    expect(testUnit.physicalPower).toBe(13);
  });

  it('should handle class without starter config gracefully', () => {
    // Create a class without starter config
    const noConfigClass = new UnitClass(
      'NoConfig',
      'A class without starter config',
      [],
      [],
      {},
      {},
      new Map(),
      'no-config',
      [],
      undefined, // No starter config
      false
    );

    const initialHealth = testUnit.maxHealth;

    // Change to class without config - should not change stats
    testUnit.setPrimaryClass(noConfigClass);

    // Stats should remain unchanged
    expect(testUnit.maxHealth).toBe(initialHealth);
  });
});

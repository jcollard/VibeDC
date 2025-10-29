import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClass } from './UnitClass';
import { CombatAbility } from './CombatAbility';
import { Equipment } from './Equipment';

describe('HumanoidUnit Serialization', () => {
  // Test data
  let warriorClass: UnitClass;
  let mageClass: UnitClass;
  let slashAbility: CombatAbility;
  let counterAbility: CombatAbility;
  let dashAbility: CombatAbility;
  let toughAbility: CombatAbility;
  let ironSword: Equipment;
  let leatherArmor: Equipment;
  let testUnit: HumanoidUnit;

  beforeEach(() => {
    // Clear registries before each test
    UnitClass.clearRegistry();
    CombatAbility.clearRegistry();
    Equipment.clearRegistry();

    // Create test abilities
    slashAbility = new CombatAbility(
      'Slash',
      'A basic sword attack',
      'Action',
      10,
      ['physical', 'attack'],
      'slash-test-001'
    );

    counterAbility = new CombatAbility(
      'Counter Attack',
      'Counter when hit',
      'Reaction',
      20,
      ['physical', 'counter'],
      'counter-test-001'
    );

    dashAbility = new CombatAbility(
      'Dash',
      'Move quickly',
      'Movement',
      15,
      ['mobility'],
      'dash-test-001'
    );

    toughAbility = new CombatAbility(
      'Toughness',
      'Increase health',
      'Passive',
      25,
      ['defense'],
      'tough-test-001'
    );

    // Create test classes
    warriorClass = new UnitClass(
      'Warrior',
      'A melee fighter',
      ['melee', 'physical'],
      [slashAbility, counterAbility],
      { health: 20, physicalPower: 10 },
      { health: 1.2 },
      new Map(), // requirements
      'warrior-test-001'
    );

    mageClass = new UnitClass(
      'Mage',
      'A magic user',
      ['magic', 'ranged'],
      [dashAbility, toughAbility],
      { mana: 30, magicPower: 15 },
      { mana: 1.5 },
      new Map(), // requirements
      'mage-test-001'
    );

    // Create test equipment
    ironSword = new Equipment(
      'Iron Sword',
      'OneHandedWeapon',
      { physicalPower: 10, speed: 2 },
      { physicalPower: 1.1 },
      new Set(), // No class restrictions
      'iron-sword-test-001'
    );

    leatherArmor = new Equipment(
      'Leather Armor',
      'Body',
      { health: 15, physicalEvade: 5 },
      {},
      new Set(), // No class restrictions
      'leather-armor-test-001'
    );

    // Create a test unit
    testUnit = new HumanoidUnit(
      'Test Hero',
      warriorClass,
      100, // health
      50,  // mana
      20,  // physicalPower
      10,  // magicPower
      15,  // speed
      5,   // movement
      10,  // physicalEvade
      8,   // magicEvade
      12,  // courage
      7    // attunement
    );
  });

  afterEach(() => {
    // Clean up registries after each test
    UnitClass.clearRegistry();
    CombatAbility.clearRegistry();
    Equipment.clearRegistry();
  });

  describe('toJSON', () => {
    it('should serialize a basic unit correctly', () => {
      const json = testUnit.toJSON();

      expect(json.name).toBe('Test Hero');
      expect(json.unitClassId).toBe('warrior-test-001');
      expect(json.secondaryClassId).toBeNull();
      expect(json.baseHealth).toBe(100);
      expect(json.baseMana).toBe(50);
      expect(json.basePhysicalPower).toBe(20);
      expect(json.baseMagicPower).toBe(10);
      expect(json.baseSpeed).toBe(15);
      expect(json.baseMovement).toBe(5);
      expect(json.basePhysicalEvade).toBe(10);
      expect(json.baseMagicEvade).toBe(8);
      expect(json.baseCourage).toBe(12);
      expect(json.baseAttunement).toBe(7);
    });

    it('should serialize learned abilities correctly', () => {
      testUnit.addExperience(50, warriorClass); // Need experience to learn abilities
      testUnit.learnAbility(slashAbility, warriorClass);
      testUnit.learnAbility(counterAbility, warriorClass);

      const json = testUnit.toJSON();

      expect(json.learnedAbilityIds).toContain('slash-test-001');
      expect(json.learnedAbilityIds).toContain('counter-test-001');
      expect(json.learnedAbilityIds.length).toBe(2);
    });

    it('should serialize experience correctly', () => {
      testUnit.addExperience(100);
      testUnit.addExperience(50, warriorClass);

      const json = testUnit.toJSON();

      expect(json.totalExperience).toBe(150);
      expect(json.classExperience['warrior-test-001']).toBe(50);
    });

    it('should serialize assigned abilities correctly', () => {
      testUnit.addExperience(100, warriorClass);
      testUnit.addExperience(100, mageClass);
      testUnit.learnAbility(counterAbility, warriorClass);
      testUnit.learnAbility(dashAbility, mageClass);
      testUnit.learnAbility(toughAbility, mageClass);
      testUnit.assignReactionAbility(counterAbility);
      testUnit.assignMovementAbility(dashAbility);
      testUnit.assignPassiveAbility(toughAbility);

      const json = testUnit.toJSON();

      expect(json.reactionAbilityId).toBe('counter-test-001');
      expect(json.movementAbilityId).toBe('dash-test-001');
      expect(json.passiveAbilityId).toBe('tough-test-001');
    });

    it('should serialize secondary class correctly', () => {
      testUnit.setSecondaryClass(mageClass);

      const json = testUnit.toJSON();

      expect(json.secondaryClassId).toBe('mage-test-001');
    });

    it('should serialize combat state correctly', () => {
      testUnit.addExperience(100); // Need to set these through private access for testing
      const json = testUnit.toJSON();

      expect(json.wounds).toBe(0);
      expect(json.manaUsed).toBe(0);
      expect(json.actionTimer).toBe(0);
    });

    it('should serialize equipped items correctly', () => {
      testUnit.equipLeftHand(ironSword);
      testUnit.equipBody(leatherArmor);

      const json = testUnit.toJSON();

      expect(json.leftHandId).toBe('iron-sword-test-001');
      expect(json.bodyId).toBe('leather-armor-test-001');
      expect(json.rightHandId).toBeNull();
      expect(json.headId).toBeNull();
      expect(json.accessoryId).toBeNull();
    });
  });

  describe('fromJSON', () => {
    it('should deserialize a basic unit correctly', () => {
      const json = testUnit.toJSON();
      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).not.toBeNull();
      expect(restored!.name).toBe('Test Hero');
      expect(restored!.unitClass.id).toBe('warrior-test-001');
      expect(restored!.health).toBe(100);
      expect(restored!.maxHealth).toBe(100);
      expect(restored!.mana).toBe(50);
      expect(restored!.maxMana).toBe(50);
      expect(restored!.physicalPower).toBe(20);
      expect(restored!.magicPower).toBe(10);
      expect(restored!.speed).toBe(15);
      expect(restored!.movement).toBe(5);
      expect(restored!.physicalEvade).toBe(10);
      expect(restored!.magicEvade).toBe(8);
      expect(restored!.courage).toBe(12);
      expect(restored!.attunement).toBe(7);
    });

    it('should deserialize learned abilities correctly', () => {
      testUnit.addExperience(50, warriorClass);
      testUnit.learnAbility(slashAbility, warriorClass);
      testUnit.learnAbility(counterAbility, warriorClass);

      const json = testUnit.toJSON();
      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).not.toBeNull();
      expect(restored!.hasAbility(slashAbility)).toBe(true);
      expect(restored!.hasAbility(counterAbility)).toBe(true);
      expect(restored!.learnedAbilities.size).toBe(2);
    });

    it('should deserialize experience correctly', () => {
      testUnit.addExperience(100);
      testUnit.addExperience(50, warriorClass);

      const json = testUnit.toJSON();
      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).not.toBeNull();
      expect(restored!.totalExperience).toBe(150);
      expect(restored!.getClassExperience(warriorClass)).toBe(50);
    });

    it('should deserialize assigned abilities correctly', () => {
      testUnit.addExperience(100, warriorClass);
      testUnit.addExperience(100, mageClass);
      testUnit.learnAbility(counterAbility, warriorClass);
      testUnit.learnAbility(dashAbility, mageClass);
      testUnit.learnAbility(toughAbility, mageClass);
      testUnit.assignReactionAbility(counterAbility);
      testUnit.assignMovementAbility(dashAbility);
      testUnit.assignPassiveAbility(toughAbility);

      const json = testUnit.toJSON();
      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).not.toBeNull();
      expect(restored!.reactionAbility?.id).toBe('counter-test-001');
      expect(restored!.movementAbility?.id).toBe('dash-test-001');
      expect(restored!.passiveAbility?.id).toBe('tough-test-001');
    });

    it('should deserialize secondary class correctly', () => {
      testUnit.setSecondaryClass(mageClass);

      const json = testUnit.toJSON();
      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).not.toBeNull();
      expect(restored!.secondaryClass).not.toBeNull();
      expect(restored!.secondaryClass!.id).toBe('mage-test-001');
    });

    it('should deserialize equipped items correctly', () => {
      testUnit.equipLeftHand(ironSword);
      testUnit.equipBody(leatherArmor);

      const json = testUnit.toJSON();
      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).not.toBeNull();
      expect(restored!.leftHand).not.toBeNull();
      expect(restored!.leftHand!.id).toBe('iron-sword-test-001');
      expect(restored!.body).not.toBeNull();
      expect(restored!.body!.id).toBe('leather-armor-test-001');
      expect(restored!.rightHand).toBeNull();
    });

    it('should return null if unit class is not found', () => {
      const json = testUnit.toJSON();
      json.unitClassId = 'non-existent-class';

      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).toBeNull();
    });

    it('should handle missing references gracefully', () => {
      testUnit.addExperience(20, warriorClass);
      testUnit.learnAbility(slashAbility, warriorClass);
      testUnit.setSecondaryClass(mageClass);
      testUnit.equipLeftHand(ironSword);

      const json = testUnit.toJSON();

      // Add invalid references
      json.learnedAbilityIds.push('non-existent-ability');
      json.secondaryClassId = 'non-existent-class';
      json.rightHandId = 'non-existent-equipment';

      const restored = HumanoidUnit.fromJSON(json);

      // Should still restore the valid parts
      expect(restored).not.toBeNull();
      expect(restored!.hasAbility(slashAbility)).toBe(true);
      expect(restored!.secondaryClass).toBeNull(); // Invalid secondary class should be null
      expect(restored!.leftHand).not.toBeNull();
      expect(restored!.rightHand).toBeNull(); // Invalid equipment should be null
    });
  });

  describe('Round-trip serialization', () => {
    it('should perfectly restore a fully-configured unit', () => {
      // Set up a complex unit
      testUnit.addExperience(200);
      testUnit.addExperience(75, warriorClass);
      testUnit.addExperience(50, mageClass);
      testUnit.learnAbility(slashAbility, warriorClass);
      testUnit.learnAbility(counterAbility, warriorClass);
      testUnit.learnAbility(dashAbility, mageClass);
      testUnit.learnAbility(toughAbility, mageClass);
      testUnit.setSecondaryClass(mageClass);
      testUnit.assignReactionAbility(counterAbility);
      testUnit.assignMovementAbility(dashAbility);
      testUnit.assignPassiveAbility(toughAbility);
      testUnit.equipLeftHand(ironSword);
      testUnit.equipBody(leatherArmor);

      // Serialize and deserialize
      const json = testUnit.toJSON();
      const restored = HumanoidUnit.fromJSON(json);

      // Verify everything was restored correctly
      expect(restored).not.toBeNull();
      expect(restored!.name).toBe(testUnit.name);
      expect(restored!.unitClass.id).toBe(testUnit.unitClass.id);
      expect(restored!.secondaryClass?.id).toBe(testUnit.secondaryClass?.id);
      expect(restored!.totalExperience).toBe(testUnit.totalExperience);
      expect(restored!.getClassExperience(warriorClass)).toBe(testUnit.getClassExperience(warriorClass));
      expect(restored!.getClassExperience(mageClass)).toBe(testUnit.getClassExperience(mageClass));
      expect(restored!.learnedAbilities.size).toBe(testUnit.learnedAbilities.size);
      expect(restored!.reactionAbility?.id).toBe(testUnit.reactionAbility?.id);
      expect(restored!.movementAbility?.id).toBe(testUnit.movementAbility?.id);
      expect(restored!.passiveAbility?.id).toBe(testUnit.passiveAbility?.id);
      expect(restored!.leftHand?.id).toBe(testUnit.leftHand?.id);
      expect(restored!.body?.id).toBe(testUnit.body?.id);

      // Verify all stats
      expect(restored!.maxHealth).toBe(testUnit.maxHealth);
      expect(restored!.maxMana).toBe(testUnit.maxMana);
      expect(restored!.physicalPower).toBe(testUnit.physicalPower);
      expect(restored!.magicPower).toBe(testUnit.magicPower);
      expect(restored!.speed).toBe(testUnit.speed);
      expect(restored!.movement).toBe(testUnit.movement);
      expect(restored!.physicalEvade).toBe(testUnit.physicalEvade);
      expect(restored!.magicEvade).toBe(testUnit.magicEvade);
      expect(restored!.courage).toBe(testUnit.courage);
      expect(restored!.attunement).toBe(testUnit.attunement);
    });

    it('should work with JSON.stringify and JSON.parse', () => {
      testUnit.addExperience(100, warriorClass);
      testUnit.learnAbility(slashAbility, warriorClass);
      testUnit.equipLeftHand(ironSword);

      // Serialize to JSON string
      const jsonString = JSON.stringify(testUnit.toJSON());

      // Deserialize from JSON string
      const parsed = JSON.parse(jsonString);
      const restored = HumanoidUnit.fromJSON(parsed);

      expect(restored).not.toBeNull();
      expect(restored!.name).toBe(testUnit.name);
      expect(restored!.totalExperience).toBe(testUnit.totalExperience);
      expect(restored!.hasAbility(slashAbility)).toBe(true);
      expect(restored!.leftHand?.id).toBe(ironSword.id);
    });
  });

  describe('Class Experience Spent Tracking', () => {
    it('should track experience spent on abilities by class', () => {
      testUnit.addExperience(100, warriorClass);
      testUnit.learnAbility(slashAbility, warriorClass); // costs 10
      testUnit.learnAbility(counterAbility, warriorClass); // costs 20

      expect(testUnit.getClassExperienceSpent(warriorClass)).toBe(30);
      expect(testUnit.getUnspentClassExperience(warriorClass)).toBe(70);
    });

    it('should prevent learning abilities without enough class experience', () => {
      testUnit.addExperience(15, warriorClass);

      const learned = testUnit.learnAbility(counterAbility, warriorClass); // costs 20

      expect(learned).toBe(false);
      expect(testUnit.hasAbility(counterAbility)).toBe(false);
    });

    it('should allow learning with sufficient class experience', () => {
      testUnit.addExperience(25, warriorClass);

      const learned = testUnit.learnAbility(counterAbility, warriorClass); // costs 20

      expect(learned).toBe(true);
      expect(testUnit.hasAbility(counterAbility)).toBe(true);
      expect(testUnit.getClassExperienceSpent(warriorClass)).toBe(20);
    });

    it('should refund experience when forgetting abilities', () => {
      testUnit.addExperience(50, warriorClass);
      testUnit.learnAbility(slashAbility, warriorClass); // costs 10
      testUnit.learnAbility(counterAbility, warriorClass); // costs 20

      expect(testUnit.getClassExperienceSpent(warriorClass)).toBe(30);

      testUnit.forgetAbility(slashAbility, warriorClass);

      expect(testUnit.getClassExperienceSpent(warriorClass)).toBe(20);
      expect(testUnit.getUnspentClassExperience(warriorClass)).toBe(30);
    });

    it('should track spent experience separately for each class', () => {
      testUnit.addExperience(50, warriorClass);
      testUnit.addExperience(50, mageClass);
      testUnit.learnAbility(slashAbility, warriorClass); // costs 10
      testUnit.learnAbility(dashAbility, mageClass); // costs 15

      expect(testUnit.getClassExperienceSpent(warriorClass)).toBe(10);
      expect(testUnit.getClassExperienceSpent(mageClass)).toBe(15);
      expect(testUnit.getUnspentClassExperience(warriorClass)).toBe(40);
      expect(testUnit.getUnspentClassExperience(mageClass)).toBe(35);
    });

    it('should serialize and deserialize class experience spent', () => {
      testUnit.addExperience(100, warriorClass);
      testUnit.addExperience(80, mageClass);
      testUnit.learnAbility(slashAbility, warriorClass);
      testUnit.learnAbility(counterAbility, warriorClass);
      testUnit.learnAbility(dashAbility, mageClass);

      const json = testUnit.toJSON();
      expect(json.classExperienceSpent['warrior-test-001']).toBe(30);
      expect(json.classExperienceSpent['mage-test-001']).toBe(15);

      const restored = HumanoidUnit.fromJSON(json);
      expect(restored).not.toBeNull();
      expect(restored!.getClassExperienceSpent(warriorClass)).toBe(30);
      expect(restored!.getClassExperienceSpent(mageClass)).toBe(15);
      expect(restored!.getUnspentClassExperience(warriorClass)).toBe(70);
      expect(restored!.getUnspentClassExperience(mageClass)).toBe(65);
    });

    it('should calculate total unspent experience correctly', () => {
      testUnit.addExperience(100, warriorClass);
      testUnit.addExperience(80, mageClass);
      testUnit.learnAbility(slashAbility, warriorClass); // costs 10
      testUnit.learnAbility(dashAbility, mageClass); // costs 15

      // Total: 180, Spent: 25
      expect(testUnit.totalExperience).toBe(180);
      expect(testUnit.unspentExperience).toBe(155);
    });

    it('should prevent learning abilities from wrong class', () => {
      testUnit.addExperience(100, warriorClass);

      // Try to learn a mage ability from warrior class
      const learned = testUnit.learnAbility(dashAbility, warriorClass);

      expect(learned).toBe(false);
      expect(testUnit.hasAbility(dashAbility)).toBe(false);
    });
  });

  describe('Weapon Equipment Validation', () => {
    let twoHandedSword: Equipment;
    let oneHandedSword: Equipment;
    let oneHandedDagger: Equipment;
    let shield: Equipment;
    let torch: Equipment;
    let longbow: Equipment;

    beforeEach(() => {
      // Create weapon equipment with ranges
      twoHandedSword = new Equipment(
        'Two-Handed Sword',
        'TwoHandedWeapon',
        { physicalPower: 20 },
        {},
        new Set(),
        'two-handed-sword-test',
        1, // minRange
        1  // maxRange
      );

      oneHandedSword = new Equipment(
        'One-Handed Sword',
        'OneHandedWeapon',
        { physicalPower: 10 },
        {},
        new Set(),
        'one-handed-sword-test',
        1, // minRange
        1  // maxRange
      );

      oneHandedDagger = new Equipment(
        'Dagger',
        'OneHandedWeapon',
        { physicalPower: 8 },
        {},
        new Set(),
        'dagger-test',
        1, // minRange
        1  // maxRange
      );

      longbow = new Equipment(
        'Longbow',
        'TwoHandedWeapon',
        { physicalPower: 15 },
        {},
        new Set(),
        'longbow-test',
        2, // minRange (ranged weapon)
        3  // maxRange
      );

      shield = new Equipment(
        'Wooden Shield',
        'Shield',
        { health: 10 },
        {},
        new Set(),
        'shield-test'
        // No range for shields
      );

      torch = new Equipment(
        'Torch',
        'Held',
        { magicPower: 3 },
        {},
        new Set(),
        'torch-test'
        // No range for held items
      );
    });

    describe('TwoHandedWeapon Validation', () => {
      it('should allow equipping two-handed weapon when both hands are empty', () => {
        const result = testUnit.equipLeftHand(twoHandedSword);
        expect(result).toBe(true);
        expect(testUnit.leftHand).toBe(twoHandedSword);
      });

      it('should prevent equipping two-handed weapon when right hand has equipment', () => {
        testUnit.equipRightHand(shield);
        const result = testUnit.equipLeftHand(twoHandedSword);
        expect(result).toBe(false);
        expect(testUnit.leftHand).toBeNull();
      });

      it('should prevent equipping two-handed weapon when left hand has equipment', () => {
        testUnit.equipLeftHand(torch);
        const result = testUnit.equipRightHand(twoHandedSword);
        expect(result).toBe(false);
        expect(testUnit.rightHand).toBeNull();
      });

      it('should prevent equipping anything in right hand when left has two-handed weapon', () => {
        testUnit.equipLeftHand(twoHandedSword);
        const result = testUnit.equipRightHand(shield);
        expect(result).toBe(false);
        expect(testUnit.rightHand).toBeNull();
      });

      it('should prevent equipping anything in left hand when right has two-handed weapon', () => {
        testUnit.equipRightHand(twoHandedSword);
        const result = testUnit.equipLeftHand(shield);
        expect(result).toBe(false);
        expect(testUnit.leftHand).toBeNull();
      });
    });

    describe('Dual-Wield Disabled (default)', () => {
      it('should prevent equipping second weapon when canDualWield is false', () => {
        testUnit.equipLeftHand(oneHandedSword);
        const result = testUnit.equipRightHand(oneHandedDagger);
        expect(result).toBe(false);
        expect(testUnit.rightHand).toBeNull();
      });

      it('should allow equipping weapon + shield when canDualWield is false', () => {
        testUnit.equipLeftHand(oneHandedSword);
        const result = testUnit.equipRightHand(shield);
        expect(result).toBe(true);
        expect(testUnit.rightHand).toBe(shield);
      });

      it('should allow equipping weapon + held item when canDualWield is false', () => {
        testUnit.equipLeftHand(oneHandedSword);
        const result = testUnit.equipRightHand(torch);
        expect(result).toBe(true);
        expect(testUnit.rightHand).toBe(torch);
      });

      it('should allow equipping shield + held item when canDualWield is false', () => {
        testUnit.equipLeftHand(shield);
        const result = testUnit.equipRightHand(torch);
        expect(result).toBe(true);
        expect(testUnit.rightHand).toBe(torch);
      });
    });

    describe('Dual-Wield Enabled', () => {
      beforeEach(() => {
        testUnit.setCanDualWield(true);
      });

      it('should allow equipping two weapons with matching ranges', () => {
        testUnit.equipLeftHand(oneHandedSword);
        const result = testUnit.equipRightHand(oneHandedDagger);
        expect(result).toBe(true);
        expect(testUnit.rightHand).toBe(oneHandedDagger);
      });

      it('should prevent equipping two weapons with mismatched minRange', () => {
        const shortSword = new Equipment(
          'Short Sword',
          'OneHandedWeapon',
          {},
          {},
          new Set(),
          'short-sword-test',
          1, // minRange
          1  // maxRange
        );

        const javelin = new Equipment(
          'Javelin',
          'OneHandedWeapon',
          {},
          {},
          new Set(),
          'javelin-test',
          2, // minRange (different!)
          1  // maxRange
        );

        testUnit.equipLeftHand(shortSword);
        const result = testUnit.equipRightHand(javelin);
        expect(result).toBe(false);
        expect(testUnit.rightHand).toBeNull();
      });

      it('should prevent equipping two weapons with mismatched maxRange', () => {
        const shortSword = new Equipment(
          'Short Sword',
          'OneHandedWeapon',
          {},
          {},
          new Set(),
          'short-sword-test',
          1, // minRange
          1  // maxRange
        );

        const whip = new Equipment(
          'Whip',
          'OneHandedWeapon',
          {},
          {},
          new Set(),
          'whip-test',
          1, // minRange
          2  // maxRange (different!)
        );

        testUnit.equipLeftHand(shortSword);
        const result = testUnit.equipRightHand(whip);
        expect(result).toBe(false);
        expect(testUnit.rightHand).toBeNull();
      });

      it('should allow equipping weapon + non-weapon even when dual-wield enabled', () => {
        testUnit.equipLeftHand(oneHandedSword);
        const result = testUnit.equipRightHand(shield);
        expect(result).toBe(true);
        expect(testUnit.rightHand).toBe(shield);
      });
    });

    describe('getEquippedWeapons Helper', () => {
      it('should return empty array when no weapons equipped', () => {
        const weapons = testUnit.getEquippedWeapons();
        expect(weapons).toEqual([]);
      });

      it('should return one weapon when only one hand has weapon', () => {
        testUnit.equipLeftHand(oneHandedSword);
        const weapons = testUnit.getEquippedWeapons();
        expect(weapons.length).toBe(1);
        expect(weapons[0]).toBe(oneHandedSword);
      });

      it('should return two weapons when dual-wielding', () => {
        testUnit.setCanDualWield(true);
        testUnit.equipLeftHand(oneHandedSword);
        testUnit.equipRightHand(oneHandedDagger);
        const weapons = testUnit.getEquippedWeapons();
        expect(weapons.length).toBe(2);
        expect(weapons).toContain(oneHandedSword);
        expect(weapons).toContain(oneHandedDagger);
      });

      it('should not include shield in equipped weapons', () => {
        testUnit.equipLeftHand(oneHandedSword);
        testUnit.equipRightHand(shield);
        const weapons = testUnit.getEquippedWeapons();
        expect(weapons.length).toBe(1);
        expect(weapons[0]).toBe(oneHandedSword);
      });

      it('should return two-handed weapon', () => {
        testUnit.equipLeftHand(twoHandedSword);
        const weapons = testUnit.getEquippedWeapons();
        expect(weapons.length).toBe(1);
        expect(weapons[0]).toBe(twoHandedSword);
      });
    });

    describe('Equipment Unequipping', () => {
      it('should allow unequipping by passing null', () => {
        testUnit.equipLeftHand(oneHandedSword);
        const result = testUnit.equipLeftHand(null);
        expect(result).toBe(true);
        expect(testUnit.leftHand).toBeNull();
      });

      it('should allow equipping weapon after unequipping two-handed weapon', () => {
        testUnit.equipLeftHand(twoHandedSword);
        testUnit.equipLeftHand(null);
        const result = testUnit.equipRightHand(shield);
        expect(result).toBe(true);
        expect(testUnit.rightHand).toBe(shield);
      });
    });
  });
});

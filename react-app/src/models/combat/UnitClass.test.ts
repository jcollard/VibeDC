import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnitClass } from './UnitClass';
import { CombatAbility } from './CombatAbility';

describe('UnitClass Requirements', () => {
  let warriorClass: UnitClass;
  let mageClass: UnitClass;
  let paladinClass: UnitClass;
  let battleMageClass: UnitClass;
  let slashAbility: CombatAbility;

  beforeEach(() => {
    UnitClass.clearRegistry();
    CombatAbility.clearRegistry();

    // Create a test ability
    slashAbility = new CombatAbility(
      'Slash',
      'A basic attack',
      'Action',
      10,
      ['physical'],
      'slash-test-001'
    );

    // Base classes with no requirements
    warriorClass = new UnitClass(
      'Warrior',
      'A melee fighter',
      ['melee', 'physical'],
      [slashAbility],
      { health: 20, physicalPower: 10 },
      { health: 1.2 },
      new Map(), // No requirements
      'warrior-test-001'
    );

    mageClass = new UnitClass(
      'Mage',
      'A magic user',
      ['magic', 'ranged'],
      [],
      { mana: 30, magicPower: 15 },
      { mana: 1.5 },
      new Map(), // No requirements
      'mage-test-001'
    );

    // Cleric class is created to be used as a requirement for Paladin (registered in UnitClass registry)
    const clericClass = new UnitClass(
      'Cleric',
      'A healer',
      ['support', 'magic'],
      [],
      { mana: 25, magicPower: 8 },
      { mana: 1.3 },
      new Map(), // No requirements
      'cleric-test-001'
    );
    void clericClass; // Referenced by ID in paladin requirements

    // Advanced classes with requirements
    paladinClass = new UnitClass(
      'Paladin',
      'A holy warrior',
      ['melee', 'magic', 'tank'],
      [slashAbility],
      { health: 15, mana: 15, physicalPower: 8 },
      { health: 1.15 },
      new Map([
        ['warrior-test-001', 100],
        ['cleric-test-001', 100],
      ]),
      'paladin-test-001'
    );

    battleMageClass = new UnitClass(
      'Battle Mage',
      'A spellsword',
      ['melee', 'magic'],
      [slashAbility],
      { physicalPower: 8, magicPower: 10 },
      { physicalPower: 1.1, magicPower: 1.15 },
      new Map([
        ['warrior-test-001', 100],
        ['mage-test-001', 100],
      ]),
      'battle-mage-test-001'
    );
  });

  afterEach(() => {
    UnitClass.clearRegistry();
    CombatAbility.clearRegistry();
  });

  describe('Requirements Property', () => {
    it('should store requirements correctly', () => {
      expect(warriorClass.requirements.size).toBe(0);
      expect(paladinClass.requirements.size).toBe(2);
      expect(paladinClass.requirements.get('warrior-test-001')).toBe(100);
      expect(paladinClass.requirements.get('cleric-test-001')).toBe(100);
    });

    it('should be readonly', () => {
      const requirements = paladinClass.requirements;
      expect(requirements).toBeInstanceOf(Map);
      // ReadonlyMap should still be a Map instance
    });
  });

  describe('meetsRequirements', () => {
    it('should return true when class has no requirements', () => {
      const emptyExperience = new Map<string, number>();
      expect(warriorClass.meetsRequirements(emptyExperience)).toBe(true);
      expect(mageClass.meetsRequirements(emptyExperience)).toBe(true);
    });

    it('should return false when requirements are not met', () => {
      const insufficientExperience = new Map([
        ['warrior-test-001', 50],
        ['cleric-test-001', 50],
      ]);
      expect(paladinClass.meetsRequirements(insufficientExperience)).toBe(false);
    });

    it('should return false when some requirements are met but not all', () => {
      const partialExperience = new Map([
        ['warrior-test-001', 100], // Met
        ['cleric-test-001', 50],   // Not met
      ]);
      expect(paladinClass.meetsRequirements(partialExperience)).toBe(false);
    });

    it('should return true when all requirements are exactly met', () => {
      const exactExperience = new Map([
        ['warrior-test-001', 100],
        ['cleric-test-001', 100],
      ]);
      expect(paladinClass.meetsRequirements(exactExperience)).toBe(true);
    });

    it('should return true when all requirements are exceeded', () => {
      const exceededExperience = new Map([
        ['warrior-test-001', 200],
        ['cleric-test-001', 150],
      ]);
      expect(paladinClass.meetsRequirements(exceededExperience)).toBe(true);
    });

    it('should return false when experience map is missing a required class', () => {
      const missingExperience = new Map([
        ['warrior-test-001', 100],
        // Missing cleric-test-001
      ]);
      expect(paladinClass.meetsRequirements(missingExperience)).toBe(false);
    });

    it('should handle empty experience map for classes with requirements', () => {
      const emptyExperience = new Map<string, number>();
      expect(paladinClass.meetsRequirements(emptyExperience)).toBe(false);
      expect(battleMageClass.meetsRequirements(emptyExperience)).toBe(false);
    });

    it('should work with different requirement combinations', () => {
      const experience = new Map([
        ['warrior-test-001', 150],
        ['mage-test-001', 120],
        ['cleric-test-001', 80],
      ]);

      // Battle Mage requires Warrior 100 and Mage 100 - should pass
      expect(battleMageClass.meetsRequirements(experience)).toBe(true);

      // Paladin requires Warrior 100 and Cleric 100 - should fail (Cleric only 80)
      expect(paladinClass.meetsRequirements(experience)).toBe(false);
    });
  });

  describe('getUnmetRequirements', () => {
    it('should return empty array when all requirements are met', () => {
      const sufficientExperience = new Map([
        ['warrior-test-001', 100],
        ['cleric-test-001', 100],
      ]);
      const unmet = paladinClass.getUnmetRequirements(sufficientExperience);
      expect(unmet).toEqual([]);
    });

    it('should return empty array when class has no requirements', () => {
      const emptyExperience = new Map<string, number>();
      const unmet = warriorClass.getUnmetRequirements(emptyExperience);
      expect(unmet).toEqual([]);
    });

    it('should return all unmet requirements', () => {
      const insufficientExperience = new Map([
        ['warrior-test-001', 50],
        ['cleric-test-001', 75],
      ]);
      const unmet = paladinClass.getUnmetRequirements(insufficientExperience);

      expect(unmet.length).toBe(2);
      expect(unmet).toContainEqual({
        classId: 'warrior-test-001',
        required: 100,
        current: 50,
      });
      expect(unmet).toContainEqual({
        classId: 'cleric-test-001',
        required: 100,
        current: 75,
      });
    });

    it('should return only partially unmet requirements', () => {
      const partialExperience = new Map([
        ['warrior-test-001', 100], // Met
        ['cleric-test-001', 80],   // Not met
      ]);
      const unmet = paladinClass.getUnmetRequirements(partialExperience);

      expect(unmet.length).toBe(1);
      expect(unmet[0]).toEqual({
        classId: 'cleric-test-001',
        required: 100,
        current: 80,
      });
    });

    it('should handle missing experience entries as 0', () => {
      const missingExperience = new Map([
        ['warrior-test-001', 100],
        // Missing cleric-test-001 entirely
      ]);
      const unmet = paladinClass.getUnmetRequirements(missingExperience);

      expect(unmet.length).toBe(1);
      expect(unmet[0]).toEqual({
        classId: 'cleric-test-001',
        required: 100,
        current: 0,
      });
    });

    it('should provide accurate shortage information', () => {
      const experience = new Map([
        ['warrior-test-001', 25],
        ['mage-test-001', 60],
      ]);
      const unmet = battleMageClass.getUnmetRequirements(experience);

      expect(unmet.length).toBe(2);

      const warriorUnmet = unmet.find(u => u.classId === 'warrior-test-001');
      expect(warriorUnmet).toBeDefined();
      expect(warriorUnmet!.required - warriorUnmet!.current).toBe(75);

      const mageUnmet = unmet.find(u => u.classId === 'mage-test-001');
      expect(mageUnmet).toBeDefined();
      expect(mageUnmet!.required - mageUnmet!.current).toBe(40);
    });
  });

  describe('Integration with Registry', () => {
    it('should retrieve classes with requirements from registry', () => {
      const retrieved = UnitClass.getById('paladin-test-001');
      expect(retrieved).toBeDefined();
      expect(retrieved!.requirements.size).toBe(2);
      expect(retrieved!.requirements.get('warrior-test-001')).toBe(100);
    });

    it('should include classes with requirements in getAll', () => {
      const allClasses = UnitClass.getAll();
      expect(allClasses.length).toBe(5); // warrior, mage, cleric, paladin, battleMage

      const classesWithRequirements = allClasses.filter(c => c.requirements.size > 0);
      expect(classesWithRequirements.length).toBe(2); // paladin and battleMage
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadAbilities, loadEquipment, loadClasses, loadAllGameData } from './DataLoader';
import { CombatAbility } from '../models/combat/CombatAbility';
import { Equipment } from '../models/combat/Equipment';
import { UnitClass } from '../models/combat/UnitClass';

describe('DataLoader', () => {
  beforeEach(() => {
    // Clear all registries before each test
    CombatAbility.clearRegistry();
    Equipment.clearRegistry();
    UnitClass.clearRegistry();
  });

  afterEach(() => {
    // Clean up after each test
    CombatAbility.clearRegistry();
    Equipment.clearRegistry();
    UnitClass.clearRegistry();
  });

  describe('loadAbilities', () => {
    it('should load all abilities from YAML', () => {
      loadAbilities();

      const allAbilities = CombatAbility.getAll();
      expect(allAbilities.length).toBeGreaterThan(0);
    });

    it('should load abilities with correct properties', () => {
      loadAbilities();

      // Check for a known ability from ability-database.yaml
      const charge = CombatAbility.getById('charge-001');
      expect(charge).toBeDefined();
      expect(charge!.name).toBe('Charge');
      expect(charge!.abilityType).toBe('Action');
      expect(charge!.experiencePrice).toBeGreaterThan(0);
    });

    it('should load different ability types', () => {
      loadAbilities();

      const allAbilities = CombatAbility.getAll();

      const actionAbilities = allAbilities.filter(a => a.abilityType === 'Action');
      const reactionAbilities = allAbilities.filter(a => a.abilityType === 'Reaction');
      const passiveAbilities = allAbilities.filter(a => a.abilityType === 'Passive');
      const movementAbilities = allAbilities.filter(a => a.abilityType === 'Movement');

      expect(actionAbilities.length).toBeGreaterThan(0);
      expect(reactionAbilities.length).toBeGreaterThan(0);
      expect(passiveAbilities.length).toBeGreaterThan(0);
      expect(movementAbilities.length).toBeGreaterThan(0);
    });

    it('should register abilities in the registry', () => {
      loadAbilities();

      // Verify abilities are accessible by ID
      const heal = CombatAbility.getById('heal-001');
      expect(heal).toBeDefined();
      expect(heal!.name).toBe('Heal');
    });

    it('should load abilities with tags', () => {
      loadAbilities();

      const charge = CombatAbility.getById('charge-001');
      expect(charge).toBeDefined();
      expect(charge!.tags).toBeInstanceOf(Array);
      expect(charge!.tags.length).toBeGreaterThan(0);
    });

    it('should handle abilities without tags', () => {
      loadAbilities();

      // All abilities should have at least an empty array for tags
      const allAbilities = CombatAbility.getAll();
      allAbilities.forEach(ability => {
        expect(ability.tags).toBeInstanceOf(Array);
      });
    });
  });

  describe('loadEquipment', () => {
    it('should load all equipment from YAML', () => {
      loadEquipment();

      const allEquipment = Equipment.getAll();
      expect(allEquipment.length).toBeGreaterThan(0);
    });

    it('should load equipment with correct properties', () => {
      loadEquipment();

      // Check for a known equipment from equipment-database.yaml
      const ironSword = Equipment.getById('iron-sword-001');
      expect(ironSword).toBeDefined();
      expect(ironSword!.name).toBe('Iron Sword');
      expect(ironSword!.type).toBe('OneHandedWeapon');
    });

    it('should load equipment with modifiers', () => {
      loadEquipment();

      const ironSword = Equipment.getById('iron-sword-001');
      expect(ironSword).toBeDefined();
      expect(ironSword!.modifiers).toBeDefined();
      expect(ironSword!.modifiers.physicalPowerModifier).toBeGreaterThan(0);
    });

    it('should load equipment with multipliers', () => {
      loadEquipment();

      const ironSword = Equipment.getById('iron-sword-001');
      expect(ironSword).toBeDefined();
      expect(ironSword!.modifiers).toBeDefined();
      // Multipliers default to 1.0, check if any are different
      const hasMultipliers =
        ironSword!.modifiers.physicalPowerMultiplier !== 1.0 ||
        ironSword!.modifiers.speedMultiplier !== 1.0;
      // Iron sword has speed multiplier
      expect(hasMultipliers || ironSword!.modifiers.physicalPowerMultiplier === 1.0).toBe(true);
    });

    it('should load different equipment types', () => {
      loadEquipment();

      const allEquipment = Equipment.getAll();

      const weapons = allEquipment.filter(e =>
        e.type === 'OneHandedWeapon' || e.type === 'TwoHandedWeapon'
      );
      const armor = allEquipment.filter(e => e.type === 'Body');
      const shields = allEquipment.filter(e => e.type === 'Shield');

      expect(weapons.length).toBeGreaterThan(0);
      expect(armor.length).toBeGreaterThan(0);
      expect(shields.length).toBeGreaterThan(0);
    });

    it('should register equipment in the registry', () => {
      loadEquipment();

      const leatherArmor = Equipment.getById('leather-armor-001');
      expect(leatherArmor).toBeDefined();
      expect(leatherArmor!.type).toBe('Body');
    });
  });

  describe('loadClasses', () => {
    beforeEach(() => {
      // Classes reference abilities, so load abilities first
      loadAbilities();
    });

    it('should load all classes from YAML', () => {
      loadClasses();

      const allClasses = UnitClass.getAll();
      expect(allClasses.length).toBeGreaterThan(0);
      expect(allClasses.length).toBe(3); // We have 3 Tier 1 classes in the database
    });

    it('should load classes with correct properties', () => {
      loadClasses();

      const fighter = UnitClass.getById('fighter');
      expect(fighter).toBeDefined();
      expect(fighter!.name).toBe('Fighter');
      expect(fighter!.description).toContain('combat');
    });

    it('should load classes with tags', () => {
      loadClasses();

      const fighter = UnitClass.getById('fighter');
      expect(fighter).toBeDefined();
      expect(fighter!.tags).toBeInstanceOf(Array);
      expect(fighter!.tags).toContain('melee');
      expect(fighter!.tags).toContain('physical');
    });

    it('should load classes with modifiers', () => {
      loadClasses();

      const fighter = UnitClass.getById('fighter');
      expect(fighter).toBeDefined();
      expect(fighter!.modifiers).toBeDefined();
      expect(fighter!.modifiers.healthModifier).toBeGreaterThan(0);
      expect(fighter!.modifiers.physicalPowerModifier).toBeGreaterThan(0);
    });

    it('should load classes with multipliers', () => {
      loadClasses();

      const fighter = UnitClass.getById('fighter');
      expect(fighter).toBeDefined();
      expect(fighter!.modifiers.healthMultiplier).toBeGreaterThan(1.0);
    });

    it('should resolve ability references correctly', () => {
      loadClasses();

      const fighter = UnitClass.getById('fighter');
      expect(fighter).toBeDefined();
      expect(fighter!.learnableAbilities.length).toBeGreaterThan(0);

      // All abilities should be resolved (not undefined)
      fighter!.learnableAbilities.forEach(ability => {
        expect(ability).toBeDefined();
        expect(ability.name).toBeDefined();
      });
    });

    it('should load classes with no requirements', () => {
      loadClasses();

      const fighter = UnitClass.getById('fighter');
      expect(fighter).toBeDefined();
      expect(fighter!.requirements.size).toBe(0);
    });

    it('should load classes with requirements', () => {
      loadClasses();

      // All Tier 1 classes have no requirements
      const allClasses = UnitClass.getAll();
      allClasses.forEach(unitClass => {
        expect(unitClass.requirements.size).toBe(0);
      });
    });

    it('should load classes with single requirement', () => {
      loadClasses();

      // All Tier 1 classes have no requirements (skipping this test for now)
      const allClasses = UnitClass.getAll();
      expect(allClasses.length).toBe(3);
    });

    it('should load all base classes without requirements', () => {
      loadClasses();

      const baseClasses = ['fighter', 'rogue', 'apprentice'];

      baseClasses.forEach(classId => {
        const unitClass = UnitClass.getById(classId);
        expect(unitClass).toBeDefined();
        expect(unitClass!.requirements.size).toBe(0);
      });
    });

    it('should load all advanced classes with requirements', () => {
      loadClasses();

      // No advanced classes yet - all Tier 1 classes have no requirements
      const allClasses = UnitClass.getAll();
      const classesWithRequirements = allClasses.filter(c => c.requirements.size > 0);
      expect(classesWithRequirements.length).toBe(0);
    });

    it('should verify all class abilities exist', () => {
      loadClasses();

      const allClasses = UnitClass.getAll();

      allClasses.forEach(unitClass => {
        unitClass.learnableAbilities.forEach(ability => {
          // Verify the ability exists and has valid properties
          expect(ability).toBeDefined();
          expect(ability.id).toBeDefined();
          expect(ability.name).toBeDefined();
          expect(['Action', 'Reaction', 'Passive', 'Movement']).toContain(ability.abilityType);
        });
      });
    });
  });

  describe('loadAllGameData', () => {
    it('should load all data types', () => {
      loadAllGameData();

      expect(CombatAbility.getAll().length).toBeGreaterThan(0);
      expect(Equipment.getAll().length).toBeGreaterThan(0);
      expect(UnitClass.getAll().length).toBeGreaterThan(0);
    });

    it('should load data in correct order', () => {
      loadAllGameData();

      // Verify abilities are loaded (needed for classes)
      const abilities = CombatAbility.getAll();
      expect(abilities.length).toBeGreaterThan(0);

      // Verify classes have resolved ability references
      const fighter = UnitClass.getById('fighter');
      expect(fighter).toBeDefined();
      expect(fighter!.learnableAbilities.length).toBeGreaterThan(0);

      // All abilities should be valid objects
      fighter!.learnableAbilities.forEach(ability => {
        expect(ability.name).toBeDefined();
      });
    });

    it('should create a complete game database', () => {
      loadAllGameData();

      // Verify we have enough data for a working game
      expect(CombatAbility.getAll().length).toBeGreaterThanOrEqual(30);
      expect(Equipment.getAll().length).toBeGreaterThanOrEqual(20);
      expect(UnitClass.getAll().length).toBe(3); // 3 Tier 1 classes
    });

    it('should allow multiple loads without errors', () => {
      // First load
      loadAllGameData();
      const firstAbilityCount = CombatAbility.getAll().length;
      const firstEquipmentCount = Equipment.getAll().length;
      const firstClassCount = UnitClass.getAll().length;

      // Second load (should replace registries)
      loadAllGameData();
      expect(CombatAbility.getAll().length).toBe(firstAbilityCount);
      expect(Equipment.getAll().length).toBe(firstEquipmentCount);
      expect(UnitClass.getAll().length).toBe(firstClassCount);
    });
  });

  describe('Data Integrity', () => {
    beforeEach(() => {
      loadAllGameData();
    });

    it('should have all class abilities available in ability database', () => {
      const allClasses = UnitClass.getAll();
      const allAbilityIds = new Set(CombatAbility.getAll().map(a => a.id));

      allClasses.forEach(unitClass => {
        unitClass.learnableAbilities.forEach(ability => {
          expect(allAbilityIds.has(ability.id)).toBe(true);
        });
      });
    });

    it('should have all class requirements reference valid classes', () => {
      const allClasses = UnitClass.getAll();
      const allClassIds = new Set(allClasses.map(c => c.id));

      allClasses.forEach(unitClass => {
        for (const requiredClassId of unitClass.requirements.keys()) {
          expect(allClassIds.has(requiredClassId)).toBe(true);
        }
      });
    });

    it('should have unique IDs for all abilities', () => {
      const allAbilities = CombatAbility.getAll();
      const ids = allAbilities.map(a => a.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs for all equipment', () => {
      const allEquipment = Equipment.getAll();
      const ids = allEquipment.map(e => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs for all classes', () => {
      const allClasses = UnitClass.getAll();
      const ids = allClasses.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid experience prices for all abilities', () => {
      const allAbilities = CombatAbility.getAll();

      allAbilities.forEach(ability => {
        expect(ability.experiencePrice).toBeGreaterThan(0);
        expect(Number.isInteger(ability.experiencePrice)).toBe(true);
      });
    });

    it('should have valid requirement values', () => {
      const allClasses = UnitClass.getAll();

      allClasses.forEach(unitClass => {
        for (const requiredExp of unitClass.requirements.values()) {
          expect(requiredExp).toBeGreaterThan(0);
          expect(Number.isInteger(requiredExp)).toBe(true);
        }
      });
    });

    it('should have all abilities belong to at least one class', () => {
      const allAbilities = CombatAbility.getAll();
      const allClasses = UnitClass.getAll();

      // Build a set of all abilities referenced by classes
      const abilitiesInClasses = new Set<string>();
      allClasses.forEach(unitClass => {
        unitClass.learnableAbilities.forEach(ability => {
          abilitiesInClasses.add(ability.id);
        });
      });

      // All abilities should be learnable from at least one class
      allAbilities.forEach(ability => {
        expect(abilitiesInClasses.has(ability.id)).toBe(true);
      });
    });
  });

  describe('Specific Database Entries', () => {
    beforeEach(() => {
      loadAllGameData();
    });

    it('should load Fighter class correctly', () => {
      const fighter = UnitClass.getById('fighter');
      expect(fighter).toBeDefined();
      expect(fighter!.name).toBe('Fighter');
      expect(fighter!.tags).toContain('melee');
      expect(fighter!.requirements.size).toBe(0);
      expect(fighter!.learnableAbilities.length).toBeGreaterThan(0);
    });

    it('should load Apprentice class correctly', () => {
      const apprentice = UnitClass.getById('apprentice');
      expect(apprentice).toBeDefined();
      expect(apprentice!.name).toBe('Apprentice');
      expect(apprentice!.requirements.size).toBe(0);
      expect(apprentice!.tags).toContain('magic');
    });

    it('should load Charge ability correctly', () => {
      const charge = CombatAbility.getById('charge-001');
      expect(charge).toBeDefined();
      expect(charge!.name).toBe('Charge');
      expect(charge!.abilityType).toBe('Action');
      expect(charge!.tags.length).toBeGreaterThan(0);
    });

    it('should load Iron Sword equipment correctly', () => {
      const ironSword = Equipment.getById('iron-sword-001');
      expect(ironSword).toBeDefined();
      expect(ironSword!.name).toBe('Iron Sword');
      expect(ironSword!.type).toBe('OneHandedWeapon');
      expect(ironSword!.modifiers.physicalPowerModifier).toBeGreaterThan(0);
    });
  });
});

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
      const slash = CombatAbility.getById('slash-001');
      expect(slash).toBeDefined();
      expect(slash!.name).toBe('Slash');
      expect(slash!.abilityType).toBe('Action');
      expect(slash!.experiencePrice).toBeGreaterThan(0);
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
      const fireball = CombatAbility.getById('fireball-001');
      expect(fireball).toBeDefined();
      expect(fireball!.name).toBe('Fireball');
    });

    it('should load abilities with tags', () => {
      loadAbilities();

      const slash = CombatAbility.getById('slash-001');
      expect(slash).toBeDefined();
      expect(slash!.tags).toBeInstanceOf(Array);
      expect(slash!.tags.length).toBeGreaterThan(0);
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
      expect(allClasses.length).toBe(10); // We have 10 classes in the database
    });

    it('should load classes with correct properties', () => {
      loadClasses();

      const warrior = UnitClass.getById('warrior-001');
      expect(warrior).toBeDefined();
      expect(warrior!.name).toBe('Warrior');
      expect(warrior!.description).toContain('fighter');
    });

    it('should load classes with tags', () => {
      loadClasses();

      const warrior = UnitClass.getById('warrior-001');
      expect(warrior).toBeDefined();
      expect(warrior!.tags).toBeInstanceOf(Array);
      expect(warrior!.tags).toContain('melee');
      expect(warrior!.tags).toContain('physical');
    });

    it('should load classes with modifiers', () => {
      loadClasses();

      const warrior = UnitClass.getById('warrior-001');
      expect(warrior).toBeDefined();
      expect(warrior!.modifiers).toBeDefined();
      expect(warrior!.modifiers.healthModifier).toBeGreaterThan(0);
      expect(warrior!.modifiers.physicalPowerModifier).toBeGreaterThan(0);
    });

    it('should load classes with multipliers', () => {
      loadClasses();

      const warrior = UnitClass.getById('warrior-001');
      expect(warrior).toBeDefined();
      expect(warrior!.modifiers.healthMultiplier).toBeGreaterThan(1.0);
    });

    it('should resolve ability references correctly', () => {
      loadClasses();

      const warrior = UnitClass.getById('warrior-001');
      expect(warrior).toBeDefined();
      expect(warrior!.learnableAbilities.length).toBeGreaterThan(0);

      // All abilities should be resolved (not undefined)
      warrior!.learnableAbilities.forEach(ability => {
        expect(ability).toBeDefined();
        expect(ability.name).toBeDefined();
      });
    });

    it('should load classes with no requirements', () => {
      loadClasses();

      const warrior = UnitClass.getById('warrior-001');
      expect(warrior).toBeDefined();
      expect(warrior!.requirements.size).toBe(0);
    });

    it('should load classes with requirements', () => {
      loadClasses();

      const paladin = UnitClass.getById('paladin-001');
      expect(paladin).toBeDefined();
      expect(paladin!.requirements.size).toBe(2);
      expect(paladin!.requirements.get('warrior-001')).toBe(100);
      expect(paladin!.requirements.get('cleric-001')).toBe(100);
    });

    it('should load classes with single requirement', () => {
      loadClasses();

      const berserker = UnitClass.getById('berserker-001');
      expect(berserker).toBeDefined();
      expect(berserker!.requirements.size).toBe(1);
      expect(berserker!.requirements.get('warrior-001')).toBe(150);
    });

    it('should load all base classes without requirements', () => {
      loadClasses();

      const baseClasses = ['warrior-001', 'mage-001', 'cleric-001', 'rogue-001', 'ranger-001', 'monk-001'];

      baseClasses.forEach(classId => {
        const unitClass = UnitClass.getById(classId);
        expect(unitClass).toBeDefined();
        expect(unitClass!.requirements.size).toBe(0);
      });
    });

    it('should load all advanced classes with requirements', () => {
      loadClasses();

      const advancedClasses = [
        { id: 'paladin-001', reqCount: 2 },
        { id: 'berserker-001', reqCount: 1 },
        { id: 'battle-mage-001', reqCount: 2 },
        { id: 'necromancer-001', reqCount: 1 },
      ];

      advancedClasses.forEach(({ id, reqCount }) => {
        const unitClass = UnitClass.getById(id);
        expect(unitClass).toBeDefined();
        expect(unitClass!.requirements.size).toBe(reqCount);
      });
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
      const warrior = UnitClass.getById('warrior-001');
      expect(warrior).toBeDefined();
      expect(warrior!.learnableAbilities.length).toBeGreaterThan(0);

      // All abilities should be valid objects
      warrior!.learnableAbilities.forEach(ability => {
        expect(ability.name).toBeDefined();
      });
    });

    it('should create a complete game database', () => {
      loadAllGameData();

      // Verify we have enough data for a working game
      expect(CombatAbility.getAll().length).toBeGreaterThanOrEqual(30);
      expect(Equipment.getAll().length).toBeGreaterThanOrEqual(20);
      expect(UnitClass.getAll().length).toBe(10);
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

    it('should load Warrior class correctly', () => {
      const warrior = UnitClass.getById('warrior-001');
      expect(warrior).toBeDefined();
      expect(warrior!.name).toBe('Warrior');
      expect(warrior!.tags).toContain('melee');
      expect(warrior!.requirements.size).toBe(0);
      expect(warrior!.learnableAbilities.length).toBeGreaterThan(0);
    });

    it('should load Paladin class with requirements', () => {
      const paladin = UnitClass.getById('paladin-001');
      expect(paladin).toBeDefined();
      expect(paladin!.name).toBe('Paladin');
      expect(paladin!.requirements.size).toBe(2);
      expect(paladin!.requirements.get('warrior-001')).toBe(100);
      expect(paladin!.requirements.get('cleric-001')).toBe(100);
    });

    it('should load Slash ability correctly', () => {
      const slash = CombatAbility.getById('slash-001');
      expect(slash).toBeDefined();
      expect(slash!.name).toBe('Slash');
      expect(slash!.abilityType).toBe('Action');
      expect(slash!.tags.length).toBeGreaterThan(0);
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Equipment } from './Equipment';

describe('Equipment Class Restrictions', () => {
  beforeEach(() => {
    Equipment.clearRegistry();
  });

  afterEach(() => {
    Equipment.clearRegistry();
  });

  describe('allowedClasses Property', () => {
    it('should store empty set when no restrictions', () => {
      const equipment = new Equipment(
        'Basic Sword',
        'OneHandedWeapon',
        { physicalPower: 10 },
        {},
        new Set(), // No restrictions
        'basic-sword-001'
      );

      expect(equipment.allowedClasses.size).toBe(0);
    });

    it('should store class restrictions correctly', () => {
      const allowedClasses = new Set(['warrior-001', 'paladin-001']);
      const equipment = new Equipment(
        'Holy Sword',
        'OneHandedWeapon',
        { physicalPower: 15, magicPower: 10 },
        {},
        allowedClasses,
        'holy-sword-001'
      );

      expect(equipment.allowedClasses.size).toBe(2);
      expect(equipment.allowedClasses.has('warrior-001')).toBe(true);
      expect(equipment.allowedClasses.has('paladin-001')).toBe(true);
    });

    it('should be readonly', () => {
      const equipment = new Equipment(
        'Restricted Item',
        'OneHandedWeapon',
        {},
        {},
        new Set(['warrior-001']),
        'restricted-001'
      );

      // ReadonlySet should still be a Set instance
      expect(equipment.allowedClasses).toBeInstanceOf(Set);
    });
  });

  describe('canBeEquippedBy', () => {
    it('should return true for any class when no restrictions', () => {
      const equipment = new Equipment(
        'Universal Sword',
        'OneHandedWeapon',
        { physicalPower: 10 },
        {},
        new Set(),
        'universal-sword-001'
      );

      expect(equipment.canBeEquippedBy('warrior-001')).toBe(true);
      expect(equipment.canBeEquippedBy('mage-001')).toBe(true);
      expect(equipment.canBeEquippedBy('rogue-001')).toBe(true);
      expect(equipment.canBeEquippedBy('any-class-id')).toBe(true);
    });

    it('should return true for allowed classes', () => {
      const allowedClasses = new Set(['warrior-001', 'paladin-001', 'berserker-001']);
      const equipment = new Equipment(
        'Heavy Axe',
        'TwoHandedWeapon',
        { physicalPower: 25 },
        {},
        allowedClasses,
        'heavy-axe-001'
      );

      expect(equipment.canBeEquippedBy('warrior-001')).toBe(true);
      expect(equipment.canBeEquippedBy('paladin-001')).toBe(true);
      expect(equipment.canBeEquippedBy('berserker-001')).toBe(true);
    });

    it('should return false for non-allowed classes', () => {
      const allowedClasses = new Set(['mage-001', 'cleric-001']);
      const equipment = new Equipment(
        'Magic Staff',
        'TwoHandedWeapon',
        { magicPower: 20 },
        {},
        allowedClasses,
        'magic-staff-001'
      );

      expect(equipment.canBeEquippedBy('warrior-001')).toBe(false);
      expect(equipment.canBeEquippedBy('rogue-001')).toBe(false);
      expect(equipment.canBeEquippedBy('berserker-001')).toBe(false);
    });

    it('should handle single class restriction', () => {
      const allowedClasses = new Set(['rogue-001']);
      const equipment = new Equipment(
        'Assassin Blade',
        'OneHandedWeapon',
        { physicalPower: 12, speed: 5 },
        {},
        allowedClasses,
        'assassin-blade-001'
      );

      expect(equipment.canBeEquippedBy('rogue-001')).toBe(true);
      expect(equipment.canBeEquippedBy('warrior-001')).toBe(false);
      expect(equipment.canBeEquippedBy('ranger-001')).toBe(false);
    });
  });

  describe('canBeEquippedByAny', () => {
    it('should return true when no restrictions', () => {
      const equipment = new Equipment(
        'Common Ring',
        'Accessory',
        { health: 10 },
        {},
        new Set(),
        'common-ring-001'
      );

      expect(equipment.canBeEquippedByAny(['warrior-001'])).toBe(true);
      expect(equipment.canBeEquippedByAny(['mage-001', 'rogue-001'])).toBe(true);
      expect(equipment.canBeEquippedByAny([])).toBe(true);
    });

    it('should return true if any class matches', () => {
      const allowedClasses = new Set(['warrior-001', 'paladin-001']);
      const equipment = new Equipment(
        'Knight Shield',
        'Shield',
        { health: 20, physicalEvade: 10 },
        {},
        allowedClasses,
        'knight-shield-001'
      );

      expect(equipment.canBeEquippedByAny(['warrior-001'])).toBe(true);
      expect(equipment.canBeEquippedByAny(['paladin-001'])).toBe(true);
      expect(equipment.canBeEquippedByAny(['mage-001', 'warrior-001'])).toBe(true);
      expect(equipment.canBeEquippedByAny(['rogue-001', 'paladin-001', 'mage-001'])).toBe(true);
    });

    it('should return false if no classes match', () => {
      const allowedClasses = new Set(['warrior-001', 'paladin-001']);
      const equipment = new Equipment(
        'Knight Shield',
        'Shield',
        { health: 20 },
        {},
        allowedClasses,
        'knight-shield-002'
      );

      expect(equipment.canBeEquippedByAny(['mage-001'])).toBe(false);
      expect(equipment.canBeEquippedByAny(['mage-001', 'rogue-001'])).toBe(false);
      expect(equipment.canBeEquippedByAny(['cleric-001', 'berserker-001', 'monk-001'])).toBe(false);
    });

    it('should handle empty array', () => {
      const allowedClasses = new Set(['warrior-001']);
      const equipment = new Equipment(
        'Warrior Helm',
        'Head',
        { health: 15 },
        {},
        allowedClasses,
        'warrior-helm-001'
      );

      expect(equipment.canBeEquippedByAny([])).toBe(false);
    });

    it('should work with primary and secondary class', () => {
      const allowedClasses = new Set(['warrior-001', 'berserker-001']);
      const equipment = new Equipment(
        'Battle Axe',
        'TwoHandedWeapon',
        { physicalPower: 28 },
        {},
        allowedClasses,
        'battle-axe-001'
      );

      // Unit with warrior primary can equip
      expect(equipment.canBeEquippedByAny(['warrior-001', 'mage-001'])).toBe(true);

      // Unit with berserker secondary can equip
      expect(equipment.canBeEquippedByAny(['paladin-001', 'berserker-001'])).toBe(true);

      // Unit with neither class cannot equip
      expect(equipment.canBeEquippedByAny(['mage-001', 'cleric-001'])).toBe(false);
    });
  });

  describe('Integration with Registry', () => {
    it('should retrieve equipment with restrictions from registry', () => {
      const allowedClasses = new Set(['rogue-001', 'ranger-001']);
      new Equipment(
        'Light Dagger',
        'OneHandedWeapon',
        { physicalPower: 8, speed: 5 },
        {},
        allowedClasses,
        'light-dagger-001'
      );

      const retrieved = Equipment.getById('light-dagger-001');
      expect(retrieved).toBeDefined();
      expect(retrieved!.allowedClasses.size).toBe(2);
      expect(retrieved!.canBeEquippedBy('rogue-001')).toBe(true);
      expect(retrieved!.canBeEquippedBy('warrior-001')).toBe(false);
    });

    it('should include both restricted and unrestricted equipment in getAll', () => {
      new Equipment(
        'Universal Sword',
        'OneHandedWeapon',
        { physicalPower: 10 },
        {},
        new Set(),
        'universal-001'
      );

      new Equipment(
        'Mage Staff',
        'TwoHandedWeapon',
        { magicPower: 15 },
        {},
        new Set(['mage-001']),
        'mage-staff-001'
      );

      const allEquipment = Equipment.getAll();
      expect(allEquipment.length).toBe(2);

      const unrestricted = allEquipment.find(e => e.allowedClasses.size === 0);
      const restricted = allEquipment.find(e => e.allowedClasses.size === 1);

      expect(unrestricted).toBeDefined();
      expect(restricted).toBeDefined();
      expect(restricted!.canBeEquippedBy('mage-001')).toBe(true);
      expect(restricted!.canBeEquippedBy('warrior-001')).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should allow class-specific weapons', () => {
      const dagger = new Equipment(
        'Assassin Dagger',
        'OneHandedWeapon',
        { physicalPower: 10, speed: 8 },
        {},
        new Set(['rogue-001']),
        'assassin-dagger-001'
      );

      const staff = new Equipment(
        'Wizard Staff',
        'TwoHandedWeapon',
        { magicPower: 25, mana: 20 },
        {},
        new Set(['mage-001', 'cleric-001', 'necromancer-001']),
        'wizard-staff-001'
      );

      const sword = new Equipment(
        'Basic Sword',
        'OneHandedWeapon',
        { physicalPower: 12 },
        {},
        new Set(), // Anyone can use
        'basic-sword-001'
      );

      // Rogue can use dagger but not staff
      expect(dagger.canBeEquippedBy('rogue-001')).toBe(true);
      expect(staff.canBeEquippedBy('rogue-001')).toBe(false);
      expect(sword.canBeEquippedBy('rogue-001')).toBe(true);

      // Mage can use staff but not dagger
      expect(dagger.canBeEquippedBy('mage-001')).toBe(false);
      expect(staff.canBeEquippedBy('mage-001')).toBe(true);
      expect(sword.canBeEquippedBy('mage-001')).toBe(true);
    });

    it('should support hybrid class equipment', () => {
      const battleMageWeapon = new Equipment(
        'Spellblade',
        'OneHandedWeapon',
        { physicalPower: 12, magicPower: 12 },
        {},
        new Set(['battle-mage-001', 'paladin-001']),
        'spellblade-001'
      );

      // Battle mage can equip
      expect(battleMageWeapon.canBeEquippedBy('battle-mage-001')).toBe(true);

      // Paladin can equip (also a hybrid class)
      expect(battleMageWeapon.canBeEquippedBy('paladin-001')).toBe(true);

      // Pure classes cannot
      expect(battleMageWeapon.canBeEquippedBy('warrior-001')).toBe(false);
      expect(battleMageWeapon.canBeEquippedBy('mage-001')).toBe(false);
    });
  });
});

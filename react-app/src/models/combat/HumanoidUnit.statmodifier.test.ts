import { describe, it, expect, beforeEach } from 'vitest';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClass } from './UnitClass';
import type { StatModifier } from './StatModifier';

describe('HumanoidUnit - StatModifier System', () => {
  let testUnit: HumanoidUnit;
  let fighterClass: UnitClass;

  beforeEach(() => {
    // Create a basic unit class for testing
    fighterClass = new UnitClass(
      'fighter-001',
      'Fighter',
      'A basic warrior class',
      [] // No abilities needed for these tests
    );

    // Create a test unit with base stats
    testUnit = new HumanoidUnit(
      'Test Fighter',
      fighterClass,
      100, // baseHealth
      50,  // baseMana
      10,  // basePhysicalPower
      5,   // baseMagicPower
      8,   // baseSpeed
      4,   // baseMovement
      3,   // basePhysicalEvade
      2,   // baseMagicEvade
      6,   // baseCourage
      4    // baseAttunement
    );
  });

  describe('Adding stat modifiers', () => {
    it('should add a stat modifier', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      testUnit.addStatModifier(modifier);

      expect(testUnit.statModifiers).toHaveLength(1);
      expect(testUnit.statModifiers[0]).toBe(modifier);
    });

    it('should apply positive modifier to stat getter', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      expect(testUnit.physicalPower).toBe(10); // Base value

      testUnit.addStatModifier(modifier);

      expect(testUnit.physicalPower).toBe(15); // Base + modifier
    });

    it('should apply negative modifier (debuff) to stat getter', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'speed',
        value: -3,
        duration: 2,
        source: 'slow-001',
        sourceName: 'Slow',
      };

      expect(testUnit.speed).toBe(8); // Base value

      testUnit.addStatModifier(modifier);

      expect(testUnit.speed).toBe(5); // Base - modifier
    });

    it('should handle multiple modifiers on the same stat', () => {
      const modifier1: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      const modifier2: StatModifier = {
        id: 'mod-002',
        stat: 'physicalPower',
        value: 3,
        duration: 2,
        source: 'battle-cry-001',
        sourceName: 'Battle Cry',
      };

      testUnit.addStatModifier(modifier1);
      testUnit.addStatModifier(modifier2);

      expect(testUnit.physicalPower).toBe(18); // 10 + 5 + 3
    });

    it('should handle modifiers on different stats', () => {
      const powerModifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      const speedModifier: StatModifier = {
        id: 'mod-002',
        stat: 'speed',
        value: 2,
        duration: 3,
        source: 'haste-001',
        sourceName: 'Haste',
      };

      testUnit.addStatModifier(powerModifier);
      testUnit.addStatModifier(speedModifier);

      expect(testUnit.physicalPower).toBe(15);
      expect(testUnit.speed).toBe(10);
    });

    it('should not allow stats to go below 0', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: -20, // More than the base stat
        duration: 2,
        source: 'weakness-001',
        sourceName: 'Weakness',
      };

      testUnit.addStatModifier(modifier);

      expect(testUnit.physicalPower).toBe(0); // Clamped to 0
    });
  });

  describe('Removing stat modifiers', () => {
    it('should remove a stat modifier by ID', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      testUnit.addStatModifier(modifier);
      expect(testUnit.physicalPower).toBe(15);

      const removed = testUnit.removeStatModifier('mod-001');

      expect(removed).toBe(modifier);
      expect(testUnit.statModifiers).toHaveLength(0);
      expect(testUnit.physicalPower).toBe(10); // Back to base
    });

    it('should return undefined when removing non-existent modifier', () => {
      const removed = testUnit.removeStatModifier('non-existent');

      expect(removed).toBeUndefined();
    });

    it('should remove all modifiers from a specific source', () => {
      const modifier1: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      const modifier2: StatModifier = {
        id: 'mod-002',
        stat: 'speed',
        value: 2,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      const modifier3: StatModifier = {
        id: 'mod-003',
        stat: 'magicPower',
        value: 3,
        duration: 2,
        source: 'intelligence-001',
        sourceName: 'Intelligence',
      };

      testUnit.addStatModifier(modifier1);
      testUnit.addStatModifier(modifier2);
      testUnit.addStatModifier(modifier3);

      const removed = testUnit.removeStatModifiersBySource('strength-001');

      expect(removed).toHaveLength(2);
      expect(removed).toContain(modifier1);
      expect(removed).toContain(modifier2);
      expect(testUnit.statModifiers).toHaveLength(1);
      expect(testUnit.statModifiers[0]).toBe(modifier3);
    });

    it('should clear all stat modifiers', () => {
      testUnit.addStatModifier({
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      });

      testUnit.addStatModifier({
        id: 'mod-002',
        stat: 'speed',
        value: 2,
        duration: 3,
        source: 'haste-001',
        sourceName: 'Haste',
      });

      testUnit.clearAllStatModifiers();

      expect(testUnit.statModifiers).toHaveLength(0);
      expect(testUnit.physicalPower).toBe(10);
      expect(testUnit.speed).toBe(8);
    });
  });

  describe('Duration management', () => {
    it('should decrement temporary modifier duration', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      testUnit.addStatModifier(modifier);
      expect(modifier.duration).toBe(3);

      testUnit.decrementModifierDurations();
      expect(modifier.duration).toBe(2);

      testUnit.decrementModifierDurations();
      expect(modifier.duration).toBe(1);
    });

    it('should remove modifiers when duration reaches 0', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 1,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      testUnit.addStatModifier(modifier);
      expect(testUnit.physicalPower).toBe(15);

      const expired = testUnit.decrementModifierDurations();

      expect(expired).toHaveLength(1);
      expect(expired[0]).toBe(modifier);
      expect(testUnit.statModifiers).toHaveLength(0);
      expect(testUnit.physicalPower).toBe(10); // Back to base
    });

    it('should not decrement permanent modifiers (duration -1)', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: -1, // Permanent
        source: 'permanent-strength-001',
        sourceName: 'Permanent Strength',
      };

      testUnit.addStatModifier(modifier);

      // Decrement multiple times
      testUnit.decrementModifierDurations();
      testUnit.decrementModifierDurations();
      testUnit.decrementModifierDurations();

      expect(modifier.duration).toBe(-1); // Should not change
      expect(testUnit.statModifiers).toHaveLength(1);
      expect(testUnit.physicalPower).toBe(15); // Still active
    });

    it('should handle mix of permanent and temporary modifiers', () => {
      const tempModifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 2,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      const permModifier: StatModifier = {
        id: 'mod-002',
        stat: 'physicalPower',
        value: 3,
        duration: -1,
        source: 'permanent-strength-001',
        sourceName: 'Permanent Strength',
      };

      testUnit.addStatModifier(tempModifier);
      testUnit.addStatModifier(permModifier);

      expect(testUnit.physicalPower).toBe(18); // 10 + 5 + 3

      // First decrement
      testUnit.decrementModifierDurations();
      expect(testUnit.statModifiers).toHaveLength(2);
      expect(testUnit.physicalPower).toBe(18);

      // Second decrement - temp expires
      const expired = testUnit.decrementModifierDurations();
      expect(expired).toHaveLength(1);
      expect(expired[0]).toBe(tempModifier);
      expect(testUnit.statModifiers).toHaveLength(1);
      expect(testUnit.physicalPower).toBe(13); // 10 + 3
    });
  });

  describe('All stat types', () => {
    it('should modify maxHealth', () => {
      testUnit.addStatModifier({
        id: 'mod-001',
        stat: 'maxHealth',
        value: 50,
        duration: -1,
        source: 'meat-shield-001',
        sourceName: 'Meat Shield',
      });

      expect(testUnit.maxHealth).toBe(150);
    });

    it('should modify maxMana', () => {
      testUnit.addStatModifier({
        id: 'mod-001',
        stat: 'maxMana',
        value: 20,
        duration: -1,
        source: 'mana-boost-001',
        sourceName: 'Mana Boost',
      });

      expect(testUnit.maxMana).toBe(70);
    });

    it('should modify movement', () => {
      testUnit.addStatModifier({
        id: 'mod-001',
        stat: 'movement',
        value: 2,
        duration: 3,
        source: 'quick-001',
        sourceName: 'Quick',
      });

      expect(testUnit.movement).toBe(6);
    });

    it('should modify physicalEvade', () => {
      testUnit.addStatModifier({
        id: 'mod-001',
        stat: 'physicalEvade',
        value: 5,
        duration: 2,
        source: 'dodge-001',
        sourceName: 'Dodge',
      });

      expect(testUnit.physicalEvade).toBe(8);
    });

    it('should modify magicEvade', () => {
      testUnit.addStatModifier({
        id: 'mod-001',
        stat: 'magicEvade',
        value: 3,
        duration: 2,
        source: 'magic-resist-001',
        sourceName: 'Magic Resist',
      });

      expect(testUnit.magicEvade).toBe(5);
    });

    it('should modify courage', () => {
      testUnit.addStatModifier({
        id: 'mod-001',
        stat: 'courage',
        value: 4,
        duration: -1,
        source: 'brave-001',
        sourceName: 'Brave',
      });

      expect(testUnit.courage).toBe(10);
    });

    it('should modify attunement', () => {
      testUnit.addStatModifier({
        id: 'mod-001',
        stat: 'attunement',
        value: 6,
        duration: -1,
        source: 'attune-001',
        sourceName: 'Attune',
      });

      expect(testUnit.attunement).toBe(10);
    });
  });

  describe('Serialization', () => {
    it('should serialize stat modifiers to JSON', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      testUnit.addStatModifier(modifier);

      const json = testUnit.toJSON();

      expect(json.statModifiers).toHaveLength(1);
      expect(json.statModifiers[0]).toEqual(modifier);
    });

    it('should deserialize stat modifiers from JSON', () => {
      const modifier: StatModifier = {
        id: 'mod-001',
        stat: 'physicalPower',
        value: 5,
        duration: 3,
        source: 'strength-001',
        sourceName: 'Strength',
      };

      testUnit.addStatModifier(modifier);

      const json = testUnit.toJSON();
      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).not.toBeNull();
      expect(restored!.statModifiers).toHaveLength(1);
      expect(restored!.statModifiers[0]).toEqual(modifier);
      expect(restored!.physicalPower).toBe(15); // Modifier should be active
    });

    it('should handle missing statModifiers in JSON (backward compatibility)', () => {
      const json = testUnit.toJSON();
      delete (json as any).statModifiers;

      const restored = HumanoidUnit.fromJSON(json);

      expect(restored).not.toBeNull();
      expect(restored!.statModifiers).toHaveLength(0);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { AttackRangeCalculator } from './AttackRangeCalculator';
import { CombatMap, TerrainType, parseASCIIMap, type ASCIIMapDefinition } from '../CombatMap';
import { CombatUnitManifest } from '../CombatUnitManifest';
import { MonsterUnit } from '../MonsterUnit';
import { UnitClass } from '../UnitClass';

describe('AttackRangeCalculator - KO Unit Handling', () => {
  let map: CombatMap;
  let manifest: CombatUnitManifest;
  let attackerUnit: MonsterUnit;
  let targetUnit: MonsterUnit;
  let koUnit: MonsterUnit;

  beforeEach(() => {
    // Clear unit class registry before each test
    UnitClass.clearRegistry();

    // Create a test unit class
    const testClass = new UnitClass('Test Class', 'A test class for units');

    // Create a simple 9x9 map
    const ascii: ASCIIMapDefinition = {
      tileTypes: [
        { char: '#', terrain: TerrainType.Wall, walkable: false },
        { char: '.', terrain: TerrainType.Floor, walkable: true },
      ],
      grid: `
        #########
        #.......#
        #.......#
        #.......#
        #.......#
        #.......#
        #.......#
        #.......#
        #########
      `,
    };
    map = parseASCIIMap(ascii);

    // Create units
    attackerUnit = new MonsterUnit(
      'Attacker',
      testClass,
      100, // maxHealth
      0,   // mana
      50,  // physicalPower
      10,  // magicPower
      15,  // speed
      3,   // movement
      5,   // physicalEvade
      5,   // magicEvade
      10,  // courage
      10,  // attunement
      'attacker-sprite',
      true // isPlayerControlled
    );

    targetUnit = new MonsterUnit(
      'Target',
      testClass,
      100,
      0,
      50,
      10,
      15,
      3,
      5,
      5,
      10,
      10,
      'target-sprite',
      false // isPlayerControlled
    );

    koUnit = new MonsterUnit(
      'KO',
      testClass,
      100,
      0,
      50,
      10,
      15,
      3,
      5,
      5,
      10,
      10,
      'ko-sprite',
      false // isPlayerControlled
    );

    manifest = new CombatUnitManifest();
  });

  describe('Phase 4: KO Unit Exclusion from Valid Targets', () => {
    it('should exclude KO\'d units from validTargets', () => {
      // Setup: Attacker at (4,4), KO'd enemy at (4,5) within range 1
      manifest.addUnit(attackerUnit, { x: 4, y: 4 });
      manifest.addUnit(koUnit, { x: 4, y: 5 });

      // KO the enemy
      (koUnit as any)._wounds = koUnit.maxHealth;

      const attackRange = AttackRangeCalculator.calculateAttackRange({
        attackerPosition: { x: 4, y: 4 },
        minRange: 1,
        maxRange: 1,
        map,
        unitManifest: manifest,
      });

      // The KO'd unit's position should be in range but NOT in validTargets
      expect(attackRange.inRange).toContainEqual({ x: 4, y: 5 });
      expect(attackRange.validTargets).not.toContainEqual({ x: 4, y: 5 });
    });

    it('should include active units in validTargets', () => {
      // Setup: Attacker at (4,4), active enemy at (4,5) within range 1
      manifest.addUnit(attackerUnit, { x: 4, y: 4 });
      manifest.addUnit(targetUnit, { x: 4, y: 5 });

      const attackRange = AttackRangeCalculator.calculateAttackRange({
        attackerPosition: { x: 4, y: 4 },
        minRange: 1,
        maxRange: 1,
        map,
        unitManifest: manifest,
      });

      // The active unit should be a valid target
      expect(attackRange.validTargets).toContainEqual({ x: 4, y: 5 });
    });

    it('should handle mixed active and KO\'d units', () => {
      // Setup: Attacker at (4,4), active enemy at (4,5), KO'd enemy at (5,4)
      manifest.addUnit(attackerUnit, { x: 4, y: 4 });
      manifest.addUnit(targetUnit, { x: 4, y: 5 }); // Active
      manifest.addUnit(koUnit, { x: 5, y: 4 });     // KO'd

      // KO the second enemy
      (koUnit as any)._wounds = koUnit.maxHealth;

      const attackRange = AttackRangeCalculator.calculateAttackRange({
        attackerPosition: { x: 4, y: 4 },
        minRange: 1,
        maxRange: 2,
        map,
        unitManifest: manifest,
      });

      // Active unit should be valid target
      expect(attackRange.validTargets).toContainEqual({ x: 4, y: 5 });
      // KO'd unit should NOT be valid target
      expect(attackRange.validTargets).not.toContainEqual({ x: 5, y: 4 });
    });

    it('should work with longer range weapons', () => {
      // Setup: Attacker at (4,4), KO'd enemy at (4,7) within range 3
      manifest.addUnit(attackerUnit, { x: 4, y: 4 });
      manifest.addUnit(koUnit, { x: 4, y: 7 });

      // KO the enemy
      (koUnit as any)._wounds = koUnit.maxHealth;

      const attackRange = AttackRangeCalculator.calculateAttackRange({
        attackerPosition: { x: 4, y: 4 },
        minRange: 1,
        maxRange: 3,
        map,
        unitManifest: manifest,
      });

      // The KO'd unit should NOT be in validTargets
      expect(attackRange.validTargets).not.toContainEqual({ x: 4, y: 7 });
    });

    it('should handle empty tiles as non-targets', () => {
      // Setup: Attacker at (4,4), no units nearby
      manifest.addUnit(attackerUnit, { x: 4, y: 4 });

      const attackRange = AttackRangeCalculator.calculateAttackRange({
        attackerPosition: { x: 4, y: 4 },
        minRange: 1,
        maxRange: 2,
        map,
        unitManifest: manifest,
      });

      // No valid targets (empty tiles don't count as targets)
      expect(attackRange.validTargets).toHaveLength(0);
      // But inRange should still have tiles
      expect(attackRange.inRange.length).toBeGreaterThan(0);
    });

    it('should allow friendly fire on active units', () => {
      // Create an ally
      const allyUnit = new MonsterUnit(
        'Ally',
        attackerUnit.unitClass,
        100,
        0,
        50,
        10,
        15,
        3,
        5,
        5,
        10,
        10,
        'ally-sprite',
        true // Same team as attacker
      );

      // Setup: Attacker at (4,4), ally at (4,5)
      manifest.addUnit(attackerUnit, { x: 4, y: 4 });
      manifest.addUnit(allyUnit, { x: 4, y: 5 });

      const attackRange = AttackRangeCalculator.calculateAttackRange({
        attackerPosition: { x: 4, y: 4 },
        minRange: 1,
        maxRange: 1,
        map,
        unitManifest: manifest,
      });

      // Friendly fire is allowed - ally should be valid target
      expect(attackRange.validTargets).toContainEqual({ x: 4, y: 5 });
    });

    it('should NOT allow targeting KO\'d allies', () => {
      // Create an ally
      const allyUnit = new MonsterUnit(
        'Ally',
        attackerUnit.unitClass,
        100,
        0,
        50,
        10,
        15,
        3,
        5,
        5,
        10,
        10,
        'ally-sprite',
        true // Same team as attacker
      );

      // Setup: Attacker at (4,4), KO'd ally at (4,5)
      manifest.addUnit(attackerUnit, { x: 4, y: 4 });
      manifest.addUnit(allyUnit, { x: 4, y: 5 });

      // KO the ally
      (allyUnit as any)._wounds = allyUnit.maxHealth;

      const attackRange = AttackRangeCalculator.calculateAttackRange({
        attackerPosition: { x: 4, y: 4 },
        minRange: 1,
        maxRange: 1,
        map,
        unitManifest: manifest,
      });

      // KO'd ally should NOT be valid target
      expect(attackRange.validTargets).not.toContainEqual({ x: 4, y: 5 });
    });
  });
});

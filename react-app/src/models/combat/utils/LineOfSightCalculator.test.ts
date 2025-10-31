import { describe, it, expect, beforeEach } from 'vitest';
import { LineOfSightCalculator } from './LineOfSightCalculator';
import { CombatMap, TerrainType, parseASCIIMap, type ASCIIMapDefinition } from '../CombatMap';
import { CombatUnitManifest } from '../CombatUnitManifest';
import { MonsterUnit } from '../MonsterUnit';
import { UnitClass } from '../UnitClass';

describe('LineOfSightCalculator - KO Unit Handling', () => {
  let map: CombatMap;
  let manifest: CombatUnitManifest;
  let attackerUnit: MonsterUnit;
  let targetUnit: MonsterUnit;
  let blockingUnit: MonsterUnit;

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

    blockingUnit = new MonsterUnit(
      'Blocker',
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
      'blocker-sprite',
      false // isPlayerControlled
    );

    manifest = new CombatUnitManifest();
  });

  describe('Phase 4: KO Units Don\'t Block Line of Sight', () => {
    it('should allow LoS through KO\'d units', () => {
      // Setup: Attacker at (1,4), blocker at (2,4), target at (3,4) - all in a line
      manifest.addUnit(attackerUnit, { x: 1, y: 4 });
      manifest.addUnit(blockingUnit, { x: 2, y: 4 });
      manifest.addUnit(targetUnit, { x: 3, y: 4 });

      // Without KO: LoS should be blocked
      let hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 1, y: 4 },
        to: { x: 3, y: 4 },
        map,
        unitManifest: manifest,
      });
      expect(hasLoS).toBe(false);

      // KO the blocker
      (blockingUnit as any)._wounds = blockingUnit.maxHealth;

      // With KO: LoS should now be clear
      hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 1, y: 4 },
        to: { x: 3, y: 4 },
        map,
        unitManifest: manifest,
      });
      expect(hasLoS).toBe(true);
    });

    it('should block LoS with active units', () => {
      // Setup: Attacker at (1,4), active blocker at (2,4), target at (3,4)
      manifest.addUnit(attackerUnit, { x: 1, y: 4 });
      manifest.addUnit(blockingUnit, { x: 2, y: 4 });
      manifest.addUnit(targetUnit, { x: 3, y: 4 });

      // LoS should be blocked by active unit
      const hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 1, y: 4 },
        to: { x: 3, y: 4 },
        map,
        unitManifest: manifest,
      });
      expect(hasLoS).toBe(false);
    });

    it('should allow LoS through multiple KO\'d units', () => {
      const testClass = attackerUnit.unitClass;
      const koUnit2 = new MonsterUnit('KO2', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko2', false);

      // Setup: Attacker at (1,4), two KO'd blockers at (2,4) and (3,4), target at (4,4)
      manifest.addUnit(attackerUnit, { x: 1, y: 4 });
      manifest.addUnit(blockingUnit, { x: 2, y: 4 });
      manifest.addUnit(koUnit2, { x: 3, y: 4 });
      manifest.addUnit(targetUnit, { x: 4, y: 4 });

      // KO both blockers
      (blockingUnit as any)._wounds = blockingUnit.maxHealth;
      (koUnit2 as any)._wounds = koUnit2.maxHealth;

      // LoS should be clear through both KO'd units
      const hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 1, y: 4 },
        to: { x: 4, y: 4 },
        map,
        unitManifest: manifest,
      });
      expect(hasLoS).toBe(true);
    });

    it('should block LoS if any unit in path is active', () => {
      const testClass = attackerUnit.unitClass;
      const koUnit2 = new MonsterUnit('KO2', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko2', false);

      // Setup: Attacker at (1,4), KO'd unit at (2,4), active unit at (3,4), target at (4,4)
      manifest.addUnit(attackerUnit, { x: 1, y: 4 });
      manifest.addUnit(blockingUnit, { x: 2, y: 4 });
      manifest.addUnit(koUnit2, { x: 3, y: 4 });
      manifest.addUnit(targetUnit, { x: 4, y: 4 });

      // KO only the first blocker
      (blockingUnit as any)._wounds = blockingUnit.maxHealth;
      // koUnit2 remains active

      // LoS should be blocked by the active unit
      const hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 1, y: 4 },
        to: { x: 4, y: 4 },
        map,
        unitManifest: manifest,
      });
      expect(hasLoS).toBe(false);
    });

    it('should allow LoS through KO\'d units on diagonal paths', () => {
      // Setup: Attacker at (1,1), blocker at (2,2), target at (3,3) - diagonal line
      manifest.addUnit(attackerUnit, { x: 1, y: 1 });
      manifest.addUnit(blockingUnit, { x: 2, y: 2 });
      manifest.addUnit(targetUnit, { x: 3, y: 3 });

      // KO the blocker
      (blockingUnit as any)._wounds = blockingUnit.maxHealth;

      // LoS should be clear through KO'd unit on diagonal
      const hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 1, y: 1 },
        to: { x: 3, y: 3 },
        map,
        unitManifest: manifest,
      });
      expect(hasLoS).toBe(true);
    });

    it('should still block LoS with walls', () => {
      // Create a map with a wall in the middle
      const ascii: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
          { char: '.', terrain: TerrainType.Floor, walkable: true },
        ],
        grid: `
          #####
          #...#
          #.#.#
          #...#
          #####
        `,
      };
      const wallMap = parseASCIIMap(ascii);
      const wallManifest = new CombatUnitManifest();

      // Test 1: Horizontal line that doesn't hit a wall
      wallManifest.addUnit(attackerUnit, { x: 1, y: 1 });
      wallManifest.addUnit(targetUnit, { x: 3, y: 1 });

      let hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 1, y: 1 },
        to: { x: 3, y: 1 },
        map: wallMap,
        unitManifest: wallManifest,
      });
      expect(hasLoS).toBe(true);

      // Test 2: Vertical line that should be blocked by wall at (2,2)
      // Note: We need to check (2,1) to (2,3) which passes through (2,2) which is a wall
      const wallManifest2 = new CombatUnitManifest();
      wallManifest2.addUnit(attackerUnit, { x: 2, y: 1 });

      hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 2, y: 1 },
        to: { x: 2, y: 3 },
        map: wallMap,
        unitManifest: wallManifest2,
      });
      expect(hasLoS).toBe(false); // Blocked by wall at (2,2)
    });

    it('should handle target position with KO\'d unit', () => {
      // Setup: Attacker at (1,4), target (who is KO'd) at (3,4)
      manifest.addUnit(attackerUnit, { x: 1, y: 4 });
      manifest.addUnit(targetUnit, { x: 3, y: 4 });

      // KO the target
      (targetUnit as any)._wounds = targetUnit.maxHealth;

      // LoS should still be clear to the target's position (target is the endpoint, not in the path)
      const hasLoS = LineOfSightCalculator.hasLineOfSight({
        from: { x: 1, y: 4 },
        to: { x: 3, y: 4 },
        map,
        unitManifest: manifest,
      });
      expect(hasLoS).toBe(true);
    });
  });
});

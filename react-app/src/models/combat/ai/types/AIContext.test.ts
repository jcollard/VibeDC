import { describe, it, expect, beforeEach } from 'vitest';
import { AIContextBuilder } from './AIContext';
import type { CombatState } from '../../CombatState';
import { CombatMap, TerrainType, parseASCIIMap, type ASCIIMapDefinition } from '../../CombatMap';
import { CombatUnitManifest } from '../../CombatUnitManifest';
import { MonsterUnit } from '../../MonsterUnit';
import { UnitClass } from '../../UnitClass';

// Helper to create a mock CombatState
function createMockCombatState(map: CombatMap, manifest: CombatUnitManifest): CombatState {
  return {
    turnNumber: 1,
    map,
    tilesetId: 'test-tileset',
    phase: 'unit-turn',
    unitManifest: manifest,
    tickCount: 0,
  } as CombatState;
}

describe('AIContextBuilder - KO Unit Filtering', () => {
  let map: CombatMap;
  let manifest: CombatUnitManifest;
  let state: CombatState;
  let aiUnit: MonsterUnit;
  let allyUnit: MonsterUnit;
  let enemyUnit1: MonsterUnit;
  let enemyUnit2: MonsterUnit;

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
    aiUnit = new MonsterUnit(
      'AI',
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
      'ai-sprite',
      false // AI-controlled (enemy)
    );

    allyUnit = new MonsterUnit(
      'Ally',
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
      'ally-sprite',
      false // Same team as AI unit
    );

    enemyUnit1 = new MonsterUnit(
      'Enemy1',
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
      'enemy1-sprite',
      true // Player-controlled (enemy to AI)
    );

    enemyUnit2 = new MonsterUnit(
      'Enemy2',
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
      'enemy2-sprite',
      true // Player-controlled (enemy to AI)
    );

    manifest = new CombatUnitManifest();
  });

  describe('Phase 4: KO Unit Exclusion from AI Context', () => {
    it('should exclude KO\'d enemies from enemyUnits list', () => {
      // Setup: AI at (4,4), two enemies at (4,5) and (4,6), one is KO'd
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(enemyUnit1, { x: 4, y: 5 }); // Active
      manifest.addUnit(enemyUnit2, { x: 4, y: 6 }); // Will be KO'd

      // KO enemyUnit2
      (enemyUnit2 as any)._wounds = enemyUnit2.maxHealth;

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // Should only have 1 enemy (enemyUnit1)
      expect(context.enemyUnits).toHaveLength(1);
      expect(context.enemyUnits[0].unit).toBe(enemyUnit1);
      expect(context.enemyUnits[0].position).toEqual({ x: 4, y: 5 });
    });

    it('should exclude KO\'d allies from alliedUnits list', () => {
      // Setup: AI at (4,4), ally at (4,5) who is KO'd
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(allyUnit, { x: 4, y: 5 });

      // KO the ally
      (allyUnit as any)._wounds = allyUnit.maxHealth;

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // Should have no allies (ally is KO'd)
      expect(context.alliedUnits).toHaveLength(0);
    });

    it('should include only active units in both lists', () => {
      const testClass = aiUnit.unitClass;
      const koAlly = new MonsterUnit('KO Ally', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko-ally', false);
      const koEnemy = new MonsterUnit('KO Enemy', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko-enemy', true);

      // Setup: AI at (4,4), active ally at (3,4), KO'd ally at (5,4)
      //        active enemy at (4,3), KO'd enemy at (4,5)
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(allyUnit, { x: 3, y: 4 });      // Active ally
      manifest.addUnit(koAlly, { x: 5, y: 4 });        // KO'd ally
      manifest.addUnit(enemyUnit1, { x: 4, y: 3 });    // Active enemy
      manifest.addUnit(koEnemy, { x: 4, y: 5 });       // KO'd enemy

      // KO the appropriate units
      (koAlly as any)._wounds = koAlly.maxHealth;
      (koEnemy as any)._wounds = koEnemy.maxHealth;

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // Should have 1 ally and 1 enemy (only active ones)
      expect(context.alliedUnits).toHaveLength(1);
      expect(context.alliedUnits[0].unit).toBe(allyUnit);

      expect(context.enemyUnits).toHaveLength(1);
      expect(context.enemyUnits[0].unit).toBe(enemyUnit1);
    });

    it('should not include self in allied units even if not KO\'d', () => {
      // Setup: AI at (4,4), ally at (4,5)
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(allyUnit, { x: 4, y: 5 });

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // Should have 1 ally (not including self)
      expect(context.alliedUnits).toHaveLength(1);
      expect(context.alliedUnits[0].unit).toBe(allyUnit);
      expect(context.self).toBe(aiUnit);
    });

    it('should handle all units KO\'d except self', () => {
      // Setup: AI at (4,4), ally and enemies all KO'd
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(allyUnit, { x: 4, y: 5 });
      manifest.addUnit(enemyUnit1, { x: 4, y: 3 });
      manifest.addUnit(enemyUnit2, { x: 4, y: 6 });

      // KO everyone except AI
      (allyUnit as any)._wounds = allyUnit.maxHealth;
      (enemyUnit1 as any)._wounds = enemyUnit1.maxHealth;
      (enemyUnit2 as any)._wounds = enemyUnit2.maxHealth;

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // Should have no allies or enemies
      expect(context.alliedUnits).toHaveLength(0);
      expect(context.enemyUnits).toHaveLength(0);
    });

    it('should have empty getUnitsInRange when all units are KO\'d', () => {
      // Setup: AI at (4,4), nearby units all KO'd
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(allyUnit, { x: 4, y: 5 });
      manifest.addUnit(enemyUnit1, { x: 4, y: 3 });

      // KO both
      (allyUnit as any)._wounds = allyUnit.maxHealth;
      (enemyUnit1 as any)._wounds = enemyUnit1.maxHealth;

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // getUnitsInRange should return empty array (KO'd units not included)
      const unitsInRange = context.getUnitsInRange(3);
      expect(unitsInRange).toHaveLength(0);
    });

    it('should exclude KO\'d units from getUnitsInAttackRange', () => {
      // Setup: AI at (4,4), enemy in attack range but KO'd
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(enemyUnit1, { x: 4, y: 5 }); // Adjacent, within range 1

      // KO the enemy
      (enemyUnit1 as any)._wounds = enemyUnit1.maxHealth;

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // getUnitsInAttackRange should return empty (no active enemies in range)
      const unitsInAttackRange = context.getUnitsInAttackRange();
      expect(unitsInAttackRange).toHaveLength(0);
    });
  });

  describe('Integration: AI Context Helper Methods with KO Units', () => {
    it('predictDamage should not error on KO\'d target (though shouldn\'t be called)', () => {
      // Setup: AI at (4,4), KO'd enemy at (4,5)
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(enemyUnit1, { x: 4, y: 5 });

      // KO the enemy
      (enemyUnit1 as any)._wounds = enemyUnit1.maxHealth;

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // Calling predictDamage on KO'd unit should work (even though AI shouldn't do this)
      const damage = context.predictDamage(enemyUnit1);
      expect(typeof damage).toBe('number');
    });

    it('canDefeat should return true for KO\'d units (0 health)', () => {
      // Setup: AI at (4,4), KO'd enemy at (4,5)
      manifest.addUnit(aiUnit, { x: 4, y: 4 });
      manifest.addUnit(enemyUnit1, { x: 4, y: 5 });

      // KO the enemy (0 health)
      (enemyUnit1 as any)._wounds = enemyUnit1.maxHealth;

      state = createMockCombatState(map, manifest);

      const context = AIContextBuilder.build(
        aiUnit,
        { x: 4, y: 4 },
        state,
        false,
        false
      );

      // canDefeat should return true (any damage >= 0 health)
      const canDefeat = context.canDefeat(enemyUnit1);
      expect(canDefeat).toBe(true);
    });
  });
});

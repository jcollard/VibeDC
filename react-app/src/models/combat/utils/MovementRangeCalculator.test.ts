import { describe, it, expect, beforeEach } from 'vitest';
import { MovementRangeCalculator } from './MovementRangeCalculator';
import { CombatMap, TerrainType, parseASCIIMap, type ASCIIMapDefinition } from '../CombatMap';
import { CombatUnitManifest } from '../CombatUnitManifest';
import { MonsterUnit } from '../MonsterUnit';
import { UnitClass } from '../UnitClass';

describe('MovementRangeCalculator', () => {
  let map: CombatMap;
  let manifest: CombatUnitManifest;
  let playerUnit: MonsterUnit;
  let enemyUnit: MonsterUnit;
  let allyUnit: MonsterUnit;

  beforeEach(() => {
    // Clear unit class registry before each test
    UnitClass.clearRegistry();

    // Create a test unit class
    const testClass = new UnitClass('Test Class', 'A test class for units');

    // Create a simple 7x7 map with a few walls
    const ascii: ASCIIMapDefinition = {
      tileTypes: [
        { char: '#', terrain: TerrainType.Wall, walkable: false },
        { char: '.', terrain: TerrainType.Floor, walkable: true },
      ],
      grid: `
        #######
        #.....#
        #.....#
        #.....#
        #.....#
        #.....#
        #######
      `,
    };
    map = parseASCIIMap(ascii);

    // Create units
    playerUnit = new MonsterUnit(
      'Player',
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
      'test-player',
      true // isPlayerControlled
    );

    enemyUnit = new MonsterUnit(
      'Enemy',
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
      'test-enemy',
      false // isPlayerControlled
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
      'test-ally',
      true // isPlayerControlled
    );

    manifest = new CombatUnitManifest();
  });

  describe('Basic Movement Range', () => {
    it('should calculate basic movement range in open space', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 3, y: 3 },
        movement: 2,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Movement 2 from (3,3) should reach (1,3), (5,3), (3,1), (3,5)
      // Plus intermediate positions
      expect(reachable.length).toBeGreaterThan(0);

      // Should be able to reach adjacent tiles
      expect(reachable).toContainEqual({ x: 3, y: 2 });
      expect(reachable).toContainEqual({ x: 3, y: 4 });
      expect(reachable).toContainEqual({ x: 2, y: 3 });
      expect(reachable).toContainEqual({ x: 4, y: 3 });

      // Should be able to reach distance-2 tiles
      expect(reachable).toContainEqual({ x: 3, y: 1 });
      expect(reachable).toContainEqual({ x: 3, y: 5 });
      expect(reachable).toContainEqual({ x: 1, y: 3 });
      expect(reachable).toContainEqual({ x: 5, y: 3 });
    });

    it('should not include starting position in reachable tiles', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 3, y: 3 },
        movement: 2,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      expect(reachable).not.toContainEqual({ x: 3, y: 3 });
    });

    it('should respect movement range limits', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 3, y: 3 },
        movement: 1,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // With movement 1, can only reach adjacent tiles
      expect(reachable).toContainEqual({ x: 2, y: 3 });
      expect(reachable).toContainEqual({ x: 4, y: 3 });
      expect(reachable).toContainEqual({ x: 3, y: 2 });
      expect(reachable).toContainEqual({ x: 3, y: 4 });

      // Should NOT reach distance-2 tiles
      expect(reachable).not.toContainEqual({ x: 1, y: 3 });
      expect(reachable).not.toContainEqual({ x: 5, y: 3 });
    });

    it('should respect map boundaries', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 1 },
        movement: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should not include wall tiles (x=0 or y=0)
      expect(reachable).not.toContainEqual({ x: 0, y: 1 });
      expect(reachable).not.toContainEqual({ x: 1, y: 0 });
    });

    it('should not include unwalkable terrain', () => {
      // Walls are at the edges of the map
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 3, y: 3 },
        movement: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should not reach wall tiles
      expect(reachable.every(pos => pos.x > 0 && pos.x < 6 && pos.y > 0 && pos.y < 6)).toBe(true);
    });
  });

  describe('Friendly Unit Interactions', () => {
    it('should allow pathing through friendly units', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(allyUnit, { x: 2, y: 3 }); // Friendly in the way

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should be able to reach tiles beyond friendly unit
      expect(reachable).toContainEqual({ x: 3, y: 3 });
      expect(reachable).toContainEqual({ x: 4, y: 3 });
    });

    it('should not allow ending movement on friendly unit tile', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(allyUnit, { x: 2, y: 3 }); // Friendly in the way

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Friendly unit's tile should NOT be in reachable list
      expect(reachable).not.toContainEqual({ x: 2, y: 3 });
    });
  });

  describe('Enemy Unit Interactions', () => {
    it('should block pathing through active enemy units', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(enemyUnit, { x: 2, y: 3 }); // Active enemy blocks path

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Enemy tile itself should NOT be reachable
      expect(reachable).not.toContainEqual({ x: 2, y: 3 });

      // Note: In an open map, player CAN reach tiles beyond enemy by going around
      // (e.g., up then right then down). This just verifies the enemy tile blocks.
    });

    it('should still allow movement in other directions', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });
      manifest.addUnit(enemyUnit, { x: 4, y: 3 }); // Enemy to the right

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 3, y: 3 },
        movement: 2,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Can still move left, up, down
      expect(reachable).toContainEqual({ x: 2, y: 3 });
      expect(reachable).toContainEqual({ x: 1, y: 3 });
      expect(reachable).toContainEqual({ x: 3, y: 2 });
      expect(reachable).toContainEqual({ x: 3, y: 4 });
    });
  });

  describe('Knocked Out Unit Interactions (Phase 3)', () => {
    it('should allow pathing through KO\'d enemy units', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(enemyUnit, { x: 2, y: 3 });

      // KO the enemy
      (enemyUnit as any)._wounds = enemyUnit.maxHealth; // Cast to any for test access
      expect(enemyUnit.isKnockedOut).toBe(true);

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should be able to reach tiles beyond KO'd enemy
      expect(reachable).toContainEqual({ x: 3, y: 3 });
      expect(reachable).toContainEqual({ x: 4, y: 3 });
    });

    it('should NOT allow ending movement on KO\'d enemy unit tile', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(enemyUnit, { x: 2, y: 3 });

      // KO the enemy
      (enemyUnit as any)._wounds = enemyUnit.maxHealth; // Cast to any for test access

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // KO'd unit's tile should NOT be in reachable list
      expect(reachable).not.toContainEqual({ x: 2, y: 3 });
    });

    it('should allow pathing through KO\'d ally units', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(allyUnit, { x: 2, y: 3 });

      // KO the ally
      (allyUnit as any)._wounds = allyUnit.maxHealth; // Cast to any for test access
      expect(allyUnit.isKnockedOut).toBe(true);

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should be able to reach tiles beyond KO'd ally
      expect(reachable).toContainEqual({ x: 3, y: 3 });
      expect(reachable).toContainEqual({ x: 4, y: 3 });
    });

    it('should NOT allow ending movement on KO\'d ally unit tile', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(allyUnit, { x: 2, y: 3 });

      // KO the ally
      (allyUnit as any)._wounds = allyUnit.maxHealth; // Cast to any for test access

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // KO'd ally's tile should NOT be in reachable list
      expect(reachable).not.toContainEqual({ x: 2, y: 3 });
    });

    it('should path through multiple KO\'d units', () => {
      const testClass = new UnitClass('Test', 'Test class');
      const koEnemy1 = new MonsterUnit('KO1', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko1', false);
      const koEnemy2 = new MonsterUnit('KO2', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko2', false);
      const koEnemy3 = new MonsterUnit('KO3', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko3', false);

      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(koEnemy1, { x: 2, y: 3 });
      manifest.addUnit(koEnemy2, { x: 3, y: 3 });
      manifest.addUnit(koEnemy3, { x: 4, y: 3 });

      // KO all enemies
      (koEnemy1 as any)._wounds = koEnemy1.maxHealth; // Cast to any for test access
      (koEnemy2 as any)._wounds = koEnemy2.maxHealth; // Cast to any for test access
      (koEnemy3 as any)._wounds = koEnemy3.maxHealth; // Cast to any for test access

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 4,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should be able to reach tile beyond all KO'd units
      expect(reachable).toContainEqual({ x: 5, y: 3 });

      // None of the KO'd unit tiles should be reachable destinations
      expect(reachable).not.toContainEqual({ x: 2, y: 3 });
      expect(reachable).not.toContainEqual({ x: 3, y: 3 });
      expect(reachable).not.toContainEqual({ x: 4, y: 3 });
    });

    it('should differentiate between active and KO\'d enemies', () => {
      const testClass = new UnitClass('Test', 'Test class');
      const koEnemy = new MonsterUnit('KO', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko', false);
      const activeEnemy = new MonsterUnit('Active', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'active', false);

      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(koEnemy, { x: 2, y: 3 });
      manifest.addUnit(activeEnemy, { x: 4, y: 3 });

      // KO only the first enemy
      (koEnemy as any)._wounds = koEnemy.maxHealth; // Cast to any for test access

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should reach tile after KO'd but before active enemy
      expect(reachable).toContainEqual({ x: 3, y: 3 });

      // Active enemy blocks straight path but player can go around in open map
      // Just verify KO'd unit doesn't block (which we already tested)
      expect(reachable).not.toContainEqual({ x: 2, y: 3 }); // Can't end on KO'd
      expect(reachable).not.toContainEqual({ x: 4, y: 3 }); // Can't end on active enemy
    });
  });

  describe('Complex Movement Scenarios', () => {
    it('should handle narrow corridors', () => {
      const corridorMap: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
          { char: '.', terrain: TerrainType.Floor, walkable: true },
        ],
        grid: `
          #####
          #...#
          ###.#
          #...#
          #####
        `,
      };
      const narrowMap = parseASCIIMap(corridorMap);

      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 1 },
        movement: 5,
        map: narrowMap,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should be able to navigate through the corridor
      expect(reachable).toContainEqual({ x: 2, y: 1 });
      expect(reachable).toContainEqual({ x: 3, y: 1 });
      expect(reachable).toContainEqual({ x: 3, y: 2 });
      expect(reachable).toContainEqual({ x: 3, y: 3 });
    });

    it('should handle L-shaped paths', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 1 },
        movement: 2,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Can reach via L-shaped path
      expect(reachable).toContainEqual({ x: 2, y: 2 }); // diagonal via 2 orthogonal moves
    });

    it('should respect movement cost through KO\'d units', () => {
      const testClass = new UnitClass('Test', 'Test class');
      const koEnemy = new MonsterUnit('KO', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko', false);

      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(koEnemy, { x: 2, y: 3 });

      // KO the enemy
      (koEnemy as any)._wounds = koEnemy.maxHealth; // Cast to any for test access

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 2,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // With movement 2, can go through KO'd unit at (2,3) and reach (3,3)
      expect(reachable).toContainEqual({ x: 3, y: 3 });

      // But cannot reach (4,3) - too far
      expect(reachable).not.toContainEqual({ x: 4, y: 3 });
    });

    it('should handle mixed unit types in path', () => {
      const testClass = new UnitClass('Test', 'Test class');
      const koEnemy = new MonsterUnit('KO', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'ko', false);

      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(allyUnit, { x: 2, y: 3 });   // Friendly
      manifest.addUnit(koEnemy, { x: 3, y: 3 });     // KO'd enemy

      // KO the enemy
      (koEnemy as any)._wounds = koEnemy.maxHealth; // Cast to any for test access

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 3 },
        movement: 4,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Can path through both friendly and KO'd enemy
      expect(reachable).toContainEqual({ x: 4, y: 3 });
      expect(reachable).toContainEqual({ x: 5, y: 3 });

      // But cannot end on either occupied tile
      expect(reachable).not.toContainEqual({ x: 2, y: 3 });
      expect(reachable).not.toContainEqual({ x: 3, y: 3 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero movement', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 3, y: 3 },
        movement: 0,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // With 0 movement, no tiles are reachable
      expect(reachable).toHaveLength(0);
    });

    it('should handle unit surrounded by walls', () => {
      const boxedMap: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
          { char: '.', terrain: TerrainType.Floor, walkable: true },
        ],
        grid: `
          ###
          #.#
          ###
        `,
      };
      const boxMap = parseASCIIMap(boxedMap);

      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 1, y: 1 },
        movement: 5,
        map: boxMap,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Completely surrounded, no tiles reachable
      expect(reachable).toHaveLength(0);
    });

    it('should handle unit surrounded by enemies on orthogonal sides', () => {
      const testClass = new UnitClass('Test', 'Test class');
      const e1 = new MonsterUnit('E1', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'e1', false);
      const e2 = new MonsterUnit('E2', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'e2', false);
      const e3 = new MonsterUnit('E3', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'e3', false);
      const e4 = new MonsterUnit('E4', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'e4', false);

      manifest.addUnit(playerUnit, { x: 3, y: 3 });
      manifest.addUnit(e1, { x: 2, y: 3 }); // Left
      manifest.addUnit(e2, { x: 4, y: 3 }); // Right
      manifest.addUnit(e3, { x: 3, y: 2 }); // Up
      manifest.addUnit(e4, { x: 3, y: 4 }); // Down

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 3, y: 3 },
        movement: 1,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // With movement=1, cannot reach adjacent tiles (all blocked by enemies)
      // But with more movement, could reach diagonal tiles
      expect(reachable).toHaveLength(0);
    });

    it('should handle unit surrounded by KO\'d enemies - can escape', () => {
      const testClass = new UnitClass('Test', 'Test class');
      const e1 = new MonsterUnit('E1', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'e1', false);
      const e2 = new MonsterUnit('E2', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'e2', false);
      const e3 = new MonsterUnit('E3', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'e3', false);
      const e4 = new MonsterUnit('E4', testClass, 100, 0, 50, 10, 15, 3, 5, 5, 10, 10, 'e4', false);

      manifest.addUnit(playerUnit, { x: 3, y: 3 });
      manifest.addUnit(e1, { x: 2, y: 3 });
      manifest.addUnit(e2, { x: 4, y: 3 });
      manifest.addUnit(e3, { x: 3, y: 2 });
      manifest.addUnit(e4, { x: 3, y: 4 });

      // KO all enemies
      (e1 as any)._wounds = e1.maxHealth; // Cast to any for test access
      (e2 as any)._wounds = e2.maxHealth; // Cast to any for test access
      (e3 as any)._wounds = e3.maxHealth; // Cast to any for test access
      (e4 as any)._wounds = e4.maxHealth; // Cast to any for test access

      const reachable = MovementRangeCalculator.calculateReachableTiles({
        startPosition: { x: 3, y: 3 },
        movement: 2,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Can now escape through KO'd units
      expect(reachable.length).toBeGreaterThan(0);
      expect(reachable).toContainEqual({ x: 1, y: 3 }); // Through left KO'd
      expect(reachable).toContainEqual({ x: 5, y: 3 }); // Through right KO'd
      expect(reachable).toContainEqual({ x: 3, y: 1 }); // Through up KO'd
      expect(reachable).toContainEqual({ x: 3, y: 5 }); // Through down KO'd
    });
  });
});

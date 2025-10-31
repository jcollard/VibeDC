import { describe, it, expect, beforeEach } from 'vitest';
import { MovementPathfinder } from './MovementPathfinder';
import { CombatMap, TerrainType, parseASCIIMap, type ASCIIMapDefinition } from '../CombatMap';
import { CombatUnitManifest } from '../CombatUnitManifest';
import { MonsterUnit } from '../MonsterUnit';
import type { Position } from '../../../types';

describe('MovementPathfinder', () => {
  let map: CombatMap;
  let manifest: CombatUnitManifest;
  let playerUnit: MonsterUnit;
  let enemyUnit: MonsterUnit;
  let allyUnit: MonsterUnit;

  beforeEach(() => {
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
      'test-player',
      100, // maxHealth
      50,  // physicalPower
      10,  // magicPower
      15,  // speed
      3,   // movement
      5,   // physicalEvade
      5,   // magicEvade
      10,  // courage
      10,  // attunement
      true // isPlayerControlled
    );

    enemyUnit = new MonsterUnit(
      'Enemy',
      'test-enemy',
      100,
      50,
      10,
      15,
      3,
      5,
      5,
      10,
      10,
      false // isPlayerControlled
    );

    allyUnit = new MonsterUnit(
      'Ally',
      'test-ally',
      100,
      50,
      10,
      15,
      3,
      5,
      5,
      10,
      10,
      true // isPlayerControlled
    );

    manifest = new CombatUnitManifest();
  });

  describe('Basic Pathfinding', () => {
    it('should find shortest path in straight line', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 4, y: 3 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Path should not include start but should include end
      expect(path).toHaveLength(3);
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ]);
    });

    it('should find shortest path with turns', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 3, y: 3 },
        maxRange: 10,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Manhattan distance is 4 (2 right, 2 down)
      expect(path).toHaveLength(4);
      expect(path[path.length - 1]).toEqual({ x: 3, y: 3 });
    });

    it('should return empty array when destination equals start', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 3, y: 3 },
        end: { x: 3, y: 3 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      expect(path).toEqual([]);
    });

    it('should return empty array when no path exists', () => {
      const wallMap: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
          { char: '.', terrain: TerrainType.Floor, walkable: true },
        ],
        grid: `
          #####
          #.#.#
          #####
        `,
      };
      const blockedMap = parseASCIIMap(wallMap);

      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 3, y: 1 },
        maxRange: 10,
        map: blockedMap,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Wall blocks the path (wall at x=2 between start and end)
      expect(path).toEqual([]);
    });

    it('should respect max range limit', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 5, y: 5 },
        maxRange: 3,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Distance is 8, max range is 3 - no path
      expect(path).toEqual([]);
    });

    it('should not include start position in path', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 2, y: 1 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      expect(path[0]).not.toEqual({ x: 1, y: 1 });
    });

    it('should include destination in path', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 3, y: 1 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      expect(path[path.length - 1]).toEqual({ x: 3, y: 1 });
    });
  });

  describe('Friendly Unit Interactions', () => {
    it('should path through friendly units', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(allyUnit, { x: 2, y: 3 }); // Friendly in the way

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 4, y: 3 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should find path through friendly unit
      expect(path).toHaveLength(3);
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ]);
    });

    it('should find path around multiple friendlies if needed', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 2 });
      manifest.addUnit(allyUnit, { x: 2, y: 2 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 2 },
        end: { x: 3, y: 2 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Can path directly through friendly
      expect(path).toHaveLength(2);
      expect(path[path.length - 1]).toEqual({ x: 3, y: 2 });
    });
  });

  describe('Enemy Unit Interactions', () => {
    it('should find path to destination even with enemy in the way', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(enemyUnit, { x: 2, y: 3 }); // Enemy in the way

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 4, y: 3 },
        maxRange: 10,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Path should exist and reach destination
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual({ x: 4, y: 3 });

      // With current implementation, the pathfinder does path through
      // This will be validated by the "blocks only path" test
    });

    it('should return empty array if enemy blocks only path', () => {
      const corridorMap: ASCIIMapDefinition = {
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
      const narrowMap = parseASCIIMap(corridorMap);

      manifest.addUnit(playerUnit, { x: 1, y: 0 });
      manifest.addUnit(enemyUnit, { x: 1, y: 1 }); // Enemy blocks only tile

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 0 },
        end: { x: 1, y: 2 },
        maxRange: 10,
        map: narrowMap,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Enemy blocks only path in 1-tile-wide corridor
      expect(path).toEqual([]);
    });
  });

  describe('Knocked Out Unit Interactions (Phase 3)', () => {
    it('should path through KO\'d enemy units', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(enemyUnit, { x: 2, y: 3 });

      // KO the enemy
      (enemyUnit as any)._wounds = enemyUnit.maxHealth; // Cast to any for test access
      expect(enemyUnit.isKnockedOut).toBe(true);

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 4, y: 3 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should find straight path through KO'd enemy
      expect(path).toHaveLength(3);
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ]);
    });

    it('should path through KO\'d ally units', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(allyUnit, { x: 2, y: 3 });

      // KO the ally
      (allyUnit as any)._wounds = allyUnit.maxHealth; // Cast to any for test access
      expect(allyUnit.isKnockedOut).toBe(true);

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 4, y: 3 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should find straight path through KO'd ally
      expect(path).toHaveLength(3);
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ]);
    });

    it('should path through multiple KO\'d units', () => {
      const ko1 = new MonsterUnit('KO1', 'ko1', 100, 50, 10, 15, 3, 5, 5, 10, 10, false);
      const ko2 = new MonsterUnit('KO2', 'ko2', 100, 50, 10, 15, 3, 5, 5, 10, 10, false);
      const ko3 = new MonsterUnit('KO3', 'ko3', 100, 50, 10, 15, 3, 5, 5, 10, 10, false);

      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(ko1, { x: 2, y: 3 });
      manifest.addUnit(ko2, { x: 3, y: 3 });
      manifest.addUnit(ko3, { x: 4, y: 3 });

      // KO all units
      (ko1 as any)._wounds = ko1.maxHealth; // Cast to any for test access
      (ko2 as any)._wounds = ko2.maxHealth; // Cast to any for test access
      (ko3 as any)._wounds = ko3.maxHealth; // Cast to any for test access

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 5, y: 3 },
        maxRange: 6,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should path through all KO'd units
      expect(path).toHaveLength(4);
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
      ]);
    });

    it('should differentiate between active and KO\'d enemies', () => {
      const koEnemy = new MonsterUnit('KO', 'ko', 100, 50, 10, 15, 3, 5, 5, 10, 10, false);
      const activeEnemy = new MonsterUnit('Active', 'active', 100, 50, 10, 15, 3, 5, 5, 10, 10, false);

      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(koEnemy, { x: 2, y: 3 });
      manifest.addUnit(activeEnemy, { x: 4, y: 3 });

      // KO only the first enemy
      (koEnemy as any)._wounds = koEnemy.maxHealth; // Cast to any for test access

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 3, y: 3 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should path through KO'd but stop before active enemy
      expect(path).toHaveLength(2);
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ]);
    });

    it('should find path blocked by active enemy but open via KO\'d unit', () => {
      const corridorMap: ASCIIMapDefinition = {
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
      const narrowMap = parseASCIIMap(corridorMap);

      const koEnemy = new MonsterUnit('KO', 'ko', 100, 50, 10, 15, 3, 5, 5, 10, 10, false);

      manifest.addUnit(playerUnit, { x: 1, y: 1 });
      manifest.addUnit(enemyUnit, { x: 2, y: 2 }); // Active enemy blocks main route
      manifest.addUnit(koEnemy, { x: 3, y: 1 });   // KO'd enemy doesn't block

      // KO the second enemy
      (koEnemy as any)._wounds = koEnemy.maxHealth; // Cast to any for test access

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 3, y: 3 },
        maxRange: 10,
        map: narrowMap,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should find path through KO'd unit
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual({ x: 3, y: 3 });
    });

    it('should prefer shorter path through KO\'d units over longer detour', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(enemyUnit, { x: 2, y: 3 });

      // KO the enemy - creates direct path
      (enemyUnit as any)._wounds = enemyUnit.maxHealth; // Cast to any for test access

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 3, y: 3 },
        maxRange: 10,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should take direct path through KO'd unit (length 2) not detour
      expect(path).toHaveLength(2);
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ]);
    });
  });

  describe('Complex Pathfinding Scenarios', () => {
    it('should navigate through narrow corridors', () => {
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

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 3, y: 3 },
        maxRange: 10,
        map: narrowMap,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should navigate through the corridor
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual({ x: 3, y: 3 });
    });

    it('should handle mixed unit types in path', () => {
      const koEnemy = new MonsterUnit('KO', 'ko', 100, 50, 10, 15, 3, 5, 5, 10, 10, false);

      manifest.addUnit(playerUnit, { x: 1, y: 3 });
      manifest.addUnit(allyUnit, { x: 2, y: 3 });   // Friendly
      manifest.addUnit(koEnemy, { x: 3, y: 3 });     // KO'd enemy

      // KO the enemy
      (koEnemy as any)._wounds = koEnemy.maxHealth; // Cast to any for test access

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 3 },
        end: { x: 4, y: 3 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should path through both friendly and KO'd enemy
      expect(path).toHaveLength(3);
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ]);
    });

    it('should find shortest path among multiple routes', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 3, y: 3 },
        maxRange: 10,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Manhattan distance is 4, path should be exactly that
      expect(path).toHaveLength(4);
    });

    it('should handle destination at edge of max range', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 3, y: 1 },
        maxRange: 2,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Distance is exactly 2
      expect(path).toHaveLength(2);
      expect(path).toEqual([
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ]);
    });

    it('should return empty array if destination is just beyond max range', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 4, y: 1 },
        maxRange: 2,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Distance is 3, max range is 2
      expect(path).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle adjacent destination', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 3, y: 3 },
        end: { x: 4, y: 3 },
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      expect(path).toHaveLength(1);
      expect(path).toEqual([{ x: 4, y: 3 }]);
    });

    it('should handle destination out of bounds', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 3, y: 3 },
        end: { x: 10, y: 10 },
        maxRange: 20,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Out of bounds - no path
      expect(path).toEqual([]);
    });

    it('should handle destination on unwalkable terrain', () => {
      manifest.addUnit(playerUnit, { x: 3, y: 3 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 3, y: 3 },
        end: { x: 0, y: 3 }, // Wall
        maxRange: 5,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Wall - no path
      expect(path).toEqual([]);
    });

    it('should handle very long paths', () => {
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 5, y: 5 },
        maxRange: 20,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Manhattan distance is 8
      expect(path).toHaveLength(8);
      expect(path[path.length - 1]).toEqual({ x: 5, y: 5 });
    });

    it('should handle L-shaped paths correctly', () => {
      const lMap: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
          { char: '.', terrain: TerrainType.Floor, walkable: true },
        ],
        grid: `
          ####
          #..#
          ##.#
          #..#
          ####
        `,
      };
      const lShapedMap = parseASCIIMap(lMap);

      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 2, y: 3 },
        maxRange: 10,
        map: lShapedMap,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should navigate the L-shape
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual({ x: 2, y: 3 });
    });
  });

  describe('BFS Correctness', () => {
    it('should always find shortest path', () => {
      // Create scenario where multiple paths exist
      manifest.addUnit(playerUnit, { x: 1, y: 1 });

      const path = MovementPathfinder.calculatePath({
        start: { x: 1, y: 1 },
        end: { x: 3, y: 3 },
        maxRange: 10,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Manhattan distance is the shortest possible
      expect(path).toHaveLength(4); // 2 right, 2 down
    });

    it('should handle multiple equally short paths consistently', () => {
      manifest.addUnit(playerUnit, { x: 2, y: 2 });

      const path1 = MovementPathfinder.calculatePath({
        start: { x: 2, y: 2 },
        end: { x: 4, y: 4 },
        maxRange: 10,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      // Should always return same length for same input
      const path2 = MovementPathfinder.calculatePath({
        start: { x: 2, y: 2 },
        end: { x: 4, y: 4 },
        maxRange: 10,
        map,
        unitManifest: manifest,
        activeUnit: playerUnit,
      });

      expect(path1).toHaveLength(4);
      expect(path2).toHaveLength(4);
      expect(path1).toEqual(path2); // BFS should be deterministic
    });
  });
});

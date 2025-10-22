import { describe, it, expect } from 'vitest';
import { CombatMap, TerrainType, parseASCIIMap } from './CombatMap';
import type { ASCIIMapDefinition } from './CombatMap';

describe('CombatMap', () => {
  describe('Basic Map Creation', () => {
    it('should create map with default floor cells', () => {
      const map = new CombatMap(5, 5);

      const cell = map.getCell({ x: 2, y: 2 });
      expect(cell?.terrain).toBe(TerrainType.Floor);
      expect(cell?.walkable).toBe(true);
    });

    it('should check bounds correctly', () => {
      const map = new CombatMap(5, 5);

      expect(map.isInBounds({ x: 0, y: 0 })).toBe(true);
      expect(map.isInBounds({ x: 4, y: 4 })).toBe(true);
      expect(map.isInBounds({ x: 5, y: 5 })).toBe(false);
      expect(map.isInBounds({ x: -1, y: 0 })).toBe(false);
    });

    it('should set and get cells', () => {
      const map = new CombatMap(5, 5);

      map.setCell({ x: 2, y: 3 }, { terrain: TerrainType.Wall, walkable: false });

      const cell = map.getCell({ x: 2, y: 3 });
      expect(cell?.terrain).toBe(TerrainType.Wall);
      expect(cell?.walkable).toBe(false);
    });

    it('should check walkability', () => {
      const map = new CombatMap(5, 5);

      expect(map.isWalkable({ x: 0, y: 0 })).toBe(true);

      map.setCell({ x: 1, y: 1 }, { terrain: TerrainType.Wall, walkable: false });
      expect(map.isWalkable({ x: 1, y: 1 })).toBe(false);
    });
  });

  describe('ASCII Map Parsing', () => {
    it('should parse a simple ASCII map', () => {
      const ascii: ASCIIMapDefinition = {
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

      const map = parseASCIIMap(ascii);

      expect(map.width).toBe(3);
      expect(map.height).toBe(3);

      // Check corners are walls
      expect(map.getCell({ x: 0, y: 0 })?.terrain).toBe(TerrainType.Wall);
      expect(map.getCell({ x: 0, y: 0 })?.walkable).toBe(false);

      // Check center is floor
      expect(map.getCell({ x: 1, y: 1 })?.terrain).toBe(TerrainType.Floor);
      expect(map.getCell({ x: 1, y: 1 })?.walkable).toBe(true);
    });

    it('should parse map with sprite IDs', () => {
      const ascii: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false, spriteId: 'stone-wall' },
          { char: '.', terrain: TerrainType.Floor, walkable: true, spriteId: 'grass' },
        ],
        grid: `
          ##
          ..
        `,
      };

      const map = parseASCIIMap(ascii);

      expect(map.getCell({ x: 0, y: 0 })?.spriteId).toBe('stone-wall');
      expect(map.getCell({ x: 0, y: 1 })?.spriteId).toBe('grass');
    });

    it('should parse rectangular maps', () => {
      const ascii: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
          { char: '.', terrain: TerrainType.Floor, walkable: true },
        ],
        grid: `
          #####
          #...#
          #####
        `,
      };

      const map = parseASCIIMap(ascii);

      expect(map.width).toBe(5);
      expect(map.height).toBe(3);
    });

    it('should handle multiple terrain types', () => {
      const ascii: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
          { char: '.', terrain: TerrainType.Floor, walkable: true },
          { char: '~', terrain: TerrainType.Water, walkable: false },
          { char: '^', terrain: TerrainType.Pit, walkable: false },
        ],
        grid: `
          ####
          #..#
          #~~#
          #^^#
          ####
        `,
      };

      const map = parseASCIIMap(ascii);

      expect(map.getCell({ x: 1, y: 1 })?.terrain).toBe(TerrainType.Floor);
      expect(map.getCell({ x: 1, y: 2 })?.terrain).toBe(TerrainType.Water);
      expect(map.getCell({ x: 1, y: 3 })?.terrain).toBe(TerrainType.Pit);
    });

    it('should throw error for unknown character', () => {
      const ascii: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
        ],
        grid: `
          ##
          .#
        `,
      };

      expect(() => parseASCIIMap(ascii)).toThrow(/Unknown tile character/);
    });

    it('should throw error for inconsistent row widths', () => {
      const ascii: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
        ],
        grid: `
          ###
          ##
        `,
      };

      expect(() => parseASCIIMap(ascii)).toThrow(/has width/);
    });

    it('should throw error for empty grid', () => {
      const ascii: ASCIIMapDefinition = {
        tileTypes: [
          { char: '#', terrain: TerrainType.Wall, walkable: false },
        ],
        grid: '',
      };

      expect(() => parseASCIIMap(ascii)).toThrow(/grid is empty/);
    });

    it('should handle grid with leading/trailing whitespace', () => {
      const ascii: ASCIIMapDefinition = {
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

      const map = parseASCIIMap(ascii);

      expect(map.width).toBe(3);
      expect(map.height).toBe(3);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize and deserialize map', () => {
      const original = new CombatMap(3, 3);
      original.setCell({ x: 0, y: 0 }, {
        terrain: TerrainType.Wall,
        walkable: false,
        spriteId: 'stone-wall'
      });

      const json = original.toJSON();
      const deserialized = CombatMap.fromJSON(json);

      expect(deserialized.width).toBe(original.width);
      expect(deserialized.height).toBe(original.height);
      expect(deserialized.getCell({ x: 0, y: 0 })?.terrain).toBe(TerrainType.Wall);
      expect(deserialized.getCell({ x: 0, y: 0 })?.spriteId).toBe('stone-wall');
    });
  });
});

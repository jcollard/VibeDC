import { describe, it, expect, beforeEach } from 'vitest';
import { parseAreaMapFromYAML, type AreaMapYAML } from '../AreaMapParser';
import { AreaMapTileSetRegistry } from '../AreaMapTileSetRegistry';
import type { AreaMapTileSet } from '../../models/area/AreaMapTileSet';
import { TileBehavior } from '../../models/area/TileBehavior';

describe('AreaMapParser', () => {
  beforeEach(() => {
    AreaMapTileSetRegistry.clearRegistry();
  });

  const createTestTileset = (): AreaMapTileSet => ({
    id: 'test-tileset',
    name: 'Test Tileset',
    tileTypes: [
      {
        char: '#',
        behavior: TileBehavior.Wall,
        walkable: false,
        passable: false,
        spriteId: 'biomes-8',
      },
      {
        char: '.',
        behavior: TileBehavior.Floor,
        walkable: true,
        passable: true,
        spriteId: 'biomes-92',
      },
      {
        char: 'D',
        behavior: TileBehavior.Door,
        walkable: false,
        passable: true,
        spriteId: 'biomes-21',
      },
      {
        char: ' ',
        behavior: TileBehavior.Wall,
        walkable: false,
        passable: false,
        spriteId: 'biomes-8',
      },
    ],
  });

  it('should parse simple grid correctly', () => {
    const tileset = createTestTileset();
    AreaMapTileSetRegistry.register(tileset);

    const areaData: AreaMapYAML = {
      id: 'test-area',
      name: 'Test Area',
      description: 'A test area',
      tilesetId: 'test-tileset',
      grid: `###
#.#
###`,
      playerSpawn: { x: 1, y: 1, direction: 'North' },
    };

    const map = parseAreaMapFromYAML(areaData, tileset);

    expect(map.width).toBe(3);
    expect(map.height).toBe(3);
    expect(map.getTile(1, 1)?.behavior).toBe(TileBehavior.Floor);
    expect(map.getTile(0, 0)?.behavior).toBe(TileBehavior.Wall);
  });

  it('should handle variable-width rows', () => {
    const tileset = createTestTileset();
    const areaData: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: `###
#.
###`,
      playerSpawn: { x: 1, y: 1, direction: 'North' },
    };

    const map = parseAreaMapFromYAML(areaData, tileset);
    expect(map.width).toBe(3);
    // Row 1 is shorter, should be padded with space (which maps to wall)
  });

  it('should throw error for unknown character', () => {
    const tileset = createTestTileset();
    const areaData: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: `###
#X#
###`,
      playerSpawn: { x: 1, y: 1, direction: 'North' },
    };

    expect(() => parseAreaMapFromYAML(areaData, tileset)).toThrow(/Unknown tile character 'X'/);
  });

  it('should throw error for empty grid', () => {
    const tileset = createTestTileset();
    const areaData: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '',
      playerSpawn: { x: 0, y: 0, direction: 'North' },
    };

    expect(() => parseAreaMapFromYAML(areaData, tileset)).toThrow(/empty grid/);
  });

  it('should throw error for spawn on non-walkable tile', () => {
    const tileset = createTestTileset();
    const areaData: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: `###
#.#
###`,
      playerSpawn: { x: 0, y: 0, direction: 'North' }, // Wall tile
    };

    expect(() => parseAreaMapFromYAML(areaData, tileset)).toThrow(/not on a walkable tile/);
  });
});

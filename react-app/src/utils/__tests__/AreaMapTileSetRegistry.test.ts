import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AreaMapTileSetRegistry } from '../AreaMapTileSetRegistry';
import type { AreaMapTileSet } from '../../models/area/AreaMapTileSet';
import { TileBehavior } from '../../models/area/TileBehavior';

describe('AreaMapTileSetRegistry', () => {
  beforeEach(() => {
    AreaMapTileSetRegistry.clearRegistry();
  });

  const createTestTileset = (): AreaMapTileSet => ({
    id: 'test-tileset',
    name: 'Test Tileset',
    description: 'A test tileset',
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
    ],
    tags: ['test', 'dungeon'],
  });

  describe('register', () => {
    it('should register a tileset', () => {
      const tileset = createTestTileset();
      AreaMapTileSetRegistry.register(tileset);
      expect(AreaMapTileSetRegistry.has('test-tileset')).toBe(true);
    });

    it('should warn when overwriting existing tileset', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const tileset = createTestTileset();

      AreaMapTileSetRegistry.register(tileset);
      AreaMapTileSetRegistry.register(tileset);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getById', () => {
    it('should retrieve registered tileset', () => {
      const tileset = createTestTileset();
      AreaMapTileSetRegistry.register(tileset);

      const retrieved = AreaMapTileSetRegistry.getById('test-tileset');
      expect(retrieved?.id).toBe('test-tileset');
    });

    it('should return undefined for missing tileset', () => {
      expect(AreaMapTileSetRegistry.getById('missing')).toBeUndefined();
    });
  });

  describe('getByTag', () => {
    it('should find tilesets by tag', () => {
      AreaMapTileSetRegistry.register(createTestTileset());

      const dungeonSets = AreaMapTileSetRegistry.getByTag('dungeon');
      expect(dungeonSets.length).toBe(1);
      expect(dungeonSets[0].id).toBe('test-tileset');
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(AreaMapTileSetRegistry.count).toBe(0);
      AreaMapTileSetRegistry.register(createTestTileset());
      expect(AreaMapTileSetRegistry.count).toBe(1);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { AreaMap } from '../AreaMap';
import { TileBehavior } from '../TileBehavior';
import type { AreaMapTile } from '../AreaMapTile';
import type { InteractiveObject } from '../InteractiveObject';
import { InteractiveObjectType, ObjectState } from '../InteractiveObject';

describe('AreaMap', () => {
  // Test fixtures
  const createWallTile = (): AreaMapTile => ({
    behavior: TileBehavior.Wall,
    walkable: false,
    passable: false,
    spriteId: 'biomes-8',
  });

  const createFloorTile = (): AreaMapTile => ({
    behavior: TileBehavior.Floor,
    walkable: true,
    passable: true,
    spriteId: 'biomes-92',
  });

  const createDoorTile = (): AreaMapTile => ({
    behavior: TileBehavior.Door,
    walkable: false,
    passable: true,
    spriteId: 'biomes-21',
  });

  const createTestMap = (): AreaMap => {
    const grid: AreaMapTile[][] = [
      [createWallTile(), createWallTile(), createWallTile()],
      [createWallTile(), createFloorTile(), createWallTile()],
      [createWallTile(), createDoorTile(), createWallTile()],
    ];

    return new AreaMap(
      'test-map',
      'Test Map',
      'A test map',
      3,
      3,
      grid,
      'test-tileset',
      { x: 1, y: 1, direction: 'North' }
    );
  };

  describe('getTile', () => {
    it('should return tile at valid position', () => {
      const map = createTestMap();
      const tile = map.getTile(1, 1);
      expect(tile?.behavior).toBe(TileBehavior.Floor);
    });

    it('should return undefined for out of bounds', () => {
      const map = createTestMap();
      expect(map.getTile(-1, 0)).toBeUndefined();
      expect(map.getTile(10, 10)).toBeUndefined();
    });
  });

  describe('setTile', () => {
    it('should update tile at valid position', () => {
      const map = createTestMap();
      const newTile = createWallTile();
      expect(map.setTile(1, 1, newTile)).toBe(true);
      expect(map.getTile(1, 1)?.behavior).toBe(TileBehavior.Wall);
    });

    it('should return false for out of bounds', () => {
      const map = createTestMap();
      expect(map.setTile(-1, 0, createFloorTile())).toBe(false);
    });
  });

  describe('isInBounds', () => {
    it('should return true for valid positions', () => {
      const map = createTestMap();
      expect(map.isInBounds(0, 0)).toBe(true);
      expect(map.isInBounds(2, 2)).toBe(true);
    });

    it('should return false for out of bounds', () => {
      const map = createTestMap();
      expect(map.isInBounds(-1, 0)).toBe(false);
      expect(map.isInBounds(0, -1)).toBe(false);
      expect(map.isInBounds(3, 0)).toBe(false);
      expect(map.isInBounds(0, 3)).toBe(false);
    });
  });

  describe('isWalkable', () => {
    it('should return true for floor tiles', () => {
      const map = createTestMap();
      expect(map.isWalkable(1, 1)).toBe(true);
    });

    it('should return false for wall tiles', () => {
      const map = createTestMap();
      expect(map.isWalkable(0, 0)).toBe(false);
    });

    it('should return false for door tiles', () => {
      const map = createTestMap();
      expect(map.isWalkable(1, 2)).toBe(false);
    });
  });

  describe('isPassable', () => {
    it('should return true for floor tiles', () => {
      const map = createTestMap();
      expect(map.isPassable(1, 1)).toBe(true);
    });

    it('should return true for door tiles', () => {
      const map = createTestMap();
      expect(map.isPassable(1, 2)).toBe(true);
    });

    it('should return false for wall tiles', () => {
      const map = createTestMap();
      expect(map.isPassable(0, 0)).toBe(false);
    });
  });

  describe('isDoorTile', () => {
    it('should return true for door tiles', () => {
      const map = createTestMap();
      expect(map.isDoorTile(1, 2)).toBe(true);
    });

    it('should return false for non-door tiles', () => {
      const map = createTestMap();
      expect(map.isDoorTile(0, 0)).toBe(false);
      expect(map.isDoorTile(1, 1)).toBe(false);
    });
  });

  describe('interactive objects', () => {
    it('should find object at position', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createFloorTile()],
        [createFloorTile(), createFloorTile()],
      ];

      const chest: InteractiveObject = {
        id: 'chest-1',
        type: InteractiveObjectType.Chest,
        x: 1,
        y: 1,
        state: ObjectState.Closed,
        spriteId: 'biomes-76',
        data: { gold: 50 },
      };

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        2,
        2,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' },
        [chest]
      );

      const found = map.getInteractiveObjectAt(1, 1);
      expect(found?.id).toBe('chest-1');
    });

    it('should update object state (immutably)', () => {
      const grid: AreaMapTile[][] = [[createFloorTile()]];
      const door: InteractiveObject = {
        id: 'door-1',
        type: InteractiveObjectType.ClosedDoor,
        x: 0,
        y: 0,
        state: ObjectState.Closed,
        spriteId: 'biomes-21',
      };

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        1,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' },
        [door]
      );

      // Should return NEW AreaMap instance
      const updatedMap = map.updateObjectState('door-1', ObjectState.Open);
      expect(updatedMap).not.toBeNull();
      expect(updatedMap).not.toBe(map); // Different instance
      expect(updatedMap?.interactiveObjects.get('door-1')?.state).toBe(ObjectState.Open);

      // Original map should be unchanged
      expect(map.interactiveObjects.get('door-1')?.state).toBe(ObjectState.Closed);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const map = createTestMap();
      const json = map.toJSON();
      const restored = AreaMap.fromJSON(json);

      expect(restored.id).toBe(map.id);
      expect(restored.width).toBe(map.width);
      expect(restored.height).toBe(map.height);
      expect(restored.getTile(1, 1)?.behavior).toBe(TileBehavior.Floor);
    });
  });
});

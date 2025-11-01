import { describe, it, expect } from 'vitest';
import { validateMovement, getDirectionOffset, rotateLeft, rotateRight } from '../MovementValidator';
import { AreaMap } from '../../models/area/AreaMap';
import type { AreaMapTile } from '../../models/area/AreaMapTile';
import { TileBehavior } from '../../models/area/TileBehavior';

describe('MovementValidator', () => {
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

  describe('validateMovement', () => {
    it('should allow movement to walkable floor tile', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createFloorTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        2,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.finalX).toBe(1);
        expect(result.finalY).toBe(0);
        expect(result.passThroughDoor).toBe(false);
      }
    });

    it('should block movement to wall tile', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createWallTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        2,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toContain('not passable');
      }
    });

    it('should block movement out of bounds', () => {
      const grid: AreaMapTile[][] = [[createFloorTile()]];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        1,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'North');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('Out of bounds');
      }
    });

    it('should auto-continue through door tile', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createDoorTile(), createFloorTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        3,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.finalX).toBe(2); // Skip door, land on next tile
        expect(result.finalY).toBe(0);
        expect(result.passThroughDoor).toBe(true);
        expect(result.doorX).toBe(1);
        expect(result.doorY).toBe(0);
      }
    });

    it('should block door leading to wall', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createDoorTile(), createWallTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        3,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toContain('Cannot stop after passing through door');
      }
    });

    it('should block door leading out of bounds', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createDoorTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        2,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('Door leads out of bounds');
      }
    });

    it('should block adjacent door tiles', () => {
      const grid: AreaMapTile[][] = [
        [createFloorTile(), createDoorTile(), createDoorTile(), createFloorTile()],
      ];

      const map = new AreaMap(
        'test',
        'Test',
        'Test',
        4,
        1,
        grid,
        'test',
        { x: 0, y: 0, direction: 'North' }
      );

      const result = validateMovement(map, 0, 0, 'East');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toContain('Adjacent door tiles');
      }
    });
  });

  describe('getDirectionOffset', () => {
    it('should return correct offsets', () => {
      expect(getDirectionOffset('North')).toEqual([0, -1]);
      expect(getDirectionOffset('South')).toEqual([0, 1]);
      expect(getDirectionOffset('East')).toEqual([1, 0]);
      expect(getDirectionOffset('West')).toEqual([-1, 0]);
    });
  });

  describe('rotateLeft', () => {
    it('should rotate counter-clockwise', () => {
      expect(rotateLeft('North')).toBe('West');
      expect(rotateLeft('West')).toBe('South');
      expect(rotateLeft('South')).toBe('East');
      expect(rotateLeft('East')).toBe('North');
    });
  });

  describe('rotateRight', () => {
    it('should rotate clockwise', () => {
      expect(rotateRight('North')).toBe('East');
      expect(rotateRight('East')).toBe('South');
      expect(rotateRight('South')).toBe('West');
      expect(rotateRight('West')).toBe('North');
    });
  });
});

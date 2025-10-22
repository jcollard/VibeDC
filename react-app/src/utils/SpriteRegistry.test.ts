import { describe, it, expect, beforeEach } from 'vitest';
import { SpriteRegistry } from './SpriteRegistry';
import type { SpriteDefinition } from './SpriteRegistry';

describe('SpriteRegistry', () => {
  beforeEach(() => {
    SpriteRegistry.clearRegistry();
  });

  describe('Basic Registration', () => {
    it('should register a sprite', () => {
      const sprite: SpriteDefinition = {
        id: 'wolf',
        spriteSheet: '/sprites/monsters.png',
        x: 0,
        y: 0
      };

      SpriteRegistry.register(sprite);

      expect(SpriteRegistry.has('wolf')).toBe(true);
      expect(SpriteRegistry.count).toBe(1);
    });

    it('should register multiple sprites', () => {
      const sprites: SpriteDefinition[] = [
        { id: 'wolf', spriteSheet: '/sprites/monsters.png', x: 0, y: 0 },
        { id: 'bat', spriteSheet: '/sprites/monsters.png', x: 1, y: 0 },
        { id: 'slime', spriteSheet: '/sprites/monsters.png', x: 2, y: 0 }
      ];

      SpriteRegistry.registerAll(sprites);

      expect(SpriteRegistry.count).toBe(3);
      expect(SpriteRegistry.has('wolf')).toBe(true);
      expect(SpriteRegistry.has('bat')).toBe(true);
      expect(SpriteRegistry.has('slime')).toBe(true);
    });

    it('should warn when overwriting existing sprite', () => {
      const sprite1: SpriteDefinition = {
        id: 'wolf',
        spriteSheet: '/sprites/monsters.png',
        x: 0,
        y: 0
      };

      const sprite2: SpriteDefinition = {
        id: 'wolf',
        spriteSheet: '/sprites/monsters.png',
        x: 1,
        y: 1
      };

      SpriteRegistry.register(sprite1);
      SpriteRegistry.register(sprite2);

      const retrieved = SpriteRegistry.getById('wolf');
      expect(retrieved?.x).toBe(1); // Should have the second one
      expect(SpriteRegistry.count).toBe(1);
    });
  });

  describe('Retrieval', () => {
    beforeEach(() => {
      SpriteRegistry.registerAll([
        {
          id: 'wolf',
          spriteSheet: '/sprites/monsters.png',
          x: 0,
          y: 0,
          tags: ['monster', 'beast']
        },
        {
          id: 'bat',
          spriteSheet: '/sprites/monsters.png',
          x: 1,
          y: 0,
          tags: ['monster', 'flying']
        },
        {
          id: 'warrior',
          spriteSheet: '/sprites/heroes.png',
          x: 0,
          y: 0,
          tags: ['hero', 'humanoid']
        }
      ]);
    });

    it('should get sprite by ID', () => {
      const sprite = SpriteRegistry.getById('wolf');

      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe('wolf');
      expect(sprite?.x).toBe(0);
      expect(sprite?.y).toBe(0);
    });

    it('should return undefined for non-existent sprite', () => {
      const sprite = SpriteRegistry.getById('nonexistent');

      expect(sprite).toBeUndefined();
    });

    it('should get sprite coordinates', () => {
      const coords = SpriteRegistry.getCoordinates('bat');

      expect(coords).toEqual({ x: 1, y: 0 });
    });

    it('should return undefined coordinates for non-existent sprite', () => {
      const coords = SpriteRegistry.getCoordinates('nonexistent');

      expect(coords).toBeUndefined();
    });

    it('should get all sprites from a sprite sheet', () => {
      const monstersSprites = SpriteRegistry.getBySheet('/sprites/monsters.png');

      expect(monstersSprites.length).toBe(2);
      expect(monstersSprites.map(s => s.id)).toContain('wolf');
      expect(monstersSprites.map(s => s.id)).toContain('bat');
    });

    it('should get all sprites with a tag', () => {
      const monsters = SpriteRegistry.getByTag('monster');

      expect(monsters.length).toBe(2);
      expect(monsters.map(s => s.id)).toContain('wolf');
      expect(monsters.map(s => s.id)).toContain('bat');
    });

    it('should get sprites with multiple tags', () => {
      const flying = SpriteRegistry.getByTag('flying');
      const beasts = SpriteRegistry.getByTag('beast');

      expect(flying.length).toBe(1);
      expect(flying[0].id).toBe('bat');

      expect(beasts.length).toBe(1);
      expect(beasts[0].id).toBe('wolf');
    });

    it('should get all registered IDs', () => {
      const ids = SpriteRegistry.getAllIds();

      expect(ids).toContain('wolf');
      expect(ids).toContain('bat');
      expect(ids).toContain('warrior');
      expect(ids.length).toBe(3);
    });

    it('should get all registered sprites', () => {
      const all = SpriteRegistry.getAll();

      expect(all.length).toBe(3);
    });
  });

  describe('Modification', () => {
    it('should unregister a sprite', () => {
      const sprite: SpriteDefinition = {
        id: 'wolf',
        spriteSheet: '/sprites/monsters.png',
        x: 0,
        y: 0
      };

      SpriteRegistry.register(sprite);
      expect(SpriteRegistry.has('wolf')).toBe(true);

      const removed = SpriteRegistry.unregister('wolf');
      expect(removed).toBe(true);
      expect(SpriteRegistry.has('wolf')).toBe(false);
      expect(SpriteRegistry.count).toBe(0);
    });

    it('should return false when unregistering non-existent sprite', () => {
      const removed = SpriteRegistry.unregister('nonexistent');
      expect(removed).toBe(false);
    });

    it('should clear all sprites', () => {
      SpriteRegistry.registerAll([
        { id: 'wolf', spriteSheet: '/sprites/monsters.png', x: 0, y: 0 },
        { id: 'bat', spriteSheet: '/sprites/monsters.png', x: 1, y: 0 }
      ]);

      expect(SpriteRegistry.count).toBe(2);

      SpriteRegistry.clearRegistry();

      expect(SpriteRegistry.count).toBe(0);
      expect(SpriteRegistry.has('wolf')).toBe(false);
      expect(SpriteRegistry.has('bat')).toBe(false);
    });
  });

  describe('Sprite Properties', () => {
    it('should support width and height properties', () => {
      const sprite: SpriteDefinition = {
        id: 'large-dragon',
        spriteSheet: '/sprites/bosses.png',
        x: 0,
        y: 0,
        width: 2,  // 2 cells wide
        height: 2  // 2 cells tall
      };

      SpriteRegistry.register(sprite);

      const retrieved = SpriteRegistry.getById('large-dragon');
      expect(retrieved?.width).toBe(2);
      expect(retrieved?.height).toBe(2);
    });

    it('should support tags', () => {
      const sprite: SpriteDefinition = {
        id: 'fire-dragon',
        spriteSheet: '/sprites/monsters.png',
        x: 0,
        y: 0,
        tags: ['boss', 'dragon', 'fire', 'flying']
      };

      SpriteRegistry.register(sprite);

      const retrieved = SpriteRegistry.getById('fire-dragon');
      expect(retrieved?.tags).toEqual(['boss', 'dragon', 'fire', 'flying']);
    });
  });
});

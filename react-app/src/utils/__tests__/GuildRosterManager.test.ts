import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuildRosterManager } from '../GuildRosterManager';
import { PartyMemberRegistry } from '../PartyMemberRegistry';
import { UnitClass } from '../../models/combat/UnitClass';
import { CombatAbility } from '../../models/combat/CombatAbility';
import type { PartyState } from '../../models/game/GameState';

// Mock dependencies
vi.mock('../PartyMemberRegistry');
vi.mock('../../models/combat/UnitClass');
vi.mock('../../models/combat/CombatAbility');

describe('GuildRosterManager', () => {
  let manager: GuildRosterManager;
  let mockPartyState: PartyState;
  let onStateChangeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup initial party state
    mockPartyState = {
      members: [],
      guildRoster: [],
      inventory: { items: [], gold: 0 },
      equipment: new Map(),
    };

    onStateChangeMock = vi.fn((newState) => {
      mockPartyState = newState;
    });

    manager = new GuildRosterManager(mockPartyState, onStateChangeMock);

    // Mock UnitClass.getById to return a starter class (no requirements)
    (UnitClass.getById as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
      if (id === 'fighter' || id === 'apprentice' || id === 'rogue') {
        return {
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          requirements: new Set(), // No requirements = starter class
          tags: ['player'],
          starterConfig: {
            baseHealth: 45,
            baseMana: 5,
            basePhysicalPower: 10,
            baseMagicPower: 5,
            baseSpeed: 8,
            baseMovement: 4,
            basePhysicalEvade: 10,
            baseMagicEvade: 7,
            baseCourage: 12,
            baseAttunement: 6,
          },
        };
      }
      if (id === 'knight') {
        return {
          id,
          name: 'Knight',
          requirements: new Set(['fighter-level-10']), // Has requirements
        };
      }
      return undefined;
    });

    // Mock UnitClass.getAll to return all classes
    (UnitClass.getAll as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 'fighter', name: 'Fighter', requirements: new Set(), tags: ['player'] },
      { id: 'apprentice', name: 'Apprentice', requirements: new Set(), tags: ['player'] },
      { id: 'rogue', name: 'Rogue', requirements: new Set(), tags: ['player'] },
      { id: 'knight', name: 'Knight', requirements: new Set(['fighter-level-10']), tags: [] },
    ]);

    // Mock PartyMemberRegistry.register
    (PartyMemberRegistry.register as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    // Mock PartyMemberRegistry.createPartyMember
    (PartyMemberRegistry.createPartyMember as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
      return {
        id,
        name: 'Mock Unit',
        getClass: () => ({ id: 'fighter', name: 'Fighter' }),
      } as any;
    });

    // Mock CombatAbility.getById
    (CombatAbility.getById as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
      if (id === 'slash') {
        return {
          id: 'slash',
          name: 'Slash',
          experiencePrice: 100,
          abilityType: 'Action',
        };
      }
      if (id === 'fireball') {
        return {
          id: 'fireball',
          name: 'Fireball',
          experiencePrice: 250,
          abilityType: 'Action',
        };
      }
      return undefined;
    });
  });

  describe('createCharacter', () => {
    it('should create valid character', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      expect(char).not.toBeNull();
      expect(char?.name).toBe('Hero');
      expect(char?.unitClassId).toBe('fighter');
      expect(char?.spriteId).toBe('sprite-1');
      expect(onStateChangeMock).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid name (too long)', () => {
      const char = manager.createCharacter('VeryLongNameHere', 'sprite-1', 'fighter');
      expect(char).toBeNull();
      expect(onStateChangeMock).not.toHaveBeenCalled();
    });

    it('should reject invalid name (too short)', () => {
      const char = manager.createCharacter('', 'sprite-1', 'fighter');
      expect(char).toBeNull();
      expect(onStateChangeMock).not.toHaveBeenCalled();
    });

    it('should reject invalid name (whitespace only)', () => {
      const char = manager.createCharacter('   ', 'sprite-1', 'fighter');
      expect(char).toBeNull();
      expect(onStateChangeMock).not.toHaveBeenCalled();
    });

    it('should reject invalid name (non-ASCII characters)', () => {
      const char = manager.createCharacter('Héro', 'sprite-1', 'fighter');
      expect(char).toBeNull();
      expect(onStateChangeMock).not.toHaveBeenCalled();
    });

    it('should accept valid name with allowed characters', () => {
      const char = manager.createCharacter('Alexandra', 'sprite-1', 'fighter');
      expect(char).not.toBeNull();
      expect(char?.name).toBe('Alexandra');
    });

    it('should reject duplicate name', () => {
      manager.createCharacter('Hero', 'sprite-1', 'fighter');
      const char = manager.createCharacter('Hero', 'sprite-2', 'apprentice');
      expect(char).toBeNull();
      expect(onStateChangeMock).toHaveBeenCalledTimes(1); // Only first call
    });

    it('should reject non-existent class', () => {
      (UnitClass.getById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      const char = manager.createCharacter('Hero', 'sprite-1', 'invalid-class');
      expect(char).toBeNull();
    });

    it('should reject non-starter class (has requirements)', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'knight');
      expect(char).toBeNull();
    });

    it('should set default values correctly', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      expect(char).not.toBeNull();
      expect(char?.totalExperience).toBe(0);
      expect(char?.classExperience).toEqual({});
      expect(char?.classExperienceSpent).toEqual({});
      expect(char?.tags).toContain('player-created');
    });

    it('should set class-specific stats correctly', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      expect(char).not.toBeNull();
      expect(char?.baseHealth).toBe(45);
      expect(char?.baseMana).toBe(5);
      expect(char?.basePhysicalPower).toBe(10);
    });

    it('should register character with PartyMemberRegistry', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      expect(PartyMemberRegistry.register).toHaveBeenCalledWith(char);
    });

    it('should create character with starting ability', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter', 'slash');
      expect(char).not.toBeNull();
      expect(char?.learnedAbilityIds).toContain('slash');
      expect(char?.classExperience?.['fighter']).toBe(100);
      expect(char?.classExperienceSpent?.['fighter']).toBe(100);
    });

    it('should create character without starting ability when not provided', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      expect(char).not.toBeNull();
      expect(char?.classExperience).toEqual({});
      expect(char?.classExperienceSpent).toEqual({});
    });

    it('should handle invalid starting ability gracefully', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter', 'invalid-ability');
      expect(char).not.toBeNull();
      expect(char?.classExperience).toEqual({});
      expect(char?.classExperienceSpent).toEqual({});
    });

    it('should add starting ability to existing learned abilities', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter', 'slash');
      expect(char).not.toBeNull();
      // Should include both config abilities and the starting ability
      expect(char?.learnedAbilityIds).toContain('slash');
    });
  });

  describe('addToParty', () => {
    it('should add character to party', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      const result = manager.addToParty(char!.id);
      expect(result).toBe(true);
      expect(manager.getActiveParty()).toHaveLength(1);
      expect(onStateChangeMock).toHaveBeenCalledTimes(2); // Once for create, once for add
    });

    it('should reject when party is full', () => {
      // Create and add 4 characters
      const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
      for (const name of names) {
        const char = manager.createCharacter(name, 'sprite-1', 'fighter');
        manager.addToParty(char!.id);
      }

      // Try to add 5th character
      const char5 = manager.createCharacter('Eve', 'sprite-1', 'fighter');
      const result = manager.addToParty(char5!.id);
      expect(result).toBe(false);
      expect(manager.getActiveParty()).toHaveLength(4);
    });

    it('should reject non-existent character', () => {
      const result = manager.addToParty('non-existent-id');
      expect(result).toBe(false);
    });

    it('should reject character already in party', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      manager.addToParty(char!.id);
      const result = manager.addToParty(char!.id);
      expect(result).toBe(false);
      expect(manager.getActiveParty()).toHaveLength(1);
    });

    it('should call PartyMemberRegistry.createPartyMember', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      manager.addToParty(char!.id);
      expect(PartyMemberRegistry.createPartyMember).toHaveBeenCalledWith(char!.id);
    });

    it('should reject if createPartyMember fails', () => {
      (PartyMemberRegistry.createPartyMember as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      const result = manager.addToParty(char!.id);
      expect(result).toBe(false);
    });
  });

  describe('removeFromParty', () => {
    it('should remove character from party', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      manager.addToParty(char!.id);
      const result = manager.removeFromParty(char!.id);
      expect(result).toBe(true);
      expect(manager.getActiveParty()).toHaveLength(0);
    });

    it('should reject if character not in party', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      const result = manager.removeFromParty(char!.id);
      expect(result).toBe(false);
    });

    it('should reject non-existent character', () => {
      const result = manager.removeFromParty('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getAvailableRoster', () => {
    it('should return all characters when party is empty', () => {
      manager.createCharacter('Alice', 'sprite-1', 'fighter');
      manager.createCharacter('Bob', 'sprite-2', 'apprentice');
      const available = manager.getAvailableRoster();
      expect(available).toHaveLength(2);
    });

    it('should exclude active party members', () => {
      const char1 = manager.createCharacter('Alice', 'sprite-1', 'fighter');
      const char2 = manager.createCharacter('Bob', 'sprite-2', 'apprentice');
      manager.addToParty(char1!.id);
      const available = manager.getAvailableRoster();
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(char2!.id);
    });

    it('should return empty array when all characters are in party', () => {
      const char1 = manager.createCharacter('Alice', 'sprite-1', 'fighter');
      manager.addToParty(char1!.id);
      const available = manager.getAvailableRoster();
      expect(available).toHaveLength(0);
    });
  });

  describe('validation methods', () => {
    it('isValidName should validate correctly', () => {
      expect(manager.isValidName('Hero')).toBe(true);
      expect(manager.isValidName('A')).toBe(true);
      expect(manager.isValidName('ABCDEFGHIJKL')).toBe(true); // 12 chars
      expect(manager.isValidName('ABCDEFGHIJKLa')).toBe(false); // 13 chars
      expect(manager.isValidName('')).toBe(false);
      expect(manager.isValidName('   ')).toBe(false);
      expect(manager.isValidName('Héro')).toBe(false);
      expect(manager.isValidName("O'Brien")).toBe(false); // No apostrophes
      expect(manager.isValidName('Hero5')).toBe(false); // No numbers
      expect(manager.isValidName('Hero-Five')).toBe(false); // No hyphens
    });

    it('isNameTaken should check correctly', () => {
      expect(manager.isNameTaken('Hero')).toBe(false);
      manager.createCharacter('Hero', 'sprite-1', 'fighter');
      expect(manager.isNameTaken('Hero')).toBe(true);
      expect(manager.isNameTaken('Hero2')).toBe(false);
    });

    it('canAddToParty should check party size', () => {
      expect(manager.canAddToParty()).toBe(true);
      const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
      for (const name of names) {
        const char = manager.createCharacter(name, 'sprite-1', 'fighter');
        manager.addToParty(char!.id);
      }
      expect(manager.canAddToParty()).toBe(false);
    });
  });

  describe('query methods', () => {
    it('getActiveParty should return copy of members', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      manager.addToParty(char!.id);
      const party1 = manager.getActiveParty();
      const party2 = manager.getActiveParty();
      expect(party1).not.toBe(party2); // Different array instances
      expect(party1).toEqual(party2); // Same contents
    });

    it('getAllCharacters should return copy of guild roster', () => {
      manager.createCharacter('Hero', 'sprite-1', 'fighter');
      const all1 = manager.getAllCharacters();
      const all2 = manager.getAllCharacters();
      expect(all1).not.toBe(all2); // Different array instances
      expect(all1).toEqual(all2); // Same contents
    });

    it('getCharacterById should find character', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      const found = manager.getCharacterById(char!.id);
      expect(found).toEqual(char);
    });

    it('getCharacterById should return undefined for non-existent', () => {
      const found = manager.getCharacterById('non-existent');
      expect(found).toBeUndefined();
    });

    it('getStarterClasses should return only classes with no requirements', () => {
      const starters = manager.getStarterClasses();
      expect(starters).toHaveLength(3); // fighter, apprentice, rogue
      expect(starters.every(c => c.requirements.size === 0)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should create new state object instead of mutating', () => {
      // Create a fresh manager with a separate callback to test immutability
      const testState: PartyState = {
        members: [],
        guildRoster: [],
        inventory: { items: [], gold: 0 },
        equipment: new Map(),
      };
      const originalGuildRoster = testState.guildRoster;
      const testCallback = vi.fn();
      const testManager = new GuildRosterManager(testState, testCallback);

      testManager.createCharacter('Hero', 'sprite-1', 'fighter');

      // Original guild roster array should not have been mutated
      expect(originalGuildRoster).toHaveLength(0);
      expect(testCallback).toHaveBeenCalled();
      // The callback should have been called with a NEW state object
      const newState = testCallback.mock.calls[0][0];
      expect(newState.guildRoster).toHaveLength(1);
      expect(newState.guildRoster).not.toBe(originalGuildRoster); // Different array reference
    });
  });
});

import { describe, it, expect } from 'vitest';
import { serializeCompleteGameState, deserializeCompleteGameState } from '../GameStateSerialization';
import type { PartyState } from '../GameState';
import type { PartyMemberDefinition } from '../../../utils/PartyMemberRegistry';

describe('GameStateSerialization - Guild Roster', () => {
  it('should serialize empty guild roster', () => {
    const partyState: PartyState = {
      members: [],
      guildRoster: [],
      inventory: { items: [], gold: 0 },
      equipment: new Map(),
    };

    const completeState = {
      currentView: 'menu' as const,
      partyState,
      gameState: {
        globalVariables: new Map(),
        messageLog: [],
        triggeredEventIds: new Set<string>(),
      },
      sessionStartTime: Date.now(),
      totalPlaytime: 0,
    };

    const json = serializeCompleteGameState(completeState);
    expect(json.partyState.guildRoster).toEqual([]);
  });

  it('should serialize guild roster with characters', () => {
    const character: PartyMemberDefinition = {
      id: 'char-1',
      name: 'Test Hero',
      unitClassId: 'fighter',
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
      spriteId: 'hero-1',
    };

    const partyState: PartyState = {
      members: [],
      guildRoster: [character],
      inventory: { items: [], gold: 0 },
      equipment: new Map(),
    };

    const completeState = {
      currentView: 'menu' as const,
      partyState,
      gameState: {
        globalVariables: new Map(),
        messageLog: [],
        triggeredEventIds: new Set<string>(),
      },
      sessionStartTime: Date.now(),
      totalPlaytime: 0,
    };

    const json = serializeCompleteGameState(completeState);
    expect(json.partyState.guildRoster).toHaveLength(1);
    expect(json.partyState.guildRoster[0].id).toBe('char-1');
    expect(json.partyState.guildRoster[0].name).toBe('Test Hero');
    expect(json.partyState.guildRoster[0].unitClassId).toBe('fighter');
  });

  it('should deserialize guild roster', () => {
    const completeState = {
      currentView: 'menu' as const,
      partyState: {
        members: [],
        guildRoster: [{
          id: 'char-1',
          name: 'Test Hero',
          unitClassId: 'fighter',
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
          spriteId: 'hero-1',
        }],
        inventory: { items: [], gold: 0 },
        equipment: new Map(),
      },
      gameState: {
        globalVariables: new Map(),
        messageLog: [],
        triggeredEventIds: new Set<string>(),
      },
      sessionStartTime: Date.now(),
      totalPlaytime: 0,
    };

    const json = serializeCompleteGameState(completeState);
    const deserialized = deserializeCompleteGameState(json);

    expect(deserialized).not.toBeNull();
    expect(deserialized!.partyState.guildRoster).toHaveLength(1);
    expect(deserialized!.partyState.guildRoster[0].name).toBe('Test Hero');
  });

  it('should handle round-trip serialization', () => {
    const character: PartyMemberDefinition = {
      id: 'char-1',
      name: 'Test Hero',
      unitClassId: 'fighter',
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
      spriteId: 'hero-1',
      learnedAbilityIds: ['slash', 'defend'],
      reactionAbilityId: 'counter',
      totalExperience: 100,
      classExperience: { fighter: 50 },
      tags: ['player-created'],
      description: 'A brave warrior',
    };

    const original = {
      currentView: 'menu' as const,
      partyState: {
        members: [],
        guildRoster: [character],
        inventory: { items: [], gold: 0 },
        equipment: new Map(),
      },
      gameState: {
        globalVariables: new Map(),
        messageLog: [],
        triggeredEventIds: new Set<string>(),
      },
      sessionStartTime: Date.now(),
      totalPlaytime: 0,
    };

    const json = serializeCompleteGameState(original);
    const deserialized = deserializeCompleteGameState(json);

    expect(deserialized).not.toBeNull();
    expect(deserialized!.partyState.guildRoster).toEqual(original.partyState.guildRoster);
  });

  it('should serialize multiple characters', () => {
    const characters: PartyMemberDefinition[] = [
      {
        id: 'char-1',
        name: 'Fighter',
        unitClassId: 'fighter',
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
        spriteId: 'fighter-sprite',
      },
      {
        id: 'char-2',
        name: 'Mage',
        unitClassId: 'apprentice',
        baseHealth: 25,
        baseMana: 30,
        basePhysicalPower: 5,
        baseMagicPower: 15,
        baseSpeed: 7,
        baseMovement: 3,
        basePhysicalEvade: 8,
        baseMagicEvade: 14,
        baseCourage: 8,
        baseAttunement: 16,
        spriteId: 'mage-sprite',
      },
    ];

    const original = {
      currentView: 'menu' as const,
      partyState: {
        members: [],
        guildRoster: characters,
        inventory: { items: [], gold: 0 },
        equipment: new Map(),
      },
      gameState: {
        globalVariables: new Map(),
        messageLog: [],
        triggeredEventIds: new Set<string>(),
      },
      sessionStartTime: Date.now(),
      totalPlaytime: 0,
    };

    const json = serializeCompleteGameState(original);
    const deserialized = deserializeCompleteGameState(json);

    expect(deserialized).not.toBeNull();
    expect(deserialized!.partyState.guildRoster).toHaveLength(2);
    expect(deserialized!.partyState.guildRoster[0].name).toBe('Fighter');
    expect(deserialized!.partyState.guildRoster[1].name).toBe('Mage');
  });
});

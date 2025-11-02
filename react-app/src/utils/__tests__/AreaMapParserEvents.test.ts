import { describe, it, expect } from 'vitest';
import { parseAreaMapFromYAML, type AreaMapYAML } from '../AreaMapParser';
import type { AreaMapTileSet } from '../../models/area/AreaMapTileSet';
import { TileBehavior } from '../../models/area/TileBehavior';
import { EventTrigger } from '../../models/area/EventTrigger';

describe('AreaMapParser - Event Areas', () => {
  const createTestTileset = (): AreaMapTileSet => ({
    id: 'test-tileset',
    name: 'Test',
    tileTypes: [
      {
        char: '.',
        behavior: TileBehavior.Floor,
        walkable: true,
        passable: true,
        spriteId: 'floor',
      },
    ],
  });

  it('should parse event areas from YAML', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...\n...\n...',
      playerSpawn: { x: 1, y: 1, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          events: [
            {
              id: 'event-1',
              trigger: EventTrigger.OnEnter,
              preconditions: [
                {
                  type: 'GlobalVariableIs',
                  variableName: 'test',
                  expectedValue: true,
                },
              ],
              actions: [
                {
                  type: 'ShowMessage',
                  message: 'Test message',
                },
              ],
            },
          ],
        },
      ],
    };

    const map = parseAreaMapFromYAML(yaml, tileset);

    expect(map.eventAreas).toHaveLength(1);
    expect(map.eventAreas![0].id).toBe('area-1');
    expect(map.eventAreas![0].events).toHaveLength(1);
    expect(map.eventAreas![0].events[0].id).toBe('event-1');
  });

  it('should throw error for invalid trigger type', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          events: [
            {
              id: 'event-1',
              trigger: 'invalid' as any,
              preconditions: [],
              actions: [],
            },
          ],
        },
      ],
    };

    expect(() => parseAreaMapFromYAML(yaml, tileset)).toThrow('Invalid trigger type');
  });

  it('should throw error for invalid area bounds', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 0,  // Invalid!
          height: 1,
          events: [],
        },
      ],
    };

    expect(() => parseAreaMapFromYAML(yaml, tileset)).toThrow('width and height must be positive');
  });

  it('should parse multiple event areas', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '.....\n.....\n.....\n.....\n.....',
      playerSpawn: { x: 0, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          events: [],
        },
        {
          id: 'area-2',
          x: 3,
          y: 3,
          width: 2,
          height: 2,
          events: [],
        },
      ],
    };

    const map = parseAreaMapFromYAML(yaml, tileset);

    expect(map.eventAreas).toHaveLength(2);
    expect(map.eventAreas![0].id).toBe('area-1');
    expect(map.eventAreas![1].id).toBe('area-2');
  });

  it('should parse event with all action types', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 3,
          height: 1,
          events: [
            {
              id: 'event-1',
              trigger: EventTrigger.OnEnter,
              preconditions: [],
              actions: [
                {
                  type: 'ShowMessage',
                  message: 'Hello',
                },
                {
                  type: 'SetGlobalVariable',
                  variableName: 'test',
                  value: 42,
                },
                {
                  type: 'Teleport',
                  targetMapId: 'other-map',
                  targetX: 5,
                  targetY: 5,
                  targetDirection: 'South',
                },
                {
                  type: 'Rotate',
                  newDirection: 'East',
                },
                {
                  type: 'StartEncounter',
                  encounterId: 'battle-1',
                },
              ],
            },
          ],
        },
      ],
    };

    const map = parseAreaMapFromYAML(yaml, tileset);

    expect(map.eventAreas).toHaveLength(1);
    expect(map.eventAreas![0].events[0].actions).toHaveLength(5);
  });

  it('should parse event with all precondition types', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 3,
          height: 1,
          events: [
            {
              id: 'event-1',
              trigger: EventTrigger.OnStep,
              preconditions: [
                {
                  type: 'GlobalVariableIs',
                  variableName: 'flag',
                  expectedValue: true,
                },
                {
                  type: 'GlobalVariableIsGreaterThan',
                  variableName: 'score',
                  threshold: 100,
                },
                {
                  type: 'GlobalVariableIsLessThan',
                  variableName: 'health',
                  threshold: 50,
                },
              ],
              actions: [],
            },
          ],
        },
      ],
    };

    const map = parseAreaMapFromYAML(yaml, tileset);

    expect(map.eventAreas).toHaveLength(1);
    expect(map.eventAreas![0].events[0].preconditions).toHaveLength(3);
  });

  it('should parse one-time events correctly', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 3,
          height: 1,
          events: [
            {
              id: 'event-1',
              trigger: EventTrigger.OnEnter,
              preconditions: [],
              actions: [],
              oneTime: true,
            },
          ],
        },
      ],
    };

    const map = parseAreaMapFromYAML(yaml, tileset);

    expect(map.eventAreas).toHaveLength(1);
    expect(map.eventAreas![0].events[0].oneTime).toBe(true);
    expect(map.eventAreas![0].events[0].triggered).toBeUndefined();
  });

  it('should handle maps without event areas', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
    };

    const map = parseAreaMapFromYAML(yaml, tileset);

    expect(map.eventAreas).toBeUndefined();
  });

  it('should throw error for invalid precondition type', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 3,
          height: 1,
          events: [
            {
              id: 'event-1',
              trigger: EventTrigger.OnEnter,
              preconditions: [
                {
                  type: 'InvalidPreconditionType',
                } as any,
              ],
              actions: [],
            },
          ],
        },
      ],
    };

    expect(() => parseAreaMapFromYAML(yaml, tileset)).toThrow('Error parsing precondition');
  });

  it('should throw error for invalid action type', () => {
    const tileset = createTestTileset();
    const yaml: AreaMapYAML = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tilesetId: 'test-tileset',
      grid: '...',
      playerSpawn: { x: 1, y: 0, direction: 'North' },
      eventAreas: [
        {
          id: 'area-1',
          x: 0,
          y: 0,
          width: 3,
          height: 1,
          events: [
            {
              id: 'event-1',
              trigger: EventTrigger.OnEnter,
              preconditions: [],
              actions: [
                {
                  type: 'InvalidActionType',
                } as any,
              ],
            },
          ],
        },
      ],
    };

    expect(() => parseAreaMapFromYAML(yaml, tileset)).toThrow('Error parsing action');
  });
});

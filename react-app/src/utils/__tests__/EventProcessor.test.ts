import { describe, it, expect, beforeEach } from 'vitest';
import { EventProcessor } from '../EventProcessor';
import { AreaMap } from '../../models/area/AreaMap';
import { EventTrigger } from '../../models/area/EventTrigger';
import { GlobalVariableIs } from '../../models/area/preconditions/GlobalVariableIs';
import { SetGlobalVariable } from '../../models/area/actions/SetGlobalVariable';
import { ShowMessage } from '../../models/area/actions/ShowMessage';
import type { EventArea } from '../../models/area/EventArea';
import type { GameState } from '../../models/area/EventPrecondition';
import type { AreaMapTile } from '../../models/area/AreaMapTile';
import { TileBehavior } from '../../models/area/TileBehavior';

describe('EventProcessor', () => {
  let processor: EventProcessor;
  let testMap: AreaMap;
  let testState: GameState;

  beforeEach(() => {
    processor = new EventProcessor();

    // Create simple 5x5 test map
    const grid: AreaMapTile[][] = Array(5).fill(null).map(() =>
      Array(5).fill(null).map(() => ({
        behavior: TileBehavior.Floor,
        walkable: true,
        passable: true,
        spriteId: 'test-floor',
      }))
    );

    const eventArea: EventArea = {
      id: 'test-area',
      x: 1,
      y: 1,
      width: 2,
      height: 2,
      events: [
        {
          id: 'enter-event',
          trigger: EventTrigger.OnEnter,
          preconditions: [],
          actions: [new ShowMessage('Entered area')],
        },
        {
          id: 'step-event',
          trigger: EventTrigger.OnStep,
          preconditions: [],
          actions: [new ShowMessage('Stepped in area')],
        },
        {
          id: 'exit-event',
          trigger: EventTrigger.OnExit,
          preconditions: [],
          actions: [new ShowMessage('Exited area')],
        },
      ],
    };

    testMap = new AreaMap(
      'test-map',
      'Test Map',
      'A test map',
      5,
      5,
      grid,
      'test-tileset',
      { x: 0, y: 0, direction: 'North' },
      [],
      [],
      undefined,
      [eventArea]
    );

    testState = {
      globalVariables: new Map(),
      messageLog: [],
      triggeredEventIds: new Set(),
    };
  });

  describe('OnEnter trigger', () => {
    it('should fire when player enters area', () => {
      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.messageLog).toHaveLength(1);
      expect(newState.messageLog![0].text).toBe('Entered area');
    });

    it('should not fire when player is already in area', () => {
      const newState = processor.processMovement(testState, testMap, 1, 1, 1, 2);

      const enterMessages = newState.messageLog!.filter(m => m.text === 'Entered area');
      expect(enterMessages).toHaveLength(0);
    });
  });

  describe('OnStep trigger', () => {
    it('should fire when player steps within area', () => {
      const newState = processor.processMovement(testState, testMap, 1, 1, 1, 2);

      expect(newState.messageLog!.some(m => m.text === 'Stepped in area')).toBe(true);
    });

    it('should not fire when player enters area (not already in)', () => {
      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.messageLog!.some(m => m.text === 'Stepped in area')).toBe(false);
    });
  });

  describe('OnExit trigger', () => {
    it('should fire when player exits area', () => {
      const newState = processor.processMovement(testState, testMap, 1, 1, 0, 0);

      expect(newState.messageLog!.some(m => m.text === 'Exited area')).toBe(true);
    });

    it('should not fire when player was not in area', () => {
      const newState = processor.processMovement(testState, testMap, 0, 0, 3, 3);

      expect(newState.messageLog!.some(m => m.text === 'Exited area')).toBe(false);
    });
  });

  describe('Preconditions', () => {
    it('should not fire event if preconditions fail', () => {
      // Add event with failing precondition
      const area = testMap.eventAreas![0];
      area.events.push({
        id: 'conditional-event',
        trigger: EventTrigger.OnEnter,
        preconditions: [new GlobalVariableIs('hasKey', true)],
        actions: [new ShowMessage('Has key')],
      });

      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.messageLog!.some(m => m.text === 'Has key')).toBe(false);
    });

    it('should fire event if all preconditions pass', () => {
      const stateWithKey = {
        ...testState,
        globalVariables: new Map(testState.globalVariables).set('hasKey', true),
      };

      const area = testMap.eventAreas![0];
      area.events.push({
        id: 'conditional-event',
        trigger: EventTrigger.OnEnter,
        preconditions: [new GlobalVariableIs('hasKey', true)],
        actions: [new ShowMessage('Has key')],
      });

      const newState = processor.processMovement(stateWithKey, testMap, 0, 0, 1, 1);

      expect(newState.messageLog!.some(m => m.text === 'Has key')).toBe(true);
    });
  });

  describe('One-time events', () => {
    it('should only fire once', () => {
      const area = testMap.eventAreas![0];
      area.events.push({
        id: 'one-time-event',
        trigger: EventTrigger.OnEnter,
        preconditions: [],
        actions: [new ShowMessage('One time only')],
        oneTime: true,
      });

      // First entry
      const state1 = processor.processMovement(testState, testMap, 0, 0, 1, 1);
      expect(state1.messageLog!.some(m => m.text === 'One time only')).toBe(true);
      expect(state1.triggeredEventIds!.has('one-time-event')).toBe(true);

      // Exit and re-enter
      const state2 = processor.processMovement(state1, testMap, 1, 1, 0, 0);
      const state3 = processor.processMovement(state2, testMap, 0, 0, 1, 1);

      // Should not have additional "One time only" message
      const count = state3.messageLog!.filter(m => m.text === 'One time only').length;
      expect(count).toBe(1);
    });
  });

  describe('Action execution order', () => {
    it('should execute actions in order', () => {
      const area = testMap.eventAreas![0];
      area.events.push({
        id: 'ordered-event',
        trigger: EventTrigger.OnEnter,
        preconditions: [],
        actions: [
          new SetGlobalVariable('step', 1),
          new SetGlobalVariable('step', 2),
          new SetGlobalVariable('step', 3),
        ],
      });

      const newState = processor.processMovement(testState, testMap, 0, 0, 1, 1);

      expect(newState.globalVariables.get('step')).toBe(3);
    });
  });
});

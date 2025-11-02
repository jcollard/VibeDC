import { describe, it, expect } from 'vitest';
import { ShowMessage } from '../actions/ShowMessage';
import { Teleport } from '../actions/Teleport';
import { Rotate } from '../actions/Rotate';
import { StartEncounter } from '../actions/StartEncounter';
import { SetGlobalVariable } from '../actions/SetGlobalVariable';
import { ActionFactory } from '../actions/ActionFactory';
import type { GameState } from '../EventPrecondition';

describe('EventActions', () => {
  const createTestState = (): GameState => ({
    globalVariables: new Map(),
    messageLog: [],
    currentMapId: 'test-map',
    playerPosition: { x: 0, y: 0 },
    playerDirection: 'North',
  });

  describe('ShowMessage', () => {
    it('should add message to log', () => {
      const action = new ShowMessage('Hello World');
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.messageLog).toHaveLength(1);
      expect(newState.messageLog![0].text).toBe('Hello World');
    });

    it('should not mutate original state', () => {
      const action = new ShowMessage('Test');
      const state = createTestState();
      const originalLog = state.messageLog;

      action.execute(state);

      expect(state.messageLog).toBe(originalLog);
      expect(state.messageLog).toHaveLength(0);
    });

    it('should serialize and deserialize correctly', () => {
      const action = new ShowMessage('Test Message');
      const json = action.toJSON();
      const restored = ShowMessage.fromJSON(json);

      expect(restored.message).toBe('Test Message');
    });
  });

  describe('Teleport', () => {
    it('should change map and position', () => {
      const action = new Teleport('new-map', 10, 20, 'South');
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.currentMapId).toBe('new-map');
      expect(newState.playerPosition).toEqual({ x: 10, y: 20 });
      expect(newState.playerDirection).toBe('South');
    });

    it('should not mutate original state', () => {
      const action = new Teleport('new-map', 10, 20, 'South');
      const state = createTestState();

      action.execute(state);

      expect(state.currentMapId).toBe('test-map');
      expect(state.playerPosition).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Rotate', () => {
    it('should change player direction', () => {
      const action = new Rotate('East');
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.playerDirection).toBe('East');
    });
  });

  describe('StartEncounter', () => {
    it('should activate combat with encounter ID', () => {
      const action = new StartEncounter('goblin-ambush');
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.combatState?.active).toBe(true);
      expect(newState.combatState?.encounterId).toBe('goblin-ambush');
    });
  });

  describe('SetGlobalVariable', () => {
    it('should create new variable', () => {
      const action = new SetGlobalVariable('hasKey', true);
      const state = createTestState();
      const newState = action.execute(state);

      expect(newState.globalVariables.get('hasKey')).toBe(true);
    });

    it('should update existing variable', () => {
      const state = createTestState();
      const stateWithCount = {
        ...state,
        globalVariables: new Map(state.globalVariables).set('count', 5),
      };

      const action = new SetGlobalVariable('count', 10);
      const newState = action.execute(stateWithCount);

      expect(newState.globalVariables.get('count')).toBe(10);
    });

    it('should not mutate original state', () => {
      const action = new SetGlobalVariable('test', 'value');
      const state = createTestState();
      const originalVars = state.globalVariables;

      action.execute(state);

      expect(state.globalVariables).toBe(originalVars);
      expect(state.globalVariables.has('test')).toBe(false);
    });
  });

  describe('ActionFactory', () => {
    it('should create ShowMessage from JSON', () => {
      const json = { type: 'ShowMessage', message: 'test' };
      const action = ActionFactory.fromJSON(json);
      expect(action).toBeInstanceOf(ShowMessage);
    });

    it('should throw error for unknown type', () => {
      const json = { type: 'Unknown' };
      expect(() => ActionFactory.fromJSON(json)).toThrow('Unknown action type');
    });
  });
});

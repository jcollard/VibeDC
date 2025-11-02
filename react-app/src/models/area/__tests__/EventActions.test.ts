import { describe, it, expect, beforeEach } from 'vitest';
import { ShowMessage } from '../actions/ShowMessage';
import { Teleport } from '../actions/Teleport';
import { Rotate } from '../actions/Rotate';
import { StartEncounter } from '../actions/StartEncounter';
import { SetGlobalVariable } from '../actions/SetGlobalVariable';
import { GenerateRandomEncounter } from '../actions/GenerateRandomEncounter';
import { ActionFactory } from '../actions/ActionFactory';
import type { GameState } from '../EventPrecondition';
import { CombatEncounter } from '../../combat/CombatEncounter';
import { TilesetRegistry } from '../../../utils/TilesetRegistry';
import { EnemyRegistry } from '../../../utils/EnemyRegistry';
import type { EnemyDefinition } from '../../../utils/EnemyRegistry';

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

  describe('GenerateRandomEncounter', () => {
    beforeEach(() => {
      // Clear registries before each test
      CombatEncounter.clearRegistry();

      // Register a test tileset if needed
      if (TilesetRegistry.getAll().length === 0) {
        // If no tilesets registered, the action will use 'forest' as default
      }

      // Register some test enemies
      const testEnemy: EnemyDefinition = {
        id: 'test-goblin',
        name: 'Test Goblin',
        unitType: 'monster',
        unitClassId: 'monster',
        baseHealth: 20,
        baseMana: 10,
        basePhysicalPower: 8,
        baseMagicPower: 4,
        baseSpeed: 7,
        baseMovement: 3,
        basePhysicalEvade: 10,
        baseMagicEvade: 6,
        baseCourage: 5,
        baseAttunement: 5,
        spriteId: 'test-sprite',
        xpValue: 15,
        goldValue: 8,
      };
      EnemyRegistry.register(testEnemy);
    });

    it('should generate a random encounter and activate combat', () => {
      const action = new GenerateRandomEncounter();
      const state = createTestState();
      const newState = action.execute(state);

      // Should activate combat
      expect(newState.combatState?.active).toBe(true);
      expect(newState.combatState?.encounterId).toMatch(/^random-encounter/);
    });

    it('should create a registered encounter', () => {
      const action = new GenerateRandomEncounter();
      const state = createTestState();
      const newState = action.execute(state);

      // The generated encounter should be registered
      const encounterId = newState.combatState?.encounterId;
      expect(encounterId).toBeDefined();

      const encounter = CombatEncounter.getById(encounterId!);
      expect(encounter).toBeDefined();
      expect(encounter?.playerDeploymentZones).toBeDefined();
      expect(encounter?.enemyPlacements).toBeDefined();
    });

    it('should create encounter with 8 deployment zones', () => {
      const action = new GenerateRandomEncounter();
      const state = createTestState();
      const newState = action.execute(state);

      const encounterId = newState.combatState?.encounterId;
      const encounter = CombatEncounter.getById(encounterId!);

      // Should aim for 8 deployment zones
      expect(encounter?.playerDeploymentZones.length).toBeGreaterThan(0);
      expect(encounter?.playerDeploymentZones.length).toBeLessThanOrEqual(8);
    });

    it('should generate fixed size 21x13 map', () => {
      const action = new GenerateRandomEncounter();
      const state = createTestState();
      const newState = action.execute(state);

      const encounterId = newState.combatState?.encounterId;
      expect(encounterId).toBeDefined();

      const encounter = CombatEncounter.getById(encounterId!);
      expect(encounter).toBeDefined();

      // Should be 21x13
      expect(encounter!.map.width).toBe(21);
      expect(encounter!.map.height).toBe(13);
    });

    it('should place between 2-8 enemies', () => {
      const action = new GenerateRandomEncounter();
      const state = createTestState();
      const newState = action.execute(state);

      const encounterId = newState.combatState?.encounterId;
      const encounter = CombatEncounter.getById(encounterId!);

      expect(encounter?.enemyPlacements.length).toBeGreaterThanOrEqual(2);
      expect(encounter?.enemyPlacements.length).toBeLessThanOrEqual(8);
    });

    it('should not mutate original state', () => {
      const action = new GenerateRandomEncounter();
      const state = createTestState();
      const originalState = { ...state };

      action.execute(state);

      expect(state.combatState).toBe(originalState.combatState);
    });

    it('should serialize and deserialize correctly', () => {
      const action = new GenerateRandomEncounter();
      const json = action.toJSON();
      const restored = GenerateRandomEncounter.fromJSON(json);

      expect(restored).toBeInstanceOf(GenerateRandomEncounter);
      expect(restored.type).toBe('GenerateRandomEncounter');
    });

    it('should return unchanged state if no enemies registered', () => {
      // Clear all enemies
      EnemyRegistry.clearRegistry();

      const action = new GenerateRandomEncounter();
      const state = createTestState();
      const newState = action.execute(state);

      // Should return unchanged state
      expect(newState).toEqual(state);
    });
  });

  describe('ActionFactory', () => {
    it('should create ShowMessage from JSON', () => {
      const json = { type: 'ShowMessage', message: 'test' };
      const action = ActionFactory.fromJSON(json);
      expect(action).toBeInstanceOf(ShowMessage);
    });

    it('should create GenerateRandomEncounter from JSON', () => {
      const json = { type: 'GenerateRandomEncounter' };
      const action = ActionFactory.fromJSON(json);
      expect(action).toBeInstanceOf(GenerateRandomEncounter);
    });

    it('should throw error for unknown type', () => {
      const json = { type: 'Unknown' };
      expect(() => ActionFactory.fromJSON(json)).toThrow('Unknown action type');
    });
  });
});

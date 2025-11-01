import { describe, it, expect } from 'vitest';
import { GlobalVariableIs } from '../preconditions/GlobalVariableIs';
import { GlobalVariableIsGreaterThan } from '../preconditions/GlobalVariableIsGreaterThan';
import { GlobalVariableIsLessThan } from '../preconditions/GlobalVariableIsLessThan';
import { PreconditionFactory } from '../preconditions/PreconditionFactory';
import type { GameState } from '../EventPrecondition';

describe('EventPreconditions', () => {
  const createTestState = (variables: Record<string, string | number | boolean>): GameState => ({
    globalVariables: new Map(Object.entries(variables)),
  });

  describe('GlobalVariableIs', () => {
    it('should return true when variable matches expected value', () => {
      const precondition = new GlobalVariableIs('hasKey', true);
      const state = createTestState({ hasKey: true });
      expect(precondition.evaluate(state)).toBe(true);
    });

    it('should return false when variable does not match', () => {
      const precondition = new GlobalVariableIs('hasKey', true);
      const state = createTestState({ hasKey: false });
      expect(precondition.evaluate(state)).toBe(false);
    });

    it('should return false when variable does not exist', () => {
      const precondition = new GlobalVariableIs('hasKey', true);
      const state = createTestState({});
      expect(precondition.evaluate(state)).toBe(false);
    });

    it('should serialize and deserialize correctly', () => {
      const precondition = new GlobalVariableIs('visited', true);
      const json = precondition.toJSON();
      const restored = GlobalVariableIs.fromJSON(json);

      expect(restored.variableName).toBe('visited');
      expect(restored.expectedValue).toBe(true);
    });
  });

  describe('GlobalVariableIsGreaterThan', () => {
    it('should return true when variable is greater than threshold', () => {
      const precondition = new GlobalVariableIsGreaterThan('gold', 100);
      const state = createTestState({ gold: 150 });
      expect(precondition.evaluate(state)).toBe(true);
    });

    it('should return false when variable equals threshold', () => {
      const precondition = new GlobalVariableIsGreaterThan('gold', 100);
      const state = createTestState({ gold: 100 });
      expect(precondition.evaluate(state)).toBe(false);
    });

    it('should return false when variable is not a number', () => {
      const precondition = new GlobalVariableIsGreaterThan('gold', 100);
      const state = createTestState({ gold: 'invalid' });
      expect(precondition.evaluate(state)).toBe(false);
    });
  });

  describe('GlobalVariableIsLessThan', () => {
    it('should return true when variable is less than threshold', () => {
      const precondition = new GlobalVariableIsLessThan('health', 10);
      const state = createTestState({ health: 5 });
      expect(precondition.evaluate(state)).toBe(true);
    });

    it('should return false when variable equals threshold', () => {
      const precondition = new GlobalVariableIsLessThan('health', 10);
      const state = createTestState({ health: 10 });
      expect(precondition.evaluate(state)).toBe(false);
    });
  });

  describe('PreconditionFactory', () => {
    it('should create GlobalVariableIs from JSON', () => {
      const json = { type: 'GlobalVariableIs', variableName: 'test', expectedValue: true };
      const precondition = PreconditionFactory.fromJSON(json);
      expect(precondition).toBeInstanceOf(GlobalVariableIs);
    });

    it('should throw error for unknown type', () => {
      const json = { type: 'Unknown', variableName: 'test' };
      expect(() => PreconditionFactory.fromJSON(json)).toThrow('Unknown precondition type');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  AlwaysTruePredicate,
  AlwaysFalsePredicate,
  TurnLimitPredicate,
  AndPredicate,
  OrPredicate,
  NotPredicate,
  CombatPredicateFactory,
} from './CombatPredicate';
import type { CombatState } from './CombatState';
import { CombatMap } from './CombatMap';
import { CombatUnitManifest } from './CombatUnitManifest';

// Helper to create a minimal CombatState for testing
function createMockState(turnNumber: number): CombatState {
  return {
    turnNumber,
    map: new CombatMap(1, 1), // Minimal 1x1 map
    tilesetId: 'test',
    phase: 'deployment',
    unitManifest: new CombatUnitManifest(),
  };
}

describe('CombatPredicate', () => {
  const mockState: CombatState = createMockState(5);

  describe('AlwaysTruePredicate', () => {
    it('should always evaluate to true', () => {
      const predicate = new AlwaysTruePredicate();
      expect(predicate.evaluate(mockState)).toBe(true);
      expect(predicate.evaluate(createMockState(100))).toBe(true);
    });

    it('should serialize and deserialize', () => {
      const original = new AlwaysTruePredicate();
      const json = original.toJSON();
      const deserialized = AlwaysTruePredicate.fromJSON(json);

      expect(deserialized.evaluate(mockState)).toBe(true);
      expect(json.type).toBe('AlwaysTrue');
    });
  });

  describe('AlwaysFalsePredicate', () => {
    it('should always evaluate to false', () => {
      const predicate = new AlwaysFalsePredicate();
      expect(predicate.evaluate(mockState)).toBe(false);
      expect(predicate.evaluate(createMockState(100))).toBe(false);
    });

    it('should serialize and deserialize', () => {
      const original = new AlwaysFalsePredicate();
      const json = original.toJSON();
      const deserialized = AlwaysFalsePredicate.fromJSON(json);

      expect(deserialized.evaluate(mockState)).toBe(false);
      expect(json.type).toBe('AlwaysFalse');
    });
  });

  describe('TurnLimitPredicate', () => {
    it('should evaluate based on turn number', () => {
      const predicate = new TurnLimitPredicate(10);

      expect(predicate.evaluate(createMockState(5))).toBe(false);
      expect(predicate.evaluate(createMockState(10))).toBe(true);
      expect(predicate.evaluate(createMockState(15))).toBe(true);
    });

    it('should use custom description', () => {
      const predicate = new TurnLimitPredicate(5, 'Custom turn limit');
      expect(predicate.description).toBe('Custom turn limit');
    });

    it('should serialize and deserialize', () => {
      const original = new TurnLimitPredicate(20, 'Test limit');
      const json = original.toJSON();
      const deserialized = TurnLimitPredicate.fromJSON(json);

      expect(deserialized.maxTurns).toBe(20);
      expect(deserialized.description).toBe('Test limit');
      expect(deserialized.evaluate(createMockState(20))).toBe(true);
      expect(json.type).toBe('TurnLimit');
    });
  });

  describe('AndPredicate', () => {
    it('should evaluate to true only when all predicates are true', () => {
      const predicate = new AndPredicate([
        new AlwaysTruePredicate(),
        new TurnLimitPredicate(5),
      ]);

      expect(predicate.evaluate(createMockState(3))).toBe(false); // Turn limit not met
      expect(predicate.evaluate(createMockState(5))).toBe(true); // Both true
      expect(predicate.evaluate(createMockState(10))).toBe(true); // Both true
    });

    it('should evaluate to false if any predicate is false', () => {
      const predicate = new AndPredicate([
        new AlwaysTruePredicate(),
        new AlwaysFalsePredicate(),
      ]);

      expect(predicate.evaluate(mockState)).toBe(false);
    });

    it('should evaluate to true if all predicates are true', () => {
      const predicate = new AndPredicate([
        new AlwaysTruePredicate(),
        new AlwaysTruePredicate(),
        new TurnLimitPredicate(3),
      ]);

      expect(predicate.evaluate(createMockState(5))).toBe(true);
    });

    it('should serialize and deserialize nested predicates', () => {
      const original = new AndPredicate([
        new TurnLimitPredicate(10),
        new TurnLimitPredicate(5),
      ]);

      const json = original.toJSON();
      const deserialized = CombatPredicateFactory.fromJSON(json);

      expect(deserialized.evaluate(createMockState(3))).toBe(false);
      expect(deserialized.evaluate(createMockState(10))).toBe(true);
      expect(json.type).toBe('And');
    });
  });

  describe('OrPredicate', () => {
    it('should evaluate to true if any predicate is true', () => {
      const predicate = new OrPredicate([
        new AlwaysFalsePredicate(),
        new TurnLimitPredicate(5),
      ]);

      expect(predicate.evaluate(createMockState(5))).toBe(true);
      expect(predicate.evaluate(createMockState(3))).toBe(false);
    });

    it('should evaluate to true if at least one is true', () => {
      const predicate = new OrPredicate([
        new AlwaysFalsePredicate(),
        new AlwaysFalsePredicate(),
        new AlwaysTruePredicate(),
      ]);

      expect(predicate.evaluate(mockState)).toBe(true);
    });

    it('should evaluate to false if all are false', () => {
      const predicate = new OrPredicate([
        new AlwaysFalsePredicate(),
        new AlwaysFalsePredicate(),
      ]);

      expect(predicate.evaluate(mockState)).toBe(false);
    });

    it('should serialize and deserialize', () => {
      const original = new OrPredicate([
        new TurnLimitPredicate(10),
        new AlwaysTruePredicate(),
      ]);

      const json = original.toJSON();
      const deserialized = CombatPredicateFactory.fromJSON(json);

      expect(deserialized.evaluate(createMockState(1))).toBe(true); // AlwaysTrue makes it true
      expect(json.type).toBe('Or');
    });
  });

  describe('NotPredicate', () => {
    it('should invert true to false', () => {
      const predicate = new NotPredicate(new AlwaysTruePredicate());
      expect(predicate.evaluate(mockState)).toBe(false);
    });

    it('should invert false to true', () => {
      const predicate = new NotPredicate(new AlwaysFalsePredicate());
      expect(predicate.evaluate(mockState)).toBe(true);
    });

    it('should invert turn limit correctly', () => {
      const predicate = new NotPredicate(new TurnLimitPredicate(10));

      expect(predicate.evaluate(createMockState(5))).toBe(true); // Not reached yet
      expect(predicate.evaluate(createMockState(10))).toBe(false); // Reached
      expect(predicate.evaluate(createMockState(15))).toBe(false); // Exceeded
    });

    it('should serialize and deserialize', () => {
      const original = new NotPredicate(new TurnLimitPredicate(5));

      const json = original.toJSON();
      const deserialized = CombatPredicateFactory.fromJSON(json);

      expect(deserialized.evaluate(createMockState(3))).toBe(true);
      expect(deserialized.evaluate(createMockState(5))).toBe(false);
      expect(json.type).toBe('Not');
    });
  });

  describe('Complex Nested Predicates', () => {
    it('should handle complex AND/OR combinations', () => {
      // (TurnLimit(5) OR TurnLimit(10)) AND AlwaysTrue
      const predicate = new AndPredicate([
        new OrPredicate([
          new TurnLimitPredicate(5),
          new TurnLimitPredicate(10),
        ]),
        new AlwaysTruePredicate(),
      ]);

      expect(predicate.evaluate(createMockState(3))).toBe(false);
      expect(predicate.evaluate(createMockState(5))).toBe(true);
      expect(predicate.evaluate(createMockState(15))).toBe(true);
    });

    it('should serialize and deserialize complex nested predicates', () => {
      const original = new OrPredicate([
        new AndPredicate([
          new TurnLimitPredicate(10),
          new NotPredicate(new AlwaysFalsePredicate()),
        ]),
        new AlwaysTruePredicate(),
      ]);

      const json = original.toJSON();
      const deserialized = CombatPredicateFactory.fromJSON(json);

      expect(deserialized.evaluate(createMockState(5))).toBe(true); // AlwaysTrue branch
      expect(deserialized.evaluate(createMockState(15))).toBe(true); // Both branches true
    });
  });

  describe('CombatPredicateFactory', () => {
    it('should create correct predicate from JSON type', () => {
      const types = [
        { type: 'AlwaysTrue', class: AlwaysTruePredicate },
        { type: 'AlwaysFalse', class: AlwaysFalsePredicate },
        { type: 'TurnLimit', class: TurnLimitPredicate },
      ];

      for (const { type, class: expectedClass } of types) {
        const json = { type, description: 'test', maxTurns: 5 };
        const predicate = CombatPredicateFactory.fromJSON(json);
        expect(predicate).toBeInstanceOf(expectedClass);
      }
    });

    it('should throw error for unknown predicate type', () => {
      const json = { type: 'UnknownType', description: 'test' };
      expect(() => CombatPredicateFactory.fromJSON(json)).toThrow('Unknown predicate type');
    });

    it('should handle nested predicates in factory', () => {
      const json = {
        type: 'And',
        description: 'test',
        predicates: [
          { type: 'AlwaysTrue', description: 'always true' },
          { type: 'TurnLimit', maxTurns: 10, description: 'turn 10' },
        ],
      };

      const predicate = CombatPredicateFactory.fromJSON(json);
      expect(predicate).toBeInstanceOf(AndPredicate);
      expect(predicate.evaluate(createMockState(5))).toBe(false);
      expect(predicate.evaluate(createMockState(10))).toBe(true);
    });
  });
});

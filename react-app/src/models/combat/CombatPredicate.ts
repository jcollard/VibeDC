import type { CombatState } from "./CombatState";

/**
 * CombatPredicate represents a condition that can be evaluated against the current combat state.
 * Used for victory conditions, defeat conditions, and event triggers.
 */
export interface CombatPredicate {
  /**
   * Evaluates the predicate against the current combat state.
   * @param state The current combat state
   * @returns true if the condition is met, false otherwise
   */
  evaluate(state: CombatState): boolean;

  /**
   * Human-readable description of this predicate for UI/debugging
   */
  description: string;

  /**
   * Converts the predicate to a JSON-serializable format
   */
  toJSON(): CombatPredicateJSON;
}

/**
 * JSON representation of a CombatPredicate for serialization
 */
export interface CombatPredicateJSON {
  type: string;
  description: string;
  [key: string]: unknown; // Additional type-specific properties
}

/**
 * Always evaluates to true. Useful for testing or "no condition" scenarios.
 */
export class AlwaysTruePredicate implements CombatPredicate {
  description = "Always true";

  evaluate(_state: CombatState): boolean {
    return true;
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "AlwaysTrue",
      description: this.description,
    };
  }

  static fromJSON(_json: CombatPredicateJSON): AlwaysTruePredicate {
    return new AlwaysTruePredicate();
  }
}

/**
 * Always evaluates to false. Useful for testing or disabled conditions.
 */
export class AlwaysFalsePredicate implements CombatPredicate {
  description = "Always false";

  evaluate(_state: CombatState): boolean {
    return false;
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "AlwaysFalse",
      description: this.description,
    };
  }

  static fromJSON(_json: CombatPredicateJSON): AlwaysFalsePredicate {
    return new AlwaysFalsePredicate();
  }
}

/**
 * Evaluates to true when all enemy units are defeated.
 * Implementation will be completed when combat state tracking is implemented.
 */
export class AllEnemiesDefeatedPredicate implements CombatPredicate {
  description = "All enemies defeated";

  evaluate(_state: CombatState): boolean {
    // TODO: Implement when CombatState includes unit tracking
    // return state.enemies.every(enemy => enemy.isDefeated);
    return false;
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "AllEnemiesDefeated",
      description: this.description,
    };
  }

  static fromJSON(_json: CombatPredicateJSON): AllEnemiesDefeatedPredicate {
    return new AllEnemiesDefeatedPredicate();
  }
}

/**
 * Evaluates to true when all player units are defeated.
 * Implementation will be completed when combat state tracking is implemented.
 */
export class AllPlayersDefeatedPredicate implements CombatPredicate {
  description = "All players defeated";

  evaluate(_state: CombatState): boolean {
    // TODO: Implement when CombatState includes unit tracking
    // return state.players.every(player => player.isDefeated);
    return false;
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "AllPlayersDefeated",
      description: this.description,
    };
  }

  static fromJSON(_json: CombatPredicateJSON): AllPlayersDefeatedPredicate {
    return new AllPlayersDefeatedPredicate();
  }
}

/**
 * Evaluates to true when a specific unit is defeated.
 * Implementation will be completed when combat state tracking is implemented.
 */
export class UnitDefeatedPredicate implements CombatPredicate {
  readonly unitId: string;
  readonly description: string;

  constructor(
    unitId: string,
    description: string = `Unit ${unitId} defeated`
  ) {
    this.unitId = unitId;
    this.description = description;
  }

  evaluate(_state: CombatState): boolean {
    // TODO: Implement when CombatState includes unit tracking
    // const unit = state.getUnitById(this.unitId);
    // return unit?.isDefeated ?? false;
    return false;
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "UnitDefeated",
      unitId: this.unitId,
      description: this.description,
    };
  }

  static fromJSON(json: CombatPredicateJSON): UnitDefeatedPredicate {
    return new UnitDefeatedPredicate(
      json.unitId as string,
      json.description
    );
  }
}

/**
 * Evaluates to true when the turn number reaches or exceeds a threshold.
 */
export class TurnLimitPredicate implements CombatPredicate {
  readonly maxTurns: number;
  readonly description: string;

  constructor(
    maxTurns: number,
    description: string = `Turn limit of ${maxTurns} reached`
  ) {
    this.maxTurns = maxTurns;
    this.description = description;
  }

  evaluate(state: CombatState): boolean {
    return state.turnNumber >= this.maxTurns;
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "TurnLimit",
      maxTurns: this.maxTurns,
      description: this.description,
    };
  }

  static fromJSON(json: CombatPredicateJSON): TurnLimitPredicate {
    return new TurnLimitPredicate(
      json.maxTurns as number,
      json.description
    );
  }
}

/**
 * Evaluates to true when ALL child predicates evaluate to true.
 */
export class AndPredicate implements CombatPredicate {
  readonly predicates: CombatPredicate[];
  readonly description: string;

  constructor(
    predicates: CombatPredicate[],
    description: string = "All conditions met"
  ) {
    this.predicates = predicates;
    this.description = description;
  }

  evaluate(state: CombatState): boolean {
    return this.predicates.every((predicate) => predicate.evaluate(state));
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "And",
      predicates: this.predicates.map((p) => p.toJSON()),
      description: this.description,
    };
  }

  static fromJSON(json: CombatPredicateJSON): AndPredicate {
    const predicates = (json.predicates as CombatPredicateJSON[]).map(
      (p) => CombatPredicateFactory.fromJSON(p)
    );
    return new AndPredicate(predicates, json.description);
  }
}

/**
 * Evaluates to true when ANY child predicate evaluates to true.
 */
export class OrPredicate implements CombatPredicate {
  readonly predicates: CombatPredicate[];
  readonly description: string;

  constructor(
    predicates: CombatPredicate[],
    description: string = "Any condition met"
  ) {
    this.predicates = predicates;
    this.description = description;
  }

  evaluate(state: CombatState): boolean {
    return this.predicates.some((predicate) => predicate.evaluate(state));
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "Or",
      predicates: this.predicates.map((p) => p.toJSON()),
      description: this.description,
    };
  }

  static fromJSON(json: CombatPredicateJSON): OrPredicate {
    const predicates = (json.predicates as CombatPredicateJSON[]).map(
      (p) => CombatPredicateFactory.fromJSON(p)
    );
    return new OrPredicate(predicates, json.description);
  }
}

/**
 * Evaluates to true when the child predicate evaluates to false (logical NOT).
 */
export class NotPredicate implements CombatPredicate {
  readonly predicate: CombatPredicate;
  readonly description: string;

  constructor(
    predicate: CombatPredicate,
    description: string = "Condition not met"
  ) {
    this.predicate = predicate;
    this.description = description;
  }

  evaluate(state: CombatState): boolean {
    return !this.predicate.evaluate(state);
  }

  toJSON(): CombatPredicateJSON {
    return {
      type: "Not",
      predicate: this.predicate.toJSON(),
      description: this.description,
    };
  }

  static fromJSON(json: CombatPredicateJSON): NotPredicate {
    const predicate = CombatPredicateFactory.fromJSON(
      json.predicate as CombatPredicateJSON
    );
    return new NotPredicate(predicate, json.description);
  }
}

/**
 * Factory for creating CombatPredicate instances from JSON.
 */
export class CombatPredicateFactory {
  static fromJSON(json: CombatPredicateJSON): CombatPredicate {
    switch (json.type) {
      case "AlwaysTrue":
        return AlwaysTruePredicate.fromJSON(json);
      case "AlwaysFalse":
        return AlwaysFalsePredicate.fromJSON(json);
      case "AllEnemiesDefeated":
        return AllEnemiesDefeatedPredicate.fromJSON(json);
      case "AllPlayersDefeated":
        return AllPlayersDefeatedPredicate.fromJSON(json);
      case "UnitDefeated":
        return UnitDefeatedPredicate.fromJSON(json);
      case "TurnLimit":
        return TurnLimitPredicate.fromJSON(json);
      case "And":
        return AndPredicate.fromJSON(json);
      case "Or":
        return OrPredicate.fromJSON(json);
      case "Not":
        return NotPredicate.fromJSON(json);
      default:
        throw new Error(`Unknown predicate type: ${json.type}`);
    }
  }
}

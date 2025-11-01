import type { EventPrecondition, EventPreconditionJSON, GameState } from '../EventPrecondition';

/**
 * Checks if a global variable equals a specific value.
 *
 * Guidelines Compliance:
 * - Pure function (no side effects)
 * - Returns boolean result
 */
export class GlobalVariableIs implements EventPrecondition {
  readonly type = "GlobalVariableIs";
  readonly variableName: string;
  readonly expectedValue: string | number | boolean;

  constructor(
    variableName: string,
    expectedValue: string | number | boolean
  ) {
    this.variableName = variableName;
    this.expectedValue = expectedValue;
  }

  evaluate(state: GameState): boolean {
    const actualValue = state.globalVariables.get(this.variableName);
    return actualValue === this.expectedValue;
  }

  toJSON(): EventPreconditionJSON {
    return {
      type: this.type,
      variableName: this.variableName,
      expectedValue: this.expectedValue,
    };
  }

  static fromJSON(json: EventPreconditionJSON): GlobalVariableIs {
    if (json.type !== "GlobalVariableIs") {
      throw new Error(`Invalid type for GlobalVariableIs: ${json.type}`);
    }
    return new GlobalVariableIs(
      json.variableName as string,
      json.expectedValue as string | number | boolean
    );
  }
}

import type { EventPrecondition, EventPreconditionJSON, GameState } from '../EventPrecondition';

/**
 * Checks if a global variable (number) is greater than a threshold.
 */
export class GlobalVariableIsGreaterThan implements EventPrecondition {
  readonly type = "GlobalVariableIsGreaterThan";
  readonly variableName: string;
  readonly threshold: number;

  constructor(
    variableName: string,
    threshold: number
  ) {
    this.variableName = variableName;
    this.threshold = threshold;
  }

  evaluate(state: GameState): boolean {
    const value = state.globalVariables.get(this.variableName);
    if (typeof value !== 'number') {
      return false;
    }
    return value > this.threshold;
  }

  toJSON(): EventPreconditionJSON {
    return {
      type: this.type,
      variableName: this.variableName,
      threshold: this.threshold,
    };
  }

  static fromJSON(json: EventPreconditionJSON): GlobalVariableIsGreaterThan {
    if (json.type !== "GlobalVariableIsGreaterThan") {
      throw new Error(`Invalid type for GlobalVariableIsGreaterThan: ${json.type}`);
    }
    return new GlobalVariableIsGreaterThan(
      json.variableName as string,
      json.threshold as number
    );
  }
}

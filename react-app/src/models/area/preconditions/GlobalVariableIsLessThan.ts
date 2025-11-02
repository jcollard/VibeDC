import type { EventPrecondition, EventPreconditionJSON, GameState } from '../EventPrecondition';

/**
 * Checks if a global variable (number) is less than a threshold.
 */
export class GlobalVariableIsLessThan implements EventPrecondition {
  readonly type = "GlobalVariableIsLessThan";
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
    return value < this.threshold;
  }

  toJSON(): EventPreconditionJSON {
    return {
      type: this.type,
      variableName: this.variableName,
      threshold: this.threshold,
    };
  }

  static fromJSON(json: EventPreconditionJSON): GlobalVariableIsLessThan {
    if (json.type !== "GlobalVariableIsLessThan") {
      throw new Error(`Invalid type for GlobalVariableIsLessThan: ${json.type}`);
    }
    return new GlobalVariableIsLessThan(
      json.variableName as string,
      json.threshold as number
    );
  }
}

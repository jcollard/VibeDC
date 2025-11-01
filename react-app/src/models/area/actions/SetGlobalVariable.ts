import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';

/**
 * Sets a global variable to a specific value.
 *
 * Guidelines Compliance:
 * - Creates NEW Map instance (immutable)
 * - Never mutates existing state.globalVariables
 */
export class SetGlobalVariable implements EventAction {
  readonly type = "SetGlobalVariable";
  readonly variableName: string;
  readonly value: string | number | boolean;

  constructor(
    variableName: string,
    value: string | number | boolean
  ) {
    this.variableName = variableName;
    this.value = value;
  }

  execute(state: GameState): GameState {
    // Create NEW Map with updated variable (immutability)
    const newVariables = new Map(state.globalVariables);
    newVariables.set(this.variableName, this.value);

    return {
      ...state,
      globalVariables: newVariables,
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      variableName: this.variableName,
      value: this.value,
    };
  }

  static fromJSON(json: EventActionJSON): SetGlobalVariable {
    if (json.type !== "SetGlobalVariable") {
      throw new Error(`Invalid type for SetGlobalVariable: ${json.type}`);
    }
    return new SetGlobalVariable(
      json.variableName as string,
      json.value as string | number | boolean
    );
  }
}

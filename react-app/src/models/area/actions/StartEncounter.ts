import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';

/**
 * Starts a combat encounter.
 */
export class StartEncounter implements EventAction {
  readonly type = "StartEncounter";
  readonly encounterId: string;

  constructor(encounterId: string) {
    this.encounterId = encounterId;
  }

  execute(state: GameState): GameState {
    // Transition to combat with specified encounter
    return {
      ...state,
      combatState: {
        active: true,
        encounterId: this.encounterId,
      },
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      encounterId: this.encounterId,
    };
  }

  static fromJSON(json: EventActionJSON): StartEncounter {
    if (json.type !== "StartEncounter") {
      throw new Error(`Invalid type for StartEncounter: ${json.type}`);
    }
    return new StartEncounter(json.encounterId as string);
  }
}

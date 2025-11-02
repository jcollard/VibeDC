import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';

/**
 * Shows a message in the player's log/message area.
 *
 * Guidelines Compliance:
 * - Returns NEW game state (immutable)
 * - Never mutates input state
 */
export class ShowMessage implements EventAction {
  readonly type = "ShowMessage";
  readonly message: string;

  constructor(message: string) {
    this.message = message;
  }

  execute(state: GameState): GameState {
    // Add message to player message log
    // NOTE: Actual messageLog structure may vary based on game state implementation
    return {
      ...state,
      messageLog: [...(state.messageLog || []), {
        text: this.message,
        timestamp: Date.now(),
      }],
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      message: this.message,
    };
  }

  static fromJSON(json: EventActionJSON): ShowMessage {
    if (json.type !== "ShowMessage") {
      throw new Error(`Invalid type for ShowMessage: ${json.type}`);
    }
    return new ShowMessage(json.message as string);
  }
}

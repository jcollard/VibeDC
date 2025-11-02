import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';
import type { CardinalDirection } from '../InteractiveObject';

/**
 * Rotates the player to face a specific direction.
 */
export class Rotate implements EventAction {
  readonly type = "Rotate";
  readonly newDirection: CardinalDirection;

  constructor(newDirection: CardinalDirection) {
    this.newDirection = newDirection;
  }

  execute(state: GameState): GameState {
    return {
      ...state,
      playerDirection: this.newDirection,
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      newDirection: this.newDirection,
    };
  }

  static fromJSON(json: EventActionJSON): Rotate {
    if (json.type !== "Rotate") {
      throw new Error(`Invalid type for Rotate: ${json.type}`);
    }
    return new Rotate(json.newDirection as CardinalDirection);
  }
}

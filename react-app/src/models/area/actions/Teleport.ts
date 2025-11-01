import type { EventAction, EventActionJSON } from '../EventAction';
import type { GameState } from '../EventPrecondition';
import type { CardinalDirection } from '../InteractiveObject';

/**
 * Teleports player to a different map and position.
 */
export class Teleport implements EventAction {
  readonly type = "Teleport";
  readonly targetMapId: string;
  readonly targetX: number;
  readonly targetY: number;
  readonly targetDirection: CardinalDirection;

  constructor(
    targetMapId: string,
    targetX: number,
    targetY: number,
    targetDirection: CardinalDirection
  ) {
    this.targetMapId = targetMapId;
    this.targetX = targetX;
    this.targetY = targetY;
    this.targetDirection = targetDirection;
  }

  execute(state: GameState): GameState {
    // Load target map, set player position and direction
    return {
      ...state,
      currentMapId: this.targetMapId,
      playerPosition: { x: this.targetX, y: this.targetY },
      playerDirection: this.targetDirection,
    };
  }

  toJSON(): EventActionJSON {
    return {
      type: this.type,
      targetMapId: this.targetMapId,
      targetX: this.targetX,
      targetY: this.targetY,
      targetDirection: this.targetDirection,
    };
  }

  static fromJSON(json: EventActionJSON): Teleport {
    if (json.type !== "Teleport") {
      throw new Error(`Invalid type for Teleport: ${json.type}`);
    }
    return new Teleport(
      json.targetMapId as string,
      json.targetX as number,
      json.targetY as number,
      json.targetDirection as CardinalDirection
    );
  }
}

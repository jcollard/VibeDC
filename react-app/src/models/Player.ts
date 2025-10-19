export type Direction = 'North' | 'East' | 'South' | 'West';

export class Player {
  public readonly id: string;
  public x: number;
  public y: number;
  public direction: Direction;
  public name: string;

  constructor(id: string, x: number, y: number, direction: Direction, name: string) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.name = name;
  }

  /**
   * Create a Player from plain object (for Firestore deserialization)
   */
  static fromData(data: {
    id: string;
    x: number;
    y: number;
    direction: Direction;
    name: string;
  }): Player {
    return new Player(data.id, data.x, data.y, data.direction, data.name);
  }

  /**
   * Convert to plain object (for Firestore serialization)
   */
  toData(): {
    id: string;
    x: number;
    y: number;
    direction: Direction;
    name: string;
  } {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      direction: this.direction,
      name: this.name
    };
  }

  /**
   * Get the position as an object
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Move forward in the current direction
   */
  moveForward(): { x: number; y: number } {
    const newPos = { x: this.x, y: this.y };

    switch (this.direction) {
      case 'North':
        newPos.y -= 1;
        break;
      case 'South':
        newPos.y += 1;
        break;
      case 'West':
        newPos.x -= 1;
        break;
      case 'East':
        newPos.x += 1;
        break;
    }

    return newPos;
  }

  /**
   * Move backward (opposite of current direction)
   */
  moveBackward(): { x: number; y: number } {
    const newPos = { x: this.x, y: this.y };

    switch (this.direction) {
      case 'North':
        newPos.y += 1;
        break;
      case 'South':
        newPos.y -= 1;
        break;
      case 'West':
        newPos.x += 1;
        break;
      case 'East':
        newPos.x -= 1;
        break;
    }

    return newPos;
  }

  /**
   * Strafe left (perpendicular to current direction)
   */
  strafeLeft(): { x: number; y: number } {
    const newPos = { x: this.x, y: this.y };

    switch (this.direction) {
      case 'North':
        newPos.x -= 1;
        break;
      case 'South':
        newPos.x += 1;
        break;
      case 'West':
        newPos.y += 1;
        break;
      case 'East':
        newPos.y -= 1;
        break;
    }

    return newPos;
  }

  /**
   * Strafe right (perpendicular to current direction)
   */
  strafeRight(): { x: number; y: number } {
    const newPos = { x: this.x, y: this.y };

    switch (this.direction) {
      case 'North':
        newPos.x += 1;
        break;
      case 'South':
        newPos.x -= 1;
        break;
      case 'West':
        newPos.y -= 1;
        break;
      case 'East':
        newPos.y += 1;
        break;
    }

    return newPos;
  }

  /**
   * Rotate clockwise (90 degrees)
   */
  turnRight(): Direction {
    const rotations: Record<Direction, Direction> = {
      'North': 'East',
      'East': 'South',
      'South': 'West',
      'West': 'North'
    };
    return rotations[this.direction];
  }

  /**
   * Rotate counter-clockwise (-90 degrees)
   */
  turnLeft(): Direction {
    const rotations: Record<Direction, Direction> = {
      'North': 'West',
      'West': 'South',
      'South': 'East',
      'East': 'North'
    };
    return rotations[this.direction];
  }

  /**
   * Calculate new position based on a relative movement action
   */
  static calculateRelativeMove(
    x: number,
    y: number,
    direction: Direction,
    action: 'forward' | 'backward' | 'strafeLeft' | 'strafeRight'
  ): { x: number; y: number } {
    const tempPlayer = new Player('temp', x, y, direction, 'temp');

    switch (action) {
      case 'forward':
        return tempPlayer.moveForward();
      case 'backward':
        return tempPlayer.moveBackward();
      case 'strafeLeft':
        return tempPlayer.strafeLeft();
      case 'strafeRight':
        return tempPlayer.strafeRight();
    }
  }
}

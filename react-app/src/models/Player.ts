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
   * Move in the current direction
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
   * Rotate clockwise
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
   * Rotate counter-clockwise
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
}

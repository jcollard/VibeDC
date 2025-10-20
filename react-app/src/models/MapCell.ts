/**
 * Represents a single cell in the map grid
 */
export class MapCell {
  tileType: string;
  x: number;
  y: number;

  constructor(tileType: string, x: number, y: number) {
    this.tileType = tileType;
    this.x = x;
    this.y = y;
  }

  /**
   * Creates a MapCell from a tile character
   */
  static fromChar(char: string, x: number, y: number): MapCell {
    return new MapCell(char, x, y);
  }

  /**
   * Returns the tile type as a string character
   */
  toChar(): string {
    return this.tileType;
  }

  /**
   * Creates a copy of this cell
   */
  clone(): MapCell {
    return new MapCell(this.tileType, this.x, this.y);
  }

  /**
   * Checks if this cell is walkable
   */
  isWalkable(): boolean {
    return this.tileType === '.' || this.tileType === '+';
  }

  /**
   * Checks if this cell is a wall
   */
  isWall(): boolean {
    return this.tileType === '#';
  }

  /**
   * Checks if this cell is a door
   */
  isDoor(): boolean {
    return this.tileType === '+';
  }
}

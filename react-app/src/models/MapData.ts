import { MapCell } from './MapCell';

/**
 * Represents a complete map with metadata and grid data
 */
export class MapData {
  private _width: number;
  private _height: number;
  private _name: string;
  private _grid: MapCell[][];

  constructor(width: number, height: number, name: string = 'Untitled Map') {
    this._width = width;
    this._height = height;
    this._name = name;
    this._grid = [];

    // Initialize empty grid with floor tiles
    for (let y = 0; y < height; y++) {
      const row: MapCell[] = [];
      for (let x = 0; x < width; x++) {
        row.push(new MapCell('.', x, y));
      }
      this._grid.push(row);
    }
  }

  // Getters
  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get name(): string {
    return this._name;
  }

  get grid(): MapCell[][] {
    return this._grid;
  }

  // Setters
  set name(value: string) {
    this._name = value;
  }

  /**
   * Gets a cell at the specified coordinates
   */
  getCell(x: number, y: number): MapCell | null {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) {
      return null;
    }
    return this._grid[y][x];
  }

  /**
   * Sets a cell at the specified coordinates
   */
  setCell(x: number, y: number, tileType: string): boolean {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) {
      return false;
    }
    this._grid[y][x] = new MapCell(tileType, x, y);
    return true;
  }

  /**
   * Converts the grid to a string array (legacy format)
   */
  toStringArray(): string[] {
    return this._grid.map(row => row.map(cell => cell.toChar()).join(''));
  }

  /**
   * Creates a MapData from a string array (legacy format)
   */
  static fromStringArray(gridArray: string[], name: string = 'Untitled Map'): MapData {
    const height = gridArray.length;
    const width = gridArray[0]?.length || 0;

    const mapData = new MapData(width, height, name);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width && x < gridArray[y].length; x++) {
        mapData.setCell(x, y, gridArray[y][x]);
      }
    }

    return mapData;
  }

  /**
   * Creates a deep copy of this map
   */
  clone(): MapData {
    const cloned = new MapData(this._width, this._height, this._name);
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        cloned._grid[y][x] = this._grid[y][x].clone();
      }
    }
    return cloned;
  }

  /**
   * Fills a rectangular area with a specific tile type
   */
  fillRect(x: number, y: number, width: number, height: number, tileType: string): void {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        this.setCell(x + dx, y + dy, tileType);
      }
    }
  }

  /**
   * Checks if a cell is walkable
   */
  isWalkable(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    return cell ? cell.isWalkable() : false;
  }

  /**
   * Exports map to .map file format
   */
  toMapFileString(): string {
    const lines: string[] = [];
    lines.push(`name: ${this._name}`);
    lines.push(`width: ${this._width}`);
    lines.push(`height: ${this._height}`);
    lines.push(''); // Empty line before grid
    lines.push(...this.toStringArray());
    return lines.join('\n');
  }
}

import type { Position } from "../../types";

/**
 * Represents the type of terrain on a combat map cell.
 * Different terrain types may have gameplay effects (implemented later).
 */
export const TerrainType = {
  Floor: "floor",
  Wall: "wall",
  Pit: "pit",
  Water: "water",
  Lava: "lava",
  Ice: "ice",
} as const;

export type TerrainType = typeof TerrainType[keyof typeof TerrainType];

/**
 * Represents a single cell on the combat map grid.
 */
export interface CombatCell {
  /**
   * The terrain type of this cell
   */
  terrain: TerrainType;

  /**
   * Whether units can walk on this cell.
   * Some terrain may be walkable (floor, ice) while others are not (wall, pit).
   */
  walkable: boolean;

  /**
   * Optional prop placed on this cell (for future implementation).
   * Props may affect gameplay (cover, damage, etc.)
   */
  propId?: string;
}

/**
 * Represents a combat map grid for tactical combat encounters.
 * Separate from the overworld MapData - this is specifically for turn-based tactical combat.
 */
export class CombatMap {
  private grid: CombatCell[][];
  readonly width: number;
  readonly height: number;

  constructor(
    width: number,
    height: number,
    grid?: CombatCell[][]
  ) {
    this.width = width;
    this.height = height;

    if (grid) {
      this.grid = grid;
    } else {
      // Initialize with empty floor cells
      this.grid = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => ({
          terrain: TerrainType.Floor,
          walkable: true,
        }))
      );
    }
  }

  /**
   * Gets the cell at the specified position.
   * @param position The position to query
   * @returns The cell at that position, or undefined if out of bounds
   */
  getCell(position: Position): CombatCell | undefined {
    if (!this.isInBounds(position)) {
      return undefined;
    }
    return this.grid[position.y][position.x];
  }

  /**
   * Sets the cell at the specified position.
   * @param position The position to modify
   * @param cell The new cell data
   * @returns true if successful, false if out of bounds
   */
  setCell(position: Position, cell: CombatCell): boolean {
    if (!this.isInBounds(position)) {
      return false;
    }
    this.grid[position.y][position.x] = cell;
    return true;
  }

  /**
   * Checks if a position is within the map bounds.
   */
  isInBounds(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.width &&
      position.y >= 0 &&
      position.y < this.height
    );
  }

  /**
   * Checks if a unit can walk on the cell at the specified position.
   */
  isWalkable(position: Position): boolean {
    const cell = this.getCell(position);
    return cell?.walkable ?? false;
  }

  /**
   * Gets all cells in the map as a flat array with their positions.
   */
  getAllCells(): Array<{ position: Position; cell: CombatCell }> {
    const cells: Array<{ position: Position; cell: CombatCell }> = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        cells.push({
          position: { x, y },
          cell: this.grid[y][x],
        });
      }
    }
    return cells;
  }

  /**
   * Converts the combat map to a JSON-serializable format.
   */
  toJSON(): CombatMapJSON {
    return {
      width: this.width,
      height: this.height,
      grid: this.grid,
    };
  }

  /**
   * Creates a CombatMap from a JSON representation.
   */
  static fromJSON(json: CombatMapJSON): CombatMap {
    return new CombatMap(json.width, json.height, json.grid);
  }
}

/**
 * JSON representation of a CombatMap for serialization
 */
export interface CombatMapJSON {
  width: number;
  height: number;
  grid: CombatCell[][];
}

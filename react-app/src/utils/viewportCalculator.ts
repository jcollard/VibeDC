import type { CardinalDirection } from '../types';

export interface CellPosition {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  tileType: string;
}

/**
 * Calculate visible cells in front of the player based on their position and direction
 * Returns cells in 3D space coordinates (relative to player)
 */
export function calculateVisibleCells(
  playerX: number,
  playerY: number,
  direction: CardinalDirection,
  grid: string[],
  viewDistance: number = 5
): CellPosition[] {
  const cells: CellPosition[] = [];

  // For each distance from player (0 = player's cell, 1 = one cell ahead, etc.)
  for (let distance = 0; distance <= viewDistance; distance++) {
    // For each position across (left to right from player's perspective)
    for (let across = -viewDistance; across <= viewDistance; across++) {
      // Calculate grid position based on player direction
      const gridPos = getGridPosition(playerX, playerY, direction, distance, across);

      // Check if position is valid
      if (gridPos.y < 0 || gridPos.y >= grid.length ||
          gridPos.x < 0 || gridPos.x >= grid[gridPos.y].length) {
        continue;
      }

      const tileType = grid[gridPos.y][gridPos.x];

      // Convert to 3D space coordinates (player-relative)
      cells.push({
        x: across,
        y: 0,
        gridX: gridPos.x,
        gridY: gridPos.y,
        tileType
      });
    }
  }

  return cells;
}

/**
 * Get grid position based on relative distance and across values
 */
function getGridPosition(
  playerX: number,
  playerY: number,
  direction: CardinalDirection,
  distance: number,
  across: number
): { x: number; y: number } {
  let gridX = playerX;
  let gridY = playerY;

  switch (direction) {
    case 'North':
      gridY -= distance;
      gridX += across;
      break;
    case 'South':
      gridY += distance;
      gridX -= across;
      break;
    case 'East':
      gridX += distance;
      gridY += across;
      break;
    case 'West':
      gridX -= distance;
      gridY -= across;
      break;
  }

  return { x: gridX, y: gridY };
}

/**
 * Get camera rotation based on player direction
 */
export function getCameraRotation(direction: CardinalDirection): number {
  switch (direction) {
    case 'North':
      return 0;
    case 'East':
      return Math.PI / 2;
    case 'South':
      return Math.PI;
    case 'West':
      return -Math.PI / 2;
  }
}

/**
 * Calculate frustum culling - only render cells within view
 */
export function getCellsInView(
  playerX: number,
  playerY: number,
  direction: CardinalDirection,
  grid: string[],
  viewDistance: number = 5,
  viewWidth: number = 5
): CellPosition[] {
  const cells: CellPosition[] = [];

  for (let depth = 0; depth <= viewDistance; depth++) {
    for (let lateral = -viewWidth; lateral <= viewWidth; lateral++) {
      const gridPos = getGridPosition(playerX, playerY, direction, depth, lateral);

      if (gridPos.y < 0 || gridPos.y >= grid.length ||
          gridPos.x < 0 || gridPos.x >= grid[gridPos.y].length) {
        continue;
      }

      const tileType = grid[gridPos.y][gridPos.x];

      // 3D coordinates in world space relative to player
      // Player is at origin, looking down +Z axis
      cells.push({
        x: lateral, // Left/right from player perspective
        y: 0, // Height (always 0 for now)
        gridX: gridPos.x,
        gridY: gridPos.y,
        tileType
      });
    }
  }

  return cells;
}

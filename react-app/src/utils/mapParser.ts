/**
 * Parse a .map file format into an array of strings (Firestore-compatible)
 * # = wall (impassable)
 * . = floor (passable)
 */
export function parseMap(mapText: string): { grid: string[]; width: number; height: number } {
  const lines = mapText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return {
    grid: lines,
    width: lines[0]?.length || 0,
    height: lines.length
  };
}

/**
 * Convert grid array to 2D array for rendering
 */
export function gridTo2D(grid: string[]): string[][] {
  return grid.map(row => row.split(''));
}

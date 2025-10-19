export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Position;
  name: string;
}

export interface GameState {
  grid: string[]; // Array of strings, each string is a row
  gridWidth: number;
  gridHeight: number;
  players: { [playerId: string]: Player };
}

export type Direction = 'up' | 'down' | 'left' | 'right';

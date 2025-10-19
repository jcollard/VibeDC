export type CardinalDirection = 'North' | 'East' | 'South' | 'West';
export type MovementDirection = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface PlayerData {
  id: string;
  x: number;
  y: number;
  direction: CardinalDirection;
  name: string;
}

export interface GameState {
  grid: string[]; // Array of strings, each string is a row
  gridWidth: number;
  gridHeight: number;
  players: { [playerId: string]: PlayerData };
}

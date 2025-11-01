import type { CardinalDirection } from './InteractiveObject';

/**
 * Spawn point for player or NPCs
 */
export interface SpawnPoint {
  x: number;
  y: number;
  direction: CardinalDirection;
  id?: string; // Optional identifier (e.g., "player-start", "npc-guard-1")
}

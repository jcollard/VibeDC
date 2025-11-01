import type { AreaMap } from '../area/AreaMap';
import type { CardinalDirection } from '../../types';
import type { CombatUnit } from '../combat/CombatUnit';
import type { InteractiveObject } from '../area/InteractiveObject';

/**
 * First person navigation state
 */
export interface FirstPersonState {
  /**
   * Player position on the grid (X coordinate)
   */
  playerX: number;

  /**
   * Player position on the grid (Y coordinate)
   */
  playerY: number;

  /**
   * Player facing direction
   */
  direction: CardinalDirection;

  /**
   * Current area map being explored
   */
  map: AreaMap;

  /**
   * Set of explored tile coordinates "x,y"
   * Used for minimap fog of war
   */
  exploredTiles: Set<string>;

  /**
   * Party member representing the player
   * Contains HP, MP, equipment, etc.
   */
  partyMember: CombatUnit;

  /**
   * Currently targeted interactive object (if any)
   */
  targetedObject: InteractiveObject | null;
}

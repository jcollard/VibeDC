import type { AreaMap } from '../models/area/AreaMap';
import type { CardinalDirection } from '../types';
import { InteractiveObjectType } from '../models/area/InteractiveObject';

/**
 * Movement validation result
 */
export interface MovementResult {
  success: boolean;
  reason?: string;
  finalX?: number;
  finalY?: number;
  passThroughDoor?: boolean;
  doorX?: number;
  doorY?: number;
  interactiveObject?: any; // InteractiveObject type
}

/**
 * Validates player movement on AreaMap
 */
export class MovementValidator {
  /**
   * Validate if player can move from current position in given direction
   */
  static validateMovement(
    areaMap: AreaMap,
    currentX: number,
    currentY: number,
    direction: CardinalDirection
  ): MovementResult {
    // Calculate target position
    const [dx, dy] = this.getDirectionOffset(direction);
    const targetX = currentX + dx;
    const targetY = currentY + dy;

    // Check if target is in bounds
    if (!areaMap.isInBounds(targetX, targetY)) {
      return {
        success: false,
        reason: 'Out of bounds',
      };
    }

    // Check if target is passable
    if (!areaMap.isPassable(targetX, targetY)) {
      // Check for closed door that can be opened
      const obj = areaMap.getInteractiveObjectAt(targetX, targetY);
      if (obj?.type === InteractiveObjectType.ClosedDoor) {
        return {
          success: false,
          reason: 'Door is closed',
          interactiveObject: obj,
        };
      }

      return {
        success: false,
        reason: 'Tile is not passable',
      };
    }

    // Check if target is a door tile (auto-continue)
    if (areaMap.isDoorTile(targetX, targetY)) {
      // Player moves through door and continues to next tile
      const nextX = targetX + dx;
      const nextY = targetY + dy;

      // Validate next tile after door
      if (!areaMap.isInBounds(nextX, nextY)) {
        return {
          success: false,
          reason: 'Door leads out of bounds',
        };
      }

      if (!areaMap.isWalkable(nextX, nextY)) {
        return {
          success: false,
          reason: 'Cannot stop after passing through door',
        };
      }

      // Success: Move through door to next tile
      return {
        success: true,
        finalX: nextX,
        finalY: nextY,
        passThroughDoor: true,
        doorX: targetX,
        doorY: targetY,
      };
    }

    // Normal floor tile - can stop here
    if (areaMap.isWalkable(targetX, targetY)) {
      return {
        success: true,
        finalX: targetX,
        finalY: targetY,
        passThroughDoor: false,
      };
    }

    // Fallback: not walkable
    return {
      success: false,
      reason: 'Tile is not walkable',
    };
  }

  private static getDirectionOffset(direction: CardinalDirection): [number, number] {
    switch (direction) {
      case 'North': return [0, -1];
      case 'South': return [0, 1];
      case 'East': return [1, 0];
      case 'West': return [-1, 0];
    }
  }
}

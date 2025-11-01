import type { AreaMap } from '../models/area/AreaMap';
import type { CardinalDirection, InteractiveObject } from '../models/area/InteractiveObject';
import { InteractiveObjectType } from '../models/area/InteractiveObject';

/**
 * Result of movement validation using discriminated union pattern
 *
 * ⚠️ GUIDELINE COMPLIANCE: Type-safe result pattern (GeneralGuidelines.md)
 * Use discriminated unions for results with different data based on success/failure.
 */
export type MovementResult =
  | {
      success: true;
      finalX: number;
      finalY: number;
      passThroughDoor: boolean;
      doorX?: number;
      doorY?: number;
    }
  | {
      success: false;
      reason: string;
      interactiveObject?: InteractiveObject;
    };

/**
 * Validates if player can move from current position to target position.
 * Returns movement result including any auto-continuation through door tiles.
 *
 * @param areaMap The area map
 * @param currentX Current player X position
 * @param currentY Current player Y position
 * @param direction Movement direction
 * @returns MovementResult with success status and final position
 */
export function validateMovement(
  areaMap: AreaMap,
  currentX: number,
  currentY: number,
  direction: CardinalDirection
): MovementResult {
  // Calculate target position
  const [dx, dy] = getDirectionOffset(direction);
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

    // Check for adjacent door tiles first (would create infinite loop)
    if (areaMap.isDoorTile(nextX, nextY)) {
      return {
        success: false,
        reason: 'Adjacent door tiles detected (would create movement loop)',
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

/**
 * Converts cardinal direction to grid offset
 */
export function getDirectionOffset(direction: CardinalDirection): [number, number] {
  switch (direction) {
    case 'North': return [0, -1];
    case 'South': return [0, 1];
    case 'East': return [1, 0];
    case 'West': return [-1, 0];
  }
}

/**
 * Rotates direction left (counter-clockwise)
 */
export function rotateLeft(direction: CardinalDirection): CardinalDirection {
  switch (direction) {
    case 'North': return 'West';
    case 'West': return 'South';
    case 'South': return 'East';
    case 'East': return 'North';
  }
}

/**
 * Rotates direction right (clockwise)
 */
export function rotateRight(direction: CardinalDirection): CardinalDirection {
  switch (direction) {
    case 'North': return 'East';
    case 'East': return 'South';
    case 'South': return 'West';
    case 'West': return 'North';
  }
}

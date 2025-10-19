import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();

type CardinalDirection = 'North' | 'East' | 'South' | 'West';

interface Position {
  x: number;
  y: number;
}

interface Player {
  id: string;
  x: number;
  y: number;
  direction: CardinalDirection;
  name: string;
}

interface GameState {
  grid: string[]; // Array of strings, each string is a row
  gridWidth: number;
  gridHeight: number;
  players: { [playerId: string]: Player };
}

type PlayerAction =
  | 'moveForward'
  | 'moveBackward'
  | 'strafeLeft'
  | 'strafeRight'
  | 'turnLeft'
  | 'turnRight';

interface PlayerActionRequest {
  gameId: string;
  action: PlayerAction;
}

interface CreateGameRequest {
  gameId: string;
  grid: string[];
  gridWidth: number;
  gridHeight: number;
}

interface JoinGameRequest {
  gameId: string;
}

// Helper function to find walkable position
function findWalkablePosition(grid: string[]): Position | null {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === '.') {
        return { x, y };
      }
    }
  }
  return null;
}

// Helper function to get tile at position
function getTileAt(grid: string[], x: number, y: number): string | null {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) {
    return null;
  }
  return grid[y][x];
}

// Helper function to rotate direction
function rotateDirection(direction: CardinalDirection, rotation: 'left' | 'right'): CardinalDirection {
  if (rotation === 'right') {
    const rotations: Record<CardinalDirection, CardinalDirection> = {
      'North': 'East',
      'East': 'South',
      'South': 'West',
      'West': 'North'
    };
    return rotations[direction];
  } else {
    const rotations: Record<CardinalDirection, CardinalDirection> = {
      'North': 'West',
      'West': 'South',
      'South': 'East',
      'East': 'North'
    };
    return rotations[direction];
  }
}

// Helper function to calculate relative movement
function calculateRelativeMove(
  x: number,
  y: number,
  direction: CardinalDirection,
  action: 'forward' | 'backward' | 'strafeLeft' | 'strafeRight'
): Position {
  const newPos: Position = { x, y };

  switch (action) {
    case 'forward':
      switch (direction) {
        case 'North': newPos.y -= 1; break;
        case 'South': newPos.y += 1; break;
        case 'West': newPos.x -= 1; break;
        case 'East': newPos.x += 1; break;
      }
      break;

    case 'backward':
      switch (direction) {
        case 'North': newPos.y += 1; break;
        case 'South': newPos.y -= 1; break;
        case 'West': newPos.x += 1; break;
        case 'East': newPos.x -= 1; break;
      }
      break;

    case 'strafeLeft':
      switch (direction) {
        case 'North': newPos.x -= 1; break;
        case 'South': newPos.x += 1; break;
        case 'West': newPos.y += 1; break;
        case 'East': newPos.y -= 1; break;
      }
      break;

    case 'strafeRight':
      switch (direction) {
        case 'North': newPos.x += 1; break;
        case 'South': newPos.x -= 1; break;
        case 'West': newPos.y -= 1; break;
        case 'East': newPos.y += 1; break;
      }
      break;
  }

  return newPos;
}

// Create a new game
export const createGame = onCall(async (request) => {
  const { gameId, grid, gridWidth, gridHeight } = request.data as CreateGameRequest;
  const playerId = request.auth?.uid;

  if (!playerId) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  if (!gameId || !grid || !gridWidth || !gridHeight) {
    throw new HttpsError('invalid-argument', 'Missing gameId, grid, or dimensions');
  }

  const db = admin.firestore();
  const gameRef = db.collection('games').doc(gameId);

  try {
    // Check if game already exists
    const gameDoc = await gameRef.get();
    if (gameDoc.exists) {
      return { success: true, alreadyExists: true };
    }

    // Find starting position
    const startPos = findWalkablePosition(grid);
    if (!startPos) {
      throw new HttpsError('invalid-argument', 'No walkable position in map');
    }

    // Create new game
    await gameRef.set({
      grid,
      gridWidth,
      gridHeight,
      players: {
        [playerId]: {
          id: playerId,
          x: startPos.x,
          y: startPos.y,
          direction: 'South' as CardinalDirection,
          name: `Player ${playerId.slice(0, 4)}`
        }
      }
    });

    return { success: true, alreadyExists: false };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in createGame:', error);
    throw new HttpsError('internal', 'Failed to create game');
  }
});

// Join an existing game
export const joinGame = onCall(async (request) => {
  const { gameId } = request.data as JoinGameRequest;
  const playerId = request.auth?.uid;

  if (!playerId) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  if (!gameId) {
    throw new HttpsError('invalid-argument', 'Missing gameId');
  }

  const db = admin.firestore();
  const gameRef = db.collection('games').doc(gameId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const gameDoc = await transaction.get(gameRef);

      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }

      const gameData = gameDoc.data() as GameState;

      // Check if player already in game
      if (gameData.players[playerId]) {
        const player = gameData.players[playerId];
        return { success: true, alreadyJoined: true, position: { x: player.x, y: player.y } };
      }

      // Find available starting position
      const startPos = findWalkablePosition(gameData.grid);
      if (!startPos) {
        throw new HttpsError('failed-precondition', 'No available spawn position');
      }

      // Add player to game
      transaction.update(gameRef, {
        [`players.${playerId}`]: {
          id: playerId,
          x: startPos.x,
          y: startPos.y,
          direction: 'South' as CardinalDirection,
          name: `Player ${playerId.slice(0, 4)}`
        }
      });

      return { success: true, alreadyJoined: false, position: startPos };
    });

    return result;
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in joinGame:', error);
    throw new HttpsError('internal', 'Failed to join game');
  }
});

// Perform a player action (movement or rotation)
export const performAction = onCall(async (request) => {
  const { gameId, action } = request.data as PlayerActionRequest;
  const playerId = request.auth?.uid;

  if (!playerId) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  if (!gameId || !action) {
    throw new HttpsError('invalid-argument', 'Missing gameId or action');
  }

  const db = admin.firestore();
  const gameRef = db.collection('games').doc(gameId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const gameDoc = await transaction.get(gameRef);

      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }

      const gameData = gameDoc.data() as GameState;
      const player = gameData.players[playerId];

      if (!player) {
        throw new HttpsError('not-found', 'Player not in game');
      }

      let newPos: Position = { x: player.x, y: player.y };
      let newDirection: CardinalDirection = player.direction;

      // Handle rotation actions (no position change)
      if (action === 'turnLeft' || action === 'turnRight') {
        newDirection = rotateDirection(player.direction, action === 'turnLeft' ? 'left' : 'right');

        // Only update direction
        transaction.update(gameRef, {
          [`players.${playerId}.direction`]: newDirection
        });

        return { success: true, direction: newDirection, position: newPos };
      }

      // Handle movement actions
      const movementAction = action.replace('move', '').toLowerCase() as 'forward' | 'backward';
      const strafeAction = action.includes('strafe') ?
        (action === 'strafeLeft' ? 'strafeLeft' : 'strafeRight') as 'strafeLeft' | 'strafeRight' :
        null;

      if (strafeAction) {
        newPos = calculateRelativeMove(player.x, player.y, player.direction, strafeAction);
      } else if (movementAction === 'forward' || movementAction === 'backward') {
        newPos = calculateRelativeMove(player.x, player.y, player.direction, movementAction);
      }

      // Validate: Check bounds
      if (newPos.y < 0 || newPos.y >= gameData.gridHeight ||
          newPos.x < 0 || newPos.x >= gameData.gridWidth) {
        throw new HttpsError('failed-precondition', 'Out of bounds');
      }

      // Validate: Check if tile is walkable
      const tile = getTileAt(gameData.grid, newPos.x, newPos.y);
      if (tile !== '.') {
        throw new HttpsError('failed-precondition', 'Cannot walk through walls');
      }

      // Validate: Check if another player is there
      const occupiedByOtherPlayer = Object.entries(gameData.players).some(
        ([id, p]) => id !== playerId && p.x === newPos.x && p.y === newPos.y
      );

      if (occupiedByOtherPlayer) {
        throw new HttpsError('failed-precondition', 'Tile occupied by another player');
      }

      // Update position (direction stays the same for strafing)
      transaction.update(gameRef, {
        [`players.${playerId}.x`]: newPos.x,
        [`players.${playerId}.y`]: newPos.y
      });

      return { success: true, position: newPos, direction: newDirection };
    });

    return result;
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in performAction:', error);
    throw new HttpsError('internal', 'Failed to perform action');
  }
});

// Legacy makeMove function (kept for backwards compatibility)
export const makeMove = onCall(async (request) => {
  const { gameId, direction } = request.data as { gameId: string; direction: 'up' | 'down' | 'left' | 'right' };
  const playerId = request.auth?.uid;

  if (!playerId) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  if (!gameId || !direction) {
    throw new HttpsError('invalid-argument', 'Missing gameId or direction');
  }

  // Get game state
  const db = admin.firestore();
  const gameRef = db.collection('games').doc(gameId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const gameDoc = await transaction.get(gameRef);

      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }

      const gameData = gameDoc.data() as GameState;
      const player = gameData.players[playerId];

      if (!player) {
        throw new HttpsError('not-found', 'Player not in game');
      }

      // Calculate new position and direction
      const newPos: Position = { x: player.x, y: player.y };
      let newDirection: CardinalDirection = player.direction;

      switch (direction) {
        case 'up':
          newPos.y -= 1;
          newDirection = 'North';
          break;
        case 'down':
          newPos.y += 1;
          newDirection = 'South';
          break;
        case 'left':
          newPos.x -= 1;
          newDirection = 'West';
          break;
        case 'right':
          newPos.x += 1;
          newDirection = 'East';
          break;
      }

      // Validate: Check bounds
      if (newPos.y < 0 || newPos.y >= gameData.gridHeight ||
          newPos.x < 0 || newPos.x >= gameData.gridWidth) {
        throw new HttpsError('failed-precondition', 'Out of bounds');
      }

      // Validate: Check if tile is walkable
      const tile = getTileAt(gameData.grid, newPos.x, newPos.y);
      if (tile !== '.') {
        throw new HttpsError('failed-precondition', 'Cannot walk through walls');
      }

      // Validate: Check if another player is there
      const occupiedByOtherPlayer = Object.entries(gameData.players).some(
        ([id, p]) => id !== playerId && p.x === newPos.x && p.y === newPos.y
      );

      if (occupiedByOtherPlayer) {
        throw new HttpsError('failed-precondition', 'Tile occupied by another player');
      }

      // All validations passed - update position and direction
      transaction.update(gameRef, {
        [`players.${playerId}.x`]: newPos.x,
        [`players.${playerId}.y`]: newPos.y,
        [`players.${playerId}.direction`]: newDirection
      });

      return { success: true, position: newPos };
    });

    return result;
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in makeMove:', error);
    throw new HttpsError('internal', 'Failed to process move');
  }
});

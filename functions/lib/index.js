"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeMove = exports.joinGame = exports.createGame = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
// Helper function to find walkable position
function findWalkablePosition(grid) {
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
function getTileAt(grid, x, y) {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) {
        return null;
    }
    return grid[y][x];
}
// Create a new game
exports.createGame = (0, https_1.onCall)(async (request) => {
    var _a;
    const { gameId, grid, gridWidth, gridHeight } = request.data;
    const playerId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!playerId) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    if (!gameId || !grid || !gridWidth || !gridHeight) {
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId, grid, or dimensions');
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
            throw new https_1.HttpsError('invalid-argument', 'No walkable position in map');
        }
        // Create new game
        await gameRef.set({
            grid,
            gridWidth,
            gridHeight,
            players: {
                [playerId]: {
                    id: playerId,
                    position: startPos,
                    name: `Player ${playerId.slice(0, 4)}`
                }
            }
        });
        return { success: true, alreadyExists: false };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Error in createGame:', error);
        throw new https_1.HttpsError('internal', 'Failed to create game');
    }
});
// Join an existing game
exports.joinGame = (0, https_1.onCall)(async (request) => {
    var _a;
    const { gameId } = request.data;
    const playerId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!playerId) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    if (!gameId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId');
    }
    const db = admin.firestore();
    const gameRef = db.collection('games').doc(gameId);
    try {
        const result = await db.runTransaction(async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Game not found');
            }
            const gameData = gameDoc.data();
            // Check if player already in game
            if (gameData.players[playerId]) {
                return { success: true, alreadyJoined: true, position: gameData.players[playerId].position };
            }
            // Find available starting position
            const startPos = findWalkablePosition(gameData.grid);
            if (!startPos) {
                throw new https_1.HttpsError('failed-precondition', 'No available spawn position');
            }
            // Add player to game
            transaction.update(gameRef, {
                [`players.${playerId}`]: {
                    id: playerId,
                    position: startPos,
                    name: `Player ${playerId.slice(0, 4)}`
                }
            });
            return { success: true, alreadyJoined: false, position: startPos };
        });
        return result;
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Error in joinGame:', error);
        throw new https_1.HttpsError('internal', 'Failed to join game');
    }
});
exports.makeMove = (0, https_1.onCall)(async (request) => {
    var _a;
    const { gameId, direction } = request.data;
    const playerId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!playerId) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    if (!gameId || !direction) {
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId or direction');
    }
    // Get game state
    const db = admin.firestore();
    const gameRef = db.collection('games').doc(gameId);
    try {
        const result = await db.runTransaction(async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Game not found');
            }
            const gameData = gameDoc.data();
            const player = gameData.players[playerId];
            if (!player) {
                throw new https_1.HttpsError('not-found', 'Player not in game');
            }
            // Calculate new position
            const currentPos = player.position;
            const newPos = Object.assign({}, currentPos);
            switch (direction) {
                case 'up':
                    newPos.y -= 1;
                    break;
                case 'down':
                    newPos.y += 1;
                    break;
                case 'left':
                    newPos.x -= 1;
                    break;
                case 'right':
                    newPos.x += 1;
                    break;
            }
            // Validate: Check bounds
            if (newPos.y < 0 || newPos.y >= gameData.gridHeight ||
                newPos.x < 0 || newPos.x >= gameData.gridWidth) {
                throw new https_1.HttpsError('failed-precondition', 'Out of bounds');
            }
            // Validate: Check if tile is walkable
            const tile = getTileAt(gameData.grid, newPos.x, newPos.y);
            if (tile !== '.') {
                throw new https_1.HttpsError('failed-precondition', 'Cannot walk through walls');
            }
            // Validate: Check if another player is there
            const occupiedByOtherPlayer = Object.entries(gameData.players).some(([id, p]) => id !== playerId && p.position.x === newPos.x && p.position.y === newPos.y);
            if (occupiedByOtherPlayer) {
                throw new https_1.HttpsError('failed-precondition', 'Tile occupied by another player');
            }
            // All validations passed - update position
            transaction.update(gameRef, {
                [`players.${playerId}.position`]: newPos
            });
            return { success: true, position: newPos };
        });
        return result;
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Error in makeMove:', error);
        throw new https_1.HttpsError('internal', 'Failed to process move');
    }
});
//# sourceMappingURL=index.js.map
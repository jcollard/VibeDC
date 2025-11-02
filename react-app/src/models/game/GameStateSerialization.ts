import type { CompleteGameState, ExplorationState, PartyState, PartyManagementState } from './GameState';
import type { GameState as EventGameState } from '../area/EventPrecondition';
import { serializeCombatState, deserializeCombatState } from '../combat/CombatState';
import type { CombatStateJSON } from '../combat/CombatState';

/**
 * JSON representation of CompleteGameState for serialization
 */
export interface CompleteGameStateJSON {
  currentView: string;
  explorationState?: ExplorationStateJSON;
  combatState?: CombatStateJSON;
  partyManagementState?: PartyManagementStateJSON;
  partyState: PartyStateJSON;
  gameState: EventGameStateJSON;
  saveSlotInfo?: SaveSlotInfoJSON;
  sessionStartTime: number;
  totalPlaytime: number;
}

export interface ExplorationStateJSON {
  currentMapId: string;
  playerPosition: { x: number; y: number };
  playerDirection: string;
  exploredTiles: string[]; // Set converted to array
  targetedObject: {
    type: string;
    position: { x: number; y: number };
  } | null;
}

export interface PartyManagementStateJSON {
  returnToView: 'exploration' | 'combat';
}

export interface PartyStateJSON {
  members: unknown[]; // CombatUnit.toJSON() returns unknown
  inventory: {
    items: Array<{ itemId: string; quantity: number }>;
    gold: number;
  };
  equipment: Array<[string, {
    weapon?: string;
    armor?: string;
    accessory1?: string;
    accessory2?: string;
  }]>; // Map converted to array of entries
}

export interface EventGameStateJSON {
  globalVariables: Array<[string, string | number | boolean]>; // Map to array
  messageLog?: Array<{ text: string; timestamp: number }>;
  triggeredEventIds?: string[]; // Set to array
  currentMapId?: string;
  playerPosition?: { x: number; y: number };
  playerDirection?: string;
}

export interface SaveSlotInfoJSON {
  slotIndex: number;
  savedAt: string; // Date to ISO string
  playtime: number;
}

/**
 * Serialize CompleteGameState to JSON-compatible object
 */
export function serializeCompleteGameState(state: CompleteGameState): CompleteGameStateJSON {
  return {
    currentView: state.currentView,
    explorationState: state.explorationState ? serializeExplorationState(state.explorationState) : undefined,
    combatState: state.combatState ? serializeCombatState(state.combatState) : undefined,
    partyManagementState: state.partyManagementState ? serializePartyManagementState(state.partyManagementState) : undefined,
    partyState: serializePartyState(state.partyState),
    gameState: serializeEventGameState(state.gameState),
    saveSlotInfo: state.saveSlotInfo ? serializeSaveSlotInfo(state.saveSlotInfo) : undefined,
    sessionStartTime: state.sessionStartTime,
    totalPlaytime: state.totalPlaytime,
  };
}

/**
 * Deserialize JSON to CompleteGameState
 */
export function deserializeCompleteGameState(json: CompleteGameStateJSON): CompleteGameState | null {
  try {
    // Deserialize optional combat state
    let combatState = undefined;
    if (json.combatState) {
      combatState = deserializeCombatState(json.combatState);
      if (!combatState) {
        console.error('[GameStateSerialization] Failed to deserialize combat state');
        return null;
      }
    }

    // Deserialize party state
    const partyState = deserializePartyState(json.partyState);
    if (!partyState) {
      console.error('[GameStateSerialization] Failed to deserialize party state');
      return null;
    }

    // Deserialize event game state
    const gameState = deserializeEventGameState(json.gameState);
    if (!gameState) {
      console.error('[GameStateSerialization] Failed to deserialize event game state');
      return null;
    }

    return {
      currentView: json.currentView as any, // Trust the serialized value
      explorationState: json.explorationState ? deserializeExplorationState(json.explorationState) : undefined,
      combatState,
      partyManagementState: json.partyManagementState ? deserializePartyManagementState(json.partyManagementState) : undefined,
      partyState,
      gameState,
      saveSlotInfo: json.saveSlotInfo ? deserializeSaveSlotInfo(json.saveSlotInfo) : undefined,
      sessionStartTime: json.sessionStartTime,
      totalPlaytime: json.totalPlaytime,
    };
  } catch (error) {
    console.error('[GameStateSerialization] Deserialization failed:', error);
    return null;
  }
}

// ===== ExplorationState Serialization =====

function serializeExplorationState(state: ExplorationState): ExplorationStateJSON {
  return {
    currentMapId: state.currentMapId,
    playerPosition: state.playerPosition,
    playerDirection: state.playerDirection,
    exploredTiles: Array.from(state.exploredTiles),
    targetedObject: state.targetedObject,
  };
}

function deserializeExplorationState(json: ExplorationStateJSON): ExplorationState {
  return {
    currentMapId: json.currentMapId,
    playerPosition: json.playerPosition,
    playerDirection: json.playerDirection as any,
    exploredTiles: new Set(json.exploredTiles),
    targetedObject: json.targetedObject as any,
  };
}

// ===== PartyManagementState Serialization =====

function serializePartyManagementState(state: PartyManagementState): PartyManagementStateJSON {
  return {
    returnToView: state.returnToView,
  };
}

function deserializePartyManagementState(json: PartyManagementStateJSON): PartyManagementState {
  return {
    returnToView: json.returnToView,
  };
}

// ===== PartyState Serialization =====

function serializePartyState(state: PartyState): PartyStateJSON {
  return {
    members: state.members.map(unit => unit.toJSON()),
    inventory: {
      items: state.inventory.items,
      gold: state.inventory.gold,
    },
    equipment: Array.from(state.equipment.entries()),
  };
}

function deserializePartyState(json: PartyStateJSON): PartyState | null {
  try {
    // TODO: Phase 4 - Implement proper CombatUnit deserialization
    // For now, just store the JSON data - this will need to be fixed
    // when we implement full party state persistence
    console.warn('[GameStateSerialization] Party member deserialization not fully implemented');

    return {
      members: json.members as any[], // TODO: Properly deserialize CombatUnit instances
      inventory: {
        items: json.inventory.items,
        gold: json.inventory.gold,
      },
      equipment: new Map(json.equipment),
    };
  } catch (error) {
    console.error('[GameStateSerialization] PartyState deserialization error:', error);
    return null;
  }
}

// ===== EventGameState Serialization =====

function serializeEventGameState(state: EventGameState): EventGameStateJSON {
  return {
    globalVariables: Array.from(state.globalVariables.entries()),
    messageLog: state.messageLog,
    triggeredEventIds: state.triggeredEventIds ? Array.from(state.triggeredEventIds) : undefined,
    currentMapId: state.currentMapId,
    playerPosition: state.playerPosition,
    playerDirection: state.playerDirection,
  };
}

function deserializeEventGameState(json: EventGameStateJSON): EventGameState | null {
  try {
    return {
      globalVariables: new Map(json.globalVariables),
      messageLog: json.messageLog,
      triggeredEventIds: json.triggeredEventIds ? new Set(json.triggeredEventIds) : undefined,
      currentMapId: json.currentMapId,
      playerPosition: json.playerPosition,
      playerDirection: json.playerDirection as any,
    };
  } catch (error) {
    console.error('[GameStateSerialization] EventGameState deserialization error:', error);
    return null;
  }
}

// ===== SaveSlotInfo Serialization =====

function serializeSaveSlotInfo(info: CompleteGameState['saveSlotInfo']): SaveSlotInfoJSON | undefined {
  if (!info) return undefined;

  return {
    slotIndex: info.slotIndex,
    savedAt: info.savedAt.toISOString(),
    playtime: info.playtime,
  };
}

function deserializeSaveSlotInfo(json: SaveSlotInfoJSON): CompleteGameState['saveSlotInfo'] {
  return {
    slotIndex: json.slotIndex,
    savedAt: new Date(json.savedAt),
    playtime: json.playtime,
  };
}

import type { CombatState } from '../combat/CombatState';
import type { CombatUnit } from '../combat/CombatUnit';
import type { GameState as EventGameState } from '../area/EventPrecondition';
import type { CardinalDirection } from '../../types';
import type { PartyMemberDefinition } from '../../utils/PartyMemberRegistry';

/**
 * Complete game state - represents the entire game session
 * Serializable for save/load functionality
 */
export interface CompleteGameState {
  currentView: GameViewType;
  explorationState?: ExplorationState;
  combatState?: CombatState; // Reuses existing type
  partyManagementState?: PartyManagementState;
  partyState: PartyState;
  gameState: EventGameState; // Reuses existing type
  saveSlotInfo?: SaveSlotInfo;
  sessionStartTime: number;
  totalPlaytime: number;
}


export type GameViewType = 'exploration' | 'combat' | 'party-management' | 'menu' | 'loading' | 'guild-hall' | 'title-screen';

export interface PartyManagementState {
  returnToView: 'exploration' | 'combat';
}

export interface ExplorationState {
  currentMapId: string;
  playerPosition: { x: number; y: number };
  playerDirection: CardinalDirection;
  exploredTiles: Set<string>;
  targetedObject: {
    type: 'door' | 'chest' | 'npc' | 'sign';
    position: { x: number; y: number };
  } | null;
}

export interface PartyState {
  members: CombatUnit[]; // Active party members (max 4)
  guildRoster: PartyMemberDefinition[]; // All created characters
  inventory: {
    items: InventoryItem[];
    gold: number;
  };
  equipment: Map<string, EquippedItems>;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface EquippedItems {
  weapon?: string;
  armor?: string;
  accessory1?: string;
  accessory2?: string;
}

export interface SaveSlotInfo {
  slotIndex: number;
  savedAt: Date;
  playtime: number; // seconds
}

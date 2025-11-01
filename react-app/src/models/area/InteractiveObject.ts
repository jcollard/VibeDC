/**
 * Interactive object types
 */
export const InteractiveObjectType = {
  ClosedDoor: "closed-door",
  Chest: "chest",
  NPC: "npc",
  Item: "item",
  Stairs: "stairs",
  Switch: "switch",
  Sign: "sign",
} as const;

export type InteractiveObjectType = typeof InteractiveObjectType[keyof typeof InteractiveObjectType];

/**
 * State of an interactive object
 */
export const ObjectState = {
  Closed: "closed",
  Open: "open",
  Locked: "locked",
  Active: "active",
  Inactive: "inactive",
} as const;

export type ObjectState = typeof ObjectState[keyof typeof ObjectState];

/**
 * Cardinal direction facing
 */
export type CardinalDirection = 'North' | 'South' | 'East' | 'West';

/**
 * Type-specific data for interactive objects
 */
export interface InteractiveObjectData {
  // Closed Door data
  keyRequired?: string;           // Key item ID needed to unlock
  opensTo?: string;               // Tile char to replace with when opened (default: 'D')

  // Chest data
  lootTable?: string;             // Loot table ID
  items?: string[];               // Specific item IDs
  gold?: number;                  // Gold amount
  trapped?: boolean;              // Whether chest is trapped

  // NPC data
  npcId?: string;                 // NPC definition ID
  dialogueTree?: string;          // Dialogue tree ID
  shopInventory?: string[];       // Shop item IDs
  questId?: string;               // Quest ID

  // Item data
  itemId?: string;                // Item definition ID
  quantity?: number;              // Stack size

  // Stairs data
  destinationAreaId?: string;     // Target area map ID
  destinationX?: number;          // Spawn X in destination
  destinationY?: number;          // Spawn Y in destination
  destinationDirection?: CardinalDirection; // Spawn facing direction

  // Switch data
  triggerId?: string;             // Trigger event ID
  toggleable?: boolean;           // Can be switched on/off

  // Sign data
  text?: string;                  // Sign text content
}

/**
 * Represents an interactive object on the map
 */
export interface InteractiveObject {
  /**
   * Unique identifier for this object instance
   */
  id: string;

  /**
   * Type of interactive object
   */
  type: InteractiveObjectType;

  /**
   * Grid position X coordinate
   */
  x: number;

  /**
   * Grid position Y coordinate
   */
  y: number;

  /**
   * Current state of the object
   */
  state: ObjectState;

  /**
   * Sprite ID for rendering this object
   */
  spriteId: string;

  /**
   * Type-specific data (loot, dialogue, etc.)
   */
  data?: InteractiveObjectData;
}

/**
 * State management for the Inventory View
 * Handles filtering, sorting, pagination, and selection state
 */

/**
 * Inventory category filter options
 * Maps to Equipment.type for filtering
 */
export type InventoryCategory =
  | 'all'
  | 'weapons'           // OneHandedWeapon, TwoHandedWeapon
  | 'shields'            // Shield
  | 'armor'              // Head, Body
  | 'accessories'        // Accessory
  | 'held'               // Held
  | 'quest-items';       // typeTags includes "quest-item"

/**
 * Inventory sort mode options
 */
export type InventorySortMode =
  | 'name-asc'
  | 'name-desc'
  | 'type'
  | 'recently-added';

// Valid values for validation
const INVENTORY_CATEGORIES: InventoryCategory[] = ['all', 'weapons', 'shields', 'armor', 'accessories', 'held', 'quest-items'];
const INVENTORY_SORT_MODES: InventorySortMode[] = ['name-asc', 'name-desc', 'type', 'recently-added'];

/**
 * Complete inventory view state
 * Tracks filter, sort, page, and selection
 */
export interface InventoryViewState {
  /** Current category filter */
  category: InventoryCategory;

  /** Current sort mode */
  sortMode: InventorySortMode;

  /** Current page number (0-indexed) */
  currentPage: number;

  /** Selected item equipment ID (null if none selected) */
  selectedItemId: string | null;

  /** Hovered item equipment ID (null if none hovered) */
  hoveredItemId: string | null;

  /** Hovered category tab (null if none hovered) */
  hoveredCategory: InventoryCategory | null;

  /** Hovered sort option (true if sort dropdown is hovered) */
  hoveredSort: boolean;

  /** Hovered pagination button ('prev' | 'next' | null) */
  hoveredPagination: 'prev' | 'next' | null;
}

/**
 * Serializable inventory view state (for localStorage)
 * Excludes transient hover states
 */
export interface InventoryViewStateJSON {
  category: InventoryCategory;
  sortMode: InventorySortMode;
  currentPage: number;
  selectedItemId: string | null;
}

/**
 * Factory function to create default inventory view state
 */
export function createDefaultInventoryViewState(): InventoryViewState {
  return {
    category: 'all',
    sortMode: 'name-asc',
    currentPage: 0,
    selectedItemId: null,
    hoveredItemId: null,
    hoveredCategory: null,
    hoveredSort: false,
    hoveredPagination: null,
  };
}

/**
 * Serialize inventory view state to JSON (for localStorage)
 * Excludes transient hover states
 */
export function serializeInventoryViewState(state: InventoryViewState): InventoryViewStateJSON {
  return {
    category: state.category,
    sortMode: state.sortMode,
    currentPage: state.currentPage,
    selectedItemId: state.selectedItemId,
  };
}

/**
 * Deserialize inventory view state from JSON (from localStorage)
 * Restores persistent state and initializes transient states to defaults
 * Note: Filter, sort, and selection are intentionally reset to defaults on load
 */
export function deserializeInventoryViewState(_json: InventoryViewStateJSON): InventoryViewState {
  return {
    category: 'all', // Reset to 'all' category on load
    sortMode: 'name-asc', // Reset to default sort on load
    currentPage: 0, // Reset to first page on load
    selectedItemId: null, // Always clear selection on load
    hoveredItemId: null,
    hoveredCategory: null,
    hoveredSort: false,
    hoveredPagination: null,
  };
}

/**
 * Validate that category is a valid InventoryCategory value
 */
export function isValidCategory(category: string): category is InventoryCategory {
  return INVENTORY_CATEGORIES.includes(category as InventoryCategory);
}

/**
 * Validate that sortMode is a valid InventorySortMode value
 */
export function isValidSortMode(sortMode: string): sortMode is InventorySortMode {
  return INVENTORY_SORT_MODES.includes(sortMode as InventorySortMode);
}

/**
 * Load inventory view state from localStorage
 * Returns default state if not found or invalid
 */
export function loadInventoryViewStateFromLocalStorage(): InventoryViewState {
  try {
    const stored = localStorage.getItem('inventoryViewState');
    if (!stored) {
      return createDefaultInventoryViewState();
    }

    const json = JSON.parse(stored) as InventoryViewStateJSON;

    // Validate deserialized data
    if (!isValidCategory(json.category)) {
      console.warn('[InventoryViewState] Invalid category in localStorage, using default');
      return createDefaultInventoryViewState();
    }

    if (!isValidSortMode(json.sortMode)) {
      console.warn('[InventoryViewState] Invalid sortMode in localStorage, using default');
      return createDefaultInventoryViewState();
    }

    if (typeof json.currentPage !== 'number' || json.currentPage < 0) {
      console.warn('[InventoryViewState] Invalid currentPage in localStorage, using default');
      return createDefaultInventoryViewState();
    }

    if (json.selectedItemId !== null && typeof json.selectedItemId !== 'string') {
      console.warn('[InventoryViewState] Invalid selectedItemId in localStorage, using default');
      return createDefaultInventoryViewState();
    }

    return deserializeInventoryViewState(json);
  } catch (error) {
    console.error('[InventoryViewState] Failed to load from localStorage:', error);
    return createDefaultInventoryViewState();
  }
}

/**
 * Save inventory view state to localStorage
 */
export function saveInventoryViewStateToLocalStorage(state: InventoryViewState): void {
  try {
    const json = serializeInventoryViewState(state);
    localStorage.setItem('inventoryViewState', JSON.stringify(json));
  } catch (error) {
    console.error('[InventoryViewState] Failed to save to localStorage:', error);
  }
}

/**
 * Clear inventory view state from localStorage
 */
export function clearInventoryViewStateFromLocalStorage(): void {
  try {
    localStorage.removeItem('inventoryViewState');
  } catch (error) {
    console.error('[InventoryViewState] Failed to clear from localStorage:', error);
  }
}

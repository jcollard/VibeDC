/**
 * UI state for combat view
 * Tracks transient UI state that's not part of core combat state
 */
export interface CombatUIState {
  /** Index of currently selected character in party selection dialog (null if none selected) */
  selectedCharacterIndex: number | null;

  /** Whether the "Start Combat" button should be shown */
  showStartButton: boolean;

  /** Currently hovered cell position (null if none) */
  hoveredCell: { x: number; y: number } | null;

  /** Active dialog (null if no dialog is open) */
  activeDialog: 'character-selection' | null;

  /** Index of selected deployment zone (null if none selected) */
  selectedZoneIndex: number | null;

  /** Index of hovered character in party selection dialog (null if none) */
  hoveredCharacterIndex: number | null;
}

/**
 * Manager for combat UI state with observer pattern
 * Centralizes UI state management and provides subscription mechanism
 */
export class CombatUIStateManager {
  private state: CombatUIState;
  private listeners: Set<(state: CombatUIState) => void> = new Set();

  constructor(initialState?: Partial<CombatUIState>) {
    this.state = {
      selectedCharacterIndex: null,
      showStartButton: false,
      hoveredCell: null,
      activeDialog: null,
      selectedZoneIndex: null,
      hoveredCharacterIndex: null,
      ...initialState,
    };
  }

  /**
   * Get the current UI state (read-only)
   */
  getState(): Readonly<CombatUIState> {
    return this.state;
  }

  /**
   * Update UI state with partial changes
   * Notifies all subscribers of the change
   */
  setState(partial: Partial<CombatUIState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  /**
   * Subscribe to UI state changes
   * @param listener - Callback invoked whenever state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: CombatUIState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Convenience methods for common operations

  /**
   * Select a character by index (or clear selection with null)
   */
  selectCharacter(index: number | null): void {
    this.setState({ selectedCharacterIndex: index });
  }

  /**
   * Show or hide the start combat button
   */
  setStartButtonVisible(visible: boolean): void {
    this.setState({ showStartButton: visible });
  }

  /**
   * Set the hovered cell position
   */
  setHoveredCell(cell: { x: number; y: number } | null): void {
    this.setState({ hoveredCell: cell });
  }

  /**
   * Open the character selection dialog
   */
  openCharacterSelection(): void {
    this.setState({ activeDialog: 'character-selection' });
  }

  /**
   * Close any open dialog
   */
  closeDialog(): void {
    this.setState({ activeDialog: null });
  }

  /**
   * Select a deployment zone by index (or clear with null)
   */
  selectZone(index: number | null): void {
    this.setState({ selectedZoneIndex: index });
  }

  /**
   * Set the hovered character in the selection dialog
   */
  setHoveredCharacter(index: number | null): void {
    this.setState({ hoveredCharacterIndex: index });
  }

  /**
   * Reset all UI state to defaults
   */
  reset(): void {
    this.state = {
      selectedCharacterIndex: null,
      showStartButton: false,
      hoveredCell: null,
      activeDialog: null,
      selectedZoneIndex: null,
      hoveredCharacterIndex: null,
    };
    this.notifyListeners();
  }
}

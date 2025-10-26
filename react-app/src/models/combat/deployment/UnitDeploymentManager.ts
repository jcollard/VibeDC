import type { CombatEncounter } from '../CombatEncounter';
import type { CombatState } from '../CombatState';
import type { CombatUIStateManager } from '../CombatUIState';

/**
 * Manages unit deployment logic including zone selection and placement validation
 * Handles the business logic for selecting deployment zones and tracking deployment state
 */
export class UnitDeploymentManager {
  // UI state manager (optional - will use internal state if not provided)
  private uiStateManager: CombatUIStateManager | null = null;

  // Internal state (used when UIStateManager not provided)
  private selectedZoneIndex: number | null = null;

  /**
   * @param uiStateManager - Optional UI state manager for centralized state management
   */
  constructor(uiStateManager?: CombatUIStateManager) {
    this.uiStateManager = uiStateManager || null;
  }

  /**
   * Set the selected zone index in UI state
   */
  private setSelectedZoneIndex(index: number | null): void {
    if (this.uiStateManager) {
      this.uiStateManager.selectZone(index);
    } else {
      this.selectedZoneIndex = index;
    }
  }

  /**
   * Get the currently selected zone index
   */
  getSelectedZoneIndex(): number | null {
    if (this.uiStateManager) {
      return this.uiStateManager.getState().selectedZoneIndex;
    }
    return this.selectedZoneIndex;
  }

  /**
   * Clear the selected deployment zone
   */
  clearSelectedZone(): void {
    this.setSelectedZoneIndex(null);
  }

  /**
   * Handle click on the canvas to select deployment zones
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param tileSize - Size of each tile in pixels
   * @param offsetX - X offset of the map on canvas (already includes scroll offset)
   * @param offsetY - Y offset of the map on canvas (already includes scroll offset)
   * @param scrollX - Map scroll offset in tiles (horizontal) - for reference only
   * @param scrollY - Map scroll offset in tiles (vertical) - for reference only
   * @param encounter - Current encounter
   * @returns True if a zone was clicked
   */
  handleClick(
    canvasX: number,
    canvasY: number,
    tileSize: number,
    offsetX: number,
    offsetY: number,
    scrollX: number,
    scrollY: number,
    encounter: CombatEncounter
  ): boolean {
    // Convert canvas coordinates to map pixel coordinates
    // offsetX/offsetY already account for scroll, so we don't need to add scrollX/scrollY again
    const mapPixelX = canvasX - offsetX;
    const mapPixelY = canvasY - offsetY;

    // Convert to tile coordinates
    // Since offsetX/offsetY already shifted the map based on scroll,
    // we just need to divide by tile size to get the tile position
    const tileX = Math.floor(mapPixelX / tileSize);
    const tileY = Math.floor(mapPixelY / tileSize);

    // Check if click is on a deployment zone
    const clickedZoneIndex = encounter.playerDeploymentZones.findIndex(
      zone => zone.x === tileX && zone.y === tileY
    );

    if (clickedZoneIndex !== -1) {
      // Toggle selection: if already selected, deselect; otherwise select
      const currentSelection = this.getSelectedZoneIndex();
      this.setSelectedZoneIndex(currentSelection === clickedZoneIndex ? null : clickedZoneIndex);
      return true;
    }

    return false;
  }

  /**
   * Check if a deployment zone is occupied by a unit
   * @param zoneIndex - Index of the zone to check
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns True if the zone is occupied
   */
  isZoneOccupied(zoneIndex: number, state: CombatState, encounter: CombatEncounter): boolean {
    const zone = encounter.playerDeploymentZones[zoneIndex];
    if (!zone) return false;

    // Check if any unit is at this position
    return state.unitManifest.getAllUnits().some(placement =>
      placement.position.x === zone.x && placement.position.y === zone.y
    );
  }

  /**
   * Get the index of the zone at a specific tile position
   * @param tileX - X coordinate in tiles
   * @param tileY - Y coordinate in tiles
   * @param encounter - Current encounter
   * @returns Zone index or null if no zone at position
   */
  getZoneAtPosition(tileX: number, tileY: number, encounter: CombatEncounter): number | null {
    const index = encounter.playerDeploymentZones.findIndex(
      zone => zone.x === tileX && zone.y === tileY
    );
    return index !== -1 ? index : null;
  }

  /**
   * Count how many deployment zones are currently occupied
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @returns Number of occupied zones
   */
  countOccupiedZones(state: CombatState, encounter: CombatEncounter): number {
    return encounter.playerDeploymentZones.filter((_, index) =>
      this.isZoneOccupied(index, state, encounter)
    ).length;
  }
}

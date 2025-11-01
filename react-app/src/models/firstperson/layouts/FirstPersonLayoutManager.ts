import { CombatLayoutManager } from '../../combat/layouts/CombatLayoutManager';

/**
 * Layout manager for first-person view
 * Reuses CombatLayoutManager's 5-panel structure with slight adjustments
 */
export class FirstPersonLayoutManager extends CombatLayoutManager {
  constructor() {
    super();
    // Inherits all layout regions from CombatLayoutManager:
    // - Top Panel (location name, dungeon level)
    // - Map Panel (3D viewport)
    // - Combat Log
    // - Top Info Panel (minimap)
    // - Bottom Info Panel (party member stats)
  }

  /**
   * Override getMapViewport to adjust positioning for 3D viewport
   * Shifts down by 8px and increases width by 4px and height by 4px
   */
  override getMapViewport(canvasWidth: number, canvasHeight: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const baseViewport = super.getMapViewport(canvasWidth, canvasHeight);

    return {
      x: baseViewport.x,
      y: baseViewport.y + 8,  // Shift down by 8px
      width: baseViewport.width + 4,  // Increase width by 4px
      height: baseViewport.height - 4  // Reduce height by 4px (net +4px with 8px shift)
    };
  }

  /**
   * Override getCombatLogPanelRegion to shift down by 8px and reduce height by 8px
   */
  override getCombatLogPanelRegion(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const baseRegion = super.getCombatLogPanelRegion();

    return {
      x: baseRegion.x,
      y: baseRegion.y + 8,  // Shift down by 8px
      width: baseRegion.width,
      height: baseRegion.height - 8  // Reduce height by 8px
    };
  }
}

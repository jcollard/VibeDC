import { CombatLayoutManager } from '../../combat/layouts/CombatLayoutManager';

/**
 * Layout manager for first-person view
 * Reuses CombatLayoutManager's 5-panel structure
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
   * Override getMapClipRegion if needed for first-person viewport
   * (May need slightly different clipping for 3D canvas)
   */
  // ... (implement overrides only if needed)
}

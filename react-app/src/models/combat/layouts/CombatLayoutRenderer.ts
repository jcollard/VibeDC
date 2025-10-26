import type { CombatUnit } from '../CombatUnit';
import type { CombatLogManager } from '../CombatLogManager';
import type { InfoPanelManager } from '../managers/InfoPanelManager';
import type { TopPanelManager } from '../managers/TopPanelManager';

/**
 * Rendering context passed to layout renderers
 */
export interface LayoutRenderContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  spriteSize: number;
  fontId: string; // Primary font ID (for info panels, combat log)
  fontAtlasImage: HTMLImageElement | null; // Primary font atlas
  topPanelFontAtlasImage?: HTMLImageElement | null; // Font atlas for top panel (dungeon-slant)
  spriteImages: Map<string, HTMLImageElement>;
  currentUnit: CombatUnit | null; // Passed to InfoPanelManager
  targetUnit: CombatUnit | null; // Passed to InfoPanelManager
  combatLogManager?: CombatLogManager;
  currentUnitPanelManager?: InfoPanelManager;
  targetUnitPanelManager?: InfoPanelManager;
  topPanelManager?: TopPanelManager;
}

/**
 * Base interface for combat layout renderers
 * Each layout renders UI elements directly to the canvas
 */
export interface CombatLayoutRenderer {
  /**
   * Render the layout UI elements to the canvas
   * This is called after the map and units have been rendered
   * @param context - Rendering context with all necessary data
   */
  renderLayout(context: LayoutRenderContext): void;

  /**
   * Get the viewport rectangle for map rendering
   * Returns the area where the map should be rendered
   * @param canvasWidth - Full canvas width
   * @param canvasHeight - Full canvas height
   * @returns Object with x, y, width, height for the map viewport
   */
  getMapViewport(canvasWidth: number, canvasHeight: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /**
   * Gets the clipping region for the map viewport in tile coordinates.
   * This defines which tiles are visible within the map viewport.
   * @returns Object with minCol, maxCol, minRow, maxRow (inclusive)
   */
  getMapClipRegion(): {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  };
}

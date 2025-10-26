import type { CombatUnit } from '../CombatUnit';
import type { CombatLogManager } from '../CombatLogManager';
import type { InfoPanelManager } from '../managers/InfoPanelManager';

/**
 * Rendering context passed to layout renderers
 */
export interface LayoutRenderContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  spriteSize: number;
  fontId: string;
  fontAtlasImage: HTMLImageElement | null;
  spriteImages: Map<string, HTMLImageElement>;
  currentUnit: CombatUnit | null;
  targetUnit: CombatUnit | null;
  combatLogManager?: CombatLogManager; // Optional for backwards compatibility
  combatLog?: string[]; // Deprecated, kept for backwards compatibility
  turnOrder: CombatUnit[];
  currentUnitPanelManager?: InfoPanelManager;
  targetUnitPanelManager?: InfoPanelManager;
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

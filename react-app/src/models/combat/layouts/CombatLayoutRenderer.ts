import type { CombatUnit } from '../CombatUnit';
import type { CombatLogManager } from '../CombatLogManager';
import type { InfoPanelManager } from '../managers/InfoPanelManager';
import type { TopPanelManager } from '../managers/TopPanelManager';
import type { Position } from '../../../types';

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
  topPanelSmallFontAtlasImage?: HTMLImageElement | null; // Font atlas for small text in top panel (7px-04b03)
  spriteImages: Map<string, HTMLImageElement>;
  currentUnit: CombatUnit | null; // Passed to InfoPanelManager during combat
  currentUnitPosition?: Position | null; // Position of current unit
  targetUnit: CombatUnit | null; // Passed to InfoPanelManager
  targetUnitPosition?: Position | null; // Position of target unit
  partyUnits?: CombatUnit[]; // Passed to InfoPanelManager during deployment
  isDeploymentPhase?: boolean; // Flag to determine which content to show
  isEnemyDeploymentPhase?: boolean; // Flag for enemy-deployment phase (hides info panels)
  hoveredPartyMemberIndex?: number | null; // Index of hovered party member (for visual feedback)
  deployedUnitCount?: number; // Number of deployed units (for Enter Combat button)
  totalDeploymentZones?: number; // Total deployment zones available
  onEnterCombat?: () => void; // Callback when Enter Combat button is clicked
  combatLogManager?: CombatLogManager;
  currentUnitPanelManager?: InfoPanelManager;
  targetUnitPanelManager?: InfoPanelManager;
  topPanelManager?: TopPanelManager;
  activeAction?: string | null; // Current active action mode ('attack', 'move', or null)
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

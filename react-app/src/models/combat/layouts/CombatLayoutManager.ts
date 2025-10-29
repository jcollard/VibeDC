import type { CombatLayoutRenderer, LayoutRenderContext } from './CombatLayoutRenderer';
import { HorizontalVerticalLayout, type LayoutRegion } from './HorizontalVerticalLayout';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { UnitInfoContent, PartyMembersContent, EmptyContent, ActionsMenuContent } from '../managers/panels';
import { CombatConstants } from '../CombatConstants';

/**
 * Layout 6: Left Map with Top Turn Order
 * - Top-left: Turn order panel (spans above map)
 * - Middle-left: Map viewport
 * - Bottom-left: Combat log panel
 * - Right column: Current unit (top) + Target unit (bottom) split horizontally
 */
export class CombatLayoutManager implements CombatLayoutRenderer {
  private readonly RIGHT_COLUMN_WIDTH = 144; // 12 tiles
  private readonly TURN_ORDER_HEIGHT = 28; // ~2.33 tiles (increased by 4px)
  private readonly COMBAT_LOG_HEIGHT = 44 + 4; // 5 lines (5 * 8 = 40) + 2px padding + 4px border bleed + 2px extra
  private readonly PANEL_PADDING = 1; // 1px padding
  private readonly frameLayout: HorizontalVerticalLayout;

  // Map scroll button tracking
  private scrollRightButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private scrollLeftButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private mapScrollUpButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private mapScrollDownButtonBounds: { x: number; y: number; width: number; height: number } | null = null;

  // Cached panel content instances (per GeneralGuidelines.md - don't recreate every frame)
  private cachedBottomPanelContent: PartyMembersContent | UnitInfoContent | ActionsMenuContent | EmptyContent | null = null;
  private cachedTopPanelContent: UnitInfoContent | EmptyContent | null = null;
  private previousPhase: 'deployment' | 'enemy-deployment' | 'battle' | 'unit-turn' | null = null;

  constructor() {
    // Define the layout regions using tile-based dimensions
    // Canvas is 384x216 (32x18 tiles at 12px each)
    const regions: LayoutRegion[] = [
      // Top-left: Turn order (20 tiles wide, ~2.33 tiles tall = 28px)
      { name: 'turnOrder', x: 0, y: 0, widthTiles: 20, heightTiles: 28 / 12 },

      // Middle-left: Map area (20 tiles wide, adjusted to fit)
      { name: 'map', x: 0, y: 28, widthTiles: 20, heightTiles: (168 - 28) / 12 },

      // Spacer region (20 tiles wide, 4 tiles tall) - creates divider at y=168, extends to bottom
      { name: 'spacer', x: 0, y: 168, widthTiles: 20, heightTiles: 4 },

      // Top-right: Current unit (12 tiles wide, 9 tiles tall)
      { name: 'currentUnit', x: 240, y: 0, widthTiles: 12, heightTiles: 9 },

      // Bottom-right: Target unit (12 tiles wide, 9 tiles tall)
      { name: 'targetUnit', x: 240, y: 108, widthTiles: 12, heightTiles: 9 },
    ];

    this.frameLayout = new HorizontalVerticalLayout({ regions });
  }

  getMapViewport(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
    const leftColumnWidth = canvasWidth - this.RIGHT_COLUMN_WIDTH;
    const mapHeight = canvasHeight - this.TURN_ORDER_HEIGHT - this.COMBAT_LOG_HEIGHT;
    return {
      x: 0,
      y: this.TURN_ORDER_HEIGHT,
      width: leftColumnWidth,
      height: mapHeight,
    };
  }

  /**
   * Gets the clipping region for the map viewport in tile coordinates.
   * This defines which tiles are visible within the map viewport.
   * @returns Object with minCol, maxCol, minRow, maxRow (inclusive)
   */
  getMapClipRegion(): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
    return {
      minCol: 0,
      maxCol: 19,
      minRow: 3,
      maxRow: 13,
    };
  }

  /**
   * Get the region for the top info panel (right column, top position)
   * @returns Panel region with x, y, width, height in pixels
   */
  getTopInfoPanelRegion(): { x: number; y: number; width: number; height: number } {
    return {
      x: 252,   // column 21 (21 * 12px)
      y: 0,     // row 0
      width: 132,  // 11 tiles (11 * 12px)
      height: 108  // 9 tiles (9 * 12px)
    };
  }

  /**
   * Get the region for the bottom info panel (right column, bottom position)
   * @returns Panel region with x, y, width, height in pixels
   */
  getBottomInfoPanelRegion(): { x: number; y: number; width: number; height: number } {
    return {
      x: 252,   // column 21 (21 * 12px)
      y: 120,   // row 10 (10 * 12px)
      width: 132,  // 11 tiles (11 * 12px)
      height: 96   // 8 tiles (8 * 12px)
    };
  }

  /**
   * Get the region for the turn order panel (top-left)
   * @returns Panel region with x, y, width, height in pixels
   */
  getTurnOrderPanelRegion(): { x: number; y: number; width: number; height: number } {
    return {
      x: 0,     // column 0
      y: 0,     // row 0
      width: 240,  // 20 tiles (20 * 12px)
      height: 24   // 2 tiles (2 * 12px)
    };
  }

  /**
   * Get the region for the combat log panel (bottom-left)
   * @returns Panel region with x, y, width, height in pixels
   */
  getCombatLogPanelRegion(): { x: number; y: number; width: number; height: number } {
    return {
      x: 0,     // column 0
      y: 168,   // row 14
      width: 240,  // 20 tiles (20 * 12px)
      height: 48   // 4 tiles (4 * 12px)
    };
  }

  /**
   * Handle click events on the map scroll buttons.
   * Returns 'right', 'left', 'up', 'down', or null.
   */
  handleMapScrollClick(x: number, y: number): 'right' | 'left' | 'up' | 'down' | null {
    // Check scroll right button
    if (this.scrollRightButtonBounds &&
        x >= this.scrollRightButtonBounds.x &&
        x <= this.scrollRightButtonBounds.x + this.scrollRightButtonBounds.width &&
        y >= this.scrollRightButtonBounds.y &&
        y <= this.scrollRightButtonBounds.y + this.scrollRightButtonBounds.height) {
      return 'right';
    }

    // Check scroll left button
    if (this.scrollLeftButtonBounds &&
        x >= this.scrollLeftButtonBounds.x &&
        x <= this.scrollLeftButtonBounds.x + this.scrollLeftButtonBounds.width &&
        y >= this.scrollLeftButtonBounds.y &&
        y <= this.scrollLeftButtonBounds.y + this.scrollLeftButtonBounds.height) {
      return 'left';
    }

    // Check scroll up button
    if (this.mapScrollUpButtonBounds &&
        x >= this.mapScrollUpButtonBounds.x &&
        x <= this.mapScrollUpButtonBounds.x + this.mapScrollUpButtonBounds.width &&
        y >= this.mapScrollUpButtonBounds.y &&
        y <= this.mapScrollUpButtonBounds.y + this.mapScrollUpButtonBounds.height) {
      return 'up';
    }

    // Check scroll down button
    if (this.mapScrollDownButtonBounds &&
        x >= this.mapScrollDownButtonBounds.x &&
        x <= this.mapScrollDownButtonBounds.x + this.mapScrollDownButtonBounds.width &&
        y >= this.mapScrollDownButtonBounds.y &&
        y <= this.mapScrollDownButtonBounds.y + this.mapScrollDownButtonBounds.height) {
      return 'down';
    }

    return null;
  }

  /**
   * Handle click events on the top panel (turn order).
   * Returns true if the click was handled, false otherwise.
   */
  handleTopPanelClick(x: number, y: number, topPanelManager: any): boolean {
    if (!topPanelManager) return false;

    // Top panel is rows 0-1, columns 0-19 (x: 0, y: 0, width: 240px, height: 24px)
    const region = { x: 0, y: 0, width: 240, height: 24 };

    return topPanelManager.handleClick(x, y, region);
  }

  /**
   * Handle click events on the top info panel (target unit info, top-right).
   * Returns the click result from the panel content.
   */
  handleTopInfoPanelClick(x: number, y: number, topInfoPanelManager: any): any {
    if (!topInfoPanelManager) return null;

    const region = this.getTopInfoPanelRegion();
    return topInfoPanelManager.handleClick(x, y, region);
  }

  /**
   * Handle mouse down events on the top panel (turn order).
   * Returns true if the event was handled, false otherwise.
   */
  handleTopPanelMouseDown(x: number, y: number, topPanelManager: any): boolean {
    if (!topPanelManager) return false;

    // Top panel is rows 0-1, columns 0-19 (x: 0, y: 0, width: 240px, height: 24px)
    const region = { x: 0, y: 0, width: 240, height: 24 };

    return topPanelManager.handleMouseDown(x, y, region);
  }

  /**
   * Handle mouse up events on the top panel
   */
  handleTopPanelMouseUp(topPanelManager: any): void {
    if (topPanelManager) {
      topPanelManager.handleMouseUp();
    }
  }

  /**
   * Handle mouse leave events on the top panel
   */
  handleTopPanelMouseLeave(topPanelManager: any): void {
    if (topPanelManager) {
      topPanelManager.handleMouseLeave();
    }
  }

  /**
   * Handle click events on the combat log scroll buttons.
   * Returns 'up', 'down', or null.
   */
  handleCombatLogClick(x: number, y: number, combatLogManager: any): 'up' | 'down' | null {
    if (!combatLogManager) return null;
    return combatLogManager.handleScrollButtonClick(x, y);
  }

  renderLayout(context: LayoutRenderContext): void {
    const { ctx, canvasWidth, canvasHeight, fontAtlasImage, spriteImages, spriteSize, combatLogManager } = context;

    if (!fontAtlasImage) return;

    const leftColumnWidth = canvasWidth - this.RIGHT_COLUMN_WIDTH;
    const mapHeight = canvasHeight - this.TURN_ORDER_HEIGHT - this.COMBAT_LOG_HEIGHT;

    // Top-left: Turn order
    this.renderTurnOrderPanel(context, 0, 0, leftColumnWidth, this.TURN_ORDER_HEIGHT);

    // Bottom-left: Combat log
    this.renderCombatLogPanel(
      context,
      0,
      this.TURN_ORDER_HEIGHT + mapHeight,
      leftColumnWidth,
      this.COMBAT_LOG_HEIGHT
    );

    // Right column - info panels at correct tile positions
    // Top-right: Info panel (rows 0-8, columns 21-31)
    this.renderTopInfoPanel(
      context,
      252, // x: column 21 (21 * 12px)
      0,   // y: row 0 (0 * 12px)
      132, // width: 11 tiles (11 * 12px)
      108  // height: 9 tiles (9 * 12px)
    );

    // Bottom-right: Info panel (rows 10-17, columns 21-31)
    this.renderBottomInfoPanel(
      context,
      252, // x: column 21 (21 * 12px)
      120, // y: row 10 (10 * 12px)
      132, // width: 11 tiles (11 * 12px)
      96   // height: 8 tiles (8 * 12px)
    );

    // Render the frame layout dividers on top of the 9-slice panels
    this.frameLayout.render(ctx, spriteImages, spriteSize);

    // Render combat log scroll buttons on top of everything
    if (combatLogManager) {
      combatLogManager.renderScrollButtons(ctx, spriteImages, spriteSize, canvasHeight);
    }
  }

  /**
   * Render map scroll arrows for horizontal and vertical scrolling.
   * Call this after rendering the layout.
   */
  renderMapScrollArrows(context: LayoutRenderContext, canScrollRight: boolean, canScrollLeft: boolean, canScrollUp: boolean, canScrollDown: boolean): void {
    const { ctx, spriteImages, spriteSize } = context;
    const tileSize = 12;
    const buttonSize = 12;

    // Right arrow at column 19, rows 7-9 (if can scroll right)
    if (canScrollRight) {
      const arrowX = 19 * tileSize;
      const arrowStartY = 7 * tileSize;

      // Render 3 arrow sprites vertically
      for (let i = 0; i < 3; i++) {
        const arrowY = arrowStartY + (i * tileSize);
        SpriteRenderer.renderSpriteById(
          ctx,
          'minimap-6',
          spriteImages,
          spriteSize,
          arrowX,
          arrowY,
          buttonSize,
          buttonSize
        );
      }

      // Store bounds for the entire clickable area (all 3 tiles)
      this.scrollRightButtonBounds = {
        x: arrowX,
        y: arrowStartY,
        width: buttonSize,
        height: buttonSize * 3
      };
    } else {
      this.scrollRightButtonBounds = null;
    }

    // Left arrow at column 0, rows 7-9 (if can scroll left)
    if (canScrollLeft) {
      const arrowX = 0 * tileSize;
      const arrowStartY = 7 * tileSize;

      // Render 3 arrow sprites vertically
      for (let i = 0; i < 3; i++) {
        const arrowY = arrowStartY + (i * tileSize);
        SpriteRenderer.renderSpriteById(
          ctx,
          'minimap-8',
          spriteImages,
          spriteSize,
          arrowX,
          arrowY,
          buttonSize,
          buttonSize
        );
      }

      // Store bounds for the entire clickable area (all 3 tiles)
      this.scrollLeftButtonBounds = {
        x: arrowX,
        y: arrowStartY,
        width: buttonSize,
        height: buttonSize * 3
      };
    } else {
      this.scrollLeftButtonBounds = null;
    }

    // Up arrow at row 3, columns 8-10 (if can scroll up)
    if (canScrollUp) {
      const arrowY = 3 * tileSize;
      const arrowStartX = 8 * tileSize;

      // Render 3 arrow sprites horizontally
      for (let i = 0; i < 3; i++) {
        const arrowX = arrowStartX + (i * tileSize);
        SpriteRenderer.renderSpriteById(
          ctx,
          'minimap-7',
          spriteImages,
          spriteSize,
          arrowX,
          arrowY,
          buttonSize,
          buttonSize
        );
      }

      // Store bounds for the entire clickable area (all 3 tiles)
      this.mapScrollUpButtonBounds = {
        x: arrowStartX,
        y: arrowY,
        width: buttonSize * 3,
        height: buttonSize
      };
    } else {
      this.mapScrollUpButtonBounds = null;
    }

    // Down arrow at row 13, columns 8-10 (if can scroll down)
    if (canScrollDown) {
      const arrowY = 13 * tileSize;
      const arrowStartX = 8 * tileSize;

      // Render 3 arrow sprites horizontally
      for (let i = 0; i < 3; i++) {
        const arrowX = arrowStartX + (i * tileSize);
        SpriteRenderer.renderSpriteById(
          ctx,
          'minimap-9',
          spriteImages,
          spriteSize,
          arrowX,
          arrowY,
          buttonSize,
          buttonSize
        );
      }

      // Store bounds for the entire clickable area (all 3 tiles)
      this.mapScrollDownButtonBounds = {
        x: arrowStartX,
        y: arrowY,
        width: buttonSize * 3,
        height: buttonSize
      };
    } else {
      this.mapScrollDownButtonBounds = null;
    }
  }

  private renderTurnOrderPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, topPanelManager, topPanelFontAtlasImage, topPanelSmallFontAtlasImage, spriteImages, spriteSize } = context;
    if (!topPanelManager) return;

    // Use dungeon-slant font for top panel, with small font available for details
    topPanelManager.render(
      ctx,
      { x, y, width, height },
      '15px-dungeonslant',
      topPanelFontAtlasImage || null,
      spriteImages,
      spriteSize,
      topPanelSmallFontAtlasImage || null
    );
  }

  private renderCombatLogPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, combatLogManager, fontId, fontAtlasImage, spriteImages, spriteSize } = context;
    if (!fontAtlasImage || !combatLogManager) return;

    // Calculate the visible area for the combat log (1px padding on all sides)
    const logX = x + this.PANEL_PADDING;
    const logY = y + this.PANEL_PADDING;
    const logWidth = width - this.PANEL_PADDING * 2;
    const logHeight = height - this.PANEL_PADDING * 2;

    // Render combat log using the manager
    combatLogManager.render(
      ctx,
      logX,
      logY,
      logWidth,
      logHeight,
      fontId,
      fontAtlasImage,
      spriteImages,
      spriteSize
    );
  }

  /**
   * Render the bottom info panel (right column, bottom position)
   * Shows party members during deployment, or current unit during combat
   */
  private renderBottomInfoPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, currentUnit, fontId, fontAtlasImage, currentUnitPanelManager, isDeploymentPhase, isEnemyDeploymentPhase, partyUnits, spriteImages, spriteSize, hoveredPartyMemberIndex, deployedUnitCount, totalDeploymentZones, onEnterCombat } = context;
    if (!currentUnitPanelManager) return;

    // Detect phase transition and clear cache
    const currentPhase = isEnemyDeploymentPhase ? 'enemy-deployment' : (isDeploymentPhase ? 'deployment' : (currentUnit ? 'unit-turn' : 'battle'));
    if (this.previousPhase !== null && this.previousPhase !== currentPhase) {
      this.cachedBottomPanelContent = null;
    }
    this.previousPhase = currentPhase;

    // Create or update appropriate content based on phase
    if (isEnemyDeploymentPhase) {
      // During enemy-deployment, show empty panel
      if (!(this.cachedBottomPanelContent instanceof EmptyContent)) {
        this.cachedBottomPanelContent = new EmptyContent({
          title: '',
          titleColor: '#ffa500',
          padding: 1,
          lineSpacing: 8,
        });
      }
      currentUnitPanelManager.setContent(this.cachedBottomPanelContent);
    } else if (isDeploymentPhase && partyUnits && partyUnits.length > 0) {
      // During deployment, show party members grid
      if (this.cachedBottomPanelContent instanceof PartyMembersContent) {
        // Update existing content
        this.cachedBottomPanelContent.updateHoveredIndex(hoveredPartyMemberIndex ?? null);
        this.cachedBottomPanelContent.updatePartyUnits(partyUnits);
        // Update deployment info for Enter Combat button
        if (deployedUnitCount !== undefined && totalDeploymentZones !== undefined) {
          this.cachedBottomPanelContent.updateDeploymentInfo({
            deployedUnitCount,
            totalPartySize: partyUnits.length,
            totalDeploymentZones,
            onEnterCombat,
          });
        }
      } else {
        // Create new content
        this.cachedBottomPanelContent = new PartyMembersContent(
          {
            title: 'Party Members',
            titleColor: '#ffa500',
            padding: 1,
            lineSpacing: 8,
          },
          partyUnits,
          spriteImages,
          spriteSize,
          hoveredPartyMemberIndex ?? null
        );
      }
      currentUnitPanelManager.setContent(this.cachedBottomPanelContent);
    } else if (currentUnit) {
      // During unit-turn phase, show actions menu
      if (!(this.cachedBottomPanelContent instanceof ActionsMenuContent)) {
        // Create new actions menu content with unit
        this.cachedBottomPanelContent = new ActionsMenuContent(
          {
            title: 'ACTIONS',
            titleColor: '#ffa500',
            padding: 1,
            lineSpacing: 8,
          },
          currentUnit
        );
      }
      // Note: We intentionally DON'T call updateUnit here during unit-turn phase
      // CombatView will call updateUnit with the correct dynamic state (activeAction, hasMoved)
      // after this method sets the initial content

      // Re-enable buttons when entering unit-turn phase (they are disabled after clicking)
      this.cachedBottomPanelContent.setButtonsDisabled(false);

      currentUnitPanelManager.setContent(this.cachedBottomPanelContent);
    } else {
      // Empty state
      if (!(this.cachedBottomPanelContent instanceof EmptyContent)) {
        // Create new empty content (stateless, but cache it anyway)
        this.cachedBottomPanelContent = new EmptyContent({
          title: 'Active Unit',
          titleColor: '#ffa500',
          padding: 1,
          lineSpacing: 8,
        });
      }
      currentUnitPanelManager.setContent(this.cachedBottomPanelContent);
    }

    currentUnitPanelManager.render(
      ctx,
      { x, y, width, height },
      fontId,
      fontAtlasImage,
      spriteImages,
      spriteSize
    );
  }

  /**
   * Render the top info panel (right column, top position)
   * Shows target unit or selected unit information
   */
  private renderTopInfoPanel(
    context: LayoutRenderContext,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const { ctx, targetUnit, fontId, fontAtlasImage, targetUnitPanelManager, isEnemyDeploymentPhase, spriteImages, spriteSize } = context;
    if (!targetUnitPanelManager) return;

    // Create or update appropriate content
    if (isEnemyDeploymentPhase) {
      // During enemy-deployment, show empty panel
      if (!(this.cachedTopPanelContent instanceof EmptyContent)) {
        this.cachedTopPanelContent = new EmptyContent({
          title: '',
          titleColor: '#ff6b6b',
          padding: 1,
          lineSpacing: 8,
        });
      }
      targetUnitPanelManager.setContent(this.cachedTopPanelContent);
    } else if (targetUnit) {
      // Determine title color based on unit's allegiance
      const titleColor = targetUnit.isPlayerControlled
        ? CombatConstants.UNIT_TURN.PLAYER_NAME_COLOR
        : CombatConstants.UNIT_TURN.ENEMY_NAME_COLOR;

      if (this.cachedTopPanelContent instanceof UnitInfoContent) {
        // Update existing content with unit name as title and appropriate color
        this.cachedTopPanelContent.updateUnit(targetUnit, targetUnit.name, titleColor);
      } else {
        // Create new content with unit name as title
        this.cachedTopPanelContent = new UnitInfoContent(
          {
            title: targetUnit.name,
            titleColor: titleColor,
            padding: 1,
            lineSpacing: 8,
          },
          targetUnit
        );
      }
      targetUnitPanelManager.setContent(this.cachedTopPanelContent);
    } else {
      if (!(this.cachedTopPanelContent instanceof EmptyContent)) {
        // Create new empty content (stateless, but cache it anyway)
        this.cachedTopPanelContent = new EmptyContent({
          title: 'Unit Info',
          titleColor: '#ff6b6b',
          padding: 1,
          lineSpacing: 8,
        });
      }
      targetUnitPanelManager.setContent(this.cachedTopPanelContent);
    }

    targetUnitPanelManager.render(
      ctx,
      { x, y, width, height },
      fontId,
      fontAtlasImage,
      spriteImages,
      spriteSize
    );
  }
}

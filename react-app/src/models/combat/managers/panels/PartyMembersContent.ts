import type { CombatUnit } from '../../CombatUnit';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../../../utils/SpriteRenderer';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';
import { PanelButton } from './PanelButton';

/**
 * Configuration for party members panel appearance
 */
export interface PartyMembersConfig {
  title: string;
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Deployment information for showing Enter Combat button
 */
export interface DeploymentInfo {
  deployedUnitCount: number;
  totalPartySize: number;
  totalDeploymentZones: number;
  onEnterCombat?: () => void;
}

/**
 * Constants for party member grid layout
 */
const SPRITE_DISPLAY_SIZE = 12; // 12x12px sprites
const NAME_SPACING = 8; // Space for name below sprite
const VERTICAL_SPACING = 6; // Additional vertical space between rows

/**
 * Panel content that displays party members in a 2x2 grid with sprites and names.
 * Supports click and hover interactions to select/highlight party members.
 */
export class PartyMembersContent implements PanelContent {
  private readonly config: PartyMembersConfig;
  private units: CombatUnit[];
  private readonly spriteImages: Map<string, HTMLImageElement>;
  private readonly spriteSize: number;
  private hoveredIndex: number | null;
  private lastRegion: PanelRegion | null = null;

  // Enter Combat button support
  private enterCombatButton: PanelButton | null = null;
  private showEnterCombatButton = false;
  private deploymentInfo: DeploymentInfo | null = null;

  constructor(
    config: PartyMembersConfig,
    units: CombatUnit[],
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number,
    hoveredIndex: number | null = null
  ) {
    this.config = config;
    this.units = units;
    this.spriteImages = spriteImages;
    this.spriteSize = spriteSize;
    this.hoveredIndex = hoveredIndex;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    // Cache region for interaction handling
    this.lastRegion = region;

    let currentY = region.y + this.config.padding;

    // Render title (centered)
    FontAtlasRenderer.renderText(
      ctx,
      this.config.title,
      region.x + region.width / 2,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'center',
      this.config.titleColor
    );
    currentY += this.config.lineSpacing;

    // Render party members in 2x2 grid
    this.renderPartyGrid(ctx, region, currentY, fontId, fontAtlasImage);

    // Render Enter Combat button if conditions are met
    if (this.showEnterCombatButton) {
      this.renderEnterCombatButton(ctx, region, fontId, fontAtlasImage);
    }
  }

  /**
   * Render party members in a 2x2 grid with sprites and names
   */
  private renderPartyGrid(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    startY: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement
  ): void {
    const cellWidth = region.width / 2; // 2 columns
    const cellHeight = SPRITE_DISPLAY_SIZE + NAME_SPACING + VERTICAL_SPACING;

    // Calculate starting position to center the grid vertically in remaining space
    const availableHeight = region.height - (startY - region.y);
    const gridHeight = Math.min(2, Math.ceil(this.units.length / 2)) * cellHeight;
    let currentY = startY + (availableHeight - gridHeight) / 2;

    // Render units in 2x2 grid (up to 4 units)
    for (let i = 0; i < this.units.length && i < 4; i++) {
      const unit = this.units[i];
      const row = Math.floor(i / 2);
      const col = i % 2;
      const isHovered = this.hoveredIndex === i;

      // Calculate position for this cell
      const cellX = region.x + col * cellWidth;
      const cellY = currentY + row * cellHeight;

      // Center sprite within cell
      const spriteX = cellX + (cellWidth - SPRITE_DISPLAY_SIZE) / 2;
      const spriteY = cellY;

      // Render sprite
      SpriteRenderer.renderSpriteById(
        ctx,
        unit.spriteId,
        this.spriteImages,
        this.spriteSize,
        spriteX,
        spriteY,
        SPRITE_DISPLAY_SIZE,
        SPRITE_DISPLAY_SIZE
      );

      // Render name centered below sprite
      // Use dark yellow color (#ccaa00) when hovered, white otherwise
      const nameY = spriteY + SPRITE_DISPLAY_SIZE + 1;
      const nameX = cellX + cellWidth / 2;
      const nameColor = isHovered ? '#ccaa00' : '#ffffff';
      FontAtlasRenderer.renderText(
        ctx,
        unit.name,
        nameX,
        nameY,
        fontId,
        fontAtlasImage,
        1,
        'center',
        nameColor
      );
    }
  }

  /**
   * Handle click on party member or button
   * @param relativeX - X coordinate relative to panel region
   * @param relativeY - Y coordinate relative to panel region
   * @returns Type-safe discriminated union result indicating what was clicked
   */
  handleClick(relativeX: number, relativeY: number): PanelClickResult {
    // Check button click first (if button exists)
    if (this.enterCombatButton && this.showEnterCombatButton) {
      const buttonHandled = this.enterCombatButton.handleMouseUp(relativeX, relativeY);
      if (buttonHandled) {
        return { type: 'button' };
      }
    }

    // Fall back to party member click detection
    const memberIndex = this.getPartyMemberAtPosition(relativeX, relativeY);
    if (memberIndex !== null) {
      return { type: 'party-member', index: memberIndex };
    }

    return null;
  }

  /**
   * Handle hover on party member or button
   * @param relativeX - X coordinate relative to panel region
   * @param relativeY - Y coordinate relative to panel region
   * @returns Index of hovered party member, or null
   */
  handleHover(relativeX: number, relativeY: number): number | null {
    // Update button hover state (if button exists)
    if (this.enterCombatButton && this.showEnterCombatButton) {
      this.enterCombatButton.handleMouseMove(relativeX, relativeY);
    }

    // Return hovered party member index
    return this.getPartyMemberAtPosition(relativeX, relativeY);
  }

  /**
   * Handle mouse down on button
   * @param relativeX - X coordinate relative to panel region
   * @param relativeY - Y coordinate relative to panel region
   * @returns true if the button handled the event
   */
  handleMouseDown(relativeX: number, relativeY: number): boolean {
    if (this.enterCombatButton && this.showEnterCombatButton) {
      return this.enterCombatButton.handleMouseDown(relativeX, relativeY);
    }
    return false;
  }

  /**
   * Update the hovered party member index
   * Call this instead of recreating the content when hover state changes
   * @param index - Index of the hovered party member, or null if none
   */
  updateHoveredIndex(index: number | null): void {
    this.hoveredIndex = index;
  }

  /**
   * Update the cached region for hover detection
   * Call this before handleHover() if the panel hasn't been rendered yet
   * @param region - Panel region
   */
  updateRegion(region: PanelRegion): void {
    this.lastRegion = region;
  }

  /**
   * Update the party units list
   * Call this when the party composition changes
   * @param units - New array of party units
   */
  updatePartyUnits(units: CombatUnit[]): void {
    this.units = units;
  }

  /**
   * Update deployment information and button visibility
   * Call this when deployment state changes
   * @param deploymentInfo - Deployment state information
   */
  updateDeploymentInfo(deploymentInfo: DeploymentInfo | null): void {
    this.deploymentInfo = deploymentInfo;

    // Update button visibility based on deployment conditions
    if (deploymentInfo) {
      const shouldShow = deploymentInfo.deployedUnitCount >= deploymentInfo.totalPartySize ||
                         deploymentInfo.deployedUnitCount >= deploymentInfo.totalDeploymentZones;
      this.showEnterCombatButton = shouldShow;
    } else {
      this.showEnterCombatButton = false;
    }
  }

  /**
   * Render the Enter Combat button at the bottom of the panel
   */
  private renderEnterCombatButton(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!this.deploymentInfo || !fontAtlasImage) return;

    // Create button on first render
    if (!this.enterCombatButton) {
      this.enterCombatButton = new PanelButton({
        label: 'Enter Combat',
        x: 0, // Will be positioned after we know the width
        y: 0, // Will be positioned at bottom of panel
        fontId,
        fontAtlasImage,
        fontScale: 1,
        padding: 1,
        onClick: () => {
          if (this.deploymentInfo?.onEnterCombat) {
            this.deploymentInfo.onEnterCombat();
          }
        },
      });

      // Position button centered horizontally and at bottom of panel
      const buttonWidth = this.enterCombatButton.getWidth();
      const buttonHeight = this.enterCombatButton.getHeight();
      const buttonX = (region.width - buttonWidth) / 2;
      const buttonY = region.height - buttonHeight - this.config.padding;

      this.enterCombatButton.updateConfig({ x: buttonX, y: buttonY });
    }

    // Render button at panel-relative position
    this.enterCombatButton.render(ctx, region.x, region.y, this.spriteImages);
  }

  /**
   * Get the party member index at a specific position
   * @param relativeX - X coordinate relative to panel region
   * @param relativeY - Y coordinate relative to panel region
   * @returns Index of unit at position, or null if none
   */
  private getPartyMemberAtPosition(
    relativeX: number,
    relativeY: number
  ): number | null {
    if (!this.lastRegion) return null;

    const cellWidth = this.lastRegion.width / 2; // 2 columns
    const cellHeight = SPRITE_DISPLAY_SIZE + NAME_SPACING + VERTICAL_SPACING;

    // Calculate starting Y (after title) relative to panel region
    const startY = this.config.padding + this.config.lineSpacing;

    // Calculate grid starting position (same as renderPartyGrid)
    const availableHeight = this.lastRegion.height - startY;
    const gridHeight = Math.min(2, Math.ceil(this.units.length / 2)) * cellHeight;
    const gridStartY = startY + (availableHeight - gridHeight) / 2;

    // Check each unit cell
    for (let i = 0; i < this.units.length && i < 4; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;

      // Calculate cell bounds (relative to panel region)
      const cellX = col * cellWidth;
      const cellY = gridStartY + row * cellHeight;

      // Check if position is within this cell
      if (
        relativeX >= cellX &&
        relativeX < cellX + cellWidth &&
        relativeY >= cellY &&
        relativeY < cellY + cellHeight
      ) {
        return i;
      }
    }

    return null;
  }
}

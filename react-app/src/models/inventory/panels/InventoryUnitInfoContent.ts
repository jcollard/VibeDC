import type { CombatUnit } from '../../combat/CombatUnit';
import { UnitInfoContent, type UnitInfoConfig } from '../../combat/managers/panels/UnitInfoContent';
import type { PanelRegion, PanelClickResult } from '../../combat/managers/panels/PanelContent';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';
import { HOVERED_TEXT } from '../../combat/managers/panels/colors';

/**
 * Extended UnitInfoContent for inventory view that adds party member selection UI.
 * Shows party member sprites below "View Abilities" button when no helper text is displayed.
 */
export class InventoryUnitInfoContent extends UnitInfoContent {
  private partyMembers: CombatUnit[] = [];
  private selectedMemberIndex: number = 0;
  private hoveredMemberIndex: number | null = null;
  private onMemberSelected?: (member: CombatUnit, index: number) => void;
  private selectorBounds: Array<{ x: number; y: number; width: number; height: number }> = [];

  constructor(
    config: UnitInfoConfig,
    unit: CombatUnit,
    partyMembers: CombatUnit[],
    selectedIndex: number = 0,
    onMemberSelected?: (member: CombatUnit, index: number) => void
  ) {
    super(config, unit);
    this.partyMembers = partyMembers;
    this.selectedMemberIndex = selectedIndex;
    this.onMemberSelected = onMemberSelected;
  }

  /**
   * Update party members list and selected index
   */
  updatePartyMembers(partyMembers: CombatUnit[], selectedIndex: number): void {
    this.partyMembers = partyMembers;
    this.selectedMemberIndex = selectedIndex;
  }

  /**
   * Override render to add party member selector
   */
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    spriteImages?: Map<string, HTMLImageElement>,
    spriteSize?: number
  ): void {
    // Call parent render first
    super.render(ctx, region, fontId, fontAtlasImage, spriteImages, spriteSize);

    // Only render party selector in stats view when no helper text is showing
    // We check this by seeing if there's no hovered stat
    const isStatsView = (this as any).currentView === 'stats';
    const hasHelperText = (this as any).hoveredStatId !== null;

    if (isStatsView && !hasHelperText && spriteImages && spriteSize && fontAtlasImage) {
      const font = FontRegistry.getById(fontId);
      if (font) {
        this.renderPartySelector(ctx, region, fontId, fontAtlasImage, font, spriteImages, spriteSize);
      }
    }
  }

  /**
   * Render party member selector (sprites with names)
   */
  private renderPartySelector(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number
  ): void {
    const config = (this as any).config;
    const padding = config.padding;

    // Calculate Y position: below the "View Abilities" button
    const buttonBounds = (this as any).buttonBounds;
    if (!buttonBounds) return;

    const selectorStartY = region.y + buttonBounds.y + buttonBounds.height + 4; // 4px padding below button

    // Calculate available height for selector
    const availableHeight = region.height - (selectorStartY - region.y) - padding;
    if (availableHeight < 24) return; // Need at least 24px (12px sprite + 12px for name with padding)

    // Sprite and text dimensions
    const spriteDisplaySize = 12;
    const nameHeight = 7; // Font height
    const memberSpacing = 2; // Spacing between members
    const memberTotalWidth = spriteDisplaySize + memberSpacing;

    // Calculate total width and center it
    const totalWidth = (this.partyMembers.length * memberTotalWidth) - memberSpacing;
    const startX = region.x + Math.floor((region.width - totalWidth) / 2);

    // Clear bounds array for hit detection
    this.selectorBounds = [];

    // Render each party member
    let currentX = startX;
    for (let i = 0; i < this.partyMembers.length; i++) {
      const member = this.partyMembers[i];
      const isSelected = i === this.selectedMemberIndex;
      const isHovered = i === this.hoveredMemberIndex;

      // Store bounds for hit detection
      this.selectorBounds.push({
        x: currentX,
        y: selectorStartY,
        width: spriteDisplaySize,
        height: spriteDisplaySize + 1 + nameHeight, // sprite + 1px gap + name
      });

      // Draw selection box if selected
      if (isSelected) {
        ctx.fillStyle = '#ffff00'; // Yellow
        ctx.fillRect(currentX - 1, selectorStartY - 1, spriteDisplaySize + 2, spriteDisplaySize + 2);
      }

      // Render sprite
      SpriteRenderer.renderSpriteById(
        ctx,
        member.spriteId,
        spriteImages,
        spriteSize,
        currentX,
        selectorStartY,
        spriteDisplaySize,
        spriteDisplaySize
      );

      // Render name below sprite
      const nameY = selectorStartY + spriteDisplaySize + 1;
      const nameColor = isHovered ? HOVERED_TEXT : '#ffffff';

      // Measure name width and center it under the sprite
      const nameWidth = FontAtlasRenderer.measureText(member.name, font);
      const nameX = currentX + Math.floor((spriteDisplaySize - nameWidth) / 2);

      FontAtlasRenderer.renderText(
        ctx,
        member.name,
        nameX,
        nameY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        nameColor
      );

      currentX += memberTotalWidth;
    }
  }

  /**
   * Override handleHover to include party selector
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    // Call parent hover handler first
    const parentResult = super.handleHover(relativeX, relativeY);

    // Check if hovering over party selector
    const isStatsView = (this as any).currentView === 'stats';
    const hasHelperText = (this as any).hoveredStatId !== null;

    if (isStatsView && !hasHelperText) {
      let newHoveredIndex: number | null = null;

      for (let i = 0; i < this.selectorBounds.length; i++) {
        const bounds = this.selectorBounds[i];
        if (
          relativeX >= bounds.x &&
          relativeX <= bounds.x + bounds.width &&
          relativeY >= bounds.y &&
          relativeY <= bounds.y + bounds.height
        ) {
          newHoveredIndex = i;
          break;
        }
      }

      if (newHoveredIndex !== this.hoveredMemberIndex) {
        this.hoveredMemberIndex = newHoveredIndex;
        return { type: 'party-member-hover', memberIndex: newHoveredIndex };
      }
    } else {
      // Clear hover if we're not in the right view
      if (this.hoveredMemberIndex !== null) {
        this.hoveredMemberIndex = null;
        return { type: 'party-member-hover', memberIndex: null };
      }
    }

    return parentResult;
  }

  /**
   * Override handleClick to include party selector
   */
  handleClick(relativeX: number, relativeY: number): PanelClickResult {
    // Check if clicking on party selector first
    const isStatsView = (this as any).currentView === 'stats';
    const hasHelperText = (this as any).hoveredStatId !== null;

    if (isStatsView && !hasHelperText) {
      for (let i = 0; i < this.selectorBounds.length; i++) {
        const bounds = this.selectorBounds[i];
        if (
          relativeX >= bounds.x &&
          relativeX <= bounds.x + bounds.width &&
          relativeY >= bounds.y &&
          relativeY <= bounds.y + bounds.height
        ) {
          // Member clicked - update selection
          this.selectedMemberIndex = i;
          if (this.onMemberSelected) {
            this.onMemberSelected(this.partyMembers[i], i);
          }
          return { type: 'party-member', index: i };
        }
      }
    }

    // Call parent click handler if not handled by selector
    return super.handleClick(relativeX, relativeY);
  }
}

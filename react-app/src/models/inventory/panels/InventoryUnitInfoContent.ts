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
  private selectedEquipmentSlot: string | null = null; // Track selected equipment/ability slot (e.g., 'L.Hand', 'Reaction')

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
   * Update selected equipment/ability slot for highlighting
   * @param slotLabel - Slot label (e.g., 'L.Hand', 'Reaction') or null to clear
   */
  setSelectedEquipmentSlot(slotLabel: string | null): void {
    this.selectedEquipmentSlot = slotLabel;
  }

  /**
   * Get the color for an equipment/ability slot (with green highlight for selected)
   */
  private getSlotColor(slotLabel: string, isHovered: boolean): string {
    const SELECTED_COLOR = '#00ff00'; // Green for selected items

    // If this slot is selected, use green
    if (this.selectedEquipmentSlot === slotLabel) {
      return SELECTED_COLOR;
    }

    // Otherwise use hover color if hovered, or white
    return isHovered ? HOVERED_TEXT : '#ffffff';
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
    // Temporarily override the parent's rendering to inject our custom color logic
    // We do this by accessing the parent's private methods through 'as any'
    const originalRenderAbilitySlot = (this as any).renderAbilitySlot;
    const originalRenderEquipmentSlot = (this as any).renderEquipmentSlot;

    // Override renderAbilitySlot with custom color logic
    (this as any).renderAbilitySlot = (
      ctx: CanvasRenderingContext2D,
      region: PanelRegion,
      label: string,
      ability: any,
      fontId: string,
      fontAtlasImage: HTMLImageElement,
      font: any,
      y: number
    ): number => {
      const padding = (this as any).config.padding;
      const lineSpacing = (this as any).config.lineSpacing;

      const isHovered = (this as any).hoveredStatId === label;
      const color = this.getSlotColor(label, isHovered);

      const labelX = region.x + padding;
      FontAtlasRenderer.renderText(ctx, label, labelX, y, fontId, fontAtlasImage, 1, 'left', color);

      const abilityName = ability ? ability.name : '-';
      const valueWidth = FontAtlasRenderer.measureText(abilityName, font);
      const valueX = region.x + region.width - padding - valueWidth;
      FontAtlasRenderer.renderText(ctx, abilityName, valueX, y, fontId, fontAtlasImage, 1, 'left', color);

      return y + lineSpacing;
    };

    // Override renderEquipmentSlot with custom color logic
    (this as any).renderEquipmentSlot = (
      ctx: CanvasRenderingContext2D,
      region: PanelRegion,
      label: string,
      equipment: any,
      fontId: string,
      fontAtlasImage: HTMLImageElement,
      font: any,
      y: number
    ): number => {
      const padding = (this as any).config.padding;
      const lineSpacing = (this as any).config.lineSpacing;

      const isHovered = (this as any).hoveredStatId === label;
      const color = this.getSlotColor(label, isHovered);

      const labelX = region.x + padding;
      FontAtlasRenderer.renderText(ctx, label, labelX, y, fontId, fontAtlasImage, 1, 'left', color);

      const equipmentName = equipment ? equipment.name : '-';
      const valueWidth = FontAtlasRenderer.measureText(equipmentName, font);
      const valueX = region.x + region.width - padding - valueWidth;
      FontAtlasRenderer.renderText(ctx, equipmentName, valueX, y, fontId, fontAtlasImage, 1, 'left', color);

      return y + lineSpacing;
    };

    // Call parent render first
    super.render(ctx, region, fontId, fontAtlasImage, spriteImages, spriteSize);

    // Restore original methods
    (this as any).renderAbilitySlot = originalRenderAbilitySlot;
    (this as any).renderEquipmentSlot = originalRenderEquipmentSlot;

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

    // Use panel-relative coordinates for both rendering and bounds
    const selectorStartY = buttonBounds.y + buttonBounds.height + 4; // 4px padding below button

    // Calculate available height for selector
    const availableHeight = region.height - selectorStartY - padding;
    if (availableHeight < 24) return; // Need at least 24px (12px sprite + 12px for name with padding)

    // Sprite and text dimensions
    const spriteDisplaySize = 12;
    const memberSpacing = 8; // Spacing between members
    const memberTotalWidth = spriteDisplaySize + memberSpacing;

    // Calculate total width and center it (panel-relative)
    const totalWidth = (this.partyMembers.length * memberTotalWidth) - memberSpacing;
    const startX = Math.floor((region.width - totalWidth) / 2);

    // Clear bounds array for hit detection
    this.selectorBounds = [];

    // Render each party member
    let currentX = startX;
    for (let i = 0; i < this.partyMembers.length; i++) {
      const member = this.partyMembers[i];
      const isSelected = i === this.selectedMemberIndex;
      const isHovered = i === this.hoveredMemberIndex;

      // Store bounds for hit detection (panel-relative coordinates)
      // Only include sprite in bounds since name only shows on hover
      this.selectorBounds.push({
        x: currentX,
        y: selectorStartY,
        width: spriteDisplaySize,
        height: spriteDisplaySize,
      });

      // Convert to absolute canvas coordinates for rendering
      const absX = region.x + currentX;
      const absY = region.y + selectorStartY;

      // Draw selection box if selected
      if (isSelected) {
        ctx.fillStyle = '#ffff00'; // Yellow
        ctx.fillRect(absX - 1, absY - 1, spriteDisplaySize + 2, spriteDisplaySize + 2);
      }

      // Render sprite
      SpriteRenderer.renderSpriteById(
        ctx,
        member.spriteId,
        spriteImages,
        spriteSize,
        absX,
        absY,
        spriteDisplaySize,
        spriteDisplaySize
      );

      // Only render name if hovered
      if (isHovered) {
        const nameY = selectorStartY + spriteDisplaySize + 1;
        const absNameY = region.y + nameY;
        const nameColor = HOVERED_TEXT;

        // Measure name width and center it under the sprite
        const nameWidth = FontAtlasRenderer.measureText(member.name, font);
        const nameX = currentX + Math.floor((spriteDisplaySize - nameWidth) / 2);
        const absNameX = region.x + nameX;

        FontAtlasRenderer.renderText(
          ctx,
          member.name,
          absNameX,
          absNameY,
          fontId,
          fontAtlasImage,
          1,
          'left',
          nameColor
        );
      }

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

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
   * Get slot label at position, including empty slots (inventory-specific behavior)
   */
  private getSlotLabelAtPosition(_relativeX: number, relativeY: number): string | null {
    const padding = (this as any).config.padding;
    const lineSpacing = (this as any).config.lineSpacing;

    // Calculate header height - must match renderHeader's return value
    const headerHeight = padding + (lineSpacing * 2);

    // Calculate abilities start Y
    const abilitiesStartY = headerHeight + 4; // 4px spacing

    // Check if Y is below header
    if (relativeY < abilitiesStartY) {
      return null;
    }

    // Calculate row index
    const rowY = relativeY - abilitiesStartY;
    const rowIndex = Math.floor(rowY / lineSpacing);

    // Ability slots (rows 0-2)
    const abilitySlots = ['Reaction', 'Passive', 'Movement'];
    if (rowIndex >= 0 && rowIndex < abilitySlots.length) {
      return abilitySlots[rowIndex];
    }

    // Equipment slots (rows 3-7, only for humanoid units)
    if ('leftHand' in (this as any).unit) {
      const equipmentSlots = ['L.Hand', 'R.Hand', 'Head', 'Body', 'Accessory'];
      const equipmentRowIndex = rowIndex - abilitySlots.length;

      if (equipmentRowIndex >= 0 && equipmentRowIndex < equipmentSlots.length) {
        return equipmentSlots[equipmentRowIndex];
      }
    }

    return null;
  }

  /**
   * Check if a slot is empty
   */
  private isSlotEmpty(slotLabel: string): boolean {
    const unit = (this as any).unit;

    // Check ability slots
    if (slotLabel === 'Reaction') return !unit.reactionAbility;
    if (slotLabel === 'Passive') return !unit.passiveAbility;
    if (slotLabel === 'Movement') return !unit.movementAbility;

    // Check equipment slots
    if ('leftHand' in unit) {
      const humanoid = unit as any;
      if (slotLabel === 'L.Hand') return !humanoid.leftHand;
      if (slotLabel === 'R.Hand') return !humanoid.rightHand;
      if (slotLabel === 'Head') return !humanoid.head;
      if (slotLabel === 'Body') return !humanoid.body;
      if (slotLabel === 'Accessory') return !humanoid.accessory;
    }

    return false;
  }

  /**
   * Determine slot type (equipment or ability)
   */
  private getSlotType(slotLabel: string): 'equipment' | 'ability' {
    const abilitySlots = ['Reaction', 'Passive', 'Movement'];
    return abilitySlots.includes(slotLabel) ? 'ability' : 'equipment';
  }

  /**
   * Override handleHover to include party selector and empty slots
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    // Check if mouse is outside panel bounds (same check as parent class)
    const lastRegionWidth = (this as any).lastRegionWidth;
    const lastRegionHeight = (this as any).lastRegionHeight;

    if (relativeX < 0 || relativeY < 0 ||
        relativeX >= lastRegionWidth ||
        relativeY >= lastRegionHeight) {
      // Clear hover state and delegate to parent
      if (this.hoveredMemberIndex !== null) {
        this.hoveredMemberIndex = null;
      }
      return super.handleHover(relativeX, relativeY);
    }

    // Check if hovering over party selector first (in stats view)
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

    // For abilities view, check for empty slots
    if ((this as any).currentView === 'abilities') {
      const slotLabel = this.getSlotLabelAtPosition(relativeX, relativeY);

      if (slotLabel !== null) {
        const isEmpty = this.isSlotEmpty(slotLabel);

        if (isEmpty) {
          // Hovering over empty slot
          if ((this as any).hoveredStatId !== slotLabel) {
            (this as any).hoveredStatId = slotLabel;
          }

          return {
            type: 'empty-slot-detail',
            slotLabel: slotLabel,
            slotType: this.getSlotType(slotLabel)
          };
        }
      }
    }

    // Call parent hover handler for non-empty slots
    return super.handleHover(relativeX, relativeY);
  }

  /**
   * Override handleClick to include party selector and empty slots
   */
  handleClick(relativeX: number, relativeY: number): PanelClickResult {
    // Check if mouse is outside panel bounds (same check as parent class)
    const lastRegionWidth = (this as any).lastRegionWidth;
    const lastRegionHeight = (this as any).lastRegionHeight;

    if (relativeX < 0 || relativeY < 0 ||
        relativeX >= lastRegionWidth ||
        relativeY >= lastRegionHeight) {
      // Delegate to parent (which returns null for out-of-bounds clicks)
      return super.handleClick(relativeX, relativeY);
    }

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

    // For abilities view, check for empty slot clicks
    if ((this as any).currentView === 'abilities') {
      const slotLabel = this.getSlotLabelAtPosition(relativeX, relativeY);

      if (slotLabel !== null) {
        const isEmpty = this.isSlotEmpty(slotLabel);

        if (isEmpty) {
          // Empty slot clicked
          return {
            type: 'empty-slot',
            slotLabel: slotLabel,
            slotType: this.getSlotType(slotLabel)
          } as any; // Using 'as any' since we're adding a new click result type
        }
      }
    }

    // Call parent click handler if not handled by selector or empty slot
    return super.handleClick(relativeX, relativeY);
  }
}

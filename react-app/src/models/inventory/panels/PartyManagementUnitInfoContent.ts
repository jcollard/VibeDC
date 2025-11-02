import type { CombatUnit } from '../../combat/CombatUnit';
import { UnitInfoContent, type UnitInfoConfig } from '../../combat/managers/panels/UnitInfoContent';
import type { PanelRegion, PanelClickResult } from '../../combat/managers/panels/PanelContent';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { FontRegistry } from '../../../utils/FontRegistry';
import { HOVERED_TEXT } from '../../combat/managers/panels/colors';

/**
 * Extended UnitInfoContent for party management view that adds party member selection UI.
 * Shows party member sprites below "View Abilities" button when no helper text is displayed.
 */
export class PartyManagementUnitInfoContent extends UnitInfoContent {
  private partyMembers: CombatUnit[] = [];
  private selectedMemberIndex: number = 0;
  private hoveredMemberIndex: number | null = null;
  private onMemberSelected?: (member: CombatUnit, index: number) => void;
  private selectorBounds: Array<{ x: number; y: number; width: number; height: number }> = [];
  private selectedEquipmentSlot: string | null = null; // Track selected equipment/ability slot (e.g., 'L.Hand', 'Reaction')
  private learnAbilitiesButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private isLearnAbilitiesButtonHovered: boolean = false;

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

    // Add helper text for Class XP
    (this as any).statHelperText['Class XP'] = 'XP available for your primary class can be used to learn abilities.';

    // Add helper text for Learn Abilities button
    (this as any).statHelperText['Learn Abilities'] = 'Spend XP to learn new abilities for this character.';

    // Update helper text for Set Abilities & Equipment button
    (this as any).statHelperText['Set Abilities & Equipment'] = "Set this unit's abilities and equipment";
  }

  /**
   * Update party members list and selected index
   */
  updatePartyMembers(partyMembers: CombatUnit[], selectedIndex: number): void {
    this.partyMembers = partyMembers;
    this.selectedMemberIndex = selectedIndex;
  }

  /**
   * Custom renderToggleButton that adds "Learn Abilities" option
   * @returns Y position after buttons
   */
  private renderToggleButtonWithLearnAbilities(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    y: number
  ): number {
    const lineSpacing = (this as any).config.lineSpacing;
    const currentView = (this as any).currentView;
    const buttonText = currentView === 'stats' ? 'Set Abilities & Equipment' : 'Back';

    // Move options down by 2px
    let currentY = y + 2;

    const textWidth = FontAtlasRenderer.measureText(buttonText, font);
    const textX = region.x + Math.floor((region.width - textWidth) / 2);

    // Use hover color when button is hovered
    const isButtonHovered = (this as any).isButtonHovered;
    const buttonColor = isButtonHovered ? HOVERED_TEXT : '#ffffff';
    FontAtlasRenderer.renderText(ctx, buttonText, textX, currentY, fontId, fontAtlasImage, 1, 'left', buttonColor);

    (this as any).buttonBounds = {
      x: textX - region.x,
      y: currentY - region.y,
      width: textWidth,
      height: lineSpacing
    };

    currentY += lineSpacing;

    // Only render "Learn Abilities" in stats view
    if (currentView === 'stats') {
      const learnAbilitiesText = 'Learn Abilities';
      const learnAbilitiesTextWidth = FontAtlasRenderer.measureText(learnAbilitiesText, font);
      const learnAbilitiesTextX = region.x + Math.floor((region.width - learnAbilitiesTextWidth) / 2);

      const learnAbilitiesButtonColor = this.isLearnAbilitiesButtonHovered ? HOVERED_TEXT : '#ffffff';
      FontAtlasRenderer.renderText(ctx, learnAbilitiesText, learnAbilitiesTextX, currentY, fontId, fontAtlasImage, 1, 'left', learnAbilitiesButtonColor);

      this.learnAbilitiesButtonBounds = {
        x: learnAbilitiesTextX - region.x,
        y: currentY - region.y,
        width: learnAbilitiesTextWidth,
        height: lineSpacing
      };

      currentY += lineSpacing;
    } else {
      this.learnAbilitiesButtonBounds = null;
    }

    return currentY;
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
   * Custom renderHeader to show available XP instead of Action Timer
   * @returns Y position after header
   */
  private renderHeaderWithXp(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    font: any,
    spriteImages?: Map<string, HTMLImageElement>,
    spriteSize?: number
  ): number {
    const spriteX = region.x + (this as any).config.padding;
    const spriteY = region.y + (this as any).config.padding;

    // Sprite rendering
    if (spriteImages && spriteSize) {
      SpriteRenderer.renderSpriteById(
        ctx,
        (this as any).unit.spriteId,
        spriteImages,
        spriteSize,
        spriteX,
        spriteY,
        12,
        12
      );
    }

    // Name rendering
    const nameX = spriteX + 12 + 2;
    const nameY = spriteY;
    const nameColor = (this as any).unit.isPlayerControlled ? '#00ff00' : '#ff0000';
    FontAtlasRenderer.renderText(ctx, (this as any).unit.name, nameX, nameY, fontId, fontAtlasImage, 1, 'left', nameColor);

    // Class rendering
    const classY = nameY + (this as any).config.lineSpacing;
    let classText = (this as any).unit.unitClass.name;
    if ((this as any).unit.secondaryClass) {
      classText += `/${(this as any).unit.secondaryClass.name}`;
    }
    FontAtlasRenderer.renderText(ctx, classText, nameX, classY, fontId, fontAtlasImage, 1, 'left', '#ffffff');

    // Class XP rendering (replacing Action Timer)
    const unit = (this as any).unit;
    const primaryClassName = unit.unitClass.name.toUpperCase();

    const xpLabelY = spriteY;
    const isXpHovered = (this as any).hoveredStatId === 'Class XP';
    const xpColor = isXpHovered ? HOVERED_TEXT : '#ffffff';

    const fullLabel = `${primaryClassName} XP`;
    const fullLabelWidth = FontAtlasRenderer.measureText(fullLabel, font);
    const availableWidth = region.width - (nameX - region.x) - 50;

    if (fullLabelWidth <= availableWidth) {
      const xpLabelX = region.x + region.width - (this as any).config.padding - fullLabelWidth;
      FontAtlasRenderer.renderText(ctx, fullLabel, xpLabelX, xpLabelY, fontId, fontAtlasImage, 1, 'left', xpColor);
    } else {
      const xpText = 'XP';
      const xpWidth = FontAtlasRenderer.measureText(xpText, font);
      const xpLabelX = region.x + region.width - (this as any).config.padding - xpWidth;
      FontAtlasRenderer.renderText(ctx, xpText, xpLabelX, xpLabelY, fontId, fontAtlasImage, 1, 'left', xpColor);
    }

    // Calculate available XP (earned - spent) for primary class
    let availableXp = 0;
    if ('getUnspentClassExperience' in unit) {
      availableXp = unit.getUnspentClassExperience(unit.unitClass);
    }

    const xpValue = `${availableXp}`;
    const xpValueWidth = FontAtlasRenderer.measureText(xpValue, font);
    const xpValueX = region.x + region.width - (this as any).config.padding - xpValueWidth;
    const xpValueY = xpLabelY + (this as any).config.lineSpacing;
    FontAtlasRenderer.renderText(ctx, xpValue, xpValueX, xpValueY, fontId, fontAtlasImage, 1, 'left', isXpHovered ? HOVERED_TEXT : '#ffa500');

    return classY + (this as any).config.lineSpacing;
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
    // Temporarily override the parent's rendering to inject our custom logic
    // We do this by accessing the parent's private methods through 'as any'
    const originalRenderHeader = (this as any).renderHeader;
    const originalRenderAbilitySlot = (this as any).renderAbilitySlot;
    const originalRenderEquipmentSlot = (this as any).renderEquipmentSlot;
    const originalRenderToggleButton = (this as any).renderToggleButton;

    // Override renderHeader with our custom XP rendering
    (this as any).renderHeader = this.renderHeaderWithXp.bind(this);

    // Override renderToggleButton with our custom button rendering
    (this as any).renderToggleButton = this.renderToggleButtonWithLearnAbilities.bind(this);

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
    (this as any).renderHeader = originalRenderHeader;
    (this as any).renderAbilitySlot = originalRenderAbilitySlot;
    (this as any).renderEquipmentSlot = originalRenderEquipmentSlot;
    (this as any).renderToggleButton = originalRenderToggleButton;

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

    // Calculate Y position: below the "Learn Abilities" button (or "Set Abilities & Equipment" if no Learn Abilities)
    let selectorStartY: number;

    if (this.learnAbilitiesButtonBounds) {
      // Position directly below "Learn Abilities" button (no extra spacing)
      selectorStartY = this.learnAbilitiesButtonBounds.y + this.learnAbilitiesButtonBounds.height;
    } else {
      // Fallback to below main button (shouldn't happen in stats view, but just in case)
      const buttonBounds = (this as any).buttonBounds;
      if (!buttonBounds) return;
      selectorStartY = buttonBounds.y + buttonBounds.height + 4;
    }

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
   * Custom getStatIdAt to handle Class XP region instead of Action Timer
   * (Cannot override private parent method, so we use a different name)
   */
  private getStatIdAtWithXp(relativeX: number, relativeY: number): string | null {
    // Calculate layout positions (must match render method)
    const padding = (this as any).config.padding;
    const lineSpacing = (this as any).config.lineSpacing;

    // Sprite and name section height
    const spriteY = padding;
    const nameY = spriteY;
    const classY = nameY + lineSpacing;
    const statsStartY = classY + lineSpacing + 4;

    // Check Class XP region (top-right) - replaces Action Timer
    // Class XP label is at spriteY, value is at spriteY + lineSpacing
    const xpLabelY = spriteY;
    const xpValueY = xpLabelY + lineSpacing;

    // Approximate Class XP region (right side of panel)
    // This covers both the label and value rows
    if (relativeY >= xpLabelY && relativeY < xpValueY + lineSpacing) {
      // Check if X is on the right side (rough approximation)
      if (relativeX > padding + 50) { // Assume Class XP takes right portion
        return 'Class XP';
      }
    }

    // Check if Y is within stats grid
    if (relativeY < statsStartY) {
      return null; // Above stats grid
    }

    // Calculate which stats row (0-4)
    const statsRowY = relativeY - statsStartY;
    const rowIndex = Math.floor(statsRowY / lineSpacing);

    if (rowIndex < 0 || rowIndex >= 5) {
      return null; // Outside stats grid rows
    }

    // Define stat labels (must match render order)
    const leftColumnStats = ['HP', 'P.Pow', 'M.Pow', 'Move', 'Courage'];
    const rightColumnStats = ['MP', 'P.Evd', 'M.Evd', 'Speed', 'Attunement'];

    // Calculate column layout (must match render method)
    const lastRegionWidth = (this as any).lastRegionWidth;
    const statsAreaWidth = lastRegionWidth - (padding * 2);
    const columnGap = 8;
    const columnWidth = (statsAreaWidth - columnGap) / 2;

    // The dividing line between columns is at the end of left column + half the gap
    const columnDivider = padding + columnWidth + (columnGap / 2);

    if (relativeX < columnDivider) {
      // Left column
      return leftColumnStats[rowIndex];
    } else {
      // Right column
      return rightColumnStats[rowIndex];
    }
  }

  /**
   * Override handleHover to include party selector, empty slots, and Class XP
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

    // Check if hovering over button (parent handles this)
    const buttonBounds = (this as any).buttonBounds;
    const wasButtonHovered = (this as any).isButtonHovered;
    if (buttonBounds) {
      const { x, y, width, height } = buttonBounds;
      (this as any).isButtonHovered = relativeX >= x && relativeX <= x + width &&
                                      relativeY >= y && relativeY <= y + height;
    } else {
      (this as any).isButtonHovered = false;
    }

    // Check if hovering over "Learn Abilities" button
    const wasLearnAbilitiesButtonHovered = this.isLearnAbilitiesButtonHovered;
    if (this.learnAbilitiesButtonBounds) {
      const { x, y, width, height } = this.learnAbilitiesButtonBounds;
      this.isLearnAbilitiesButtonHovered = relativeX >= x && relativeX <= x + width &&
                                           relativeY >= y && relativeY <= y + height;
    } else {
      this.isLearnAbilitiesButtonHovered = false;
    }

    // If hovering button, set button text as "hovered stat" for helper text
    if ((this as any).isButtonHovered) {
      const currentView = (this as any).currentView;
      const buttonText = currentView === 'stats' ? 'Set Abilities & Equipment' : 'Back';
      if ((this as any).hoveredStatId !== buttonText || wasButtonHovered !== (this as any).isButtonHovered) {
        (this as any).hoveredStatId = buttonText;
        return { statId: buttonText, buttonHovered: true };
      }
      return null;
    }

    // If hovering "Learn Abilities" button
    if (this.isLearnAbilitiesButtonHovered) {
      const buttonText = 'Learn Abilities';
      if ((this as any).hoveredStatId !== buttonText || wasLearnAbilitiesButtonHovered !== this.isLearnAbilitiesButtonHovered) {
        (this as any).hoveredStatId = buttonText;
        return { statId: buttonText, buttonHovered: true };
      }
      return null;
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

    // For stats view, handle stat hover (including Class XP)
    if (isStatsView) {
      const statId = this.getStatIdAtWithXp(relativeX, relativeY);

      // Update hover state if changed
      if (statId !== (this as any).hoveredStatId || wasButtonHovered) {
        (this as any).hoveredStatId = statId;
        return { statId };
      }

      // No change in hover state
      return null;
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

    // Call parent hover handler for non-empty ability/equipment slots in abilities view
    return super.handleHover(relativeX, relativeY);
  }

  /**
   * Override handleClick to include party selector, empty slots, and Learn Abilities button
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

    // Check if clicking on "Learn Abilities" button first
    if (this.learnAbilitiesButtonBounds) {
      const { x, y, width, height } = this.learnAbilitiesButtonBounds;
      if (relativeX >= x && relativeX <= x + width &&
          relativeY >= y && relativeY <= y + height) {
        return { type: 'learn-abilities' };
      }
    }

    // Check if clicking on party selector
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

    // For abilities view, check for ability slot clicks (both empty and filled)
    if ((this as any).currentView === 'abilities') {
      const slotLabel = this.getSlotLabelAtPosition(relativeX, relativeY);

      if (slotLabel !== null) {
        const isEmpty = this.isSlotEmpty(slotLabel);
        const slotType = this.getSlotType(slotLabel);

        if (isEmpty) {
          // Empty slot clicked
          return {
            type: 'empty-slot',
            slotLabel: slotLabel,
            slotType: slotType
          } as any; // Using 'as any' since we're adding a new click result type
        } else if (slotType === 'ability') {
          // Filled ability slot clicked - trigger set abilities panel
          const abilitySlots = ['Reaction', 'Passive', 'Movement'] as const;
          if (abilitySlots.includes(slotLabel as any)) {
            return {
              type: 'ability-slot-clicked',
              slotType: slotLabel as 'Reaction' | 'Passive' | 'Movement'
            };
          }
        }
      }
    }

    // Call parent click handler if not handled by selector or empty slot
    return super.handleClick(relativeX, relativeY);
  }
}

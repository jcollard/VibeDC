/**
 * Panel content for the Set Abilities main panel
 * Shows list of available abilities for the selected slot type
 */

import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion } from '../../combat/managers/panels/PanelContent';
import type { CombatUnit } from '../../combat/CombatUnit';
import type { CombatAbility } from '../../combat/CombatAbility';

const HOVERED_ABILITY_COLOR = '#ffff00'; // Yellow for hovered ability
const NORMAL_ABILITY_COLOR = '#ffffff'; // White for normal ability
const EQUIPPED_ABILITY_COLOR = '#00ff00'; // Green for currently equipped ability
const HEADER_COLOR = '#ff8c00'; // Dark orange for headers

/**
 * Panel content for the Set Abilities main panel
 * Shows abilities filtered by slot type (Reaction, Passive, or Movement)
 */
export class SetAbilitiesMainPanelContent implements PanelContent {
  private slotType: 'Reaction' | 'Passive' | 'Movement';
  private abilities: CombatAbility[] = [];
  private hoveredAbilityIndex: number | null = null;
  private abilityBounds: Array<{ x: number; y: number; width: number; height: number; abilityId: string }> = [];
  private equippedAbilityId: string | null = null;

  constructor(unit: CombatUnit, slotType: 'Reaction' | 'Passive' | 'Movement') {
    this.slotType = slotType;

    // Filter learned abilities by slot type
    this.abilities = Array.from(unit.learnedAbilities).filter(
      ability => ability.abilityType === slotType
    );

    // Store the currently equipped ability for this slot
    if (slotType === 'Reaction') {
      this.equippedAbilityId = unit.reactionAbility?.id ?? null;
    } else if (slotType === 'Passive') {
      this.equippedAbilityId = unit.passiveAbility?.id ?? null;
    } else if (slotType === 'Movement') {
      this.equippedAbilityId = unit.movementAbility?.id ?? null;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    _spriteImages?: Map<string, HTMLImageElement>,
    _spriteSize?: number
  ): void {
    if (!fontAtlasImage) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const padding = 4;
    const lineSpacing = 8;

    let currentY = region.y + padding;

    // Render header
    const headerText = `${this.slotType} Abilities`;
    FontAtlasRenderer.renderText(
      ctx,
      headerText,
      region.x + padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      HEADER_COLOR
    );

    currentY += lineSpacing + 2;

    // Clear ability bounds array
    this.abilityBounds = [];

    // Render each ability
    for (let i = 0; i < this.abilities.length; i++) {
      const ability = this.abilities[i];
      const isHovered = this.hoveredAbilityIndex === i;
      const isEquipped = ability.id === this.equippedAbilityId;

      // Determine ability name color based on state
      // Priority: Equipped (green) > Hovered (yellow) > Normal (white)
      let nameColor = NORMAL_ABILITY_COLOR;
      if (isEquipped) {
        nameColor = EQUIPPED_ABILITY_COLOR;
      } else if (isHovered) {
        nameColor = HOVERED_ABILITY_COLOR;
      }

      // Render ability name
      FontAtlasRenderer.renderText(
        ctx,
        ability.name,
        region.x + padding,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        nameColor
      );

      // Store bounds for hover/click detection (panel-relative coordinates)
      this.abilityBounds.push({
        x: padding,
        y: currentY - region.y,
        width: region.width - (padding * 2),
        height: lineSpacing,
        abilityId: ability.id
      });

      currentY += lineSpacing;
    }

    // If no abilities, show message
    if (this.abilities.length === 0) {
      const emptyMessage = `No ${this.slotType} abilities learned`;
      FontAtlasRenderer.renderText(
        ctx,
        emptyMessage,
        region.x + padding,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#888888'
      );
    }

    ctx.restore();
  }

  /**
   * Handle hover event
   */
  handleHover(relativeX: number, relativeY: number): unknown {
    let newHoveredAbilityIndex: number | null = null;

    // Check if hovering over any ability
    for (let i = 0; i < this.abilityBounds.length; i++) {
      const bounds = this.abilityBounds[i];
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        newHoveredAbilityIndex = i;
        break;
      }
    }

    // Check if hover state changed
    if (newHoveredAbilityIndex !== this.hoveredAbilityIndex) {
      this.hoveredAbilityIndex = newHoveredAbilityIndex;

      if (newHoveredAbilityIndex !== null) {
        return { type: 'ability-hover', abilityIndex: newHoveredAbilityIndex };
      } else {
        return { type: 'hover-cleared' };
      }
    }

    return null;
  }

  /**
   * Handle click event
   */
  handleClick(relativeX: number, relativeY: number): any {
    // Check if clicking on any ability
    for (const bounds of this.abilityBounds) {
      if (
        relativeX >= bounds.x &&
        relativeX <= bounds.x + bounds.width &&
        relativeY >= bounds.y &&
        relativeY <= bounds.y + bounds.height
      ) {
        // Ability was selected
        return {
          type: 'ability-selected',
          abilityId: bounds.abilityId,
          slotType: this.slotType
        };
      }
    }

    return null;
  }
}

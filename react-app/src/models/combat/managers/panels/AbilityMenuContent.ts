import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';
import { HELPER_TEXT, ENABLED_TEXT, HOVERED_TEXT, DISABLED_TEXT } from './colors';
import type { CombatAbility } from '../../CombatAbility';
import type { CombatUnit } from '../../CombatUnit';

/**
 * Configuration for ability menu panel appearance
 */
export interface AbilityMenuConfig {
  title: string;
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Button definition for ability menu
 */
interface AbilityButton {
  id: string;           // Ability ID
  label: string;        // Display text (ability name)
  enabled: boolean;     // Whether button is clickable
  helperText: string;   // Description shown on hover
  manaCost: number;     // Mana cost to display
}

/**
 * Panel content that displays ability selection menu for the active unit's turn.
 *
 * Displays clickable buttons for available Action abilities:
 * - Lists all learned Action abilities
 * - Shows mana cost if applicable
 * - Displays ability description on hover
 * - Disables abilities if not enough mana
 * - Includes Cancel button to return to main action menu
 *
 * Button states:
 * - Enabled: White text
 * - Disabled: Grey text (not enough mana or already used)
 * - Hovered: Yellow text
 */
export class AbilityMenuContent implements PanelContent {
  private readonly config: AbilityMenuConfig;
  private buttons: AbilityButton[];
  private hoveredButtonIndex: number | null = null;
  private buttonsDisabled: boolean = false;
  private currentUnit: CombatUnit | null = null;
  private lastRegionWidth: number = 0;
  private lastRegionHeight: number = 0;

  constructor(config: AbilityMenuConfig, unit: CombatUnit) {
    this.config = config;
    this.currentUnit = unit;
    this.buttons = this.buildButtonList(unit);
  }

  /**
   * Build the button list from the unit's learned Action abilities
   */
  private buildButtonList(unit: CombatUnit): AbilityButton[] {
    const buttons: AbilityButton[] = [];

    // Get all Action abilities
    const actionAbilities = Array.from(unit.learnedAbilities)
      .filter(ability => ability.abilityType === 'Action');

    // Create button for each ability
    for (const ability of actionAbilities) {
      const manaCost = this.getManaCost(ability);
      const canAfford = unit.mana >= manaCost;

      buttons.push({
        id: ability.id,
        label: this.formatAbilityLabel(ability.name, manaCost),
        enabled: canAfford,
        helperText: ability.description,
        manaCost
      });
    }

    // Add Cancel button at the end
    buttons.push({
      id: 'cancel',
      label: 'Cancel',
      enabled: true,
      helperText: 'Return to action menu',
      manaCost: 0
    });

    return buttons;
  }

  /**
   * Get mana cost from ability effects
   */
  private getManaCost(ability: CombatAbility): number {
    if (!ability.effects) return 0;

    const manaCostEffect = ability.effects.find(e => e.type === 'mana-cost');
    if (manaCostEffect) {
      return typeof manaCostEffect.value === 'number' ? manaCostEffect.value : 0;
    }

    return 0;
  }

  /**
   * Format ability label with mana cost
   */
  private formatAbilityLabel(name: string, manaCost: number): string {
    if (manaCost > 0) {
      return `${name} (${manaCost} MP)`;
    }
    return name;
  }

  /**
   * Update the ability menu for a new unit or state change
   */
  updateUnit(unit: CombatUnit): void {
    this.currentUnit = unit;
    this.buttons = this.buildButtonList(unit);

    // Validate hover index is still valid
    if (this.hoveredButtonIndex !== null &&
        this.hoveredButtonIndex >= this.buttons.length) {
      this.hoveredButtonIndex = null;
    }

    // Reset disabled state
    this.buttonsDisabled = false;
  }

  /**
   * Disable all buttons (called after a button is clicked)
   */
  disableButtons(): void {
    this.buttonsDisabled = true;
  }

  /**
   * Wrap text to fit within a maximum width
   * @param text - The text to wrap
   * @param maxWidth - Maximum width in pixels
   * @param fontId - Font ID for measuring character widths
   * @returns Array of wrapped lines
   */
  private wrapText(text: string, maxWidth: number, fontId: string): string[] {
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = FontAtlasRenderer.measureText(testLine, fontId).width;

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    // Cache region dimensions for bounds checking
    this.lastRegionWidth = region.width;
    this.lastRegionHeight = region.height;

    let currentY = region.y + this.config.padding;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      this.config.title,
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      this.config.titleColor
    );
    currentY += this.config.lineSpacing;

    // Render ability buttons
    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      const isHovered = this.hoveredButtonIndex === i;

      // Determine button color based on state
      let color: string;
      if (this.buttonsDisabled || !button.enabled) {
        color = DISABLED_TEXT;
      } else if (isHovered) {
        color = HOVERED_TEXT;
      } else {
        color = ENABLED_TEXT;
      }

      // Render button text
      FontAtlasRenderer.renderText(
        ctx,
        button.label,
        region.x + this.config.padding,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        color
      );

      currentY += this.config.lineSpacing;
    }

    // Render helper text if a button is hovered
    if (this.hoveredButtonIndex !== null) {
      const hoveredButton = this.buttons[this.hoveredButtonIndex];
      if (hoveredButton) {
        // Add 2px spacing after buttons
        currentY += 2;

        // Wrap helper text to fit within panel width
        const wrappedLines = this.wrapText(
          hoveredButton.helperText,
          region.width - (this.config.padding * 2),
          fontId
        );

        // Render each line of helper text
        for (const line of wrappedLines) {
          FontAtlasRenderer.renderText(
            ctx,
            line,
            region.x + this.config.padding,
            currentY,
            fontId,
            fontAtlasImage,
            1,
            'left',
            HELPER_TEXT
          );
          currentY += this.config.lineSpacing;
        }
      }
    }
  }

  handleClick(
    relativeX: number,
    relativeY: number
  ): PanelClickResult {
    // Ignore clicks if buttons are disabled
    if (this.buttonsDisabled) {
      return null;
    }

    // Ignore clicks if this is not the player's unit
    if (!this.currentUnit || !this.currentUnit.isPlayerControlled) {
      return null;
    }

    // Calculate which button was clicked based on Y position
    const buttonIndex = Math.floor(
      (relativeY - this.config.padding - this.config.lineSpacing) / this.config.lineSpacing
    );

    // Validate click is on a button
    if (buttonIndex < 0 || buttonIndex >= this.buttons.length) {
      return null;
    }

    const button = this.buttons[buttonIndex];

    // Check if button is enabled
    if (!button.enabled) {
      return null;
    }

    // Disable buttons after click (prevent double-click)
    this.buttonsDisabled = true;

    // Return appropriate result based on button ID
    if (button.id === 'cancel') {
      return { type: 'cancel-ability-selection' };
    }

    return { type: 'ability-selected', abilityId: button.id };
  }

  handleHover(relativeX: number, relativeY: number): void {
    // Calculate which button is being hovered
    const buttonIndex = Math.floor(
      (relativeY - this.config.padding - this.config.lineSpacing) / this.config.lineSpacing
    );

    // Validate hover is on a button
    if (buttonIndex < 0 || buttonIndex >= this.buttons.length) {
      this.hoveredButtonIndex = null;
      return;
    }

    this.hoveredButtonIndex = buttonIndex;
  }
}

import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';
import { HELPER_TEXT, ENABLED_TEXT, HOVERED_TEXT, DISABLED_TEXT } from './colors';
import type { CombatUnit } from '../../CombatUnit';
import type { HumanoidUnit } from '../../HumanoidUnit';

/**
 * Configuration for class actions menu panel appearance
 */
export interface ClassActionsMenuConfig {
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Button definition for class actions menu
 */
interface ClassActionButton {
  id: string;           // Action ID ('back', or ability ID)
  label: string;        // Display text
  enabled: boolean;     // Whether button is clickable
  helperText: string;   // Description shown on hover
}

/**
 * Panel content that displays class-specific action menu.
 *
 * Displays clickable buttons for:
 * - Class abilities (Action abilities from the selected class)
 * - Back button (returns to main actions menu)
 *
 * Button states:
 * - Enabled: White text
 * - Disabled: Grey text
 * - Hovered: Yellow text
 */
export class ClassActionsMenuContent implements PanelContent {
  private readonly config: ClassActionsMenuConfig;
  private buttons: ClassActionButton[];
  private hoveredButtonIndex: number | null = null;
  private buttonsDisabled: boolean = false;
  private currentUnit: CombatUnit | null = null;
  private lastRegionWidth: number = 0;
  private lastRegionHeight: number = 0;
  private className: string = '';

  constructor(config: ClassActionsMenuConfig, unit?: CombatUnit, classType?: 'primary' | 'secondary') {
    this.config = config;

    if (unit && classType) {
      this.currentUnit = unit;
      this.buttons = this.buildButtonList(unit, classType);
    } else {
      // Fallback: just Back button if no unit provided
      this.currentUnit = null;
      this.buttons = [
        {
          id: 'back',
          label: 'Back',
          enabled: true,
          helperText: 'Return to main actions menu'
        }
      ];
    }
  }

  /**
   * Update the class actions menu for a new unit
   * @param unit - The combat unit whose turn it is
   * @param classType - Which class menu to display (primary or secondary)
   * @param canAct - Whether the unit can still perform actions this turn
   */
  updateUnit(unit: CombatUnit, classType: 'primary' | 'secondary', canAct: boolean = true): void {
    this.currentUnit = unit;
    this.buttons = this.buildButtonList(unit, classType, canAct);
    this.buttonsDisabled = false;

    // Validate hover index is still valid
    if (this.hoveredButtonIndex !== null && this.hoveredButtonIndex >= this.buttons.length) {
      this.hoveredButtonIndex = null;
    }
  }

  /**
   * Build dynamic button list based on unit's class abilities
   * @param unit - The combat unit
   * @param classType - Which class to show abilities for
   * @param canAct - Whether the unit can still perform actions this turn
   */
  private buildButtonList(unit: CombatUnit, classType: 'primary' | 'secondary', canAct: boolean = true): ClassActionButton[] {
    const buttons: ClassActionButton[] = [];

    // Get the appropriate class
    const unitClass = classType === 'primary' ? unit.unitClass : unit.secondaryClass;
    if (!unitClass) {
      // No class (shouldn't happen for primary, but possible for secondary)
      buttons.push({
        id: 'back',
        label: 'Back',
        enabled: true,
        helperText: 'Return to main actions menu'
      });
      return buttons;
    }

    // Store class name for title display
    this.className = unitClass.name;

    // Cast to HumanoidUnit to access learnedAbilities
    const humanoidUnit = unit as HumanoidUnit;
    if (!('learnedAbilities' in humanoidUnit)) {
      // Not a humanoid unit, just show Back button
      buttons.push({
        id: 'back',
        label: 'Back',
        enabled: true,
        helperText: 'Return to main actions menu'
      });
      return buttons;
    }

    // Get all learned Action abilities that belong to this class
    const learnableAbilityIds = new Set(unitClass.learnableAbilities.map(a => a.id));
    const actionAbilities = Array.from(humanoidUnit.learnedAbilities).filter(
      ability => ability.abilityType === 'Action' && learnableAbilityIds.has(ability.id)
    );

    // Add buttons for each action ability
    for (const ability of actionAbilities) {
      buttons.push({
        id: `ability-${ability.id}`,
        label: ability.name,
        enabled: canAct,
        helperText: ability.description
      });
    }

    // Always add Back button at the end
    buttons.push({
      id: 'back',
      label: 'Back',
      enabled: true,
      helperText: 'Return to main actions menu'
    });

    return buttons;
  }

  /**
   * Get the current unit this menu is displaying actions for
   */
  getCurrentUnit(): CombatUnit | null {
    return this.currentUnit;
  }

  /**
   * Enable or disable all buttons (used to prevent double-clicks)
   */
  setButtonsDisabled(disabled: boolean): void {
    this.buttonsDisabled = disabled;
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

    // Cache region dimensions for bounds checking
    this.lastRegionWidth = region.width;
    this.lastRegionHeight = region.height;

    let currentY = region.y + this.config.padding;

    // Render title (class name + " ACTIONS")
    const title = this.className ? `${this.className.toUpperCase()} ACTIONS` : 'CLASS ACTIONS';
    FontAtlasRenderer.renderText(
      ctx,
      title,
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      this.config.titleColor
    );
    currentY += this.config.lineSpacing;

    // Render action buttons
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

    const buttonIndex = this.getButtonIndexAt(relativeX, relativeY);

    if (buttonIndex !== null) {
      const button = this.buttons[buttonIndex];

      // Only handle click if button is enabled
      if (button.enabled) {
        // Disable buttons to prevent double-clicks
        this.setButtonsDisabled(true);

        return {
          type: 'action-selected',
          actionId: button.id
        };
      }
    }

    return null;
  }

  handleHover(
    relativeX: number,
    relativeY: number
  ): unknown {
    // Check if mouse is outside panel bounds
    if (relativeX < 0 || relativeY < 0 ||
        relativeX >= this.lastRegionWidth ||
        relativeY >= this.lastRegionHeight) {
      // Clear hover state if mouse is outside panel
      if (this.hoveredButtonIndex !== null) {
        this.hoveredButtonIndex = null;
        return { buttonIndex: null };
      }
      return null;
    }

    // Ignore hover if this is not the player's unit
    if (!this.currentUnit || !this.currentUnit.isPlayerControlled) {
      // Clear hover state during enemy turns
      if (this.hoveredButtonIndex !== null) {
        this.hoveredButtonIndex = null;
        return { buttonIndex: null };
      }
      return null;
    }

    const buttonIndex = this.getButtonIndexAt(relativeX, relativeY);

    // Don't hover over disabled buttons
    let finalButtonIndex = buttonIndex;
    if (buttonIndex !== null) {
      const button = this.buttons[buttonIndex];
      if (!button.enabled) {
        finalButtonIndex = null; // Clear hover for disabled buttons
      }
    }

    // Update hover state if changed
    if (finalButtonIndex !== this.hoveredButtonIndex) {
      this.hoveredButtonIndex = finalButtonIndex;
      return { buttonIndex: finalButtonIndex };
    }

    return null;
  }

  /**
   * Wrap text to fit within a maximum width
   * @param text - Text to wrap
   * @param maxWidth - Maximum width in pixels
   * @param fontId - Font ID for text measurement
   * @returns Array of text lines
   */
  private wrapText(text: string, maxWidth: number, fontId: string): string[] {
    const font = FontRegistry.getById(fontId);
    if (!font) {
      return [text];
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = FontAtlasRenderer.measureText(testLine, font);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        // If current line has content, push it and start new line
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word itself is too long, just add it anyway
          lines.push(word);
        }
      }
    }

    // Add the last line
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }

  /**
   * Determine which button (if any) is at the given panel-relative coordinates
   * Returns button index or null if no button at that position
   */
  private getButtonIndexAt(_relativeX: number, relativeY: number): number | null {
    // Calculate button regions based on layout
    // Title line: padding
    // First button: padding + lineSpacing
    // Second button: padding + (lineSpacing * 2)
    // etc.

    const titleHeight = this.config.lineSpacing;
    const buttonsStartY = this.config.padding + titleHeight;

    // Check if click is below the title
    if (relativeY < buttonsStartY) {
      return null;
    }

    // Calculate which button line was clicked
    const buttonY = relativeY - buttonsStartY;
    const buttonIndex = Math.floor(buttonY / this.config.lineSpacing);

    // Check if button index is valid
    if (buttonIndex >= 0 && buttonIndex < this.buttons.length) {
      return buttonIndex;
    }

    return null;
  }
}

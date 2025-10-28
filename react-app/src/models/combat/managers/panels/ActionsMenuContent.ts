import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';
import { HELPER_TEXT, ENABLED_TEXT, HOVERED_TEXT, DISABLED_TEXT, ACTIVE_COLOR } from './colors';
import type { CombatUnit } from '../../CombatUnit';

/**
 * Configuration for actions menu panel appearance
 */
export interface ActionsMenuConfig {
  title: string;
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Button definition for actions menu
 */
interface ActionButton {
  id: string;           // Action ID ('delay', 'end-turn')
  label: string;        // Display text
  enabled: boolean;     // Whether button is clickable
  helperText: string;   // Description shown on hover
}

/**
 * Panel content that displays action menu for the active unit's turn.
 *
 * Displays clickable buttons for available actions:
 * - Delay: Set actionTimer to 50
 * - End Turn: Set actionTimer to 0
 *
 * Button states:
 * - Enabled: White text
 * - Disabled: Grey text (future implementation)
 * - Hovered: Yellow text
 */
export class ActionsMenuContent implements PanelContent {
  private readonly config: ActionsMenuConfig;
  private buttons: ActionButton[];
  private hoveredButtonIndex: number | null = null;
  private buttonsDisabled: boolean = false; // Disable after first click
  private currentUnit: CombatUnit | null = null;
  private lastRegionWidth: number = 0; // Cache region width for bounds checking
  private lastRegionHeight: number = 0; // Cache region height for bounds checking
  private activeButtonId: string | null = null; // Track which button is active (green)

  constructor(config: ActionsMenuConfig, unit?: CombatUnit) {
    this.config = config;

    if (unit) {
      this.currentUnit = unit;
      this.buttons = this.buildButtonList(unit);
    } else {
      // Fallback: just Delay and End Turn if no unit provided
      this.currentUnit = null;
      this.buttons = [
        {
          id: 'delay',
          label: 'Delay',
          enabled: true,
          helperText: 'Take no moves or actions and sets Action Timer to 50'
        },
        {
          id: 'end-turn',
          label: 'End Turn',
          enabled: true,
          helperText: 'Ends your turn and sets Action Timer to 0'
        }
      ];
    }
  }

  /**
   * Update the action menu for a new unit
   * @param unit - The combat unit whose turn it is
   * @param hasMoved - Whether the unit has moved this turn
   * @param activeAction - The currently active action (for highlighting)
   */
  updateUnit(unit: CombatUnit, hasMoved: boolean = false, activeAction: string | null = null): void {
    // Store current unit reference
    this.currentUnit = unit;
    this.activeButtonId = activeAction;

    // Rebuild button list with current state
    this.buttons = this.buildButtonList(unit, hasMoved);

    // Validate hover index is still valid
    if (this.hoveredButtonIndex !== null &&
        this.hoveredButtonIndex >= this.buttons.length) {
      this.hoveredButtonIndex = null;
    }

    // Mark buttons as enabled (reset disabled state from previous turn)
    this.buttonsDisabled = false;
  }

  /**
   * Build dynamic button list based on unit's stats, classes, and state
   * @param unit - The combat unit
   * @param hasMoved - Whether the unit has moved this turn
   */
  private buildButtonList(unit: CombatUnit, hasMoved: boolean = false): ActionButton[] {
    const buttons: ActionButton[] = [];

    // Move button (disabled if already moved)
    buttons.push({
      id: 'move',
      label: 'Move',
      enabled: !hasMoved,
      helperText: `Move this unit up to ${unit.movement} tiles`
    });

    // Attack button
    buttons.push({
      id: 'attack',
      label: 'Attack',
      enabled: true,
      helperText: 'Perform a basic attack with this unit\'s weapon'
    });

    // Primary class button
    const primaryClassName = unit.unitClass.name;
    buttons.push({
      id: 'primary-class',
      label: primaryClassName,
      enabled: true,
      helperText: `Perform a ${primaryClassName} action`
    });

    // Secondary class button (conditional)
    if (unit.secondaryClass) {
      const secondaryClassName = unit.secondaryClass.name;
      buttons.push({
        id: 'secondary-class',
        label: secondaryClassName,
        enabled: true,
        helperText: `Perform a ${secondaryClassName} action`
      });
    }

    // Delay button (disabled if already moved)
    buttons.push({
      id: 'delay',
      label: 'Delay',
      enabled: !hasMoved,
      helperText: 'Take no moves or actions and sets Action Timer to 50'
    });

    // End Turn button
    buttons.push({
      id: 'end-turn',
      label: 'End Turn',
      enabled: true,
      helperText: 'Ends your turn and sets Action Timer to 0'
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
    // Update all button states
    for (const button of this.buttons) {
      button.enabled = !disabled;
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

    // Render action buttons (no blank line after title)
    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      const isHovered = this.hoveredButtonIndex === i;
      const isActive = button.id === this.activeButtonId;

      // Determine button color based on state
      let color: string;
      if (!button.enabled) {
        color = DISABLED_TEXT;
      } else if (isActive) {
        color = ACTIVE_COLOR; // Green for active button
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
        // Disable buttons immediately after click
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

    // Update hover state if changed
    if (buttonIndex !== this.hoveredButtonIndex) {
      this.hoveredButtonIndex = buttonIndex;
      return { buttonIndex }; // Signal that hover state changed
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

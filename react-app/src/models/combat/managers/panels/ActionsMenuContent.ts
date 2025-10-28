import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';

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
  private readonly buttons: ActionButton[];
  private hoveredButtonIndex: number | null = null;
  private buttonsDisabled: boolean = false; // Disable after first click

  constructor(config: ActionsMenuConfig) {
    this.config = config;

    // Define action buttons
    this.buttons = [
      { id: 'delay', label: 'Delay', enabled: true },
      { id: 'end-turn', label: 'End Turn', enabled: true }
    ];
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
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

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

    // Skip a line after title
    currentY += this.config.lineSpacing;

    // Render action buttons
    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      const isHovered = this.hoveredButtonIndex === i;

      // Determine button color based on state
      let color: string;
      if (!button.enabled) {
        color = '#888888'; // Grey (disabled)
      } else if (isHovered) {
        color = '#ffff00'; // Yellow (hovered)
      } else {
        color = '#ffffff'; // White (enabled)
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
  }

  handleClick(
    relativeX: number,
    relativeY: number
  ): PanelClickResult {
    // Ignore clicks if buttons are disabled
    if (this.buttonsDisabled) {
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
    const buttonIndex = this.getButtonIndexAt(relativeX, relativeY);

    // Update hover state if changed
    if (buttonIndex !== this.hoveredButtonIndex) {
      this.hoveredButtonIndex = buttonIndex;
      return { buttonIndex }; // Signal that hover state changed
    }

    return null;
  }

  /**
   * Determine which button (if any) is at the given panel-relative coordinates
   * Returns button index or null if no button at that position
   */
  private getButtonIndexAt(_relativeX: number, relativeY: number): number | null {
    // Calculate button regions based on layout
    // Title line: padding
    // Blank line: padding + lineSpacing
    // First button: padding + (lineSpacing * 2)
    // Second button: padding + (lineSpacing * 3)
    // etc.

    const titleHeight = this.config.lineSpacing;
    const blankLineHeight = this.config.lineSpacing;
    const buttonsStartY = this.config.padding + titleHeight + blankLineHeight;

    // Check if click is below the title and blank line
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

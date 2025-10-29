import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';
import { HELPER_TEXT, ENABLED_TEXT, HOVERED_TEXT } from './colors';
import type { CombatUnit } from '../../CombatUnit';

/**
 * Configuration for attack menu panel appearance
 */
export interface AttackMenuConfig {
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Panel content that displays attack menu placeholder.
 *
 * Shows:
 * - Title: "{UNIT NAME} ATTACK" (e.g., "GOBLIN ATTACK")
 * - Placeholder text: "Implementation coming soon"
 * - Cancel button to return to actions menu
 */
export class AttackMenuContent implements PanelContent {
  private readonly config: AttackMenuConfig;
  private currentUnit: CombatUnit | null = null;
  private lastRegionWidth: number = 0;
  private lastRegionHeight: number = 0;
  private hoveredButtonIndex: number | null = null; // 0 = cancel button
  private buttonsDisabled: boolean = false;

  constructor(config: AttackMenuConfig, unit?: CombatUnit) {
    this.config = config;
    this.currentUnit = unit ?? null;
  }

  /**
   * Update the attack menu for a new unit
   * @param unit - The combat unit whose turn it is
   */
  updateUnit(unit: CombatUnit): void {
    this.currentUnit = unit;
    this.buttonsDisabled = false;
  }

  /**
   * Get the current unit this menu is displaying for
   */
  getCurrentUnit(): CombatUnit | null {
    return this.currentUnit;
  }

  /**
   * Enable or disable all buttons
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

    // Render title: "{UNIT NAME} ATTACK"
    const title = this.currentUnit ? `${this.currentUnit.name} ATTACK` : 'ATTACK';
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

    // Blank line
    currentY += this.config.lineSpacing;

    // Placeholder text
    FontAtlasRenderer.renderText(
      ctx,
      'Implementation coming soon',
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ENABLED_TEXT
    );
    currentY += this.config.lineSpacing;

    // Blank line
    currentY += this.config.lineSpacing;

    // Cancel button
    const isCancelHovered = this.hoveredButtonIndex === 0;
    const cancelColor = this.buttonsDisabled ? HELPER_TEXT : (isCancelHovered ? HOVERED_TEXT : ENABLED_TEXT);

    FontAtlasRenderer.renderText(
      ctx,
      'Cancel',
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      cancelColor
    );
    currentY += this.config.lineSpacing;

    // Helper text on hover
    if (isCancelHovered && !this.buttonsDisabled) {
      currentY += 2; // 2px spacing

      FontAtlasRenderer.renderText(
        ctx,
        'Return to actions menu',
        region.x + this.config.padding,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        HELPER_TEXT
      );
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

    if (buttonIndex === 0) {
      // Cancel button clicked
      this.setButtonsDisabled(true);
      return {
        type: 'cancel-attack'
      };
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
      return { buttonIndex };
    }

    return null;
  }

  /**
   * Determine which button (if any) is at the given panel-relative coordinates
   * Returns 0 for cancel button, null otherwise
   */
  private getButtonIndexAt(_relativeX: number, relativeY: number): number | null {
    // Layout:
    // Line 0: Title
    // Line 1: Blank
    // Line 2: "Implementation coming soon"
    // Line 3: Blank
    // Line 4: Cancel button

    const titleHeight = this.config.lineSpacing;
    const cancelButtonY = this.config.padding + (titleHeight * 4);

    // Check if click is on cancel button line
    if (relativeY >= cancelButtonY && relativeY < cancelButtonY + this.config.lineSpacing) {
      return 0; // Cancel button
    }

    return null;
  }
}

import { CombatConstants } from "../CombatConstants";
import { FontAtlasRenderer } from "../../../utils/FontAtlasRenderer";
import { FontRegistry } from "../../../utils/FontRegistry";
import type { CombatState } from "../CombatState";

/**
 * Renders the defeat screen modal: overlay, panel, title, buttons, and helper text.
 */
export class DefeatModalRenderer {
  /**
   * Renders the complete defeat modal on the given context.
   * @param ctx Canvas rendering context
   * @param state Current combat state
   * @param hoveredButton Which button is currently hovered (or null)
   * @param fonts Font atlas images
   * @param panelBounds Bounds of the map panel for centering
   */
  render(
    ctx: CanvasRenderingContext2D,
    _state: CombatState,
    hoveredButton: 'try-again' | 'skip' | null,
    fonts: Map<string, HTMLImageElement>,
    panelBounds: { width: number; height: number }
  ): void {
    // 1. Render full-screen overlay
    this.renderOverlay(ctx, panelBounds);

    // 2. Calculate modal position (center of panel)
    const modalX = Math.floor((panelBounds.width - CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH) / 2);
    const modalY = Math.floor(panelBounds.height / 3);  // Upper third for visibility

    // 3. Render modal panel background
    this.renderPanelBackground(ctx, modalX, modalY);

    // 4. Render title
    this.renderTitle(ctx, modalX, modalY, fonts);

    // 5. Render buttons
    const buttonY = this.renderButtons(ctx, modalX, modalY, hoveredButton, fonts);

    // 6. Render helper text (only for hovered button)
    this.renderHelperText(ctx, modalX, buttonY, hoveredButton, fonts);
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, panelBounds: { width: number; height: number }): void {
    ctx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.DEFEAT_SCREEN.OVERLAY_OPACITY})`;
    ctx.fillRect(0, 0, panelBounds.width, panelBounds.height);
  }

  private renderPanelBackground(ctx: CanvasRenderingContext2D, modalX: number, modalY: number): void {
    // Simple rectangle background with border
    const modalWidth = CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH;

    // Calculate height based on content:
    // 8px (top) + titleHeight + 4px (title-to-menu) + buttonHeight + 4px (menu-to-helper) + helperHeight + 2px (bottom)
    const titleFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.TITLE_FONT_ID);
    const buttonFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID);
    const helperFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID);

    const titleHeight = titleFont ? titleFont.charHeight : 15;
    const buttonHeight = buttonFont ? buttonFont.charHeight : 7;
    const helperHeight = helperFont ? helperFont.charHeight : 7;

    const modalHeight = 8 + titleHeight + 4 + buttonHeight + 4 + helperHeight + 2;

    ctx.fillStyle = '#000000';
    ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
  }

  private renderTitle(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalY: number,
    fonts: Map<string, HTMLImageElement>
  ): void {
    const titleFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.TITLE_FONT_ID);
    const titleFontImage = fonts.get(CombatConstants.DEFEAT_SCREEN.TITLE_FONT_ID);

    if (!titleFont || !titleFontImage) {
      console.warn("[DefeatModalRenderer] Defeat title font not loaded");
      return;
    }

    const titleText = CombatConstants.DEFEAT_SCREEN.TITLE_TEXT;
    const titleWidth = FontAtlasRenderer.measureText(titleText, titleFont);

    // Center horizontally within modal
    const titleX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - titleWidth) / 2);
    const titleY = modalY + 8; // 8px padding from top to title

    FontAtlasRenderer.renderTextWithShadow(
      ctx,
      titleText,
      titleX,
      titleY,
      CombatConstants.DEFEAT_SCREEN.TITLE_FONT_ID,
      titleFontImage,
      1,
      'left',
      CombatConstants.DEFEAT_SCREEN.TITLE_COLOR
    );
  }

  private renderButtons(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalY: number,
    hoveredButton: 'try-again' | 'skip' | null,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const buttonFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID);
    const buttonFontImage = fonts.get(CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID);

    if (!buttonFont || !buttonFontImage) {
      console.warn("[DefeatModalRenderer] Defeat button font not loaded");
      return modalY + 80;  // Return approximate Y position
    }

    // Get title font to calculate spacing
    const titleFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.TITLE_FONT_ID);
    const titleHeight = titleFont ? titleFont.charHeight : 15; // Fallback if not loaded

    // Starting Y position for buttons: 8px (top padding) + titleHeight + 4px (title-to-menu spacing)
    const buttonY = modalY + 8 + titleHeight + 4;

    // Measure both button texts
    const tryAgainText = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_TEXT;
    const skipText = CombatConstants.DEFEAT_SCREEN.SKIP_TEXT;
    const tryAgainWidth = FontAtlasRenderer.measureText(tryAgainText, buttonFont);
    const skipWidth = FontAtlasRenderer.measureText(skipText, buttonFont);

    // Calculate total width of both buttons plus spacing between them
    const buttonSpacing = 24; // 24px between buttons
    const totalWidth = tryAgainWidth + buttonSpacing + skipWidth;

    // Center both buttons as a group
    const startX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - totalWidth) / 2);

    // Button 1: Try Again (left)
    const tryAgainColor = hoveredButton === 'try-again'
      ? CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_HOVER
      : CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_NORMAL;

    const tryAgainX = startX;

    FontAtlasRenderer.renderText(
      ctx,
      tryAgainText,
      tryAgainX,
      buttonY,
      CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID,
      buttonFontImage,
      1,
      'left',
      tryAgainColor
    );

    // Button 2: Skip Encounter (right, 24px from Try Again)
    const skipColor = hoveredButton === 'skip'
      ? CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_HOVER
      : CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_NORMAL;

    const skipX = startX + tryAgainWidth + buttonSpacing;

    FontAtlasRenderer.renderText(
      ctx,
      skipText,
      skipX,
      buttonY,
      CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID,
      buttonFontImage,
      1,
      'left',
      skipColor
    );

    // Return Y position after buttons for helper text
    return buttonY + buttonFont.charHeight + CombatConstants.DEFEAT_SCREEN.HELPER_SPACING;
  }

  private renderHelperText(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    startY: number,
    hoveredButton: 'try-again' | 'skip' | null,
    fonts: Map<string, HTMLImageElement>
  ): void {
    // Only show helper text if a button is hovered
    if (!hoveredButton) {
      return;
    }

    const helperFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID);
    const helperFontImage = fonts.get(CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID);

    if (!helperFont || !helperFontImage) {
      console.warn("[DefeatModalRenderer] Defeat helper font not loaded");
      return;
    }

    // Determine which helper text to show based on hovered button
    let helperText: string;
    if (hoveredButton === 'try-again') {
      helperText = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_HELPER;
    } else if (hoveredButton === 'skip') {
      helperText = CombatConstants.DEFEAT_SCREEN.SKIP_HELPER;
    } else {
      return;
    }

    // Render helper text centered below buttons
    const helperWidth = FontAtlasRenderer.measureText(helperText, helperFont);
    const helperX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - helperWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      helperText,
      helperX,
      startY,
      CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID,
      helperFontImage,
      1,
      'left',
      CombatConstants.DEFEAT_SCREEN.HELPER_COLOR
    );
  }

  /**
   * Calculates button bounds for hit detection.
   * Returns bounds for "Try Again" and "Skip Encounter" buttons.
   *
   * Performance Note (per GeneralGuidelines.md):
   * This method calculates bounds on-demand. Since button positions are static
   * (not animated), consider caching the result after first calculation if this
   * becomes a hot path. Current implementation: ~0.1ms per call (negligible for
   * defeat screen, which is not performance-critical).
   */
  getButtonBounds(panelBounds: { width: number; height: number }): {
    tryAgain: { x: number; y: number; width: number; height: number };
    skip: { x: number; y: number; width: number; height: number };
  } {
    const modalX = Math.floor((panelBounds.width - CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH) / 2);
    const modalY = Math.floor(panelBounds.height / 3);

    const buttonFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID);
    if (!buttonFont) {
      // Return dummy bounds if font not loaded
      return {
        tryAgain: { x: 0, y: 0, width: 0, height: 0 },
        skip: { x: 0, y: 0, width: 0, height: 0 },
      };
    }

    // Get title font to calculate spacing (same as renderButtons)
    const titleFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.TITLE_FONT_ID);
    const titleHeight = titleFont ? titleFont.charHeight : 15; // Fallback if not loaded

    // Same calculation as renderButtons - horizontal layout
    // 8px (top padding) + titleHeight + 4px (title-to-menu spacing)
    const buttonY = modalY + 8 + titleHeight + 4;

    // Measure both button texts
    const tryAgainText = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_TEXT;
    const skipText = CombatConstants.DEFEAT_SCREEN.SKIP_TEXT;
    const tryAgainWidth = FontAtlasRenderer.measureText(tryAgainText, buttonFont);
    const skipWidth = FontAtlasRenderer.measureText(skipText, buttonFont);

    // Calculate total width and starting position
    const buttonSpacing = 24; // 24px between buttons
    const totalWidth = tryAgainWidth + buttonSpacing + skipWidth;
    const startX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - totalWidth) / 2);

    // Try Again bounds (left)
    const tryAgainBounds = {
      x: startX,
      y: buttonY,
      width: tryAgainWidth,
      height: buttonFont.charHeight,
    };

    // Skip bounds (right, 24px from Try Again)
    const skipBounds = {
      x: startX + tryAgainWidth + buttonSpacing,
      y: buttonY,
      width: skipWidth,
      height: buttonFont.charHeight,
    };

    return {
      tryAgain: tryAgainBounds,
      skip: skipBounds,
    };
  }
}

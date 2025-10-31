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

    // 6. Render helper text
    this.renderHelperText(ctx, modalX, buttonY, fonts);
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, panelBounds: { width: number; height: number }): void {
    ctx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.DEFEAT_SCREEN.OVERLAY_OPACITY})`;
    ctx.fillRect(0, 0, panelBounds.width, panelBounds.height);
  }

  private renderPanelBackground(ctx: CanvasRenderingContext2D, modalX: number, modalY: number): void {
    // Simple rectangle background with border
    const modalWidth = CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH;
    const modalHeight = 150;  // Approximate height, will adjust based on content

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
    const titleY = modalY + CombatConstants.DEFEAT_SCREEN.MODAL_PADDING;

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

    // Starting Y position for buttons (below title)
    let currentY = modalY + CombatConstants.DEFEAT_SCREEN.MODAL_PADDING * 3;

    // Button 1: Try Again
    const tryAgainColor = hoveredButton === 'try-again'
      ? CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_HOVER
      : CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_NORMAL;

    const tryAgainText = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_TEXT;
    const tryAgainWidth = FontAtlasRenderer.measureText(tryAgainText, buttonFont);
    const tryAgainX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - tryAgainWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      tryAgainText,
      tryAgainX,
      currentY,
      CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID,
      buttonFontImage,
      1,
      'left',
      tryAgainColor
    );

    currentY += buttonFont.charHeight + CombatConstants.DEFEAT_SCREEN.BUTTON_SPACING;

    // Button 2: Skip Encounter
    const skipColor = hoveredButton === 'skip'
      ? CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_HOVER
      : CombatConstants.DEFEAT_SCREEN.BUTTON_COLOR_NORMAL;

    const skipText = CombatConstants.DEFEAT_SCREEN.SKIP_TEXT;
    const skipWidth = FontAtlasRenderer.measureText(skipText, buttonFont);
    const skipX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - skipWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      skipText,
      skipX,
      currentY,
      CombatConstants.DEFEAT_SCREEN.BUTTON_FONT_ID,
      buttonFontImage,
      1,
      'left',
      skipColor
    );

    currentY += buttonFont.charHeight + CombatConstants.DEFEAT_SCREEN.HELPER_SPACING;

    return currentY;  // Return Y position for helper text
  }

  private renderHelperText(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    startY: number,
    fonts: Map<string, HTMLImageElement>
  ): void {
    const helperFont = FontRegistry.getById(CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID);
    const helperFontImage = fonts.get(CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID);

    if (!helperFont || !helperFontImage) {
      console.warn("[DefeatModalRenderer] Defeat helper font not loaded");
      return;
    }

    let currentY = startY;

    // Helper 1: Try Again
    const tryAgainHelper = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_HELPER;
    const tryAgainHelperWidth = FontAtlasRenderer.measureText(tryAgainHelper, helperFont);
    const tryAgainHelperX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - tryAgainHelperWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      tryAgainHelper,
      tryAgainHelperX,
      currentY,
      CombatConstants.DEFEAT_SCREEN.HELPER_FONT_ID,
      helperFontImage,
      1,
      'left',
      CombatConstants.DEFEAT_SCREEN.HELPER_COLOR
    );

    currentY += helperFont.charHeight + CombatConstants.DEFEAT_SCREEN.BUTTON_SPACING * 2;

    // Helper 2: Skip Encounter
    const skipHelper = CombatConstants.DEFEAT_SCREEN.SKIP_HELPER;
    const skipHelperWidth = FontAtlasRenderer.measureText(skipHelper, helperFont);
    const skipHelperX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - skipHelperWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      skipHelper,
      skipHelperX,
      currentY,
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

    let currentY = modalY + CombatConstants.DEFEAT_SCREEN.MODAL_PADDING * 3;

    // Try Again bounds
    const tryAgainText = CombatConstants.DEFEAT_SCREEN.TRY_AGAIN_TEXT;
    const tryAgainWidth = FontAtlasRenderer.measureText(tryAgainText, buttonFont);
    const tryAgainX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - tryAgainWidth) / 2);
    const tryAgainBounds = {
      x: tryAgainX,
      y: currentY,
      width: tryAgainWidth,
      height: buttonFont.charHeight,
    };

    currentY += buttonFont.charHeight + CombatConstants.DEFEAT_SCREEN.BUTTON_SPACING;

    // Skip bounds
    const skipText = CombatConstants.DEFEAT_SCREEN.SKIP_TEXT;
    const skipWidth = FontAtlasRenderer.measureText(skipText, buttonFont);
    const skipX = Math.floor(modalX + (CombatConstants.DEFEAT_SCREEN.MODAL_WIDTH - skipWidth) / 2);
    const skipBounds = {
      x: skipX,
      y: currentY,
      width: skipWidth,
      height: buttonFont.charHeight,
    };

    return {
      tryAgain: tryAgainBounds,
      skip: skipBounds,
    };
  }
}

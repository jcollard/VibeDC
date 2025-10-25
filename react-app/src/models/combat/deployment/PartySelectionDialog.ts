import { PartyMemberRegistry } from '../../../utils/PartyMemberRegistry';
import { renderDialogWithContent } from '../../../utils/DialogRenderer';
import { CharacterSelectionDialogContent } from '../../../components/combat/CharacterSelectionDialogContent';
import { UIConfig } from '../../../config/UIConfig';
import type { CombatEncounter } from '../CombatEncounter';
import type { CombatUIStateManager } from '../CombatUIState';

/**
 * Manages the party member selection dialog during deployment
 * Handles rendering and interaction with the character selection UI
 */
export class PartySelectionDialog {
  // UI state manager (optional - will use internal state if not provided)
  private uiStateManager: CombatUIStateManager | null = null;

  // Internal state (used when UIStateManager not provided)
  private hoveredCharacterIndex: number | null = null;
  private lastDialogBounds: { x: number; y: number; width: number; height: number } | null = null;

  /**
   * @param uiStateManager - Optional UI state manager for centralized state management
   */
  constructor(uiStateManager?: CombatUIStateManager) {
    this.uiStateManager = uiStateManager || null;
  }

  /**
   * Set the hovered character index in UI state
   */
  private setHoveredCharacterIndex(index: number | null): void {
    if (this.uiStateManager) {
      this.uiStateManager.setHoveredCharacter(index);
    } else {
      this.hoveredCharacterIndex = index;
    }
  }

  /**
   * Get the currently hovered character index
   */
  getHoveredCharacterIndex(): number | null {
    if (this.uiStateManager) {
      return this.uiStateManager.getState().hoveredCharacterIndex;
    }
    return this.hoveredCharacterIndex;
  }

  /**
   * Handle mouse move to detect hover over character rows in the dialog
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param characterCount - Number of characters in the list
   * @param selectedZoneIndex - Currently selected zone index (null if none selected)
   * @returns True if hovering over the dialog
   */
  handleMouseMove(
    canvasX: number,
    canvasY: number,
    characterCount: number,
    selectedZoneIndex: number | null
  ): boolean {
    // Only process hover if a zone is selected (dialog is visible)
    if (selectedZoneIndex === null || !this.lastDialogBounds) {
      this.setHoveredCharacterIndex(null);
      return false;
    }

    const { x: dialogX, y: dialogY, width: dialogWidth, height: dialogHeight } = this.lastDialogBounds;

    // Check if mouse is inside dialog bounds
    if (
      canvasX >= dialogX &&
      canvasX <= dialogX + dialogWidth &&
      canvasY >= dialogY &&
      canvasY <= dialogY + dialogHeight
    ) {
      // Calculate which character row is being hovered
      // Match CharacterSelectionDialogContent's layout
      const ROW_HEIGHT = 48;
      const TITLE_HEIGHT = 32 + 8; // Title font size + spacing
      const BORDER_PADDING = 24; // 0.5 tiles (24px at 48px tile size)

      const relativeY = canvasY - dialogY - BORDER_PADDING - TITLE_HEIGHT;
      const rowIndex = Math.floor(relativeY / ROW_HEIGHT);

      if (rowIndex >= 0 && rowIndex < characterCount) {
        this.setHoveredCharacterIndex(rowIndex);
      } else {
        this.setHoveredCharacterIndex(null);
      }

      return true;
    }

    this.setHoveredCharacterIndex(null);
    return false;
  }

  /**
   * Handle click on character in the selection dialog
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param characterCount - Number of characters in the list
   * @param selectedZoneIndex - Currently selected zone index (null if none selected)
   * @returns Character index if clicked, null otherwise
   */
  handleCharacterClick(
    canvasX: number,
    canvasY: number,
    characterCount: number,
    selectedZoneIndex: number | null
  ): number | null {
    // Only process click if a zone is selected (dialog is visible)
    if (selectedZoneIndex === null || !this.lastDialogBounds) {
      return null;
    }

    const { x: dialogX, y: dialogY, width: dialogWidth, height: dialogHeight } = this.lastDialogBounds;

    // Check if click is inside dialog bounds
    if (
      canvasX >= dialogX &&
      canvasX <= dialogX + dialogWidth &&
      canvasY >= dialogY &&
      canvasY <= dialogY + dialogHeight
    ) {
      // Calculate which character row was clicked
      const ROW_HEIGHT = 48;
      const TITLE_HEIGHT = 32 + 8; // Title font size + spacing
      const BORDER_PADDING = 24; // 0.5 tiles (24px at 48px tile size)

      const relativeY = canvasY - dialogY - BORDER_PADDING - TITLE_HEIGHT;
      const rowIndex = Math.floor(relativeY / ROW_HEIGHT);

      if (rowIndex >= 0 && rowIndex < characterCount) {
        return rowIndex;
      }
    }

    return null;
  }

  /**
   * Render the character selection dialog
   * @param ctx - Canvas rendering context
   * @param encounter - Current encounter
   * @param canvasWidth - Canvas width
   * @param tileSize - Size of each tile in pixels
   * @param spriteSize - Size of sprites in the sprite sheet
   * @param offsetX - X offset of the map on canvas
   * @param offsetY - Y offset of the map on canvas
   * @param dialogFont - Font to use for dialog text
   * @param spriteImages - Map of loaded sprite images
   * @param selectedZoneIndex - Currently selected zone index (null if none selected)
   */
  render(
    ctx: CanvasRenderingContext2D,
    encounter: CombatEncounter,
    canvasWidth: number,
    tileSize: number,
    spriteSize: number,
    offsetX: number,
    offsetY: number,
    dialogFont: string,
    spriteImages: Map<string, HTMLImageElement>,
    selectedZoneIndex: number | null
  ): void {
    // Only show dialog if a deployment zone is selected
    if (selectedZoneIndex === null) {
      return;
    }

    // Get the selected deployment zone position
    const selectedZone = encounter.playerDeploymentZones[selectedZoneIndex];
    if (!selectedZone) {
      return;
    }

    // Get all party members (supports 1-4 members)
    const partyMembers = PartyMemberRegistry.getAll();

    // Create dialog content with hover state and highlight color
    const dialogContent = new CharacterSelectionDialogContent(
      'Select a Character',
      partyMembers,
      dialogFont,
      spriteImages,
      tileSize,
      spriteSize,
      this.getHoveredCharacterIndex(),
      UIConfig.getHighlightColor()
    );

    // Measure the content bounds
    const bounds = dialogContent.measure(tileSize);

    // Calculate dialog size using the same logic as renderDialogWithContent
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const paddingPixels = 0; // Using 0 padding as in the render call

    const totalWidthPixels = contentWidth + (paddingPixels * 2);
    const totalHeightPixels = contentHeight + (paddingPixels * 2);

    // Convert to tiles (this is the interior size)
    const interiorWidth = Math.ceil(totalWidthPixels / tileSize) - 1;
    const interiorHeight = Math.ceil(totalHeightPixels / tileSize) - 1;

    // The actual dialog size includes the 9-slice borders (1 tile on each side)
    const actualDialogWidth = (interiorWidth + 2) * tileSize;
    const actualDialogHeight = (interiorHeight + 2) * tileSize;

    // Calculate the top-left corner of the selected zone in canvas coordinates
    const zoneX = selectedZone.x * tileSize + offsetX;
    const zoneY = selectedZone.y * tileSize + offsetY;

    // Calculate zone center
    const zoneCenterX = zoneX + (tileSize / 2);

    // Position dialog centered horizontally above the selected zone
    const dialogX = zoneCenterX - (actualDialogWidth / 2);
    const dialogY = zoneY - actualDialogHeight - 20; // 20px gap above the zone

    // Clamp dialog to stay within canvas bounds
    const clampedDialogX = Math.max(10, Math.min(dialogX, canvasWidth - actualDialogWidth - 10));
    const clampedDialogY = Math.max(10, Math.min(dialogY, canvasWidth - actualDialogHeight - 10));

    // Store dialog bounds for hover detection
    this.lastDialogBounds = {
      x: clampedDialogX,
      y: clampedDialogY,
      width: actualDialogWidth,
      height: actualDialogHeight
    };

    // Render dialog with auto-sizing, clamped to canvas bounds
    renderDialogWithContent(
      ctx,
      dialogContent,
      clampedDialogX,
      clampedDialogY,
      tileSize,
      spriteSize,
      spriteImages,
      undefined, // Use default 9-slice sprites
      0 // DEBUG: 0px padding
    );
  }
}

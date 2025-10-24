import type { CombatPhaseHandler, PhaseSprites, PhaseRenderContext } from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { CombatUnit } from './CombatUnit';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { PartyMemberRegistry, type PartyMemberDefinition } from '../../utils/PartyMemberRegistry';
import { renderDialogWithContent, renderTextWithShadow, getNineSliceSpriteIds } from '../../utils/DialogRenderer';
import { CharacterSelectionDialogContent } from '../../components/combat/CharacterSelectionDialogContent';
import { UIConfig } from '../../config/UIConfig';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClassRegistry } from '../../utils/UnitClassRegistry';
import { CanvasButton } from '../../components/ui/CanvasButton';

/**
 * Create a CombatUnit from a PartyMemberDefinition
 * Creates a basic unit - abilities and equipment will be added later as those systems are implemented
 */
export function createUnitFromPartyMember(member: PartyMemberDefinition): CombatUnit {
  // Get the unit class
  const unitClass = UnitClassRegistry.getById(member.unitClassId);
  if (!unitClass) {
    throw new Error(`Unit class not found: ${member.unitClassId}`);
  }

  // Create the humanoid unit with base stats
  const unit = new HumanoidUnit(
    member.name,
    unitClass,
    member.baseHealth,
    member.baseMana,
    member.basePhysicalPower,
    member.baseMagicPower,
    member.baseSpeed,
    member.baseMovement,
    member.basePhysicalEvade,
    member.baseMagicEvade,
    member.baseCourage,
    member.baseAttunement,
    member.spriteId
  );

  // TODO: Add learned abilities, equipment, and secondary class once setter methods are available
  // For now, the unit is created with just base stats

  return unit;
}

/**
 * DeploymentPhaseHandler manages the deployment phase of combat where players
 * position their units on designated deployment zones before battle begins.
 */
export class DeploymentPhaseHandler implements CombatPhaseHandler {
  private readonly deploymentSprite = 'gradients-7'; // Fill sprite for deployment zones
  private readonly borderSprite = 'particles-5'; // Border sprite for deployment zones

  // Animation state
  private elapsedTime = 0; // Time in seconds since phase started
  private readonly cycleTime = 1.0; // Time for full cycle (0.5s fade in + 0.5s fade out)
  private readonly minAlpha = 0.0;
  private readonly maxAlpha = 0.5;

  // Selection state
  private selectedZoneIndex: number | null = null;

  // Hover state for character selection
  private hoveredCharacterIndex: number | null = null;
  private lastDialogBounds: { x: number; y: number; width: number; height: number } | null = null;

  // Deploy button
  private deployButton: CanvasButton | null = null;

  /**
   * Update animation state
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @param deltaTime - Time elapsed since last update in seconds
   */
  update(state: CombatState, _encounter: CombatEncounter, deltaTime: number): CombatState | null {
    this.elapsedTime += deltaTime;
    return state; // No state changes, just internal animation
  }

  /**
   * Handle click on the canvas to select deployment zones
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param tileSize - Size of each tile in pixels
   * @param offsetX - X offset of the map on canvas
   * @param offsetY - Y offset of the map on canvas
   * @param encounter - Current encounter
   * @returns True if a zone was clicked
   */
  handleClick(
    canvasX: number,
    canvasY: number,
    tileSize: number,
    offsetX: number,
    offsetY: number,
    encounter: CombatEncounter
  ): boolean {
    // Convert canvas coordinates to tile coordinates
    const tileX = Math.floor((canvasX - offsetX) / tileSize);
    const tileY = Math.floor((canvasY - offsetY) / tileSize);

    // Check if click is on a deployment zone
    const clickedZoneIndex = encounter.playerDeploymentZones.findIndex(
      zone => zone.x === tileX && zone.y === tileY
    );

    if (clickedZoneIndex !== -1) {
      // Toggle selection: if already selected, deselect; otherwise select
      this.selectedZoneIndex = this.selectedZoneIndex === clickedZoneIndex ? null : clickedZoneIndex;
      return true;
    }

    return false;
  }

  /**
   * Get the currently selected zone index
   */
  getSelectedZoneIndex(): number | null {
    return this.selectedZoneIndex;
  }

  /**
   * Clear the selected deployment zone
   */
  clearSelectedZone(): void {
    this.selectedZoneIndex = null;
  }

  /**
   * Handle mouse move to detect hover over character rows in the dialog
   * Uses the last rendered dialog bounds
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param characterCount - Number of characters in the list
   * @returns True if hovering over the dialog
   */
  handleMouseMove(
    canvasX: number,
    canvasY: number,
    characterCount: number
  ): boolean {
    // Only process hover if a zone is selected (dialog is visible)
    if (this.selectedZoneIndex === null || !this.lastDialogBounds) {
      this.hoveredCharacterIndex = null;
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
        this.hoveredCharacterIndex = rowIndex;
      } else {
        this.hoveredCharacterIndex = null;
      }

      return true;
    }

    this.hoveredCharacterIndex = null;
    return false;
  }

  /**
   * Get the currently hovered character index
   */
  getHoveredCharacterIndex(): number | null {
    return this.hoveredCharacterIndex;
  }

  /**
   * Handle click on character in the selection dialog
   * Uses the last rendered dialog bounds
   * @param canvasX - X coordinate on canvas (in pixels)
   * @param canvasY - Y coordinate on canvas (in pixels)
   * @param characterCount - Number of characters in the list
   * @returns Character index if clicked, null otherwise
   */
  handleCharacterClick(
    canvasX: number,
    canvasY: number,
    characterCount: number
  ): number | null {
    // Only process click if a zone is selected (dialog is visible)
    if (this.selectedZoneIndex === null || !this.lastDialogBounds) {
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
   * Handle button mouse move for hover detection
   */
  handleButtonMouseMove(canvasX: number, canvasY: number): boolean {
    if (this.deployButton) {
      return this.deployButton.handleMouseMove(canvasX, canvasY);
    }
    return false;
  }

  /**
   * Handle button mouse down
   */
  handleButtonMouseDown(canvasX: number, canvasY: number): boolean {
    if (this.deployButton) {
      return this.deployButton.handleMouseDown(canvasX, canvasY);
    }
    return false;
  }

  /**
   * Handle button mouse up (triggers click if over button)
   */
  handleButtonMouseUp(canvasX: number, canvasY: number): boolean {
    if (this.deployButton) {
      return this.deployButton.handleMouseUp(canvasX, canvasY);
    }
    return false;
  }

  /**
   * Calculate the current alpha value for deployment zone animation
   * Oscillates between minAlpha and maxAlpha over cycleTime
   * Starts at minAlpha (0) and fades in
   */
  private calculateAlpha(): number {
    // Get position in current cycle (0 to 1)
    const cyclePosition = (this.elapsedTime % this.cycleTime) / this.cycleTime;

    // Use sine wave for smooth oscillation, offset by -π/2 to start at minimum
    // This makes sin start at -1 (minAlpha) and oscillate to 1 (maxAlpha)
    const sineValue = Math.sin((cyclePosition * Math.PI * 2) - (Math.PI / 2));

    // Map sine wave (-1 to 1) to alpha range (minAlpha to maxAlpha)
    const normalizedValue = (sineValue + 1) / 2; // Convert to 0-1 range
    return this.minAlpha + (normalizedValue * (this.maxAlpha - this.minAlpha));
  }

  /**
   * Get all sprites needed for the deployment phase
   */
  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    const spriteIds = new Set<string>();

    // Add deployment zone sprites
    spriteIds.add(this.deploymentSprite);
    spriteIds.add(this.borderSprite);

    // Add button sprites (normal, hover, active)
    spriteIds.add('ui-simple-4');
    spriteIds.add('ui-simple-5');
    spriteIds.add('ui-simple-6');

    // Add dialog UI sprites
    const dialogSprites = getNineSliceSpriteIds();
    dialogSprites.forEach(id => spriteIds.add(id));

    // Add character sprites for testing (first 3 party members)
    const partyMembers = PartyMemberRegistry.getAll();
    partyMembers.slice(0, 3).forEach(member => {
      if (member.spriteId) {
        spriteIds.add(member.spriteId);
      }
    });

    return { spriteIds };
  }

  /**
   * Render deployment phase overlays (zones only - rendered before units)
   */
  render(_state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

    // Render deployment zones (this happens before units are drawn)
    this.renderDeploymentZones(encounter, ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages);
  }

  /**
   * Render deployment phase UI elements (header and dialog - rendered after units)
   */
  renderUI(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, canvasSize, tileSize, spriteSize, offsetX, offsetY, spriteImages, headerFont, dialogFont } = context;

    // Render "Deploy Units" header
    this.renderPhaseHeader(ctx, canvasSize, headerFont);

    // Render waylaid message (8px below title)
    this.renderWaylaidMessage(ctx, canvasSize, dialogFont);

    // Calculate positions for instruction message and button
    const mapHeight = state.map.height * tileSize;
    const mapOffsetY = (canvasSize - mapHeight) / 2;
    const instructionY = mapOffsetY + mapHeight + 8;

    // Check if all units are deployed or all zones are occupied
    const partySize = PartyMemberRegistry.getAll().length;
    const deploymentZoneCount = encounter.playerDeploymentZones.length;
    const deployedUnitCount = state.unitManifest.getAllUnits().length;
    const shouldShowButton = deployedUnitCount >= partySize || deployedUnitCount >= deploymentZoneCount;

    // Render instruction message only if button is NOT visible
    if (!shouldShowButton) {
      this.renderInstructionMessage(ctx, canvasSize, spriteSize, spriteImages, dialogFont, instructionY);
    }

    // Initialize and render Start Combat button below map (only if deployment is complete)
    if (shouldShowButton) {
      if (!this.deployButton) {
        this.deployButton = new CanvasButton({
          label: 'Start Combat',
          x: canvasSize / 2 - 110, // Center button (220px wide)
          y: instructionY, // Same position as instruction message (8px below map)
          width: 220,
          height: 50,
          spriteId: 'ui-simple-4',
          hoverSpriteId: 'ui-simple-5',
          activeSpriteId: 'ui-simple-6',
          font: UIConfig.getButtonFont(),
          fontSize: 36,
          onClick: () => {
            console.log('Start Combat button clicked!');
          },
        });
      } else {
        // Update font in case it changed
        this.deployButton.updateConfig({ font: UIConfig.getButtonFont() });
      }
      this.deployButton.render(ctx, spriteImages);
    }

    // Render character selection dialog
    this.renderCharacterSelectionDialog(ctx, encounter, canvasSize, tileSize, spriteSize, offsetX, offsetY, dialogFont, spriteImages);
  }

  /**
   * Render the deployment zone overlays on the map
   */
  private renderDeploymentZones(
    encounter: CombatEncounter,
    ctx: CanvasRenderingContext2D,
    tileSize: number,
    spriteSize: number,
    offsetX: number,
    offsetY: number,
    spriteImages: Map<string, HTMLImageElement>
  ): void {
    const deploymentSprite = SpriteRegistry.getById(this.deploymentSprite);
    const borderSprite = SpriteRegistry.getById(this.borderSprite);

    if (!deploymentSprite || !borderSprite) {
      console.warn(`DeploymentPhaseHandler: Sprites "${this.deploymentSprite}" or "${this.borderSprite}" not found`);
      return;
    }

    const spriteImage = spriteImages.get(deploymentSprite.spriteSheet);
    const borderImage = spriteImages.get(borderSprite.spriteSheet);

    if (!spriteImage || !borderImage) {
      console.warn('DeploymentPhaseHandler: Deployment sprite images not loaded');
      return;
    }

    // Calculate animated alpha value
    const currentAlpha = this.calculateAlpha();

    // Render each deployment zone
    encounter.playerDeploymentZones.forEach((zone, index) => {
      const x = zone.x * tileSize + offsetX;
      const y = zone.y * tileSize + offsetY;

      // Draw the fill sprite with animated transparency
      ctx.save();
      ctx.globalAlpha = currentAlpha;

      const srcX = deploymentSprite.x * spriteSize;
      const srcY = deploymentSprite.y * spriteSize;
      const srcWidth = (deploymentSprite.width || 1) * spriteSize;
      const srcHeight = (deploymentSprite.height || 1) * spriteSize;

      ctx.drawImage(
        spriteImage,
        srcX, srcY, srcWidth, srcHeight,
        x, y, tileSize, tileSize
      );

      ctx.restore();

      // Draw the border sprite only if this zone is selected
      if (this.selectedZoneIndex === index) {
        const borderSrcX = borderSprite.x * spriteSize;
        const borderSrcY = borderSprite.y * spriteSize;
        const borderSrcWidth = (borderSprite.width || 1) * spriteSize;
        const borderSrcHeight = (borderSprite.height || 1) * spriteSize;

        ctx.drawImage(
          borderImage,
          borderSrcX, borderSrcY, borderSrcWidth, borderSrcHeight,
          x, y, tileSize, tileSize
        );
      }
    });
  }

  /**
   * Render the "Deploy Units" header message
   */
  private renderPhaseHeader(ctx: CanvasRenderingContext2D, canvasSize: number, headerFont: string): void {
    // Draw semi-transparent black background at top of screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvasSize, 80);

    // Render "Deploy Units" text with shadow
    renderTextWithShadow(
      ctx,
      'Deploy Units',
      canvasSize / 2,
      40,
      `bold 48px "${headerFont}", monospace`,
      '#ffffff',
      2,
      'center',
      'middle'
    );
  }

  /**
   * Render the instruction message with embedded sprite
   */
  private renderInstructionMessage(
    ctx: CanvasRenderingContext2D,
    canvasSize: number,
    spriteSize: number,
    spriteImages: Map<string, HTMLImageElement>,
    font: string,
    yPosition: number
  ): void {
    const fontSize = 36;
    const message = 'Click ';
    const message2 = ' to deploy a unit.';

    // Set up text rendering
    ctx.save();
    ctx.font = `${fontSize}px "${font}", monospace`;
    ctx.textBaseline = 'top';

    // Measure text parts
    const part1Width = ctx.measureText(message).width;
    const part2Width = ctx.measureText(message2).width;
    const spriteDisplaySize = fontSize;
    const totalWidth = part1Width + spriteDisplaySize + 4 + part2Width;
    let currentX = (canvasSize - totalWidth) / 2;

    // Render "Click "
    ctx.fillStyle = '#000000';
    ctx.fillText(message, currentX - 1, yPosition - 1);
    ctx.fillText(message, currentX + 1, yPosition - 1);
    ctx.fillText(message, currentX - 1, yPosition + 1);
    ctx.fillText(message, currentX + 1, yPosition + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, currentX, yPosition);
    currentX += part1Width;

    // Render deployment zone sprite
    const spriteDef = SpriteRegistry.getById(this.deploymentSprite);
    if (spriteDef) {
      const spriteImage = spriteImages.get(spriteDef.spriteSheet);
      if (spriteImage) {
        const srcX = spriteDef.x * spriteSize;
        const srcY = spriteDef.y * spriteSize;
        const srcWidth = (spriteDef.width || 1) * spriteSize;
        const srcHeight = (spriteDef.height || 1) * spriteSize;

        ctx.drawImage(
          spriteImage,
          srcX, srcY, srcWidth, srcHeight,
          currentX, yPosition, spriteDisplaySize, spriteDisplaySize
        );
      }
    }
    currentX += spriteDisplaySize + 4;

    // Render " to deploy a unit."
    ctx.fillStyle = '#000000';
    ctx.fillText(message2, currentX - 1, yPosition - 1);
    ctx.fillText(message2, currentX + 1, yPosition - 1);
    ctx.fillText(message2, currentX - 1, yPosition + 1);
    ctx.fillText(message2, currentX + 1, yPosition + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message2, currentX, yPosition);

    ctx.restore();
  }

  /**
   * Render the waylaid message below the Deploy Units title
   */
  private renderWaylaidMessage(
    ctx: CanvasRenderingContext2D,
    canvasSize: number,
    font: string
  ): void {
    const fontSize = 36;
    const yPosition = 88; // 8px below title background (which ends at y=80)
    const message = 'You have been waylaid by enemies and must defend yourself.';

    // Set up text rendering
    ctx.save();
    ctx.font = `${fontSize}px "${font}", monospace`;
    ctx.textBaseline = 'top';

    // Measure and center the text
    const textWidth = ctx.measureText(message).width;
    const currentX = (canvasSize - textWidth) / 2;

    // Render text with shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(message, currentX - 1, yPosition - 1);
    ctx.fillText(message, currentX + 1, yPosition - 1);
    ctx.fillText(message, currentX - 1, yPosition + 1);
    ctx.fillText(message, currentX + 1, yPosition + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, currentX, yPosition);

    ctx.restore();
  }

  /**
   * Render the character selection dialog
   */
  private renderCharacterSelectionDialog(
    ctx: CanvasRenderingContext2D,
    encounter: CombatEncounter,
    canvasSize: number,
    tileSize: number,
    spriteSize: number,
    offsetX: number,
    offsetY: number,
    dialogFont: string,
    spriteImages: Map<string, HTMLImageElement>
  ): void {
    // Only show dialog if a deployment zone is selected
    if (this.selectedZoneIndex === null) {
      return;
    }

    // Get the selected deployment zone position
    const selectedZone = encounter.playerDeploymentZones[this.selectedZoneIndex];
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
      this.hoveredCharacterIndex,
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
    const clampedDialogX = Math.max(10, Math.min(dialogX, canvasSize - actualDialogWidth - 10));
    const clampedDialogY = Math.max(10, Math.min(dialogY, canvasSize - actualDialogHeight - 10));

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

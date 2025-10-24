import type { CombatPhaseHandler, PhaseSprites, PhaseRenderContext } from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { renderDialogWithContent, renderTextWithShadow, getNineSliceSpriteIds } from '../../utils/DialogRenderer';
import { CharacterSelectionDialogContent } from '../../components/combat/CharacterSelectionDialogContent';

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
  private readonly minAlpha = 0.25;
  private readonly maxAlpha = 0.75;

  // Selection state
  private selectedZoneIndex: number | null = null;

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
   * Calculate the current alpha value for deployment zone animation
   * Oscillates between minAlpha and maxAlpha over cycleTime
   */
  private calculateAlpha(): number {
    // Get position in current cycle (0 to 1)
    const cyclePosition = (this.elapsedTime % this.cycleTime) / this.cycleTime;

    // Use sine wave for smooth oscillation
    // sin goes from 0 to 1 to 0 over the cycle
    const sineValue = Math.sin(cyclePosition * Math.PI * 2);

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
   * Render deployment phase UI elements
   */
  render(_state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, canvasSize, tileSize, spriteSize, offsetX, offsetY, spriteImages, headerFont, dialogFont } = context;

    // Render deployment zones
    this.renderDeploymentZones(encounter, ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages);

    // Render "Deploy Units" header
    this.renderPhaseHeader(ctx, canvasSize, headerFont);

    // Render character selection dialog
    this.renderCharacterSelectionDialog(ctx, canvasSize, tileSize, spriteSize, dialogFont, spriteImages);
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
    // Draw semi-transparent black background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 20, canvasSize, 80);

    // Render "Deploy Units" text with shadow
    renderTextWithShadow(
      ctx,
      'Deploy Units',
      canvasSize / 2,
      60,
      `bold 48px "${headerFont}", monospace`,
      '#ffffff',
      2,
      'center',
      'middle'
    );
  }

  /**
   * Render the character selection dialog
   */
  private renderCharacterSelectionDialog(
    ctx: CanvasRenderingContext2D,
    canvasSize: number,
    tileSize: number,
    spriteSize: number,
    dialogFont: string,
    spriteImages: Map<string, HTMLImageElement>
  ): void {
    // Only show dialog if a deployment zone is selected
    if (this.selectedZoneIndex === null) {
      return;
    }

    // Get the first 3 party members
    const partyMembers = PartyMemberRegistry.getAll().slice(0, 3);

    // Create dialog content
    const dialogContent = new CharacterSelectionDialogContent(
      'Select a Character',
      partyMembers,
      dialogFont,
      spriteImages,
      tileSize,
      spriteSize
    );

    // Measure the dialog to calculate centered position
    const bounds = dialogContent.measure(tileSize);
    const dialogSize = {
      width: Math.ceil(bounds.maxX / tileSize) + 4, // +4 for borders and padding
      height: Math.ceil(bounds.maxY / tileSize) + 4
    };

    // Center horizontally and position near bottom
    const dialogX = (canvasSize - (dialogSize.width * tileSize)) / 2;
    const dialogY = canvasSize - (dialogSize.height * tileSize) - 40;

    // Render dialog with auto-sizing (0px padding for debug)
    renderDialogWithContent(
      ctx,
      dialogContent,
      dialogX,
      dialogY,
      tileSize,
      spriteSize,
      spriteImages,
      undefined, // Use default 9-slice sprites
      0 // DEBUG: 0px padding
    );
  }
}

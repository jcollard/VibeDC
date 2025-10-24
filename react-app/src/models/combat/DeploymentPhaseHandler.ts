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

    // Render each deployment zone
    for (const zone of encounter.playerDeploymentZones) {
      const x = zone.x * tileSize + offsetX;
      const y = zone.y * tileSize + offsetY;

      // Draw the fill sprite with 50% transparency
      ctx.save();
      ctx.globalAlpha = 0.5;

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

      // Draw the border sprite with full opacity
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

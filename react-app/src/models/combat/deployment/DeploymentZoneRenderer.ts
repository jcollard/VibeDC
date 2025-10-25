import { SpriteRegistry } from '../../../utils/SpriteRegistry';
import { CombatConstants } from '../CombatConstants';
import type { CombatEncounter } from '../CombatEncounter';

/**
 * Renders deployment zone overlays with animated pulsing effect
 * Handles the visual representation of deployment zones on the map
 */
export class DeploymentZoneRenderer {
  private readonly deploymentSprite = 'gradients-7'; // Fill sprite for deployment zones
  private readonly borderSprite = 'particles-5'; // Border sprite for selected zone

  // Animation state
  private elapsedTime = 0; // Time in seconds since phase started
  private readonly cycleTime = CombatConstants.ANIMATION.DEPLOYMENT_ZONE.CYCLE_TIME;
  private readonly minAlpha = CombatConstants.ANIMATION.DEPLOYMENT_ZONE.MIN_ALPHA;
  private readonly maxAlpha = CombatConstants.ANIMATION.DEPLOYMENT_ZONE.MAX_ALPHA;

  /**
   * Update the animation timer
   * @param deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
  }

  /**
   * Reset animation state (called when phase starts)
   */
  reset(): void {
    this.elapsedTime = 0;
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
   * Get sprite IDs required for rendering deployment zones
   */
  getRequiredSprites(): string[] {
    return [this.deploymentSprite, this.borderSprite];
  }

  /**
   * Render the deployment zone overlays on the map
   * @param encounter - Combat encounter containing deployment zones
   * @param ctx - Canvas rendering context
   * @param tileSize - Size of each tile in pixels
   * @param spriteSize - Size of sprites in the sprite sheet
   * @param offsetX - X offset for map rendering
   * @param offsetY - Y offset for map rendering
   * @param spriteImages - Map of loaded sprite images
   * @param selectedZoneIndex - Index of the currently selected zone (or null)
   */
  render(
    encounter: CombatEncounter,
    ctx: CanvasRenderingContext2D,
    tileSize: number,
    spriteSize: number,
    offsetX: number,
    offsetY: number,
    spriteImages: Map<string, HTMLImageElement>,
    selectedZoneIndex: number | null
  ): void {
    const deploymentSprite = SpriteRegistry.getById(this.deploymentSprite);
    const borderSprite = SpriteRegistry.getById(this.borderSprite);

    if (!deploymentSprite || !borderSprite) {
      console.warn(`DeploymentZoneRenderer: Sprites "${this.deploymentSprite}" or "${this.borderSprite}" not found`);
      return;
    }

    const spriteImage = spriteImages.get(deploymentSprite.spriteSheet);
    const borderImage = spriteImages.get(borderSprite.spriteSheet);

    if (!spriteImage || !borderImage) {
      console.warn('DeploymentZoneRenderer: Deployment sprite images not loaded');
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
      if (selectedZoneIndex === index) {
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
}

import type { CombatPhaseHandler, PhaseSprites, PhaseRenderContext } from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { CombatUnit } from './CombatUnit';
import { PartyMemberRegistry, type PartyMemberDefinition } from '../../utils/PartyMemberRegistry';
import { getNineSliceSpriteIds } from '../../utils/DialogRenderer';
import { UIConfig } from '../../config/UIConfig';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClassRegistry } from '../../utils/UnitClassRegistry';
import { CanvasButton } from '../../components/ui/CanvasButton';
import { CombatConstants } from './CombatConstants';
import type { CombatUIStateManager } from './CombatUIState';
import { DeploymentUI } from './deployment/DeploymentUI';
import { DeploymentZoneRenderer } from './deployment/DeploymentZoneRenderer';
import { UnitDeploymentManager } from './deployment/UnitDeploymentManager';
import { PartySelectionDialog } from './deployment/PartySelectionDialog';

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
  // Animation state (for non-zone animations)
  private elapsedTime = 0; // Time in seconds since phase started

  // Deploy button
  private deployButton: CanvasButton | null = null;

  // UI renderer
  private ui: DeploymentUI;

  // Zone renderer
  private zoneRenderer: DeploymentZoneRenderer;

  // Deployment manager
  private deploymentManager: UnitDeploymentManager;

  // Party selection dialog
  private partyDialog: PartySelectionDialog;

  /**
   * @param uiStateManager - Optional UI state manager for centralized state management
   */
  constructor(uiStateManager?: CombatUIStateManager) {
    this.ui = new DeploymentUI();
    this.zoneRenderer = new DeploymentZoneRenderer();
    this.deploymentManager = new UnitDeploymentManager(uiStateManager);
    this.partyDialog = new PartySelectionDialog(uiStateManager);
  }

  /**
   * Update animation state
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @param deltaTime - Time elapsed since last update in seconds
   */
  update(state: CombatState, _encounter: CombatEncounter, deltaTime: number): CombatState | null {
    this.elapsedTime += deltaTime;
    this.zoneRenderer.update(deltaTime);
    return state; // No state changes, just internal animation
  }

  /**
   * Handle click on the canvas to select deployment zones
   * Delegates to UnitDeploymentManager
   */
  handleClick(
    canvasX: number,
    canvasY: number,
    tileSize: number,
    offsetX: number,
    offsetY: number,
    encounter: CombatEncounter
  ): boolean {
    return this.deploymentManager.handleClick(canvasX, canvasY, tileSize, offsetX, offsetY, encounter);
  }

  /**
   * Get the currently selected zone index
   * Delegates to UnitDeploymentManager
   */
  getSelectedZoneIndex(): number | null {
    return this.deploymentManager.getSelectedZoneIndex();
  }

  /**
   * Clear the selected deployment zone
   * Delegates to UnitDeploymentManager
   */
  clearSelectedZone(): void {
    this.deploymentManager.clearSelectedZone();
  }

  /**
   * Handle mouse move to detect hover over character rows in the dialog
   * Delegates to PartySelectionDialog
   */
  handleMouseMove(
    canvasX: number,
    canvasY: number,
    characterCount: number
  ): boolean {
    return this.partyDialog.handleMouseMove(
      canvasX,
      canvasY,
      characterCount,
      this.getSelectedZoneIndex()
    );
  }

  /**
   * Get the currently hovered character index
   * Delegates to PartySelectionDialog
   */
  getHoveredCharacterIndex(): number | null {
    return this.partyDialog.getHoveredCharacterIndex();
  }

  /**
   * Handle click on character in the selection dialog
   * Delegates to PartySelectionDialog
   */
  handleCharacterClick(
    canvasX: number,
    canvasY: number,
    characterCount: number
  ): number | null {
    return this.partyDialog.handleCharacterClick(
      canvasX,
      canvasY,
      characterCount,
      this.getSelectedZoneIndex()
    );
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
   * Get all sprites needed for the deployment phase
   */
  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    const spriteIds = new Set<string>();

    // Add deployment zone sprites
    this.zoneRenderer.getRequiredSprites().forEach(id => spriteIds.add(id));

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
    this.zoneRenderer.render(
      encounter,
      ctx,
      tileSize,
      spriteSize,
      offsetX,
      offsetY,
      spriteImages,
      this.getSelectedZoneIndex()
    );
  }

  /**
   * Render deployment phase UI elements (header and dialog - rendered after units)
   */
  renderUI(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, canvasWidth, canvasHeight, tileSize, spriteSize, offsetX, offsetY, spriteImages, headerFont, dialogFont } = context;

    // Render "Deploy Units" header
    this.ui.renderPhaseHeader(ctx, canvasWidth, headerFont);

    // Render waylaid message (8px below title)
    this.ui.renderWaylaidMessage(ctx, canvasWidth, dialogFont);

    // Calculate positions for instruction message and button
    const mapHeight = state.map.height * tileSize;
    const mapOffsetY = (canvasHeight - mapHeight) / 2;
    const instructionY = mapOffsetY + mapHeight + CombatConstants.UI.MESSAGE_SPACING;

    // Check if all units are deployed or all zones are occupied
    const partySize = PartyMemberRegistry.getAll().length;
    const deploymentZoneCount = encounter.playerDeploymentZones.length;
    const deployedUnitCount = state.unitManifest.getAllUnits().length;
    const shouldShowButton = deployedUnitCount >= partySize || deployedUnitCount >= deploymentZoneCount;

    // Render instruction message only if button is NOT visible
    if (!shouldShowButton) {
      this.ui.renderInstructionMessage(ctx, canvasWidth, spriteSize, spriteImages, dialogFont, instructionY);
    }

    // Initialize and render Start Combat button below map (only if deployment is complete)
    if (shouldShowButton) {
      if (!this.deployButton) {
        this.deployButton = new CanvasButton({
          label: CombatConstants.TEXT.START_COMBAT_BUTTON,
          x: canvasWidth / 2 - CombatConstants.UI.BUTTON.WIDTH / 2, // Center button
          y: instructionY, // Same position as instruction message (MESSAGE_SPACING below map)
          width: CombatConstants.UI.BUTTON.WIDTH,
          height: CombatConstants.UI.BUTTON.HEIGHT,
          spriteId: 'ui-simple-4',
          hoverSpriteId: 'ui-simple-5',
          activeSpriteId: 'ui-simple-6',
          font: UIConfig.getButtonFont(),
          fontSize: CombatConstants.UI.BUTTON.FONT_SIZE,
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
    this.partyDialog.render(
      ctx,
      encounter,
      canvasWidth,
      tileSize,
      spriteSize,
      offsetX,
      offsetY,
      dialogFont,
      spriteImages,
      this.getSelectedZoneIndex()
    );
  }
}

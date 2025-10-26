import type {
  PhaseSprites,
  PhaseRenderContext,
  PhaseEventResult,
  MouseEventContext,
  InfoPanelContext
} from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { CombatUnit } from './CombatUnit';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { getNineSliceSpriteIds } from '../../utils/DialogRenderer';
import { CombatConstants } from './CombatConstants';
import type { CombatUIStateManager } from './CombatUIState';
import { DeploymentUI } from './deployment/DeploymentUI';
import { DeploymentZoneRenderer } from './deployment/DeploymentZoneRenderer';
import { UnitDeploymentManager } from './deployment/UnitDeploymentManager';
import { PartySelectionDialog } from './deployment/PartySelectionDialog';
import { PhaseBase } from './PhaseBase';
import { CombatUnitManifest } from './CombatUnitManifest';
import { DeploymentHeaderRenderer } from './managers/renderers/DeploymentHeaderRenderer';
import { PartyMembersContent } from './managers/panels';

/**
 * DeploymentPhaseHandler manages the deployment phase of combat where players
 * position their units on designated deployment zones before battle begins.
 * Extends PhaseBase for common phase infrastructure.
 */
export class DeploymentPhaseHandler extends PhaseBase {
  // UI renderer
  private ui: DeploymentUI;

  // Zone renderer
  private zoneRenderer: DeploymentZoneRenderer;

  // Deployment manager
  private deploymentManager: UnitDeploymentManager;

  // Party selection dialog
  private partyDialog: PartySelectionDialog;

  // Cached panel content for hover detection (per GeneralGuidelines.md - don't recreate every frame)
  private hoverDetectionContent: PartyMembersContent | null = null;

  /**
   * @param uiStateManager - Optional UI state manager for centralized state management
   */
  constructor(uiStateManager?: CombatUIStateManager) {
    super();
    this.ui = new DeploymentUI();
    this.zoneRenderer = new DeploymentZoneRenderer();
    this.deploymentManager = new UnitDeploymentManager(uiStateManager);
    this.partyDialog = new PartySelectionDialog(uiStateManager);
  }

  /**
   * Update deployment phase animations (zone pulsing)
   * @param state - Current combat state
   * @param encounter - Current encounter
   * @param deltaTime - Time elapsed since last update in seconds
   */
  protected updatePhase(state: CombatState, _encounter: CombatEncounter, deltaTime: number): CombatState | null {
    this.zoneRenderer.update(deltaTime);
    return state; // No state changes, just internal animation
  }

  /**
   * Handle click on a map tile to select deployment zones
   * Delegates to UnitDeploymentManager
   */
  handleTileClick(
    tileX: number,
    tileY: number,
    encounter: CombatEncounter
  ): boolean {
    return this.deploymentManager.handleTileClick(tileX, tileY, encounter);
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
   * Handle deployment of a party member to the selected zone
   * @param memberIndex - Index of the party member in the registry
   * @param combatState - Current combat state
   * @param encounter - Current encounter
   * @returns Object with new combat state and log message if deployment succeeded, null otherwise
   */
  handlePartyMemberDeployment(
    memberIndex: number,
    combatState: CombatState,
    encounter: CombatEncounter
  ): { newState: CombatState; logMessage: string } | null {
    // 1. Check if a zone is selected
    const selectedZoneIndex = this.getSelectedZoneIndex();
    if (selectedZoneIndex === null) {
      return null;
    }

    // 2. Get the party member and deployment zone
    const partyMembers = PartyMemberRegistry.getAll();
    const selectedMember = partyMembers[memberIndex];
    const deploymentZone = encounter.playerDeploymentZones[selectedZoneIndex];

    if (!selectedMember || !deploymentZone) {
      return null;
    }

    // 3. Create unit and update manifest
    try {
      const unit = PartyMemberRegistry.createPartyMember(selectedMember.id);
      if (!unit) {
        console.error(`Failed to create party member: ${selectedMember.id}`);
        return null;
      }
      const newManifest = new CombatUnitManifest();

      // Copy existing units, excluding any unit at the deployment zone
      combatState.unitManifest.getAllUnits().forEach(placement => {
        // Skip the unit at the deployment position (it will be replaced)
        if (placement.position.x !== deploymentZone.x || placement.position.y !== deploymentZone.y) {
          newManifest.addUnit(placement.unit, placement.position);
        }
      });

      // Add new unit at the deployment zone
      newManifest.addUnit(unit, deploymentZone);

      // Clear the selected zone after deploying
      this.clearSelectedZone();

      // Create log message with unit name and position (using green color #00ff00)
      const logMessage = `[color=#00ff00]${unit.name}[/color] deployed to (${deploymentZone.x}, ${deploymentZone.y})`;

      // Return updated combat state and log message
      return {
        newState: {
          ...combatState,
          unitManifest: newManifest
        },
        logMessage
      };
    } catch (error) {
      console.error('Failed to deploy unit:', error);
      return null;
    }
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
    const { ctx, canvasWidth, canvasHeight, tileSize, spriteSize, offsetX, offsetY, spriteImages, titleAtlasFontId, messageAtlasFontId, dialogAtlasFontId, fontAtlasImages } = context;

    // Render "Deploy Units" header
    this.ui.renderPhaseHeader(ctx, canvasWidth, '', titleAtlasFontId || '15px-dungeonslant');

    // Render waylaid message (8px below title)
    this.ui.renderWaylaidMessage(ctx, canvasWidth, '', messageAtlasFontId || '7px-04b03');

    // Calculate positions for instruction message and button
    const mapHeight = state.map.height * tileSize;
    const mapOffsetY = (canvasHeight - mapHeight) / 2;
    const instructionY = mapOffsetY + mapHeight + CombatConstants.UI.MESSAGE_SPACING;

    // Check if all units are deployed or all zones are occupied
    const partySize = PartyMemberRegistry.getAll().length;
    const deploymentZoneCount = encounter.playerDeploymentZones.length;
    const deployedUnitCount = state.unitManifest.getAllUnits().length;
    const shouldShowButton = deployedUnitCount >= partySize || deployedUnitCount >= deploymentZoneCount;

    // Render instruction message
    // Note: The "Enter Combat" button is now handled by PartyMembersContent in the info panel
    if (!shouldShowButton) {
      this.ui.renderInstructionMessage(ctx, canvasWidth, spriteSize, spriteImages, '', instructionY, messageAtlasFontId || '7px-04b03');
    }

    // Get the dialog font atlas image
    const dialogFontIdToUse = dialogAtlasFontId || '7px-04b03';
    const fontAtlasImage = fontAtlasImages?.get(dialogFontIdToUse) || null;

    // Render character selection dialog
    this.partyDialog.render(
      ctx,
      encounter,
      canvasWidth,
      tileSize,
      spriteSize,
      offsetX,
      offsetY,
      dialogFontIdToUse,
      fontAtlasImage,
      spriteImages,
      this.getSelectedZoneIndex()
    );
  }

  // --- PHASE-AGNOSTIC EVENT HANDLERS ---

  /**
   * Handle map tile clicks - select deployment zones or deploy units
   */
  handleMapClick(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult {
    const { tileX, tileY } = context;
    if (tileX === undefined || tileY === undefined) {
      return { handled: false };
    }

    // Check if a unit is at this position
    const unitAtPosition = state.unitManifest.getAllUnits().find(
      placement => placement.position.x === tileX && placement.position.y === tileY
    );

    // Get the selected zone before the click
    const previousSelection = this.getSelectedZoneIndex();

    // Attempt to handle tile click (deployment zone selection)
    const zoneWasClicked = this.handleTileClick(tileX, tileY, encounter);

    // Determine if we should log a message
    let logMessage: string | undefined;
    if (zoneWasClicked) {
      const currentSelection = this.getSelectedZoneIndex();
      if (currentSelection !== null && currentSelection !== previousSelection) {
        logMessage = CombatConstants.TEXT.SELECT_PARTY_MEMBER;
      }
    }

    // Return result indicating the click was handled
    return {
      handled: zoneWasClicked || unitAtPosition !== undefined,
      logMessage
    };
  }

  /**
   * Handle mouse down - forward to party dialog
   * Note: Button is now handled by PartyMembersContent in info panel
   */
  handleMouseDown(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return { handled: false };
  }

  /**
   * Handle mouse up - forward to party dialog
   * Note: Button is now handled by PartyMembersContent in info panel
   */
  handleMouseUp(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return { handled: false };
  }

  /**
   * Handle mouse move - update hover states for party dialog
   * Note: Button hover is now handled by PartyMembersContent in info panel
   */
  handleMouseMove(
    context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const { canvasX, canvasY } = context;
    const partySize = PartyMemberRegistry.getAll().length;

    // Update party dialog hover state
    const dialogHandled = this.partyDialog.handleMouseMove(
      canvasX,
      canvasY,
      partySize,
      this.getSelectedZoneIndex()
    );

    return { handled: dialogHandled };
  }

  /**
   * Handle info panel click - deploy party member at selected zone
   * Note: This method is now unused as CombatView calls handlePartyMemberDeployment directly
   * Keeping it for backwards compatibility
   */
  handleInfoPanelClick(
    _relativeX: number,
    _relativeY: number,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return { handled: false };
  }

  /**
   * Handle info panel hover - update hover state for party members
   * Returns the hovered party member unit for display in target panel
   */
  handleInfoPanelHover(
    relativeX: number,
    relativeY: number,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    // Get party members to handle the hover
    const partyUnits = PartyMemberRegistry.getAll()
      .map(member => PartyMemberRegistry.createPartyMember(member.id))
      .filter((unit): unit is CombatUnit => unit !== undefined);

    if (partyUnits.length === 0) {
      return { handled: false };
    }

    // Create or update cached content for hover detection
    if (!this.hoverDetectionContent) {
      this.hoverDetectionContent = new PartyMembersContent(
        {
          title: 'Party Members',
          titleColor: '#ffa500',
          padding: 1,
          lineSpacing: 8,
        },
        partyUnits,
        new Map(),
        12,
        null
      );
    } else {
      // Update party units in case they changed
      this.hoverDetectionContent.updatePartyUnits(partyUnits);
    }

    // Get the hovered party member index
    const hoveredIndex = this.hoverDetectionContent.handleHover(relativeX, relativeY);

    // Return result with custom data for CombatView to use
    return {
      handled: hoveredIndex !== null,
      // Store hovered info in a way CombatView can access
      // We'll use preventDefault as a signal and encode data in a custom way
      preventDefault: hoveredIndex !== null,
      // Note: PhaseEventResult doesn't have a generic data field
      // CombatView will need to call a getter method instead
    };
  }

  /**
   * Get the currently hovered party member unit (for target panel display)
   * This should be called after handleInfoPanelHover
   */
  getHoveredPartyMember(): CombatUnit | null {
    // This is a workaround since we can't easily pass the unit through PhaseEventResult
    // In a better design, PhaseEventResult would have a generic data field
    // For now, we'll store it in an instance variable
    return null; // TODO: Store and return hovered unit
  }

  /**
   * Get top panel renderer - shows "Deploy Units" header
   */
  getTopPanelRenderer(_state: CombatState, _encounter: CombatEncounter) {
    return new DeploymentHeaderRenderer('Deploy Units');
  }

  /**
   * Get info panel content - shows party members for selection
   */
  getInfoPanelContent(
    _context: InfoPanelContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ) {
    const partyUnits = PartyMemberRegistry.getAll()
      .map(member => PartyMemberRegistry.createPartyMember(member.id))
      .filter((unit): unit is CombatUnit => unit !== undefined);

    if (partyUnits.length === 0) return null;

    // Return party members content for bottom info panel
    return new PartyMembersContent(
      {
        title: 'Party Members',
        titleColor: '#ffa500',
        padding: 1,
        lineSpacing: 8,
      },
      partyUnits,
      new Map(), // spriteImages - will be provided by renderer
      12, // spriteSize
      null // hoveredPartyMemberIndex - will be managed by CombatView
    );
  }
}

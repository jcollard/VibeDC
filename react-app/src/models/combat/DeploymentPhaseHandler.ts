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
import { PartyMemberRegistry, type PartyMemberDefinition } from '../../utils/PartyMemberRegistry';
import { getNineSliceSpriteIds } from '../../utils/DialogRenderer';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClassRegistry } from '../../utils/UnitClassRegistry';
import { CanvasButton } from '../../components/ui/CanvasButton';
import { CombatConstants } from './CombatConstants';
import type { CombatUIStateManager } from './CombatUIState';
import { DeploymentUI } from './deployment/DeploymentUI';
import { DeploymentZoneRenderer } from './deployment/DeploymentZoneRenderer';
import { UnitDeploymentManager } from './deployment/UnitDeploymentManager';
import { PartySelectionDialog } from './deployment/PartySelectionDialog';
import { PhaseBase } from './PhaseBase';
import { CombatAbility } from './CombatAbility';
import { Equipment } from './Equipment';
import { CombatUnitManifest } from './CombatUnitManifest';
import { DeploymentHeaderRenderer } from './managers/renderers/DeploymentHeaderRenderer';
import { PartyMembersContent } from './managers/panels';

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

  // Set secondary class if specified
  if (member.secondaryClassId) {
    const secondaryClass = UnitClassRegistry.getById(member.secondaryClassId);
    if (secondaryClass) {
      unit.setSecondaryClass(secondaryClass);
    } else {
      console.warn(`Secondary class not found: ${member.secondaryClassId}`);
    }
  }

  // Set abilities if specified (directly assign to bypass learned ability checks)
  // This matches the behavior of HumanoidUnit.fromJSON()
  if (member.reactionAbilityId) {
    const ability = CombatAbility.getById(member.reactionAbilityId);
    if (ability) {
      (unit as any)._reactionAbility = ability;
    } else {
      console.warn(`Reaction ability not found: ${member.reactionAbilityId}`);
    }
  }

  if (member.passiveAbilityId) {
    const ability = CombatAbility.getById(member.passiveAbilityId);
    if (ability) {
      (unit as any)._passiveAbility = ability;
    } else {
      console.warn(`Passive ability not found: ${member.passiveAbilityId}`);
    }
  }

  if (member.movementAbilityId) {
    const ability = CombatAbility.getById(member.movementAbilityId);
    if (ability) {
      (unit as any)._movementAbility = ability;
    } else {
      console.warn(`Movement ability not found: ${member.movementAbilityId}`);
    }
  }

  // Set equipment if specified
  if (member.leftHandId) {
    const equipment = Equipment.getById(member.leftHandId);
    if (equipment) {
      unit.equipLeftHand(equipment);
    } else {
      console.warn(`Left hand equipment not found: ${member.leftHandId}`);
    }
  }

  if (member.rightHandId) {
    const equipment = Equipment.getById(member.rightHandId);
    if (equipment) {
      unit.equipRightHand(equipment);
    } else {
      console.warn(`Right hand equipment not found: ${member.rightHandId}`);
    }
  }

  if (member.headId) {
    const equipment = Equipment.getById(member.headId);
    if (equipment) {
      unit.equipHead(equipment);
    } else {
      console.warn(`Head equipment not found: ${member.headId}`);
    }
  }

  if (member.bodyId) {
    const equipment = Equipment.getById(member.bodyId);
    if (equipment) {
      unit.equipBody(equipment);
    } else {
      console.warn(`Body equipment not found: ${member.bodyId}`);
    }
  }

  if (member.accessoryId) {
    const equipment = Equipment.getById(member.accessoryId);
    if (equipment) {
      unit.equipAccessory(equipment);
    } else {
      console.warn(`Accessory equipment not found: ${member.accessoryId}`);
    }
  }

  // TODO: Add learned abilities once that system is implemented

  return unit;
}

/**
 * DeploymentPhaseHandler manages the deployment phase of combat where players
 * position their units on designated deployment zones before battle begins.
 * Extends PhaseBase for common phase infrastructure.
 */
export class DeploymentPhaseHandler extends PhaseBase {
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
   * @returns New combat state if deployment succeeded, null otherwise
   */
  handlePartyMemberDeployment(
    memberIndex: number,
    combatState: CombatState,
    encounter: CombatEncounter
  ): CombatState | null {
    // 1. Check if a zone is selected
    const selectedZoneIndex = this.getSelectedZoneIndex();
    if (selectedZoneIndex === null) return null;

    // 2. Get the party member and deployment zone
    const partyMembers = PartyMemberRegistry.getAll();
    const selectedMember = partyMembers[memberIndex];
    const deploymentZone = encounter.playerDeploymentZones[selectedZoneIndex];

    if (!selectedMember || !deploymentZone) return null;

    // 3. Create unit and update manifest
    try {
      const unit = createUnitFromPartyMember(selectedMember);
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

      // Return updated combat state
      return {
        ...combatState,
        unitManifest: newManifest
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

    // Render instruction message only if button is NOT visible
    if (!shouldShowButton) {
      this.ui.renderInstructionMessage(ctx, canvasWidth, spriteSize, spriteImages, '', instructionY, messageAtlasFontId || '7px-04b03');
    }

    // Initialize and render Start Combat button below map (only if deployment is complete)
    if (shouldShowButton) {
      // Get button font atlas (use 10px-bitfantasy for buttons)
      const buttonFontId = '10px-bitfantasy';
      const buttonFontAtlas = fontAtlasImages?.get(buttonFontId) || null;

      if (!this.deployButton) {
        // Create button with auto-sizing (width/height calculated from text)
        this.deployButton = new CanvasButton({
          label: CombatConstants.TEXT.START_COMBAT_BUTTON,
          x: 0, // Will be centered after we know the width
          y: instructionY, // Same position as instruction message (MESSAGE_SPACING below map)
          spriteId: 'ui-simple-4',
          hoverSpriteId: 'ui-simple-5',
          activeSpriteId: 'ui-simple-6',
          fontId: buttonFontId,
          fontAtlasImage: buttonFontAtlas,
          fontScale: 1, // Scale factor (reduced from 2 for new resolution)
          // padding: 1 is the default
          onClick: () => {
            // TODO: Implement start combat logic
          },
        });

        // Center the button horizontally
        const buttonWidth = this.deployButton['config'].width || 0;
        this.deployButton.updateConfig({
          x: canvasWidth / 2 - buttonWidth / 2
        });
      } else {
        // Update font atlas in case it changed
        this.deployButton.updateConfig({
          fontId: buttonFontId,
          fontAtlasImage: buttonFontAtlas
        });
      }
      this.deployButton.render(ctx, spriteImages);
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
   * Handle mouse down - forward to deployment button
   */
  handleMouseDown(
    context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const { canvasX, canvasY } = context;
    const handled = this.handleButtonMouseDown(canvasX, canvasY);
    return { handled };
  }

  /**
   * Handle mouse up - forward to deployment button
   */
  handleMouseUp(
    context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const { canvasX, canvasY } = context;
    const handled = this.handleButtonMouseUp(canvasX, canvasY);
    return { handled };
  }

  /**
   * Handle mouse move - update hover states for party dialog and button
   * Note: This is the phase-agnostic version. The old handleMouseMove(canvasX, canvasY, characterCount)
   * is still used internally by the party dialog.
   */
  handleMouseMove(
    context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const { canvasX, canvasY } = context;
    const partySize = PartyMemberRegistry.getAll().length;

    // Update party dialog hover state (calls the parent class method)
    const dialogHandled = this.partyDialog.handleMouseMove(
      canvasX,
      canvasY,
      partySize,
      this.getSelectedZoneIndex()
    );

    // Update button hover state
    const buttonHandled = this.handleButtonMouseMove(canvasX, canvasY);

    return { handled: dialogHandled || buttonHandled };
  }

  /**
   * Handle info panel click - deploy party member at selected zone
   */
  handleInfoPanelClick(
    relativeX: number,
    relativeY: number,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult {
    // Get party members to handle the click
    const partyUnits = PartyMemberRegistry.getAll()
      .map(member => PartyMemberRegistry.createPartyMember(member.id))
      .filter((unit): unit is CombatUnit => unit !== undefined);

    if (partyUnits.length === 0) {
      return { handled: false };
    }

    // Create temporary party members content to handle click detection
    const content = new PartyMembersContent(
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

    // Get the clicked party member index
    const partyMemberIndex = content.handleClick(relativeX, relativeY);

    if (partyMemberIndex !== null) {
      // Deploy the party member
      const newState = this.handlePartyMemberDeployment(partyMemberIndex, state, encounter);
      return {
        handled: true,
        newState: newState || undefined
      };
    }

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

    // Create temporary party members content to handle hover detection
    const content = new PartyMembersContent(
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

    // Get the hovered party member index
    const hoveredIndex = content.handleHover(relativeX, relativeY);

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

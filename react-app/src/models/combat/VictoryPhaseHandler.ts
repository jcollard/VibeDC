import { PhaseBase } from './PhaseBase';
import type {
  PhaseRenderContext,
  MouseEventContext,
  PhaseSprites,
  PhaseEventResult
} from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { VictoryModalRenderer } from './rendering/VictoryModalRenderer';
import { CombatConstants } from './CombatConstants';
import type { VictoryRewards } from './VictoryRewards';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { PartyInventory } from '../../utils/inventory/PartyInventory';

/**
 * Phase handler for the victory screen.
 * Displays modal overlay with XP, gold, items, and continue button.
 * Player can select items individually or take all loot.
 */
export class VictoryPhaseHandler extends PhaseBase {
  private hoveredItemIndex: number | null = null;
  private selectedItemIndices: Set<number> = new Set();
  private continueHovered: boolean = false;
  private takeAllHovered: boolean = false;
  private renderer: VictoryModalRenderer;
  private rewards: VictoryRewards;

  constructor(rewards: VictoryRewards) {
    super();
    this.renderer = new VictoryModalRenderer();
    this.rewards = rewards;

    // Note: imageSmoothingEnabled = false is set globally in CombatView/CombatRenderer
    // per GeneralGuidelines.md (no need to set here)
  }

  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    // Items are rendered as text, no sprites needed
    return { spriteIds: new Set<string>() };
  }

  protected updatePhase(_state: CombatState, _encounter: CombatEncounter, _deltaTime: number): CombatState | null {
    // No automatic state changes - waits for user input
    return null;
  }

  render(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // No overlay rendering needed (all done in renderUI to appear on top)
  }

  renderUI(state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    // Render victory modal (overlay, panel, rewards, items, buttons)
    const fonts = context.fontAtlasImages ?? new Map<string, HTMLImageElement>();
    const sprites = context.spriteImages ?? new Map<string, HTMLImageElement>();

    this.renderer.render(
      context.ctx,
      state,
      this.rewards,
      this.hoveredItemIndex,
      this.selectedItemIndices,
      this.continueHovered,
      this.takeAllHovered,
      fonts,
      sprites,
      { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT }
    );
  }

  /**
   * Handle mouse movement for item/button hover detection
   */
  handleMouseMove(
    context: MouseEventContext,
    state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const panelBounds = { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT };

    let needsRerender = false;
    let newHoveredItemIndex: number | null = null;
    let newContinueHovered = false;
    let newTakeAllHovered = false;

    // Check item hover
    const itemBounds = this.renderer.getItemBounds(panelBounds, this.rewards);
    for (let i = 0; i < itemBounds.length; i++) {
      if (this.isPointInBounds(context.canvasX, context.canvasY, itemBounds[i])) {
        newHoveredItemIndex = i;
        break;
      }
    }

    // Check Take All button hover (only if there are items)
    if (this.rewards.items.length > 0) {
      const takeAllBounds = this.renderer.getTakeAllButtonBounds(panelBounds, this.rewards);
      if (this.isPointInBounds(context.canvasX, context.canvasY, takeAllBounds)) {
        newTakeAllHovered = true;
      }
    }

    // Check continue button hover
    const buttonBounds = this.renderer.getContinueButtonBounds(panelBounds, this.rewards);
    if (this.isPointInBounds(context.canvasX, context.canvasY, buttonBounds)) {
      newContinueHovered = true;
    }

    // Update hover states if changed
    if (newHoveredItemIndex !== this.hoveredItemIndex) {
      this.hoveredItemIndex = newHoveredItemIndex;
      needsRerender = true;
    }

    if (newContinueHovered !== this.continueHovered) {
      this.continueHovered = newContinueHovered;
      needsRerender = true;
    }

    if (newTakeAllHovered !== this.takeAllHovered) {
      this.takeAllHovered = newTakeAllHovered;
      needsRerender = true;
    }

    if (needsRerender) {
      return {
        handled: true,
        newState: state,  // Trigger re-render by returning state
      };
    }

    return { handled: false };
  }

  /**
   * Handle mouse button press for item selection and continue button
   */
  handleMouseDown(
    context: MouseEventContext,
    state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const panelBounds = { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT };

    // Check if item clicked
    const itemBounds = this.renderer.getItemBounds(panelBounds, this.rewards);
    for (let i = 0; i < itemBounds.length; i++) {
      if (this.isPointInBounds(context.canvasX, context.canvasY, itemBounds[i])) {
        // Toggle selection
        if (this.selectedItemIndices.has(i)) {
          this.selectedItemIndices.delete(i);
        } else {
          this.selectedItemIndices.add(i);
        }

        return {
          handled: true,
          newState: state,  // Trigger re-render
        };
      }
    }

    // Check if Take All button clicked
    if (this.rewards.items.length > 0) {
      const takeAllBounds = this.renderer.getTakeAllButtonBounds(panelBounds, this.rewards);
      if (this.isPointInBounds(context.canvasX, context.canvasY, takeAllBounds)) {
        // Select all items
        this.selectedItemIndices.clear();
        for (let i = 0; i < this.rewards.items.length; i++) {
          this.selectedItemIndices.add(i);
        }

        return {
          handled: true,
          newState: state,  // Trigger re-render
        };
      }
    }

    // Check if continue button clicked (always enabled)
    const buttonBounds = this.renderer.getContinueButtonBounds(panelBounds, this.rewards);
    if (this.isPointInBounds(context.canvasX, context.canvasY, buttonBounds)) {
      const newState = this.handleContinue(state);
      if (newState) {
        return {
          handled: true,
          newState,
        };
      }
      return { handled: true };
    }

    return { handled: false };
  }

  handleMouseUp(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return { handled: false };
  }

  private handleContinue(state: CombatState): CombatState | null {
    console.log("[VictoryPhaseHandler] Continue clicked - returning to exploration");
    console.log("[VictoryPhaseHandler] Selected items:",
      Array.from(this.selectedItemIndices).map(i => this.rewards.items[i].name)
    );

    // Apply rewards to party state
    this.applyRewardsToParty();

    // Signal to CombatView that combat should end
    return {
      ...state,
      shouldEndCombat: true,
    };
  }

  /**
   * Award XP to all party members and add selected items to inventory
   */
  private applyRewardsToParty(): void {
    console.log('[VictoryPhaseHandler] Applying rewards to party');

    // 1. Award XP to all party members (each gets XP for their primary class)
    // IMPORTANT: Add XP directly to registry data, NOT to combat units (they won't persist)
    const partyConfigs = PartyMemberRegistry.getAll();
    partyConfigs.forEach(config => {
      // Initialize classExperience if it doesn't exist
      if (!config.classExperience) {
        config.classExperience = {};
      }

      // Add XP to primary class
      const currentXP = config.classExperience[config.unitClassId] || 0;
      config.classExperience[config.unitClassId] = currentXP + this.rewards.xp;

      // Update total experience
      config.totalExperience = (config.totalExperience || 0) + this.rewards.xp;

      console.log(`[VictoryPhaseHandler] Awarded ${this.rewards.xp} XP to ${config.name} (${config.unitClassId})`);
      console.log(`[VictoryPhaseHandler] New total XP: ${config.totalExperience}, Class XP for ${config.unitClassId}: ${config.classExperience[config.unitClassId]}`);
    });

    // 2. Add gold to party inventory
    if (this.rewards.gold > 0) {
      PartyInventory.addGold(this.rewards.gold);
      console.log(`[VictoryPhaseHandler] Added ${this.rewards.gold} gold to party inventory`);
    }

    // 3. Add selected items to party inventory
    this.selectedItemIndices.forEach(index => {
      const item = this.rewards.items[index];
      if (item && item.equipmentId) {
        PartyInventory.addItem(item.equipmentId, 1);
        console.log(`[VictoryPhaseHandler] Added ${item.name} to party inventory`);
      }
    });
  }

  private isPointInBounds(
    x: number,
    y: number,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }
}

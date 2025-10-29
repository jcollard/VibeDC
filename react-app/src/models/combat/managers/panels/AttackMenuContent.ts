import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';
import { HELPER_TEXT, ENABLED_TEXT, HOVERED_TEXT, ITEM_NAME_COLOR } from './colors';
import type { CombatUnit } from '../../CombatUnit';
import type { HumanoidUnit } from '../../HumanoidUnit';
import type { Equipment } from '../../Equipment';
import type { Position } from '../../../../types';
import { CombatCalculations } from '../../utils/CombatCalculations';

/**
 * Configuration for attack menu panel appearance
 */
export interface AttackMenuConfig {
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Panel content that displays attack menu with weapon info and target selection.
 *
 * Shows:
 * - Title: "ATTACK" in dark red
 * - Weapon Info Section (single or dual columns)
 * - Target Selection Section ("Select a Target" or target name)
 * - Attack Prediction Section (when target selected)
 * - Cancel Attack button (always visible)
 * - Perform Attack button (only when target selected)
 */
export class AttackMenuContent implements PanelContent {
  private readonly config: AttackMenuConfig;
  private currentUnit: CombatUnit | null = null;
  private currentUnitPosition: Position | null = null;
  private selectedTarget: CombatUnit | null = null;
  private selectedTargetPosition: Position | null = null;
  private lastRegionWidth: number = 0;
  private lastRegionHeight: number = 0;
  private hoveredButtonIndex: number | null = null; // 0 = cancel, 1 = perform attack
  private buttonsDisabled: boolean = false;

  constructor(config: AttackMenuConfig, unit?: CombatUnit) {
    this.config = config;
    this.currentUnit = unit ?? null;
  }

  /**
   * Update the attack menu for a new unit
   * @param unit - The combat unit whose turn it is
   * @param position - The unit's current position (optional, for distance calculations)
   */
  updateUnit(unit: CombatUnit, position?: Position): void {
    this.currentUnit = unit;
    this.currentUnitPosition = position ?? null;
    this.buttonsDisabled = false;
  }

  /**
   * Update the selected target
   * @param target - The selected target unit
   * @param position - The target's position
   */
  updateSelectedTarget(target: CombatUnit | null, position: Position | null): void {
    this.selectedTarget = target;
    this.selectedTargetPosition = position;
  }

  /**
   * Get the current unit this menu is displaying for
   */
  getCurrentUnit(): CombatUnit | null {
    return this.currentUnit;
  }

  /**
   * Enable or disable all buttons
   */
  setButtonsDisabled(disabled: boolean): void {
    this.buttonsDisabled = disabled;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null,
    _spriteImages?: Map<string, HTMLImageElement>,
    _spriteSize?: number
  ): void {
    if (!fontAtlasImage) return;

    // Cache region dimensions for bounds checking
    this.lastRegionWidth = region.width;
    this.lastRegionHeight = region.height;

    let currentY = region.y + this.config.padding;

    // Render title: "ATTACK" in dark red on left, "Cancel" button on right
    FontAtlasRenderer.renderText(
      ctx,
      'ATTACK',
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      this.config.titleColor
    );

    // Cancel button on the same line, right-aligned
    const isCancelHovered = this.hoveredButtonIndex === 0;
    const cancelColor = this.buttonsDisabled ? HELPER_TEXT : (isCancelHovered ? HOVERED_TEXT : ENABLED_TEXT);
    FontAtlasRenderer.renderText(
      ctx,
      'Cancel',
      region.x + region.width - this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'right',
      cancelColor
    );
    currentY += this.config.lineSpacing;

    // Blank line
    currentY += this.config.lineSpacing;

    // Weapon Info Section
    const humanoidUnit = this.currentUnit as HumanoidUnit | null;
    const weapons = humanoidUnit?.getEquippedWeapons?.() ?? [];

    if (weapons.length === 0) {
      // No weapons equipped
      FontAtlasRenderer.renderText(
        ctx,
        'No weapon equipped',
        region.x + this.config.padding,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        HELPER_TEXT
      );
      currentY += this.config.lineSpacing;
    } else if (weapons.length === 1) {
      // Single weapon - one column centered
      currentY = this.renderWeaponInfo(ctx, region, fontId, fontAtlasImage, weapons[0], region.x + this.config.padding, currentY);
    } else {
      // Dual wielding - two columns side-by-side with 8px gap
      const columnWidth = Math.floor((region.width - this.config.padding * 2 - 8) / 2);
      const leftX = region.x + this.config.padding;
      const rightX = leftX + columnWidth + 8;

      const leftY = this.renderWeaponInfo(ctx, region, fontId, fontAtlasImage, weapons[0], leftX, currentY);
      const rightY = this.renderWeaponInfo(ctx, region, fontId, fontAtlasImage, weapons[1], rightX, currentY);
      currentY = Math.max(leftY, rightY);
    }

    // 2px spacing before target section
    currentY += 2;

    // Target Selection Section - "Target: " in white, name in orange/grey
    FontAtlasRenderer.renderText(
      ctx,
      'Target: ',
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ENABLED_TEXT
    );
    // Measure "Target: " to position the name after it
    const targetLabelWidth = FontAtlasRenderer.measureTextByFontId('Target: ', fontId);
    const targetName = this.selectedTarget ? this.selectedTarget.name : 'Select a Target';
    const targetColor = this.selectedTarget ? ITEM_NAME_COLOR : HELPER_TEXT;
    FontAtlasRenderer.renderText(
      ctx,
      targetName,
      region.x + this.config.padding + targetLabelWidth,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      targetColor
    );
    currentY += this.config.lineSpacing;

    // Attack Prediction Section (only if target selected)
    if (this.selectedTarget && this.selectedTargetPosition && this.currentUnit) {
      currentY += 2; // 2px spacing

      if (weapons.length === 1) {
        // Single weapon prediction
        currentY = this.renderAttackPrediction(
          ctx,
          region,
          fontId,
          fontAtlasImage,
          weapons[0],
          region.x + this.config.padding,
          currentY
        );
      } else if (weapons.length === 2) {
        // Dual wielding prediction - two columns (no labels)
        const columnWidth = Math.floor((region.width - this.config.padding * 2 - 8) / 2);
        const leftX = region.x + this.config.padding;
        const rightX = leftX + columnWidth + 8;

        const leftY = this.renderAttackPrediction(ctx, region, fontId, fontAtlasImage, weapons[0], leftX, currentY);
        const rightY = this.renderAttackPrediction(ctx, region, fontId, fontAtlasImage, weapons[1], rightX, currentY);
        currentY = Math.max(leftY, rightY);
      }
    }

    // Perform Attack button (only visible when target selected, centered)
    if (this.selectedTarget) {
      currentY += this.config.lineSpacing; // Spacing before button

      const isPerformHovered = this.hoveredButtonIndex === 1;
      const performColor = this.buttonsDisabled ? HELPER_TEXT : (isPerformHovered ? HOVERED_TEXT : ENABLED_TEXT);

      // Calculate center X for button
      const buttonCenterX = region.x + (region.width / 2);

      FontAtlasRenderer.renderText(
        ctx,
        'Perform Attack',
        buttonCenterX,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'center',
        performColor
      );
    }
  }

  /**
   * Render weapon info (name, range, hit%, damage)
   */
  private renderWeaponInfo(
    ctx: CanvasRenderingContext2D,
    _region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    weapon: Equipment,
    x: number,
    y: number
  ): number {
    let currentY = y;

    // Weapon name in orange
    FontAtlasRenderer.renderText(
      ctx,
      weapon.name,
      x,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ITEM_NAME_COLOR
    );
    currentY += this.config.lineSpacing;

    // Hit% (stub - always 100%)
    FontAtlasRenderer.renderText(
      ctx,
      'Hit: 100%',
      x,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ENABLED_TEXT
    );
    currentY += this.config.lineSpacing;

    // Dmg (stub - always 1)
    FontAtlasRenderer.renderText(
      ctx,
      'Dmg: 1',
      x,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ENABLED_TEXT
    );
    currentY += this.config.lineSpacing;

    return currentY;
  }

  /**
   * Render attack prediction (hit%, damage)
   */
  private renderAttackPrediction(
    ctx: CanvasRenderingContext2D,
    _region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement,
    weapon: Equipment,
    x: number,
    y: number
  ): number {
    if (!this.currentUnit || !this.selectedTarget || !this.selectedTargetPosition || !this.currentUnitPosition) {
      return y;
    }

    let currentY = y;

    // Calculate distance (Manhattan)
    const distance = Math.abs(this.currentUnitPosition.x - this.selectedTargetPosition.x) +
                     Math.abs(this.currentUnitPosition.y - this.selectedTargetPosition.y);

    // Get hit chance (stub returns 1.0)
    const hitChance = CombatCalculations.getChanceToHit(
      this.currentUnit,
      this.selectedTarget,
      distance,
      'physical'
    );
    const hitPercent = Math.round(hitChance * 100);

    // Get damage (stub returns 1)
    const damage = CombatCalculations.calculateAttackDamage(
      this.currentUnit,
      weapon,
      this.selectedTarget,
      distance,
      'physical'
    );

    // Hit%
    FontAtlasRenderer.renderText(
      ctx,
      `Hit: ${hitPercent}%`,
      x,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ENABLED_TEXT
    );
    currentY += this.config.lineSpacing;

    // Dmg
    FontAtlasRenderer.renderText(
      ctx,
      `Dmg: ${damage}`,
      x,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ENABLED_TEXT
    );
    currentY += this.config.lineSpacing;

    return currentY;
  }

  handleClick(
    relativeX: number,
    relativeY: number
  ): PanelClickResult {
    // Ignore clicks if buttons are disabled
    if (this.buttonsDisabled) {
      return null;
    }

    // Ignore clicks if this is not the player's unit
    if (!this.currentUnit || !this.currentUnit.isPlayerControlled) {
      return null;
    }

    const buttonIndex = this.getButtonIndexAt(relativeX, relativeY);

    if (buttonIndex === 0) {
      // Cancel button clicked
      this.setButtonsDisabled(true);
      return {
        type: 'cancel-attack'
      };
    }

    if (buttonIndex === 1) {
      // Perform Attack button clicked
      if (!this.selectedTarget) {
        // No target selected - ignore
        return null;
      }
      this.setButtonsDisabled(true);
      return {
        type: 'perform-attack'
      };
    }

    return null;
  }

  handleHover(
    relativeX: number,
    relativeY: number
  ): unknown {
    // Check if mouse is outside panel bounds
    if (relativeX < 0 || relativeY < 0 ||
        relativeX >= this.lastRegionWidth ||
        relativeY >= this.lastRegionHeight) {
      // Clear hover state if mouse is outside panel
      if (this.hoveredButtonIndex !== null) {
        this.hoveredButtonIndex = null;
        return { buttonIndex: null };
      }
      return null;
    }

    // Ignore hover if this is not the player's unit
    if (!this.currentUnit || !this.currentUnit.isPlayerControlled) {
      if (this.hoveredButtonIndex !== null) {
        this.hoveredButtonIndex = null;
        return { buttonIndex: null };
      }
      return null;
    }

    const buttonIndex = this.getButtonIndexAt(relativeX, relativeY);

    // Update hover state if changed
    if (buttonIndex !== this.hoveredButtonIndex) {
      this.hoveredButtonIndex = buttonIndex;
      return { buttonIndex };
    }

    return null;
  }

  /**
   * Determine which button (if any) is at the given panel-relative coordinates
   * Returns 0 for cancel button, 1 for perform attack, null otherwise
   *
   * Note: Cancel button is on the title line, Perform Attack button is below prediction section
   */
  private getButtonIndexAt(_relativeX: number, relativeY: number): number | null {
    const humanoidUnit = this.currentUnit as HumanoidUnit | null;
    const weapons = humanoidUnit?.getEquippedWeapons?.() ?? [];

    // Cancel button is on line 0 (title line)
    const cancelButtonY = this.config.padding;
    if (relativeY >= cancelButtonY && relativeY < cancelButtonY + this.config.lineSpacing) {
      return 0; // Cancel button
    }

    // Perform Attack button calculation
    if (this.selectedTarget) {
      // Base layout height calculation
      let lineCount = 0;
      lineCount += 1; // Title (with Cancel)
      lineCount += 1; // Blank
      lineCount += (weapons.length === 0 ? 1 : 3); // Weapon info (3 lines per weapon: name, hit%, dmg)
      lineCount += 1; // Target line

      if (weapons.length > 0) {
        lineCount += 2; // Attack prediction (2 lines: hit%, dmg)
      }

      lineCount += 1; // Spacing before button

      const performButtonY = this.config.padding + (lineCount * this.config.lineSpacing);

      // Check if click is on perform attack button line
      if (relativeY >= performButtonY && relativeY < performButtonY + this.config.lineSpacing) {
        return 1; // Perform Attack button
      }
    }

    return null;
  }
}

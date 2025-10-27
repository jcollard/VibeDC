import { PhaseBase } from './PhaseBase';
import type { CombatState } from './CombatState';
import type { CombatEncounter, UnitPlacement } from './CombatEncounter';
import type { PhaseSprites, PhaseRenderContext } from './CombatPhaseHandler';
import { CombatConstants } from './CombatConstants';
import { DeploymentHeaderRenderer } from './managers/renderers/DeploymentHeaderRenderer';
import { EnemySpriteSequence } from './EnemySpriteSequence';
import { StaggeredSequenceManager } from './StaggeredSequenceManager';
import { EnemyRegistry } from '../../utils/EnemyRegistry';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * EnemyDeploymentPhaseHandler manages the enemy deployment phase where
 * enemy units materialize on the battlefield with dithered fade-in animations.
 *
 * Features:
 * - Enemies fade in using pixel-art dither effect (1 second per enemy)
 * - Animations are staggered with 0.5 second delay between starts
 * - Combat log displays message grouping enemies by type with colored names
 * - Automatically transitions to battle phase when animations complete
 */
export class EnemyDeploymentPhaseHandler extends PhaseBase {
  private animationSequence: StaggeredSequenceManager | null = null;
  private animationComplete = false;
  private initialized = false;
  private pendingLogMessages: string[] = [];
  private enemyUnits: UnitPlacement[] = [];

  /**
   * Initialize the enemy deployment phase
   * Called on first update/render to set up animations
   */
  private initialize(state: CombatState, encounter: CombatEncounter): void {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Create enemy units (but don't add to manifest yet - they'll be added as animations complete)
    this.enemyUnits = encounter.createEnemyUnits();

    // 2. Sort enemies by position: top to bottom, left to right
    // Primary sort: y-coordinate (row), Secondary sort: x-coordinate (column)
    const sortedEnemyUnits = [...this.enemyUnits].sort((a, b) => {
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y; // Sort by row (top to bottom)
      }
      return a.position.x - b.position.x; // Sort by column (left to right)
    });

    // 3. Create sprite sequences for each enemy in sorted order
    const spriteSequences = sortedEnemyUnits.map(({ unit, position }) =>
      new EnemySpriteSequence(
        unit,
        position,
        CombatConstants.ENEMY_DEPLOYMENT.ANIMATION_DURATION
      )
    );

    // 4. Create staggered manager with configured delay
    this.animationSequence = new StaggeredSequenceManager(
      spriteSequences,
      CombatConstants.ENEMY_DEPLOYMENT.STAGGER_DELAY
    );

    // 5. Add combat log message(s)
    const message = this.buildEnemyApproachMessage(encounter);
    const lines = this.splitMessageForCombatLog(message, CombatConstants.COMBAT_LOG.MAX_MESSAGE_WIDTH);

    // Store lines to add them during the first render call
    this.pendingLogMessages = lines;

    // 6. Start animation sequence
    this.animationSequence.start(state, encounter);
  }

  /**
   * Update the enemy deployment phase
   */
  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // Initialize on first update
    this.initialize(state, encounter);

    if (!this.animationSequence) return state;

    // Update animation
    const complete = this.animationSequence.update(deltaTime);

    if (complete && !this.animationComplete) {
      this.animationComplete = true;

      // Add all enemies to manifest now that animations are complete
      for (const { unit, position } of this.enemyUnits) {
        state.unitManifest.addUnit(unit, position);
      }

      // Transition to battle phase
      return {
        ...state,
        phase: 'battle',
      };
    }

    return state;
  }

  /**
   * Get required sprites for enemy deployment phase
   */
  getRequiredSprites(_state: CombatState, encounter: CombatEncounter): PhaseSprites {
    // Collect all enemy sprite IDs
    const spriteIds = new Set<string>();

    for (const placement of encounter.enemyPlacements) {
      const enemyDef = EnemyRegistry.getById(placement.enemyId);
      if (enemyDef) {
        spriteIds.add(enemyDef.spriteId);
      }
    }

    return { spriteIds };
  }

  /**
   * Render enemy deployment phase - renders enemy sprite animations
   */
  render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
    // Initialize on first render
    this.initialize(state, encounter);

    // Add pending combat log messages on first render
    if (this.pendingLogMessages.length > 0 && context.combatLog) {
      for (const line of this.pendingLogMessages) {
        context.combatLog.addMessage(line);
      }
      this.pendingLogMessages = [];
    }

    // Render enemy sprites with dither animation
    if (this.animationSequence) {
      this.animationSequence.render(state, encounter, context);
    }
  }

  /**
   * Render UI for enemy deployment phase
   */
  renderUI(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // UI rendering is minimal - top panel is controlled via getTopPanelRenderer
  }

  /**
   * Get top panel renderer - shows "Enemies Approach" header
   */
  getTopPanelRenderer(_state: CombatState, _encounter: CombatEncounter) {
    return new DeploymentHeaderRenderer(CombatConstants.TEXT.ENEMIES_APPROACH);
  }

  /**
   * Builds a message describing the approaching enemies.
   * Groups enemies by name and formats with colored enemy names.
   *
   * Examples:
   * - "3 [color=#ff0000]Goblins[/color] approach!"
   * - "2 [color=#ff0000]Wolves[/color] and 1 [color=#ff0000]Dragon[/color] approach!"
   * - "3 [color=#ff0000]Goblins[/color], 4 [color=#ff0000]Dragons[/color], and 2 [color=#ff0000]Knights[/color] approach!"
   */
  private buildEnemyApproachMessage(encounter: CombatEncounter): string {
    // Group enemies by name
    const enemyGroups = new Map<string, number>();

    for (const placement of encounter.enemyPlacements) {
      const enemyDef = EnemyRegistry.getById(placement.enemyId);
      if (enemyDef) {
        const count = enemyGroups.get(enemyDef.name) || 0;
        enemyGroups.set(enemyDef.name, count + 1);
      }
    }

    // Build message parts
    const parts: string[] = [];
    const enemyColor = CombatConstants.ENEMY_DEPLOYMENT.ENEMY_NAME_COLOR;

    for (const [name, count] of enemyGroups) {
      const coloredName = `[color=${enemyColor}]${name}[/color]`;
      // Handle pluralization: "1 Goblin" vs "2 Goblins"
      const displayName = count > 1 ? `${coloredName}s` : coloredName;
      parts.push(`${count} ${displayName}`);
    }

    // Format with commas and "and"
    let message = '';
    if (parts.length === 1) {
      message = parts[0];
    } else if (parts.length === 2) {
      message = `${parts[0]} and ${parts[1]}`;
    } else {
      const allButLast = parts.slice(0, -1).join(', ');
      const last = parts[parts.length - 1];
      message = `${allButLast}, and ${last}`;
    }

    message += ' approach!';

    return message;
  }

  /**
   * Splits a message into multiple lines if it exceeds the maximum width.
   * Attempts to split at natural boundaries (commas, "and") for readability.
   * Accounts for color tags not contributing to visible width.
   *
   * @param message - The message to split
   * @param maxWidth - Maximum width in pixels
   * @returns Array of message lines that fit within maxWidth
   */
  private splitMessageForCombatLog(message: string, maxWidth: number): string[] {
    const fontId = CombatConstants.COMBAT_LOG.FONT_ID;

    // Calculate plain text length (without tags) for width measurement
    const getPlainText = (text: string): string => {
      return text
        .replace(/\[color=#[0-9a-fA-F]{6}\]/g, '')
        .replace(/\[\/color\]/g, '');
    };

    // Measure the width of text (without tags)
    const measureText = (text: string): number => {
      const plainText = getPlainText(text);
      return FontAtlasRenderer.measureTextByFontId(plainText, fontId);
    };

    // If message fits, return as single line
    if (measureText(message) <= maxWidth) {
      return [message];
    }

    // Split at natural boundaries: ", " and " and "
    const lines: string[] = [];
    let currentLine = '';

    // First, try splitting by comma
    const segments = message.split(', ');

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const testLine = currentLine
        ? currentLine + ', ' + segment
        : segment;

      if (measureText(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        // Current line + segment is too long
        if (currentLine) {
          // Save current line and start new one
          lines.push(currentLine);
          currentLine = segment;
        } else {
          // Even a single segment is too long - need to split it further
          // Split by " and " if possible
          const andParts = segment.split(' and ');
          for (let j = 0; j < andParts.length; j++) {
            const andPart = andParts[j];
            const testAndLine = currentLine
              ? currentLine + ' and ' + andPart
              : andPart;

            if (measureText(testAndLine) <= maxWidth) {
              currentLine = testAndLine;
            } else {
              if (currentLine) {
                lines.push(currentLine);
                currentLine = andPart;
              } else {
                // Force add even if too long (can't split further)
                lines.push(andPart);
                currentLine = '';
              }
            }
          }
        }
      }
    }

    // Add remaining line
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [message]; // Fallback to full message
  }
}

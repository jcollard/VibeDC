import { PhaseBase } from './PhaseBase';
import type {
  CombatPhaseHandler,
  PhaseEventResult,
  PhaseRenderContext,
  MouseEventContext,
  PhaseSprites,
  InfoPanelContext
} from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { TopPanelRenderer } from './managers/TopPanelRenderer';
import type { PanelContent } from './managers/panels/PanelContent';
import type { CombatUnit } from './CombatUnit';
import type { Position } from '../../types';
import { TurnOrderRenderer } from './managers/renderers/TurnOrderRenderer';
import { UnitInfoContent } from './managers/panels/UnitInfoContent';
import { SpriteRenderer } from '../../utils/SpriteRenderer';
import { MovementRangeCalculator } from './utils/MovementRangeCalculator';
import { CombatConstants } from './CombatConstants';

/**
 * Unit turn phase handler - manages individual unit turns
 *
 * Current functionality:
 * - Displays unit ready message with colored names
 * - Shows blinking cursor on active unit
 * - Allows unit selection and displays movement range
 * - Shows target cursor on selected units
 * - Displays unit stats in info panel
 * - Waits for player input (player-controlled units)
 *
 * Future functionality:
 * - Action menu (Attack, Ability, Move, Wait, End Turn)
 * - Actual movement execution
 * - Action execution
 * - AI enemy turns
 * - Action timer reset/overflow handling
 */
export class UnitTurnPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // Turn state
  private activeUnit: CombatUnit | null = null;
  private activeUnitPosition: Position | null = null;
  private readyMessageWritten: boolean = false;

  // Target selection
  private targetedUnit: CombatUnit | null = null;
  private targetedUnitPosition: Position | null = null;
  private movementRange: Position[] = [];

  // Cursor animation
  private cursorBlinkTimer: number = 0;
  private cursorVisible: boolean = true;

  // Cached panel content (per GeneralGuidelines.md - cache stateful components)
  private unitInfoContent: UnitInfoContent | null = null;

  // Cached turn order renderer (maintains scroll state across renders)
  private turnOrderRenderer: TurnOrderRenderer | null = null;

  // Pending combat log messages (added in render when combatLog is available)
  private pendingLogMessages: string[] = [];

  constructor() {
    super();
    console.log('[UnitTurnPhaseHandler] Initialized');
  }

  getRequiredSprites(state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    const spriteIds = new Set<string>();

    // Add cursor and movement highlight sprites
    spriteIds.add(CombatConstants.UNIT_TURN.CURSOR_SPRITE_ID);
    spriteIds.add(CombatConstants.UNIT_TURN.TARGET_CURSOR_SPRITE_ID);
    spriteIds.add(CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE);

    // Add unit sprites
    for (const placement of state.unitManifest.getAllUnits()) {
      spriteIds.add(placement.unit.spriteId);
    }

    return { spriteIds };
  }

  render(_state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

    // Add pending combat log messages on first render
    if (this.pendingLogMessages.length > 0 && context.combatLog) {
      for (const message of this.pendingLogMessages) {
        context.combatLog.addMessage(message);
      }
      this.pendingLogMessages = [];
    }

    // Render movement range highlights (yellow tiles) - rendered BEFORE units
    for (const position of this.movementRange) {
      // Per GeneralGuidelines.md - round coordinates for pixel-perfect rendering
      const x = Math.floor(offsetX + (position.x * tileSize));
      const y = Math.floor(offsetY + (position.y * tileSize));

      // Render with transparency
      ctx.save();
      ctx.globalAlpha = CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALPHA;

      SpriteRenderer.renderSpriteById(
        ctx,
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize
      );

      ctx.restore();
    }
  }

  renderUI(_state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

    // Render active unit cursor (blinking) - rendered AFTER units per user feedback
    if (this.activeUnitPosition && this.cursorVisible) {
      // Per GeneralGuidelines.md - round coordinates for pixel-perfect rendering
      const x = Math.floor(offsetX + (this.activeUnitPosition.x * tileSize));
      const y = Math.floor(offsetY + (this.activeUnitPosition.y * tileSize));

      SpriteRenderer.renderSpriteById(
        ctx,
        CombatConstants.UNIT_TURN.CURSOR_SPRITE_ID,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize
      );
    }

    // Render target cursor (always visible) - rendered AFTER units per user feedback
    if (this.targetedUnitPosition) {
      // Per GeneralGuidelines.md - round coordinates for pixel-perfect rendering
      const x = Math.floor(offsetX + (this.targetedUnitPosition.x * tileSize));
      const y = Math.floor(offsetY + (this.targetedUnitPosition.y * tileSize));

      SpriteRenderer.renderSpriteById(
        ctx,
        CombatConstants.UNIT_TURN.TARGET_CURSOR_SPRITE_ID,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize
      );
    }
  }

  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // Find the unit with highest action timer (first ready)
    const allUnits = state.unitManifest.getAllUnits();
    const sortedUnits = allUnits.sort((a, b) => {
      if (b.unit.actionTimer !== a.unit.actionTimer) {
        return b.unit.actionTimer - a.unit.actionTimer;
      }
      return a.unit.name.localeCompare(b.unit.name);
    });

    // Initialize active unit on first frame
    if (sortedUnits.length > 0 && !this.activeUnit) {
      const readyPlacement = sortedUnits[0];
      this.activeUnit = readyPlacement.unit;
      this.activeUnitPosition = readyPlacement.position;
    }

    // Write ready message once
    if (this.activeUnit && !this.readyMessageWritten) {
      const nameColor = this.activeUnit.isPlayerControlled
        ? CombatConstants.UNIT_TURN.PLAYER_NAME_COLOR
        : CombatConstants.UNIT_TURN.ENEMY_NAME_COLOR;

      const logMessage = `[color=${nameColor}]${this.activeUnit.name}[/color] is ready!`;

      // Queue message for combat log (will be added in render when combatLog is available)
      this.pendingLogMessages.push(logMessage);

      this.readyMessageWritten = true;
    }

    // Update cursor blink timer
    this.cursorBlinkTimer += deltaTime;
    if (this.cursorBlinkTimer >= CombatConstants.UNIT_TURN.CURSOR_BLINK_RATE) {
      this.cursorBlinkTimer = 0;
      this.cursorVisible = !this.cursorVisible;
    }

    // Check victory/defeat conditions
    if (encounter.isVictory(state)) {
      return { ...state, phase: 'victory' as const };
    }
    if (encounter.isDefeat(state)) {
      return { ...state, phase: 'defeat' as const };
    }

    // Stay in unit-turn phase (waiting for action implementation)
    return state;
  }

  getTopPanelRenderer(state: CombatState, _encounter: CombatEncounter): TopPanelRenderer {
    // Use same turn order logic as ActionTimerPhaseHandler
    // Get all units
    const units = state.unitManifest.getAllUnits().map(placement => placement.unit);

    // Calculate time until each unit reaches 100 action timer
    const unitsWithTime = units.map(unit => {
      const timeToReady = unit.speed > 0
        ? (100 - unit.actionTimer) / unit.speed
        : Infinity;

      return { unit, timeToReady };
    });

    // Sort by time to ready (ascending - soonest first), then alphabetically
    unitsWithTime.sort((a, b) => {
      if (a.timeToReady !== b.timeToReady) {
        return a.timeToReady - b.timeToReady;
      }
      return a.unit.name.localeCompare(b.unit.name);
    });

    // Extract sorted units
    const sortedUnits = unitsWithTime.map(item => item.unit);

    // Create or update cached renderer (maintains scroll state)
    if (!this.turnOrderRenderer) {
      this.turnOrderRenderer = new TurnOrderRenderer(sortedUnits, state.tickCount || 0);
    } else {
      // Update units in existing renderer (preserves scroll offset)
      this.turnOrderRenderer.updateUnits(sortedUnits);
      // Update tick count for display
      this.turnOrderRenderer.updateTickCount(state.tickCount || 0);
    }

    return this.turnOrderRenderer;
  }

  getInfoPanelContent(
    _context: InfoPanelContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PanelContent | null {
    // Determine which unit to display (target takes priority)
    const displayUnit = this.targetedUnit ?? this.activeUnit;

    if (!displayUnit) {
      return null;
    }

    // Create or update cached instance (per GeneralGuidelines.md - cache stateful components)
    if (!this.unitInfoContent) {
      this.unitInfoContent = new UnitInfoContent(
        {
          title: 'Unit Info',
          titleColor: '#ffa500',
          padding: 1,
          lineSpacing: 8,
        },
        displayUnit
      );
    } else {
      // Update which unit is displayed
      this.unitInfoContent.updateUnit(displayUnit);
    }

    return this.unitInfoContent;
  }

  handleMapClick(
    context: MouseEventContext,
    state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const { tileX, tileY } = context;

    if (tileX === undefined || tileY === undefined) {
      return { handled: false };
    }

    // Check if a unit is at this position
    const unit = state.unitManifest.getUnitAtPosition({ x: tileX, y: tileY });

    if (unit) {
      // Set as targeted unit
      this.targetedUnit = unit;
      this.targetedUnitPosition = { x: tileX, y: tileY };

      // Calculate movement range for this unit
      this.movementRange = MovementRangeCalculator.calculateReachableTiles({
        startPosition: this.targetedUnitPosition,
        movement: this.targetedUnit.movement,
        map: state.map,
        unitManifest: state.unitManifest,
        activeUnit: this.targetedUnit
      });

      return {
        handled: true,
        logMessage: `Selected ${unit.name}`
      };
    } else {
      // Clear target if clicking empty tile
      this.targetedUnit = null;
      this.targetedUnitPosition = null;
      this.movementRange = [];

      return {
        handled: true,
        logMessage: `Clicked tile (${tileX}, ${tileY})`
      };
    }
  }

  handleMouseMove(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return {
      handled: false
    };
  }
}

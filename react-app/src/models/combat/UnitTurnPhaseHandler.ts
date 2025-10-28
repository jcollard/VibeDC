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

  // Track if info panel has been initialized for this phase
  private infoPanelInitialized: boolean = false;

  // Cached tinting buffer (reused across all tinting operations to avoid creating canvases every frame)
  private tintingBuffer: HTMLCanvasElement | null = null;
  private tintingBufferCtx: CanvasRenderingContext2D | null = null;

  // Store current state for click handlers
  private currentState: CombatState | null = null;

  constructor() {
    super();
  }

  /**
   * Render a sprite with color tinting
   * Uses a cached off-screen buffer to apply color tinting without affecting the rest of the canvas
   */
  private renderTintedSprite(
    ctx: CanvasRenderingContext2D,
    spriteId: string,
    spriteImages: Map<string, HTMLImageElement>,
    spriteSize: number,
    x: number,
    y: number,
    width: number,
    height: number,
    tintColor: string,
    alpha: number = 1.0
  ): void {
    // Lazy initialize cached tinting buffer
    if (!this.tintingBuffer || !this.tintingBufferCtx) {
      this.tintingBuffer = document.createElement('canvas');
      this.tintingBufferCtx = this.tintingBuffer.getContext('2d');
      if (!this.tintingBufferCtx) return; // Should never happen, but safety check
    }

    // Resize buffer only if dimensions changed
    if (this.tintingBuffer.width !== width || this.tintingBuffer.height !== height) {
      this.tintingBuffer.width = width;
      this.tintingBuffer.height = height;
    }

    // TypeScript now knows bufferCtx is non-null due to early return above
    const bufferCtx = this.tintingBufferCtx;

    // Clear previous contents
    bufferCtx.clearRect(0, 0, width, height);

    // Reset composite operation to default (in case previous operation left it modified)
    bufferCtx.globalCompositeOperation = 'source-over';

    // Render sprite to buffer
    SpriteRenderer.renderSpriteById(
      bufferCtx,
      spriteId,
      spriteImages,
      spriteSize,
      0,
      0,
      width,
      height
    );

    // Apply color tint using multiply blend mode
    bufferCtx.globalCompositeOperation = 'multiply';
    bufferCtx.fillStyle = tintColor;
    bufferCtx.fillRect(0, 0, width, height);

    // Restore the sprite's alpha channel
    bufferCtx.globalCompositeOperation = 'destination-in';
    SpriteRenderer.renderSpriteById(
      bufferCtx,
      spriteId,
      spriteImages,
      spriteSize,
      0,
      0,
      width,
      height
    );

    // Draw the tinted sprite to the main canvas
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.tintingBuffer, x, y);
    ctx.restore();
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

      // Render with yellow tint and transparency
      this.renderTintedSprite(
        ctx,
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize,
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALBEDO,
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALPHA
      );
    }
  }

  renderUI(_state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

    // Render active unit cursor (dark green, blinking) - rendered AFTER units per user feedback
    if (this.activeUnitPosition && this.cursorVisible) {
      // Per GeneralGuidelines.md - round coordinates for pixel-perfect rendering
      const x = Math.floor(offsetX + (this.activeUnitPosition.x * tileSize));
      const y = Math.floor(offsetY + (this.activeUnitPosition.y * tileSize));

      // Render with dark green tint
      this.renderTintedSprite(
        ctx,
        CombatConstants.UNIT_TURN.CURSOR_SPRITE_ID,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize,
        CombatConstants.UNIT_TURN.CURSOR_ALBEDO_DARK_GREEN,
        1.0
      );
    }

    // Render target cursor (red, always visible) - rendered AFTER units per user feedback
    if (this.targetedUnitPosition) {
      // Per GeneralGuidelines.md - round coordinates for pixel-perfect rendering
      const x = Math.floor(offsetX + (this.targetedUnitPosition.x * tileSize));
      const y = Math.floor(offsetY + (this.targetedUnitPosition.y * tileSize));

      // Render with red tint
      this.renderTintedSprite(
        ctx,
        CombatConstants.UNIT_TURN.TARGET_CURSOR_SPRITE_ID,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize,
        CombatConstants.UNIT_TURN.TARGET_CURSOR_ALBEDO,
        1.0
      );
    }
  }

  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // Store state reference for click handlers
    this.currentState = state;

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

      // Set click handler to select unit when clicked
      this.turnOrderRenderer.setClickHandler((unit: CombatUnit) => {
        this.handleTurnOrderUnitClick(unit);
      });
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

    // Force recreation of panel content on first call to ensure it shows the active unit
    if (!this.infoPanelInitialized) {
      this.unitInfoContent = null;
      this.infoPanelInitialized = true;
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

  /**
   * Get the active unit (the unit whose turn it is).
   * This should be displayed in the "Current Unit" panel (bottom).
   */
  getActiveUnit(): CombatUnit | null {
    return this.activeUnit;
  }

  /**
   * Get the targeted unit (the unit selected by clicking).
   * This should be displayed in the "Unit Info" panel (top).
   */
  getTargetedUnit(): CombatUnit | null {
    return this.targetedUnit;
  }

  /**
   * Select a unit and calculate its movement range.
   * Called by both map clicks and turn order clicks.
   */
  private selectUnit(unit: CombatUnit, position: Position, state: CombatState): void {
    this.targetedUnit = unit;
    this.targetedUnitPosition = position;

    // Calculate movement range for this unit
    this.movementRange = MovementRangeCalculator.calculateReachableTiles({
      startPosition: this.targetedUnitPosition,
      movement: this.targetedUnit.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: this.targetedUnit
    });
  }

  /**
   * Clear the currently selected unit and movement range.
   */
  private clearSelection(): void {
    this.targetedUnit = null;
    this.targetedUnitPosition = null;
    this.movementRange = [];
  }

  /**
   * Handle unit clicks from the turn order panel
   */
  private handleTurnOrderUnitClick(unit: CombatUnit): void {
    if (!this.currentState) {
      console.warn('[UnitTurnPhaseHandler] Cannot handle turn order click - no current state');
      return;
    }

    // Find the unit's position on the map
    const placement = this.currentState.unitManifest.getAllUnits().find(p => p.unit === unit);

    if (!placement) {
      console.warn(`[UnitTurnPhaseHandler] Clicked unit not found in manifest: ${unit.name}`);
      return;
    }

    // Use shared selection logic
    this.selectUnit(unit, placement.position, this.currentState);
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
      // Use shared selection logic
      this.selectUnit(unit, { x: tileX, y: tileY }, state);

      return {
        handled: true
      };
    } else {
      // Clear selection if clicking empty tile
      this.clearSelection();

      return {
        handled: true
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

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
import { CombatConstants } from './CombatConstants';
import type { TurnStrategy, TurnAction } from './strategies/TurnStrategy';
import { PlayerTurnStrategy } from './strategies/PlayerTurnStrategy';
import { EnemyTurnStrategy } from './strategies/EnemyTurnStrategy';
import { UnitMovementSequence } from './UnitMovementSequence';
import { MovementPathfinder } from './utils/MovementPathfinder';

/**
 * Unit turn phase handler - manages individual unit turns using strategy pattern
 *
 * Architecture:
 * - Uses TurnStrategy pattern to separate player input from AI decision-making
 * - PlayerTurnStrategy: waits for player input, shows action menus
 * - EnemyTurnStrategy: automatically decides actions using AI rules
 *
 * Current functionality:
 * - Displays unit ready message with colored names
 * - Shows blinking cursor on active unit
 * - Delegates turn behavior to strategy (player vs enemy)
 * - Shows target cursor on selected units
 * - Displays unit stats in info panel
 *
 * Future functionality:
 * - Action menu (Attack, Ability, Move, Wait, End Turn)
 * - Actual movement execution
 * - Action execution
 * - More sophisticated AI strategies
 * - Action timer reset/overflow handling
 */
export class UnitTurnPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // Turn state
  private activeUnit: CombatUnit | null = null;
  private activeUnitPosition: Position | null = null;
  private readyMessageWritten: boolean = false;

  // Strategy pattern - handles player vs enemy behavior
  private currentStrategy: TurnStrategy | null = null;

  // Cursor animation
  private cursorBlinkTimer: number = 0;
  private cursorVisible: boolean = true;

  // Cached panel content (per GeneralGuidelines.md - cache stateful components)
  private unitInfoContent: UnitInfoContent | null = null;
  // Note: actionsMenuContent is managed by CombatLayoutManager, not cached here

  // Cached turn order renderer (maintains scroll state across renders)
  private turnOrderRenderer: TurnOrderRenderer | null = null;

  // Pending combat log messages (added in render when combatLog is available)
  private pendingLogMessages: string[] = [];

  // Cached tinting buffer (reused across all tinting operations to avoid creating canvases every frame)
  private tintingBuffer: HTMLCanvasElement | null = null;
  private tintingBufferCtx: CanvasRenderingContext2D | null = null;

  // Store current state for click handlers
  private currentState: CombatState | null = null;

  // Movement tracking (resets when new unit's turn starts)
  private unitHasMoved: boolean = false;
  private originalPosition: Position | null = null; // Position before move (for reset)
  private canResetMove: boolean = false; // True after move completes, false after any action

  // Movement animation
  private movementSequence: UnitMovementSequence | null = null;

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

    // Get movement range and color override from strategy
    const movementRange = this.currentStrategy?.getMovementRange() ?? [];
    const rangeColorOverride = this.currentStrategy?.getMovementRangeColor();

    // Determine movement range color (green in move mode, yellow otherwise)
    const rangeColor = rangeColorOverride ?? CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALBEDO;

    // Render movement range highlights - rendered BEFORE units
    for (const position of movementRange) {
      // Per GeneralGuidelines.md - round coordinates for pixel-perfect rendering
      const x = Math.floor(offsetX + (position.x * tileSize));
      const y = Math.floor(offsetY + (position.y * tileSize));

      // Render with color override (green in move mode, yellow otherwise)
      this.renderTintedSprite(
        ctx,
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize,
        rangeColor,  // Use color override for green in move mode
        CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALPHA
      );
    }

    // Get movement path preview (yellow tiles on hover)
    const movementPath = this.currentStrategy?.getMovementPath() ?? null;

    // Render movement path preview - rendered BEFORE units, AFTER range
    if (movementPath && movementPath.length > 0) {
      for (const position of movementPath) {
        const x = Math.floor(offsetX + (position.x * tileSize));
        const y = Math.floor(offsetY + (position.y * tileSize));

        // Yellow path overlay (including destination)
        this.renderTintedSprite(
          ctx,
          CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE,
          spriteImages,
          spriteSize,
          x,
          y,
          tileSize,
          tileSize,
          CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALBEDO,  // Yellow
          CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALPHA
        );
      }
    }
  }

  renderUI(_state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

    // Render animated unit during movement (rendered AFTER normal units to override)
    if (this.movementSequence) {
      const animatedUnit = this.movementSequence.getUnit();
      const renderPosition = this.movementSequence.getUnitRenderPosition();

      const x = Math.floor(offsetX + (renderPosition.x * tileSize));
      const y = Math.floor(offsetY + (renderPosition.y * tileSize));

      SpriteRenderer.renderSpriteById(
        ctx,
        animatedUnit.spriteId,
        spriteImages,
        spriteSize,
        x,
        y,
        tileSize,
        tileSize
      );
    }

    // Render active unit cursor (dark green, blinking) - rendered AFTER units per user feedback
    if (this.activeUnitPosition && this.cursorVisible && !this.movementSequence) {
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

    // Get target position from strategy
    const targetedPosition = this.currentStrategy?.getTargetedPosition();

    // Render target cursor (red, always visible) - rendered AFTER units per user feedback
    // Only show red cursor if targeting a DIFFERENT unit than the active unit
    if (targetedPosition) {
      const isTargetingActiveUnit =
        this.activeUnitPosition &&
        targetedPosition.x === this.activeUnitPosition.x &&
        targetedPosition.y === this.activeUnitPosition.y;

      if (!isTargetingActiveUnit) {
        // Per GeneralGuidelines.md - round coordinates for pixel-perfect rendering
        const x = Math.floor(offsetX + (targetedPosition.x * tileSize));
        const y = Math.floor(offsetY + (targetedPosition.y * tileSize));

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

    // Get attack range from strategy (only in attack mode)
    const attackRange = this.currentStrategy?.getAttackRange?.() ?? null;
    const hoveredAttackTarget = this.currentStrategy?.getHoveredAttackTarget?.() ?? null;

    // Render attack range highlights - rendered AFTER units (on top)
    // Each tile gets exactly ONE color based on priority:
    // 1. Orange (hovered target) - highest priority
    // 2. Yellow (valid target)
    // 3. Grey (blocked)
    // 4. Red (base range) - lowest priority
    if (attackRange) {
      // Build a map of position -> color to determine which color each tile should have
      const tileColors = new Map<string, string>();

      // Helper to create position key
      const posKey = (pos: Position) => `${pos.x},${pos.y}`;

      // Start with red for all base range tiles (lowest priority)
      for (const position of attackRange.inRange) {
        tileColors.set(posKey(position), CombatConstants.UNIT_TURN.ATTACK_RANGE_BASE_COLOR);
      }

      // Override with grey for blocked tiles (higher priority)
      for (const position of attackRange.blocked) {
        tileColors.set(posKey(position), CombatConstants.UNIT_TURN.ATTACK_RANGE_BLOCKED_COLOR);
      }

      // Override with yellow for valid targets (even higher priority)
      for (const position of attackRange.validTargets) {
        tileColors.set(posKey(position), CombatConstants.UNIT_TURN.ATTACK_TARGET_VALID_COLOR);
      }

      // Override with orange for hovered target (highest priority)
      if (hoveredAttackTarget) {
        tileColors.set(posKey(hoveredAttackTarget), CombatConstants.UNIT_TURN.ATTACK_TARGET_HOVER_COLOR);
      }

      // Now render each tile exactly once with its final color
      for (const [key, color] of tileColors.entries()) {
        const [xStr, yStr] = key.split(',');
        const position = { x: parseInt(xStr), y: parseInt(yStr) };

        const x = Math.floor(offsetX + (position.x * tileSize));
        const y = Math.floor(offsetY + (position.y * tileSize));

        this.renderTintedSprite(
          ctx,
          CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE,
          spriteImages,
          spriteSize,
          x,
          y,
          tileSize,
          tileSize,
          color,
          CombatConstants.UNIT_TURN.ATTACK_RANGE_ALPHA
        );
      }
    }
  }

  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // Store state reference for click handlers
    this.currentState = state;

    // Handle movement animation if in progress
    if (this.movementSequence) {
      const isComplete = this.movementSequence.update(deltaTime);

      if (isComplete) {
        // Animation finished - finalize position
        const newState = this.completeMoveAnimation(state);
        this.movementSequence = null;

        // Stay in unit-turn phase (don't auto-advance turn)
        return newState;
      }

      // Animation still playing - stay in phase
      return state;
    }

    // Find the unit with highest action timer (first ready)
    const allUnits = state.unitManifest.getAllUnits();
    const sortedUnits = allUnits.sort((a, b) => {
      if (b.unit.actionTimer !== a.unit.actionTimer) {
        return b.unit.actionTimer - a.unit.actionTimer;
      }
      return a.unit.name.localeCompare(b.unit.name);
    });

    // Initialize active unit and strategy on first frame
    if (sortedUnits.length > 0 && !this.activeUnit) {
      const readyPlacement = sortedUnits[0];
      this.activeUnit = readyPlacement.unit;
      this.activeUnitPosition = readyPlacement.position;

      // Reset movement tracking for new unit
      this.unitHasMoved = false;
      this.originalPosition = null;
      this.canResetMove = false;

      // Initialize appropriate strategy based on unit control
      this.currentStrategy = this.activeUnit.isPlayerControlled
        ? new PlayerTurnStrategy()
        : new EnemyTurnStrategy();

      // Notify strategy that turn is starting
      this.currentStrategy.onTurnStart(this.activeUnit, this.activeUnitPosition, state);
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

    // Update strategy and check for action decision
    if (this.currentStrategy && this.activeUnit && this.activeUnitPosition) {
      // Check for pending messages from strategy (e.g., "Click a tile to move...")
      if ('getPendingMessage' in this.currentStrategy) {
        const message = (this.currentStrategy as any).getPendingMessage();
        if (message) {
          this.pendingLogMessages.push(message);
        }
      }

      const action = this.currentStrategy.update(
        this.activeUnit,
        this.activeUnitPosition,
        state,
        encounter,
        deltaTime
      );

      // If strategy has decided on an action, execute it
      if (action) {
        if (action.type === 'move') {
          // Start movement animation
          return this.startMoveAnimation(action.destination, state);
        } else if (action.type === 'reset-move') {
          // Reset move - teleport back to original position
          return this.executeResetMove(state);
        } else {
          // Execute other actions (delay, end-turn)
          const newState = this.executeAction(action, state);
          this.currentStrategy.onTurnEnd();
          return newState;
        }
      }
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

  /**
   * Execute a turn action (Delay or End Turn)
   * Updates the active unit's action timer and transitions back to action-timer phase
   */
  private executeAction(action: TurnAction, state: CombatState): CombatState {
    if (!this.activeUnit) {
      console.warn('[UnitTurnPhaseHandler] No active unit for action execution');
      return state;
    }

    let newActionTimer: number;
    let logMessage: string;

    // Determine action effects
    switch (action.type) {
      case 'delay':
        newActionTimer = 50;
        logMessage = `[color=${this.getUnitNameColor()}]${this.activeUnit.name}[/color] delays...`;
        break;

      case 'end-turn':
        newActionTimer = 0;
        logMessage = `[color=${this.getUnitNameColor()}]${this.activeUnit.name}[/color] ends turn.`;
        break;

      default:
        console.warn('[UnitTurnPhaseHandler] Unknown action type:', action);
        return state;
    }

    // Capture current turn order BEFORE mutation (for slide animation)
    // Get turn order from the turn order renderer if available
    // Store the actual unit instances (not names) to handle duplicate names correctly
    const previousTurnOrder = this.turnOrderRenderer
      ? this.turnOrderRenderer.getUnits()
      : [];

    // IMPORTANT: Do NOT mutate the action timer here!
    // If we mutate now, the current frame will render with the new turn order,
    // causing a visual "flash" before the animation starts.
    // Instead, store the mutation in state and apply it in ActionTimerPhaseHandler.
    // (this.activeUnit as any)._actionTimer = newActionTimer; // REMOVED

    // Add message to combat log (via pending messages)
    this.pendingLogMessages.push(logMessage);

    // Return new state transitioning back to action-timer phase
    // Set pendingSlideAnimation flag and previousTurnOrder for animation
    // Store the pending mutation to be applied in action-timer phase
    return {
      ...state,
      phase: 'action-timer' as const,
      pendingSlideAnimation: true,
      previousTurnOrder: previousTurnOrder.length > 0 ? previousTurnOrder : undefined,
      pendingActionTimerMutation: { unit: this.activeUnit, newValue: newActionTimer }
    };
  }

  /**
   * Start movement animation for active unit
   */
  private startMoveAnimation(destination: Position, state: CombatState): CombatState | null {
    if (!this.activeUnit || !this.activeUnitPosition) {
      console.warn('[UnitTurnPhaseHandler] Cannot start move - no active unit');
      return state;
    }

    // Store original position for potential reset
    this.originalPosition = { ...this.activeUnitPosition };

    // Calculate path from current position to destination
    const path = MovementPathfinder.calculatePath({
      start: this.activeUnitPosition,
      end: destination,
      maxRange: this.activeUnit.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: this.activeUnit
    });

    if (path.length === 0) {
      console.warn('[UnitTurnPhaseHandler] Cannot move - no valid path to destination');
      return state;
    }

    // Create movement sequence
    this.movementSequence = new UnitMovementSequence(
      this.activeUnit,
      this.activeUnitPosition,
      path
    );

    // Temporarily move unit off-screen in manifest to hide it during animation
    // (we render it manually at the animated position in renderUI)
    state.unitManifest.moveUnit(this.activeUnit, CombatConstants.UNIT_TURN.OFFSCREEN_POSITION);

    // Add log message
    const nameColor = this.getUnitNameColor();
    const logMessage = `[color=${nameColor}]${this.activeUnit.name}[/color] moves.`;
    this.pendingLogMessages.push(logMessage);

    // Stay in unit-turn phase while animation plays
    return state;
  }

  /**
   * Complete movement animation - update position and set hasMoved flag
   */
  private completeMoveAnimation(state: CombatState): CombatState {
    if (!this.movementSequence || !this.activeUnit || !this.activeUnitPosition) {
      return state;
    }

    // Get final position from animation
    const finalPosition = this.movementSequence.getDestination();

    // Update unit position in manifest
    state.unitManifest.moveUnit(this.activeUnit, {
      x: Math.round(finalPosition.x),
      y: Math.round(finalPosition.y)
    });

    // Update cached active position
    this.activeUnitPosition = {
      x: Math.round(finalPosition.x),
      y: Math.round(finalPosition.y)
    };

    // Update strategy's targeted position to match new location
    if (this.currentStrategy && 'selectUnit' in this.currentStrategy) {
      (this.currentStrategy as any).selectUnit(
        this.activeUnit,
        this.activeUnitPosition,
        state
      );
    }

    // Mark unit as having moved
    this.unitHasMoved = true;
    this.canResetMove = true; // Enable reset move option

    // Notify strategy that unit has moved (clears movement range)
    if (this.currentStrategy && 'onUnitMoved' in this.currentStrategy) {
      (this.currentStrategy as any).onUnitMoved();
    }

    return state;
  }

  /**
   * Execute reset move - teleport unit back to original position
   */
  private executeResetMove(state: CombatState): CombatState {
    if (!this.activeUnit || !this.originalPosition) {
      console.warn('[UnitTurnPhaseHandler] Cannot reset move - no original position stored');
      return state;
    }

    // Teleport unit back to original position
    state.unitManifest.moveUnit(this.activeUnit, this.originalPosition);

    // Update cached active position
    this.activeUnitPosition = { ...this.originalPosition };

    // Reset movement flags
    this.unitHasMoved = false;
    this.canResetMove = false;

    // Clear original position
    this.originalPosition = null;

    // Notify strategy to restore movement range
    if (this.currentStrategy && 'onMoveReset' in this.currentStrategy) {
      (this.currentStrategy as any).onMoveReset(this.activeUnit, this.activeUnitPosition, state);
    }

    // Add log message
    const nameColor = this.getUnitNameColor();
    const logMessage = `[color=${nameColor}]${this.activeUnit.name}[/color] resets movement.`;
    this.pendingLogMessages.push(logMessage);

    return state;
  }

  /**
   * Get the color for the active unit's name in combat log messages
   */
  private getUnitNameColor(): string {
    if (!this.activeUnit) return '#ffffff';
    return this.activeUnit.isPlayerControlled
      ? CombatConstants.UNIT_TURN.PLAYER_NAME_COLOR
      : CombatConstants.UNIT_TURN.ENEMY_NAME_COLOR;
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
    // This method only returns content for the TOP info panel (targeted unit info)
    // The bottom panel (actions menu) is managed by CombatLayoutManager and updated by CombatView

    const targetedUnit = this.currentStrategy?.getTargetedUnit();

    // If targeting a different unit than active, show that unit's info in top panel
    if (targetedUnit && targetedUnit !== this.activeUnit && this.activeUnit) {
      // Determine title color based on unit's allegiance
      const titleColor = targetedUnit.isPlayerControlled
        ? CombatConstants.UNIT_TURN.PLAYER_NAME_COLOR
        : CombatConstants.UNIT_TURN.ENEMY_NAME_COLOR;

      // Create or update cached instance
      if (!this.unitInfoContent) {
        this.unitInfoContent = new UnitInfoContent(
          {
            title: targetedUnit.name,
            titleColor: titleColor,
            padding: 1,
            lineSpacing: 8,
          },
          targetedUnit
        );
      } else {
        this.unitInfoContent.updateUnit(targetedUnit, targetedUnit.name, titleColor);
      }

      return this.unitInfoContent;
    }

    return null;
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
    return this.currentStrategy?.getTargetedUnit() ?? null;
  }

  /**
   * Get the current active action for the actions menu (e.g., 'move' when in move selection mode, 'attack' when in attack mode)
   */
  getActiveAction(): string | null {
    const strategyMode = this.currentStrategy?.getMode() ?? 'normal';
    if (strategyMode === 'moveSelection') {
      return 'move';
    }
    if (strategyMode === 'attackSelection') {
      return 'attack';
    }
    return null;
  }

  /**
   * Check if the active unit has already moved this turn
   */
  hasUnitMoved(): boolean {
    return this.unitHasMoved;
  }

  /**
   * Check if the move can be reset
   */
  getCanResetMove(): boolean {
    return this.canResetMove;
  }

  /**
   * Handle unit clicks from the turn order panel
   * Delegates to the current strategy (PlayerTurnStrategy handles this, EnemyTurnStrategy ignores it)
   */
  private handleTurnOrderUnitClick(unit: CombatUnit): void {
    if (!this.currentState || !this.currentStrategy) {
      console.warn('[UnitTurnPhaseHandler] Cannot handle turn order click - no current state or strategy');
      return;
    }

    // Find the unit's position on the map
    const placement = this.currentState.unitManifest.getAllUnits().find(p => p.unit === unit);

    if (!placement) {
      console.warn(`[UnitTurnPhaseHandler] Clicked unit not found in manifest: ${unit.name}`);
      return;
    }

    // Create a fake mouse event context for the strategy
    const context: MouseEventContext = {
      canvasX: 0,
      canvasY: 0,
      tileX: placement.position.x,
      tileY: placement.position.y
    };

    // Delegate to strategy
    this.currentStrategy.handleMapClick(context, this.currentState, this.currentState as any);
  }

  handleMapClick(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult {
    // Delegate to strategy
    if (this.currentStrategy) {
      return this.currentStrategy.handleMapClick(context, state, encounter);
    }

    return { handled: false };
  }

  handleMouseMove(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult {
    // Delegate to strategy
    if (this.currentStrategy) {
      return this.currentStrategy.handleMouseMove(context, state, encounter);
    }

    return { handled: false };
  }

  handleInfoPanelClick(
    _relativeX: number,
    _relativeY: number,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    // Panel clicks are not directly handled here - CombatView forwards
    // PanelClickResult events from ActionsMenuContent to this handler
    // This method exists to satisfy the CombatPhaseHandler interface
    return { handled: false };
  }

  /**
   * Handle action selection from the Actions menu panel
   * Forwards the action to the current strategy (PlayerTurnStrategy or EnemyTurnStrategy)
   * @param actionId - The ID of the selected action ('delay', 'end-turn', etc.)
   */
  handleActionSelected(actionId: string): void {
    if (this.currentStrategy) {
      this.currentStrategy.handleActionSelected(actionId);
    }
  }

  /**
   * Get whether the active unit has moved this turn
   */
  getHasMoved(): boolean {
    return this.unitHasMoved;
  }

  /**
   * Mark the active unit as having moved this turn
   */
  setHasMoved(value: boolean): void {
    this.unitHasMoved = value;
  }

  /**
   * Handle cancel attack action
   */
  handleCancelAttack(): void {
    if (this.currentStrategy && 'handleCancelAttack' in this.currentStrategy) {
      (this.currentStrategy as any).handleCancelAttack();
    }
  }
}

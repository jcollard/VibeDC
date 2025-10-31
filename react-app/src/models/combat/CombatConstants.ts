/**
 * Centralized constants for the combat system
 * This file contains all magic numbers, text content, and configuration values
 * used throughout the combat view and phase handlers.
 */

export const CombatConstants = {
  // Canvas dimensions (base resolution: 32x18 tiles at 12px each = 384x216)
  // This is the native canvas size - CSS scaling handles display sizing
  CANVAS_WIDTH: 384,  // 32 tiles × 12px
  CANVAS_HEIGHT: 216, // 18 tiles × 12px
  TILE_SIZE: 12,      // 1:1 with sprite size (no internal scaling)
  SPRITE_SIZE: 12,    // Base sprite size (12x12 pixels)

  // UI Layout (scaled down from previous 1706x960 by factor of ~4.44)
  UI: {
    TITLE_HEIGHT: 20,
    TITLE_Y_POSITION: 0,
    MESSAGE_SPACING: 2,
    WAYLAID_MESSAGE_Y: 22, // TITLE_HEIGHT + MESSAGE_SPACING

    BUTTON: {
      WIDTH: 55,
      HEIGHT: 13,
      FONT_SIZE: 9,
    },
  },

  // Typography
  FONTS: {
    // Font sizes (informational only - actual scaling done at render time)
    TITLE_SIZE: 12,
    MESSAGE_SIZE: 9,
    DIALOG_SIZE: 9,

    // Font IDs from FontRegistry
    TITLE_FONT_ID: '15px-dungeonslant',  // Large font for titles and headers
    UI_FONT_ID: '7px-04b03',             // Small font for UI panels, combat log, turn order, etc.
  },

  // Animation
  ANIMATION: {
    MAP_FADE_DURATION: 2.0,
    TITLE_FADE_DURATION: 1.0,
    MESSAGE_FADE_DURATION: 1.0,

    DEPLOYMENT_ZONE: {
      CYCLE_TIME: 2.0,
      MIN_ALPHA: 0.0,
      MAX_ALPHA: 0.25,
    },

    DITHERING: {
      PIXEL_SIZE: 1, // Reduced from 4 to 1 for smaller resolution
      BAYER_MATRIX: [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
      ] as const,
    },
  },

  // Enemy Deployment
  ENEMY_DEPLOYMENT: {
    ANIMATION_DURATION: 1.0, // seconds per enemy
    STAGGER_DELAY: 0.5, // seconds between enemy animation starts
    ENEMY_NAME_COLOR: '#ff0000', // red for enemy names
  },

  // Unit Turn Phase
  UNIT_TURN: {
    // Ready message colors
    PLAYER_NAME_COLOR: '#00cc00',      // Green (matches deployment)
    ENEMY_NAME_COLOR: '#ff0000',       // Red (matches enemy deployment)

    // Active unit cursor (gradient animation for maximum visibility)
    // Cycles through 6 phases: black → dark gray → medium gray → white → medium gray → dark gray
    CURSOR_SPRITE_ID: 'particles-5',
    CURSOR_BLINK_RATE: 1.0,            // Full gradient cycle in seconds

    // Target unit cursor (red, always visible)
    TARGET_CURSOR_SPRITE_ID: 'particles-5',
    TARGET_CURSOR_ALBEDO: '#ff0000',

    // Movement range highlights (yellow, semi-transparent)
    MOVEMENT_HIGHLIGHT_SPRITE: 'particles-4',
    MOVEMENT_HIGHLIGHT_ALBEDO: '#ffff00',
    MOVEMENT_HIGHLIGHT_ALPHA: 0.33,

    // Movement animation
    MOVEMENT_SPEED_PER_TILE: 0.2,      // Seconds per tile during movement animation
    MOVEMENT_RANGE_COLOR_NORMAL: '#ffff00',  // Yellow (normal selection)
    MOVEMENT_RANGE_COLOR_ACTIVE: '#00ff00',  // Green (during move mode)
    OFFSCREEN_POSITION: { x: -999, y: -999 } as const, // Off-screen position for hiding units during animation

    // Attack range highlights
    ATTACK_RANGE_BASE_COLOR: '#ff0000',      // Red (base attack range)
    ATTACK_RANGE_BLOCKED_COLOR: '#ffffff',   // White (blocked tiles - no line of sight)
    ATTACK_TARGET_VALID_COLOR: '#ffff00',    // Yellow (valid enemy targets)
    ATTACK_TARGET_HOVER_COLOR: '#ffa500',    // Orange (hovered target)
    ATTACK_TARGET_SELECTED_COLOR: '#00ff00', // Green (selected target)
    ATTACK_RANGE_ALPHA: 0.33,                // Semi-transparent like movement highlights
  },

  // Combat Log
  COMBAT_LOG: {
    MAX_MESSAGE_WIDTH: 200, // Maximum width in pixels for a single message line
    FONT_ID: '7px-04b03', // Font used for combat log messages
  },

  // Text Content
  TEXT: {
    DEPLOY_TITLE: 'Deploy Units',
    WAYLAID_MESSAGE: 'You have been waylaid by enemies and must defend yourself.',
    WAYLAID_MESSAGE_LINE1: 'You have been waylaid by enemies and must defend',
    WAYLAID_MESSAGE_LINE2: 'yourself.',
    DEPLOYMENT_INSTRUCTION: 'Click [sprite:gradients-7] to deploy a unit.',
    SELECT_PARTY_MEMBER: 'Select a [color=#ffa500]Party Member[/color] to deploy',
    START_COMBAT_BUTTON: 'Start Combat',
    UNITS_DEPLOYED: '[color=#ffa500]Party Members[/color] ready! Enter combat?',
    STARTING_ENEMY_DEPLOYMENT: 'Starting Enemy Deployment',
    ENEMIES_APPROACH: 'Enemies Approach',
  },

  // Rendering
  RENDERING: {
    BACKGROUND_ALPHA: 0.7,
    TEXT_SHADOW_OFFSET: 2,
    TEXT_COLOR: '#ffffff',
  },

  // AI Behavior
  AI: {
    THINKING_DURATION: 1.0,           // Seconds AI "thinks" before acting
    UNARMED_ATTACK_RANGE: 1,          // Melee range for unarmed attacks
    UNARMED_POWER_MODIFIER: 0,        // No bonus modifier for unarmed
    UNARMED_POWER_MULTIPLIER: 1.0,    // No bonus multiplier for unarmed
    DEBUG_LOGGING: true,              // Enable/disable debug console logs
  },

  /**
   * Constants for knocked-out unit rendering and behavior
   *
   * Units are considered KO'd when wounds >= maxHealth (via isKnockedOut getter).
   * KO'd units:
   * - Display with grey tint on map and in turn order
   * - Show red "KO" text overlay on their tile
   * - Don't accumulate action timer (stay at 0)
   * - Never get turns
   * - Allow traversal but not as movement destinations
   * - Cannot be targeted for attacks
   * - Are invisible to AI decision-making
   */
  KNOCKED_OUT: {
    // Map overlay text
    MAP_TEXT: 'KO' as const,
    MAP_TEXT_COLOR: '#ff0000' as const,     // Red
    MAP_FONT_ID: '7px-04b03' as const,

    // Turn order label
    TURN_ORDER_TEXT: 'KO' as const,
    TURN_ORDER_COLOR: '#ff0000' as const,   // Red
    TURN_ORDER_FONT_ID: '7px-04b03' as const,

    // Grey tint settings (for canvas filter)
    // Example usage: ctx.filter = CombatConstants.KNOCKED_OUT.TINT_FILTER;
    // Always reset after use: ctx.filter = 'none';
    TINT_FILTER: 'saturate(0%) brightness(70%)' as const,

    // Revival mechanics (future feature)
    REVIVAL_ENABLED: false as const,        // Not yet implemented
  } as const,

  /**
   * Constants for defeat screen modal and overlay
   */
  DEFEAT_SCREEN: {
    // Overlay
    OVERLAY_OPACITY: 0.5 as const,
    OVERLAY_COLOR: '#000000' as const,

    // Modal dimensions
    MODAL_WIDTH: 200 as const,
    MODAL_PADDING: 16 as const,
    BUTTON_SPACING: 8 as const,
    HELPER_SPACING: 4 as const,

    // Title
    TITLE_TEXT: 'Defeat' as const,
    TITLE_FONT_ID: '15px-dungeonslant' as const,
    TITLE_SIZE: 12 as const,
    TITLE_COLOR: '#ff0000' as const,  // Red

    // Buttons
    BUTTON_FONT_ID: '7px-04b03' as const,
    BUTTON_SIZE: 7 as const,
    BUTTON_COLOR_NORMAL: '#ffffff' as const,
    BUTTON_COLOR_HOVER: '#ffff00' as const,  // Yellow

    // Helper text
    HELPER_FONT_ID: '7px-04b03' as const,
    HELPER_SIZE: 5 as const,
    HELPER_COLOR: '#aaaaaa' as const,  // Light grey

    // Text content
    TRY_AGAIN_TEXT: 'Try Again' as const,
    TRY_AGAIN_HELPER: 'Restart this encounter to try again' as const,
    SKIP_TEXT: 'Skip Encounter' as const,
    SKIP_HELPER: 'Skips this encounter and all rewards' as const,

    // Combat log
    DEFEAT_MESSAGE: 'The enemies have triumphed over you!' as const,
  } as const,

  /**
   * Constants for victory screen modal and overlay
   */
  VICTORY_SCREEN: {
    // Overlay
    OVERLAY_OPACITY: 0.5 as const,
    OVERLAY_COLOR: '#000000' as const,

    // Modal dimensions (grid-based: columns 1-19 = 18 cols × 12px = 216px, rows 3-13 = 10 rows × 12px = 120px)
    MODAL_X: 18 as const,      // Column 1 × 12px + 6px adjustment
    MODAL_Y: 42 as const,      // Row 3 × 12px + 6px adjustment
    MODAL_WIDTH: 216 as const, // 18 columns × 12px (columns 1-19)
    MODAL_HEIGHT: 120 as const, // 10 rows × 12px (rows 3-13)
    MODAL_PADDING: 8 as const,  // Reduced padding to fit content

    // Title
    TITLE_TEXT: 'Victory!' as const,
    TITLE_FONT_ID: '15px-dungeonslant' as const,
    TITLE_COLOR: '#00ff00' as const,  // Green

    // Content sections
    SECTION_FONT_ID: '7px-04b03' as const,
    SECTION_LABEL_COLOR: '#ffff00' as const,  // Yellow
    SECTION_VALUE_COLOR: '#ffffff' as const,  // White
    SECTION_SPACING: 8 as const,

    // Item grid
    ITEM_GRID_COLUMNS: 3 as const,
    ITEM_CELL_SIZE: 12 as const,
    ITEM_SPACING: 4 as const,
    ITEM_HOVER_COLOR: '#ffff00' as const,      // Yellow border
    ITEM_SELECTED_COLOR: '#00ff00' as const,   // Green border
    ITEM_BACKGROUND: '#333333' as const,       // Dark grey
    ITEM_LABEL_COLOR: '#ffffff' as const,      // White

    // Continue button
    CONTINUE_TEXT: 'Continue' as const,
    CONTINUE_FONT_ID: '7px-04b03' as const,
    CONTINUE_COLOR_NORMAL: '#ffffff' as const,
    CONTINUE_COLOR_HOVER: '#ffff00' as const,  // Yellow
    CONTINUE_COLOR_DISABLED: '#666666' as const, // Grey

    // Combat log
    VICTORY_MESSAGE: 'You are victorious!' as const,
  } as const,
} as const;

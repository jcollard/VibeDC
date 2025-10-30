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
} as const;

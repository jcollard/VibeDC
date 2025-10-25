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

  // Typography (informational only - actual scaling done at render time)
  FONTS: {
    TITLE_SIZE: 12,
    MESSAGE_SIZE: 9,
    DIALOG_SIZE: 9,
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

  // Text Content
  TEXT: {
    DEPLOY_TITLE: 'Deploy Units',
    WAYLAID_MESSAGE: 'You have been waylaid by enemies and must defend yourself.',
    DEPLOYMENT_INSTRUCTION: 'Click [sprite:gradients-7] to deploy a unit.',
    START_COMBAT_BUTTON: 'Start Combat',
  },

  // Rendering
  RENDERING: {
    BACKGROUND_ALPHA: 0.7,
    TEXT_SHADOW_OFFSET: 2,
    TEXT_COLOR: '#ffffff',
  },
} as const;

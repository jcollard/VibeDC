/**
 * Centralized constants for the combat system
 * This file contains all magic numbers, text content, and configuration values
 * used throughout the combat view and phase handlers.
 */

export const CombatConstants = {
  // Canvas dimensions
  CANVAS_WIDTH: 1706,
  CANVAS_HEIGHT: 960,
  TILE_SIZE: 120,
  SPRITE_SIZE: 120,

  // UI Layout
  UI: {
    TITLE_HEIGHT: 80,
    TITLE_Y_POSITION: 0,
    MESSAGE_SPACING: 8,
    WAYLAID_MESSAGE_Y: 88, // TITLE_HEIGHT + MESSAGE_SPACING

    BUTTON: {
      WIDTH: 220,
      HEIGHT: 50,
      FONT_SIZE: 36,
    },
  },

  // Typography
  FONTS: {
    TITLE_SIZE: 48,
    MESSAGE_SIZE: 36,
    DIALOG_SIZE: 36,
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
      PIXEL_SIZE: 4,
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

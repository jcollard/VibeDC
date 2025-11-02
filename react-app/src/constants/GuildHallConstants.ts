/**
 * Constants for Guild Hall UI layout, colors, and messages.
 * Used by GuildHallView and related components.
 */
export const GuildHallConstants = {
  // Canvas dimensions
  CANVAS_WIDTH: 384,
  CANVAS_HEIGHT: 216,

  // Active Party Panel (Left Side)
  ACTIVE_PARTY_PANEL: {
    x: 0,
    y: 24,
    width: 180,
    height: 168,
    TITLE_TEXT: 'Active Party',
    TITLE_COLOR: '#ffff00',
    MAX_PARTY_SIZE: 4,
    EMPTY_SLOT_TEXT: 'Empty Slot',
    EMPTY_COLOR: '#888888',
  },

  // Guild Roster Panel (Right Side)
  GUILD_ROSTER_PANEL: {
    x: 192,
    y: 24,
    width: 192,
    height: 168,
    TITLE_TEXT: 'Guild Roster',
    TITLE_COLOR: '#ffff00',
    EMPTY_TEXT: 'No characters available',
    EMPTY_COLOR: '#888888',
    MAX_VISIBLE_CARDS: 5, // Maximum number of roster cards visible at once
    CARD_HEIGHT: 28, // Height of each roster card (including spacing)
    PAGE_INDICATOR_COLOR: '#888888',
    ARROW_SIZE: 12, // Size of navigation arrows
  },

  // Party Member Card (Active Party)
  PARTY_MEMBER_CARD: {
    WIDTH: 172,
    HEIGHT: 36,
    SPRITE_SIZE: 24, // 2× scaled (12px sprite * 2)
    PADDING: 4,
    BORDER_NORMAL: '#888888',
    BORDER_HOVER: '#ffff00',
    BORDER_SELECTED: '#ffff00',
    NAME_COLOR: '#ffffff',
    CLASS_COLOR: '#888888',
    LEVEL_COLOR: '#ffff00',
    REMOVE_BUTTON_COLOR: '#ff0000',
    HP_BAR_COLOR: '#00ff00',
    MANA_BAR_COLOR: '#0000ff',
    BAR_WIDTH: 60,
    BAR_HEIGHT: 4,
  },

  // Roster Character Card
  ROSTER_CHARACTER_CARD: {
    WIDTH: 184,
    HEIGHT: 24,
    SPRITE_SIZE: 12, // 1× scaled
    PADDING: 4,
    BG_NORMAL: 'transparent',
    BG_HOVER: '#222222',
    BG_SELECTED: '#333300',
    NAME_COLOR: '#ffffff',
    CLASS_COLOR: '#888888',
    LEVEL_COLOR: '#ffff00',
    ADD_BUTTON_COLOR: '#00ff00',
  },

  // Action Buttons (Bottom)
  ACTION_BUTTONS: {
    y: 204,
    BUTTON_SPACING: 16,
    CREATE_TEXT: 'Recruit Hero',
    RETURN_TEXT: 'Exit Guild Hall',
    COLOR_NORMAL: '#ffffff',
    COLOR_HOVER: '#ffff00',
  },

  // Character Creation Modal (for future use in Part 3)
  CHARACTER_CREATION_MODAL: {
    OVERLAY_OPACITY: 0.7,
    MODAL_WIDTH: 240,
    TITLE_TEXT: 'Recruit Hero',
    TITLE_COLOR: '#ffff00',
    UI_FONT_ID: '7px-04b03',

    // Name Input
    NAME_LABEL: 'Name',
    NAME_MAX_LENGTH: 12,
    INPUT_WIDTH: 72, // 6 * 12 px
    INPUT_HEIGHT: 14,
    INPUT_BG: '#333333',
    INPUT_BORDER_NORMAL: '#ffffff',
    INPUT_BORDER_FOCUS: '#ffff00',
    INPUT_TEXT_COLOR: '#ffffff',

    // Sprite Selection
    SPRITE_LABEL: 'Appearance:',
    SPRITE_PREVIEW_SIZE: 48, // 4× scaled
    SPRITE_GRID_COLS: 8,
    SPRITE_GRID_ROWS: 4,
    SPRITE_GRID_CELL_SIZE: 12,
    SPRITE_BORDER_SELECTED: '#ffff00',
    SPRITE_TINT_HOVER: 'rgba(255, 255, 0, 0.3)',

    // Class Selection
    CLASS_LABEL: 'Class',
    CLASS_LIST_HEIGHT: 60,
    CLASS_ITEM_HEIGHT: 12,
    CLASS_COLOR_NORMAL: '#ffffff',
    CLASS_COLOR_SELECTED: '#ffff00',

    // Class Info Display
    CLASS_INFO_WIDTH: 200,
    CLASS_NAME_COLOR: '#ffff00',
    CLASS_DESC_COLOR: '#ffffff',
    CLASS_STATS_COLOR: '#888888',

    // Buttons
    CREATE_BUTTON_TEXT: 'Recruit',
    CANCEL_BUTTON_TEXT: 'Cancel',
    BUTTON_COLOR_ENABLED: '#00ff00',
    BUTTON_COLOR_DISABLED: '#888888',
    BUTTON_COLOR_NORMAL: '#ffffff',
    BUTTON_COLOR_HOVER: '#ffff00',
  },

  // Error Messages
  ERROR_PARTY_FULL: 'Party is full! (Max 4 members)',
  ERROR_NAME_EXISTS: 'Name already exists',
  ERROR_INVALID_NAME: 'Name must be 1-12 letters (A-Z)',

  // Success Messages
  SUCCESS_CHARACTER_CREATED: '[NAME] created!',
  SUCCESS_ADDED_TO_PARTY: '[NAME] added to party',
  SUCCESS_REMOVED_FROM_PARTY: '[NAME] removed from party',
};

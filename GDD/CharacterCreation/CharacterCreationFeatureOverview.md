# Character Creation / Guild Hall Feature - Design Overview

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [PartyMemberRegistry.ts](../../react-app/src/utils/PartyMemberRegistry.ts), [party-definitions.yaml](../../react-app/src/data/party-definitions.yaml)

## Purpose

This document describes the Character Creation and Guild Hall management system. Players can create custom party members, configure their starting class and appearance, and manage their active party roster (maximum 4 members). The Guild Hall serves as a central hub for all party management activities before entering combat encounters.

## Feature Summary

The Guild Hall provides players with:
- **Character Creation**: Create new party members with custom names, sprite selection, and starting class
- **Party Management**: Add/remove party members to/from active party (max 4 members)
- **Guild Roster**: View all created characters not currently in the active party
- **Visual Customization**: Choose from available character sprites for each party member
- **Class Selection**: Select starting class which determines initial equipment and base stats
- **Validation**: 12-character ASCII name limit, sprite selection required, class selection required
- **Persistence**: Characters are stored and can be recalled for future use

## Core Requirements

### 1. Guild Hall Screen Layout

#### Visual Structure
The Guild Hall is a full-screen canvas-based UI (384×216px) divided into functional regions:

**Active Party Panel** (Left Side)
- **Position**: Rows 2-16, Columns 0-14 (0px, 24px, 180px, 168px)
- **Title**: "Active Party" in `15px-dungeonslant` font, yellow `#ffff00`
- **Content**: Display up to 4 party members in vertical list
- **Empty Slots**: Show "Empty Slot" placeholder in grey `#888888`
- **Interactions**: Click to select/deselect party member, click "Remove" button

**Guild Roster Panel** (Right Side)
- **Position**: Rows 2-16, Columns 16-31 (192px, 24px, 192px, 168px)
- **Title**: "Guild Roster" in `15px-dungeonslant` font, yellow `#ffff00`
- **Content**: Scrollable list of all created characters not in active party
- **Empty State**: "No characters available" in grey `#888888`
- **Interactions**: Click to select character, click "Add to Party" button

**Action Buttons** (Bottom)
- **Position**: Row 17, Columns 0-31 (0px, 204px, 384px, 12px)
- **Buttons**: "Create Character", "Return to Title"
- **Spacing**: 16px between buttons, centered horizontally
- **Colors**: White `#ffffff` (normal), Yellow `#ffff00` (hover)

### 2. Character Creation Modal

When "Create Character" is clicked, display a centered modal overlay:

#### Modal Layout
- **Overlay**: Full-screen semi-transparent black (70% opacity)
- **Panel**: 240px × auto height, centered on screen
- **Background**: Black with white 2px border
- **Title**: "Create Character" in `15px-dungeonslant`, yellow `#ffff00`

#### Character Name Input
- **Label**: "Name:" in `7px-04b03` font, white
- **Input Field**:
  - Visual representation as text box (144px wide)
  - Accept keyboard input (ASCII characters only)
  - Max length: 12 characters
  - Active cursor blink at 0.5s rate
  - Background: Dark grey `#333333`, Border: White `#ffffff` 1px
  - Text color: White `#ffffff`
  - Focus state: Yellow border `#ffff00`

#### Sprite Selection
- **Label**: "Appearance:" in `7px-04b03` font, white
- **Display**: Show currently selected sprite (48×48px scaled 4×)
- **Grid**: 8×4 grid of available character sprites (each 12×12px)
- **Source**: All sprites from character sprite sheet(s)
- **Selected Indicator**: Yellow border `#ffff00` 1px around selected sprite
- **Hover Indicator**: Light yellow tint on hovered sprite
- **Interaction**: Click to select sprite, updates preview

#### Class Selection
- **Label**: "Starting Class:" in `7px-04b03` font, white
- **Display**: Dropdown-style list of available classes
- **Options**: Fighter, Apprentice, Rogue (from UnitClass registry)
- **Selected State**: Highlighted in yellow `#ffff00`
- **Interaction**: Click to select class

#### Class Info Display
When a class is selected/hovered, show:
- **Class Name**: Bold, yellow `#ffff00`
- **Description**: 1-2 lines, white `#ffffff`
- **Starting Equipment**: List of equipment IDs, white `#ffffff`
- **Base Stats**: HP, Mana, Power, Speed, etc., white `#ffffff`

#### Buttons
- **Create**: Creates the character and closes modal
  - Enabled only when: name entered, sprite selected, class selected
  - Color: Green `#00ff00` (enabled), Grey `#888888` (disabled)
- **Cancel**: Closes modal without creating character
  - Color: White `#ffffff` (normal), Yellow `#ffff00` (hover)

### 3. Character Data Structure

#### Guild Character Storage
Created characters use the full `PartyMemberDefinition` structure to preserve all progression:

```typescript
// Use existing PartyMemberDefinition from PartyMemberRegistry.ts
interface PartyMemberDefinition {
  id: string;
  name: string;
  unitClassId: string;
  baseHealth: number;
  baseMana: number;
  basePhysicalPower: number;
  baseMagicPower: number;
  baseSpeed: number;
  baseMovement: number;
  basePhysicalEvade: number;
  baseMagicEvade: number;
  baseCourage: number;
  baseAttunement: number;
  spriteId: string;

  // Abilities (learned and assigned)
  learnedAbilityIds?: string[];
  reactionAbilityId?: string;
  passiveAbilityId?: string;
  movementAbilityId?: string;

  // Classes
  secondaryClassId?: string;

  // Equipment
  leftHandId?: string;
  rightHandId?: string;
  headId?: string;
  bodyId?: string;
  accessoryId?: string;

  // Progression
  totalExperience?: number;
  classExperience?: Record<string, number>;
  classExperienceSpent?: Record<string, number>;

  // Metadata
  tags?: string[];
  description?: string;
}
```

**Why use full structure:**
- Characters retain equipment when removed from party
- Learned abilities persist
- Class experience and progression maintained
- No data conversion needed when moving between roster and party
- Single source of truth for character data

**Character Creation Process:**
1. Player inputs name, sprite, starting class
2. Query `UnitClass` registry for class base stats
3. Query class for starting equipment IDs
4. Generate full `PartyMemberDefinition` with:
   - Class base stats
   - Starting equipment from class
   - Default abilities from class (if any)
   - totalExperience: 0
   - All other fields initialized to defaults
5. Store in guild roster with full definition

### 4. Party Member Display

#### Active Party Member Card
For each party member in the active party:

**Layout** (per member, 180px wide × 36px tall)
- **Sprite**: Left side, 24×24px (2× scaled)
- **Name**: Top-right, `7px-04b03`, white `#ffffff`
- **Class**: Below name, `7px-04b03`, grey `#888888`
- **Level**: Below class, `7px-04b03`, yellow `#ffff00` ("Lv. X")
- **Stats Bar**: HP/Mana visual bars (green/blue, 60px wide × 4px tall)
- **Remove Button**: Right edge, "×" symbol, red `#ff0000` (hover)

**Interaction States**
- **Normal**: Grey border `#888888` 1px
- **Hovered**: Yellow border `#ffff00` 1px
- **Selected**: Thick yellow border `#ffff00` 2px

#### Guild Roster Character Card
For each character in the guild roster:

**Layout** (per member, 192px wide × 24px tall)
- **Sprite**: Left side, 12×12px (1× scaled)
- **Name**: Center-left, `7px-04b03`, white `#ffffff`
- **Class**: Right of name, `7px-04b03`, grey `#888888`
- **Level**: Right edge, `7px-04b03`, yellow `#ffff00` ("Lv. X")
- **Add Button**: Right edge, "+" symbol, green `#00ff00` (hover)

**Interaction States**
- **Normal**: No border
- **Hovered**: Light grey background `#222222`
- **Selected**: Yellow background `#333300`

### 5. Party Management Logic

#### Adding Character to Party
When "Add to Party" is clicked:
1. **Validation**: Check if active party has fewer than 4 members
2. **Error**: If party full, show message "Party is full! (Max 4 members)"
3. **Success**:
   - Move character from guild roster to active party
   - Update `inActiveParty` flag to `true`
   - Regenerate party member from template
   - Add to bottom of active party list
   - Refresh both panels

#### Removing Character from Party
When "Remove" is clicked on party member:
1. **Confirmation**: Show modal "Remove [Name] from party?"
2. **Success**:
   - Move character from active party to guild roster
   - Update `inActiveParty` flag to `false`
   - Refresh both panels

#### Party Ordering
- **Active Party**: Manual drag-to-reorder (future feature)
- **Guild Roster**: Alphabetical by name, then by level

### 6. Character Creation Logic

#### Name Validation
- **Rules**:
  - ASCII characters only (A-Z, a-z, 0-9, space, hyphen, apostrophe)
  - 1-12 characters length
  - Cannot be empty or only whitespace
  - Must be unique (no duplicate names in guild)
- **Feedback**:
  - Invalid characters ignored (don't appear in input)
  - Max length reached: visual indicator (border flash red)
  - Duplicate name: Error message "Name already exists"

#### Sprite Selection
- **Available Sprites**: Query sprite registry for character sprites
- **Categories**: Filter by tag "character" or "humanoid"
- **Default**: First sprite in list selected initially
- **Preview**: Update large preview image when sprite clicked

#### Class Selection
- **Available Classes**: Query `UnitClass.getAll()` for all classes
- **Default**: None selected (player must choose)
- **Preview**: Update class info panel when class clicked/hovered

#### Character Creation Flow
1. Player clicks "Create Character"
2. Modal opens with default values (empty name, first sprite, no class)
3. Player enters name → validates on every keystroke
4. Player selects sprite → preview updates
5. Player selects class → info panel updates
6. Player clicks "Create" (enabled only when all valid)
7. Generate unique ID: `character-${timestamp}-${random}`
8. Create `CreatedCharacter` object
9. Save to local storage or guild roster store
10. Close modal
11. Refresh guild roster panel
12. Show success message: "[Name] created!"

### 7. Data Persistence

#### Storage Strategy
- **Local Storage Key**: `vibeDC-guildRoster`
- **Format**: JSON array of `CreatedCharacter` objects
- **Load**: On Guild Hall screen mount, parse from local storage
- **Save**: After every create/delete/party change operation
- **Fallback**: If no data exists, start with empty roster

#### Active Party Persistence
- **Local Storage Key**: `vibeDC-activeParty`
- **Format**: JSON array of `PartyMemberDefinition` objects (full data)
- **Load**: On application start, restore active party from storage
- **Save**: After every party change operation
- **Combat Integration**: CombatEncounter reads active party from this storage

### 8. Input Handling

#### Mouse Events
- **Hover Detection**: Track hover state for all interactive elements
- **Click Detection**: Handle clicks on buttons, cards, sprites, class options
- **Drag Detection** (future): Allow reordering party members

#### Keyboard Events
- **Text Input**: Capture keyboard events when name input is focused
- **Escape**: Close modal without saving
- **Enter**: Attempt to create character (if all fields valid)
- **Tab**: Cycle focus between input fields
- **Arrow Keys**: Navigate sprite grid and class list

### 9. Visual Feedback and Animations

#### Transitions
- **Modal Open**: Fade in overlay (0.2s), scale in modal (0.2s)
- **Modal Close**: Scale out modal (0.2s), fade out overlay (0.2s)
- **Card Hover**: Border color change (instant)
- **Button Hover**: Text color change (instant)
- **List Scroll**: Smooth scroll animation (0.3s)

#### Error Messages
- **Display**: Small red text box below invalid field
- **Duration**: 3 seconds, then fade out
- **Animation**: Fade in (0.2s), hold (2.6s), fade out (0.2s)

## Implementation Strategy

### Phase 1: Guild Hall Base Screen
1. Create `GuildHallView.tsx` component (384×216 canvas)
2. Implement layout regions (active party panel, guild roster panel, buttons)
3. Add title text rendering for each panel
4. Implement "Return to Title" button (navigates back)
5. Add placeholder content ("No characters" / "Empty slot")
6. Test basic navigation and layout

### Phase 2: Character Display Cards
1. Create `PartyMemberCard.tsx` renderer (for active party)
2. Create `RosterCharacterCard.tsx` renderer (for guild roster)
3. Implement sprite rendering (scaled appropriately)
4. Implement text rendering (name, class, level)
5. Implement stat bars (HP/Mana)
6. Implement hover states (border colors)
7. Test card rendering with mock data

### Phase 3: Character Creation Modal
1. Create `CharacterCreationModal.tsx` component
2. Implement overlay and modal panel rendering
3. Implement name input field with cursor and validation
4. Implement sprite selection grid with preview
5. Implement class selection dropdown with info display
6. Implement "Create" button (enabled/disabled states)
7. Implement "Cancel" button
8. Test modal interactions and validation

### Phase 4: Party Management Logic
1. Create `GuildRosterManager.ts` class for state management
2. Implement character creation logic (validation, ID generation)
3. Implement add-to-party logic (validation, max 4 check)
4. Implement remove-from-party logic
5. Implement active party reordering (future)
6. Test all party management operations

### Phase 5: Data Persistence
1. Implement local storage save/load for guild roster
2. Implement local storage save/load for active party
3. Integrate with CombatEncounter to read active party
4. Test persistence across page reloads
5. Test fallback behavior (no saved data)

### Phase 6: Input Handling
1. Implement mouse event routing (hover, click, drag)
2. Implement keyboard event handling (text input, shortcuts)
3. Implement scroll handling for long lists
4. Test all interaction paths

### Phase 7: Visual Polish
1. Implement modal animations (fade in/out, scale)
2. Implement error message display
3. Implement success message display
4. Add hover effects and visual feedback
5. Test visual consistency across all states

### Phase 8: Integration
1. Add navigation from Title Screen to Guild Hall
2. Update CombatEncounter to read from active party storage
3. Test full flow: create characters → add to party → start combat
4. Ensure combat uses correct party members

## Technical Details

### Character Storage Format
All characters are stored as full `PartyMemberDefinition` objects (see section 3 above).

**Key Points:**
- No separate "CreatedCharacter" type - uses `PartyMemberDefinition` directly
- Characters in roster and active party are stored separately in local storage
- All progression data preserved (equipment, abilities, experience)
- Level calculated from `totalExperience` using formula (if needed for display)

### GuildRosterManager Class
```typescript
export class GuildRosterManager {
  private roster: PartyMemberDefinition[] = [];
  private activeParty: PartyMemberDefinition[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // Character Creation
  createCharacter(name: string, spriteId: string, unitClassId: string): PartyMemberDefinition | null {
    // Validate name
    if (!this.isValidName(name)) {
      console.warn("Invalid character name:", name);
      return null;
    }

    // Check for duplicate name
    if (this.roster.some(c => c.name === name)) {
      console.warn("Character name already exists:", name);
      return null;
    }

    // Get class data for initial stats
    const unitClass = UnitClass.getById(unitClassId);
    if (!unitClass) {
      console.error(`Unit class '${unitClassId}' not found`);
      return null;
    }

    // Generate unique ID
    const id = `character-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Get base stats from class
    const baseStats = unitClass.getBaseStats();

    // Get starting equipment from class
    const startingEquipment = unitClass.getStartingEquipment();

    // Get default abilities from class (if any)
    const defaultAbilities = unitClass.getDefaultAbilities();

    // Create full PartyMemberDefinition
    const character: PartyMemberDefinition = {
      id,
      name,
      unitClassId,
      spriteId,

      // Base stats from class
      baseHealth: baseStats.health,
      baseMana: baseStats.mana,
      basePhysicalPower: baseStats.physicalPower,
      baseMagicPower: baseStats.magicPower,
      baseSpeed: baseStats.speed,
      baseMovement: baseStats.movement,
      basePhysicalEvade: baseStats.physicalEvade,
      baseMagicEvade: baseStats.magicEvade,
      baseCourage: baseStats.courage,
      baseAttunement: baseStats.attunement,

      // Starting equipment from class
      leftHandId: startingEquipment.leftHand,
      rightHandId: startingEquipment.rightHand,
      headId: startingEquipment.head,
      bodyId: startingEquipment.body,
      accessoryId: startingEquipment.accessory,

      // Default abilities from class
      learnedAbilityIds: defaultAbilities.learned || [],
      reactionAbilityId: defaultAbilities.reaction,
      passiveAbilityId: defaultAbilities.passive,
      movementAbilityId: defaultAbilities.movement,

      // Progression starts at 0
      totalExperience: 0,
      classExperience: {},
      classExperienceSpent: {},

      // Metadata
      tags: ['player-created'],
    };

    this.roster.push(character);
    this.saveToStorage();
    return character;
  }

  // Party Management
  addToParty(characterId: string): boolean {
    // Check party size
    if (this.activeParty.length >= 4) {
      console.warn("Party is full (max 4 members)");
      return false;
    }

    // Find character in roster
    const character = this.roster.find(c => c.id === characterId);
    if (!character) {
      console.warn("Character not found:", characterId);
      return false;
    }

    // Check if already in party
    if (this.activeParty.some(p => p.id === characterId)) {
      console.warn("Character already in party:", characterId);
      return false;
    }

    // Add to party
    this.activeParty.push(character);
    this.saveToStorage();
    return true;
  }

  removeFromParty(characterId: string): boolean {
    const index = this.activeParty.findIndex(c => c.id === characterId);
    if (index === -1) {
      console.warn("Character not in party:", characterId);
      return false;
    }

    // Remove from party
    this.activeParty.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  // Queries
  getActiveParty(): PartyMemberDefinition[] {
    return [...this.activeParty];
  }

  getAvailableRoster(): PartyMemberDefinition[] {
    // Filter based on whether they're in the active party array
    const activeIds = new Set(this.activeParty.map(p => p.id));
    return this.roster.filter(c => !activeIds.has(c.id));
  }

  getAllCharacters(): PartyMemberDefinition[] {
    return [...this.roster];
  }

  // Character Updates (for post-combat progression)
  updateCharacter(updated: PartyMemberDefinition): boolean {
    // Find character in roster
    const index = this.roster.findIndex(c => c.id === updated.id);
    if (index === -1) {
      console.warn("Character not found for update:", updated.id);
      return false;
    }

    // Update in roster
    this.roster[index] = updated;

    // Update in active party if present
    const partyIndex = this.activeParty.findIndex(c => c.id === updated.id);
    if (partyIndex !== -1) {
      this.activeParty[partyIndex] = updated;
    }

    this.saveToStorage();
    return true;
  }

  // Validation
  isValidName(name: string): boolean {
    if (name.length < 1 || name.length > 12) return false;
    if (name.trim().length === 0) return false;
    // ASCII only: letters, numbers, space, hyphen, apostrophe
    const validPattern = /^[A-Za-z0-9 '\-]+$/;
    return validPattern.test(name);
  }

  // Persistence
  private loadFromStorage(): void {
    try {
      const savedRoster = localStorage.getItem('vibeDC-guildRoster');
      const savedParty = localStorage.getItem('vibeDC-activeParty');

      if (savedRoster) {
        this.roster = JSON.parse(savedRoster);
      }

      if (savedParty) {
        this.activeParty = JSON.parse(savedParty);
      }
    } catch (error) {
      console.error("Failed to load guild roster from storage:", error);
      this.roster = [];
      this.activeParty = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('vibeDC-guildRoster', JSON.stringify(this.roster));
      localStorage.setItem('vibeDC-activeParty', JSON.stringify(this.activeParty));
    } catch (error) {
      console.error("Failed to save guild roster to storage:", error);
    }
  }
}
```

### Integration with PartyMemberRegistry
When starting combat, active party members are already `PartyMemberDefinition` objects - no conversion needed:

```typescript
// In CombatEncounter or wherever combat is initialized
const guildManager = new GuildRosterManager();
const activeParty = guildManager.getActiveParty(); // Already PartyMemberDefinition[]

// Register each party member
for (const partyMember of activeParty) {
  PartyMemberRegistry.register(partyMember);
}

// Or directly use with PartyMemberRegistry.createPartyMember()
const combatUnits = activeParty.map(def => {
  PartyMemberRegistry.register(def);
  return PartyMemberRegistry.createPartyMember(def.id);
}).filter(unit => unit !== undefined);
```

**After Combat:**
When combat ends, update the stored party members with new experience/equipment:

```typescript
// After combat victory
function updatePartyAfterCombat(guildManager: GuildRosterManager, updatedUnits: CombatUnit[]): void {
  for (const unit of updatedUnits) {
    if (unit.isPlayerControlled) {
      // Get the full definition from PartyMemberRegistry
      const updatedDef = PartyMemberRegistry.getById(unit.id);
      if (updatedDef) {
        // Update in guild manager (will save to storage)
        guildManager.updateCharacter(updatedDef);
      }
    }
  }
}
```

## Constants to Add

Add to a new file `constants/GuildHallConstants.ts`:

```typescript
export const GuildHallConstants = {
  // Canvas dimensions
  CANVAS_WIDTH: 384,
  CANVAS_HEIGHT: 216,

  // Active Party Panel
  ACTIVE_PARTY_PANEL: {
    x: 0,
    y: 24,
    width: 180,
    height: 168,
    TITLE_TEXT: 'Active Party',
    TITLE_FONT_ID: '15px-dungeonslant',
    TITLE_COLOR: '#ffff00',
    MAX_PARTY_SIZE: 4,
    EMPTY_SLOT_TEXT: 'Empty Slot',
    EMPTY_COLOR: '#888888',
  },

  // Guild Roster Panel
  GUILD_ROSTER_PANEL: {
    x: 192,
    y: 24,
    width: 192,
    height: 168,
    TITLE_TEXT: 'Guild Roster',
    TITLE_FONT_ID: '15px-dungeonslant',
    TITLE_COLOR: '#ffff00',
    EMPTY_TEXT: 'No characters available',
    EMPTY_COLOR: '#888888',
  },

  // Party Member Card (Active Party)
  PARTY_MEMBER_CARD: {
    WIDTH: 180,
    HEIGHT: 36,
    SPRITE_SIZE: 24, // 2× scaled
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
    WIDTH: 192,
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

  // Action Buttons
  ACTION_BUTTONS: {
    y: 204,
    BUTTON_SPACING: 16,
    CREATE_TEXT: 'Create Character',
    RETURN_TEXT: 'Return to Title',
    COLOR_NORMAL: '#ffffff',
    COLOR_HOVER: '#ffff00',
  },

  // Character Creation Modal
  CHARACTER_CREATION_MODAL: {
    OVERLAY_OPACITY: 0.7,
    MODAL_WIDTH: 240,
    TITLE_TEXT: 'Create Character',
    TITLE_FONT_ID: '15px-dungeonslant',
    TITLE_COLOR: '#ffff00',
    UI_FONT_ID: '7px-04b03',

    // Name Input
    NAME_LABEL: 'Name:',
    NAME_MAX_LENGTH: 12,
    INPUT_WIDTH: 144,
    INPUT_HEIGHT: 14,
    INPUT_BG: '#333333',
    INPUT_BORDER_NORMAL: '#ffffff',
    INPUT_BORDER_FOCUS: '#ffff00',
    INPUT_TEXT_COLOR: '#ffffff',
    CURSOR_BLINK_RATE: 0.5, // seconds

    // Sprite Selection
    SPRITE_LABEL: 'Appearance:',
    SPRITE_PREVIEW_SIZE: 48, // 4× scaled
    SPRITE_GRID_COLS: 8,
    SPRITE_GRID_ROWS: 4,
    SPRITE_GRID_CELL_SIZE: 12,
    SPRITE_BORDER_SELECTED: '#ffff00',
    SPRITE_TINT_HOVER: 'rgba(255, 255, 0, 0.3)',

    // Class Selection
    CLASS_LABEL: 'Starting Class:',
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
    CREATE_BUTTON_TEXT: 'Create',
    CANCEL_BUTTON_TEXT: 'Cancel',
    BUTTON_COLOR_ENABLED: '#00ff00',
    BUTTON_COLOR_DISABLED: '#888888',
    BUTTON_COLOR_NORMAL: '#ffffff',
    BUTTON_COLOR_HOVER: '#ffff00',
  },

  // Error Messages
  ERROR_PARTY_FULL: 'Party is full! (Max 4 members)',
  ERROR_NAME_EXISTS: 'Name already exists',
  ERROR_INVALID_NAME: 'Name must be 1-12 ASCII characters',

  // Success Messages
  SUCCESS_CHARACTER_CREATED: '[NAME] created!',
  SUCCESS_ADDED_TO_PARTY: '[NAME] added to party',
  SUCCESS_REMOVED_FROM_PARTY: '[NAME] removed from party',
};
```

## Files to Create

### New Files
- `components/guild/GuildHallView.tsx` - Main Guild Hall screen component
- `components/guild/CharacterCreationModal.tsx` - Character creation modal
- `components/guild/PartyMemberCard.tsx` - Active party member card renderer
- `components/guild/RosterCharacterCard.tsx` - Guild roster character card renderer
- `utils/GuildRosterManager.ts` - Guild roster state management
- `constants/GuildHallConstants.ts` - Constants for Guild Hall UI

## Files to Modify

### Navigation Integration
- `components/TitleScreen.tsx` - Add "Guild Hall" button

### Combat Integration
- `models/combat/CombatEncounter.ts` - Read party from GuildRosterManager
- `components/combat/CombatView.tsx` - Load party from storage on mount

### Type Exports
- No new type exports needed (uses existing `PartyMemberDefinition`)

## Edge Cases and Considerations

### 1. Empty Guild Roster
- **Display**: Show "No characters available" in roster panel
- **Create Button**: Always enabled (can create first character)
- **Add to Party**: Disabled (no characters to add)

### 2. Full Party (4 Members)
- **Add Button**: Disabled with tooltip "Party full"
- **Error Message**: Display "Party is full! (Max 4 members)"
- **Visual**: Dim "Add" buttons on all roster characters

### 3. Empty Active Party
- **Display**: Show 4 "Empty Slot" placeholders
- **Combat**: Cannot start combat with 0 party members
- **Warning**: "Add at least one character to party"

### 4. Duplicate Character Names
- **Validation**: Check for existing name before creation
- **Error**: Display "Name already exists"
- **Suggestion**: "Try [Name]2 or [Name]_1"

### 5. Invalid Character Names
- **Non-ASCII**: Ignore/filter non-ASCII keystrokes
- **Too Long**: Stop accepting input at 12 characters
- **Too Short**: Disable "Create" button if name empty
- **Whitespace Only**: Treat as invalid, disable "Create"

### 6. No Sprite Selected
- **Default**: First sprite auto-selected on modal open
- **Validation**: Always have a sprite selected (no validation needed)

### 7. No Class Selected
- **Default**: No class selected on modal open
- **Validation**: Disable "Create" button until class selected
- **Visual**: Grey out "Create" button with tooltip "Select a class"

### 8. Modal Open During Action
- **Input Blocking**: Block all background interactions
- **Escape Key**: Close modal without saving
- **Click Outside**: Do NOT close modal (requires explicit Cancel)

### 9. Character Deletion (Future)
- **Confirmation**: "Delete [Name]? This cannot be undone."
- **Active Party**: Cannot delete if in active party (must remove first)
- **Permanent**: Delete from roster and local storage

### 10. Level and Experience Display
- **Initial State**: All characters start at level 1, 0 XP
- **Combat Rewards**: XP awarded after combat victory
- **Level Up**: Calculate level from total XP using formula
- **Display**: Show "Lv. X" on character cards

## Testing Checklist

### Guild Hall Layout Tests
- [ ] Active Party panel renders at correct position and size
- [ ] Guild Roster panel renders at correct position and size
- [ ] Panel titles render correctly
- [ ] Action buttons render at bottom
- [ ] Empty state messages display correctly
- [ ] "Return to Title" button navigates back to title screen

### Character Card Tests
- [ ] Party member cards render sprite, name, class, level correctly
- [ ] Party member cards show HP/Mana bars
- [ ] Roster character cards render sprite, name, class, level correctly
- [ ] Hover states work for all cards
- [ ] Remove button appears on party member card hover
- [ ] Add button appears on roster card hover

### Character Creation Modal Tests
- [ ] Modal opens when "Create Character" clicked
- [ ] Overlay dims background correctly
- [ ] Modal closes on Cancel button click
- [ ] Modal closes on Escape key press
- [ ] Modal does NOT close on outside click

### Name Input Tests
- [ ] Name input accepts ASCII characters (A-Z, a-z, 0-9, space, hyphen, apostrophe)
- [ ] Name input rejects non-ASCII characters
- [ ] Name input stops at 12 characters max
- [ ] Cursor blinks at 0.5s rate
- [ ] Name validation shows error for empty name
- [ ] Name validation shows error for duplicate name
- [ ] Name validation shows error for whitespace-only name

### Sprite Selection Tests
- [ ] Sprite grid displays all available character sprites
- [ ] First sprite selected by default
- [ ] Clicking sprite updates selection
- [ ] Selected sprite has yellow border
- [ ] Hovered sprite has light yellow tint
- [ ] Preview updates when sprite selected

### Class Selection Tests
- [ ] Class list displays all available classes
- [ ] No class selected by default
- [ ] Clicking class updates selection
- [ ] Selected class highlighted in yellow
- [ ] Class info panel updates on selection
- [ ] Class info shows name, description, stats, equipment

### Create Button Tests
- [ ] Create button disabled when name empty
- [ ] Create button disabled when no class selected
- [ ] Create button enabled when all fields valid
- [ ] Create button creates character and closes modal
- [ ] Create button shows success message
- [ ] Created character appears in guild roster

### Party Management Tests
- [ ] Adding character to party moves it from roster to party
- [ ] Adding character when party full shows error message
- [ ] Removing character from party moves it from party to roster
- [ ] Active party limited to 4 members
- [ ] Empty slots show placeholder text
- [ ] Party order matches display order

### Persistence Tests
- [ ] Guild roster saved to local storage on creation
- [ ] Guild roster loaded from local storage on mount
- [ ] Active party saved to local storage on change
- [ ] Active party loaded from local storage on mount
- [ ] Data persists across page reloads
- [ ] Empty storage starts with empty roster

### Integration Tests
- [ ] Combat reads active party from storage
- [ ] Combat fails gracefully if party empty
- [ ] Created characters use correct class stats
- [ ] Created characters use correct starting equipment
- [ ] Experience and level persist after combat

## Performance Considerations

### Rendering
- **Canvas Drawing**: Minimal overhead, 60fps target
- **Character Cards**: Up to 4 party + 20 roster = 24 cards max, negligible
- **Sprite Grid**: 32 sprites (8×4), pre-loaded from sprite sheet, fast
- **Text Rendering**: Font atlas renderer, optimized

### Input Handling
- **Event Routing**: Bounding box checks, O(n) where n = interactive elements
- **Validation**: Real-time name validation on keystroke, negligible cost
- **Hover Detection**: Up to 24 card hover checks, very fast

### Storage
- **Local Storage**: Small JSON payloads (<10KB typically)
- **Save Frequency**: Only on create/delete/party change, not every frame
- **Load Frequency**: Once on mount

## Future Extensions

### Character Editing
- **Rename**: Allow renaming characters (with duplicate check)
- **Reclass**: Allow changing class (reset stats/equipment)
- **Resprite**: Allow changing sprite appearance

### Character Deletion
- **Delete Button**: Add "Delete" button to roster cards
- **Confirmation**: Modal confirmation "Delete [Name]?"
- **Restriction**: Cannot delete if in active party

### Party Reordering
- **Drag-and-Drop**: Drag party member cards to reorder
- **Turn Order**: Party order affects combat turn order
- **Visual Feedback**: Show drag preview and drop zones

### Character Details View
- **Full Stats**: Click character to view detailed stats screen
- **Equipment**: View and manage equipped items
- **Abilities**: View learned abilities and assigned slots
- **Biography**: Add custom character description

### Import/Export
- **Export Character**: Save character as JSON file
- **Import Character**: Load character from JSON file
- **Share**: Share characters with other players

### Party Presets
- **Save Party**: Save current active party as preset
- **Load Party**: Quick-load a saved party preset
- **Multiple Presets**: "Tank Squad", "Magic Team", etc.

### Guild Hall Decorations
- **Unlockables**: Unlock decorations with achievements
- **Customization**: Change background, banners, furniture
- **Immersion**: Make Guild Hall feel like home base

## Estimated Complexity

- **Implementation Time**: 16-20 hours
  - Guild Hall base screen: 2-3 hours
  - Character display cards: 2-3 hours
  - Character creation modal: 4-5 hours
  - Party management logic: 2-3 hours
  - Data persistence: 2 hours
  - Input handling: 2-3 hours
  - Visual polish: 2-3 hours
  - Integration: 1-2 hours
- **Testing Time**: 4-6 hours
- **Total**: ~20-26 hours

**Complexity Rating**: High (involves UI, state management, persistence, validation)

**Risk Level**: Medium
- **Medium Risk**: Complex modal UI with multiple input types
- **Medium Risk**: Party management logic (add/remove validation)
- **Low Risk**: Rendering system already exists

## Dependencies

- **Requires**: PartyMemberRegistry (for party member definitions)
- **Requires**: UnitClass system (for class stats and equipment)
- **Requires**: Equipment system (for starting equipment)
- **Requires**: Sprite system (for character sprite rendering)
- **Requires**: Font system (dungeonslant, 7px-04b03)
- **Relates To**: Combat system (reads active party from storage)

## Compatibility

- **Save/Load**: Guild roster and active party persist in local storage
- **Existing Features**: No breaking changes to combat system
- **Future Features**: Designed to support character editing, deletion, party presets

---

## Success Criteria

This feature is complete when:
1. Guild Hall screen renders correctly with both panels
2. Character creation modal functions with all input validation
3. Name input accepts ASCII only, max 12 characters
4. Sprite selection grid shows all character sprites
5. Class selection shows all available classes with info
6. "Create" button creates character and adds to roster
7. Character cards display sprite, name, class, level correctly
8. Add to party validates max 4 members, shows error if full
9. Remove from party moves character back to roster
10. Data persists in local storage (roster and active party)
11. Combat integration reads active party from storage
12. All edge cases handled gracefully
13. Tests pass for all core functionality

---

## Notes

- This feature is the foundation for party management and character progression
- The `CreatedCharacter` structure is intentionally simple (full data generated on-demand)
- Local storage provides simple persistence without backend complexity
- Future extensions will add character editing, deletion, and party presets
- Consider adding visual feedback (animations, sounds) in future iterations
- The 12-character name limit matches the pixel-art aesthetic and display space constraints

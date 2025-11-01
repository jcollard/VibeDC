# First Person View - Design Overview

**Version:** 1.1
**Created:** 2025-11-01
**Last Updated:** 2025-11-01
**Related:** [CombatHierarchy.md](../../CombatHierarchy.md), [AreaMap System](AreaMap/), FirstPersonView.tsx (prototype)

## Purpose

This document describes the First Person View system for world navigation outside of combat. The player navigates a grid-based dungeon in first-person perspective, with the same UI layout structure as the combat system (top panel, map panel, combat log, info panels) but with the 3D first-person viewport replacing the tactical map.

## Related Systems

The First Person View depends on the **Area Map System** for grid-based dungeon navigation:
- 📖 **[Area Map System Documentation](AreaMap/)** - Complete GDD for tilesets, maps, and interactive objects
- ✅ **Implementation Status**: Core system and developer tools are complete
- 🎮 **What's Ready**: Tilesets, maps, YAML parsers, registries, visual editors
- 🚧 **What's Next**: Integration with 3D viewport and movement validation

## Feature Summary

The First Person View provides:
- First-person 3D dungeon navigation using the same grid-based coordinate system
- Consistent UI layout with combat system (384x216 resolution)
- Five main regions: Top Panel, Map Panel (3D viewport), Combat Log, Top Info Panel, Bottom Info Panel
- Real-time 3D rendering of dungeon environment from player perspective
- Player movement controls (WASD/arrow keys + turn left/right)
- Interactive elements (doors, chests, NPCs, items)
- Environment lighting and atmospheric effects
- Encounter triggers (transition to combat when enemy encountered)
- Minimap display in one of the info panels
- Player stats/inventory display in info panels

## Core Requirements

### 1. Resolution and Layout Structure

#### Canvas Dimensions
- **Base Resolution**: 384x216 pixels (32x18 tiles at 12x12 per tile)
- **Tile Size**: 12x12 pixels (consistent with combat system)
- **Scaling**: Integer scaling for pixel-perfect rendering
- **Layout System**: Reuse CombatLayoutManager pattern with custom regions

#### UI Regions (consistent with combat layout)

**Top Panel** (full width, top edge)
- **Height**: ~12-15 pixels (1-2 tiles)
- **Content**: Current location name, dungeon level, time/turn counter
- **Background**: 9-slice frame rendering
- **Font**: dungeonslant or 7px-04b03

**Map Panel** (center-left, main viewport)
- **Dimensions**: ~240x150 pixels (primary screen real estate)
- **Content**: 3D first-person viewport rendered via React Three Fiber
- **Background**: None (3D canvas fills entire region)
- **Purpose**: Player's view of the dungeon environment

**Combat Log** (bottom-left, below map)
- **Dimensions**: ~240x40 pixels (multiple lines)
- **Content**: Scrolling message log (actions, discoveries, events)
- **Background**: 9-slice frame rendering
- **Font**: 7px-04b03
- **Messages**: "You opened a door.", "You found a healing potion.", etc.

**Top Info Panel** (right side, upper half)
- **Dimensions**: ~135x80 pixels
- **Content**: Minimap (top-down view of explored area)
- **Background**: 9-slice frame rendering
- **Grid Overlay**: Simplified dungeon layout showing walls, doors, player position

**Bottom Info Panel** (right side, lower half)
- **Dimensions**: ~135x80 pixels
- **Content**: Player stats, quick inventory, or context-sensitive info
- **Background**: 9-slice frame rendering
- **Switching**: Changes based on context (stats view, inventory view, interaction prompt)

### 2. First Person Viewport System

#### 3D Rendering Engine
- **Technology**: React Three Fiber (existing prototype)
- **Camera**: Perspective camera with 75° FOV
- **Position**: Camera positioned at player grid coordinates (worldX, 0, worldZ)
- **Rotation**: Based on cardinal direction (North/South/East/West)
- **Animation**: Smooth camera movement on position changes (0.2s movement, 0.1s rotation)

#### World Coordinate System
- **Grid Mapping**: Grid [X, Y] → World [X, 0, Z] (Y is vertical, Z is depth)
- **Tile Size**: 1 unit = 1 grid tile
- **Camera Height**: Y = 0 (eye level)
- **Camera Offset**: Slightly forward in tile (cameraOffset = 0.3)

#### Rendering Distance
- **View Distance**: 8 tiles forward/backward
- **View Width**: 6 tiles left/right (12 tiles total width)
- **Frustum Culling**: Only render visible cells within range
- **Fog**: Distance fog from 2-10 units (atmospheric depth effect)

#### Tile Rendering
- **Cell Component**: Renders walls, floors, ceilings based on tile type
- **Texture System**: Sprite sheet loader for tile textures (12x12 sprites)
- **Tile Types**: Wall '#', Floor '.', Door 'D', Stairs 'S', Empty ' '
- **Dynamic Loading**: Textures loaded from /tiles/world-tiles.png

#### Lighting System
- **Player Light**: Point light attached to camera (torch/lantern effect)
- **Intensity**: 2.0 (bright torch light)
- **Distance**: 4 tiles range
- **Color**: #ffddaa (warm torch color)
- **Decay**: Inverse square falloff (lightDecay = 2)
- **Y Offset**: 0 (at camera height)

#### Crosshair Overlay
- **Position**: Center of viewport
- **Style**: Simple cross (horizontal + vertical lines)
- **Color**: White or light grey
- **Purpose**: Interaction targeting (doors, chests, NPCs)

### 3. Player Movement System

#### Input Handling
- **Forward/Backward**: W/S or Up/Down arrows
- **Turn Left/Right**: A/D or Left/Right arrows
- **Strafe Left/Right**: Q/E (optional)
- **Interaction**: Spacebar or E (interact with targeted object)

#### Movement Validation
- **Collision Detection**: Check target tile before moving
- **Walkable Tiles**: '.', 'D' (open doors), 'S' (stairs)
- **Blocked Tiles**: '#' (walls), 'X' (obstacles)
- **Boundary Check**: Prevent movement outside grid bounds

#### Movement Animation
- **Duration**: 0.2 seconds (movementDuration prop)
- **Easing**: Smooth interpolation via AnimatedPerspectiveCamera
- **Callback**: onAnimationComplete when movement finishes
- **Blocking**: Player cannot input new movement until animation completes

#### Rotation System
- **Turn Amount**: 90° per turn (cardinal directions only)
- **Duration**: 0.1 seconds (rotationDuration prop)
- **Directions**: North → East → South → West → North
- **Animation**: Smooth camera rotation interpolation

### 4. Interaction System

#### Crosshair Targeting
- **Raycast**: Cast ray from camera center into scene
- **Max Distance**: 1.5 tiles (arm's reach)
- **Target Types**: Doors, chests, NPCs, items, switches
- **Visual Feedback**: Highlight targeted object or show interaction prompt

#### Interaction Types

**Doors**
- **Closed State**: Blocks movement, can be opened
- **Open State**: Allows passage, can be closed
- **Locked Doors**: Require key or lockpick
- **Interaction**: Press Spacebar while targeting door
- **Animation**: Door opens/closes with sound effect
- **Log Message**: "You opened the door." / "The door is locked."

**Chests**
- **Closed State**: Can be opened (may be locked)
- **Open State**: Shows loot contents (items, gold)
- **Trapped Chests**: May trigger damage or effects
- **Interaction**: Press Spacebar to open, click items to loot
- **Log Message**: "You found 50 gold!" / "You found a Health Potion!"

**NPCs**
- **Idle State**: Standing in tile, can be talked to
- **Dialogue**: Opens dialogue panel (replaces bottom info panel)
- **Trading**: May offer shop interface
- **Quests**: May give quests or quest updates
- **Interaction**: Press Spacebar to initiate conversation

**Items**
- **Pickup**: Automatically added to inventory
- **Types**: Consumables, equipment, quest items, keys
- **Visual**: Item sprite rendered on floor
- **Interaction**: Walk over or target and press Spacebar
- **Log Message**: "You picked up a Health Potion."

**Stairs**
- **Ascend/Descend**: Transition to different dungeon level
- **Interaction**: Walk onto stairs tile automatically
- **Confirmation**: "Press Spacebar to [ascend/descend] the stairs"
- **Load Screen**: Brief loading transition to new level

### 5. Minimap System

#### Display Properties
- **Location**: Top Info Panel (right side, upper half)
- **Dimensions**: Fits within ~135x80 pixel region
- **Background**: Black or dark grey
- **Grid Overlay**: White or grey grid lines

#### Map Data
- **Explored Tiles**: Only show areas player has visited
- **Fog of War**: Unexplored areas are black/hidden
- **Current View**: Tiles within vision range are brighter
- **Player Icon**: Colored square or triangle showing position and facing

#### Tile Representation
- **Wall Tiles**: White or grey squares
- **Floor Tiles**: Dark grey or black (walkable)
- **Door Tiles**: Yellow or orange (interactive)
- **Stairs Tiles**: Purple or cyan (level transition)
- **NPC/Enemy Tiles**: Red dots (if detected)
- **Item Tiles**: Green dots (if detected)

#### Scale and Centering
- **Zoom Level**: Dynamically scale to show relevant area
- **Centering**: Player position at center (or offset if near edge)
- **Scroll**: Minimap follows player as they move

### 6. Info Panel System

#### Top Info Panel (Minimap)
- **Primary Content**: Minimap (described above)
- **Title Bar**: "Map" or "Explored Area"
- **Background**: 9-slice frame rendering

#### Bottom Info Panel (Context-Sensitive)

**Default State: Player Stats**
- **HP**: Current/Max health with bar visualization
- **MP/SP**: Mana or stamina (if applicable)
- **Level**: Player level and XP bar
- **Status Effects**: Icons for active buffs/debuffs

**Inventory State** (toggle with I key)
- **Quick Slots**: 8-12 item slots for quick access
- **Item Icons**: Sprite images of equipped items
- **Item Count**: Number for stackable items
- **Hover**: Show item name and description
- **Click**: Use item or open full inventory

**Interaction State** (when targeting interactive object)
- **Target Name**: "Wooden Door", "Treasure Chest", "Old Man"
- **Interaction Prompt**: "[Spacebar] Open Door", "[E] Talk to Old Man"
- **Object Status**: "Locked", "Trapped", "Empty", etc.
- **Context Info**: Additional details about target

### 7. Combat Log Integration

#### Message Types
- **Movement**: "You moved north.", "You turned left."
- **Discovery**: "You found a secret door!", "You discovered a hidden passage."
- **Items**: "You picked up a Health Potion.", "You found 25 gold."
- **Interactions**: "You opened the door.", "You unlocked the chest."
- **Combat**: "A goblin appears!", "You entered combat."
- **Errors**: "The door is locked.", "You can't move that way."

#### Display Format
- **Font**: 7px-04b03 (same as combat system)
- **Color Coding**: White (default), Yellow (discovery), Green (success), Red (error/damage)
- **Scrolling**: Auto-scroll to bottom when new message added
- **Line Limit**: Display last 5-6 lines, scroll for history
- **Timestamp**: Optional turn number or time prefix

### 8. Encounter System

#### Enemy Detection
- **Trigger Tiles**: Special tiles marked as encounter zones
- **Roaming Enemies**: Visible NPCs that patrol dungeon
- **Random Encounters**: Chance-based on certain tile types
- **Ambush**: Instant combat trigger when entering tile

#### Combat Transition
- **Detection**: Player enters encounter tile or NPC aggros
- **Message**: "A goblin blocks your path!" in combat log
- **Screen Fade**: Brief fade to black (0.5s)
- **Load Combat**: Create CombatEncounter from encounter data
- **Scene Change**: Transition from FirstPersonView to CombatView
- **Context Preservation**: Save first-person state for return after combat

#### Post-Combat Return
- **Victory**: Return to first-person view at same position
- **Defeat**: Return to last safe checkpoint or game over screen
- **Rewards Applied**: XP, gold, items added to player inventory
- **Enemy Despawn**: Remove defeated enemy from world
- **State Update**: Mark encounter as completed (no re-trigger)

### 9. Data Structures

#### FirstPersonState
```typescript
interface FirstPersonState {
  playerX: number;           // Grid X coordinate
  playerY: number;           // Grid Y coordinate (grid row, maps to world Z)
  direction: CardinalDirection; // 'North' | 'South' | 'East' | 'West'
  grid: string[];            // Dungeon layout (each string is a row)
  explored: Set<string>;     // Set of explored tile coords "x,y"
  inventory: InventoryItem[]; // Player's items
  stats: PlayerStats;        // HP, MP, level, XP, etc.
  activePanel: 'stats' | 'inventory' | 'interaction'; // Bottom panel mode
  targetedObject: InteractiveObject | null; // Currently targeted object
}
```

#### InteractiveObject
```typescript
interface InteractiveObject {
  id: string;                // Unique object ID
  type: 'door' | 'chest' | 'npc' | 'item' | 'stairs' | 'switch';
  gridX: number;             // Grid position X
  gridY: number;             // Grid position Y
  state: ObjectState;        // 'closed' | 'open' | 'locked' | 'active' | 'inactive'
  data: ObjectData;          // Type-specific data (loot, dialogue, etc.)
}

interface ObjectData {
  // Door data
  locked?: boolean;
  keyRequired?: string;

  // Chest data
  lootTable?: LootItem[];
  trapped?: boolean;

  // NPC data
  dialogue?: DialogueTree;
  shopInventory?: ShopItem[];
  questId?: string;

  // Item data
  itemId?: string;
  quantity?: number;

  // Stairs data
  destinationLevel?: string;
  destinationX?: number;
  destinationY?: number;
}
```

#### PlayerStats
```typescript
interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  experience: number;
  experienceToNext: number;
  statusEffects: StatusEffect[];
}
```

### 10. Layout Manager Implementation

#### FirstPersonLayoutManager
Similar structure to CombatLayoutManager but customized for first-person:

**Key Differences:**
- Map panel renders 3D canvas instead of tactical grid
- Minimap in top info panel instead of turn order
- Context-sensitive bottom panel (stats/inventory/interaction)
- No deployment zones or unit selection
- Different interaction events (keyboard input instead of mouse clicks on grid)

**Shared Components:**
- 9-slice frame rendering (HorizontalVerticalLayout)
- Combat log rendering (CombatLogManager)
- Panel content switching system (InfoPanelManager)
- Font rendering system (FontAtlasRenderer)

**New Components:**
- MinimapRenderer (renders explored tiles)
- PlayerStatsPanel (HP/MP/level display)
- QuickInventoryPanel (item slots)
- InteractionPromptPanel (targeted object info)

### 11. Input Flow

#### Keyboard Event Flow
1. User presses WASD/arrow key
2. FirstPersonInputHandler receives keydown event
3. Validate movement (check collision, boundaries)
4. If valid: Update playerX/playerY/direction in state
5. FirstPersonView component re-renders with new position
6. AnimatedPerspectiveCamera smoothly moves to new position
7. onAnimationComplete callback triggers
8. InputHandler re-enables input (prevent move spam during animation)
9. Combat log updated with movement message

#### Interaction Event Flow
1. User targets object with crosshair (raycast)
2. Highlighted object shown in bottom info panel
3. User presses Spacebar/E
4. FirstPersonInputHandler processes interaction
5. Check interaction validity (distance, prerequisites)
6. If door: Toggle open/closed, update grid
7. If chest: Open loot UI, transfer items to inventory
8. If NPC: Open dialogue panel
9. Combat log updated with interaction message
10. Bottom panel updates to show result

### 12. Performance Considerations

#### 3D Rendering Optimization
- **Frustum Culling**: Only render visible cells (view distance 8, width 6)
- **Texture Reuse**: Single sprite sheet loaded once, shared textures
- **Mesh Instancing**: Reuse box geometry for all cells
- **Low Poly**: Simple cube meshes, no complex geometry
- **No Anti-aliasing**: Pixel-art aesthetic, disable AA for performance

#### State Management
- **Immutable Updates**: Use React state updates, no direct mutations
- **Memoization**: Use useMemo for expensive calculations (visible cells)
- **Refs for Animation**: Use refs for camera handle, avoid re-renders
- **Throttled Input**: Block input during animations to prevent spam

#### Asset Loading
- **Lazy Loading**: Load level data only when needed
- **Sprite Caching**: Cache loaded sprites in memory
- **Disposal**: Clean up Three.js resources on unmount
- **Loading Screens**: Show loading UI during asset fetch

### 13. Dungeon Data Format

**Note:** The dungeon data format is fully defined in the **[Area Map System](AreaMap/AreaMapSystemOverview.md)**. This section provides a high-level overview for reference.

#### Using the Area Map System

The First Person View will use the **AreaMap** class and **AreaMapRegistry** for level data:

```typescript
// Load an area map from the registry
const areaMap = AreaMapRegistry.getById("dungeon-room-1");

// Get tile information
const tile = areaMap.getTile(x, y);
const isWalkable = areaMap.isWalkable(x, y);
const isDoor = areaMap.isDoorTile(x, y);

// Get interactive objects
const object = areaMap.getInteractiveObjectAt(x, y);
```

#### Grid Representation (Example)
```typescript
// Example from area-map-database.yaml
const areaMapYAML = `
areas:
  - id: dungeon-room-1
    name: "Dark Chamber"
    description: "A small stone chamber"
    tilesetId: dungeon-grey-stone
    grid: |-
      ##########
      ####D#####
      ##........
      #.........
      #.........
      ##########
    playerSpawn:
      x: 5
      y: 4
      direction: North
`;
```

#### Tile Behaviors

The Area Map System defines three tile behaviors:
- **Wall** (`#`): `walkable: false, passable: false` - Blocks movement
- **Floor** (`.`): `walkable: true, passable: true` - Normal walkable tile
- **Door** (`D`): `walkable: false, passable: true` - Auto-continue through (prevents standing in doorway)

See [AreaMapSystemOverview.md](AreaMap/AreaMapSystemOverview.md) for full documentation on tile behaviors.

#### Tileset System

Maps reference tilesets from the **AreaMapTileSetRegistry**:
- Six pre-built tilesets available (grey-stone, brown-brick, grey-brick, cave, dark, palace)
- Each tileset defines character-to-tile mappings
- Tilesets include sprite IDs from the biomes sprite sheet
- Create custom tilesets using the visual editor (Developer Tools panel)

#### Interactive Objects

Interactive objects are defined in the Area Map data:
- **Closed Doors**: Can be opened by player interaction
- **Chests**: Contain loot, may be locked or trapped
- **NPCs**: Dialogue, shops, quests
- **Stairs**: Level transitions
- **Items**: Pickups on the ground

See [InteractiveObject documentation](AreaMap/AreaMapSystemOverview.md#interactive-objects) for details.

#### Developer Tools

Use the **AreaMap Registry Panel** (Developer Tools) to:
- Create and edit area maps visually
- Paint tiles with click-and-drag
- Resize map dimensions
- Switch tilesets
- Place interactive objects
- Export maps to YAML

### 14. Extension Points

#### Custom Tile Renderers
- **Interface**: TileRenderer with render() method
- **Registry**: Map tile type to renderer implementation
- **Custom Geometry**: Support non-cube meshes (cylinders, pyramids)
- **Animated Tiles**: Torch flames, water, lava

#### Event System
- **Tile Enter**: Trigger when player enters tile
- **Tile Exit**: Trigger when player exits tile
- **Object Interaction**: Trigger on object use
- **Turn End**: Trigger after player action completes
- **Time-Based**: Trigger after certain duration (hunger, poison)

#### Modular Systems
- **Dialogue System**: Pluggable dialogue tree renderer
- **Quest System**: Quest tracking and completion
- **Crafting System**: Item combination and creation
- **Magic System**: Spell casting in first-person
- **Weather System**: Rain, fog, dynamic lighting

## Implementation Strategy

### Phase 1: Core Layout Structure
1. Create FirstPersonLayoutManager extending layout pattern
2. Define UI regions matching combat layout (top panel, map, log, info panels)
3. Implement 9-slice frame rendering for all panels
4. Create FirstPersonView React component as main container
5. Test layout rendering at 384x216 resolution

### Phase 2: 3D Viewport Integration
1. Port existing FirstPersonView prototype into new layout
2. Integrate React Three Fiber canvas into map panel region
3. Implement camera positioning and rotation system
4. Add movement animation system (AnimatedPerspectiveCamera)
5. Test 3D rendering within constrained map panel bounds

### Phase 3: Minimap System
1. Create MinimapRenderer component
2. Implement explored tile tracking (Set<string>)
3. Render top-down grid view in top info panel
4. Add player position indicator
5. Implement fog of war (hide unexplored tiles)
6. Test minimap updates on player movement

### Phase 4: Player Stats Panel
1. Create PlayerStatsPanel component
2. Render HP/MP bars with FontAtlasRenderer
3. Display level and XP progress
4. Add status effect icons
5. Integrate into bottom info panel (default state)

### Phase 5: Movement System
1. Create FirstPersonInputHandler for keyboard events
2. Implement WASD/arrow key movement validation
3. Add collision detection (check tile type)
4. Update player position state on valid movement
5. Trigger camera animation via AnimatedPerspectiveCamera
6. Block input during movement animation
7. Add combat log messages for movement

### Phase 6: Rotation System
1. Implement A/D or Q/E turn controls
2. Update direction state (North → East → South → West)
3. Trigger camera rotation animation
4. Add rotation duration and easing
5. Test smooth rotation transitions

### Phase 7: Interaction System
1. Implement crosshair rendering (CSS overlay)
2. Add raycast targeting from camera center
3. Create InteractionPromptPanel for bottom info panel
4. Implement Spacebar interaction handler
5. Add door open/close logic (toggle tile type)
6. Add combat log messages for interactions
7. Test interaction range and validation

### Phase 8: Encounter System
1. Define encounter trigger zones in level data
2. Implement encounter detection on player movement
3. Create combat transition sequence (fade out)
4. Load CombatEncounter and switch to CombatView
5. Implement post-combat return logic
6. Test encounter trigger and combat transition

### Phase 9: Item and Chest System
1. Create chest interaction logic
2. Implement loot UI (temporary panel or modal)
3. Add item pickup system
4. Update inventory state
5. Add combat log messages for item events

### Phase 10: Polish and Testing
1. Add sound effects for movement, interactions
2. Implement ambient lighting and atmosphere
3. Add particle effects (torch glow, dust)
4. Optimize rendering performance
5. Comprehensive testing of all systems
6. Bug fixes and edge case handling

## Files to Create

### Layout and Rendering
- `models/firstperson/FirstPersonLayoutManager.ts` - Layout coordinator
- `models/firstperson/rendering/MinimapRenderer.ts` - Minimap rendering
- `models/firstperson/rendering/PlayerStatsPanel.ts` - Stats panel
- `models/firstperson/rendering/QuickInventoryPanel.ts` - Quick inventory
- `models/firstperson/rendering/InteractionPromptPanel.ts` - Interaction UI

### State Management
- `models/firstperson/FirstPersonState.ts` - Main state interface
- `models/firstperson/DungeonLevel.ts` - Level data structure
- `models/firstperson/InteractiveObject.ts` - Object definitions
- `models/firstperson/PlayerStats.ts` - Player stat tracking

### Input Handling
- `services/FirstPersonInputHandler.ts` - Keyboard input processing
- `services/InteractionHandler.ts` - Object interaction logic
- `services/MovementValidator.ts` - Movement collision detection

### Data and Assets
- `data/dungeons/level-1.json` - Example dungeon level
- `data/dungeons/tileset-config.json` - Tileset mappings
- `public/tiles/dungeon-tiles.png` - Dungeon sprite sheet

### Components
- `components/firstperson/FirstPersonView.tsx` - Main container component
- `components/firstperson/FirstPersonCanvas.tsx` - 3D viewport wrapper

## Files to Modify

### Existing Systems
- `config/UIConfig.ts` - Add first-person layout dimensions
- `models/combat/CombatEncounter.ts` - Add context preservation for combat return
- `components/App.tsx` or routing - Add FirstPersonView route

## Edge Cases and Considerations

### 1. Movement During Animation
- **Issue**: Player spams movement keys during animation
- **Solution**: Block input until onAnimationComplete callback
- **Flag**: isAnimating boolean state

### 2. Targeting Invalid Objects
- **Issue**: Player tries to interact with wall or floor
- **Solution**: Only highlight interactive objects in raycast
- **Feedback**: Show "Nothing to interact with" if Spacebar pressed with no target

### 3. Inventory Full
- **Issue**: Player picks up item but inventory is full
- **Solution**: Show error message in combat log
- **Alternative**: Drop oldest item or open inventory to make space

### 4. Door States
- **Issue**: Door tile type changes but 3D model doesn't update
- **Solution**: Re-render Cell component when tile type changes
- **Optimization**: Use React key prop based on tile type

### 5. Minimap Boundary
- **Issue**: Minimap goes off-edge when player near dungeon boundary
- **Solution**: Clamp minimap viewport to stay within grid bounds
- **Alternative**: Center on player if far from edge, offset if near edge

### 6. Combat State Preservation
- **Issue**: First-person state lost when entering combat
- **Solution**: Save FirstPersonState to context/storage before combat
- **Restoration**: Load saved state when returning from combat

### 7. Encounter Respawn
- **Issue**: Defeated enemy respawns on revisit
- **Solution**: Track completed encounters in FirstPersonState
- **Data**: completedEncounters: Set<string> (encounter IDs)

### 8. Level Transitions
- **Issue**: Moving between dungeon levels loses state
- **Solution**: Serialize FirstPersonState on level change
- **Load**: Deserialize state for new level with new grid

## Testing Checklist

### Layout Tests
- [ ] All five UI regions render correctly at 384x216
- [ ] 9-slice frames render without artifacts
- [ ] Panel dimensions match specifications
- [ ] Top panel shows location name
- [ ] Map panel contains 3D canvas
- [ ] Combat log scrolls correctly
- [ ] Top info panel shows minimap
- [ ] Bottom info panel switches between modes

### 3D Viewport Tests
- [ ] Camera renders from correct position
- [ ] Camera rotates correctly on direction change
- [ ] Visible cells render within view distance
- [ ] Fog renders correctly (2-10 unit range)
- [ ] Lighting intensity and color correct
- [ ] Textures load and apply to tiles
- [ ] Movement animation smooth (0.2s duration)
- [ ] Rotation animation smooth (0.1s duration)

### Minimap Tests
- [ ] Minimap renders explored tiles
- [ ] Unexplored tiles hidden (fog of war)
- [ ] Player icon shows correct position
- [ ] Player icon shows correct facing direction
- [ ] Minimap updates on player movement
- [ ] Minimap scrolls/centers correctly

### Movement Tests
- [ ] WASD movement works correctly
- [ ] Arrow key movement works correctly
- [ ] Collision detection blocks walls
- [ ] Collision detection allows floors
- [ ] Boundary check prevents out-of-bounds
- [ ] Input blocked during animation
- [ ] Combat log shows movement messages
- [ ] Camera smoothly animates to new position

### Rotation Tests
- [ ] Turn left rotates North → West → South → East → North
- [ ] Turn right rotates North → East → South → West → North
- [ ] Rotation animation smooth
- [ ] Rotation blocked during movement animation
- [ ] Combat log shows rotation messages (optional)

### Interaction Tests
- [ ] Crosshair renders at viewport center
- [ ] Raycast detects interactive objects
- [ ] Interaction prompt shows in bottom panel
- [ ] Spacebar triggers interaction
- [ ] Door opens/closes correctly
- [ ] Chest opens and shows loot
- [ ] Item pickup adds to inventory
- [ ] Interaction range validation (1.5 tiles max)
- [ ] Combat log shows interaction messages

### Encounter Tests
- [ ] Encounter triggers when entering trigger tile
- [ ] Combat transition fade plays
- [ ] CombatView loads with correct encounter
- [ ] Post-combat returns to first-person
- [ ] Defeated encounter doesn't re-trigger
- [ ] Combat rewards applied to inventory

### Stats Panel Tests
- [ ] HP bar renders correctly
- [ ] MP bar renders correctly (if applicable)
- [ ] Level and XP display correctly
- [ ] Status effects shown
- [ ] Stats update in real-time

### Inventory Tests
- [ ] Quick inventory shows items
- [ ] Item icons render correctly
- [ ] Item count displays for stackables
- [ ] Hover shows item tooltip
- [ ] Click uses/equips item

## Performance Benchmarks

### Target Frame Rate
- **Goal**: 60 FPS on typical hardware
- **Acceptable**: 30 FPS on low-end hardware
- **3D Rendering**: <16ms per frame
- **UI Rendering**: <5ms per frame

### Memory Usage
- **Textures**: <50MB total
- **Geometry**: <10MB total
- **State**: <1MB total
- **Acceptable Total**: <100MB

### Load Times
- **Level Load**: <1 second
- **Texture Load**: <2 seconds (first load only)
- **Save/Load**: <0.5 seconds

## Future Extensions

### Advanced Graphics
- **Dynamic Shadows**: Real-time shadow casting
- **Reflections**: Floor reflections for water/ice tiles
- **Particle Systems**: Torch flames, magic effects, dust
- **Post-Processing**: Bloom, color grading, vignette

### Gameplay Features
- **Stealth System**: Sneaking past enemies
- **Puzzle Mechanics**: Switches, pressure plates, sliding blocks
- **Environmental Hazards**: Traps, lava, spikes
- **Weather System**: Rain, fog, time of day
- **NPC Pathing**: Moving NPCs and enemies

### UI Enhancements
- **Full Inventory Screen**: Detailed inventory management
- **Quest Log**: Track active and completed quests
- **Character Sheet**: Full stats, skills, equipment
- **Journal**: Lore entries, map notes
- **Settings Menu**: Graphics, controls, audio options

### Multiplayer (Aspirational)
- **Co-op Dungeon Crawling**: Multiple players in same level
- **Shared State**: Synchronized grid, objects, encounters
- **Turn-Based Multiplayer**: Sequential player turns
- **PvP Combat**: Player vs player encounters

## Success Criteria

This feature is complete when:
1. All five UI regions render correctly at 384x216 resolution
2. 3D first-person viewport renders dungeon from player perspective
3. Player can move in four cardinal directions with WASD/arrows
4. Player can rotate left/right with smooth animation
5. Minimap shows explored tiles with fog of war
6. Player stats panel displays HP/MP/level correctly
7. Combat log shows movement and interaction messages
8. Crosshair targeting works for interactive objects
9. Door interaction (open/close) works correctly
10. Encounter system triggers combat transition
11. Post-combat returns to first-person with state preserved
12. All edge cases handled gracefully
13. Performance meets benchmarks (60 FPS target)
14. Code is well-documented and follows project patterns

## Dependencies

- **Requires**: React Three Fiber (@react-three/fiber)
- **Requires**: Three.js (three)
- **Requires**: Existing layout system (CombatLayoutManager pattern)
- **Requires**: Font rendering system (FontAtlasRenderer)
- **Requires**: Sprite loading system (SpriteAssetLoader)
- **Requires**: Combat system (for encounter transitions)
- **Relates To**: CombatView (shared UI layout structure)

## Estimated Complexity

- **Implementation Time**: 40-60 hours
  - Layout structure: 6-8 hours
  - 3D viewport integration: 8-10 hours
  - Minimap system: 6-8 hours
  - Movement system: 6-8 hours
  - Interaction system: 8-10 hours
  - Encounter system: 4-6 hours
  - Stats/inventory panels: 6-8 hours
  - Polish and testing: 8-12 hours
- **Testing Time**: 10-15 hours
- **Total**: ~50-75 hours

**Complexity Rating**: High (substantial new system with 3D rendering)

**Risk Level**: Medium
- **Medium Risk**: 3D rendering performance, state synchronization between first-person and combat
- **Low Risk**: Layout structure reuse, existing prototype as foundation

---

**Notes:**
- This system serves as the bridge between exploration and combat gameplay
- The consistent UI layout with combat ensures player familiarity
- The modular design allows for easy extension with new features
- Performance optimization is critical due to real-time 3D rendering
- Consider accessibility features (colorblind mode, control rebinding)

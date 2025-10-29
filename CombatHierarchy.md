# Combat System Hierarchy

**Version:** 1.8
**Last Updated:** Wed, Oct 29, 2025 (Added AI agent usage instructions and navigation index)
**Related:** [GeneralGuidelines.md](GeneralGuidelines.md)

## Purpose

This document provides a token-efficient reference for AI agents to quickly understand the combat system architecture. Organized by both directory structure and functionality.

## How AI Agents Should Use This Document

**⚠️ IMPORTANT: Do NOT read this entire file upfront.**

This document is 1,300+ lines and designed as a **reference**, not a preamble. Reading it completely wastes tokens.

### Recommended Usage Pattern:

#### 1. **Start with Quick Reference** (below)
Read ONLY the Quick Reference section first. It maps common tasks to relevant files.

#### 2. **Read Targeted Sections**
Use the Navigation Index to find the specific section you need. Examples:
- Adding a phase → Read `### 2. Phase Handlers` only
- UI panel work → Read `### 4. Layout & UI Management` only
- Movement logic → Read `#### MovementPathfinder.ts` entry only

#### 3. **Use Search (Ctrl+F)**
Search for specific file names (e.g., "ActionsMenuContent") or keywords (e.g., "hover", "animation")

#### 4. **Read Data Flow ONLY if confused**
If unclear how pieces connect, read `## Data Flow Summary` section

#### 5. **For Large Features**
Read multiple targeted sections, NOT the whole file

### What NOT to Do:
- ❌ Don't read all 1,300 lines before starting work
- ❌ Don't include entire file in every conversation
- ❌ Don't read sections unrelated to current task
- ❌ Don't treat this as documentation to memorize - it's a quick reference map

### Token Budget Guidance:
- **Quick lookup**: Read Quick Reference only (~200 tokens)
- **Single file work**: Quick Reference + 1 section (~2,000 tokens)
- **Feature work**: Quick Reference + 2-3 sections (~4,000 tokens)
- **Architecture change**: Quick Reference + Data Flow + relevant sections (~6,000 tokens)
- **Only as last resort**: Read entire file (~17,000 tokens)

### Example Workflow:
```
Task: "Add Reset Move button to actions menu"

Step 1: Read Quick Reference
  → Found: "Add info panel content → Implement PanelContent interface"

Step 2: Search for "ActionsMenuContent"
  → Jump to that section, read it only

Step 3: If unclear, search for "PanelContent"
  → Jump to interface definition, read it

Total tokens used: ~1,500 instead of 17,000
```

### For Human Users:
When providing this file to an AI agent, you can say:
> "Use CombatHierarchy.md as a reference. Start with the Quick Reference section, then read only the sections relevant to [your task]. Do NOT read the entire file."

---

## Navigation Index

### By Task Type:
- **Canvas rendering** → `#### CombatRenderer.ts`, `### 4. Rendering System`
- **Panel content** → `### 4. Layout & UI Management` → `managers/panels/`
- **Phase handler** → `### 2. Phase Handlers`
- **Turn order display** → `#### TurnOrderRenderer.ts`
- **Unit movement** → `#### UnitMovementSequence.ts`, `#### MovementPathfinder.ts`
- **Save/load** → `### 9. Serialization System`
- **Hover interactions** → `#### UnitInfoContent.ts`, search "handleTopPanelHover"
- **Detail panels** → `#### AbilityInfoContent.ts`, `#### EquipmentInfoContent.ts`
- **Button states** → `#### ActionsMenuContent.ts`
- **Animation** → `### 6. Cinematics & Animation`
- **Pathfinding** → `### 8. Utilities & Predicates`

### By Component Type:
- **Phase Handlers** → `### 2. Phase Handlers`
- **Panel Content** → `### 4. Layout & UI Management` → `managers/panels/`
- **Renderers** → `### 4. Rendering System`, `managers/renderers/`
- **Turn Strategies** → `### 3. Turn Strategies`
- **Animations** → `### 6. Cinematics & Animation`
- **Utilities** → `### 8. Utilities & Predicates`

### Major Sections (use Ctrl+F):
- `### 1. Core State & Data` - CombatState, CombatUnit, CombatMap, etc.
- `### 2. Phase Handlers` - Deployment, ActionTimer, UnitTurn phases
- `### 3. Turn Strategies` - Player vs AI behavior
- `### 4. Rendering System` - Map and unit rendering
- `### 4. Layout & UI Management` - All panels, buttons, managers (17 files)
- `### 5. Deployment System` - Deployment zones and UI
- `### 6. Cinematics & Animation` - Sequences and effects
- `### 7. Unit System` - HumanoidUnit, MonsterUnit, classes
- `### 8. Utilities & Predicates` - Pathfinding, movement calculation
- `### 9. Serialization System` - Save/load functionality
- `## Data Flow Summary` - How components connect
- `## Event Handling Architecture` - Mouse events and coordinates
- `## Performance Patterns` - Caching and optimization

---

## Quick Reference: Common Tasks

- **Add a new combat phase** → Implement `CombatPhaseHandler`, update `CombatView` phase switching
- **Modify rendering** → `CombatRenderer` (maps/units), `CombatLayoutManager` (UI layout)
- **Add movement/pathfinding logic** → `MovementRangeCalculator` utility, phase handler integration
- **Modify unit movement logic** → `MovementPathfinder` utility, `UnitMovementSequence` animation, `PlayerTurnStrategy` mode management
- **Add deployment zone logic** → `DeploymentPhaseHandler`, `DeploymentZoneRenderer`
- **Change turn order display** → `TurnOrderRenderer`, `TopPanelManager`
- **Modify turn order scrolling** → `TurnOrderRenderer` (scroll arrows, hold-to-scroll), cached by phase handlers
- **Add info panel content** → Implement `PanelContent` interface
- **Modify combat log** → `CombatLogManager`
- **Add cinematic sequence** → Implement `CinematicSequence`, use `CinematicManager`
- **Modify map scrolling** → `CombatMapRenderer` (offset calculations), `CombatLayoutManager` (arrow rendering)
- **Add save/load features** → `combatStorage.ts` (storage), `CombatSaveData.ts` (serialization), integrate with `CombatView` and `LoadingView`

---

## Directory Structure

```
react-app/src/
├── components/combat/
│   ├── CombatView.tsx                      # Main combat view component
│   ├── LoadingView.tsx                     # Generic loading transition overlay
│   └── CombatViewRoute.tsx                 # Routing wrapper
│
└── models/combat/
    ├── Core State & Data
    ├── Phase Handlers
    ├── Rendering
    ├── Layout & UI Management
    ├── Deployment System
    ├── Cinematics & Animation
    ├── Unit System
    └── Utilities
```

---

## File Hierarchy by Category

### 1. Core State & Data

#### `CombatState.ts`
**Purpose:** Central state container for active combat
**Exports:** `CombatState`, `CombatPhase`, `CombatStateJSON`, `serializeCombatState()`, `deserializeCombatState()`
**Key Fields:** turnNumber, map, phase, unitManifest, tilesetId, tickCount
**Combat Phases:** 'deployment' | 'enemy-deployment' | 'action-timer' | 'unit-turn' | 'victory' | 'defeat'
**Tick Counter:** tickCount (optional number) - tracks discrete tick increments throughout combat, updated by ActionTimerPhaseHandler, passed to all phases
**Transient State Fields (NOT serialized):**
- `pendingSlideAnimation` (boolean): Flag to trigger immediate slide animation when entering action-timer phase after Delay/End Turn action. Cleared by ActionTimerPhaseHandler after triggering the slide.
- `previousTurnOrder` (CombatUnit[]): Previous turn order (unit instances) before Delay/End Turn action. Used to animate FROM this order TO the new order. Cleared by ActionTimerPhaseHandler after starting the animation.
- `pendingActionTimerMutation` ({ unit, newValue }): Pending action timer mutation to apply when entering action-timer phase. Delays the mutation until after phase transition to avoid showing new turn order in unit-turn phase for one frame. Applied by ActionTimerPhaseHandler at start of updatePhase().
**Dependencies:** CombatMap, CombatUnitManifest
**Used By:** All phase handlers, CombatView, renderers, serialization

#### `CombatEncounter.ts`
**Purpose:** Defines combat scenario (map, enemies, conditions, deployment zones)
**Exports:** `CombatEncounter`, `EnemyPlacement`, `UnitPlacement`
**Key Methods:** createEnemyUnits(), isVictory(), isDefeat(), fromJSON()
**Dependencies:** CombatMap, CombatPredicate, EnemyRegistry
**Used By:** CombatView, phase handlers, data loaders

#### `CombatMap.ts`
**Purpose:** Tactical grid with terrain, walkability, sprite IDs
**Exports:** `CombatMap`, `CombatCell`, `TerrainType`, `parseASCIIMap()`
**Key Methods:** getCell(), setCell(), isWalkable(), getAllCells()
**Dependencies:** Position type
**Used By:** CombatEncounter, CombatRenderer, pathfinding (future)

#### `CombatUnit.ts`
**Purpose:** Interface for combat-ready characters (stats, abilities, classes)
**Exports:** `CombatUnit` interface
**Key Properties:** name, health, mana, speed, actionTimer, spriteId, abilities, isPlayerControlled
**Action Timer System:**
- actionTimer: Current AT value (0-100+), increases by speed * deltaTime * multiplier
- Starts at 0 at combat start
- When reaches 100+, unit is ready to take their turn
- Used by ActionTimerPhaseHandler for turn order calculation
**Player Control System:**
- isPlayerControlled: boolean getter - distinguishes player units from enemies
- Set to true during deployment for party members
- Set to false for enemy units
- Used for team identification in pathfinding and AI
- Serialized/deserialized with unit data
**Implementations:** HumanoidUnit, MonsterUnit
**Used By:** All unit-related components, rendering, combat logic

#### `CombatUnitManifest.ts`
**Purpose:** Tracks all units and positions on the battlefield with unique IDs
**Exports:** `CombatUnitManifest`, `UnitPlacement`, `UnitPlacementJSON`, `CombatUnitManifestJSON`
**Key Methods:** addUnit(), removeUnit(), getAllUnits(), getUnitAt(), toJSON(), fromJSON()
**Key Pattern:** WeakMap for object-to-ID mapping (allows duplicate unit names, enables GC)
**ID Format:** "UnitName-X" where X is auto-incrementing number
**Dependencies:** CombatUnit, Position, HumanoidUnit, MonsterUnit
**Used By:** CombatState, phase handlers, renderers, serialization

#### `CombatConstants.ts`
**Purpose:** Centralized configuration (canvas size, colors, text, animations)
**Exports:** `CombatConstants` object
**Key Sections:** CANVAS, UI, TEXT, COMBAT_LOG, ENEMY_DEPLOYMENT, UNIT_TURN
**UNIT_TURN Section:**
- Cursor colors and sprite IDs (active unit, target unit)
- Movement range highlight settings (color, alpha, sprite)
- Movement animation speed: `MOVEMENT_SPEED_PER_TILE = 0.2` (seconds per tile)
- Movement range colors:
  - `MOVEMENT_RANGE_COLOR_NORMAL = '#ffff00'` (yellow, default)
  - `MOVEMENT_RANGE_COLOR_ACTIVE = '#00ff00'` (green, move mode)
- Ready message colors (player green, enemy red)
- Cursor blink rate (0.5 seconds)
**Used By:** All combat files for consistent values

#### `CombatUIState.ts`
**Purpose:** UI state management (hovered cell, selected unit, cursor)
**Exports:** `CombatUIState`, `CombatUIStateManager`
**Key Methods:** setHoveredCell(), subscribe()
**Dependencies:** Position
**Used By:** CombatView, phase handlers for hover/selection state

---

### 2. Phase Handlers

#### `CombatPhaseHandler.ts`
**Purpose:** Interface for phase-specific behavior and event handling
**Exports:** `CombatPhaseHandler`, `PhaseEventResult`, `PhaseRenderContext`, `MouseEventContext`
**Key Methods:** getRequiredSprites(), render(), renderUI(), update(), handle[Event]()
**Rendering Methods:**
- render(): Called after map tiles, before units (for underlays like movement ranges)
- renderUI(): Called after units (for overlays like cursors, UI elements) [optional]
- Dual-method pattern enables proper Z-ordering control
**Implementations:** DeploymentPhaseHandler, EnemyDeploymentPhaseHandler, ActionTimerPhaseHandler, UnitTurnPhaseHandler
**Used By:** CombatView (phase switching), phase implementations

#### `PhaseBase.ts`
**Purpose:** Abstract base class with common phase infrastructure
**Exports:** `PhaseBase`
**Key Methods:** update() (delegates to updatePhase)
**Dependencies:** CombatPhaseHandler
**Used By:** DeploymentPhaseHandler, EnemyDeploymentPhaseHandler

#### `DeploymentPhaseHandler.ts`
**Purpose:** Player unit deployment phase (select zones, place units, enter combat)
**Exports:** `DeploymentPhaseHandler`, `DeploymentPanelData`, `DeploymentActionData`
**Key Methods:** handleDeploymentAction(), handleTileClick(), getSelectedZoneIndex()
**Player Control Setup:** Sets isPlayerControlled=true on deployed units
**Dependencies:** DeploymentUI, DeploymentZoneRenderer, UnitDeploymentManager, PartyMembersContent (info panel)
**Used By:** CombatView during deployment phase

#### `EnemyDeploymentPhaseHandler.ts`
**Purpose:** Enemy fade-in animation phase with staggered dither effects
**Exports:** `EnemyDeploymentPhaseHandler`
**Key Methods:** initialize(), buildEnemyApproachMessage()
**Dependencies:** EnemySpriteSequence, StaggeredSequenceManager, EnemyRegistry
**Used By:** CombatView during enemy-deployment phase
**Transitions To:** action-timer phase

#### `ActionTimerPhaseHandler.ts`
**Purpose:** Active Time Battle (ATB) system - simulates discrete ticks and animates turn order with slide transitions
**Exports:** `ActionTimerPhaseHandler`, `ActionTimerInfoPanelContent`
**Key Methods:** getTopPanelRenderer(), getInfoPanelContent(), handleMapClick(), handleMouseMove(), updatePhase(), startAnimation(), triggerImmediateSlide()
**Current Functionality:**
- Simulates discrete tick increments until first unit reaches 100 AT
- Each tick: actionTimer += speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER
- Ticks are whole number increments (no fractional ticks to reach exactly 100)
- Animates through discrete tick snapshots, displaying each for TICK_DISPLAY_DURATION
- Shows turn order sorted by predicted turn order (who acts next) in top panel
- Displays ticks-until-ready below unit sprites (not raw AT values)
- Units slide smoothly to new positions when turn order changes during ticks
- Handles immediate slide animations triggered by Delay/End Turn actions
- Placeholder info panel with "Action Timer Phase" text
- Mouse event logging
- Victory/defeat condition checking
**Key Constants:**
- ACTION_TIMER_MULTIPLIER: 1 (controls combat pacing)
- TICK_SIZE: 1 (size of each discrete tick increment)
- TICK_DISPLAY_DURATION: 0.5 seconds (time to display each discrete tick)
- POSITION_SLIDE_DURATION: 0.3333 seconds (time for units to slide to new positions)
- maxTicks: 10000 (safety limit for simulation)
**Animation Modes:**
- 'idle': No animation in progress
- 'immediate-slide': Triggered by Delay/End Turn actions, slides units to new order
- 'discrete-ticks': Normal tick animation with position slides on order changes
**Immediate Slide Pattern:**
- Triggered when entering action-timer phase with pendingSlideAnimation=true
- Applies pendingActionTimerMutation FIRST in updatePhase() (before any rendering)
- Captures previousTurnOrder from state (unit instances, not names)
- Starts slide animation from previous positions to new positions
- Waits for slide completion before starting discrete tick animation
- Transitions to 'discrete-ticks' mode after slide completes
**Deferred Slide Pattern:**
- If TurnOrderRenderer region not cached yet, stores pendingSlideNewOrder
- Triggers animation on first render() call when region becomes available
- Skips updateUnits() call in getTopPanelRenderer() when pending deferred slide exists
**Tick Simulation:**
- Creates TickSnapshot[] array with timer values and turn order for each tick
- Increments all timers by discrete amounts each tick
- Stops when any unit reaches >= 100
- No fractional ticks - units may exceed 100 by different amounts
- Stores complete turn order at each tick for position change detection
**Animation Pattern:**
- Uses WeakMap<CombatUnit, number> for per-unit timer tracking
- Avoids duplicate name issues (multiple "Goblin" units work correctly)
- Discrete updates: timer values change only at tick boundaries
- Turn order recalculated at each tick based on updated timers
- Slide animation triggered when turn order changes between ticks
**Caching Strategy:**
- Caches TurnOrderRenderer instance to preserve scroll state across animation frames
- Uses updateUnits() to update unit list without resetting scroll position
- Scroll state persists throughout animation phase
**Future Functionality:**
- Speed modifiers from status effects
- Time stop effects
- Timer overflow handling (carry over to next turn)
- Configurable ACTION_TIMER_MULTIPLIER and TICK_SIZE
**Dependencies:** PhaseBase, TurnOrderRenderer, CombatEncounter, CombatUnit (for WeakMap keys)
**Used By:** CombatView during action-timer phase
**Transitions To:** unit-turn phase (when first unit reaches 100)

#### `UnitTurnPhaseHandler.ts`
**Purpose:** Individual unit's turn - delegates behavior to strategy pattern (player vs enemy)
**Exports:** `UnitTurnPhaseHandler`
**Key Methods:** updatePhase(), getTopPanelRenderer(), getInfoPanelContent(), getActiveUnit(), getTargetedUnit(), handleMapClick(), executeAction(), **startMoveAnimation()**, **completeMoveAnimation()**, **executeResetMove()**
**Architecture:** Uses Strategy Pattern to separate player input from AI decision-making
- Creates PlayerTurnStrategy for player-controlled units
- Creates EnemyTurnStrategy for AI-controlled units
- Delegates input handling, target selection, and action decisions to strategy
- Keeps single 'unit-turn' phase for both player and enemy turns
**Current Functionality:**
- Identifies ready unit (first in turn order with AT >= 100)
- Displays colored ready message: "[Unit Name] is ready!" (green for players, red for enemies)
- Auto-selects active unit on turn start (via strategy pattern)
- Shows blinking dark green cursor on active unit (0.5s blink rate)
- Shows red target cursor only when targeting different unit (not on active unit)
- Initializes appropriate strategy based on unit.isPlayerControlled
- Delegates all turn behavior to strategy.update()
- Gets movement range, target info, and path preview from strategy
- **Executes Move action with animation**
- **Executes Reset Move action (teleport back to original position)**
- Executes Delay and End Turn actions from action menu
- Transitions back to action-timer phase with slide animation
**UI Panels:**
- Top panel: Shows unit name as title (green for players, red for enemies)
- Bottom panel: Shows "ACTIONS" menu with Move, Attack, Delay, End Turn, and conditional Reset Move
**Rendering:**
- Uses dual-method rendering pattern (render() and renderUI())
- render(): Movement range highlights (green in move mode, yellow otherwise), path preview (yellow) - BEFORE units
- renderUI(): Animated unit during movement, active unit cursor (green, blinking), target cursor (red) - AFTER units
- Cached tinting buffer for color tinting (avoids GC pressure)
- Queries strategy for movement range, color override, and path preview each frame
**Movement Animation:**
- Temporarily moves unit to (-999, -999) during animation
- Renders animated unit manually in `renderUI()` at interpolated position
- Updates manifest to final position when animation completes
- Sets `unitHasMoved = true`, `canResetMove = true`
- Clears movement range from strategy
**Reset Move:**
- Stores `originalPosition` before move starts
- Teleports unit back to original position
- Resets `unitHasMoved = false`, `canResetMove = false`
- Restores movement range via `onMoveReset()` callback
**Delay/End Turn Execution Pattern:**
- Captures previousTurnOrder (unit instances) BEFORE mutation
- Defers actionTimer mutation using pendingActionTimerMutation field in CombatState
- Sets pendingSlideAnimation=true flag
- Returns new state with phase='action-timer'
- ActionTimerPhaseHandler applies mutation at start of updatePhase() and triggers slide animation
- Prevents one-frame flash of final state before animation
**State Tracking:**
- unitHasMoved: boolean (prevents second move)
- originalPosition: Position | null (for reset)
- canResetMove: boolean (enables reset button)
- movementSequence: UnitMovementSequence | null (active animation)
**Turn Order Logic:**
- Calculates timeToReady = (100 - actionTimer) / speed for each unit
- Sorts ascending (soonest first), then alphabetically by name
- Uses same calculation as ActionTimerPhaseHandler for consistency
**Caching Strategy:**
- Caches TurnOrderRenderer instance to preserve scroll state
- Caches UnitInfoContent to preserve hover state
- Caches tinting buffer canvas to avoid per-frame allocations
- Caches strategy instance for duration of turn
**Future Functionality:**
- Execute Attack action with damage calculation
- Execute Ability action with ability system integration
**Dependencies:** PhaseBase, TurnOrderRenderer, PlayerTurnStrategy, EnemyTurnStrategy, TurnStrategy, **UnitMovementSequence**, **MovementPathfinder**
**Used By:** CombatView during unit-turn phase
**Transitions To:** action-timer phase (when Delay/End Turn/Move completes)

---

### 3. Turn Strategies (Strategy Pattern)

#### `strategies/TurnStrategy.ts`
**Purpose:** Interface defining turn behavior contract for player and AI
**Exports:** `TurnStrategy`, `TurnAction`
**Key Methods:** onTurnStart(), onTurnEnd(), update(), handleMapClick(), handleMouseMove(), getTargetedUnit(), getTargetedPosition(), getMovementRange()
**TurnAction Types:**
- `{ type: 'delay' }` - Set actionTimer to 50, return to action-timer phase
- `{ type: 'end-turn' }` - Set actionTimer to 0, return to action-timer phase
- `{ type: 'move', target: Position }` - Move to position (future)
- `{ type: 'attack', target: Position }` - Attack target at position (future)
- `{ type: 'ability', abilityId: string, target?: Position }` - Use ability (future)
**Used By:** PlayerTurnStrategy, EnemyTurnStrategy implementations

#### `strategies/PlayerTurnStrategy.ts`
**Purpose:** Player turn behavior - waits for input, shows UI
**Exports:** `PlayerTurnStrategy`
**Implements:** TurnStrategy
**Current Functionality:**
- Auto-selects active unit on turn start
- Calculates movement range using MovementRangeCalculator
- **Move mode**: Click Move button → range turns green, hover shows yellow path
- **Path preview**: Pre-calculates all paths on mode entry, instant hover updates
- **Movement execution**: Returns `{ type: 'move', destination }` action
- **Reset move**: Returns `{ type: 'reset-move' }` action to undo movement
- Handles unit selection and info panel updates
**State Tracking:**
- mode: 'normal' | 'moveSelection'
- moveModePaths: Map<string, Position[]> (pre-calculated paths)
- hoveredMovePath: Position[] | null (for yellow preview)
- hasMoved: boolean (cleared after reset)
- activeUnit, activePosition: The unit whose turn it is
- targetedUnit, targetedPosition: Currently selected unit (for inspection)
- movementRange: Movement highlight tiles
- currentState: Reference to CombatState for calculations
**Path Caching:**
- Calculates all valid paths on `enterMoveMode()`
- Hover updates instant (no recalculation)
- Cache cleared on `exitMoveMode()`
**Dependencies:** MovementRangeCalculator, MovementPathfinder
**Used By:** UnitTurnPhaseHandler for player-controlled units

#### `strategies/EnemyTurnStrategy.ts`
**Purpose:** AI turn behavior - automatically decides actions
**Exports:** `EnemyTurnStrategy`
**Implements:** TurnStrategy
**Current Functionality:**
- Auto-selects active unit on turn start (shows in top panel with red title)
- Calculates movement range on turn start
- Adds thinking delay (1.0 second) for visual feedback
- Returns `{ type: 'end-turn' }` action after delay (placeholder)
**Future Functionality:**
- Scan for player units in attack range → attack best target
- Scan for player units in movement + attack range → move + attack
- Move toward closest player unit if no attacks available
- Use abilities strategically
**AI Helper Methods (commented, ready for implementation):**
- `_findPlayerUnits()` - Locates all player-controlled units
- `_calculateDistance()` - Manhattan distance between positions
- `_findBestAttackTarget()` - Selects optimal attack target (weakest/closest)
- `_findBestMovementTarget()` - Selects optimal movement destination
**State Tracking:**
- movementRange: Tiles enemy can move to
- thinkingTimer, thinkingDuration: Delay before decision (visual feedback)
- actionDecided: Cached decision once made
- targetedUnit, targetedPosition: AI's chosen target (for visualization)
**Input Handling:** Returns `{ handled: false }` - enemies don't respond to player input
**Dependencies:** MovementRangeCalculator
**Used By:** UnitTurnPhaseHandler for enemy-controlled units

---

### 4. Rendering System

#### `rendering/CombatRenderer.ts`
**Purpose:** Core rendering for map tiles and units
**Exports:** `CombatRenderer`
**Key Methods:** clearCanvas(), renderMap(), renderUnits(), renderDebugGrid()
**Dependencies:** SpriteRenderer, FontAtlasRenderer, CombatMap, CombatUnitManifest
**Used By:** CombatView render loop

#### `rendering/CombatMapRenderer.ts`
**Purpose:** Map offset calculations, scrolling, coordinate conversion, click handling
**Exports:** `CombatMapRenderer`, `MapClickHandler`
**Key Methods:** calculateMapOffset(), canvasToTileCoordinates(), handleMapClick(), onMapClick()
**Dependencies:** CombatLayoutRenderer
**Used By:** CombatView for map positioning and input

---

### 4. Layout & UI Management

#### `layouts/CombatLayoutManager.ts`
**Purpose:** Main UI layout coordinator (panels, combat log, turn order, scroll arrows)
**Exports:** `CombatLayoutManager`
**Key Methods:** renderLayout(), getMapViewport(), get[Panel]Region(), handleMapScrollClick(), handleTopPanelHover(), handleTopInfoPanelClick()
**Panel Content Logic:**
- Deployment phase: PartyMembersContent (bottom panel)
- Enemy-deployment phase: EmptyContent (bottom panel)
- Unit-turn phase: ActionsMenuContent (bottom panel) with buttons re-enabled, UnitInfoContent with unit name/color (top panel)
- Other phases: UnitInfoContent (if unit available), EmptyContent (if no unit)
**Button State Management:**
- Calls `setButtonsDisabled(false)` on ActionsMenuContent when entering unit-turn phase
- Ensures buttons are clickable after previous turn's action completed
**Detail Panel Hover System:**
- Monitors hover events on top info panel (UnitInfoContent abilities view)
- Temporarily swaps bottom panel content to show ability/equipment details
- Caches detail panel instances (cachedAbilityPanel, cachedEquipmentPanel)
- Restores original bottom panel content when hover exits
- State flags: detailPanelActive, originalBottomPanelContent
**Phase Detection:** Uses flags (isDeploymentPhase, isEnemyDeploymentPhase) and currentUnit presence
**Dependencies:** HorizontalVerticalLayout, InfoPanelManager, panel content implementations, CombatConstants
**Used By:** CombatView for all UI rendering

#### `layouts/CombatLayoutRenderer.ts`
**Purpose:** Interface for layout rendering implementations
**Exports:** `CombatLayoutRenderer`, `LayoutRenderContext`
**Key Methods:** getMapViewport(), getMapClipRegion(), renderLayout()
**Implementations:** CombatLayoutManager
**Used By:** CombatMapRenderer, CombatView

#### `layouts/HorizontalVerticalLayout.ts`
**Purpose:** Renders 9-slice UI frames and dividers for layout regions
**Exports:** `HorizontalVerticalLayout`, `LayoutRegion`
**Key Methods:** render()
**Dependencies:** SpriteRenderer
**Used By:** CombatLayoutManager

#### `managers/InfoPanelManager.ts`
**Purpose:** Delegates rendering and input to PanelContent implementations
**Exports:** `InfoPanelManager`
**Key Methods:** setContent(), render(ctx, region, fontId, fontAtlasImage, spriteImages?, spriteSize?), handleClick(), handleHover(), handleMouseDown()
**Rendering:**
- Forwards all render parameters including optional spriteImages and spriteSize to panel content
- Transforms canvas coordinates to panel-relative coordinates for event handling
**Dependencies:** PanelContent
**Used By:** CombatLayoutManager for bottom/top info panels

#### `managers/TopPanelManager.ts`
**Purpose:** Manages top panel content switching (turn order, deployment header)
**Exports:** `TopPanelManager`
**Key Methods:** setRenderer(), render(), handleClick()
**Dependencies:** TopPanelRenderer
**Used By:** CombatLayoutManager, CombatView

#### `managers/TopPanelRenderer.ts`
**Purpose:** Interface for top panel rendering implementations
**Exports:** `TopPanelRenderer`, `PanelRegion`
**Key Methods:** render(), handleClick()
**Implementations:** TurnOrderRenderer, DeploymentHeaderRenderer
**Used By:** TopPanelManager

#### `managers/renderers/TurnOrderRenderer.ts`
**Purpose:** Renders turn order with unit sprites, ticks-until-ready values, tick counter, title, scrolling support, and slide animations
**Exports:** `TurnOrderRenderer`
**Key Methods:** render(), handleClick(), handleMouseDown(), handleMouseUp(), handleMouseLeave(), setUnits(), updateUnits(), setClickHandler(), startSlideAnimation(), updateSlideAnimation(), getUnits()
**Constructor Overload:**
- `(units, onUnitClick?)` - legacy signature with click handler
- `(units, tickCount, onUnitClick?)` - new signature with tick counter
- Second parameter can be function (onUnitClick) or number (tickCount)
**Rendering Features:**
- "TIME UNTIL NEXT TURN" title in orange (7px-04b03 font) at top of panel
- Clock sprite (icons-5) on left side with "TIME" label above
- Tick counter displayed below clock sprite in white
- Units centered horizontally and aligned to bottom of panel
- Unit sprites with 12px spacing between them
- Ticks-until-ready displayed below each sprite in white (formula: `Math.ceil((100 - actionTimer) / speed)`)
- Supports dual font rendering (15px-dungeonslant and 7px-04b03)
- Clickable unit portraits for selection
**Slide Animation Features:**
- Smooth linear interpolation between previous and target unit positions
- Duration: 0.3333 seconds (configurable via slideAnimationDuration)
- Supports units sliding off-screen (position 9+) gracefully
- Uses WeakMap<CombatUnit, number> for position tracking (handles duplicate names)
- Renders ALL animating units, not just first 8 from new order
**Animation State:**
- slideAnimationActive: Whether animation is currently playing
- slideAnimationElapsedTime: Progress through animation
- previousPositions: WeakMap of unit → previous X coordinate
- targetPositions: WeakMap of unit → target X coordinate
- animatingUnits: Array of all units participating in animation
- pendingSlideNewOrder: Deferred animation when region not yet cached
**Scrolling Features:**
- Displays up to 8 units at once with horizontal scrolling for 8+ units
- Scroll arrows (minimap-6, minimap-8) stacked vertically on right side
- Left arrow (top): Scroll to previous units
- Right arrow (bottom): Scroll to next units
- Hold-to-scroll with 200ms repeat interval
- Click arrows for single-unit scroll, hold for continuous scrolling
- Mouse leave/up stops continuous scrolling
- Scroll state preserved across animation updates via updateUnits()
- Scroll state reset when setUnits() called (explicit context change)
- Scroll resets to 0 when slide animation starts (shows first 8 units)
**Clipping:**
- Canvas clipping with extended height (region.height + 7px)
- Allows ticks-until-ready text to render 7px below panel without being cut off
**Layout:**
- Title: centered at top, no padding
- Clock: left side (4px padding), "TIME" label at top, tick count below sprite
- Sprites: bottom-aligned with 3px downward shift, centered as group
- Ticks-until-ready values: centered below each sprite
- Arrows: right edge, stacked (left arrow at y=0, right arrow at y=12)
- Max visible units: 8 (allows scrolling through larger unit lists)
**Color Scheme:**
- Title text: #FFA500 (orange)
- "TIME" label: #FFA500 (orange, matches title)
- Tick counter: #ffffff (white, matches ticks-until-ready)
- Ticks-until-ready: #ffffff (white)
**State Management:**
- Cached by phase handlers (ActionTimerPhaseHandler, UnitTurnPhaseHandler)
- Maintains scroll offset across renders
- Uses updateUnits() to preserve scroll position during animation frames
- Uses setUnits() to reset scroll when entering new context
- Exposes getUnits() for capturing previous order before mutations
**Dependencies:** CombatUnit, SpriteRenderer, FontAtlasRenderer
**Used By:** TopPanelManager during action-timer and unit-turn phases

#### `managers/renderers/DeploymentHeaderRenderer.ts`
**Purpose:** Simple text header for deployment/enemy-deployment phases
**Exports:** `DeploymentHeaderRenderer`
**Key Methods:** render()
**Dependencies:** FontAtlasRenderer
**Used By:** TopPanelManager during deployment phases

#### `managers/panels/PanelContent.ts`
**Purpose:** Interface for info panel content with event handling and sprite rendering support
**Exports:** `PanelContent`, `PanelRegion`, `PanelClickResult`
**Key Methods:** render(ctx, region, fontId, fontAtlasImage, spriteImages?, spriteSize?), handleClick(), handleHover(), handleMouseDown()
**Interface Updates:**
- render() method now accepts optional spriteImages and spriteSize parameters for sprite rendering
- Enables panel content to render unit sprites and UI elements
- Backward compatible - parameters are optional
**Implementations:** UnitInfoContent, PartyMembersContent, ActionsMenuContent, EmptyContent
**Used By:** InfoPanelManager

#### `managers/panels/UnitInfoContent.ts`
**Purpose:** Comprehensive unit information display with sprite, stats grid, action timer, and abilities view
**Exports:** `UnitInfoContent`, `UnitInfoConfig`
**Key Methods:** render(), updateUnit(unit, title?, titleColor?), handleHover()
**Current Functionality:**
- **Header Section:**
  - 12×12px unit sprite (top-left corner)
  - Colored unit name (green for player, red for enemy) with 2px gap after sprite
  - Primary/Secondary class line (format: "Fighter/Mage" or just "Fighter" if no secondary)
  - Action Timer in top-right corner (adaptive: "ACTION TIMER" or "AT" + clock icon based on space)
  - Action Timer value in orange (#ffa500), right-aligned, format: "XX/100"
- **View Toggle:** "View Abilities" / "Back" button switches between stats view and abilities view
- **Stats View (Two Columns with 8px gap, 4px spacing after classes):**
  - Left column (5 stats): HP, P.Pow, M.Pow, Move, Courage
  - Right column (5 stats): MP, P.Evd, M.Evd, Speed, Attunement
  - Each column: 67px width (50% of available space minus 4px for gap)
  - Labels left-aligned at column start, values right-aligned at column end
  - HP/MP show current/max format (e.g., "45/50")
  - All other stats show single value (e.g., "12")
- **Abilities View:**
  - Shows Primary/Secondary class abilities (up to 8 slots total)
  - Shows equipment slots: Weapon (2), Offhand (2), Headgear (2), Body (2), Accessory (2)
  - Empty slots display as "-"
  - Hovering over filled ability/equipment slots triggers detail panel in bottom panel
- **Detail Panel Integration:**
  - Hover over ability → shows AbilityInfoContent in bottom panel
  - Hover over equipment → shows EquipmentInfoContent in bottom panel
  - Original bottom panel content temporarily replaced during hover
  - Content restored when mouse leaves hovered item
  - Hover result format: `{ type: 'ability-detail' | 'equipment-detail', item: CombatAbility | Equipment }`
- **Layout Details:**
  - Panel size: 144px × 108px (12 tiles × 9 tiles)
  - Uses 7px-04b03 font with 8px line spacing
  - 1px padding around edges
  - Title and color dynamically updated via updateUnit()
**State Management:**
- Cached in CombatLayoutManager (per GeneralGuidelines.md)
- updateUnit() preserves instance, updates displayed unit
- Supports hover interactions for stat tooltips
- Caches region dimensions for accurate hit detection and bounds checking
- View state: currentView ('stats' | 'abilities')
- Button bounds tracking for toggle button hover/click
**Hover Feature:**
- Yellow highlighting (HOVERED_TEXT #ffff00) for hovered stats and Action Timer
- Helper text displayed below stats grid on hover with 2px spacing
- Automatic text wrapping to fit panel width
- Covers all 10 stats + Action Timer + toggle button with descriptive tooltips
- Helper text color: #888888 (HELPER_TEXT constant from colors.ts)
- Clears hover state when mouse exits panel bounds
**Stat Helper Text:**
- HP: "If HP is reduced to 0 the unit is knocked out"
- MP: "Unit's mana, required for magic based abilities"
- P.Pow: "Physical Power is used to calculate physical damage"
- P.Evd: "Evasion rate vs. Physical Attacks"
- M.Evd: "Evasion rate vs. Magical Attacks"
- M.Pow: "Magic Power is used to calculate magic damage"
- Move: "The number of tiles this unit can move"
- Speed: "Action Timer increases by Speed each turn. Units act when reaching 100."
- Courage: "Courage determines if some abilities succeed"
- Attunement: "Attunement determines if some abilities succeed"
- Action Timer: "Action Timer increases by Speed each turn. Units act when reaching 100."
- View Abilities: "Click to view unit's abilities and equipment"
- Back: "Click to return to stats view"
**Bounds Checking:**
- Validates mouse coordinates are within panel bounds before processing hover
- Prevents highlighting when hovering outside panel region (left, right, top, bottom)
- Clears hover state when mouse exits panel
**Dependencies:** CombatUnit, CombatAbility, Equipment, FontAtlasRenderer, SpriteRenderer, FontRegistry, colors.ts (HELPER_TEXT, HOVERED_TEXT, ITEM_NAME_COLOR)
**Used By:** InfoPanelManager for unit info panels (top and bottom panels during unit-turn phase), CombatLayoutManager (handleTopPanelHover for detail panel integration)

#### `managers/panels/AbilityInfoContent.ts`
**Purpose:** Detail panel for ability information (triggered by hover in UnitInfoContent abilities view)
**Exports:** `AbilityInfoContent`
**Key Methods:** render(), setAbility()
**Current Functionality:**
- Shows centered ability name in orange (#FFA500 / ITEM_NAME_COLOR)
- Displays wrapped ability description in white
- Ephemeral panel (no persistent state)
- Updated via setAbility() when hovering different abilities
- Text wrapping: Breaks on word boundaries to fit panel width
**Layout:**
- Panel size: 144px × 108px (12 tiles × 9 tiles)
- Padding: 1px around edges
- Line spacing: 8px (7px-04b03 font)
- Name: Centered horizontally at top
- Description: 2px spacing after name, wrapped to fit width
**Dependencies:** CombatAbility, FontAtlasRenderer, FontRegistry, colors.ts (ITEM_NAME_COLOR)
**Used By:** CombatLayoutManager (handleTopPanelHover)

#### `managers/panels/EquipmentInfoContent.ts`
**Purpose:** Detail panel for equipment information (triggered by hover in UnitInfoContent abilities view)
**Exports:** `EquipmentInfoContent`
**Key Methods:** render(), setEquipment()
**Current Functionality:**
- Shows centered equipment name in orange (#FFA500 / ITEM_NAME_COLOR)
- Displays two-column stat modifiers grid (only non-zero modifiers and non-1.0 multipliers)
- Format: "+5" for positive modifiers, "-3" for negative, "x1.2" for multipliers
- Future: Wrapped description (Equipment class doesn't have description yet)
- Ephemeral panel (no persistent state)
- Updated via setEquipment() when hovering different equipment
**Stat Display:**
- Shows HP, MP, P.Pow, M.Pow, Speed, Move, P.Evd, M.Evd, Courage, Attunement
- Only displays stats with non-zero modifiers or non-1.0 multipliers
- Two-column layout (same as UnitInfoContent stats grid)
- Labels left-aligned, values right-aligned within columns
**Layout:**
- Panel size: 144px × 108px (12 tiles × 9 tiles)
- Padding: 1px around edges
- Line spacing: 8px (7px-04b03 font)
- Name: Centered horizontally at top
- Stats grid: 2px spacing after name, same two-column layout as UnitInfoContent
- Column gap: 8px between columns
**Dependencies:** Equipment, FontAtlasRenderer, FontRegistry, colors.ts (ITEM_NAME_COLOR)
**Used By:** CombatLayoutManager (handleTopPanelHover)

#### `managers/panels/PartyMembersContent.ts`
**Purpose:** Grid of party member portraits with Enter Combat button
**Exports:** `PartyMembersContent`
**Key Methods:** render(), handleClick(), handleHover(), updateHoveredIndex(), updateDeploymentInfo()
**Dependencies:** CombatUnit, PanelButton, SpriteRenderer
**Used By:** InfoPanelManager during deployment phase

#### `managers/panels/ActionsMenuContent.ts`
**Purpose:** Dynamic action menu for active unit's turn with unit-specific actions
**Exports:** `ActionsMenuContent`, `ActionsMenuConfig`, `ActionButton`
**Key Methods:** render(), handleClick(), handleHover(), setButtonsDisabled(), updateUnit(), buildButtonList()
**Current Functionality:**
- Shows "ACTIONS" title in orange (#ffa500)
- Dynamically generates buttons based on unit's stats, classes, and state
- Action buttons (in order):
  1. Move - "Move this unit up to {X} tiles" (disabled if hasMoved)
  2. Attack - "Perform a basic attack with this unit's weapon"
  3. {Primary Class} - "Perform a {Primary Class} action" (shows unit.unitClass.name)
  4. {Secondary Class} - "Perform a {Secondary Class} action" (conditional, only if unit.secondaryClass exists)
  5. **Reset Move** - "Undo your movement and return to original position" (conditional - only if canResetMove)
  6. Delay - "Take no moves or actions and sets Action Timer to 50" (disabled if hasMoved)
  7. End Turn - "Ends your turn and sets Action Timer to 0"
- Button states: White (enabled), Grey (disabled), Yellow (hovered), **Green (active mode)**
- Helper text displays at bottom of panel on hover with automatic text wrapping
- Disables buttons after click to prevent double-actions
- Re-enabled on phase entry by CombatLayoutManager
- Returns PanelClickResult with `{ type: 'action-selected', actionId: 'move' | 'attack' | 'primary-class' | 'secondary-class' | 'reset-move' | 'delay' | 'end-turn' }`
**State Management Pattern:**
- `updateUnit(unit)` method refreshes button list without losing hover state
- Cached in CombatLayoutManager (per GeneralGuidelines.md)
- Constructor accepts optional unit parameter for flexibility
- `getCurrentUnit()` getter for accessing current unit
**Button Disable Pattern:**
- `setButtonsDisabled(disabled)` method to control button state
- `buttonsDisabled` flag prevents clicks when true
- Called by CombatLayoutManager on unit-turn phase entry to re-enable buttons
**Helper Text Feature:**
- Shows description at bottom of panel when hovering over any button
- Uses wrapText() method to automatically wrap text to fit panel width
- Wraps on word boundaries, multiple lines supported
- Helper text color: #888888 (HELPER_TEXT constant from colors.ts)
- Appears with spacing line after buttons
**Bounds Checking:**
- Validates mouse coordinates are within panel bounds before processing hover
- Prevents highlighting when hovering outside panel region (left, right, top, bottom)
- Clears hover state when mouse exits panel
**Button Layout:**
- Title line: "ACTIONS" (line 0)
- Blank line (line 1)
- Dynamic action buttons (lines 2-7, depending on unit's secondary class)
- Spacing line (after last button)
- Helper text (on hover, wrapped to fit)
- Uses 7px-04b03 font with 8px line spacing
**Future Functionality:**
- Actual execution of Move action with pathfinding
- Actual execution of Attack action with damage calculation
- Actual execution of class actions with ability system integration
- Keyboard shortcuts
- Animation/feedback when button pressed
**Dependencies:** FontAtlasRenderer, FontRegistry, CombatUnit, colors.ts (HELPER_TEXT, ENABLED_TEXT, HOVERED_TEXT, DISABLED_TEXT)
**Used By:** InfoPanelManager (via CombatLayoutManager) for bottom panel during unit-turn phase

#### `managers/panels/EmptyContent.ts`
**Purpose:** Empty panel with optional title
**Exports:** `EmptyContent`
**Key Methods:** render()
**Used By:** InfoPanelManager for empty states

#### `managers/panels/PanelButton.ts`
**Purpose:** Reusable button component with hover/active states
**Exports:** `PanelButton`
**Key Methods:** render(), handleClick(), handleMouseDown(), handleMouseUp(), handleHover()
**Dependencies:** SpriteRenderer, FontAtlasRenderer
**Used By:** PartyMembersContent, other interactive panels

#### `managers/panels/colors.ts`
**Purpose:** Centralized color constants for panel UI elements
**Exports:** Color constants (all hex strings)
**Constants:**
- `HELPER_TEXT` - #888888 (grey) - Helper text in panels
- `ENABLED_TEXT` - #ffffff (white) - Enabled buttons and primary text
- `HOVERED_TEXT` - #ffff00 (yellow) - Hovered buttons
- `DISABLED_TEXT` - #888888 (grey) - Disabled buttons
- `ACTIVE_COLOR` - #00ff00 (green) - Active/selected buttons (e.g., Move in move mode)
- `ITEM_NAME_COLOR` - #FFA500 (orange) - Item names (abilities, equipment) in detail panels
**Usage Pattern:** Import and use constants instead of hardcoding colors
**Used By:** ActionsMenuContent, UnitInfoContent, AbilityInfoContent, EquipmentInfoContent, future panel implementations
**Rationale:** Ensures consistent colors across panels, easy to modify globally

#### `managers/panels/index.ts`
**Purpose:** Re-exports all panel content implementations
**Exports:** All panel content classes (UnitInfoContent, PartyMembersContent, ActionsMenuContent, EmptyContent, AbilityInfoContent, EquipmentInfoContent)
**Used By:** Import convenience for consumers

#### `CombatLogManager.ts`
**Purpose:** Combat log with colored text, sprites, animation, scrolling
**Exports:** `CombatLogManager`, `CombatLogConfig`, `CombatLogJSON`
**Key Methods:** addMessage(), render(), update(), scrollUp/Down(), handleScrollButtonClick(), toJSON(), fromJSON()
**Dependencies:** FontAtlasRenderer, SpriteRenderer
**Used By:** CombatView, phase handlers for logging events, serialization

---

### 5. Deployment System

#### `deployment/DeploymentUI.ts`
**Purpose:** Renders deployment phase UI (header, messages, instructions)
**Exports:** `DeploymentUI`
**Key Methods:** renderPhaseHeader(), renderWaylaidMessage(), renderInstructionMessage()
**Dependencies:** FontAtlasRenderer
**Used By:** DeploymentPhaseHandler

#### `deployment/DeploymentZoneRenderer.ts`
**Purpose:** Renders animated deployment zones with pulsing effects
**Exports:** `DeploymentZoneRenderer`
**Key Methods:** render(), update(), getRequiredSprites()
**Dependencies:** SpriteRenderer
**Used By:** DeploymentPhaseHandler

#### `deployment/UnitDeploymentManager.ts`
**Purpose:** Manages deployment zone selection and UI state
**Exports:** `UnitDeploymentManager`
**Key Methods:** handleTileClick(), getSelectedZoneIndex(), clearSelectedZone()
**Dependencies:** CombatUIStateManager
**Used By:** DeploymentPhaseHandler

---

### 6. Cinematics & Animation

#### `CinematicSequence.ts`
**Purpose:** Interface for cinematic animations and manager
**Exports:** `CinematicSequence`, `CinematicManager`, `CinematicRenderContext`
**Key Methods:** start(), update(), render(), isComplete()
**Implementations:** ScreenFadeInSequence, MapFadeInSequence, TitleFadeInSequence
**Used By:** CombatView for phase transitions and intros

#### `SequenceChain.ts`
**Purpose:** Chains multiple sequences to play sequentially
**Exports:** `SequenceChain`
**Key Methods:** start(), update(), render()
**Dependencies:** CinematicSequence
**Used By:** Complex multi-stage cinematics

#### `SequenceParallel.ts`
**Purpose:** Plays multiple sequences simultaneously
**Exports:** `SequenceParallel`
**Key Methods:** start(), update(), render()
**Dependencies:** CinematicSequence
**Used By:** Parallel animation effects

#### `StaggeredSequenceManager.ts`
**Purpose:** Staggers sequence start times with delays
**Exports:** `StaggeredSequenceManager`
**Key Methods:** start(), update(), render()
**Dependencies:** CinematicSequence
**Used By:** EnemyDeploymentPhaseHandler for enemy fade-ins

#### `ScreenFadeInSequence.ts`
**Purpose:** Full-screen fade from black with easing
**Exports:** `ScreenFadeInSequence`
**Key Methods:** start(), update(), render()
**Used By:** CombatView intro, phase transitions

#### `MapFadeInSequence.ts`
**Purpose:** Map-specific fade-in effect
**Exports:** `MapFadeInSequence`
**Key Methods:** start(), update(), render()
**Used By:** Map reveal cinematics

#### `TitleFadeInSequence.ts`
**Purpose:** Title text fade-in with positioning
**Exports:** `TitleFadeInSequence`
**Key Methods:** start(), update(), render()
**Dependencies:** FontAtlasRenderer
**Used By:** Phase intro titles

#### `MessageFadeInSequence.ts`
**Purpose:** Message text fade-in
**Exports:** `MessageFadeInSequence`
**Key Methods:** start(), update(), render()
**Dependencies:** FontAtlasRenderer
**Used By:** Story messages, notifications

#### `EnemySpriteSequence.ts`
**Purpose:** Dithered fade-in for individual enemy units
**Exports:** `EnemySpriteSequence`
**Key Methods:** start(), update(), render()
**Dependencies:** SpriteRenderer, dither patterns
**Used By:** EnemyDeploymentPhaseHandler

#### `UnitMovementSequence.ts`
**Purpose:** Animates unit moving along a path tile-by-tile
**Exports:** `UnitMovementSequence` class
**Key Methods:** update(deltaTime), getUnitRenderPosition(), getDestination(), getUnit()
**Animation Behavior:**
- Linear interpolation between path positions
- Speed: Configurable (default 0.2s per tile from CombatConstants)
- Stops automatically when reaching final destination
- Does NOT update manifest (caller applies final position)
**Integration Pattern:**
- Phase handler creates sequence at animation start
- Calls `update()` each frame to advance animation
- Renders unit at `getUnitRenderPosition()` in `renderUI()`
- Applies final position when `update()` returns `true`
**Dependencies:** CombatUnit, Position, CombatConstants
**Used By:** UnitTurnPhaseHandler during move action
**Note:** Does NOT implement CinematicSequence (simpler standalone interface)

---

### 7. Unit System

#### `HumanoidUnit.ts`
**Purpose:** Player-controlled party members with classes, equipment, experience
**Exports:** `HumanoidUnit`
**Key Properties:** name, unitClass, secondaryClass, learnedAbilities, equipment
**Dependencies:** UnitClass, Equipment, CombatAbility, CombatUnit
**Used By:** PartyMemberRegistry, combat logic

#### `MonsterUnit.ts`
**Purpose:** Enemy units with fixed stats
**Exports:** `MonsterUnit`
**Key Properties:** name, stats, spriteId
**Dependencies:** UnitClass, CombatUnit
**Used By:** EnemyRegistry, combat logic

#### `UnitClass.ts`
**Purpose:** Character classes with stat modifiers and ability trees
**Exports:** `UnitClass`
**Key Properties:** name, statModifiers, availableAbilities
**Used By:** HumanoidUnit, combat calculations

#### `Equipment.ts`
**Purpose:** Equippable items that modify stats
**Exports:** `Equipment`, `EquipmentSlot`
**Key Properties:** name, slot, statModifiers
**Used By:** HumanoidUnit

#### `CombatAbility.ts`
**Purpose:** Actions, reactions, passives, movements
**Exports:** `CombatAbility`, `AbilityType`, `AbilityEffect`
**Key Properties:** name, type, cost, effects, targetType
**Used By:** CombatUnit implementations, combat action system

#### `CombatEffect.ts`
**Purpose:** Status effects, buffs, debuffs
**Exports:** `CombatEffect`, `EffectType`
**Key Properties:** duration, stat modifications, triggers
**Used By:** CombatAbility, combat state

#### `CombatUnitModifiers.ts`
**Purpose:** Utilities for stat calculations with modifiers
**Exports:** `CombatUnitModifiers`
**Key Methods:** calculateStat(), applyModifiers()
**Used By:** HumanoidUnit, MonsterUnit for stat calculations

---

### 8. Utilities & Predicates

#### `utils/MovementRangeCalculator.ts`
**Purpose:** Calculates reachable tiles for unit movement using flood-fill pathfinding
**Exports:** `MovementRangeCalculator`, `MovementRangeOptions`
**Key Methods:** calculateReachableTiles() (static)
**Algorithm:** BFS flood-fill with orthogonal movement only (4 directions)
**Pathfinding Rules:**
- Checks terrain walkability via CombatMap.isWalkable()
- Can path THROUGH friendly units (same isPlayerControlled value)
- Cannot END movement on occupied tiles (any unit)
- Cannot path through enemy units
**Performance:** O(tiles × movement range) - negligible for 32×18 maps
**Dependencies:** Position, CombatMap, CombatUnitManifest, CombatUnit
**Used By:** UnitTurnPhaseHandler for movement range display

#### `utils/MovementPathfinder.ts`
**Purpose:** Calculates shortest orthogonal paths for unit movement
**Exports:** `MovementPathfinder`, `PathfindingOptions`
**Key Methods:** calculatePath() (static)
**Algorithm:** BFS for shortest path with collision detection
**Pathfinding Rules:**
- Checks terrain walkability via CombatMap.isWalkable()
- Can path THROUGH friendly units (same isPlayerControlled value)
- Cannot END movement on occupied tiles (any unit)
- Cannot path through enemy units
- Returns path excluding start, including destination
**Performance:** O(tiles × movement) - negligible for 32×18 maps
**Dependencies:** Position, CombatMap, CombatUnitManifest, CombatUnit
**Used By:** UnitTurnPhaseHandler for movement animation, PlayerTurnStrategy for path preview

#### `CombatPredicate.ts`
**Purpose:** Victory/defeat condition evaluation
**Exports:** `CombatPredicate`, `CombatPredicateFactory`
**Key Methods:** evaluate(), toJSON(), fromJSON()
**Implementations:** AllEnemiesDefeated, AllAlliesDefeated
**Used By:** CombatEncounter for win/loss checks

#### `config/UISettings.ts`
**Purpose:** UI configuration for display and rendering behavior
**Exports:** `UISettings`, `UISettingsConfig`
**Key Methods:** setIntegerScaling(), setManualScale(), **setMaxFPS()**, resetToDefaults()
**FPS Throttling:** (Debugging feature)
- `setMaxFPS(fps)` - Limit frame rate (0 = unlimited, 1-60 = throttled)
- **Use case**: Slow animation to 1-5 FPS to read console logs and debug state transitions
- **Access**: Browser console: `UISettings.setMaxFPS(5)`
- **Impact**: Zero overhead when set to 0 (default)
**Other Settings:**
- Integer scaling for crisp pixel art
- Manual scale override (1x-5x)
**Used By:** CombatView animation loop, canvas scaling logic

---

### 9. Serialization System

#### `CombatSaveData.ts`
**Purpose:** Top-level serialization module for save/load functionality
**Exports:** `CombatSaveData`, `serializeCombat()`, `deserializeCombat()`
**Key Structure:**
```typescript
{
  version: string;           // Save format version (e.g., "1.0.0")
  timestamp: number;          // Unix timestamp when saved
  combatState: CombatStateJSON;
  combatLog: CombatLogJSON;
  encounterId?: string;       // Optional reference to encounter
}
```
**Serialization Flow:**
1. CombatState → serializeCombatState() → CombatStateJSON
2. CombatUnitManifest → toJSON() → CombatUnitManifestJSON
3. HumanoidUnit/MonsterUnit → toJSON() → HumanoidUnitJSON/MonsterUnitJSON
4. CombatLogManager → toJSON() → CombatLogJSON (messages only, no animation state)
5. All combined into CombatSaveData with version and timestamp

**Deserialization Flow:**
1. Parse JSON → CombatSaveData
2. Validate structure
3. deserializeCombat() → reconstruct CombatState and CombatLogManager
4. CombatUnitManifest.fromJSON() → reconstruct unit instances with WeakMap IDs
5. Storage functions (importCombatFromFile/loadCombatFromLocalStorage) return { combatState, combatLog, encounterId? }
6. CombatView uses encounterId to reload encounter from CombatEncounter registry via getById()

**Dependencies:** CombatState, CombatLogManager, serialization helpers
**Used By:** combatStorage.ts

#### `utils/combatStorage.ts`
**Purpose:** Storage utilities for browser localStorage and file download/upload
**Exports:**
- `saveCombatToLocalStorage()` - Save to browser localStorage
- `loadCombatFromLocalStorage()` - Load from browser localStorage
- `clearCombatFromLocalStorage()` - Clear saved data
- `exportCombatToFile()` - Download JSON file with timestamped filename
- `importCombatFromFile()` - Upload and parse JSON file
- `saveCombatToSlot(slotIndex, ...)` - Save to quick save slot (0-3)
- `loadCombatFromSlot(slotIndex)` - Load from quick save slot
- `getSlotMetadata(slotIndex)` - Get metadata without full load
- `getAllSlotMetadata()` - Get all slot metadata at once
- `clearSlot(slotIndex)` - Clear specific slot
- `SaveSlotMetadata` - Interface for slot metadata

**Quick Save Slots:**
- 4 independent slots (0-3) for fast save/load operations
- Storage keys: `vibedc-combat-slot-0` through `vibedc-combat-slot-3`
- Metadata keys: `vibedc-combat-slot-0-metadata` (for quick display)
- Each slot stores: slotIndex, timestamp, turnNumber, phase, encounterId
- Metadata allows display of slot status without deserializing full save

**File Format:** JSON with 2-space indentation, timestamped filename: `vibedc-combat-save-YYYY-MM-DDTHH-MM-SS.json`

**Error Handling:**
- Validates JSON structure before applying
- Validates slot indices (0-3)
- Returns null/false on failure
- Logs errors to console
- Preserves current state on failed load

**Dependencies:** CombatSaveData module
**Used By:** CombatView Developer Settings panel (Export/Import/Quick Save buttons)

---

## Component Layer

### `components/combat/CombatView.tsx`
**Purpose:** React component coordinating entire combat view
**Exports:** `CombatView` React component
**Key Responsibilities:**
- Canvas management (display + buffer)
- Animation loop (60 FPS)
- State management (useState, useRef, useMemo)
- **Encounter override mechanism** (loaded encounter via loadedEncounterRef)
- Phase handler switching
- Input handling (mouse events, coordinate conversion)
- Renderer orchestration
- Sprite/font loading
- Save/load operations with LoadingView integration
- **Quick save/load UI** in Developer Settings panel (4 slots)

**Encounter Loading Pattern:**
- Props: `encounter: CombatEncounter` (initial encounter from route)
- Ref: `loadedEncounterRef` (overrides prop when loading save)
- Helper: `activeEncounter = loadedEncounterRef.current ?? encounter`
- All rendering and logic uses `activeEncounter` instead of prop
- Enables loading saves from different encounters than currently displayed

**Quick Save/Load UI:**
- Location: Developer Settings panel (top-left, DEV mode only)
- 4 save slots with metadata display
- Each slot shows: "Slot N", status ("Empty" or "Turn X (Phase) - HH:MM")
- Save button (green) - always enabled, saves current combat state
- Load button (blue) - disabled for empty slots, loads with LoadingView transition
- Auto-refreshes metadata after each save
- Uses `slotToLoadRef` to coordinate with `handleLoadReady()` callback
- Displays in error message if load fails

**Dependencies:** Nearly all combat model files, LoadingView, CombatEncounter registry, combatStorage utilities
**Used By:** CombatViewRoute

### `components/combat/LoadingView.tsx`
**Purpose:** Generic loading transition overlay with dithered fade effects
**Exports:** `LoadingView` React component, `LoadingViewProps`, `LoadResult`
**Key Responsibilities:**
- State machine (IDLE → FADE_TO_LOADING → LOADING → FADE_TO_GAME → COMPLETE)
- Canvas snapshot dithering (Bayer 4x4 matrix)
- Async operation coordination via callback chain
- Dismount/remount coordination with parent component
- Error rollback to previous canvas snapshot
**State Machine:**
```
IDLE → (isLoading=true) → FADE_TO_LOADING
  ↓
  [Dither from snapshot to loading screen]
  ↓
  onFadeInComplete() → LOADING
  ↓
  [Call onLoadReady(), await result]
  ↓
  onComplete(result) → FADE_TO_GAME
  ↓
  [Dither to transparent (success) or back to snapshot (error)]
  ↓
  onAnimationComplete() → COMPLETE → IDLE
```
**Dithering Pattern:**
- Uses Bayer 4x4 matrix for ordered dithering
- 4x4 pixel blocks (384x216 = ~5,184 blocks)
- Radial gradient for center-outward effect
- Linear easing (no acceleration curves)
**Timing Constants:**
- FADE_DURATION: 300ms (each transition)
- LOADING_MIN_DURATION: 100ms (minimum wait)
- Total fast load: ~700ms
**Dependencies:** FontAtlasLoader, FontAtlasRenderer
**Used By:** CombatView for save/load operations

### `components/combat/CombatViewRoute.tsx`
**Purpose:** Routing wrapper for CombatView
**Exports:** `CombatViewRoute` React component
**Dependencies:** CombatView, EncounterRegistry
**Used By:** App routing

---

## Data Flow Summary

### Initialization Flow
1. **CombatViewRoute** → loads encounter from registry
2. **CombatView** → creates initial CombatState
3. **SpriteAssetLoader** + **FontAtlasLoader** → load assets
4. **Phase handler** → initialized based on state.phase
5. **CinematicManager** → plays intro sequence

### Render Flow (Every Frame)
1. **CombatView** → animation loop calls renderFrame()
2. **CombatRenderer** → clears canvas, renders map tiles
3. **Phase handler render()** → phase-specific overlays (zones, effects)
4. **CombatRenderer** → renders units from manifest
5. **CombatLayoutManager** → renders all UI panels
6. **TopPanelManager** → delegates to phase's TopPanelRenderer
7. **InfoPanelManager** → delegates to current PanelContent
8. **CombatLogManager** → renders combat log with animations
9. **CinematicManager** → renders active cinematic (if any)
10. **Display buffer** → copied to display canvas

### Input Flow (Mouse Events)
1. **Canvas mouse event** → CombatView handlers
2. **CombatInputHandler** → converts to canvas coordinates
3. **Layout managers** → check if click is on UI (panels, buttons, scroll arrows)
4. **InfoPanelManager** → transforms to panel-relative coords, forwards to PanelContent
5. **CombatMapRenderer** → converts to tile coordinates, notifies registered handlers
6. **Phase handler** → processes phase-specific logic (select zone, deploy unit)
7. **CombatState** → updated with new state
8. **renderFrame()** → called for immediate visual feedback

### Phase Transition Flow
1. **User action** → triggers phase transition (e.g., Enter Combat button)
2. **Phase handler** → returns PhaseEventResult with transitionTo
3. **CombatView** → updates state.phase
4. **useEffect** → detects phase change, creates new phase handler
5. **New phase handler** → initialized, getRequiredSprites() called
6. **CinematicManager** → may play transition sequence
7. **Render loop** → continues with new phase

**CRITICAL:** Phase handlers may also trigger transitions via `update()` return value:
1. **Animation loop** → calls phaseHandlerRef.current.update(combatState, encounter, deltaTime)
2. **Phase handler** → returns new CombatState with different phase (or null if no change)
3. **CombatView** → captures return value: `const updatedState = phaseHandlerRef.current.update(...)`
4. **CombatView** → if updatedState !== null and !== combatState, calls setCombatState(updatedState)
5. **State change** → triggers useEffect, creates new phase handler for the new phase

**Common Bug:** Forgetting to capture and apply the update() return value prevents phase transitions. See GeneralGuidelines.md "Common Pitfalls" section.

### Movement Action Flow
1. **User clicks Move button** → `handleActionSelected('move')`
2. **PlayerTurnStrategy** → `enterMoveMode()`, pre-calculates all paths
3. **Range color changes** → `getMovementRangeColor()` returns green (#00ff00)
4. **User hovers tile** → `updateHoveredPath()`, sets `hoveredMovePath`
5. **Phase handler renders** → Yellow path overlay on green range
6. **User clicks valid tile** → `handleMoveClick(position)`
7. **Strategy sets action** → `pendingAction = { type: 'move', destination }`
8. **Phase handler starts animation** → Creates `UnitMovementSequence`
9. **Unit hidden** → Moved to (-999, -999) in manifest
10. **Each frame** → `movementSequence.update(deltaTime)`, interpolates position
11. **renderUI()** → Renders unit at `getUnitRenderPosition()`
12. **Animation complete** → `completeMoveAnimation()`
13. **Manifest updated** → Unit moved to final position
14. **State flags set** → `hasMoved = true`, `canResetMove = true`
15. **Menu updated** → Move/Delay disabled, Reset Move enabled
16. **Stays in phase** → No auto-advance, waits for next action

### Loading Transition Flow
1. **User action** → triggers load (Import button or Load from LocalStorage button)
2. **CombatView** → `captureCanvasSnapshot()` saves current display canvas
3. **CombatView** → stores file in `fileToImportRef` (if file import) or clears it (if localStorage)
4. **CombatView** → sets `isLoading = true`
5. **LoadingView** → detects `isLoading` change, transitions to FADE_TO_LOADING state
6. **LoadingView** → dithers from snapshot canvas to "Loading..." screen (300ms)
7. **LoadingView** → calls `onFadeInComplete()` when fade completes
8. **CombatView** → sets `showCombatView = false` (dismounts canvas, safe because loading screen is fully visible)
9. **LoadingView** → transitions to LOADING state
10. **LoadingView** → calls `onLoadReady()` async function
11. **CombatView** → checks `fileToImportRef` to determine load source
12. **CombatView** → calls `importCombatFromFile(file)` or `loadCombatFromLocalStorage()`
12a. **CombatView** → if `result.encounterId` exists, calls `CombatEncounter.getById(encounterId)` to load encounter from registry
12b. **CombatView** → stores loaded encounter in `loadedEncounterRef.current` (overrides prop for all combat logic)
12c. **CombatView** → if encounter not found in registry, returns error `LoadResult` and aborts load
12d. **CombatView** → if `result.encounterId` missing (old save format), logs warning and uses original prop `encounter`
13. **CombatView** → reconstructs `CombatLogManager` from JSON, adds messages with Infinity speed (instant)
14. **CombatView** → returns `LoadResult` with `{ success, combatState?, combatLog?, error? }`
15. **LoadingView** → waits minimum 100ms in LOADING state, then calls `onComplete(result)`
16. **CombatView** → if success: applies new `combatState`, copies messages to `combatLogManager`, sets `showCombatView = true`
17. **CombatView** → if error: logs error message, keeps old state, sets `showCombatView = true` (rollback)
18. **LoadingView** → transitions to FADE_TO_GAME state
19. **LoadingView** → if success: dithers to transparent (reveals new canvas beneath)
20. **LoadingView** → if error: dithers back to snapshot canvas (restores old visual state)
21. **LoadingView** → fade completes (300ms), transitions to COMPLETE state
22. **LoadingView** → calls `onAnimationComplete()`
23. **CombatView** → sets `isLoading = false` (completes cycle)
24. **LoadingView** → after short delay, transitions to IDLE state (ready for next load)

**Key Pattern:** Callback chain prevents race conditions. CombatView only resets `isLoading` after LoadingView animation fully completes via `onAnimationComplete()` callback. Using `setTimeout` would cause double animation bug.

**Error Rollback:** If load fails, LoadingView dithers back to canvas snapshot, CombatView keeps old state, user sees smooth transition back to previous state without jarring jump.

---

## Event Handling Architecture

### Type-Safe Event Results
All event handlers use discriminated unions for type safety:
```typescript
PhaseEventResult<TData> → { handled, newState?, logMessage?, data? }
PanelClickResult → { type: 'button'|'party-member'|'unit-selected'... }
```

### Coordinate Systems
1. **Canvas coords** (0-384 width, 0-216 height) → CombatView mouse handlers
2. **Panel-relative coords** (origin at panel top-left) → PanelContent implementations
3. **Tile coords** (0-31 cols, 0-17 rows) → Map logic, deployment zones

### Event Propagation Order
1. Top panel (turn order) → TopPanelManager
2. Combat log scroll buttons → CombatLogManager
3. Map scroll arrows → CombatLayoutManager
4. Info panels → InfoPanelManager → PanelContent
5. Map tiles → CombatMapRenderer → Phase handler

---

## Performance Patterns

### Cached Instances
Per GeneralGuidelines.md, components with state are cached:
- Panel content instances (PartyMembersContent, UnitInfoContent)
- Buttons (PanelButton instances)
- Layout renderers (CombatLayoutManager, HorizontalVerticalLayout)
- Managers (InfoPanelManager, TopPanelManager, CombatLogManager)

### Off-Screen Buffers
- **Combat log static buffer** → renders all messages once, composites with animated message
- **Main buffer canvas** → double buffering for flicker-free rendering

### Animation Optimization
- **Static vs. dynamic separation** → CombatLogManager splits non-animating messages from current animation
- **Viewport culling** → only visible log messages rendered
- **Pre-parsing** → color tags parsed once when message added, not every frame

---

## Key Design Principles

1. **Phase-driven architecture** → CombatPhaseHandler defines behavior per phase
2. **Delegated rendering** → Managers coordinate, content implementations render
3. **Panel-relative coordinates** → All panel content uses relative coords
4. **Type-safe events** → Discriminated unions for all event results
5. **Centralized constants** → CombatConstants for all config values
6. **Sprite/Font renderers only** → Never use ctx.fillText() or direct ctx.drawImage() on sprite sheets
7. **Cache stateful components** → Don't recreate hover/active state components every frame
8. **Separate static from animated** → Optimize by rendering static content once

---

## Extension Points

### Adding a New Phase
1. Create class implementing `CombatPhaseHandler`
2. Implement getRequiredSprites(), render(), update()
3. Optionally provide getTopPanelRenderer(), getInfoPanelContent()
4. Add phase name to CombatPhase type
5. Update CombatView phase switching logic

### Adding Panel Content
1. Implement `PanelContent` interface
2. Use panel-relative coordinates in render()
3. Return PanelClickResult from handleClick()
4. Cache instance in layout manager (don't recreate every frame)

### Adding a Cinematic
1. Implement `CinematicSequence` interface
2. Cache off-screen canvases as instance variables
3. Use CinematicManager.play() to trigger
4. Return true from update() when complete

---

## File Count: 60 Core Files

**Components:** 3 files (CombatView, LoadingView, CombatViewRoute)
**Core State:** 7 files
**Phase Handlers:** 6 files (DeploymentPhaseHandler, EnemyDeploymentPhaseHandler, ActionTimerPhaseHandler, UnitTurnPhaseHandler, PhaseBase, CombatPhaseHandler)
**Turn Strategies:** 3 files (TurnStrategy, PlayerTurnStrategy, EnemyTurnStrategy)
**Rendering:** 2 files
**Layout & UI:** 17 files (ActionsMenuContent, AbilityInfoContent, EquipmentInfoContent, colors.ts, UnitInfoContent, PartyMembersContent, EmptyContent, PanelButton, PanelContent, InfoPanelManager, TopPanelManager, TopPanelRenderer, TurnOrderRenderer, DeploymentHeaderRenderer, CombatLayoutManager, CombatLayoutRenderer, HorizontalVerticalLayout)
**Deployment:** 3 files (DeploymentUI, DeploymentZoneRenderer, UnitDeploymentManager)
**Cinematics:** 8 files
**Unit System:** 7 files
**Utilities:** 2 files (CombatPredicate, MovementRangeCalculator)
**Serialization:** 2 files (CombatSaveData, combatStorage)

---

**End of CombatHierarchy.md**

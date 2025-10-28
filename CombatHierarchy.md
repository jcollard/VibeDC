# Combat System Hierarchy

**Version:** 1.3
**Last Updated:** Tue, Oct 28, 2025 (add-delay-and-endturn branch - Delay/End Turn actions with slide animations)
**Related:** [GeneralGuidelines.md](GeneralGuidelines.md)

## Purpose

This document provides a token-efficient reference for AI agents to quickly understand the combat system architecture. Organized by both directory structure and functionality.

---

## Quick Reference: Common Tasks

- **Add a new combat phase** → Implement `CombatPhaseHandler`, update `CombatView` phase switching
- **Modify rendering** → `CombatRenderer` (maps/units), `CombatLayoutManager` (UI layout)
- **Add movement/pathfinding logic** → `MovementRangeCalculator` utility, phase handler integration
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
**Key Methods:** updatePhase(), getTopPanelRenderer(), getInfoPanelContent(), getActiveUnit(), getTargetedUnit(), handleMapClick(), executeAction()
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
- Gets movement range, target info from strategy
- **Executes Delay and End Turn actions from action menu**
- **Transitions back to action-timer phase with slide animation**
**UI Panels:**
- Top panel: Shows unit name as title (green for players, red for enemies)
- Bottom panel: Shows "ACTIONS" menu with Delay and End Turn buttons
**Rendering:**
- Uses dual-method rendering pattern (render() and renderUI())
- render(): Movement range highlights (yellow tiles) - BEFORE units
- renderUI(): Active unit cursor (green, blinking), target cursor (red, only on different units) - AFTER units
- Cached tinting buffer for color tinting (avoids GC pressure)
- Queries strategy for movement range and target position each frame
**Delay/End Turn Execution Pattern:**
- Captures previousTurnOrder (unit instances) BEFORE mutation
- Defers actionTimer mutation using pendingActionTimerMutation field in CombatState
- Sets pendingSlideAnimation=true flag
- Returns new state with phase='action-timer'
- ActionTimerPhaseHandler applies mutation at start of updatePhase() and triggers slide animation
- Prevents one-frame flash of final state before animation
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
- Execute Move action with pathfinding
- Execute Attack action with damage calculation
- Execute Ability action with ability system integration
**Dependencies:** PhaseBase, TurnOrderRenderer, PlayerTurnStrategy, EnemyTurnStrategy, TurnStrategy
**Used By:** CombatView during unit-turn phase
**Transitions To:** action-timer phase (when Delay/End Turn executed)

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
- Auto-selects active unit on turn start (shows in top panel, displays movement range)
- Calculates movement range on turn start using MovementRangeCalculator
- Handles map clicks to select units
- Shows selected unit info in panel with unit name as title (green for players)
- Recalculates movement range for selected unit
- Returns null from update() (waits for player action menu in future)
**Future Functionality:**
- Show action menu when clicking active unit
- Return appropriate TurnAction when player confirms action
- Handle ability selection and targeting
- Show valid target indicators on hover
**State Tracking:**
- activeUnit, activePosition: The unit whose turn it is
- targetedUnit, targetedPosition: Currently selected unit (for inspection)
- movementRange: Yellow highlight tiles showing where unit can move
- currentState: Reference to CombatState for calculations
**Dependencies:** MovementRangeCalculator
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
**Key Methods:** renderLayout(), getMapViewport(), get[Panel]Region(), handleMapScrollClick()
**Panel Content Logic:**
- Deployment phase: PartyMembersContent (bottom panel)
- Enemy-deployment phase: EmptyContent (bottom panel)
- Unit-turn phase: ActionsMenuContent (bottom panel) with buttons re-enabled, UnitInfoContent with unit name/color (top panel)
- Other phases: UnitInfoContent (if unit available), EmptyContent (if no unit)
**Button State Management:**
- Calls `setButtonsDisabled(false)` on ActionsMenuContent when entering unit-turn phase
- Ensures buttons are clickable after previous turn's action completed
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
**Key Methods:** setContent(), render(), handleClick(), handleHover(), handleMouseDown()
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
- "Action Timers" title in orange (7px-04b03 font) at top of panel
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
**Purpose:** Interface for info panel content with event handling
**Exports:** `PanelContent`, `PanelRegion`, `PanelClickResult`
**Key Methods:** render(), handleClick(), handleHover(), handleMouseDown()
**Implementations:** UnitInfoContent, PartyMembersContent, ActionsMenuContent, EmptyContent
**Used By:** InfoPanelManager

#### `managers/panels/UnitInfoContent.ts`
**Purpose:** Displays unit stats, health, mana, abilities
**Exports:** `UnitInfoContent`
**Key Methods:** render(), updateUnit(unit, title?, titleColor?)
**Current Functionality:**
- Shows unit name as panel title (color-coded: green for players, red for enemies)
- Displays class, HP, MP, Speed, Movement stats
- Title and color can be dynamically updated via updateUnit()
**Dependencies:** CombatUnit, FontAtlasRenderer
**Used By:** InfoPanelManager for unit info panels (top panel during unit-turn phase)

#### `managers/panels/PartyMembersContent.ts`
**Purpose:** Grid of party member portraits with Enter Combat button
**Exports:** `PartyMembersContent`
**Key Methods:** render(), handleClick(), handleHover(), updateHoveredIndex(), updateDeploymentInfo()
**Dependencies:** CombatUnit, PanelButton, SpriteRenderer
**Used By:** InfoPanelManager during deployment phase

#### `managers/panels/ActionsMenuContent.ts`
**Purpose:** Action menu for active unit's turn with Delay and End Turn actions
**Exports:** `ActionsMenuContent`, `ActionsMenuConfig`, `ActionButton`
**Key Methods:** render(), handleClick(), handleHover(), setButtonsDisabled()
**Current Functionality:**
- Shows "ACTIONS" title in white
- Displays "Delay" button (sets actionTimer to 50)
- Displays "End Turn" button (sets actionTimer to 0)
- Button states: White (enabled), Grey (disabled), Yellow (hovered)
- Disables buttons after click to prevent double-actions
- Re-enabled on phase entry by CombatLayoutManager
- Returns PanelClickResult with `{ type: 'action-selected', actionId: 'delay' | 'end-turn' }`
**Button Disable Pattern:**
- `setButtonsDisabled(disabled)` method to control button state
- `buttonsDisabled` flag prevents clicks when true
- Called by CombatLayoutManager on unit-turn phase entry to re-enable buttons
**Button Layout:**
- Title line: "ACTIONS" (line 0)
- Blank line (line 1)
- "Delay" button (line 2)
- "End Turn" button (line 3)
- Uses 7px-04b03 font with 8px line spacing
**Future Functionality:**
- Move action with pathfinding
- Attack action with target selection
- Ability action with ability menu
- Keyboard shortcuts
- Button tooltips explaining actions
- Animation/feedback when button pressed
**Dependencies:** FontAtlasRenderer
**Used By:** InfoPanelManager for bottom panel during unit-turn phase

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

#### `managers/panels/index.ts`
**Purpose:** Re-exports all panel content implementations
**Exports:** All panel content classes
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

#### `CombatPredicate.ts`
**Purpose:** Victory/defeat condition evaluation
**Exports:** `CombatPredicate`, `CombatPredicateFactory`
**Key Methods:** evaluate(), toJSON(), fromJSON()
**Implementations:** AllEnemiesDefeated, AllAlliesDefeated
**Used By:** CombatEncounter for win/loss checks

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

## File Count: 57 Core Files

**Components:** 3 files (CombatView, LoadingView, CombatViewRoute)
**Core State:** 7 files
**Phase Handlers:** 6 files (DeploymentPhaseHandler, EnemyDeploymentPhaseHandler, ActionTimerPhaseHandler, UnitTurnPhaseHandler, PhaseBase, CombatPhaseHandler)
**Turn Strategies:** 3 files (TurnStrategy, PlayerTurnStrategy, EnemyTurnStrategy)
**Rendering:** 2 files
**Layout & UI:** 14 files (added ActionsMenuContent)
**Deployment:** 3 files (DeploymentUI, DeploymentZoneRenderer, UnitDeploymentManager)
**Cinematics:** 8 files
**Unit System:** 7 files
**Utilities:** 2 files (CombatPredicate, MovementRangeCalculator)
**Serialization:** 2 files (CombatSaveData, combatStorage)

---

**End of CombatHierarchy.md**

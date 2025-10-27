# Combat System Hierarchy

**Version:** 1.0
**Last Updated:** 2025-10-27
**Related:** [GeneralGuidelines.md](GeneralGuidelines.md)

## Purpose

This document provides a token-efficient reference for AI agents to quickly understand the combat system architecture. Organized by both directory structure and functionality.

---

## Quick Reference: Common Tasks

- **Add a new combat phase** → Implement `CombatPhaseHandler`, update `CombatView` phase switching
- **Modify rendering** → `CombatRenderer` (maps/units), `CombatLayoutManager` (UI layout)
- **Add deployment zone logic** → `DeploymentPhaseHandler`, `DeploymentZoneRenderer`
- **Change turn order display** → `TurnOrderRenderer`, `TopPanelManager`
- **Add info panel content** → Implement `PanelContent` interface
- **Modify combat log** → `CombatLogManager`
- **Add cinematic sequence** → Implement `CinematicSequence`, use `CinematicManager`
- **Modify map scrolling** → `CombatMapRenderer` (offset calculations), `CombatLayoutManager` (arrow rendering)

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
**Key Fields:** turnNumber, map, phase, unitManifest, tilesetId
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
**Key Properties:** name, health, mana, speed, turnGauge, spriteId, abilities
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
**Key Sections:** CANVAS, UI, TEXT, COMBAT_LOG, ENEMY_DEPLOYMENT
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
**Key Methods:** getRequiredSprites(), render(), update(), handle[Event]()
**Implementations:** DeploymentPhaseHandler, EnemyDeploymentPhaseHandler
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
**Dependencies:** DeploymentUI, DeploymentZoneRenderer, UnitDeploymentManager, PartySelectionDialog
**Used By:** CombatView during deployment phase

#### `EnemyDeploymentPhaseHandler.ts`
**Purpose:** Enemy fade-in animation phase with staggered dither effects
**Exports:** `EnemyDeploymentPhaseHandler`
**Key Methods:** initialize(), buildEnemyApproachMessage()
**Dependencies:** EnemySpriteSequence, StaggeredSequenceManager, EnemyRegistry
**Used By:** CombatView during enemy-deployment phase
**Transitions To:** battle phase

#### `BattlePhaseHandler.ts`
**Purpose:** Turn-based combat phase (STUB IMPLEMENTATION)
**Exports:** `BattlePhaseHandler`, `BattleInfoPanelContent`
**Key Methods:** getTopPanelRenderer(), getInfoPanelContent(), handleMapClick(), handleMouseMove(), updatePhase()
**Current Functionality:**
- Displays battlefield (map + units)
- Shows turn order by Speed (highest first) in top panel
- Placeholder info panel with "Battle Phase" text
- Mouse event logging
- Victory/defeat condition checking (stubbed)
**Future Functionality:**
- Turn management system
- Action menu (Attack, Ability, Move, Wait, etc.)
- Movement/attack range display
- Action targeting and execution
- Status effects
- AI enemy turns
**Dependencies:** PhaseBase, TurnOrderRenderer, CombatEncounter
**Used By:** CombatView during battle phase
**Transitions To:** victory phase, defeat phase (when implemented)

---

### 3. Rendering System

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
**Dependencies:** HorizontalVerticalLayout, InfoPanelManager, panel content implementations
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
**Purpose:** Renders initiative order with clickable unit portraits
**Exports:** `TurnOrderRenderer`
**Key Methods:** render(), handleClick()
**Dependencies:** CombatUnit, SpriteRenderer, FontAtlasRenderer
**Used By:** TopPanelManager during battle phase

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
**Implementations:** UnitInfoContent, PartyMembersContent, EmptyContent
**Used By:** InfoPanelManager

#### `managers/panels/UnitInfoContent.ts`
**Purpose:** Displays unit stats, health, mana, abilities
**Exports:** `UnitInfoContent`
**Key Methods:** render(), updateUnit()
**Dependencies:** CombatUnit, FontAtlasRenderer
**Used By:** InfoPanelManager for unit info panels

#### `managers/panels/PartyMembersContent.ts`
**Purpose:** Grid of party member portraits with Enter Combat button
**Exports:** `PartyMembersContent`
**Key Methods:** render(), handleClick(), handleHover(), updateHoveredIndex(), updateDeploymentInfo()
**Dependencies:** CombatUnit, PanelButton, SpriteRenderer
**Used By:** InfoPanelManager during deployment phase

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

#### `deployment/PartySelectionDialog.ts`
**Purpose:** Character selection dialog with hover/click handling (legacy - now uses info panels)
**Exports:** `PartySelectionDialog`
**Key Methods:** render(), handleCharacterClick(), handleMouseMove()
**Dependencies:** SpriteRenderer, FontAtlasRenderer, DialogRenderer
**Used By:** DeploymentPhaseHandler (legacy support)

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

**File Format:** JSON with 2-space indentation, timestamped filename: `vibedc-combat-save-YYYY-MM-DDTHH-MM-SS.json`

**Error Handling:**
- Validates JSON structure before applying
- Returns null/false on failure
- Logs errors to console
- Preserves current state on failed load

**Dependencies:** CombatSaveData module
**Used By:** CombatView Developer Settings panel (Export/Import buttons)

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

**Encounter Loading Pattern:**
- Props: `encounter: CombatEncounter` (initial encounter from route)
- Ref: `loadedEncounterRef` (overrides prop when loading save)
- Helper: `activeEncounter = loadedEncounterRef.current ?? encounter`
- All rendering and logic uses `activeEncounter` instead of prop
- Enables loading saves from different encounters than currently displayed

**Dependencies:** Nearly all combat model files, LoadingView, CombatEncounter registry
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

## File Count: 53+ Core Files

**Components:** 3 files (CombatView, LoadingView, CombatViewRoute)
**Core State:** 7 files
**Phase Handlers:** 5 files (DeploymentPhaseHandler, EnemyDeploymentPhaseHandler, BattlePhaseHandler, PhaseBase, CombatPhaseHandler)
**Rendering:** 2 files
**Layout & UI:** 13 files
**Deployment:** 4 files
**Cinematics:** 8 files
**Unit System:** 7 files
**Utilities:** 1 file
**Serialization:** 2 files (CombatSaveData, combatStorage)

---

**End of CombatHierarchy.md**

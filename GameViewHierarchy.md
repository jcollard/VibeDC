# GameView System Hierarchy

**Version:** 1.0
**Last Updated:** Sat, Nov 01, 2025 (Initial creation - GameView orchestrator, view transitions, save/load)
**Related:** [GDD/GameView/GameViewFeatureOverview.md](GDD/GameView/GameViewFeatureOverview.md), [GDD/GameView/GameViewImplementationPlan.md](GDD/GameView/GameViewImplementationPlan.md), [CombatHierarchy.md](CombatHierarchy.md), [FirstPersonViewHierarchy.md](FirstPersonViewHierarchy.md), [GeneralGuidelines.md](GeneralGuidelines.md)

## Purpose

Token-efficient reference for AI agents to understand the GameView orchestrator system. Top-level component managing view transitions (exploration ↔ combat), persistent game state, and save/load functionality.

## How AI Agents Should Use This Document

**⚠️ IMPORTANT: Do NOT read this entire file upfront.**

This document is a **reference**, not a preamble. Reading it completely wastes tokens.

### Recommended Usage Pattern:

#### 1. **Start with Quick Reference** (below)
Read ONLY the Quick Reference section first.

#### 2. **Read Targeted Sections**
Use Navigation Index to find specific sections:
- View transitions → Read `#### ViewTransitionManager.ts` only
- Save/load → Read `#### GameSaveManager.ts` only
- State structure → Read `#### GameState.ts` only

#### 3. **Use Search (Ctrl+F)**
Search for file names or keywords (e.g., "transition", "serialize", "orchestrator")

#### 4. **Read Data Flow ONLY if confused**
If unclear how pieces connect, read `## Data Flow Summary`

### What NOT to Do:
- ❌ Don't read all sections before starting work
- ❌ Don't include entire file in every conversation
- ❌ Don't read sections unrelated to current task

### Token Budget Guidance:
- **Quick lookup**: Quick Reference only (~100 tokens)
- **Single file work**: Quick Reference + 1 section (~1,500 tokens)
- **Feature work**: Quick Reference + 2-3 sections (~3,000 tokens)
- **Only as last resort**: Read entire file (~8,000 tokens)

---

## Navigation Index

### By Task Type:
- **View transitions** → `#### ViewTransitionManager.ts`, `#### GameView.tsx`
- **Save/load** → `#### GameSaveManager.ts`, `#### GameStateSerialization.ts`
- **State management** → `#### GameState.ts`, `#### GameView.tsx`
- **Resource caching** → `#### ResourceManager.ts`
- **Exploration integration** → `#### FirstPersonView.tsx` (FirstPersonViewHierarchy.md)
- **Combat integration** → `#### CombatView.tsx` (CombatHierarchy.md)

### By Component Type:
- **Main Orchestrator** → `### 1. Main Component`
- **State Models** → `### 2. State Models`
- **Services** → `### 3. Services`
- **Integration Points** → `### 4. Integration Points`

---

## Quick Reference: Common Tasks

- **Initialize game** → `<GameView initialMapId="dungeon-1" />`, orchestrates all views
- **Transition to combat** → GameView monitors `onStartCombat` callback from FirstPersonView
- **Exit combat** → GameView monitors `onCombatEnd` callback from CombatView
- **Save game** → `GameSaveManager.saveToSlot(state, slotIndex)`, includes version metadata
- **Load game** → `GameSaveManager.loadFromSlot(slotIndex)`, validates version
- **Serialize state** → `serializeCompleteGameState(state)`, handles Maps/Sets/Dates
- **Deserialize state** → `deserializeCompleteGameState(json)`, restores object instances
- **Fade transition** → `ViewTransitionManager.fadeOut/fadeIn()`, async/await chains
- **Get view state** → `gameState.currentView` ('exploration' | 'combat')

---

## Directory Structure

```
react-app/src/
├── components/game/
│   └── GameView.tsx               # Main orchestrator component
├── models/game/
│   ├── GameState.ts               # State type definitions
│   └── GameStateSerialization.ts  # Serialization logic
└── services/
    ├── GameSaveManager.ts         # Save/load operations
    ├── ResourceManager.ts         # Sprite/font caching
    └── ViewTransitionManager.ts   # Fade transitions
```

---

## File Hierarchy by Category

### 1. Main Component

Located in: `react-app/src/components/game/`

#### `GameView.tsx`
**Purpose:** Top-level orchestrator managing view transitions and persistent game state
**Lines:** 500+ lines
**Props:**
```typescript
{
  initialMapId: string;           // Starting exploration map
  autoLoadSave?: boolean;         // Auto-load from quick save slot
  onGameReady?: () => void;       // Callback when initialization complete
}
```
**State:**
- `gameState: CompleteGameState` - Complete game state (exploration, combat, party, event state)
- `isTransitioning: boolean` - Flag to block input during transitions
- `resourcesLoaded: boolean` - Sprite/font loading complete

**Key Features:**
- **View Orchestration:** Renders FirstPersonView OR CombatView based on currentView
- **Persistent State:** Maintains exploration state across combat transitions
- **Save/Load System:** Quick save (F5), quick load (F9), slot-based saves
- **Fade Transitions:** Smooth fade-out → switch view → fade-in animations
- **Resource Management:** Shared ResourceManager for sprites/fonts
- **Bidirectional Communication:** Syncs state between child views and orchestrator

**View Transition Flow:**
1. User triggers combat (StartEncounter event action)
2. FirstPersonView calls `onStartCombat(encounterId)` callback
3. GameView calls `transitionToCombat(encounterId)`
4. Fade out exploration view (500ms)
5. Switch currentView to 'combat', set combatState
6. Fade in combat view (500ms)
7. CombatView renders with encounter

**Combat Exit Flow:**
1. Player wins/loses combat (Continue/Skip button)
2. CombatView sets `shouldEndCombat` flag
3. CombatView calls `onCombatEnd(victory)` callback
4. GameView calls `transitionToExploration()`
5. Fade out combat view (500ms)
6. Switch currentView to 'exploration', clear combatState
7. Fade in exploration view (500ms)
8. FirstPersonView renders with saved exploration state

**Save/Load Hotkeys:**
- F5: Quick save to slot 0
- F9: Quick load from slot 0
- Saves include: currentView, explorationState, combatState, partyState, eventState, playtime

**State Synchronization:**
- FirstPersonView → `onExplorationStateChange(state)` → Updates gameState.explorationState
- Ensures exploration progress persists across combat encounters
- Position, direction, explored tiles maintained

**Resource Sharing:**
- Creates single ResourceManager instance (cached in useMemo)
- Passes to FirstPersonView for sprite/font loading
- Avoids duplicate resource loading across views

**Dependencies:** CompleteGameState, FirstPersonView, CombatView, GameSaveManager, ViewTransitionManager, ResourceManager, CombatEncounterRegistry, AreaMapRegistry
**Used By:** App.tsx (main route), /dev/test/:mapId route

---

### 2. State Models

Located in: `react-app/src/models/game/`

#### `GameState.ts`
**Purpose:** Type definitions for complete game state
**Exports:** `CompleteGameState`, `ExplorationState`, `PartyState`
**Key Interfaces:**

**CompleteGameState:**
```typescript
{
  currentView: 'exploration' | 'combat';
  explorationState: ExplorationState;
  combatState?: CombatState;        // Only present when in combat
  partyState: PartyState;
  eventState: EventGameState;
  totalPlaytime: number;            // Milliseconds
  saveSlotInfo?: SaveSlotInfo;
}
```

**ExplorationState:**
```typescript
{
  currentMapId: string;
  playerPosition: { x: number; y: number };
  playerDirection: CardinalDirection;
  exploredTiles: Set<string>;       // Format: "x,y"
  targetedObject: {                 // Simplified for serialization
    type: 'door' | 'chest' | 'npc' | 'sign';
    position: { x: number; y: number };
  } | null;
}
```

**PartyState:**
```typescript
{
  members: CombatUnit[];            // Party members
  inventory: {
    items: Array<{ itemId: string; quantity: number }>;
    gold: number;
  };
  equipment: Map<string, Equipment>; // unitId → equipped items
}
```

**SaveSlotInfo:**
```typescript
{
  slotIndex: number;
  savedAt: Date;
  playtime: number;
}
```

**Design Patterns:**
- Immutable state updates (React patterns)
- Discriminated union for currentView
- Transient fields NOT serialized (like CombatState.shouldEndCombat)
- Type-safe serialization with JSON interfaces

**Dependencies:** CombatState, EventGameState (from EventPrecondition), CombatUnit, CardinalDirection
**Used By:** GameView, GameSaveManager, GameStateSerialization

#### `GameStateSerialization.ts`
**Purpose:** Serialization/deserialization for CompleteGameState
**Lines:** 224 lines
**Exports:** `serializeCompleteGameState()`, `deserializeCompleteGameState()`, JSON type interfaces
**Key Functions:**

**serializeCompleteGameState(state):**
- Converts CompleteGameState → JSON-serializable object
- Handles Maps → Array<[key, value]>
- Handles Sets → Array
- Handles Dates → ISO strings
- Leverages existing serialization (CombatState.toJSON(), CombatUnit.toJSON())
- Returns CompleteGameStateJSON

**deserializeCompleteGameState(json):**
- Converts JSON → CompleteGameState with object instances
- Restores Maps from arrays
- Restores Sets from arrays
- Restores Dates from ISO strings
- Validates required fields
- Returns null on error (with console.error)

**Subsystem Serializers:**
- `serializeExplorationState()` / `deserializeExplorationState()`
- `serializePartyState()` / `deserializePartyState()` (TODO: CombatUnit deserialization)
- `serializeEventGameState()` / `deserializeEventGameState()`
- `serializeSaveSlotInfo()` / `deserializeSaveSlotInfo()`

**Known Limitations (Phase 4 work):**
- Party member deserialization incomplete (CombatUnit.fromJSON() not implemented)
- Currently stores JSON as `any[]` with console warning
- Equipment and inventory serialize/deserialize correctly

**Error Handling:**
- Try-catch around all deserialization
- Console.error with descriptive messages
- Returns null on failure (caller handles gracefully)

**Dependencies:** CompleteGameState, CombatState serialization, EventGameState
**Used By:** GameSaveManager

---

### 3. Services

Located in: `react-app/src/services/`

#### `GameSaveManager.ts`
**Purpose:** Save/load operations for game state using localStorage
**Lines:** 220 lines
**Exports:** `GameSaveManager` (static class), `SaveSlotMetadata`
**Key Methods:**

**saveToSlot(state, slotIndex):**
- Updates state with saveSlotInfo (slot, timestamp, playtime)
- Serializes using `serializeCompleteGameState()`
- Wraps with version metadata: `{ version: '1.0', savedAt, state }`
- Saves to localStorage key: `vibedc_save_${slotIndex}`
- Returns boolean success/failure

**loadFromSlot(slotIndex):**
- Loads JSON from localStorage
- **Validates version** (blocks incompatible saves)
- Deserializes using `deserializeCompleteGameState()`
- Returns CompleteGameState | null

**Version Validation:**
```typescript
if (!saveData.version || saveData.version !== '1.0') {
  console.error('Incompatible save version');
  return null;
}
```

**getSaveSlotMetadata(slotIndex):**
- Lightweight metadata extraction (no full deserialization)
- Returns: slotIndex, savedAt, playtime, currentView, currentMapId
- Handles both new versioned format and legacy format
- Used for displaying slot status in UI

**Quick Save/Load:**
- `quickSave(state)`: Saves to slot 0
- `quickLoad()`: Loads from slot 0
- Mapped to F5/F9 hotkeys in GameView

**Slot Management:**
- `hasSave(slotIndex)`: Check if slot has data
- `deleteSave(slotIndex)`: Remove save from slot
- `getAllSaveSlots()`: Get metadata for all 10 slots
- `clearAllSaves()`: Debug helper

**Constants:**
- MAX_SAVE_SLOTS: 10 (slots 0-9)
- QUICK_SAVE_SLOT: 0
- SAVE_KEY_PREFIX: 'vibedc_save_'

**Dependencies:** CompleteGameState, GameStateSerialization
**Used By:** GameView

#### `ResourceManager.ts`
**Purpose:** Centralized sprite and font loading/caching
**Lines:** 64 lines
**Exports:** `ResourceManager` (class)
**Key Methods:**

**loadSprites():**
- Calls `SpriteRegistry.loadAllSprites()`
- Waits for all sprite sheets to load
- Returns Promise<void>

**loadFonts():**
- Calls `FontAtlasRegistry.loadAllFonts()`
- Waits for all font atlases to load
- Returns Promise<void>

**loadAll():**
- Loads sprites and fonts in parallel
- `await Promise.all([loadSprites(), loadFonts()])`
- Returns Promise<void>

**Usage Pattern:**
```typescript
const resourceManager = useMemo(() => new ResourceManager(), []);

useEffect(() => {
  resourceManager.loadAll().then(() => {
    setResourcesLoaded(true);
  });
}, [resourceManager]);
```

**Design:**
- Thin wrapper around existing registries
- Provides unified loading interface
- Single instance shared across views
- Prevents duplicate resource loading

**Dependencies:** SpriteRegistry, FontAtlasRegistry
**Used By:** GameView, FirstPersonView (via props)

#### `ViewTransitionManager.ts`
**Purpose:** Manages fade-in/fade-out transitions between views
**Lines:** 115 lines
**Exports:** `ViewTransitionManager` (class)
**Key Methods:**

**fadeOut(canvas, duration):**
- Fades canvas to black using dithered overlay
- Duration in milliseconds (default: 500ms)
- Returns Promise<void> (resolves when complete)
- Uses requestAnimationFrame for smooth animation

**fadeIn(canvas, duration):**
- Fades from black to transparent
- Duration in milliseconds (default: 500ms)
- Returns Promise<void> (resolves when complete)
- Reveals underlying view content

**Dithered Fade Effect:**
- Uses ordered dithering pattern (Bayer matrix)
- Pixel-art friendly (no smooth gradients)
- Alpha values: 0 → 0.25 → 0.5 → 0.75 → 1.0

**Async/Await Usage:**
```typescript
await viewTransitionManager.fadeOut(canvasRef.current, 500);
setCurrentView('combat'); // Switch view while black
await viewTransitionManager.fadeIn(canvasRef.current, 500);
```

**Sequential Callbacks:**
```typescript
// Fade out, then switch view
viewTransitionManager.fadeOut(canvas, 500).then(() => {
  setCurrentView('combat');
  return viewTransitionManager.fadeIn(canvas, 500);
}).then(() => {
  console.log('Transition complete');
});
```

**Design:**
- Promise-based for async/await chains
- Stateless (no internal state between calls)
- Single instance cached in useMemo
- Works with any canvas element

**Dependencies:** None (pure canvas API)
**Used By:** GameView

---

### 4. Integration Points

#### GameView ↔ FirstPersonView

**Props Passed to FirstPersonView:**
```typescript
<FirstPersonView
  mapId={explorationState.currentMapId}
  onStartCombat={transitionToCombat}
  onExplorationStateChange={handleExplorationStateChange}
  resourceManager={resourceManager}
  initialState={explorationState}
  gameState={eventState}
/>
```

**Callbacks:**
- `onStartCombat(encounterId)`: FirstPersonView triggers combat encounter
- `onExplorationStateChange(state)`: FirstPersonView syncs position/direction/explored tiles

**State Flow:**
1. GameView initializes FirstPersonView with explorationState
2. Player moves/explores in FirstPersonView
3. FirstPersonView calls onExplorationStateChange(newState)
4. GameView updates gameState.explorationState
5. State persists across combat transitions

#### GameView ↔ CombatView

**Props Passed to CombatView:**
```typescript
<CombatView
  encounter={encounter}
  onCombatEnd={handleCombatEnd}
/>
```

**Callbacks:**
- `onCombatEnd(victory: boolean)`: CombatView signals combat completion

**State Flow:**
1. GameView loads encounter from CombatEncounterRegistry
2. CombatView manages internal CombatState
3. Player wins/loses combat
4. VictoryPhaseHandler or DefeatPhaseHandler sets shouldEndCombat flag
5. CombatView detects flag, calls onCombatEnd(victory)
6. GameView transitions back to exploration

**Combat State Persistence:**
- CombatState stored in gameState.combatState while in combat
- Cleared when transitioning back to exploration
- Save/load preserves mid-combat state (not yet implemented - Phase 4)

#### GameView ↔ Save/Load System

**Save Flow:**
1. User presses F5 (quick save)
2. GameView calls `GameSaveManager.saveToSlot(gameState, 0)`
3. GameSaveManager serializes state with version metadata
4. JSON saved to localStorage

**Load Flow:**
1. User presses F9 (quick load)
2. GameView calls `GameSaveManager.loadFromSlot(0)`
3. GameSaveManager validates version, deserializes state
4. GameView sets gameState to loaded state
5. Views re-render with loaded state

**Version Compatibility:**
- Save format v1.0: `{ version: '1.0', savedAt, state }`
- Load validates version before deserializing
- Incompatible versions rejected with clear error message
- Future versions can implement migration logic

---

## Data Flow Summary

```
App.tsx
  ↓
GameView (orchestrator)
  ↓
┌──────────────────────────────────────────────────────────┐
│ Resource Loading                                         │
│ - ResourceManager.loadAll()                              │
│ - Sprites + Fonts cached globally                        │
└──────────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────────┐
│ View Rendering (based on currentView)                   │
│                                                          │
│ IF currentView === 'exploration':                        │
│   FirstPersonView                                        │
│     - Loads AreaMap from registry                        │
│     - Initializes from explorationState                  │
│     - Processes input (WASD, QE, Space)                  │
│     - Processes events (EventProcessor)                  │
│     - Calls onStartCombat → GameView.transitionToCombat  │
│     - Calls onExplorationStateChange → GameView updates  │
│                                                          │
│ IF currentView === 'combat':                             │
│   CombatView                                             │
│     - Loads CombatEncounter from registry                │
│     - Manages CombatState internally                     │
│     - Processes combat phases                            │
│     - Victory/Defeat sets shouldEndCombat flag           │
│     - Calls onCombatEnd → GameView.transitionToExploration│
└──────────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────────┐
│ View Transitions                                         │
│ - ViewTransitionManager.fadeOut(500ms)                   │
│ - Switch currentView state                               │
│ - ViewTransitionManager.fadeIn(500ms)                    │
└──────────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────────┐
│ Save/Load System                                         │
│ - F5: GameSaveManager.saveToSlot(gameState, 0)           │
│ - F9: GameSaveManager.loadFromSlot(0)                    │
│ - GameStateSerialization handles Maps/Sets/Dates         │
│ - Version validation prevents incompatible loads         │
└──────────────────────────────────────────────────────────┘
```

---

## Key Patterns Summary

### Orchestrator Pattern
```typescript
// GameView manages child view lifecycle
{currentView === 'exploration' && <FirstPersonView {...props} />}
{currentView === 'combat' && <CombatView {...props} />}
```

### Bidirectional State Sync
```typescript
// Child → Parent via callbacks
<FirstPersonView onExplorationStateChange={updateState} />

// Parent → Child via props
<FirstPersonView initialState={explorationState} />
```

### Async Transition Chain
```typescript
await viewTransitionManager.fadeOut(canvas, 500);
setCurrentView('combat');
setCombatState(createCombatState(encounter));
await viewTransitionManager.fadeIn(canvas, 500);
```

### Immutable State Updates
```typescript
setGameState(prev => ({
  ...prev,
  explorationState: {
    ...prev.explorationState,
    playerPosition: newPosition,
  },
}));
```

### Resource Caching
```typescript
const resourceManager = useMemo(() => new ResourceManager(), []);
const transitionManager = useMemo(() => new ViewTransitionManager(), []);
```

### Version-Safe Persistence
```typescript
// Save
const saveData = {
  version: '1.0',
  savedAt: new Date().toISOString(),
  state: serializeCompleteGameState(state),
};

// Load with validation
if (!saveData.version || saveData.version !== '1.0') {
  console.error('Incompatible save version');
  return null;
}
```

---

## Guidelines Compliance

### ✅ Immutable State Updates
```typescript
// Always return new objects
setGameState(prev => ({ ...prev, currentView: 'combat' }));
```

### ✅ Resource Caching (useMemo)
```typescript
const resourceManager = useMemo(() => new ResourceManager(), []);
```

### ✅ Async/Await Chains
```typescript
await fadeOut(canvas, 500);
updateState();
await fadeIn(canvas, 500);
```

### ✅ Type Safety
```typescript
currentView: 'exploration' | 'combat';  // Discriminated union
```

### ✅ Error Handling
```typescript
try {
  const state = deserialize(json);
  if (!state) return null;
} catch (error) {
  console.error('Deserialization failed:', error);
  return null;
}
```

### ✅ Version Validation
```typescript
// Prevent crashes from incompatible saves
if (saveData.version !== '1.0') return null;
```

---

## Known Limitations (Phase 4+ Work)

### Party State Persistence (Phase 4)
- CombatUnit deserialization not fully implemented
- Party members stored as `any[]` with warning
- Equipment and inventory work correctly
- TODO: Implement CombatUnit.fromJSON()

### Event State Persistence (Phase 5)
- Event state saves/loads correctly
- globalVariables, triggeredEventIds, messageLog persist
- Integration with FirstPersonView complete
- No known issues

### Mid-Combat Saves (Future)
- Combat state serialization works
- GameView can save/load mid-combat
- Not yet exposed in UI (deliberate design choice)
- Can be enabled in Phase 6+ if desired

### Playtime Tracking (Phase 6)
- totalPlaytime field exists in state
- Not yet incremented (always 0)
- TODO: Add timer to GameView useEffect

---

## Success Criteria

✅ GameView orchestrates FirstPersonView and CombatView
✅ Smooth fade transitions between views (500ms)
✅ Exploration state persists across combat encounters
✅ Quick save (F5) and quick load (F9) work
✅ Version validation prevents incompatible loads
✅ StartEncounter event triggers combat transition
✅ Victory/Defeat Continue/Skip buttons return to exploration
✅ Resource loading shared across views (no duplicates)
✅ All state updates immutable (React best practices)
✅ Error handling with clear console messages

---

**End of GameView System Hierarchy**

For detailed implementation, see:
- [GameViewFeatureOverview.md](GDD/GameView/GameViewFeatureOverview.md)
- [GameViewImplementationPlan.md](GDD/GameView/GameViewImplementationPlan.md)
- [CombatHierarchy.md](CombatHierarchy.md) (for CombatView integration)
- [FirstPersonViewHierarchy.md](FirstPersonViewHierarchy.md) (for FirstPersonView integration)

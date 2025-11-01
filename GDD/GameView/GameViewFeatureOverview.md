# GameView Feature Overview

**Version:** 1.0
**Created:** 2025-01-31
**Related:**
- [FirstPersonView AreaMap System](../FirstPersonView/AreaMap/AreaMapSystemOverview.md)
- [CombatView System](../../CombatHierarchy.md)
- [Event System](../FirstPersonView/AreaMap/EventSystemOverview.md)

---

## Purpose

The **GameView** component serves as the top-level game orchestrator that manages transitions between different game views (exploration, combat, menus), maintains persistent game state across views, and coordinates shared resources (sprites, fonts, audio). It acts as the single source of truth for the entire game state, enabling seamless save/load functionality and providing a unified interface for state management across all game systems.

---

## Feature Summary

- **Unified Game State Management**: Maintains a single `GameState` object that persists across all views
- **View Transition System**: Handles smooth transitions between FirstPersonView, CombatView, and future views
- **Resource Caching**: Centralizes loading and caching of sprites, fonts, and other assets to avoid redundant loads
- **Save/Load System**: Provides comprehensive save/load functionality that captures the entire game state
- **Event-Driven Architecture**: Responds to game events (combat start, victory, defeat, teleport) to trigger view transitions
- **Single Route Deployment**: Designed to run at a single endpoint for itch.io deployment (no routing required)
- **Canvas Management**: Coordinates canvas rendering across different views with consistent dimensions
- **Party State Persistence**: Maintains party member state (HP, status effects, inventory) across exploration and combat
- **Global Variables System**: Tracks quest progress, flags, and other persistent data using the event system

---

## Core Requirements

### 1. GameView Component Interface

The GameView component serves as the root component and manages all game views:

```typescript
/**
 * GameView - Top-level game orchestrator
 * Manages view transitions, persistent state, and shared resources
 */
interface GameViewProps {
  /**
   * Initial map ID to load (for starting a new game)
   * If not provided, will attempt to load from save
   */
  initialMapId?: string;

  /**
   * Whether to automatically attempt to load saved game on mount
   * @default true
   */
  autoLoadSave?: boolean;

  /**
   * Callback when game is ready to start
   * Used for initial loading screen transitions
   */
  onGameReady?: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  initialMapId = 'map-001-entrance',
  autoLoadSave = true,
  onGameReady
}) => {
  // Implementation details below
};
```

### 2. Game State Structure

The complete game state that persists across all views:

```typescript
/**
 * Complete game state - represents the entire game session
 * This structure is serializable for save/load functionality
 */
export interface CompleteGameState {
  /**
   * Which view is currently active
   */
  currentView: GameViewType;

  /**
   * Exploration state (FirstPersonView)
   * Only present when currentView is 'exploration'
   */
  explorationState?: ExplorationState;

  /**
   * Combat state (CombatView)
   * Only present when currentView is 'combat'
   */
  combatState?: CombatState;

  /**
   * Party state that persists across views
   */
  partyState: PartyState;

  /**
   * Global game variables (quest flags, story progress, etc.)
   * Managed by event system
   */
  globalVariables: Map<string, number | string | boolean>;

  /**
   * Triggered event IDs (events that have already fired)
   * Used by event system to prevent re-triggering
   */
  triggeredEventIds: Set<string>;

  /**
   * Message log visible to player
   * Includes both exploration and combat messages
   */
  messageLog: GameMessage[];

  /**
   * Current save slot metadata (if loaded from slot)
   */
  saveSlotInfo?: {
    slotIndex: number;
    savedAt: Date;
    playtime: number; // seconds
  };

  /**
   * Session start time for playtime tracking
   */
  sessionStartTime: number;

  /**
   * Total accumulated playtime (seconds)
   * Updated when saving
   */
  totalPlaytime: number;
}

/**
 * Game view types
 */
export type GameViewType =
  | 'exploration'  // FirstPersonView (dungeon exploration)
  | 'combat'       // CombatView (tactical combat)
  | 'menu'         // Future: Main menu, inventory, character sheet
  | 'loading';     // Loading screen during transitions

/**
 * Exploration state (FirstPersonView)
 */
export interface ExplorationState {
  /**
   * Current map ID
   */
  currentMapId: string;

  /**
   * Player position on current map
   */
  playerPosition: { x: number; y: number };

  /**
   * Player facing direction
   */
  playerDirection: 'North' | 'South' | 'East' | 'West';

  /**
   * Explored tiles on current map (for minimap)
   * Format: "x,y" string keys
   */
  exploredTiles: Set<string>;

  /**
   * Targeted object in first-person view (for interaction)
   */
  targetedObject: {
    type: 'door' | 'chest' | 'npc' | 'sign';
    position: { x: number; y: number };
  } | null;
}

/**
 * Party state that persists across all views
 */
export interface PartyState {
  /**
   * Party members (max 4)
   * Includes current HP, status effects, equipment, etc.
   */
  members: PartyMember[];

  /**
   * Party inventory (items, gold, etc.)
   */
  inventory: {
    items: InventoryItem[];
    gold: number;
  };

  /**
   * Equipped items per party member
   */
  equipment: Map<string, EquippedItems>; // Key: party member ID
}

/**
 * Game message for message log
 */
export interface GameMessage {
  /**
   * Message text
   */
  text: string;

  /**
   * Message timestamp
   */
  timestamp: number;

  /**
   * Message source (exploration, combat, system)
   */
  source: 'exploration' | 'combat' | 'system';

  /**
   * Optional text color for colored messages
   */
  color?: string;
}

/**
 * Inventory item
 */
export interface InventoryItem {
  /**
   * Item ID (from ItemRegistry)
   */
  itemId: string;

  /**
   * Stack quantity
   */
  quantity: number;
}

/**
 * Equipped items for a party member
 */
export interface EquippedItems {
  weapon?: string;     // Item ID
  armor?: string;      // Item ID
  accessory1?: string; // Item ID
  accessory2?: string; // Item ID
}
```

### 3. Resource Manager

Centralized resource loading and caching:

```typescript
/**
 * ResourceManager - Manages loading and caching of game assets
 * Shared across all views to avoid redundant loading
 */
export class ResourceManager {
  /**
   * Sprite loader instance (shared)
   */
  private spriteLoader: SpriteAssetLoader;

  /**
   * Font loader instance (shared)
   */
  private fontLoader: FontAtlasLoader;

  /**
   * Loaded sprite sheets (cached)
   * Key: sprite sheet path
   */
  private spriteSheets: Map<string, HTMLImageElement>;

  /**
   * Loaded font atlases (cached)
   * Key: font ID
   */
  private fontAtlases: Map<string, HTMLImageElement>;

  /**
   * Loading state
   */
  private isLoading: boolean;

  /**
   * Initialize the resource manager
   */
  constructor() {
    this.spriteLoader = new SpriteAssetLoader();
    this.fontLoader = new FontAtlasLoader();
    this.spriteSheets = new Map();
    this.fontAtlases = new Map();
    this.isLoading = false;
  }

  /**
   * Load all fonts used across the game
   * This should be called once during initial load
   */
  async loadFonts(): Promise<void> {
    if (this.fontAtlases.size > 0) {
      return; // Already loaded
    }

    const fontIds = FontRegistry.getAllIds();
    await this.fontLoader.loadAll(fontIds);

    // Cache all loaded fonts
    fontIds.forEach(fontId => {
      const fontAtlas = this.fontLoader.get(fontId);
      if (fontAtlas) {
        this.fontAtlases.set(fontId, fontAtlas);
      }
    });
  }

  /**
   * Load sprites for a specific view
   * Caches sprites to avoid redundant loading
   */
  async loadSpritesForView(
    view: 'exploration' | 'combat',
    state: ExplorationState | CombatState
  ): Promise<Map<string, HTMLImageElement>> {
    // Implementation will delegate to SpriteAssetLoader
    // and cache results in this.spriteSheets
    // Returns cached sprites if already loaded
    return this.spriteSheets;
  }

  /**
   * Get a loaded font atlas
   */
  getFontAtlas(fontId: string): HTMLImageElement | null {
    return this.fontAtlases.get(fontId) || null;
  }

  /**
   * Get all loaded sprite sheets
   */
  getSpriteSheets(): Map<string, HTMLImageElement> {
    return this.spriteSheets;
  }

  /**
   * Check if resources are currently loading
   */
  isLoadingResources(): boolean {
    return this.isLoading;
  }
}
```

### 4. View Transition System

Handles transitions between different views:

```typescript
/**
 * View transition manager
 * Handles smooth transitions between game views
 */
export class ViewTransitionManager {
  /**
   * Current transition state
   */
  private transitionState: TransitionState;

  /**
   * Transition callbacks
   */
  private onTransitionComplete?: () => void;

  constructor() {
    this.transitionState = { type: 'none' };
  }

  /**
   * Start a transition to a new view
   */
  startTransition(
    from: GameViewType,
    to: GameViewType,
    options?: TransitionOptions
  ): void {
    this.transitionState = {
      type: 'active',
      from,
      to,
      startTime: performance.now(),
      duration: options?.duration ?? 500, // Default 500ms
      effect: options?.effect ?? 'fade', // Default fade transition
    };
  }

  /**
   * Update transition animation
   * Returns current progress (0-1)
   */
  update(deltaTime: number): number {
    if (this.transitionState.type !== 'active') {
      return 1; // No transition
    }

    const elapsed = performance.now() - this.transitionState.startTime;
    const progress = Math.min(elapsed / this.transitionState.duration, 1);

    if (progress >= 1) {
      this.transitionState = { type: 'none' };
      this.onTransitionComplete?.();
    }

    return progress;
  }

  /**
   * Check if transition is active
   */
  isTransitioning(): boolean {
    return this.transitionState.type === 'active';
  }

  /**
   * Get current transition effect
   */
  getCurrentTransition(): TransitionState {
    return this.transitionState;
  }
}

/**
 * Transition state
 */
export type TransitionState =
  | { type: 'none' }
  | {
      type: 'active';
      from: GameViewType;
      to: GameViewType;
      startTime: number;
      duration: number;
      effect: 'fade' | 'slide' | 'instant';
    };

/**
 * Transition options
 */
export interface TransitionOptions {
  duration?: number;
  effect?: 'fade' | 'slide' | 'instant';
  onComplete?: () => void;
}
```

### 5. Save/Load System

Complete save/load functionality:

```typescript
/**
 * Save/load manager for complete game state
 */
export class GameSaveManager {
  /**
   * Save game state to localStorage
   */
  static saveToLocalStorage(
    state: CompleteGameState,
    slotIndex: number = 0
  ): boolean {
    try {
      const saveData: GameSaveData = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        state: this.serializeGameState(state),
      };

      const key = `vibedc_save_slot_${slotIndex}`;
      localStorage.setItem(key, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('[GameSaveManager] Save failed:', error);
      return false;
    }
  }

  /**
   * Load game state from localStorage
   */
  static loadFromLocalStorage(slotIndex: number = 0): CompleteGameState | null {
    try {
      const key = `vibedc_save_slot_${slotIndex}`;
      const data = localStorage.getItem(key);
      if (!data) return null;

      const saveData: GameSaveData = JSON.parse(data);
      return this.deserializeGameState(saveData.state);
    } catch (error) {
      console.error('[GameSaveManager] Load failed:', error);
      return null;
    }
  }

  /**
   * Export game state to file
   */
  static exportToFile(state: CompleteGameState): void {
    const saveData: GameSaveData = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      state: this.serializeGameState(state),
    };

    const blob = new Blob([JSON.stringify(saveData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibedc_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import game state from file
   */
  static async importFromFile(file: File): Promise<CompleteGameState | null> {
    try {
      const text = await file.text();
      const saveData: GameSaveData = JSON.parse(text);
      return this.deserializeGameState(saveData.state);
    } catch (error) {
      console.error('[GameSaveManager] Import failed:', error);
      return null;
    }
  }

  /**
   * Serialize game state to JSON
   */
  private static serializeGameState(state: CompleteGameState): any {
    return {
      currentView: state.currentView,
      explorationState: state.explorationState ? {
        currentMapId: state.explorationState.currentMapId,
        playerPosition: state.explorationState.playerPosition,
        playerDirection: state.explorationState.playerDirection,
        exploredTiles: Array.from(state.explorationState.exploredTiles),
        targetedObject: state.explorationState.targetedObject,
      } : undefined,
      combatState: state.combatState ? CombatState.toJSON(state.combatState) : undefined,
      partyState: this.serializePartyState(state.partyState),
      globalVariables: Array.from(state.globalVariables.entries()),
      triggeredEventIds: Array.from(state.triggeredEventIds),
      messageLog: state.messageLog,
      saveSlotInfo: state.saveSlotInfo,
      sessionStartTime: state.sessionStartTime,
      totalPlaytime: state.totalPlaytime,
    };
  }

  /**
   * Deserialize game state from JSON
   */
  private static deserializeGameState(data: any): CompleteGameState {
    return {
      currentView: data.currentView,
      explorationState: data.explorationState ? {
        currentMapId: data.explorationState.currentMapId,
        playerPosition: data.explorationState.playerPosition,
        playerDirection: data.explorationState.playerDirection,
        exploredTiles: new Set(data.explorationState.exploredTiles),
        targetedObject: data.explorationState.targetedObject,
      } : undefined,
      combatState: data.combatState ? CombatState.fromJSON(data.combatState) : undefined,
      partyState: this.deserializePartyState(data.partyState),
      globalVariables: new Map(data.globalVariables),
      triggeredEventIds: new Set(data.triggeredEventIds),
      messageLog: data.messageLog,
      saveSlotInfo: data.saveSlotInfo,
      sessionStartTime: data.sessionStartTime,
      totalPlaytime: data.totalPlaytime,
    };
  }

  /**
   * Serialize party state
   */
  private static serializePartyState(party: PartyState): any {
    return {
      members: party.members.map(m => m.toJSON()),
      inventory: party.inventory,
      equipment: Array.from(party.equipment.entries()),
    };
  }

  /**
   * Deserialize party state
   */
  private static deserializePartyState(data: any): PartyState {
    return {
      members: data.members.map((m: any) => PartyMember.fromJSON(m)),
      inventory: data.inventory,
      equipment: new Map(data.equipment),
    };
  }
}

/**
 * Save data format
 */
export interface GameSaveData {
  version: string;
  savedAt: string;
  state: any; // Serialized CompleteGameState
}
```

---

## Visual Presentation

The GameView component itself has no visual UI - it acts as an orchestrator that renders child views. However, it manages:

### 1. Canvas Container

All views render to a canvas with consistent dimensions:
- **Canvas Width**: 384 pixels (from `CombatConstants.CANVAS_WIDTH`)
- **Canvas Height**: 216 pixels (from `CombatConstants.CANVAS_HEIGHT`)
- **Aspect Ratio**: 16:9 (maintained across all views)
- **Scaling**: Integer scaling based on `UISettings` (consistent across views)
- **Background**: `#0a0a0a` (black background around canvas)

### 2. View Transition Effects

During view transitions:

#### Fade Transition (Default)
- **Duration**: 500ms
- **Effect**: Cross-fade between views
- **Opacity**: Smoothly interpolate from 0 to 1 using ease-in-out
- **Background**: Black (`#000000`)

#### Slide Transition
- **Duration**: 400ms
- **Effect**: Slide new view in from right
- **Easing**: Ease-out curve
- **Background**: Black (`#000000`)

#### Instant Transition
- **Duration**: 0ms
- **Effect**: Immediate switch
- **Use Case**: Loading screen to game

### 3. Loading Screen (Future)

When transitioning between views:
- **Background**: Black (`#000000`)
- **Loading Text**: "Loading..." in `7px-04b03` font
- **Text Color**: White (`#ffffff`)
- **Position**: Centered on screen
- **Optional**: Spinner animation

---

## Technical Details

### 1. GameView Component Implementation

```typescript
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CompleteGameState, GameViewType } from './GameState';
import { ResourceManager } from './ResourceManager';
import { ViewTransitionManager } from './ViewTransitionManager';
import { GameSaveManager } from './GameSaveManager';
import { FirstPersonView } from '../firstperson/FirstPersonView';
import { CombatView } from '../combat/CombatView';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { CombatEncounter } from '../../models/combat/CombatEncounter';

export const GameView: React.FC<GameViewProps> = ({
  initialMapId = 'map-001-entrance',
  autoLoadSave = true,
  onGameReady,
}) => {
  // Resource manager (shared across views)
  const resourceManager = useMemo(() => new ResourceManager(), []);

  // Transition manager
  const transitionManager = useMemo(() => new ViewTransitionManager(), []);

  // Initialize game state
  const [gameState, setGameState] = useState<CompleteGameState>(() => {
    // Try to load saved game if enabled
    if (autoLoadSave) {
      const savedState = GameSaveManager.loadFromLocalStorage(0);
      if (savedState) {
        console.log('[GameView] Loaded saved game');
        return savedState;
      }
    }

    // Create new game state
    console.log('[GameView] Starting new game');
    return createNewGameState(initialMapId);
  });

  // Track if resources are loaded
  const [resourcesLoaded, setResourcesLoaded] = useState(false);

  // Load fonts once on mount
  useEffect(() => {
    const loadResources = async () => {
      await resourceManager.loadFonts();
      setResourcesLoaded(true);
      onGameReady?.();
    };

    loadResources().catch(console.error);
  }, [resourceManager, onGameReady]);

  // Handle combat start event from FirstPersonView
  const handleStartCombat = useCallback((encounterId: string) => {
    console.log('[GameView] Starting combat:', encounterId);

    const encounter = CombatEncounter.getById(encounterId);
    if (!encounter) {
      console.error(`[GameView] Encounter '${encounterId}' not found`);
      return;
    }

    // Transition to combat view
    transitionManager.startTransition('exploration', 'combat', {
      duration: 500,
      effect: 'fade',
    });

    // Update game state
    setGameState(prev => ({
      ...prev,
      currentView: 'combat',
      combatState: {
        turnNumber: 0,
        map: encounter.map,
        tilesetId: encounter.tilesetId || 'default',
        phase: 'deployment',
        unitManifest: new CombatUnitManifest(),
      },
    }));
  }, [transitionManager]);

  // Handle combat end event from CombatView
  const handleCombatEnd = useCallback((victory: boolean) => {
    console.log('[GameView] Combat ended:', victory ? 'Victory' : 'Defeat');

    if (!gameState.explorationState) {
      console.error('[GameView] No exploration state to return to');
      return;
    }

    // Transition back to exploration
    transitionManager.startTransition('combat', 'exploration', {
      duration: 500,
      effect: 'fade',
    });

    // Update game state
    setGameState(prev => ({
      ...prev,
      currentView: 'exploration',
      combatState: undefined, // Clear combat state
    }));
  }, [gameState.explorationState, transitionManager]);

  // Handle save game (F5 key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        console.log('[GameView] Quick save');
        GameSaveManager.saveToLocalStorage(gameState, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Render current view
  if (!resourcesLoaded) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'monospace',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#0a0a0a',
    }}>
      {gameState.currentView === 'exploration' && gameState.explorationState && (
        <FirstPersonView
          mapId={gameState.explorationState.currentMapId}
          onStartCombat={handleStartCombat}
          resourceManager={resourceManager}
        />
      )}

      {gameState.currentView === 'combat' && gameState.combatState && (
        <CombatView
          combatState={gameState.combatState}
          onCombatEnd={handleCombatEnd}
          resourceManager={resourceManager}
        />
      )}
    </div>
  );
};

/**
 * Create a new game state for starting a fresh game
 */
function createNewGameState(initialMapId: string): CompleteGameState {
  const map = AreaMapRegistry.getById(initialMapId);
  if (!map) {
    throw new Error(`[GameView] Map '${initialMapId}' not found`);
  }

  // Create default party (load all party members from registry)
  const partyMembers = PartyMemberRegistry.getAll()
    .map(member => PartyMemberRegistry.createPartyMember(member.id))
    .filter((unit): unit is PartyMember => unit !== undefined);

  return {
    currentView: 'exploration',
    explorationState: {
      currentMapId: initialMapId,
      playerPosition: { x: map.playerSpawn.x, y: map.playerSpawn.y },
      playerDirection: map.playerSpawn.direction,
      exploredTiles: new Set([`${map.playerSpawn.x},${map.playerSpawn.y}`]),
      targetedObject: null,
    },
    partyState: {
      members: partyMembers,
      inventory: {
        items: [],
        gold: 0,
      },
      equipment: new Map(),
    },
    globalVariables: new Map(),
    triggeredEventIds: new Set(),
    messageLog: [],
    sessionStartTime: Date.now(),
    totalPlaytime: 0,
  };
}
```

### 2. FirstPersonView Integration

FirstPersonView needs to be updated to accept props from GameView:

```typescript
interface FirstPersonViewProps {
  mapId: string;

  /**
   * Callback when combat encounter is triggered
   */
  onStartCombat: (encounterId: string) => void;

  /**
   * Shared resource manager from GameView
   */
  resourceManager: ResourceManager;

  /**
   * Optional: Initial exploration state (for loading saves)
   */
  initialState?: ExplorationState;
}
```

### 3. CombatView Integration

CombatView needs to be updated to accept props from GameView:

```typescript
interface CombatViewProps {
  /**
   * Initial combat state (from GameView)
   */
  combatState: CombatState;

  /**
   * Callback when combat ends
   */
  onCombatEnd: (victory: boolean) => void;

  /**
   * Shared resource manager from GameView
   */
  resourceManager: ResourceManager;
}
```

### 4. Event System Integration

The event system (from FirstPersonView) can trigger combat via the `StartEncounter` action:

```typescript
// In EventProcessor.ts (FirstPersonView)
case 'StartEncounter': {
  const encounter = action.encounterId;

  // Notify GameView to transition to combat
  if (this.onStartCombat) {
    this.onStartCombat(encounter);
  }

  // Update game state
  newState.combatState = {
    active: true,
    encounterId: encounter,
  };
  break;
}
```

This requires adding a callback to EventProcessor:

```typescript
export class EventProcessor {
  private onStartCombat?: (encounterId: string) => void;

  /**
   * Set callback for combat start
   */
  setOnStartCombat(callback: (encounterId: string) => void): void {
    this.onStartCombat = callback;
  }
}
```

---

## Implementation Strategy

### Phase 1: Core GameView Structure (4 hours)

**Objectives:**
- Create `GameView` component
- Define `CompleteGameState` interface
- Implement basic view switching (exploration ↔ combat)
- Create `ResourceManager` for shared resources

**Steps:**

1. **Create GameState interfaces**
   - `models/game/GameState.ts` - Define all state interfaces
   - Include TypeScript interfaces from Core Requirements section
   - Add JSDoc comments

2. **Create ResourceManager**
   - `services/ResourceManager.ts` - Centralized resource management
   - Implement font loading (shared across views)
   - Implement sprite caching
   - Use existing `SpriteAssetLoader` and `FontAtlasLoader`

3. **Create GameView component**
   - `components/game/GameView.tsx` - Main orchestrator
   - Initialize with new game state
   - Render FirstPersonView or CombatView based on state
   - Pass `ResourceManager` to child views

4. **Update FirstPersonView**
   - Add `onStartCombat` prop
   - Add `resourceManager` prop
   - Remove internal font/sprite loading (use ResourceManager)

5. **Update CombatView**
   - Add `onCombatEnd` prop
   - Add `resourceManager` prop
   - Remove internal font/sprite loading (use ResourceManager)

**Testing:**
- [ ] GameView renders FirstPersonView on mount
- [ ] Can manually switch to CombatView by changing state
- [ ] ResourceManager loads fonts once (not per view)
- [ ] Both views share the same font atlases

**Validation Command:**
```bash
npm test -- GameView.test.ts
```

---

### Phase 2: View Transitions (3 hours)

**Objectives:**
- Implement `ViewTransitionManager`
- Add fade transitions between views
- Handle loading states during transitions

**Steps:**

1. **Create ViewTransitionManager**
   - `services/ViewTransitionManager.ts`
   - Implement transition state machine
   - Support fade, slide, instant transitions
   - Provide progress tracking for animations

2. **Add transition rendering to GameView**
   - Render overlay during transitions
   - Interpolate opacity for fade effect
   - Handle view mounting/unmounting during transition

3. **Connect FirstPersonView to transitions**
   - Call `onStartCombat` when event system triggers combat
   - GameView handles transition to CombatView

4. **Connect CombatView to transitions**
   - Call `onCombatEnd` when victory/defeat occurs
   - GameView handles transition back to FirstPersonView

**Testing:**
- [ ] Fade transition works when entering combat
- [ ] Fade transition works when returning to exploration
- [ ] No visual glitches during transition
- [ ] Input is blocked during transition

**Validation Command:**
```bash
npm run dev
# Manually trigger combat encounter
# Verify smooth fade transition
```

---

### Phase 3: Save/Load System (5 hours)

**Objectives:**
- Implement `GameSaveManager`
- Add serialization for all state types
- Support localStorage and file export/import

**Steps:**

1. **Create GameSaveManager**
   - `services/GameSaveManager.ts`
   - Implement `saveToLocalStorage`
   - Implement `loadFromLocalStorage`
   - Implement `exportToFile`
   - Implement `importFromFile`

2. **Add serialization methods**
   - Serialize `CompleteGameState` to JSON
   - Deserialize JSON to `CompleteGameState`
   - Handle Maps, Sets, and Date objects
   - Handle party member state (HP, status effects, etc.)

3. **Add auto-load on GameView mount**
   - Check localStorage for saved game
   - Load if present, otherwise start new game
   - Show loading screen during load

4. **Add quick save (F5 key)**
   - Add keyboard handler in GameView
   - Save to slot 0 on F5 press
   - Show save confirmation (future: toast notification)

5. **Update PartyMember for serialization**
   - Add `toJSON()` method
   - Add `fromJSON()` static method
   - Ensure all fields are serializable

**Testing:**
- [ ] Can save game state to localStorage
- [ ] Can load game state from localStorage
- [ ] Loaded state restores exploration position
- [ ] Loaded state restores party HP/status
- [ ] F5 quick save works
- [ ] Can export save to file
- [ ] Can import save from file

**Validation Commands:**
```bash
# Save game
# Refresh browser
# Game loads from save

# Export save file
# Clear localStorage
# Import save file
# Game state restored
```

---

### Phase 4: Party State Persistence (4 hours)

**Objectives:**
- Ensure party state persists across view transitions
- Update party HP/status after combat
- Sync party state between exploration and combat

**Steps:**

1. **Update FirstPersonView to use party state**
   - Accept `partyState` prop from GameView
   - Display party member stats using `partyState.members`
   - Update `gameState.partyState` when needed (future: healing items)

2. **Update CombatView to use party state**
   - Initialize combat units from `partyState.members`
   - Copy HP, status effects, equipment from party state
   - Update party state after combat ends

3. **Add party state sync on combat end**
   - Copy unit HP back to `partyState.members`
   - Copy status effects, equipment changes
   - Handle knocked out units

4. **Update event system for party changes**
   - Support `ModifyPartyHP` action (future)
   - Support `AddPartyMember` action (future)
   - Support `RemovePartyMember` action (future)

**Testing:**
- [ ] Party HP persists from exploration to combat
- [ ] Party HP updates after combat ends
- [ ] Knocked out units remain knocked out in exploration
- [ ] Equipment changes persist across views

**Validation:**
```bash
# Start exploration with 100 HP
# Enter combat
# Take damage to 50 HP
# Win combat
# Return to exploration
# Verify HP is 50 in exploration view
```

---

### Phase 5: Global Variables & Event Integration (3 hours)

**Objectives:**
- Integrate global variables with event system
- Persist triggered events across views
- Support quest flags and story progress

**Steps:**

1. **Update EventProcessor to use GameView state**
   - Accept `globalVariables` from GameView
   - Accept `triggeredEventIds` from GameView
   - Return updated state after processing events

2. **Add global variable actions**
   - Support `SetVariable` action
   - Support `IncrementVariable` action
   - Support conditional events based on variables

3. **Update GameView to pass event state**
   - Pass `globalVariables` to FirstPersonView
   - Pass `triggeredEventIds` to FirstPersonView
   - Update state when events are processed

4. **Add event state serialization**
   - Serialize `Map<string, any>` to array
   - Serialize `Set<string>` to array
   - Deserialize on load

**Testing:**
- [ ] Global variables persist across view transitions
- [ ] Triggered events don't re-trigger after save/load
- [ ] Quest flags work correctly
- [ ] Conditional events evaluate correctly

**Validation:**
```bash
# Trigger event that sets flag "door_opened"
# Save game
# Load game
# Verify event doesn't re-trigger
```

---

### Phase 6: Polish & Error Handling (2 hours)

**Objectives:**
- Add error handling for save/load failures
- Add loading screen for view transitions
- Add developer tools for state inspection

**Steps:**

1. **Add error handling**
   - Catch save/load errors
   - Display error messages to user
   - Fallback to new game if load fails

2. **Add loading screen component**
   - Show "Loading..." during initial resource load
   - Show during save/load operations
   - Use consistent styling with game

3. **Add developer tools**
   - Expose `getGameState()` to window (dev mode only)
   - Expose `setGameState()` to window (dev mode only)
   - Add debug logging for state changes

4. **Add playtime tracking**
   - Track session start time
   - Update total playtime on save
   - Display playtime in save slot metadata

**Testing:**
- [ ] Error handling works for corrupted saves
- [ ] Loading screen appears during initial load
- [ ] Developer tools work in dev mode
- [ ] Playtime tracks correctly

**Validation:**
```bash
# Corrupt a save file in localStorage
# Attempt to load
# Verify error message and fallback to new game

# Open browser console
# Call window.getGameState()
# Verify state is logged
```

---

## Edge Cases & Considerations

### 1. Save/Load Edge Cases

- **Corrupted Save Data**: Gracefully handle invalid JSON or missing fields. Fall back to new game.
- **Version Mismatch**: Add version field to save data. Migrate old saves if needed.
- **Missing Resources**: If a saved map/encounter no longer exists, show error and prevent load.
- **Browser Storage Limits**: localStorage has ~5-10MB limit. Monitor save size and warn user.
- **Multiple Tabs**: If game is open in multiple tabs, saves could conflict. Add warning.

### 2. View Transition Edge Cases

- **Transition Interrupted**: If user triggers another transition during active transition, cancel first and start second.
- **View Load Failure**: If CombatView fails to mount, show error and return to exploration.
- **Resource Load Failure**: If sprites fail to load, show error screen with retry option.

### 3. Party State Edge Cases

- **All Units Knocked Out**: If all party members are knocked out in combat, trigger defeat screen.
- **Party Member Removed**: If a party member is removed during event, update combat if active.
- **Duplicate Party Members**: Prevent adding the same party member twice.
- **Max Party Size**: Enforce max 4 party members.

### 4. Event System Edge Cases

- **Combat During Exploration Event**: Events can trigger combat. Ensure event completes before combat starts.
- **Teleport During Combat**: Prevent teleport events during combat (or handle gracefully).
- **Recursive Events**: Prevent infinite event loops (event triggers event triggers event...).

### 5. Performance Considerations

- **Large Save Files**: If save files grow too large (>1MB), consider compression.
- **Frequent Saves**: Debounce auto-save to avoid performance issues.
- **Resource Caching**: Cache sprites/fonts to avoid re-loading on every view switch.
- **Memory Leaks**: Ensure old views are properly unmounted and garbage collected.

---

## Testing Checklist

### Core Functionality
- [ ] GameView renders on mount
- [ ] Can transition from exploration to combat
- [ ] Can transition from combat to exploration
- [ ] Resource manager loads fonts once
- [ ] Resource manager caches sprites

### Save/Load
- [ ] Can save game to localStorage (slot 0)
- [ ] Can load game from localStorage (slot 0)
- [ ] F5 quick save works
- [ ] Can export save to file
- [ ] Can import save from file
- [ ] Loaded state matches saved state exactly
- [ ] Party HP/status persists across save/load
- [ ] Global variables persist across save/load
- [ ] Triggered events persist across save/load

### View Transitions
- [ ] Fade transition works (exploration → combat)
- [ ] Fade transition works (combat → exploration)
- [ ] No visual glitches during transition
- [ ] Input blocked during transition
- [ ] Transition cancels if new transition starts

### Party State
- [ ] Party HP persists from exploration to combat
- [ ] Combat damage updates party HP
- [ ] Knocked out units remain knocked out
- [ ] Equipment changes persist
- [ ] Status effects persist

### Event Integration
- [ ] StartEncounter event triggers combat transition
- [ ] Global variables update via events
- [ ] Triggered events don't re-trigger
- [ ] Conditional events work correctly

### Error Handling
- [ ] Corrupted save shows error message
- [ ] Missing map shows error message
- [ ] Missing encounter shows error message
- [ ] Load failure falls back to new game
- [ ] Resource load failure shows retry option

### Performance
- [ ] No memory leaks during view transitions
- [ ] Save/load completes in <500ms
- [ ] View transitions are smooth (60fps)
- [ ] No stuttering during gameplay

---

## Dependencies

### Existing Systems
- **FirstPersonView**: Exploration view (already implemented)
- **CombatView**: Combat view (already implemented)
- **Event System**: Triggers combat, modifies state (already implemented)
- **PartyMemberRegistry**: Creates party members (already implemented)
- **AreaMapRegistry**: Loads maps (already implemented)
- **CombatEncounter**: Defines combat encounters (already implemented)
- **SpriteAssetLoader**: Loads sprites (already implemented)
- **FontAtlasLoader**: Loads fonts (already implemented)
- **UISettings**: Integer scaling, display settings (already implemented)

### New Systems Required
- **GameState interfaces**: Define complete game state structure
- **ResourceManager**: Centralized resource caching
- **ViewTransitionManager**: Handles view transitions
- **GameSaveManager**: Save/load functionality
- **PartyMember serialization**: Add toJSON/fromJSON methods

---

## Files to Create

### New Files

#### Core Game State
- `models/game/GameState.ts` - Complete game state interfaces
- `models/game/PartyState.ts` - Party state interface and utilities
- `models/game/ExplorationState.ts` - Exploration state interface

#### Services
- `services/ResourceManager.ts` - Centralized resource management
- `services/ViewTransitionManager.ts` - View transition system
- `services/GameSaveManager.ts` - Save/load functionality

#### Components
- `components/game/GameView.tsx` - Top-level orchestrator
- `components/game/LoadingScreen.tsx` - Loading screen component (future)

#### Tests
- `components/game/GameView.test.tsx` - Unit tests
- `services/GameSaveManager.test.ts` - Save/load tests

---

## Files to Modify

### FirstPersonView Integration
- `components/firstperson/FirstPersonView.tsx`
  - Add `onStartCombat` prop
  - Add `resourceManager` prop
  - Remove internal sprite/font loading
  - Accept `initialState` prop for loading saves

### CombatView Integration
- `components/combat/CombatView.tsx`
  - Add `onCombatEnd` prop
  - Add `resourceManager` prop
  - Remove internal sprite/font loading
  - Update to accept `combatState` prop instead of `encounter`

### Event System Integration
- `utils/EventProcessor.ts`
  - Add `onStartCombat` callback
  - Accept `globalVariables` and `triggeredEventIds` from GameView
  - Return updated state after processing

### Party Member Serialization
- `models/combat/CombatUnit.ts` (or `PartyMember.ts`)
  - Add `toJSON()` method
  - Add `fromJSON()` static method

### App Entry Point
- `App.tsx`
  - Replace `FirstPersonView` with `GameView`
  - Pass initial map ID

---

## Success Criteria

### Minimum Viable Product (MVP)
- ✅ GameView can render FirstPersonView
- ✅ GameView can transition to CombatView via event
- ✅ GameView can transition back to FirstPersonView after combat
- ✅ Resources (fonts, sprites) are shared across views
- ✅ Can save game state to localStorage
- ✅ Can load game state from localStorage
- ✅ Party HP persists across view transitions

### Full Feature Complete
- ✅ All MVP criteria met
- ✅ Fade transitions between views
- ✅ F5 quick save works
- ✅ Export/import save files
- ✅ Global variables persist
- ✅ Triggered events persist
- ✅ Playtime tracking
- ✅ Error handling for save/load failures
- ✅ Loading screen during initial load
- ✅ All tests passing

### Polish & Quality
- ✅ No visual glitches during transitions
- ✅ No memory leaks
- ✅ Save/load completes in <500ms
- ✅ Developer tools for state inspection (dev mode)
- ✅ Comprehensive error handling
- ✅ All edge cases covered

---

## Performance Considerations

### Memory Management
- **Resource Caching**: Fonts and sprites are loaded once and reused across views
- **View Unmounting**: Old views are properly unmounted when switching to prevent memory leaks
- **Save Data Size**: Monitor save file size to stay under localStorage limits (~5MB)

### Loading Performance
- **Lazy Loading**: Only load sprites needed for current view
- **Font Pre-loading**: Load all fonts during initial load (fonts are small)
- **Async Operations**: Use async/await for file operations to avoid blocking

### Rendering Performance
- **Transition FPS**: Maintain 60fps during view transitions
- **Canvas Reuse**: Reuse canvas elements across views when possible
- **Animation Throttling**: Limit transition animation to 60fps max

### Storage Performance
- **Debounced Auto-Save**: If implementing auto-save, debounce to avoid excessive writes
- **JSON Compression**: Consider LZ-string compression for large save files (future)
- **IndexedDB Migration**: If localStorage becomes too small, migrate to IndexedDB (future)

---

## Future Extensions

### Additional Views
- **Main Menu**: Title screen, continue/new game, settings
- **Inventory Screen**: Manage party inventory, equipment
- **Character Sheet**: View party member stats, abilities
- **World Map**: Navigate between dungeons, towns
- **Town View**: Shop, inn, quest NPCs

### Enhanced Save System
- **Auto-Save**: Automatically save after significant events
- **Multiple Slots**: Support 3+ save slots
- **Cloud Saves**: Sync saves to cloud storage (itch.io API)
- **Save Metadata**: Screenshots, playtime, party level

### Transition Effects
- **Battle Swirl**: Classic RPG battle transition effect
- **Flash Transition**: Screen flash on combat start
- **Slide Transitions**: Directional slides for menu navigation

### State Management
- **Quest System**: Track active quests, objectives, rewards
- **Achievement System**: Track achievements, statistics
- **Time System**: Track in-game time, day/night cycle

---

## Estimated Complexity

- **Overall Complexity**: **Medium-High**
- **Risk Level**: **Medium**
- **Estimated Time**: **21 hours** (including testing and polish)

### Breakdown by Phase
| Phase | Complexity | Time |
|-------|-----------|------|
| Phase 1: Core GameView | Medium | 4 hours |
| Phase 2: View Transitions | Medium | 3 hours |
| Phase 3: Save/Load System | High | 5 hours |
| Phase 4: Party Persistence | Medium | 4 hours |
| Phase 5: Event Integration | Medium | 3 hours |
| Phase 6: Polish & Errors | Low | 2 hours |

### Risk Factors
- **Save/Load Serialization**: Complex state with Maps, Sets, and class instances
- **View Transition Timing**: Ensuring smooth transitions without glitches
- **Party State Sync**: Keeping party state consistent across views
- **Memory Management**: Preventing memory leaks during view switches

### Mitigation Strategies
- Start with simple save/load for core state, add complexity incrementally
- Test transitions thoroughly with various scenarios
- Use state snapshots to verify party state sync
- Profile memory usage during development

---

## Related Documents

- [FirstPersonView AreaMap System](../FirstPersonView/AreaMap/AreaMapSystemOverview.md) - Exploration view design
- [CombatHierarchy](../../CombatHierarchy.md) - Combat view design
- [Event System](../FirstPersonView/AreaMap/EventSystemOverview.md) - Event-driven state changes
- [Defeat Screen](../DefeatScreen/DefeatScreenFeatureOverview.md) - Combat defeat handling
- [Victory Screen](../VictoryScreen/VictoryScreenFeatureOverview.md) - Combat victory handling

---

**Document Status**: Initial Draft
**Next Steps**: Review with team, create implementation plan

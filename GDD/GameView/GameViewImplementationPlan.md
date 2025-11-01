# GameView Implementation Plan

**Date:** 2025-02-01
**Feature:** GameView Orchestrator
**Branch:** feature/gameview-orchestrator
**Priority:** High
**Complexity:** Medium
**Estimated Time:** 21 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Phases](#implementation-phases)
3. [Guidelines Compliance](#guidelines-compliance)
4. [Phase 1: Core GameView Structure](#phase-1-core-gameview-structure)
5. [Phase 2: View Transitions](#phase-2-view-transitions)
6. [Phase 3: Save/Load System](#phase-3-saveload-system)
7. [Phase 4: Party State Persistence](#phase-4-party-state-persistence)
8. [Phase 5: Global Variables & Event Integration](#phase-5-global-variables--event-integration)
9. [Phase 6: Polish & Error Handling](#phase-6-polish--error-handling)
10. [Testing Strategy](#testing-strategy)
11. [Risk Mitigation](#risk-mitigation)
12. [Success Criteria](#success-criteria)

---

## Overview

### Purpose

Implement a top-level `GameView` component that orchestrates all game views (FirstPersonView, CombatView), manages persistent game state, handles view transitions, and provides centralized resource caching. This is the single source of truth for the entire game state, enabling seamless save/load functionality and clean separation of concerns.

### Key Objectives

1. **Unified State Management**: Single `CompleteGameState` object that persists across all views
2. **Resource Sharing**: Centralized `ResourceManager` for sprites/fonts to avoid redundant loading
3. **View Orchestration**: Clean view transitions with fade/slide effects
4. **Save/Load System**: Complete game state serialization leveraging existing infrastructure
5. **Party Persistence**: Maintain party HP/status/equipment across exploration and combat
6. **Event Integration**: Support event-driven combat triggers and state changes

### Core Principles

- **Leverage Existing Code**: Reuse existing serialization methods (CombatState, HumanoidUnit, AreaMap)
- **Immutable State Updates**: Always create new state objects, never mutate existing ones
- **Performance First**: Cache resources, avoid unnecessary re-renders, profile memory usage
- **Error Handling**: Graceful degradation for save/load failures, resource loading errors

---

## Implementation Phases

### Phase Summary

| Phase | Description | Time | Complexity | Dependencies |
|-------|-------------|------|------------|--------------|
| 1 | Core GameView Structure | 4h | Medium | None |
| 2 | View Transitions | 3h | Medium | Phase 1 |
| 3 | Save/Load System | 5h | Medium | Phase 1 |
| 4 | Party State Persistence | 4h | Medium | Phase 1, 3 |
| 5 | Event Integration | 3h | Medium | Phase 1, 2 |
| 6 | Polish & Error Handling | 2h | Low | All phases |

**Total Estimated Time:** 21 hours

---

## Guidelines Compliance

### Critical Guidelines to Follow

#### 1. State Management Patterns

**Guideline:** Always capture and apply phase handler return values

**Application:**
```typescript
// ✅ DO: Capture state updates from callbacks
const handleStartCombat = useCallback((encounterId: string) => {
  const newState = {
    ...gameState,
    currentView: 'combat' as const,
    combatState: createCombatState(encounterId)
  };
  setGameState(newState); // Apply the change
}, [gameState]);

// ❌ DON'T: Mutate state directly
const handleStartCombat = useCallback((encounterId: string) => {
  gameState.currentView = 'combat'; // Breaks React change detection!
  setGameState(gameState); // Same reference, no re-render
}, [gameState]);
```

**Guideline:** Use immutable state updates

**Application:**
```typescript
// ✅ DO: Always create new objects
setGameState(prev => ({
  ...prev,
  currentView: 'exploration',
  combatState: undefined // Clear combat state
}));

// ❌ DON'T: Mutate existing state
setGameState(prev => {
  prev.currentView = 'exploration';
  return prev;
});
```

#### 2. Resource Management

**Guideline:** Cache heavy objects (sprites, fonts, canvases)

**Application:**
```typescript
// ✅ DO: Cache ResourceManager in useMemo
const resourceManager = useMemo(() => new ResourceManager(), []);

// ❌ DON'T: Recreate on every render
const resourceManager = new ResourceManager(); // Creates new instance every render!
```

**Guideline:** Don't recreate heavy objects every frame

**Application:**
```typescript
// ResourceManager implementation
export class ResourceManager {
  private spriteSheets: Map<string, HTMLImageElement> = new Map();

  async loadSprites(): Promise<void> {
    if (this.spriteSheets.size > 0) {
      return; // ✅ Already cached, skip reload
    }
    // Load sprites once...
  }
}
```

#### 3. React Hook Dependencies

**Guideline:** Only include dependencies that are actually used in callbacks

**Application:**
```typescript
// ✅ DO: Minimal dependencies
const handleCombatEnd = useCallback((victory: boolean) => {
  // Only uses transitionManager, not gameState
  transitionManager.startTransition('combat', 'exploration');

  setGameState(prev => ({ // Access via setter, not dependency
    ...prev,
    currentView: 'exploration',
    combatState: undefined
  }));
}, [transitionManager]); // Only transitionManager needed

// ❌ DON'T: Include unused dependencies
const handleCombatEnd = useCallback((victory: boolean) => {
  // ... same code ...
}, [transitionManager, gameState]); // gameState causes unnecessary recreations
```

#### 4. Component Architecture

**Guideline:** Cache stateful components (don't recreate every frame)

**Application:**
```typescript
// ✅ DO: Cache manager instances
const resourceManager = useMemo(() => new ResourceManager(), []);
const transitionManager = useMemo(() => new ViewTransitionManager(), []);

// ❌ DON'T: Recreate managers every render
function GameView() {
  const resourceManager = new ResourceManager(); // New instance every render!
  const transitionManager = new ViewTransitionManager();
  // ...
}
```

#### 5. Async Operations with Animations

**Guideline:** Use callback lifecycle chain for state transitions

**Application:**
```typescript
// ✅ DO: Sequential callbacks for state transitions
const loadResources = async () => {
  setIsLoading(true);

  try {
    await resourceManager.loadFonts();
    setResourcesLoaded(true);
    onGameReady?.(); // Callback after load completes
  } catch (error) {
    console.error('[GameView] Resource load failed:', error);
    setLoadError(error);
  } finally {
    setIsLoading(false); // Reset after all operations complete
  }
};

// ❌ DON'T: Use setTimeout for state cleanup
const loadResources = async () => {
  setIsLoading(true);
  await resourceManager.loadFonts();
  setTimeout(() => setIsLoading(false), 1000); // Race condition!
};
```

#### 6. Serialization

**Guideline:** Leverage existing serialization methods

**Application:**
```typescript
// ✅ DO: Reuse existing methods
private static serializeGameState(state: CompleteGameState): any {
  return {
    combatState: state.combatState
      ? serializeCombatState(state.combatState) // Existing method!
      : undefined,
    partyState: {
      members: state.partyState.members.map(m => m.toJSON()), // Existing method!
    },
    // ...
  };
}

// ❌ DON'T: Recreate serialization logic
private static serializeGameState(state: CompleteGameState): any {
  return {
    combatState: {
      turnNumber: state.combatState.turnNumber,
      phase: state.combatState.phase,
      // ... duplicating existing logic
    }
  };
}
```

#### 7. Performance Patterns

**Guideline:** Don't call renderFrame() in high-frequency event handlers

**Application:**
```typescript
// ✅ DO: Let animation loop handle rendering
// GameView doesn't have direct canvas rendering, but same principle applies
const handleMouseMove = (e: MouseEvent) => {
  updateHoverState(e); // Fast state update
  // Animation loop will render on next frame
};

// ❌ DON'T: Force synchronous renders
const handleMouseMove = (e: MouseEvent) => {
  updateHoverState(e);
  renderFrame(); // Blocks animation loop!
};
```

#### 8. WeakMap for Animation Data

**Guideline:** Use WeakMap for temporary object-associated data

**Application:**
```typescript
// Not directly applicable to GameView (no animations)
// But relevant for ViewTransitionManager

export class ViewTransitionManager {
  // ✅ DO: Use primitive types for transition state
  private transitionState: TransitionState;

  // Note: No WeakMaps needed here since we're not tracking per-object data
  // This guideline is more relevant for phase handlers tracking per-unit animation state
}
```

---

## Phase 1: Core GameView Structure

**Estimated Time:** 4 hours
**Complexity:** Medium
**Dependencies:** None

### Objectives

1. Create `CompleteGameState` interface (reusing existing types)
2. Implement `ResourceManager` for centralized resource caching
3. Create basic `GameView` component
4. Update `FirstPersonView` and `CombatView` to accept new props
5. Replace `App.tsx` to use `GameView` instead of direct view rendering

### Tasks

#### Task 1.1: Define CompleteGameState Interface

**File:** `react-app/src/models/game/GameState.ts` (NEW)

**Changes:**
```typescript
import type { CombatState } from '../combat/CombatState';
import type { CombatUnit } from '../combat/CombatUnit';
import type { GameState as EventGameState } from '../area/EventPrecondition';
import type { CardinalDirection } from '../../types';

/**
 * Complete game state - represents the entire game session
 * Serializable for save/load functionality
 */
export interface CompleteGameState {
  currentView: GameViewType;
  explorationState?: ExplorationState;
  combatState?: CombatState; // Reuses existing type
  partyState: PartyState;
  gameState: EventGameState; // Reuses existing type
  saveSlotInfo?: SaveSlotInfo;
  sessionStartTime: number;
  totalPlaytime: number;
}

export type GameViewType = 'exploration' | 'combat' | 'menu' | 'loading';

export interface ExplorationState {
  currentMapId: string;
  playerPosition: { x: number; y: number };
  playerDirection: CardinalDirection;
  exploredTiles: Set<string>;
  targetedObject: {
    type: 'door' | 'chest' | 'npc' | 'sign';
    position: { x: number; y: number };
  } | null;
}

export interface PartyState {
  members: CombatUnit[]; // Reuses existing type
  inventory: {
    items: InventoryItem[];
    gold: number;
  };
  equipment: Map<string, EquippedItems>;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface EquippedItems {
  weapon?: string;
  armor?: string;
  accessory1?: string;
  accessory2?: string;
}

export interface SaveSlotInfo {
  slotIndex: number;
  savedAt: Date;
  playtime: number; // seconds
}
```

**Rationale:**
- Reuses existing types (`CombatState`, `CombatUnit`, `GameState`) per guidelines
- Defines minimal new interfaces needed for game orchestration
- Serializable structure using primitives and existing serializable types

**Guidelines Compliance:**
- ✅ Leverages existing serialization (CombatState, CombatUnit)
- ✅ Immutable state structure (readonly properties preferred but optional)

---

#### Task 1.2: Create ResourceManager

**File:** `react-app/src/services/ResourceManager.ts` (NEW)

**Changes:**
```typescript
import { SpriteAssetLoader } from '../utils/SpriteAssetLoader';
import { FontAtlasLoader } from '../utils/FontAtlasLoader';
import { FontRegistry } from '../utils/FontRegistry';
import type { ExplorationState } from '../models/game/GameState';
import type { CombatState } from '../models/combat/CombatState';

/**
 * ResourceManager - Centralized resource loading and caching
 * Shared across all views to avoid redundant loading
 */
export class ResourceManager {
  private spriteLoader: SpriteAssetLoader;
  private fontLoader: FontAtlasLoader;
  private spriteSheets: Map<string, HTMLImageElement>;
  private fontAtlases: Map<string, HTMLImageElement>;
  private isLoading: boolean;

  constructor() {
    this.spriteLoader = new SpriteAssetLoader();
    this.fontLoader = new FontAtlasLoader();
    this.spriteSheets = new Map();
    this.fontAtlases = new Map();
    this.isLoading = false;
  }

  /**
   * Load all fonts used across the game
   * Called once during GameView mount
   */
  async loadFonts(): Promise<void> {
    // ✅ GUIDELINE: Cache check to avoid redundant loading
    if (this.fontAtlases.size > 0) {
      console.log('[ResourceManager] Fonts already loaded, skipping');
      return;
    }

    this.isLoading = true;
    console.log('[ResourceManager] Loading fonts...');

    try {
      const fontIds = FontRegistry.getAllIds();
      await this.fontLoader.loadAll(fontIds);

      // Cache all loaded fonts
      fontIds.forEach(fontId => {
        const fontAtlas = this.fontLoader.get(fontId);
        if (fontAtlas) {
          this.fontAtlases.set(fontId, fontAtlas);
        }
      });

      console.log(`[ResourceManager] Loaded ${this.fontAtlases.size} fonts`);
    } finally {
      this.isLoading = false;
    }
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
    // Cache results in this.spriteSheets
    // Return cached sprites if already loaded

    // TODO: Implement sprite loading logic
    // For now, return existing sprite sheets
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

**Rationale:**
- Centralized resource management prevents duplicate loading across views
- Cache check pattern (`if (this.fontAtlases.size > 0)`) per performance guidelines
- Reuses existing loaders (`SpriteAssetLoader`, `FontAtlasLoader`)

**Guidelines Compliance:**
- ✅ Caches heavy objects (fonts, sprites)
- ✅ Checks cache before loading
- ✅ Uses existing loader infrastructure

---

#### Task 1.3: Create GameView Component

**File:** `react-app/src/components/game/GameView.tsx` (NEW)

**Changes:**
```typescript
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CompleteGameState, GameViewType } from '../../models/game/GameState';
import { ResourceManager } from '../../services/ResourceManager';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import type { CombatUnit } from '../../models/combat/CombatUnit';

interface GameViewProps {
  initialMapId?: string;
  autoLoadSave?: boolean;
  onGameReady?: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  initialMapId = 'map-001-entrance',
  autoLoadSave = true,
  onGameReady
}) => {
  // ✅ GUIDELINE: Cache manager instances in useMemo
  const resourceManager = useMemo(() => new ResourceManager(), []);

  // ✅ GUIDELINE: Initialize game state immutably
  const [gameState, setGameState] = useState<CompleteGameState>(() => {
    // TODO: Phase 3 - Auto-load from save if enabled
    if (autoLoadSave) {
      // const savedState = GameSaveManager.loadFromSlot(0);
      // if (savedState) return savedState;
    }

    // Create new game state
    console.log('[GameView] Starting new game');
    return createNewGameState(initialMapId);
  });

  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  // ✅ GUIDELINE: Async operations with proper lifecycle
  useEffect(() => {
    const loadResources = async () => {
      try {
        await resourceManager.loadFonts();
        setResourcesLoaded(true);
        onGameReady?.();
      } catch (error) {
        console.error('[GameView] Resource load failed:', error);
        setLoadError(error as Error);
      }
    };

    loadResources();
  }, [resourceManager, onGameReady]);

  // Render loading screen
  if (!resourcesLoaded) {
    if (loadError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff0000',
          fontFamily: 'monospace',
        }}>
          Error loading resources: {loadError.message}
        </div>
      );
    }

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

  // TODO: Phase 1.4 - Render current view
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
      {/* TODO: Conditional view rendering */}
      <div>GameView Placeholder - Current View: {gameState.currentView}</div>
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
    .filter((unit): unit is CombatUnit => unit !== undefined);

  // ✅ GUIDELINE: Immutable state object creation
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
    gameState: {
      globalVariables: new Map(),
      messageLog: [],
      triggeredEventIds: new Set(),
      currentMapId: initialMapId,
      playerPosition: { x: map.playerSpawn.x, y: map.playerSpawn.y },
      playerDirection: map.playerSpawn.direction,
    },
    sessionStartTime: Date.now(),
    totalPlaytime: 0,
  };
}
```

**Rationale:**
- Minimal implementation for Phase 1 (view rendering comes in later phases)
- Proper async resource loading with error handling
- Immutable state initialization

**Guidelines Compliance:**
- ✅ Cache manager instances in useMemo
- ✅ Async operations with proper lifecycle (no setTimeout)
- ✅ Immutable state creation
- ✅ Error handling for resource loading

---

#### Task 1.4: Update FirstPersonView Props

**File:** `react-app/src/components/firstperson/FirstPersonView.tsx` (MODIFY)

**Changes:**
```typescript
// Add to existing interface
interface FirstPersonViewProps {
  mapId: string;

  // NEW: Callback when combat encounter is triggered
  onStartCombat?: (encounterId: string) => void;

  // NEW: Shared resource manager from GameView
  resourceManager?: ResourceManager;

  // NEW: Optional initial exploration state (for loading saves)
  initialState?: ExplorationState;
}
```

**Rationale:**
- Minimal props changes to support GameView orchestration
- Optional props for backwards compatibility during migration
- ResourceManager prop to share fonts/sprites

**Guidelines Compliance:**
- ✅ Props pattern for callback communication
- ✅ Optional props for gradual migration

---

#### Task 1.5: Update CombatView Props

**File:** `react-app/src/components/combat/CombatView.tsx` (MODIFY)

**Changes:**
```typescript
// Add to existing interface
interface CombatViewProps {
  // EXISTING: encounter?: CombatEncounter;

  // NEW: Combat state from GameView
  combatState?: CombatState;

  // NEW: Callback when combat ends
  onCombatEnd?: (victory: boolean) => void;

  // NEW: Shared resource manager from GameView
  resourceManager?: ResourceManager;
}
```

**Rationale:**
- CombatView can accept either `encounter` (legacy) or `combatState` (new)
- Callback for combat completion
- ResourceManager for shared resources

**Guidelines Compliance:**
- ✅ Props pattern for callback communication
- ✅ Optional props for gradual migration

---

#### Task 1.6: Update App.tsx Entry Point

**File:** `react-app/src/App.tsx` (MODIFY)

**Changes:**
```typescript
import { GameView } from './components/game/GameView';

function App() {
  return (
    <GameView
      initialMapId="map-001-entrance"
      autoLoadSave={true}
      onGameReady={() => console.log('[App] Game ready')}
    />
  );
}

export default App;
```

**Rationale:**
- Replace direct view rendering with GameView orchestrator
- Centralized game state management

**Guidelines Compliance:**
- ✅ Single source of truth for game state

---

### Phase 1 Testing Checklist

- [ ] GameView renders loading screen on mount
- [ ] Fonts load successfully via ResourceManager
- [ ] Loading screen transitions to game after fonts load
- [ ] Error screen appears if font loading fails
- [ ] No console errors during initialization
- [ ] ResourceManager caches fonts (verify with console logs)

### Phase 1 Validation

```bash
# Run dev server
npm run dev

# Check browser console for logs:
# - "[ResourceManager] Loading fonts..."
# - "[ResourceManager] Loaded X fonts"
# - "[GameView] Starting new game"
# - "[App] Game ready"

# Verify no errors in console
# Verify loading screen appears briefly
```

---

## Phase 2: View Transitions

**Estimated Time:** 3 hours
**Complexity:** Medium
**Dependencies:** Phase 1

### Objectives

1. Implement `ViewTransitionManager` for smooth transitions
2. Add fade transition between exploration and combat
3. Connect `FirstPersonView` to trigger combat via callback
4. Connect `CombatView` to return to exploration via callback
5. Handle input blocking during transitions

### Tasks

#### Task 2.1: Create ViewTransitionManager

**File:** `react-app/src/services/ViewTransitionManager.ts` (NEW)

**Changes:**
```typescript
import type { GameViewType } from '../models/game/GameState';

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

export interface TransitionOptions {
  duration?: number;
  effect?: 'fade' | 'slide' | 'instant';
  onComplete?: () => void;
}

/**
 * ViewTransitionManager - Handles smooth transitions between game views
 */
export class ViewTransitionManager {
  private transitionState: TransitionState;
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
    console.log(`[ViewTransitionManager] Starting transition: ${from} → ${to}`);

    this.transitionState = {
      type: 'active',
      from,
      to,
      startTime: performance.now(),
      duration: options?.duration ?? 500, // Default 500ms
      effect: options?.effect ?? 'fade', // Default fade
    };

    this.onTransitionComplete = options?.onComplete;
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
      console.log('[ViewTransitionManager] Transition complete');
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
```

**Rationale:**
- Simple state machine for transition management
- Progress-based animation (0-1)
- Callback for transition completion

**Guidelines Compliance:**
- ✅ Uses primitive types (no WeakMaps needed)
- ✅ Clear state machine pattern

---

#### Task 2.2: Add Transition Rendering to GameView

**File:** `react-app/src/components/game/GameView.tsx` (MODIFY)

**Changes:**
```typescript
import { ViewTransitionManager } from '../../services/ViewTransitionManager';
import { FirstPersonView } from '../firstperson/FirstPersonView';
import { CombatView } from '../combat/CombatView';

export const GameView: React.FC<GameViewProps> = ({ ... }) => {
  // ✅ GUIDELINE: Cache transition manager
  const transitionManager = useMemo(() => new ViewTransitionManager(), []);

  // ... existing code ...

  // ✅ GUIDELINE: Handle combat start with immutable state update
  const handleStartCombat = useCallback((encounterId: string) => {
    console.log('[GameView] Starting combat:', encounterId);

    // TODO: Load encounter and create combat state
    // For now, placeholder logic

    // Transition to combat view
    transitionManager.startTransition('exploration', 'combat', {
      duration: 500,
      effect: 'fade',
    });

    // ✅ GUIDELINE: Immutable state update with spread operator
    setGameState(prev => ({
      ...prev,
      currentView: 'combat',
      // TODO: combatState: createCombatState(encounter)
    }));
  }, [transitionManager]);

  // ✅ GUIDELINE: Handle combat end with immutable state update
  const handleCombatEnd = useCallback((victory: boolean) => {
    console.log('[GameView] Combat ended:', victory ? 'Victory' : 'Defeat');

    // Transition back to exploration
    transitionManager.startTransition('combat', 'exploration', {
      duration: 500,
      effect: 'fade',
    });

    // ✅ GUIDELINE: Immutable state update
    setGameState(prev => ({
      ...prev,
      currentView: 'exploration',
      combatState: undefined, // Clear combat state
    }));
  }, [transitionManager]);

  // Conditional view rendering
  return (
    <div style={{ /* ... existing styles ... */ }}>
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
```

**Rationale:**
- Callbacks for view transitions
- Immutable state updates via setGameState
- Minimal dependencies in useCallback

**Guidelines Compliance:**
- ✅ Immutable state updates (spread operator)
- ✅ Minimal useCallback dependencies
- ✅ Cache transition manager in useMemo

---

### Phase 2 Testing Checklist

- [ ] Can trigger combat from FirstPersonView (via manual test)
- [ ] Fade transition plays when entering combat
- [ ] Can end combat and return to exploration
- [ ] Fade transition plays when exiting combat
- [ ] Input is blocked during transitions (if implemented)
- [ ] No visual glitches during transition

### Phase 2 Validation

```bash
npm run dev

# Manual testing:
# 1. Start game (FirstPersonView loads)
# 2. Trigger combat encounter (via event or debug)
# 3. Observe fade transition
# 4. Complete combat (victory or defeat)
# 5. Observe fade transition back to exploration
```

---

## Phase 3: Save/Load System

**Estimated Time:** 5 hours
**Complexity:** Medium
**Dependencies:** Phase 1

### Objectives

1. Implement `GameSaveManager` extending `combatStorage.ts` patterns
2. Serialize `CompleteGameState` leveraging existing methods
3. Support localStorage slot-based saves (0-3)
4. Support file export/import
5. Add F5 quick save

### Tasks

#### Task 3.1: Create GameSaveManager

**File:** `react-app/src/services/GameSaveManager.ts` (NEW)

**Changes:**
```typescript
import type { CompleteGameState, GameViewType } from '../models/game/GameState';
import { serializeCombatState, deserializeCombatState } from '../models/combat/CombatState';
import { HumanoidUnit } from '../models/combat/HumanoidUnit';
import type { PartyState } from '../models/game/GameState';

export interface CompleteSaveData {
  version: string;
  savedAt: string;
  state: any; // Serialized CompleteGameState
}

export interface SaveSlotMetadata {
  slotIndex: number;
  timestamp: number;
  currentView: GameViewType;
  currentMapId?: string;
  turnNumber?: number;
  phase?: string;
}

/**
 * GameSaveManager - Save/load manager for complete game state
 * Extends existing combatStorage.ts patterns
 */
export class GameSaveManager {
  /**
   * Save game state to localStorage
   * Uses same slot pattern as combat (0-3)
   */
  static saveToSlot(
    state: CompleteGameState,
    slotIndex: number = 0
  ): boolean {
    try {
      console.log(`[GameSaveManager] Saving to slot ${slotIndex}...`);

      const saveData: CompleteSaveData = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        state: this.serializeGameState(state),
      };

      const key = `vibedc_game_save_slot_${slotIndex}`;
      localStorage.setItem(key, JSON.stringify(saveData));

      // Save metadata for quick display
      const metadata: SaveSlotMetadata = {
        slotIndex,
        timestamp: Date.now(),
        currentView: state.currentView,
        currentMapId: state.explorationState?.currentMapId,
        turnNumber: state.combatState?.turnNumber,
        phase: state.combatState?.phase,
      };
      localStorage.setItem(`${key}-metadata`, JSON.stringify(metadata));

      console.log('[GameSaveManager] Save successful');
      return true;
    } catch (error) {
      console.error('[GameSaveManager] Save failed:', error);
      return false;
    }
  }

  /**
   * Load game state from localStorage
   */
  static loadFromSlot(slotIndex: number = 0): CompleteGameState | null {
    try {
      console.log(`[GameSaveManager] Loading from slot ${slotIndex}...`);

      const key = `vibedc_game_save_slot_${slotIndex}`;
      const data = localStorage.getItem(key);
      if (!data) {
        console.log('[GameSaveManager] No save found in slot');
        return null;
      }

      const saveData: CompleteSaveData = JSON.parse(data);
      const state = this.deserializeGameState(saveData.state);

      console.log('[GameSaveManager] Load successful');
      return state;
    } catch (error) {
      console.error('[GameSaveManager] Load failed:', error);
      return null;
    }
  }

  /**
   * Export game state to file
   */
  static exportToFile(state: CompleteGameState): void {
    console.log('[GameSaveManager] Exporting to file...');

    const saveData: CompleteSaveData = {
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

    console.log('[GameSaveManager] Export complete');
  }

  /**
   * Import game state from file
   */
  static async importFromFile(file: File): Promise<CompleteGameState | null> {
    try {
      console.log('[GameSaveManager] Importing from file...');

      const text = await file.text();
      const saveData: CompleteSaveData = JSON.parse(text);
      const state = this.deserializeGameState(saveData.state);

      console.log('[GameSaveManager] Import successful');
      return state;
    } catch (error) {
      console.error('[GameSaveManager] Import failed:', error);
      return null;
    }
  }

  /**
   * Serialize game state to JSON
   * ✅ GUIDELINE: Leverages existing serialization methods
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
      // ✅ GUIDELINE: Uses existing CombatState serialization
      combatState: state.combatState
        ? serializeCombatState(state.combatState)
        : undefined,
      partyState: this.serializePartyState(state.partyState),
      // ✅ GUIDELINE: Uses existing GameState from EventPrecondition.ts
      gameState: {
        globalVariables: Array.from(state.gameState.globalVariables.entries()),
        messageLog: state.gameState.messageLog,
        currentMapId: state.gameState.currentMapId,
        playerPosition: state.gameState.playerPosition,
        playerDirection: state.gameState.playerDirection,
        combatState: state.gameState.combatState,
        triggeredEventIds: state.gameState.triggeredEventIds
          ? Array.from(state.gameState.triggeredEventIds)
          : undefined,
      },
      saveSlotInfo: state.saveSlotInfo,
      sessionStartTime: state.sessionStartTime,
      totalPlaytime: state.totalPlaytime,
    };
  }

  /**
   * Deserialize game state from JSON
   * ✅ GUIDELINE: Leverages existing deserialization methods
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
      // ✅ GUIDELINE: Uses existing CombatState deserialization
      combatState: data.combatState
        ? deserializeCombatState(data.combatState)
        : undefined,
      partyState: this.deserializePartyState(data.partyState),
      gameState: {
        globalVariables: new Map(data.gameState.globalVariables),
        messageLog: data.gameState.messageLog || [],
        currentMapId: data.gameState.currentMapId,
        playerPosition: data.gameState.playerPosition,
        playerDirection: data.gameState.playerDirection,
        combatState: data.gameState.combatState,
        triggeredEventIds: data.gameState.triggeredEventIds
          ? new Set(data.gameState.triggeredEventIds)
          : new Set(),
      },
      saveSlotInfo: data.saveSlotInfo,
      sessionStartTime: data.sessionStartTime,
      totalPlaytime: data.totalPlaytime,
    };
  }

  /**
   * Serialize party state
   * ✅ GUIDELINE: Uses existing HumanoidUnit.toJSON()
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
   * ✅ GUIDELINE: Uses existing HumanoidUnit.fromJSON()
   */
  private static deserializePartyState(data: any): PartyState {
    return {
      members: data.members.map((m: any) => HumanoidUnit.fromJSON(m)),
      inventory: data.inventory,
      equipment: new Map(data.equipment),
    };
  }
}
```

**Rationale:**
- Reuses existing serialization (serializeCombatState, HumanoidUnit.toJSON)
- Extends combatStorage.ts slot pattern (0-3)
- Handles Maps/Sets conversion to arrays for JSON

**Guidelines Compliance:**
- ✅ Leverages existing serialization methods
- ✅ Extends existing combatStorage.ts patterns
- ✅ Proper error handling with try/catch

---

#### Task 3.2: Add Auto-Load and Quick Save to GameView

**File:** `react-app/src/components/game/GameView.tsx` (MODIFY)

**Changes:**
```typescript
import { GameSaveManager } from '../../services/GameSaveManager';

export const GameView: React.FC<GameViewProps> = ({
  initialMapId = 'map-001-entrance',
  autoLoadSave = true,
  onGameReady
}) => {
  // ... existing code ...

  // ✅ GUIDELINE: Try auto-load in state initializer
  const [gameState, setGameState] = useState<CompleteGameState>(() => {
    if (autoLoadSave) {
      const savedState = GameSaveManager.loadFromSlot(0);
      if (savedState) {
        console.log('[GameView] Loaded saved game');
        return savedState;
      }
    }

    console.log('[GameView] Starting new game');
    return createNewGameState(initialMapId);
  });

  // ✅ GUIDELINE: F5 quick save handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        console.log('[GameView] Quick save (F5)');
        const success = GameSaveManager.saveToSlot(gameState, 0);
        if (success) {
          // TODO: Show save confirmation toast
          console.log('[GameView] Save successful');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // ... rest of component ...
};
```

**Rationale:**
- Auto-load on mount if enabled
- F5 quick save to slot 0
- Non-blocking save operation

**Guidelines Compliance:**
- ✅ Proper cleanup in useEffect
- ✅ Prevents default F5 browser refresh

---

### Phase 3 Testing Checklist

- [ ] Can save game to localStorage (slot 0)
- [ ] Can load game from localStorage (slot 0)
- [ ] Loaded state matches saved state
- [ ] F5 quick save works
- [ ] Can export save to file
- [ ] Can import save from file
- [ ] Save/load handles Maps and Sets correctly
- [ ] Corrupted save shows error and falls back to new game

### Phase 3 Validation

```bash
npm run dev

# Manual testing:
# 1. Start game, move around in exploration
# 2. Press F5 to quick save
# 3. Refresh browser
# 4. Game loads from save (same position, same state)
# 5. Export save file
# 6. Clear localStorage
# 7. Import save file
# 8. Verify state restored correctly
```

---

## Phase 4: Party State Persistence

**Estimated Time:** 4 hours
**Complexity:** Medium
**Dependencies:** Phase 1, Phase 3

### Objectives

1. Update `FirstPersonView` to display party state
2. Update `CombatView` to initialize from party state
3. Sync party HP/status back to `gameState.partyState` after combat
4. Handle knocked out units
5. Support equipment changes

### Tasks

#### Task 4.1: Update FirstPersonView to Use Party State

**File:** `react-app/src/components/firstperson/FirstPersonView.tsx` (MODIFY)

**Changes:**
```typescript
interface FirstPersonViewProps {
  mapId: string;
  onStartCombat?: (encounterId: string) => void;
  resourceManager?: ResourceManager;
  initialState?: ExplorationState;

  // NEW: Party state from GameView
  partyState?: PartyState;
}

export const FirstPersonView: React.FC<FirstPersonViewProps> = ({
  mapId,
  onStartCombat,
  resourceManager,
  initialState,
  partyState
}) => {
  // TODO: Display party member stats using partyState.members
  // Example: Show HP bars, status effects, equipment

  // ... existing code ...
};
```

**Rationale:**
- FirstPersonView can display party stats in UI
- Supports future healing item usage

**Guidelines Compliance:**
- ✅ Props pattern for state access

---

#### Task 4.2: Update CombatView to Initialize from Party State

**File:** `react-app/src/components/combat/CombatView.tsx` (MODIFY)

**Changes:**
```typescript
interface CombatViewProps {
  combatState?: CombatState;
  onCombatEnd?: (victory: boolean) => void;
  resourceManager?: ResourceManager;

  // NEW: Party state to initialize combat units
  partyState?: PartyState;
}

export const CombatView: React.FC<CombatViewProps> = ({
  combatState,
  onCombatEnd,
  resourceManager,
  partyState
}) => {
  // Initialize combat state from party state
  useEffect(() => {
    if (combatState && partyState) {
      // Copy party members into combat unit manifest
      // Preserve HP, status effects, equipment

      partyState.members.forEach(member => {
        // TODO: Add member to combatState.unitManifest
        // Preserve current HP, status, etc.
      });
    }
  }, [combatState, partyState]);

  // ... existing code ...
};
```

**Rationale:**
- Combat units initialized from persistent party state
- HP/status effects carry over from exploration

**Guidelines Compliance:**
- ✅ useEffect for initialization
- ✅ Immutable state updates

---

#### Task 4.3: Sync Party State After Combat

**File:** `react-app/src/components/game/GameView.tsx` (MODIFY)

**Changes:**
```typescript
const handleCombatEnd = useCallback((victory: boolean) => {
  console.log('[GameView] Combat ended:', victory ? 'Victory' : 'Defeat');

  // ✅ GUIDELINE: Sync party state from combat
  setGameState(prev => {
    if (!prev.combatState) return prev;

    // Copy HP/status from combat units back to party members
    const updatedMembers = prev.partyState.members.map(member => {
      const combatUnit = prev.combatState?.unitManifest.getUnitById(member.id);
      if (combatUnit) {
        // Create new unit with updated HP/status
        return {
          ...member,
          currentHP: combatUnit.currentHP,
          statusEffects: combatUnit.statusEffects,
          // TODO: Copy other changed properties
        };
      }
      return member;
    });

    // ✅ GUIDELINE: Immutable state update
    return {
      ...prev,
      currentView: 'exploration',
      combatState: undefined,
      partyState: {
        ...prev.partyState,
        members: updatedMembers,
      },
    };
  });

  // Transition back to exploration
  transitionManager.startTransition('combat', 'exploration', {
    duration: 500,
    effect: 'fade',
  });
}, [transitionManager]);
```

**Rationale:**
- Party state updated with post-combat HP/status
- Knocked out units remain knocked out
- Equipment changes persist

**Guidelines Compliance:**
- ✅ Immutable state update (spread operator)
- ✅ No mutations of existing state

---

### Phase 4 Testing Checklist

- [ ] Party HP persists from exploration to combat
- [ ] Combat damage updates party HP
- [ ] Knocked out units remain knocked out after combat
- [ ] Equipment changes persist across views
- [ ] Status effects persist across views
- [ ] Save/load preserves party state correctly

### Phase 4 Validation

```bash
npm run dev

# Manual testing:
# 1. Start exploration with 100 HP
# 2. Enter combat
# 3. Take damage to 50 HP
# 4. Win combat
# 5. Return to exploration
# 6. Verify HP is 50 in exploration view
# 7. Save game
# 8. Reload game
# 9. Verify HP is still 50
```

---

## Phase 5: Global Variables & Event Integration

**Estimated Time:** 3 hours
**Complexity:** Medium
**Dependencies:** Phase 1, Phase 2

### Objectives

1. Update `EventProcessor` to use `gameState` from GameView
2. Pass `gameState` to FirstPersonView
3. Update `gameState` when events are processed
4. Ensure triggered events persist across save/load

### Tasks

#### Task 5.1: Update EventProcessor Integration

**File:** `react-app/src/utils/EventProcessor.ts` (MODIFY)

**Changes:**
```typescript
export class EventProcessor {
  private onStartCombat?: (encounterId: string) => void;

  /**
   * Set callback for combat start
   * Called when StartEncounter event is triggered
   */
  setOnStartCombat(callback: (encounterId: string) => void): void {
    this.onStartCombat = callback;
  }

  /**
   * Process StartEncounter event
   */
  processStartEncounter(encounterId: string, gameState: GameState): GameState {
    // Notify GameView to transition to combat
    if (this.onStartCombat) {
      this.onStartCombat(encounterId);
    }

    // ✅ GUIDELINE: Return updated game state immutably
    return {
      ...gameState,
      combatState: {
        active: true,
        encounterId,
      },
    };
  }
}
```

**Rationale:**
- EventProcessor accepts gameState from GameView
- Returns updated gameState after processing events
- Triggers combat via callback

**Guidelines Compliance:**
- ✅ Immutable state updates
- ✅ Callback pattern for view transitions

---

#### Task 5.2: Update GameView to Pass Event State

**File:** `react-app/src/components/game/GameView.tsx` (MODIFY)

**Changes:**
```typescript
export const GameView: React.FC<GameViewProps> = ({ ... }) => {
  // ... existing code ...

  return (
    <div style={{ /* ... */ }}>
      {gameState.currentView === 'exploration' && gameState.explorationState && (
        <FirstPersonView
          mapId={gameState.explorationState.currentMapId}
          onStartCombat={handleStartCombat}
          resourceManager={resourceManager}
          partyState={gameState.partyState}

          // NEW: Pass gameState for event system
          gameState={gameState.gameState}
        />
      )}

      {/* ... CombatView ... */}
    </div>
  );
};
```

**Rationale:**
- FirstPersonView receives gameState for event processing
- Global variables accessible to event system

**Guidelines Compliance:**
- ✅ Props pattern for state sharing

---

### Phase 5 Testing Checklist

- [ ] Global variables persist across view transitions
- [ ] Triggered events don't re-trigger after save/load
- [ ] Quest flags work correctly
- [ ] Conditional events evaluate correctly
- [ ] StartEncounter event triggers combat transition

### Phase 5 Validation

```bash
npm run dev

# Manual testing:
# 1. Trigger event that sets global variable "door_opened"
# 2. Save game
# 3. Reload game
# 4. Verify event doesn't re-trigger (check console logs)
# 5. Verify global variable persists
```

---

## Phase 6: Polish & Error Handling

**Estimated Time:** 2 hours
**Complexity:** Low
**Dependencies:** All phases

### Objectives

1. Add error handling for save/load failures
2. Add developer tools for state inspection
3. Add playtime tracking
4. Improve loading screen
5. Add save confirmation feedback

### Tasks

#### Task 6.1: Add Error Handling

**File:** `react-app/src/services/GameSaveManager.ts` (MODIFY)

**Changes:**
```typescript
static loadFromSlot(slotIndex: number = 0): CompleteGameState | null {
  try {
    const key = `vibedc_game_save_slot_${slotIndex}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const saveData: CompleteSaveData = JSON.parse(data);

    // ✅ GUIDELINE: Version validation
    if (saveData.version !== '1.0') {
      console.error(`[GameSaveManager] Unsupported save version: ${saveData.version}`);
      return null;
    }

    const state = this.deserializeGameState(saveData.state);

    // ✅ GUIDELINE: Validate required fields
    if (!state.currentView || !state.partyState) {
      console.error('[GameSaveManager] Invalid save data: missing required fields');
      return null;
    }

    return state;
  } catch (error) {
    console.error('[GameSaveManager] Load failed:', error);
    // Corrupted save - return null to fall back to new game
    return null;
  }
}
```

**Rationale:**
- Validate save version
- Validate required fields
- Graceful failure (return null)

**Guidelines Compliance:**
- ✅ Error handling for corrupted saves
- ✅ Fallback to new game

---

#### Task 6.2: Add Developer Tools

**File:** `react-app/src/components/game/GameView.tsx` (MODIFY)

**Changes:**
```typescript
export const GameView: React.FC<GameViewProps> = ({ ... }) => {
  // ... existing code ...

  // ✅ GUIDELINE: Developer tools (dev mode only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).getGameState = () => {
        console.log('[GameView] Current state:', gameState);
        return gameState;
      };

      (window as any).setGameState = (newState: CompleteGameState) => {
        console.log('[GameView] Setting state:', newState);
        setGameState(newState);
      };

      console.log('[GameView] Developer tools available:');
      console.log('  - window.getGameState()');
      console.log('  - window.setGameState(newState)');
    }
  }, [gameState]);

  // ... rest of component ...
};
```

**Rationale:**
- Expose state inspection tools in dev mode
- Allows debugging and manual state manipulation

**Guidelines Compliance:**
- ✅ Only enabled in development
- ✅ Console logging for developer experience

---

#### Task 6.3: Add Playtime Tracking

**File:** `react-app/src/components/game/GameView.tsx` (MODIFY)

**Changes:**
```typescript
const handleSave = useCallback(() => {
  // Calculate total playtime
  const currentSession = Date.now() - gameState.sessionStartTime;
  const totalPlaytime = gameState.totalPlaytime + (currentSession / 1000); // Convert to seconds

  // Update state with playtime before saving
  const stateWithPlaytime = {
    ...gameState,
    totalPlaytime,
  };

  const success = GameSaveManager.saveToSlot(stateWithPlaytime, 0);

  if (success) {
    console.log(`[GameView] Saved (playtime: ${Math.floor(totalPlaytime / 60)}m ${Math.floor(totalPlaytime % 60)}s)`);
  }

  return success;
}, [gameState]);
```

**Rationale:**
- Track session playtime
- Update total playtime on save
- Display playtime in save metadata

**Guidelines Compliance:**
- ✅ Immutable state update for playtime

---

### Phase 6 Testing Checklist

- [ ] Corrupted save shows error and falls back to new game
- [ ] Developer tools work in dev mode (window.getGameState)
- [ ] Playtime tracks correctly
- [ ] Save confirmation appears (if implemented)
- [ ] Loading screen appears during resource load

### Phase 6 Validation

```bash
npm run dev

# Manual testing:
# 1. Corrupt a save file in localStorage
# 2. Attempt to load
# 3. Verify fallback to new game
# 4. Open browser console
# 5. Call window.getGameState()
# 6. Verify state is logged
# 7. Play for 2 minutes
# 8. Save game
# 9. Verify playtime in console
```

---

## Testing Strategy

### Unit Tests

**File:** `react-app/src/services/GameSaveManager.test.ts` (NEW)

```typescript
import { GameSaveManager } from './GameSaveManager';
import type { CompleteGameState } from '../models/game/GameState';

describe('GameSaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and load game state', () => {
    const mockState: CompleteGameState = {
      currentView: 'exploration',
      partyState: { /* ... */ },
      gameState: { /* ... */ },
      sessionStartTime: Date.now(),
      totalPlaytime: 0,
    };

    const success = GameSaveManager.saveToSlot(mockState, 0);
    expect(success).toBe(true);

    const loaded = GameSaveManager.loadFromSlot(0);
    expect(loaded).not.toBeNull();
    expect(loaded?.currentView).toBe('exploration');
  });

  it('should handle corrupted save data', () => {
    localStorage.setItem('vibedc_game_save_slot_0', 'invalid json');

    const loaded = GameSaveManager.loadFromSlot(0);
    expect(loaded).toBeNull();
  });

  it('should serialize Maps and Sets correctly', () => {
    const mockState: CompleteGameState = {
      currentView: 'exploration',
      explorationState: {
        exploredTiles: new Set(['0,0', '1,1']),
        // ...
      },
      gameState: {
        globalVariables: new Map([['key', 'value']]),
        // ...
      },
      // ...
    };

    GameSaveManager.saveToSlot(mockState, 0);
    const loaded = GameSaveManager.loadFromSlot(0);

    expect(loaded?.explorationState?.exploredTiles).toBeInstanceOf(Set);
    expect(loaded?.gameState.globalVariables).toBeInstanceOf(Map);
  });
});
```

### Integration Tests

**Manual testing checklist:**

- [ ] Complete flow: exploration → combat → exploration
- [ ] Save during exploration, reload, verify state
- [ ] Save during combat, reload, verify state
- [ ] Export save file, clear storage, import, verify state
- [ ] Trigger combat via event system
- [ ] Complete combat, verify party HP updated
- [ ] F5 quick save during gameplay

### Performance Tests

**Metrics to validate:**

- [ ] Save/load completes in <500ms
- [ ] View transitions are smooth (60fps)
- [ ] No memory leaks during view switches
- [ ] Resource loading completes in <2s

---

## Risk Mitigation

### Risk 1: Save/Load Serialization Failures

**Risk:** Complex state objects (Maps, Sets, nested objects) may not serialize correctly

**Mitigation:**
- Leverage existing serialization (CombatState, HumanoidUnit)
- Add unit tests for Map/Set serialization
- Validate loaded state structure
- Fallback to new game on failure

**Validation:**
```bash
# Test Map serialization
const state = { gameState: { globalVariables: new Map([['key', 'value']]) } };
GameSaveManager.saveToSlot(state, 0);
const loaded = GameSaveManager.loadFromSlot(0);
assert(loaded.gameState.globalVariables instanceof Map);
```

### Risk 2: View Transition Timing Issues

**Risk:** View transitions may cause visual glitches or state inconsistencies

**Mitigation:**
- Use ViewTransitionManager state machine
- Block input during transitions
- Test transitions thoroughly
- Profile transition FPS

**Validation:**
```bash
# Manually trigger transitions and observe:
# - No visual glitches (flickering, rendering errors)
# - Smooth fade animation
# - Input blocked during transition
```

### Risk 3: Party State Sync Issues

**Risk:** Party HP/status may not sync correctly between views

**Mitigation:**
- Use immutable state updates
- Create snapshots for validation
- Add debug logging for state changes
- Test with knocked out units

**Validation:**
```bash
# Test party state sync:
# 1. Start with 100 HP
# 2. Enter combat, take damage to 50 HP
# 3. Exit combat
# 4. Verify exploration view shows 50 HP
# 5. Save and reload
# 6. Verify HP is still 50
```

### Risk 4: Memory Leaks During View Switching

**Risk:** Old views may not unmount properly, causing memory leaks

**Mitigation:**
- Profile memory usage during development
- Use React DevTools to verify unmounting
- Ensure cleanup in useEffect hooks
- Monitor browser memory tab

**Validation:**
```bash
# Use Chrome DevTools Memory tab:
# 1. Take heap snapshot
# 2. Switch views 10 times
# 3. Force garbage collection
# 4. Take another heap snapshot
# 5. Compare snapshots - memory should not grow significantly
```

---

## Success Criteria

### Minimum Viable Product (MVP)

- ✅ GameView renders FirstPersonView on mount
- ✅ Can transition from exploration to combat
- ✅ Can transition from combat to exploration
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
- ✅ Developer tools for state inspection
- ✅ All tests passing

### Polish & Quality

- ✅ No visual glitches during transitions
- ✅ No memory leaks during view switches
- ✅ Save/load completes in <500ms
- ✅ View transitions are smooth (60fps)
- ✅ Comprehensive error handling
- ✅ All edge cases covered
- ✅ Code follows GeneralGuidelines.md patterns

---

## Implementation Order

Execute phases in strict order due to dependencies:

1. **Phase 1: Core GameView Structure** (4h)
   - No dependencies
   - Foundational interfaces and components
   - Enables all other phases

2. **Phase 2: View Transitions** (3h)
   - Depends on Phase 1 (GameView component)
   - Independent from save/load
   - Can be tested with manual view switching

3. **Phase 3: Save/Load System** (5h)
   - Depends on Phase 1 (CompleteGameState interface)
   - Independent from transitions
   - Can be tested independently

4. **Phase 4: Party State Persistence** (4h)
   - Depends on Phase 1 (GameView state management)
   - Depends on Phase 3 (serialization)
   - Tests require save/load functionality

5. **Phase 5: Event Integration** (3h)
   - Depends on Phase 1 (GameView component)
   - Depends on Phase 2 (view transitions for combat)
   - Tests require working transitions

6. **Phase 6: Polish & Error Handling** (2h)
   - Depends on all phases
   - Final polish and edge cases
   - Comprehensive testing

**Total Time:** 21 hours

---

## Notes & Decisions

### Decision 1: Use ResourceManager for Shared Resources

**Choice:** Centralized ResourceManager service

**Alternatives:**
- Each view loads its own resources
- Global singleton resource cache

**Rationale:**
- Avoids redundant loading across views
- Centralized cache management
- Easier to profile and debug

**Tradeoff:**
- Slight complexity in prop passing
- Must ensure ResourceManager is cached in useMemo

### Decision 2: Immutable State Updates Throughout

**Choice:** Always use spread operator for state updates

**Alternatives:**
- Immer library for immutable updates
- Direct mutation (breaks React)

**Rationale:**
- Follows React best practices
- Enables proper change detection
- No additional dependencies

**Tradeoff:**
- Verbose spread syntax
- Must remember to create new objects

### Decision 3: Leverage Existing Serialization

**Choice:** Reuse serializeCombatState, HumanoidUnit.toJSON, etc.

**Alternatives:**
- Recreate serialization logic
- Use external library (e.g., class-transformer)

**Rationale:**
- Reduces implementation time (5h → 3h estimate reduction)
- Maintains consistency with existing code
- Already tested and working

**Tradeoff:**
- Must understand existing serialization methods
- Tightly coupled to existing implementations

### Decision 4: F5 Quick Save to Slot 0

**Choice:** F5 saves to slot 0 (auto-save slot)

**Alternatives:**
- Prompt for save slot
- Save to last used slot

**Rationale:**
- Quick and convenient
- Consistent with other games
- Prevents accidental overwrites of manual saves (future: use slots 1-3 for manual saves)

**Tradeoff:**
- Always overwrites slot 0
- No confirmation prompt (could be added later)

---

## Guidelines Compliance Summary

### Critical Guidelines Followed

1. ✅ **State Management**
   - Always capture and apply phase handler return values
   - Use immutable state updates (spread operator)
   - No state mutations

2. ✅ **Resource Management**
   - Cache ResourceManager in useMemo
   - Cache heavy objects (sprites, fonts)
   - Check cache before loading

3. ✅ **React Hook Dependencies**
   - Minimal dependencies in useCallback
   - Only include dependencies actually used
   - Access state via setGameState updater function

4. ✅ **Component Architecture**
   - Cache stateful components (managers)
   - Don't recreate on every render
   - Proper cleanup in useEffect

5. ✅ **Async Operations**
   - Sequential callbacks for state transitions
   - No setTimeout for state cleanup
   - Proper error handling

6. ✅ **Serialization**
   - Leverage existing methods (serializeCombatState, toJSON)
   - Don't recreate serialization logic
   - Handle Maps, Sets correctly

7. ✅ **Performance**
   - Don't call renderFrame() in high-frequency handlers
   - Cache resources
   - Profile memory usage

---

## Related Documents

- [GameView Feature Overview](./GameViewFeatureOverview.md) - Original feature design
- [GeneralGuidelines.md](../../GeneralGuidelines.md) - Development patterns
- [CombatHierarchy.md](../../CombatHierarchy.md) - Combat system architecture
- [FirstPersonView AreaMap System](../FirstPersonView/AreaMap/AreaMapSystemOverview.md) - Exploration view
- [Event System](../FirstPersonView/AreaMap/EventSystemOverview.md) - Event-driven state changes

---

**Document Status:** Draft
**Next Steps:** Begin Phase 1 implementation
**Author:** AI Agent
**Date:** 2025-02-01

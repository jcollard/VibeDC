import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CompleteGameState } from '../../models/game/GameState';
import { ResourceManager } from '../../services/ResourceManager';
import { ViewTransitionManager } from '../../services/ViewTransitionManager';
import { GameSaveManager } from '../../services/GameSaveManager';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { CombatEncounter } from '../../models/combat/CombatEncounter';
import { FirstPersonView } from '../firstperson/FirstPersonView';
import { CombatView } from '../combat/CombatView';
import type { CombatUnit } from '../../models/combat/CombatUnit';

interface GameViewProps {
  initialMapId?: string;
  autoLoadSave?: boolean;
  onGameReady?: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  initialMapId = 'event-demo-map',
  autoLoadSave = true,
  onGameReady
}) => {
  // ✅ GUIDELINE: Cache manager instances in useMemo
  const resourceManager = useMemo(() => new ResourceManager(), []);
  const transitionManager = useMemo(() => new ViewTransitionManager(), []);

  // ✅ GUIDELINE: Initialize game state immutably
  const [gameState, setGameState] = useState<CompleteGameState>(() => {
    // ✅ GUIDELINE: Auto-load from quick save slot if enabled
    if (autoLoadSave) {
      const savedState = GameSaveManager.quickLoad();
      if (savedState) {
        console.log('[GameView] Loaded from quick save');
        return savedState;
      }
    }

    // Create new game state
    console.log('[GameView] Starting new game');
    return createNewGameState(initialMapId);
  });

  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);

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

  // ✅ GUIDELINE: F5 quick save handler
  const handleQuickSave = useCallback(() => {
    const success = GameSaveManager.quickSave(gameState);
    if (success) {
      console.log('[GameView] Quick save successful (F5)');
      // TODO: Show save confirmation UI
    } else {
      console.error('[GameView] Quick save failed');
      // TODO: Show error UI
    }
  }, [gameState]);

  // ✅ GUIDELINE: Keyboard event listener for F5 quick save
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F5 key
      if (event.key === 'F5') {
        event.preventDefault(); // Prevent browser refresh
        handleQuickSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleQuickSave]);

  // ✅ GUIDELINE: View transition handlers
  const handleStartCombat = useCallback(async (encounterId: string) => {
    console.log(`[GameView] Starting combat: ${encounterId}`);

    setIsTransitioning(true);
    await transitionManager.transitionTo(
      gameState.currentView,
      'combat',
      () => {
        // ✅ GUIDELINE: Immutable state update
        setGameState(prevState => ({
          ...prevState,
          currentView: 'combat',
          // TODO: Phase 4 - Initialize proper CombatState from encounter
          combatState: undefined, // Will use encounter prop in CombatView for now
        }));
        // Store encounter ID separately (not in CompleteGameState yet)
        setActiveEncounterId(encounterId);
      }
    );
    setIsTransitioning(false);
  }, [gameState.currentView, transitionManager]);

  const handleCombatEnd = async (victory: boolean) => {
    console.log(`[GameView] Combat ended - Victory: ${victory}`);

    setIsTransitioning(true);
    await transitionManager.transitionTo(
      gameState.currentView,
      'exploration',
      () => {
        // ✅ GUIDELINE: Immutable state update
        setGameState(prevState => ({
          ...prevState,
          currentView: 'exploration',
          // TODO: Phase 4 - Apply combat results to party state
          // TODO: Phase 5 - Trigger post-combat events
          combatState: undefined,
        }));
        // Clear active encounter
        setActiveEncounterId(null);
      }
    );
    setIsTransitioning(false);
  };

  // 🛠️ DEVELOPER: Expose combat transition function for testing
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).startEncounter = (encounterId: string) => {
        console.log(`[DEV] Starting encounter: ${encounterId}`);
        handleStartCombat(encounterId);
      };

      console.log('[DEV] Developer function available: startEncounter(id)');

      return () => {
        delete (window as any).startEncounter;
      };
    }
  }, [handleStartCombat]);

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

  // ✅ GUIDELINE: Render current view with fade transition
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#0a0a0a',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: isTransitioning ? 0 : 1,
          transition: `opacity ${transitionManager.getTransitionDuration() / 2}ms ease-in-out`,
        }}
      >
        {gameState.currentView === 'exploration' && gameState.explorationState && (
          <FirstPersonView
            mapId={gameState.explorationState.currentMapId}
            onStartCombat={handleStartCombat}
            resourceManager={resourceManager}
            initialState={gameState.explorationState}
            partyState={gameState.partyState}
            gameState={gameState.gameState}
          />
        )}

        {gameState.currentView === 'combat' && activeEncounterId && (
          <CombatView
            encounter={CombatEncounter.getById(activeEncounterId) || undefined}
            combatState={gameState.combatState}
            onCombatEnd={handleCombatEnd}
            resourceManager={resourceManager}
            partyState={gameState.partyState}
          />
        )}
      </div>
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

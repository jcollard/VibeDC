import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CompleteGameState, ExplorationState, PartyState, GameViewType } from '../../models/game/GameState';
import { ResourceManager } from '../../services/ResourceManager';
import { ViewTransitionManager } from '../../services/ViewTransitionManager';
import { GameSaveManager } from '../../services/GameSaveManager';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { GuildRosterRegistry } from '../../utils/GuildRosterRegistry';
import { PartyInventory } from '../../utils/inventory/PartyInventory';
import { CombatEncounter } from '../../models/combat/CombatEncounter';
import { FirstPersonView } from '../firstperson/FirstPersonView';
import { CombatView } from '../combat/CombatView';
import { PartyManagementView } from '../inventory/PartyManagementView';
import { GuildHallView } from '../guild/GuildHallView';
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
        await resourceManager.loadSprites();
        setResourcesLoaded(true);
        onGameReady?.();
      } catch (error) {
        console.error('[GameView] Resource load failed:', error);
        setLoadError(error as Error);
      }
    };

    loadResources();
  }, [resourceManager, onGameReady]);

  // ✅ GUIDELINE: Sync to registries if loading into party management view
  useEffect(() => {
    if (gameState.currentView === 'party-management') {
      console.log('[GameView] Loaded into party management view - syncing to registries');
      syncPartyStateToRegistries(gameState.partyState);
    }
  }, []); // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps

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

  // ✅ GUIDELINE: Sync party state TO registries (before opening party management)
  const syncPartyStateToRegistries = useCallback((partyState: PartyState): void => {
    console.log('[GameView] Syncing party state to registries');

    // Clear both registries
    PartyMemberRegistry.clear();
    GuildRosterRegistry.clear();

    // Sync to PartyMemberRegistry: ONLY active party members (max 4)
    // PartyManagementView uses this registry exclusively
    partyState.members.forEach(member => {
      // Find the character definition in guild roster by name
      const character = partyState.guildRoster.find(c => c.name === member.name);
      if (character) {
        // Register the definition
        PartyMemberRegistry.register(character);
        // Update it with current stats from the CombatUnit
        PartyMemberRegistry.updateFromUnit(character.id, member as any);
      }
    });

    // Sync to GuildRosterRegistry: ALL guild characters
    // GuildHallView uses this registry for the full roster
    partyState.guildRoster.forEach(character => {
      GuildRosterRegistry.register(character);
    });

    // Update PartyInventory from partyState.inventory
    PartyInventory.clear();
    partyState.inventory.items.forEach(item => {
      PartyInventory.addItem(item.itemId, item.quantity);
    });
    PartyInventory.addGold(partyState.inventory.gold);
  }, []);

  // ✅ GUIDELINE: Sync party state FROM registries (after closing party management)
  const syncRegistriesToPartyState = useCallback((): PartyState => {
    console.log('[GameView] Syncing registries to party state');

    // Get active party from PartyMemberRegistry (max 4 members)
    const partyMembers = PartyMemberRegistry.getAll()
      .map(config => PartyMemberRegistry.createPartyMember(config.id))
      .filter((unit): unit is CombatUnit => unit !== undefined);

    // Get full guild roster from GuildRosterRegistry
    const guildRoster = GuildRosterRegistry.getAll();

    const items = PartyInventory.getAllItems().map(item => ({
      itemId: item.equipmentId,
      quantity: item.quantity,
    }));

    const gold = PartyInventory.getGold();

    return {
      members: partyMembers,
      guildRoster: guildRoster,
      inventory: { items, gold },
      equipment: new Map(), // TODO: Extract equipment from members if needed
    };
  }, []);

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

  const handleCombatEnd = useCallback(async (victory: boolean) => {
    console.log(`[GameView] Combat ended - Victory: ${victory}`);

    setIsTransitioning(true);
    await transitionManager.transitionTo(
      gameState.currentView,
      'exploration',
      () => {
        // Sync registry changes (XP, gold, items) back to partyState
        const updatedPartyState = syncRegistriesToPartyState();

        // ✅ GUIDELINE: Immutable state update
        setGameState(prevState => ({
          ...prevState,
          currentView: 'exploration',
          partyState: updatedPartyState, // Use updated state with XP gains
          // TODO: Phase 5 - Trigger post-combat events
          combatState: undefined,
        }));
        // Clear active encounter
        setActiveEncounterId(null);
      }
    );
    setIsTransitioning(false);
  }, [gameState.currentView, transitionManager, syncRegistriesToPartyState]);

  // Helper for transitioning to exploration view
  const handleStartExploration = useCallback(async () => {
    console.log('[GameView] Transitioning to exploration view');

    setIsTransitioning(true);
    await transitionManager.transitionTo(
      gameState.currentView,
      'exploration',
      () => {
        // ✅ GUIDELINE: Immutable state update
        setGameState(prevState => ({
          ...prevState,
          currentView: 'exploration',
          combatState: undefined,
        }));
        // Clear active encounter
        setActiveEncounterId(null);
      }
    );
    setIsTransitioning(false);
  }, [gameState.currentView, transitionManager]);

  // Callback for FirstPersonView to sync exploration state changes
  const handleExplorationStateChange = useCallback((explorationState: ExplorationState) => {
    setGameState(prevState => ({
      ...prevState,
      explorationState,
    }));
  }, []);

  // Callback for GuildHallView to sync party state changes
  const handlePartyStateChange = useCallback((partyState: CompleteGameState['partyState']) => {
    setGameState(prevState => ({
      ...prevState,
      partyState,
    }));
  }, []);

  // ✅ GUIDELINE: Party management transition handlers
  const handleOpenPartyManagement = useCallback(async (fromView: 'exploration' | 'combat') => {
    console.log('[GameView] Opening party management');

    // Sync party state TO registries before opening
    syncPartyStateToRegistries(gameState.partyState);

    setIsTransitioning(true);
    await transitionManager.transitionTo(
      gameState.currentView,
      'party-management',
      () => {
        setGameState(prevState => ({
          ...prevState,
          currentView: 'party-management',
          partyManagementState: {
            returnToView: fromView,
          },
        }));
      }
    );
    setIsTransitioning(false);
  }, [gameState.currentView, gameState.partyState, transitionManager, syncPartyStateToRegistries]);

  const handleClosePartyManagement = useCallback(async () => {
    const returnTo = gameState.partyManagementState?.returnToView || 'exploration';
    console.log(`[GameView] Closing party management, returning to ${returnTo}`);

    setIsTransitioning(true);
    await transitionManager.transitionTo(
      'party-management',
      returnTo,
      () => {
        // Sync party state FROM registries before closing
        const updatedPartyState = syncRegistriesToPartyState();

        setGameState(prevState => ({
          ...prevState,
          currentView: returnTo,
          partyState: updatedPartyState,
          partyManagementState: undefined,
        }));
      }
    );
    setIsTransitioning(false);
  }, [gameState.partyManagementState, transitionManager, syncRegistriesToPartyState]);

  // Helper for transitioning to guild hall view
  const handleTransitionToGuildHall = useCallback(async () => {
    console.log('[GameView] Transitioning to guild hall view');

    setIsTransitioning(true);
    await transitionManager.transitionTo(
      gameState.currentView,
      'guild-hall',
      () => {
        setGameState(prevState => ({
          ...prevState,
          currentView: 'guild-hall',
        }));
      }
    );
    setIsTransitioning(false);
  }, [gameState.currentView, transitionManager]);

  // Helper for transitioning to menu view
  const handleTransitionToMenu = useCallback(async () => {
    console.log('[GameView] Transitioning to menu view');

    setIsTransitioning(true);
    await transitionManager.transitionTo(
      gameState.currentView,
      'menu',
      () => {
        setGameState(prevState => ({
          ...prevState,
          currentView: 'menu',
        }));
      }
    );
    setIsTransitioning(false);
  }, [gameState.currentView, transitionManager]);

  // Navigation handler for views
  const handleNavigate = useCallback(async (view: GameViewType, params?: any) => {
    if (view === 'exploration') {
      handleStartExploration();
    } else if (view === 'menu') {
      handleTransitionToMenu();
    } else if (view === 'combat' && params?.encounterId) {
      handleStartCombat(params.encounterId);
    } else if (view === 'guild-hall') {
      handleTransitionToGuildHall();
    }
  }, [handleStartExploration, handleTransitionToMenu, handleStartCombat, handleTransitionToGuildHall]);

  // 🛠️ DEVELOPER: Expose view transition functions for testing
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).startEncounter = (encounterId: string) => {
        console.log(`[DEV] Starting encounter: ${encounterId}`);
        handleStartCombat(encounterId);
      };

      (window as any).startFirstPersonView = () => {
        console.log('[DEV] Transitioning to first-person exploration view');
        handleStartExploration();
      };

      (window as any).openPartyManagement = () => {
        console.log('[DEV] Opening party management');
        handleOpenPartyManagement('exploration');
      };

      (window as any).checkPartyXP = () => {
        const configs = PartyMemberRegistry.getAll();
        console.log('[DEV] Party XP values:');
        configs.forEach(config => {
          console.log(`  ${config.name}:`);
          console.log(`    Total XP: ${config.totalExperience || 0}`);
          console.log(`    Class XP:`, config.classExperience || {});
        });
      };

      (window as any).checkInventory = () => {
        console.log('[DEV] Party Inventory:');
        console.log(`  Gold: ${PartyInventory.getGold()}`);
        console.log(`  Items:`, PartyInventory.getAllItems());
      };

      (window as any).startGuildHall = () => {
        console.log('[DEV] Transitioning to guild hall view');
        handleTransitionToGuildHall();
      };

      (window as any).startMenu = () => {
        console.log('[DEV] Transitioning to menu view');
        handleTransitionToMenu();
      };

      console.log('[DEV] Developer functions available:');
      console.log('  - startEncounter(id): Start combat with encounter ID');
      console.log('  - startFirstPersonView(): Return to exploration view');
      console.log('  - openPartyManagement(): Open party management view');
      console.log('  - checkPartyXP(): Show party XP values from registry');
      console.log('  - checkInventory(): Show party inventory and gold');
      console.log('  - startGuildHall(): Go to guild hall');
      console.log('  - startMenu(): Go to menu');

      return () => {
        delete (window as any).startEncounter;
        delete (window as any).startFirstPersonView;
        delete (window as any).openPartyManagement;
        delete (window as any).checkPartyXP;
        delete (window as any).checkInventory;
        delete (window as any).startGuildHall;
        delete (window as any).startMenu;
      };
    }
  }, [handleStartCombat, handleStartExploration, handleOpenPartyManagement, handleTransitionToGuildHall, handleTransitionToMenu]);

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
            onOpenPartyManagement={() => handleOpenPartyManagement('exploration')}
            onExplorationStateChange={handleExplorationStateChange}
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

        {gameState.currentView === 'party-management' && (
          <PartyManagementView
            onClose={handleClosePartyManagement}
          />
        )}

        {gameState.currentView === 'guild-hall' && (
          <GuildHallView
            partyState={gameState.partyState}
            onPartyStateChange={handlePartyStateChange}
            onNavigate={handleNavigate}
            resourceManager={resourceManager}
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
      guildRoster: [],
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

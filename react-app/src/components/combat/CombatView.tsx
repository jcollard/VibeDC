import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import { CombatEncounter } from '../../models/combat/CombatEncounter';
import type { CombatPhaseHandler } from '../../models/combat/CombatPhaseHandler';
import type { CombatUnit } from '../../models/combat/CombatUnit';
import { DeploymentPhaseHandler, type DeploymentPanelData } from '../../models/combat/DeploymentPhaseHandler';
import { EnemyDeploymentPhaseHandler } from '../../models/combat/EnemyDeploymentPhaseHandler';
import { ActionTimerPhaseHandler } from '../../models/combat/ActionTimerPhaseHandler';
import { UnitTurnPhaseHandler } from '../../models/combat/UnitTurnPhaseHandler';
import { UIConfig } from '../../config/UIConfig';
import { UISettings } from '../../config/UISettings';
import { CombatUnitManifest } from '../../models/combat/CombatUnitManifest';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { CinematicManager } from '../../models/combat/CinematicSequence';
import { ScreenFadeInSequence } from '../../models/combat/ScreenFadeInSequence';
import { CombatConstants } from '../../models/combat/CombatConstants';
import { CombatInputHandler } from '../../services/CombatInputHandler';
import { SpriteAssetLoader } from '../../services/SpriteAssetLoader';
import { FontAtlasLoader } from '../../services/FontAtlasLoader';
import { CombatUIStateManager } from '../../models/combat/CombatUIState';
import { useCombatUIState } from '../../hooks/useCombatUIState';
import { CombatRenderer } from '../../models/combat/rendering/CombatRenderer';
import { CombatLogManager } from '../../models/combat/CombatLogManager';
import { FontRegistry } from '../../utils/FontRegistry';
import { CombatLayoutManager } from '../../models/combat/layouts/CombatLayoutManager';
import { CombatMapRenderer } from '../../models/combat/rendering/CombatMapRenderer';
import { InfoPanelManager } from '../../models/combat/managers/InfoPanelManager';
import { TopPanelManager } from '../../models/combat/managers/TopPanelManager';
import { TurnOrderRenderer } from '../../models/combat/managers/renderers/TurnOrderRenderer';
import type { PanelClickResult } from '../../models/combat/managers/panels/PanelContent';
import '../../utils/CombatDebugger'; // Initialize debug utilities
import {
  exportCombatToFile,
  importCombatFromFile,
  saveCombatToLocalStorage,
  loadCombatFromLocalStorage,
  saveCombatToSlot,
  loadCombatFromSlot,
  getAllSlotMetadata,
  type SaveSlotMetadata,
} from '../../utils/combatStorage';
import { LoadingView, type LoadResult } from './LoadingView';

interface CombatViewProps {
  encounter: CombatEncounter;
}

// Canvas dimensions - now using base resolution without internal scaling
const SPRITE_SIZE = CombatConstants.SPRITE_SIZE; // 12x12 pixels
const TILE_SIZE = CombatConstants.TILE_SIZE; // 12x12 pixels (1:1 with sprite size)
const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH; // 384 pixels (32 tiles)
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT; // 216 pixels (18 tiles)

/**
 * CombatView is the main view for displaying and interacting with combat encounters.
 * This is a placeholder component that will be expanded as the combat system is implemented.
 */
export const CombatView: React.FC<CombatViewProps> = ({ encounter }) => {
  // Initialize combat state from the encounter
  const [combatState, setCombatState] = useState<CombatState>({
    turnNumber: 0,
    map: encounter.map,
    tilesetId: encounter.tilesetId || 'default',
    phase: 'deployment', // Start in deployment phase
    unitManifest: new CombatUnitManifest(),
  });

  // Initialize UI state manager
  const uiStateManager = useMemo(() => new CombatUIStateManager(), []);
  // Subscribe to UI state changes to trigger re-renders when state changes
  const uiState = useCombatUIState(uiStateManager);

  // Initialize phase handler based on current phase (pass UI state manager)
  const phaseHandlerRef = useRef<CombatPhaseHandler>(new DeploymentPhaseHandler(uiStateManager));

  // Track loaded encounter (overrides prop when loading a save)
  const loadedEncounterRef = useRef<CombatEncounter | null>(null);

  // Get active encounter (loaded encounter takes precedence over prop)
  const activeEncounter = loadedEncounterRef.current ?? encounter;

  // Switch phase handler when phase changes
  useEffect(() => {
    if (combatState.phase === 'deployment') {
      phaseHandlerRef.current = new DeploymentPhaseHandler(uiStateManager);
    } else if (combatState.phase === 'enemy-deployment') {
      phaseHandlerRef.current = new EnemyDeploymentPhaseHandler();
    } else if (combatState.phase === 'action-timer') {
      phaseHandlerRef.current = new ActionTimerPhaseHandler();
    } else if (combatState.phase === 'unit-turn') {
      phaseHandlerRef.current = new UnitTurnPhaseHandler();
    }
    // Add other phase handlers as needed (victory, defeat)
  }, [combatState.phase, uiStateManager]);

  // Initialize cinematic manager
  const cinematicManagerRef = useRef<CinematicManager>(new CinematicManager());

  // Track if the intro cinematic has already played
  const introCinematicPlayedRef = useRef<boolean>(false);

  // Track if combat log has been initialized
  const combatLogInitializedRef = useRef<boolean>(false);

  // Animation timing
  const lastFrameTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Canvas refs for double buffering
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Input handler for coordinate conversion and input blocking
  const inputHandler = useMemo(
    () => new CombatInputHandler(displayCanvasRef, CANVAS_WIDTH, CANVAS_HEIGHT),
    []
  );

  // Sprite asset loader
  const spriteLoader = useMemo(() => new SpriteAssetLoader(), []);

  // Font atlas loader
  const fontLoader = useMemo(() => new FontAtlasLoader(), []);

  // Combat renderer for map and unit rendering
  const renderer = useMemo(
    () => new CombatRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, SPRITE_SIZE),
    []
  );

  // Store loaded sprite images
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Track if sprites and fonts are loaded
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Track window resize to force re-render
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track integer scaling setting
  const [integerScalingEnabled, setIntegerScalingEnabled] = useState<boolean>(
    UISettings.isIntegerScalingEnabled()
  );

  // Track manual scale factor - default to 3x
  const [manualScale, setManualScale] = useState<number>(() => {
    const savedScale = UISettings.getManualScale();
    // If no saved scale, default to 3x
    if (savedScale === 0) {
      UISettings.setManualScale(3);
      return 3;
    }
    return savedScale;
  });

  // Track canvas display style for integer scaling
  const [canvasDisplayStyle, setCanvasDisplayStyle] = useState<{ width: string; height: string }>({
    width: '100%',
    height: '100%',
  });

  // Calculate and update canvas display dimensions based on integer scaling setting
  useEffect(() => {
    const updateCanvasStyle = () => {
      const containerRef = displayCanvasRef.current?.parentElement;
      if (!containerRef) {
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
        return;
      }

      const scaledDimensions = UISettings.getIntegerScaledDimensions(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        containerRef.clientWidth,
        containerRef.clientHeight
      );

      if (scaledDimensions) {
        // Integer scaling enabled - use exact pixel dimensions
        setCanvasDisplayStyle({
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
        });
      } else {
        // Integer scaling disabled - use percentage to fill container
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
      }
    };

    // Update immediately
    updateCanvasStyle();

    // Also update on next frame to ensure container is measured
    requestAnimationFrame(updateCanvasStyle);
  }, [windowSize.width, windowSize.height, integerScalingEnabled, manualScale]);

  // Track selected font atlases from FontRegistry
  const [titleAtlasFont, setTitleAtlasFont] = useState<string>('15px-dungeonslant');
  const [messageAtlasFont, setMessageAtlasFont] = useState<string>('7px-04b03');
  const [dialogAtlasFont, setDialogAtlasFont] = useState<string>('7px-04b03');
  const [unitInfoAtlasFont, setUnitInfoAtlasFont] = useState<string>('7px-04b03');

  // Handle integer scaling toggle
  const handleIntegerScalingToggle = useCallback((enabled: boolean) => {
    UISettings.setIntegerScaling(enabled);
    setIntegerScalingEnabled(enabled);
    // State change will trigger useEffect recalculation via dependency
  }, []);

  // Handle manual scale change
  const handleManualScaleChange = useCallback((scale: number) => {
    UISettings.setManualScale(scale);
    setManualScale(scale);
    // State change will trigger useEffect recalculation via dependency
  }, []);

  // Track the last displayed unit for info panel persistence
  const lastDisplayedUnitRef = useRef<CombatUnit | null>(null);

  // Track the target unit for the info panel
  const targetUnitRef = useRef<CombatUnit | null>(null);

  // Track the hovered party member index (for visual feedback)
  const hoveredPartyMemberRef = useRef<number | null>(null);

  // Track highlight color for testing
  const [highlightColor, setHighlightColor] = useState<string>('#ccaa00');

  // Track debug grid overlay
  const [showDebugGrid, setShowDebugGrid] = useState<boolean>(false);

  // Track map scroll offset (in tiles)
  const [mapScrollX, setMapScrollX] = useState<number>(0);
  const [mapScrollY, setMapScrollY] = useState<number>(0);

  // Save/load state
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Quick save slot state
  const [slotMetadata, setSlotMetadata] = useState<(SaveSlotMetadata | null)[]>(() => getAllSlotMetadata());
  const slotToLoadRef = useRef<number | null>(null);

  // Loading state (for LoadingView component)
  const [isLoading, setIsLoading] = useState(false);
  const [showCombatView, setShowCombatView] = useState(true);
  const canvasSnapshotRef = useRef<HTMLCanvasElement | null>(null);
  const fileToImportRef = useRef<File | null>(null);

  // Track which scroll arrow is currently pressed
  const scrollArrowPressedRef = useRef<'right' | 'left' | 'up' | 'down' | 'logUp' | 'logDown' | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Layout renderer (always use Layout 6)
  const layoutRenderer = useMemo(() => new CombatLayoutManager(), []);

  // Map renderer for offset calculations
  const mapRenderer = useMemo(
    () => new CombatMapRenderer(TILE_SIZE, layoutRenderer, CANVAS_WIDTH, CANVAS_HEIGHT),
    [layoutRenderer]
  );

  // Combat log manager
  const combatLogManager = useMemo(() => new CombatLogManager({
    maxMessages: 100,
    bufferLines: 21,
    lineHeight: 8,
    defaultColor: '#ffffff',
  }), []);

  // Info panel managers
  const bottomInfoPanelManager = useMemo(() => new InfoPanelManager(), []); // Bottom-right panel
  const topInfoPanelManager = useMemo(() => new InfoPanelManager(), []); // Top-right panel

  // Top panel manager
  const topPanelManager = useMemo(() => new TopPanelManager(), []);

  // Get party units (used for deployment phase)
  const partyUnits = useMemo(() => {
    const partyMembers = PartyMemberRegistry.getAll();
    return partyMembers
      .map(member => PartyMemberRegistry.createPartyMember(member.id))
      .filter((unit): unit is CombatUnit => unit !== undefined);
  }, []);

  // Switch top panel renderer based on combat phase
  useEffect(() => {
    // Get top panel renderer from phase handler
    if (phaseHandlerRef.current.getTopPanelRenderer) {
      const renderer = phaseHandlerRef.current.getTopPanelRenderer(combatState, activeEncounter);
      topPanelManager.setRenderer(renderer);
    } else {
      // Fallback for phases that don't provide a renderer
      // Show turn order during combat phase (default)
      const turnOrderRenderer = new TurnOrderRenderer(partyUnits, (clickedUnit) => {
        // When a unit is clicked in turn order, set it as the target unit
        targetUnitRef.current = clickedUnit;
      });

      topPanelManager.setRenderer(turnOrderRenderer);
    }
  }, [topPanelManager, combatState, activeEncounter, partyUnits]);

  // Update UIConfig when highlight color changes
  useEffect(() => {
    UIConfig.setHighlightColor(highlightColor);
  }, [highlightColor]);

  // Combat log is initialized in the animation loop after cinematic completes

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load font atlas images using FontAtlasLoader
  useEffect(() => {
    const loadFontAtlases = async () => {
      const fontIds = FontRegistry.getAllIds();
      await fontLoader.loadAll(fontIds);
    };

    loadFontAtlases().catch(console.error);
  }, [fontLoader]);

  // Load sprite images using SpriteAssetLoader
  useEffect(() => {
    const loadSprites = async () => {
      const result = await spriteLoader.loadSprites(
        combatState,
        activeEncounter,
        phaseHandlerRef.current
      );

      if (result.loaded) {
        spriteImagesRef.current = result.spriteSheets;
        setSpritesLoaded(true);
      } else {
        console.error('Failed to load sprites:', result.error);
      }
    };

    loadSprites().catch(console.error);
  }, [combatState.map, combatState.phase, activeEncounter, spriteLoader]);

  // Start the intro cinematic sequence when encounter loads (only once)
  useEffect(() => {
    if (spritesLoaded && !introCinematicPlayedRef.current) {
      introCinematicPlayedRef.current = true;

      // Create and play screen fade-in animation (2 seconds, ease-in-out)
      const fadeInSequence = new ScreenFadeInSequence(2.0);
      cinematicManagerRef.current.play(fadeInSequence, combatState, activeEncounter);
    }
  }, [spritesLoaded, combatState, encounter]);

  // Render function - draws one frame to the canvas
  const renderFrame = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas || !spritesLoaded) {
      return;
    }

    // Create or get the buffer canvas
    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
    }
    const bufferCanvas = bufferCanvasRef.current;

    // Set canvas sizes to 1440x960
    bufferCanvas.width = CANVAS_WIDTH;
    bufferCanvas.height = CANVAS_HEIGHT;
    displayCanvas.width = CANVAS_WIDTH;
    displayCanvas.height = CANVAS_HEIGHT;

    // Calculate map dimensions
    const mapWidthInTiles = combatState.map.width;
    const mapHeightInTiles = combatState.map.height;

    // Get scroll capabilities
    const { canScrollRight, canScrollLeft, canScrollUp, canScrollDown } =
      mapRenderer.getScrollCapabilities(mapWidthInTiles, mapHeightInTiles, mapScrollX, mapScrollY);

    // Calculate map offsets using the map renderer
    const { offsetX, offsetY } = mapRenderer.calculateMapOffset(
      mapWidthInTiles,
      mapHeightInTiles,
      mapScrollX,
      mapScrollY
    );

    // Get clipping region for canvas clipping rect
    const clipRegion = layoutRenderer.getMapClipRegion();

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) return;

    // Clear and prepare the buffer canvas
    renderer.clearCanvas(ctx);

    // Apply clipping region to map viewport (in absolute screen tile coordinates)
    // Expand by 4px on top, right, and bottom
    const clipX = clipRegion.minCol * TILE_SIZE;
    const clipY = clipRegion.minRow * TILE_SIZE - 4;
    const clipWidth = (clipRegion.maxCol - clipRegion.minCol + 1) * TILE_SIZE + 4;
    const clipHeight = (clipRegion.maxRow - clipRegion.minRow + 1) * TILE_SIZE + 4 + 4;

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, clipY, clipWidth, clipHeight);
    ctx.clip();

    // Render the combat map
    renderer.renderMap(ctx, combatState.map, spriteImagesRef.current, offsetX, offsetY);

    // Render phase-specific overlays using the phase handler (before units so deployment zones appear below)
    phaseHandlerRef.current.render(combatState, activeEncounter, {
      ctx,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      tileSize: TILE_SIZE,
      spriteSize: SPRITE_SIZE,
      offsetX,
      offsetY,
      spriteImages: spriteImagesRef.current,
      fontAtlasImages: fontLoader.getAll(),
      combatLog: combatLogManager,
    });

    // Render deployed units from the manifest (after deployment zones so they appear on top)
    renderer.renderUnits(ctx, combatState.unitManifest, spriteImagesRef.current, offsetX, offsetY);

    // Render phase-specific UI overlays (after units so cursors appear on top)
    if (phaseHandlerRef.current.renderUI) {
      phaseHandlerRef.current.renderUI(combatState, activeEncounter, {
        ctx,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        tileSize: TILE_SIZE,
        spriteSize: SPRITE_SIZE,
        offsetX,
        offsetY,
        spriteImages: spriteImagesRef.current,
        fontAtlasImages: fontLoader.getAll(),
        combatLog: combatLogManager,
      });
    }

    ctx.restore();

    // Update top panel renderer for action-timer and unit-turn phases
    // (needs to update every frame to re-sort units by current action timer values)
    if (combatState.phase === 'action-timer' || combatState.phase === 'unit-turn') {
      if (phaseHandlerRef.current.getTopPanelRenderer) {
        const renderer = phaseHandlerRef.current.getTopPanelRenderer(combatState, activeEncounter);
        topPanelManager.setRenderer(renderer);
      }
    }

    // Get units to display from phase handler (for unit-turn phase)
    let currentUnitToDisplay: CombatUnit | null = null;
    let targetUnitToDisplay: CombatUnit | null = targetUnitRef.current;

    if (combatState.phase === 'unit-turn') {
      const handler = phaseHandlerRef.current as any;
      // Get active unit for bottom panel (Active Unit)
      if (typeof handler.getActiveUnit === 'function') {
        currentUnitToDisplay = handler.getActiveUnit();
      }
      // Get targeted unit for top panel (Unit Info) - overrides turn order selection
      if (typeof handler.getTargetedUnit === 'function') {
        const targeted = handler.getTargetedUnit();
        if (targeted) {
          targetUnitToDisplay = targeted;
        }
      }
    }

    // Render layout UI
    // Use 7px-04b03 for info panels/combat log and small text in top panel
    // Use 15px-dungeonslant for main top panel text
    const layoutFontAtlas = fontLoader.get(unitInfoAtlasFont) || null;
    const topPanelFontAtlas = fontLoader.get('15px-dungeonslant') || null;
    const topPanelSmallFontAtlas = fontLoader.get('7px-04b03') || null;

    layoutRenderer.renderLayout({
      ctx,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      spriteSize: SPRITE_SIZE,
      fontId: unitInfoAtlasFont,
      fontAtlasImage: layoutFontAtlas,
      topPanelFontAtlasImage: topPanelFontAtlas,
      topPanelSmallFontAtlasImage: topPanelSmallFontAtlas,
      spriteImages: spriteImagesRef.current,
      currentUnit: currentUnitToDisplay, // Bottom panel - active unit whose turn it is
      targetUnit: targetUnitToDisplay, // Top panel - targeted unit or turn order selection
      partyUnits: partyUnits, // Used during deployment phase
      isDeploymentPhase: combatState.phase === 'deployment',
      isEnemyDeploymentPhase: combatState.phase === 'enemy-deployment',
      hoveredPartyMemberIndex: hoveredPartyMemberRef.current, // For hover visual feedback
      deployedUnitCount: combatState.unitManifest.getAllUnits().length,
      totalDeploymentZones: activeEncounter.playerDeploymentZones.length,
      onEnterCombat: () => {
        combatLogManager.addMessage(CombatConstants.TEXT.STARTING_ENEMY_DEPLOYMENT);
        setCombatState({ ...combatState, phase: 'enemy-deployment' });
      },
      combatLogManager,
      currentUnitPanelManager: bottomInfoPanelManager,
      targetUnitPanelManager: topInfoPanelManager,
      topPanelManager,
    });

    // Render map scroll arrows (after layout, before debug grid)
    const unitInfoFontAtlas = fontLoader.get(unitInfoAtlasFont) || null;
    layoutRenderer.renderMapScrollArrows({
      ctx,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      spriteSize: SPRITE_SIZE,
      fontId: unitInfoAtlasFont,
      fontAtlasImage: unitInfoFontAtlas,
      spriteImages: spriteImagesRef.current,
      currentUnit: lastDisplayedUnitRef.current,
      targetUnit: null,
      combatLogManager,
    }, canScrollRight, canScrollLeft, canScrollUp, canScrollDown);

    // Render debug grid overlay (if enabled)
    if (showDebugGrid) {
      const debugFontAtlas = fontLoader.get('7px-04b03') || null;
      renderer.renderDebugGrid(ctx, '7px-04b03', debugFontAtlas);
    }

    // Render cinematic overlay (e.g., screen fade-in) AFTER all other rendering
    if (cinematicManagerRef.current.isPlayingCinematic()) {
      cinematicManagerRef.current.render(combatState, activeEncounter, {
        ctx,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        tileSize: TILE_SIZE,
        spriteSize: SPRITE_SIZE,
        offsetX,
        offsetY,
        spriteImages: spriteImagesRef.current,
      });
    }

    // Copy buffer to display canvas
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      renderer.displayBuffer(displayCtx, bufferCanvas);
    }
  }, [spritesLoaded, combatState, windowSize, activeEncounter, renderer, uiState, titleAtlasFont, messageAtlasFont, dialogAtlasFont, unitInfoAtlasFont, layoutRenderer, mapRenderer, showDebugGrid, mapScrollX, mapScrollY]);

  // Animation loop
  useEffect(() => {
    if (!spritesLoaded) {
      return;
    }

    const animate = (currentTime: number) => {
      // Calculate delta time in seconds
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      // Update cinematic manager (has priority over phase updates)
      const cinematicPlaying = cinematicManagerRef.current.update(deltaTime);

      // Initialize combat log after cinematic completes
      if (!cinematicPlaying && introCinematicPlayedRef.current && !combatLogInitializedRef.current) {
        combatLogInitializedRef.current = true;
        combatLogManager.addMessage(CombatConstants.TEXT.WAYLAID_MESSAGE_LINE1);
        combatLogManager.addMessage(CombatConstants.TEXT.WAYLAID_MESSAGE_LINE2);
        combatLogManager.addMessage('', 3);
        combatLogManager.addMessage(CombatConstants.TEXT.DEPLOYMENT_INSTRUCTION);
      }

      // Update phase handler (for animations) only if no cinematic is playing
      if (!cinematicPlaying && phaseHandlerRef.current.update) {
        const updatedState = phaseHandlerRef.current.update(combatState, activeEncounter, deltaTime);
        // If phase handler returns new state (e.g., phase transition), apply it
        if (updatedState && updatedState !== combatState) {
          setCombatState(updatedState);
        }
      }

      // Update combat log animations
      combatLogManager.update(deltaTime);

      // Render the frame
      renderFrame();

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [spritesLoaded, renderFrame, combatState, activeEncounter, combatLogManager]);

  // Function to perform a single scroll step in the given direction
  const performScroll = useCallback((direction: 'right' | 'left' | 'up' | 'down') => {
    const { maxScrollX, maxScrollY } = mapRenderer.calculateMaxScroll(
      combatState.map.width,
      combatState.map.height
    );

    if (direction === 'right') {
      setMapScrollX(prev => Math.min(prev + 1, maxScrollX));
    } else if (direction === 'left') {
      setMapScrollX(prev => Math.max(prev - 1, 0));
    } else if (direction === 'down') {
      setMapScrollY(prev => Math.min(prev + 1, maxScrollY));
    } else if (direction === 'up') {
      setMapScrollY(prev => Math.max(prev - 1, 0));
    }
    renderFrame();
  }, [combatState.map, mapRenderer, renderFrame]);

  // Perform combat log scroll
  const performCombatLogScroll = useCallback((direction: 'logUp' | 'logDown') => {
    if (direction === 'logUp') {
      combatLogManager.scrollUp(1);
    } else if (direction === 'logDown') {
      combatLogManager.scrollDown(1);
    }
    renderFrame();
  }, [combatLogManager, renderFrame]);

  // Start continuous scrolling
  const startContinuousScroll = useCallback((direction: 'right' | 'left' | 'up' | 'down' | 'logUp' | 'logDown') => {
    // Clear any existing interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }

    // Perform initial scroll immediately
    if (direction === 'logUp' || direction === 'logDown') {
      performCombatLogScroll(direction);
    } else {
      performScroll(direction);
    }

    // Set up interval for continuous scrolling (200ms between scrolls)
    scrollIntervalRef.current = setInterval(() => {
      if (direction === 'logUp' || direction === 'logDown') {
        performCombatLogScroll(direction);
      } else {
        performScroll(direction);
      }
    }, 200);
  }, [performScroll, performCombatLogScroll]);

  // Stop continuous scrolling
  const stopContinuousScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    scrollArrowPressedRef.current = null;
  }, []);

  // Handle canvas mouse down for button active state
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Check if mouse down on top panel (turn order) first - for hold-to-scroll
    if (layoutRenderer.handleTopPanelMouseDown(canvasX, canvasY, topPanelManager)) {
      renderFrame(); // Force immediate re-render to show scroll
      return; // Event was handled, don't process other handlers
    }

    // Check if clicking on top panel (turn order) for unit selection
    if (layoutRenderer.handleTopPanelClick(canvasX, canvasY, topPanelManager)) {
      renderFrame(); // Force immediate re-render to show updated target
      return; // Click was handled, don't process other handlers
    }

    // Check if clicking on combat log scroll buttons
    const combatLogScrollDirection = layoutRenderer.handleCombatLogClick(canvasX, canvasY, combatLogManager);
    if (combatLogScrollDirection === 'up') {
      scrollArrowPressedRef.current = 'logUp';
      startContinuousScroll('logUp');
      return; // Button was clicked, don't process other handlers
    }
    if (combatLogScrollDirection === 'down') {
      scrollArrowPressedRef.current = 'logDown';
      startContinuousScroll('logDown');
      return; // Button was clicked, don't process other handlers
    }

    // Check if clicking on map scroll buttons
    const mapScrollDirection = layoutRenderer.handleMapScrollClick(canvasX, canvasY);
    if (mapScrollDirection === 'right') {
      scrollArrowPressedRef.current = 'right';
      startContinuousScroll('right');
      return; // Button was clicked, don't process other handlers
    }
    if (mapScrollDirection === 'left') {
      scrollArrowPressedRef.current = 'left';
      startContinuousScroll('left');
      return; // Button was clicked, don't process other handlers
    }
    if (mapScrollDirection === 'down') {
      scrollArrowPressedRef.current = 'down';
      startContinuousScroll('down');
      return; // Button was clicked, don't process other handlers
    }
    if (mapScrollDirection === 'up') {
      scrollArrowPressedRef.current = 'up';
      startContinuousScroll('up');
      return; // Button was clicked, don't process other handlers
    }

    // Check if clicking on bottom info panel (for Enter Combat button)
    const panelRegion = layoutRenderer.getBottomInfoPanelRegion();

    // Check if click is within the panel region
    if (canvasX >= panelRegion.x &&
        canvasX <= panelRegion.x + panelRegion.width &&
        canvasY >= panelRegion.y &&
        canvasY <= panelRegion.y + panelRegion.height) {

      // Handle button mouse down (if button exists)
      const mouseDownHandled = bottomInfoPanelManager.handleMouseDown(canvasX, canvasY, panelRegion);
      if (mouseDownHandled) {
        renderFrame(); // Re-render to show button press state
        return;
      }

      // First, try to handle click with the panel manager (for party member selection, etc.)
      const clickResult: PanelClickResult = bottomInfoPanelManager.handleClick(canvasX, canvasY, panelRegion);

      // Type-safe handling with discriminated union
      if (clickResult !== null) {
        switch (clickResult.type) {
          case 'button':
            renderFrame(); // Re-render after button click
            return; // Button click handled by onEnterCombat callback

          case 'party-member':
            if (combatState.phase === 'deployment') {
              // Type-safe cast after checking method exists
              if ('handleDeploymentAction' in phaseHandlerRef.current) {
                const deploymentHandler = phaseHandlerRef.current as DeploymentPhaseHandler;
                const result = deploymentHandler.handleDeploymentAction(
                  clickResult.index, // Type-safe access!
                  combatState,
                  activeEncounter
                );

                if (result.handled && result.newState) {
                  // Add log message if provided
                  if (result.logMessage) {
                    combatLogManager.addMessage(result.logMessage);
                  }

                  // Check if button should become visible after this deployment
                  const previousDeployedCount = combatState.unitManifest.getAllUnits().length;
                  const newDeployedCount = result.newState.unitManifest.getAllUnits().length;
                  const partySize = partyUnits.length;
                  const totalZones = activeEncounter.playerDeploymentZones.length;

                  const wasButtonVisible = previousDeployedCount >= partySize || previousDeployedCount >= totalZones;
                  const isButtonVisible = newDeployedCount >= partySize || newDeployedCount >= totalZones;

                  // Add "Units deployed. Enter combat?" message when button becomes visible
                  if (!wasButtonVisible && isButtonVisible) {
                    combatLogManager.addMessage(CombatConstants.TEXT.UNITS_DEPLOYED);
                  }

                  // Update state
                  setCombatState(result.newState);
                  return; // Click was handled
                }
              }
            }
            return;

          case 'unit-selected':
          case 'action-selected':
          case 'target-selected':
            // Future: Handle other click types
            break;
        }
      }
    }

    // Delegate mouse down to phase handler
    if (phaseHandlerRef.current.handleMouseDown) {
      phaseHandlerRef.current.handleMouseDown(
        { canvasX, canvasY },
        combatState,
        activeEncounter
      );
    }
  }, [combatState, activeEncounter, layoutRenderer, startContinuousScroll, topPanelManager, renderFrame]);

  // Handle canvas mouse up for button click
  const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Stop continuous scrolling
    stopContinuousScroll();

    // Stop top panel repeat scrolling
    layoutRenderer.handleTopPanelMouseUp(topPanelManager);

    // Check if clicking on bottom info panel (for button mouse up)
    const panelRegion = layoutRenderer.getBottomInfoPanelRegion();
    if (canvasX >= panelRegion.x &&
        canvasX <= panelRegion.x + panelRegion.width &&
        canvasY >= panelRegion.y &&
        canvasY <= panelRegion.y + panelRegion.height) {

      // Handle button click via handleClick (which calls handleMouseUp internally)
      const clickResult: PanelClickResult = bottomInfoPanelManager.handleClick(canvasX, canvasY, panelRegion);

      if (clickResult !== null && clickResult.type === 'button') {
        renderFrame(); // Re-render after button click
        return; // Button click handled
      }
    }

    // Delegate mouse up to phase handler
    if (phaseHandlerRef.current.handleMouseUp) {
      phaseHandlerRef.current.handleMouseUp(
        { canvasX, canvasY },
        combatState,
        activeEncounter
      );
    }
  }, [combatState, activeEncounter, stopContinuousScroll, layoutRenderer, renderFrame]);

  // Handle mouse leaving the canvas
  const handleCanvasMouseLeave = useCallback(() => {
    // Stop continuous scrolling
    stopContinuousScroll();

    // Stop top panel repeat scrolling
    layoutRenderer.handleTopPanelMouseLeave(topPanelManager);
  }, [stopContinuousScroll, layoutRenderer]);

  // Handle canvas click for deployment zone selection and character selection
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block input during cinematics
    if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

    // Convert mouse coordinates to canvas coordinates
    const coords = inputHandler.getCanvasCoordinates(event);
    if (!coords) return;

    const { x: canvasX, y: canvasY } = coords;

    // Try to handle as a map click (will notify registered handlers)
    const wasMapClick = mapRenderer.handleMapClick(
      canvasX,
      canvasY,
      mapScrollX,
      mapScrollY,
      combatState.map.width,
      combatState.map.height
    );

    if (wasMapClick) {
      // Map was clicked, registered handlers were notified
      return;
    }

    // Click was not handled by any registered handler
  }, [combatState, activeEncounter, setCombatState, inputHandler, mapRenderer, combatLogManager, mapScrollX, mapScrollY]);

  // Handle canvas mouse move for hover detection
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block input during cinematics
    if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

    // Convert mouse coordinates to canvas coordinates
    const coords = inputHandler.getCanvasCoordinates(event);
    if (!coords) return;

    const { x: canvasX, y: canvasY } = coords;

    // Check if hovering over bottom info panel
    // The panel manager will delegate to the panel content (party members, unit info, etc.)
    const partyPanelRegion = layoutRenderer.getBottomInfoPanelRegion();

    const hoverResult = bottomInfoPanelManager.handleHover(
      canvasX,
      canvasY,
      partyPanelRegion
    );

    // During deployment phase, delegate to phase handler for type-safe hover handling
    if (combatState.phase === 'deployment' && 'handleInfoPanelHover' in phaseHandlerRef.current) {
      const deploymentHandler = phaseHandlerRef.current as DeploymentPhaseHandler;
      const phaseHoverResult = deploymentHandler.handleInfoPanelHover(
        canvasX - partyPanelRegion.x,
        canvasY - partyPanelRegion.y,
        partyPanelRegion,
        combatState,
        activeEncounter
      );

      if (phaseHoverResult.handled && phaseHoverResult.data) {
        const data = phaseHoverResult.data as DeploymentPanelData;
        if (data.type === 'party-member-hover') {
          targetUnitRef.current = partyUnits[data.memberIndex];
          hoveredPartyMemberRef.current = data.memberIndex;
        }
      } else {
        if (hoveredPartyMemberRef.current !== null) {
          hoveredPartyMemberRef.current = null;
        }
      }
    } else {
      // Fallback to generic hover handling for other phases
      if (typeof hoverResult === 'number' && hoverResult !== null && partyUnits.length > 0) {
        targetUnitRef.current = partyUnits[hoverResult];
        hoveredPartyMemberRef.current = hoverResult;
      } else {
        if (hoveredPartyMemberRef.current !== null) {
          hoveredPartyMemberRef.current = null;
        }
      }
    }

    // Update hovered cell for map tile detection using CombatMapRenderer
    const tileCoords = mapRenderer.canvasToTileCoordinates(
      canvasX,
      canvasY,
      mapScrollX,
      mapScrollY,
      combatState.map.width,
      combatState.map.height
    );

    if (tileCoords) {
      uiStateManager.setHoveredCell({ x: tileCoords.tileX, y: tileCoords.tileY });
    } else {
      uiStateManager.setHoveredCell(null);
    }

    // Delegate mouse move to phase handler
    if (phaseHandlerRef.current.handleMouseMove) {
      phaseHandlerRef.current.handleMouseMove(
        { canvasX, canvasY, tileX: tileCoords?.tileX, tileY: tileCoords?.tileY },
        combatState,
        activeEncounter
      );
    }
  }, [combatState, activeEncounter, inputHandler, uiStateManager, mapRenderer, mapScrollX, mapScrollY, partyUnits, bottomInfoPanelManager, layoutRenderer, renderFrame]);

  // Register map click handler
  useEffect(() => {
    const unsubscribe = mapRenderer.onMapClick((tileX, tileY) => {
      // Check if a unit is at the clicked position
      const unitAtPosition = combatState.unitManifest.getAllUnits().find(
        placement => placement.position.x === tileX && placement.position.y === tileY
      );

      if (unitAtPosition) {
        // Unit was clicked - show it in the Unit Info panel
        targetUnitRef.current = unitAtPosition.unit;
        renderFrame();
        // Continue to process phase-specific logic
      }

      // Delegate map click to phase handler
      if (phaseHandlerRef.current.handleMapClick) {
        const result = phaseHandlerRef.current.handleMapClick(
          { canvasX: 0, canvasY: 0, tileX, tileY },
          combatState,
          activeEncounter
        );

        // Add log message if provided
        if (result.logMessage) {
          combatLogManager.addMessage(result.logMessage);
        }

        // Update state if provided
        if (result.newState) {
          setCombatState(result.newState);
        }
      }
    });

    return unsubscribe;
  }, [mapRenderer, combatState, activeEncounter, combatLogManager, renderFrame, setCombatState]);

  // Cleanup scroll interval on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Canvas snapshot utility for LoadingView
  const captureCanvasSnapshot = useCallback((): HTMLCanvasElement | null => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return null;

    const snapshot = document.createElement('canvas');
    snapshot.width = CANVAS_WIDTH;
    snapshot.height = CANVAS_HEIGHT;

    const ctx = snapshot.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(displayCanvas, 0, 0);

    return snapshot;
  }, []);

  // LoadingView callbacks
  const handleFadeInComplete = useCallback(() => {
    // Safe to dismount CombatView now (loading screen is fully visible)
    setShowCombatView(false);
  }, []);

  const handleLoadReady = useCallback(async (): Promise<LoadResult> => {
    try {
      let result;

      // Check if we're loading from file, slot, or localStorage
      if (fileToImportRef.current) {
        result = await importCombatFromFile(fileToImportRef.current);
        fileToImportRef.current = null; // Clear the file after loading
      } else if (slotToLoadRef.current !== null) {
        result = loadCombatFromSlot(slotToLoadRef.current);
        slotToLoadRef.current = null; // Clear the slot after loading
      } else {
        result = loadCombatFromLocalStorage();
      }

      if (result) {
        // Check if save has encounter ID
        if (result.encounterId) {
          const loadedEncounter = CombatEncounter.getById(result.encounterId);

          if (!loadedEncounter) {
            return {
              success: false,
              error: `Encounter '${result.encounterId}' not found in registry. This indicates a data integrity issue.`
            };
          }

          // Store loaded encounter to override prop
          loadedEncounterRef.current = loadedEncounter;
        } else {
          // Old save format without encounterId - log warning
          console.warn('[CombatView] Loading save file without encounterId. This is an old save format. Using encounter from props.');
          loadedEncounterRef.current = null; // Use prop encounter
        }

        // Reconstruct CombatLogManager from JSON
        const newCombatLog = new CombatLogManager({
          maxMessages: 100,
          bufferLines: 21,
          lineHeight: 8,
          defaultColor: '#ffffff',
        });

        if (result.combatLog) {
          // Restore messages (without animation state)
          const messages = result.combatLog.getMessages();
          messages.forEach((msg: string) => {
            newCombatLog.addMessage(msg, Infinity); // Instant, no animation
          });
          newCombatLog.scrollToBottom();
        }

        return {
          success: true,
          combatState: result.combatState,
          combatLog: newCombatLog,
        };
      } else {
        return {
          success: false,
          error: fileToImportRef.current
            ? 'Invalid save file or corrupted data'
            : 'No saved combat found in localStorage',
        };
      }
    } catch (error) {
      console.error('[CombatView] Load error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, []);

  const handleLoadComplete = useCallback(
    (result: LoadResult) => {
      if (result.success && result.combatState && result.combatLog) {
        // Apply new state
        setCombatState(result.combatState);

        // Replace combat log manager (note: we can't replace the useMemo instance)
        // Instead, we clear it and add messages in handleLoadReady
        // Here we just copy the reference from the result
        combatLogManager.clear();
        const messages = result.combatLog.getMessages();
        messages.forEach((msg: string) => {
          combatLogManager.addMessage(msg, Infinity);
        });
        combatLogManager.scrollToBottom();

        // Remount CombatView (will render new state)
        setShowCombatView(true);

        // Clear error message
        setSaveErrorMessage(null);

        // NOTE: Do NOT reset isLoading here - wait for onAnimationComplete callback
      } else {
        // Error: keep old state, remount CombatView
        console.error('[CombatView] Load failed:', result.error);
        setSaveErrorMessage(result.error || 'Load failed');

        // Remount with OLD state (rollback)
        setShowCombatView(true);

        // NOTE: Do NOT reset isLoading here - wait for onAnimationComplete callback
      }
    },
    [combatLogManager]
  );

  const handleAnimationComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Save/Load handlers
  const handleExportToFile = useCallback(() => {
    try {
      exportCombatToFile(combatState, combatLogManager, activeEncounter.id);
      setSaveErrorMessage(null);
    } catch (error) {
      setSaveErrorMessage('Failed to export combat state');
      console.error(error);
    }
  }, [combatState, combatLogManager, activeEncounter.id]);

  const handleSaveToLocalStorage = useCallback(() => {
    try {
      const success = saveCombatToLocalStorage(combatState, combatLogManager, activeEncounter.id);
      if (success) {
        setSaveErrorMessage(null);
      } else {
        setSaveErrorMessage('Failed to save to localStorage');
      }
    } catch (error) {
      setSaveErrorMessage('Failed to save to localStorage');
      console.error(error);
    }
  }, [combatState, combatLogManager, activeEncounter.id]);

  const handleImportFromFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Capture current canvas state before loading
    canvasSnapshotRef.current = captureCanvasSnapshot();

    // Store the file for later use in handleLoadReady
    fileToImportRef.current = file;

    // Trigger loading transition
    setIsLoading(true);

    // Reset file input to allow re-importing the same file
    event.target.value = '';
  }, [captureCanvasSnapshot]);

  const handleLoadFromLocalStorage = useCallback(() => {
    // Capture current canvas state before loading
    canvasSnapshotRef.current = captureCanvasSnapshot();

    // Clear any pending file import
    fileToImportRef.current = null;

    // Trigger loading transition
    setIsLoading(true);
  }, [captureCanvasSnapshot]);

  // Format slot metadata for display
  const formatSlotMetadata = useCallback((metadata: SaveSlotMetadata | null): string => {
    if (!metadata) {
      return 'Empty';
    }

    const date = new Date(metadata.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const phaseStr = metadata.phase.charAt(0).toUpperCase() + metadata.phase.slice(1).replace('-', ' ');
    return `Turn ${metadata.turnNumber} (${phaseStr}) - ${timeStr}`;
  }, []);

  // Quick save slot handlers
  const handleSaveToSlot = useCallback((slotIndex: number) => {
    try {
      const success = saveCombatToSlot(slotIndex, combatState, combatLogManager, activeEncounter.id);
      if (success) {
        // Refresh slot metadata
        setSlotMetadata(getAllSlotMetadata());
        setSaveErrorMessage(null);
      } else {
        setSaveErrorMessage(`Failed to save to slot ${slotIndex + 1}`);
      }
    } catch (error) {
      setSaveErrorMessage(`Failed to save to slot ${slotIndex + 1}`);
      console.error(error);
    }
  }, [combatState, combatLogManager, activeEncounter.id]);

  const handleLoadFromSlot = useCallback((slotIndex: number) => {
    // Check if slot has data
    const metadata = slotMetadata[slotIndex];
    if (!metadata) {
      setSaveErrorMessage(`Slot ${slotIndex + 1} is empty`);
      return;
    }

    // Capture current canvas state before loading
    canvasSnapshotRef.current = captureCanvasSnapshot();

    // Clear any pending file import
    fileToImportRef.current = null;

    // Set slot to load
    slotToLoadRef.current = slotIndex;

    // Trigger loading transition
    setIsLoading(true);
  }, [slotMetadata, captureCanvasSnapshot]);

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        zIndex: 3000,
      }}
    >
      {/* Developer Settings Panel */}
      {import.meta.env.DEV && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #444',
            borderRadius: '4px',
            padding: '12px',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: 4000,
          }}
        >
          <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Developer Settings</div>

          {/* Integer Scaling Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={integerScalingEnabled}
              onChange={(e) => handleIntegerScalingToggle(e.target.checked)}
              style={{
                marginRight: '8px',
                cursor: 'pointer',
                width: '16px',
                height: '16px',
              }}
            />
            <span>Integer Scaling (pixel-perfect)</span>
          </label>

          {/* Debug Grid Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showDebugGrid}
              onChange={(e) => setShowDebugGrid(e.target.checked)}
              style={{
                marginRight: '8px',
                cursor: 'pointer',
                width: '16px',
                height: '16px',
              }}
            />
            <span>Show Debug Grid</span>
          </label>

          {/* Manual Scale Selector */}
          <label style={{ display: 'block', marginBottom: '4px' }}>
            Scale Factor:
          </label>
          <select
            value={manualScale}
            onChange={(e) => handleManualScaleChange(Number(e.target.value))}
            style={{
              width: '200px',
              padding: '4px',
              background: '#222',
              border: '1px solid #555',
              borderRadius: '3px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '11px',
              marginBottom: '16px',
            }}
          >
            <option value={0}>Auto</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
            <option value={5}>5x</option>
          </select>

            {/* Title Font Atlas Selector */}
            <label style={{ display: 'block', marginBottom: '4px' }}>
              Title Font Atlas:
            </label>
            <select
              value={titleAtlasFont}
              onChange={(e) => setTitleAtlasFont(e.target.value)}
              style={{
                width: '200px',
                padding: '4px',
                background: '#222',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '11px',
                marginBottom: '8px',
              }}
            >
              {FontRegistry.getAllIds().sort().map((fontId) => (
                <option key={fontId} value={fontId}>
                  {fontId}
                </option>
              ))}
            </select>

            {/* Message Font Atlas Selector */}
            <label style={{ display: 'block', marginBottom: '4px' }}>
              Message Font Atlas:
            </label>
            <select
              value={messageAtlasFont}
              onChange={(e) => setMessageAtlasFont(e.target.value)}
              style={{
                width: '200px',
                padding: '4px',
                background: '#222',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '11px',
                marginBottom: '8px',
              }}
            >
              {FontRegistry.getAllIds().sort().map((fontId) => (
                <option key={fontId} value={fontId}>
                  {fontId}
                </option>
              ))}
            </select>

            {/* Dialog Font Atlas Selector */}
            <label style={{ display: 'block', marginBottom: '4px' }}>
              Dialog Font Atlas (Party Selection):
            </label>
            <select
              value={dialogAtlasFont}
              onChange={(e) => setDialogAtlasFont(e.target.value)}
              style={{
                width: '200px',
                padding: '4px',
                background: '#222',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '11px',
                marginBottom: '8px',
              }}
            >
              {FontRegistry.getAllIds().sort().map((fontId) => (
                <option key={fontId} value={fontId}>
                  {fontId}
                </option>
              ))}
            </select>

            {/* Unit Info Font Atlas Selector */}
            <label style={{ display: 'block', marginBottom: '4px' }}>
              Unit Info Font Atlas:
            </label>
            <select
              value={unitInfoAtlasFont}
              onChange={(e) => setUnitInfoAtlasFont(e.target.value)}
              style={{
                width: '200px',
                padding: '4px',
                background: '#222',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}
            >
              {FontRegistry.getAllIds().sort().map((fontId) => (
                <option key={fontId} value={fontId}>
                  {fontId}
                </option>
              ))}
            </select>

          {/* Highlight Color Picker */}
          <label style={{ display: 'block', marginTop: '16px', marginBottom: '4px' }}>
            Highlight Color:
          </label>
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            style={{
              width: '200px',
              height: '32px',
              padding: '2px',
              background: '#222',
              border: '1px solid #555',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          />

          {/* Combat Save/Load Section */}
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #666' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Combat Save/Load</h3>

            {/* Error message display */}
            {saveErrorMessage && (
              <div style={{
                color: '#ff4444',
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                padding: '8px',
                marginBottom: '10px',
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid #ff4444',
              }}>
                {saveErrorMessage}
              </div>
            )}

            {/* File Export/Import */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>File:</label>
              <button
                onClick={handleExportToFile}
                style={{
                  padding: '6px 12px',
                  marginRight: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              >
                Export
              </button>
              <label
                htmlFor="import-file-input"
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  display: 'inline-block',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              >
                Import
              </label>
              <input
                id="import-file-input"
                type="file"
                accept=".json"
                onChange={handleImportFromFile}
                style={{ display: 'none' }}
              />
            </div>

            {/* LocalStorage Save/Load */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>LocalStorage:</label>
              <button
                onClick={handleSaveToLocalStorage}
                style={{
                  padding: '6px 12px',
                  marginRight: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              >
                Save
              </button>
              <button
                onClick={handleLoadFromLocalStorage}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              >
                Load
              </button>
            </div>

            {/* Quick Save Slots */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Quick Save Slots:</label>
              {[0, 1, 2, 3].map((slotIndex) => {
                const metadata = slotMetadata[slotIndex];
                const slotLabel = formatSlotMetadata(metadata);
                const isEmpty = metadata === null;

                return (
                  <div
                    key={slotIndex}
                    style={{
                      marginBottom: '8px',
                      padding: '8px',
                      background: '#1a1a1a',
                      border: '1px solid #555',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#aaa' }}>
                          Slot {slotIndex + 1}
                        </div>
                        <div style={{ fontSize: '10px', color: isEmpty ? '#666' : '#ccc' }}>
                          {slotLabel}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleSaveToSlot(slotIndex)}
                          style={{
                            padding: '4px 10px',
                            cursor: 'pointer',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => handleLoadFromSlot(slotIndex)}
                          disabled={isEmpty}
                          style={{
                            padding: '4px 10px',
                            cursor: isEmpty ? 'not-allowed' : 'pointer',
                            backgroundColor: isEmpty ? '#444' : '#2196F3',
                            color: isEmpty ? '#888' : 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            opacity: isEmpty ? 0.5 : 1,
                          }}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '177.78vh', // 16:9 aspect ratio (16/9 * 100vh)
          maxHeight: '56.25vw', // 16:9 aspect ratio (9/16 * 100vw)
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* LoadingView overlay (always rendered, controls loading transitions) */}
        <LoadingView
          isLoading={isLoading}
          canvasSnapshot={canvasSnapshotRef.current}
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          displayStyle={canvasDisplayStyle}
          onFadeInComplete={handleFadeInComplete}
          onLoadReady={handleLoadReady}
          onComplete={handleLoadComplete}
          onAnimationComplete={handleAnimationComplete}
        />

        {/* CombatView canvas (conditionally rendered) */}
        {showCombatView && (
          <canvas
            ref={displayCanvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            style={{
              ...canvasDisplayStyle,
              imageRendering: 'pixelated',
              objectFit: 'contain',
              cursor: combatState.phase === 'deployment' ? 'pointer' : 'default',
            } as React.CSSProperties}
          />
        )}
      </div>
    </div>
  );
};

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import type { CombatPhaseHandler } from '../../models/combat/CombatPhaseHandler';
import type { CombatUnit } from '../../models/combat/CombatUnit';
import { DeploymentPhaseHandler, createUnitFromPartyMember } from '../../models/combat/DeploymentPhaseHandler';
import { UIConfig } from '../../config/UIConfig';
import { UISettings } from '../../config/UISettings';
import { CombatUnitManifest } from '../../models/combat/CombatUnitManifest';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { CinematicManager } from '../../models/combat/CinematicSequence';
// Animations disabled for prototyping
// import { MapFadeInSequence } from '../../models/combat/MapFadeInSequence';
// import { TitleFadeInSequence } from '../../models/combat/TitleFadeInSequence';
// import { MessageFadeInSequence } from '../../models/combat/MessageFadeInSequence';
// import { SequenceParallel } from '../../models/combat/SequenceParallel';
import { CombatConstants } from '../../models/combat/CombatConstants';
import { CombatInputHandler } from '../../services/CombatInputHandler';
import { SpriteAssetLoader } from '../../services/SpriteAssetLoader';
import { CombatUIStateManager } from '../../models/combat/CombatUIState';
import { useCombatUIState } from '../../hooks/useCombatUIState';
import { CombatRenderer } from '../../models/combat/rendering/CombatRenderer';
import { CombatLogManager } from '../../models/combat/CombatLogManager';
// Disabled for prototyping - unit info dialog
// import { CombatUnitInfoDialogContent } from './CombatUnitInfoDialogContent';
// import { renderDialogWithContent } from '../../utils/DialogRenderer';
import { FontRegistry } from '../../utils/FontRegistry';
import { CombatLayoutManager } from '../../models/combat/layouts/CombatLayoutManager';
import { CombatMapRenderer } from '../../models/combat/rendering/CombatMapRenderer';
import { InfoPanelManager } from '../../models/combat/managers/InfoPanelManager';
import { TopPanelManager } from '../../models/combat/managers/TopPanelManager';
import { TurnOrderRenderer } from '../../models/combat/managers/renderers/TurnOrderRenderer';
import { DeploymentHeaderRenderer } from '../../models/combat/managers/renderers/DeploymentHeaderRenderer';

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

  // Combat renderer for map and unit rendering
  const renderer = useMemo(
    () => new CombatRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, SPRITE_SIZE),
    []
  );

  // Store loaded sprite images
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Track if sprites are loaded
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Store loaded font atlas images (keyed by font ID)
  const fontAtlasImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

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
    bufferLines: 20,
    lineHeight: 8,
    defaultColor: '#ffffff',
  }), []);

  // Info panel managers
  // During deployment, this shows party members; during combat, shows current unit
  const currentUnitPanelManager = useMemo(() => new InfoPanelManager(), []);

  const targetUnitPanelManager = useMemo(() => new InfoPanelManager(), []);

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
    if (combatState.phase === 'deployment') {
      // Show deployment header during deployment phase
      const deploymentRenderer = new DeploymentHeaderRenderer('Deploy Units');
      topPanelManager.setRenderer(deploymentRenderer);
    } else {
      // Show turn order during combat phase
      const turnOrderRenderer = new TurnOrderRenderer(partyUnits, (clickedUnit) => {
        // When a unit is clicked in turn order, set it as the target unit
        targetUnitRef.current = clickedUnit;
      });

      topPanelManager.setRenderer(turnOrderRenderer);
    }
  }, [topPanelManager, combatState.phase, partyUnits]);

  // Update UIConfig when highlight color changes
  useEffect(() => {
    UIConfig.setHighlightColor(highlightColor);
  }, [highlightColor]);

  // Initialize combat log with waylaid message
  useEffect(() => {
    // Only add the message once
    if (combatLogInitializedRef.current) return;
    combatLogInitializedRef.current = true;

    // Add waylaid message as two separate lines at the start of deployment phase
    combatLogManager.addMessage(CombatConstants.TEXT.WAYLAID_MESSAGE_LINE1);
    combatLogManager.addMessage(CombatConstants.TEXT.WAYLAID_MESSAGE_LINE2);
    // Add empty line
    combatLogManager.addMessage('');
    // Add deployment instruction with sprite
    combatLogManager.addMessage(CombatConstants.TEXT.DEPLOYMENT_INSTRUCTION);
  }, [combatLogManager]);

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load font atlas images for all fonts in FontRegistry
  useEffect(() => {
    const loadFontAtlases = async () => {
      const fontIds = FontRegistry.getAllIds();
      const images = new Map<string, HTMLImageElement>();

      for (const fontId of fontIds) {
        const font = FontRegistry.getById(fontId);
        if (!font) continue;

        try {
          const img = new Image();
          img.src = font.atlasPath;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              images.set(fontId, img);
              resolve();
            };
            img.onerror = () => reject(new Error(`Failed to load font atlas: ${font.atlasPath}`));
          });
        } catch (error) {
          console.error(`Failed to load font atlas for ${fontId}:`, error);
        }
      }

      fontAtlasImagesRef.current = images;
    };

    loadFontAtlases().catch(console.error);
  }, []);

  // Load sprite images using SpriteAssetLoader
  useEffect(() => {
    const loadSprites = async () => {
      const result = await spriteLoader.loadSprites(
        combatState,
        encounter,
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
  }, [combatState.map, combatState.phase, encounter, spriteLoader]);

  // Start the intro cinematic sequence when encounter loads (only once)
  // DISABLED FOR PROTOTYPING - Skip animations to work on Layout 6
  useEffect(() => {
    if (spritesLoaded && !introCinematicPlayedRef.current) {
      // Skip animations - just mark as played
      introCinematicPlayedRef.current = true;

      // Uncomment below to re-enable intro animations
      /*
      // Calculate message positions
      const titleY = CombatConstants.UI.TITLE_Y_POSITION;
      const waylaidMessageY = CombatConstants.UI.WAYLAID_MESSAGE_Y;
      const mapHeight = combatState.map.height * TILE_SIZE;
      const offsetY = (CANVAS_HEIGHT - mapHeight) / 2;
      const deploymentInstructionY = offsetY + mapHeight + CombatConstants.UI.MESSAGE_SPACING;

      const introSequence = new SequenceParallel([
        new MapFadeInSequence(CombatConstants.ANIMATION.MAP_FADE_DURATION),
        new TitleFadeInSequence(
          CombatConstants.TEXT.DEPLOY_TITLE,
          CombatConstants.ANIMATION.TITLE_FADE_DURATION,
          1,
          titleY
        ),
        new MessageFadeInSequence(
          CombatConstants.TEXT.DEPLOYMENT_INSTRUCTION,
          CombatConstants.ANIMATION.MESSAGE_FADE_DURATION,
          '7px-04b03',
          1,
          deploymentInstructionY
        ),
        new MessageFadeInSequence(
          CombatConstants.TEXT.WAYLAID_MESSAGE,
          CombatConstants.ANIMATION.MESSAGE_FADE_DURATION,
          '7px-04b03',
          1,
          waylaidMessageY
        )
      ]);
      cinematicManagerRef.current.play(introSequence, combatState, encounter);
      */
    }
  }, [spritesLoaded]);

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

    // Check if a cinematic is playing
    const cinematicPlaying = cinematicManagerRef.current.isPlayingCinematic();

    // If cinematic is playing, render it instead of normal gameplay
    if (cinematicPlaying) {
      cinematicManagerRef.current.render(combatState, encounter, {
        ctx,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        tileSize: TILE_SIZE,
        spriteSize: SPRITE_SIZE,
        offsetX,
        offsetY,
        spriteImages: spriteImagesRef.current,
      });

      // Copy buffer to display canvas and return early
      const displayCtx = displayCanvas.getContext('2d');
      if (displayCtx) {
        renderer.displayBuffer(displayCtx, bufferCanvas);
      }
      return;
    }

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
    phaseHandlerRef.current.render(combatState, encounter, {
      ctx,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      tileSize: TILE_SIZE,
      spriteSize: SPRITE_SIZE,
      offsetX,
      offsetY,
      spriteImages: spriteImagesRef.current,
    });

    // Render deployed units from the manifest (after deployment zones so they appear on top)
    renderer.renderUnits(ctx, combatState.unitManifest, spriteImagesRef.current, offsetX, offsetY);

    ctx.restore();

    // DISABLED FOR PROTOTYPING - Skip default phase UI (titles, dialogs)
    // Uncomment to re-enable deployment phase UI elements
    /*
    if (phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      phaseHandlerRef.current.renderUI(combatState, encounter, {
        ctx,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        tileSize: TILE_SIZE,
        spriteSize: SPRITE_SIZE,
        offsetX,
        offsetY,
        spriteImages: spriteImagesRef.current,
        titleAtlasFontId: titleAtlasFont,
        messageAtlasFontId: messageAtlasFont,
        dialogAtlasFontId: dialogAtlasFont,
        fontAtlasImages: fontAtlasImagesRef.current,
      });
    }
    */

    // DISABLED FOR PROTOTYPING - Skip unit info dialog
    // Uncomment to re-enable unit info dialog in deployment phase
    /*
    const phaseHandler = phaseHandlerRef.current;
    if (phaseHandler instanceof DeploymentPhaseHandler) {
      let unitToDisplay: CombatUnit | null = null;

      // Priority 1: Check if hovering over a placed unit on the map
      if (uiState.hoveredCell) {
        const hoveredUnit = combatState.unitManifest.getUnitAtPosition(uiState.hoveredCell);
        if (hoveredUnit) {
          unitToDisplay = hoveredUnit;
        }
      }

      // Priority 2: Check if hovering over a character in the selection dialog
      if (!unitToDisplay) {
        const hoveredCharacterIndex = phaseHandler.getHoveredCharacterIndex();
        if (hoveredCharacterIndex !== null) {
          const partyMembers = PartyMemberRegistry.getAll();
          if (hoveredCharacterIndex >= 0 && hoveredCharacterIndex < partyMembers.length) {
            const hoveredMember = partyMembers[hoveredCharacterIndex];
            unitToDisplay = createUnitFromPartyMember(hoveredMember);
          }
        }
      }

      // Priority 3: Use the last displayed unit if no hover
      if (!unitToDisplay && lastDisplayedUnitRef.current) {
        unitToDisplay = lastDisplayedUnitRef.current;
      }

      // Update the last displayed unit
      if (unitToDisplay) {
        lastDisplayedUnitRef.current = unitToDisplay;
      }

      // Render the unit info dialog if we have a unit to display
      if (unitToDisplay) {
        // Get the unit info font atlas image from the selected font
        const unitInfoFontAtlas = fontAtlasImagesRef.current.get(unitInfoAtlasFont) || null;

        const unitInfoDialog = new CombatUnitInfoDialogContent(
          unitToDisplay,
          unitInfoAtlasFont,
          unitInfoFontAtlas,
          spriteImagesRef.current,
          TILE_SIZE,
          SPRITE_SIZE,
          1 // Scale (reduced from 2 for new resolution)
        );

        // Calculate dialog size
        const bounds = unitInfoDialog.measure(0);
        const BORDER_INSET = 6 * 1; // Scale of 1 (reduced from 4)
        const PADDING = 2; // Reduced from 6 for new resolution
        const dialogWidth = (bounds.maxX - bounds.minX) + (PADDING * 2) + (BORDER_INSET * 2);
        const dialogHeight = (bounds.maxY - bounds.minY) + (PADDING * 2) + (BORDER_INSET * 2);

        // Position at right side with 4px margin, vertically centered (reduced from 16px)
        const dialogX = CANVAS_WIDTH - dialogWidth - 4;
        const dialogY = (CANVAS_HEIGHT - dialogHeight) / 2;

        renderDialogWithContent(
          ctx,
          unitInfoDialog,
          dialogX,
          dialogY,
          SPRITE_SIZE,
          spriteImagesRef.current,
          undefined, // Use default 9-slice sprites
          PADDING,
          1 // Scale (reduced from 4 for new resolution)
        );
      }
    }
    */

    // Render layout UI
    // Use 7px-04b03 for info panels/combat log, dungeon-slant for top panel
    const layoutFontAtlas = fontAtlasImagesRef.current.get(unitInfoAtlasFont) || null;
    const topPanelFontAtlas = fontAtlasImagesRef.current.get('15px-dungeonslant') || null;

    // FOR TESTING: Display first party member in current unit panel during combat
    const testCurrentUnit = combatState.phase !== 'deployment' && partyUnits.length > 0
      ? partyUnits[0]
      : null;

    layoutRenderer.renderLayout({
      ctx,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      spriteSize: SPRITE_SIZE,
      fontId: unitInfoAtlasFont,
      fontAtlasImage: layoutFontAtlas,
      topPanelFontAtlasImage: topPanelFontAtlas,
      spriteImages: spriteImagesRef.current,
      currentUnit: testCurrentUnit, // Used during combat phase
      targetUnit: targetUnitRef.current, // Set by clicking turn order
      partyUnits: partyUnits, // Used during deployment phase
      isDeploymentPhase: combatState.phase === 'deployment',
      hoveredPartyMemberIndex: hoveredPartyMemberRef.current, // For hover visual feedback
      combatLogManager,
      currentUnitPanelManager,
      targetUnitPanelManager,
      topPanelManager,
    });

    // Render map scroll arrows (after layout, before debug grid)
    const unitInfoFontAtlas = fontAtlasImagesRef.current.get(unitInfoAtlasFont) || null;
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
      const debugFontAtlas = fontAtlasImagesRef.current.get('7px-04b03') || null;
      renderer.renderDebugGrid(ctx, '7px-04b03', debugFontAtlas);
    }

    // Copy buffer to display canvas
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      renderer.displayBuffer(displayCtx, bufferCanvas);
    }
  }, [spritesLoaded, combatState, windowSize, encounter, renderer, uiState, titleAtlasFont, messageAtlasFont, dialogAtlasFont, unitInfoAtlasFont, layoutRenderer, mapRenderer, showDebugGrid, mapScrollX, mapScrollY]);

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

      // Update phase handler (for animations) only if no cinematic is playing
      if (!cinematicPlaying && phaseHandlerRef.current.update) {
        phaseHandlerRef.current.update(combatState, encounter, deltaTime);
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
  }, [spritesLoaded, renderFrame, combatState, encounter, combatLogManager]);

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

    // Check if clicking on top panel (turn order) first
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

    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;

      // Check if a zone is selected and if clicking on party panel
      const selectedZone = handler.getSelectedZoneIndex();
      if (selectedZone !== null && partyUnits.length > 0) {
        // Party panel region (bottom-right info panel)
        const partyPanelRegion = {
          x: 252,  // column 21 (21 * 12px)
          y: 120,  // row 10 (10 * 12px)
          width: 132,  // 11 tiles
          height: 96   // 8 tiles
        };

        // Check if clicking on a party member
        const partyMemberIndex = currentUnitPanelManager.handleClick(
          canvasX,
          canvasY,
          partyPanelRegion
        ) as number | null;

        if (partyMemberIndex !== null) {
          // Deploy the selected party member
          const selectedMember = PartyMemberRegistry.getAll()[partyMemberIndex];
          const deploymentZone = encounter.playerDeploymentZones[selectedZone];

          if (selectedMember && deploymentZone) {
            try {
              const unit = createUnitFromPartyMember(selectedMember);
              const newManifest = new CombatUnitManifest();

              // Copy existing units, excluding any unit at the deployment zone
              combatState.unitManifest.getAllUnits().forEach(placement => {
                // Skip the unit at the deployment position (it will be replaced)
                if (placement.position.x !== deploymentZone.x || placement.position.y !== deploymentZone.y) {
                  newManifest.addUnit(placement.unit, placement.position);
                }
              });

              // Add new unit at the deployment zone
              newManifest.addUnit(unit, deploymentZone);

              // Update state
              setCombatState({
                ...combatState,
                unitManifest: newManifest
              });

              // Clear the selected zone after deploying
              handler.clearSelectedZone();
            } catch (error) {
              console.error('Failed to create unit:', error);
            }
          }
          return; // Party member was clicked, don't process other handlers
        }
      }

      handler.handleButtonMouseDown(canvasX, canvasY);
    }
  }, [combatState, encounter, layoutRenderer, startContinuousScroll, topPanelManager, renderFrame, partyUnits, currentUnitPanelManager]);

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

    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
      handler.handleButtonMouseUp(canvasX, canvasY);
    }
  }, [combatState.phase, stopContinuousScroll]);

  // Handle canvas click for deployment zone selection and character selection
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block input during cinematics
    if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

    // Convert mouse coordinates to canvas coordinates
    const coords = inputHandler.getCanvasCoordinates(event);
    if (!coords) return;

    const { x: canvasX, y: canvasY } = coords;

    // Check for character dialog clicks in deployment phase
    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;

      // First check if clicking on a character in the dialog
      const partyMembers = PartyMemberRegistry.getAll();
      const characterIndex = handler.handleCharacterClick(canvasX, canvasY, partyMembers.length);
      if (characterIndex !== null) {
        // Character was clicked - create unit and place it
        const selectedMember = partyMembers[characterIndex];
        const selectedZoneIndex = handler.getSelectedZoneIndex();

        if (selectedMember && selectedZoneIndex !== null) {
          const deploymentZone = encounter.playerDeploymentZones[selectedZoneIndex];

          // Create unit from party member and add to manifest (replacing existing if present)
          try {
            const unit = createUnitFromPartyMember(selectedMember);
            const newManifest = new CombatUnitManifest();

            // Copy existing units, excluding any unit at the deployment zone
            combatState.unitManifest.getAllUnits().forEach(placement => {
              // Skip the unit at the deployment position (it will be replaced)
              if (placement.position.x !== deploymentZone.x || placement.position.y !== deploymentZone.y) {
                newManifest.addUnit(placement.unit, placement.position);
              }
            });

            // Add new unit at the deployment zone
            newManifest.addUnit(unit, deploymentZone);

            // Update state
            setCombatState({
              ...combatState,
              unitManifest: newManifest
            });

            // Clear the selected zone after deploying
            handler.clearSelectedZone();
          } catch (error) {
            console.error('Failed to create unit:', error);
          }
        }
        return;
      }
    }

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
  }, [combatState, encounter, setCombatState, inputHandler, mapRenderer, combatLogManager, mapScrollX, mapScrollY]);

  // Handle canvas mouse move for hover detection
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block input during cinematics
    if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

    // Convert mouse coordinates to canvas coordinates
    const coords = inputHandler.getCanvasCoordinates(event);
    if (!coords) return;

    const { x: canvasX, y: canvasY } = coords;

    // Pass mouse move to phase handler (if deployment phase)
    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
      const partySize = PartyMemberRegistry.getAll().length;
      handler.handleMouseMove(canvasX, canvasY, partySize);
      handler.handleButtonMouseMove(canvasX, canvasY); // Handle button hover

      // Check if hovering over party member in party panel
      if (partyUnits.length > 0) {
        const partyPanelRegion = {
          x: 252,  // column 21 (21 * 12px)
          y: 120,  // row 10 (10 * 12px)
          width: 132,  // 11 tiles
          height: 96   // 8 tiles
        };

        const hoveredPartyIndex = currentUnitPanelManager.handleHover(
          canvasX,
          canvasY,
          partyPanelRegion
        ) as number | null;

        if (hoveredPartyIndex !== null) {
          // Set the hovered party member as the target unit
          targetUnitRef.current = partyUnits[hoveredPartyIndex];
          hoveredPartyMemberRef.current = hoveredPartyIndex;
          renderFrame(); // Trigger re-render to show updated target unit
        } else {
          // Clear hover highlight but keep the target unit visible
          hoveredPartyMemberRef.current = null;
          renderFrame();
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
    }
  }, [combatState.phase, combatState.map, inputHandler, uiStateManager, mapRenderer, mapScrollX, mapScrollY, partyUnits, currentUnitPanelManager, renderFrame]);

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
        // Continue to process deployment zone logic if in deployment phase
      }

      // Handle deployment zone clicks in deployment phase
      if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
        const handler = phaseHandlerRef.current as DeploymentPhaseHandler;

        // Get the selected zone before the click
        const previousSelection = handler.getSelectedZoneIndex();

        // Delegate to the deployment phase handler with tile coordinates
        const zoneWasClicked = handler.handleTileClick(tileX, tileY, encounter);

        // If a zone was clicked and is now selected (not deselected), add combat log message
        if (zoneWasClicked) {
          const currentSelection = handler.getSelectedZoneIndex();
          if (currentSelection !== null && currentSelection !== previousSelection) {
            combatLogManager.addMessage(CombatConstants.TEXT.SELECT_PARTY_MEMBER);
          }
        }
      }
    });

    return unsubscribe;
  }, [mapRenderer, combatState.phase, combatState.unitManifest, encounter, combatLogManager, renderFrame]);

  // Cleanup scroll interval on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

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
        <canvas
          ref={displayCanvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
          style={{
            ...canvasDisplayStyle,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            cursor: combatState.phase === 'deployment' ? 'pointer' : 'default',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

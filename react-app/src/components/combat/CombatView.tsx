import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import type { CombatPhaseHandler } from '../../models/combat/CombatPhaseHandler';
import { DeploymentPhaseHandler, createUnitFromPartyMember } from '../../models/combat/DeploymentPhaseHandler';
import { UIConfig } from '../../config/UIConfig';
import { CombatUnitManifest } from '../../models/combat/CombatUnitManifest';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { CinematicManager } from '../../models/combat/CinematicSequence';
import { MapFadeInSequence } from '../../models/combat/MapFadeInSequence';
import { TitleFadeInSequence } from '../../models/combat/TitleFadeInSequence';
import { MessageFadeInSequence } from '../../models/combat/MessageFadeInSequence';
import { SequenceParallel } from '../../models/combat/SequenceParallel';
import { CombatConstants } from '../../models/combat/CombatConstants';
import { CombatInputHandler } from '../../services/CombatInputHandler';
import { SpriteAssetLoader } from '../../services/SpriteAssetLoader';
import { FontAssetLoader } from '../../services/FontAssetLoader';
import { CombatUIStateManager } from '../../models/combat/CombatUIState';
import { useCombatUIState } from '../../hooks/useCombatUIState';
import { CombatRenderer } from '../../models/combat/rendering/CombatRenderer';
import { CombatUnitInfoDialogContent } from './CombatUnitInfoDialogContent';
import { renderDialogWithContent } from '../../utils/DialogRenderer';

interface CombatViewProps {
  encounter: CombatEncounter;
}

const SPRITE_SIZE = 12; // Size of each sprite in the sprite sheet (12x12 pixels)
const SCALE = 4; // Scale factor for rendering
const TILE_SIZE = SPRITE_SIZE * SCALE; // Size of each tile when rendered (48x48 pixels)
const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH;
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT;

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
  useCombatUIState(uiStateManager);

  // Initialize phase handler based on current phase (pass UI state manager)
  const phaseHandlerRef = useRef<CombatPhaseHandler>(new DeploymentPhaseHandler(uiStateManager));

  // Initialize cinematic manager
  const cinematicManagerRef = useRef<CinematicManager>(new CinematicManager());

  // Track if the intro cinematic has already played
  const introCinematicPlayedRef = useRef<boolean>(false);

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

  // Font asset loader
  const fontLoader = useMemo(() => new FontAssetLoader(), []);

  // Combat renderer for map and unit rendering
  const renderer = useMemo(
    () => new CombatRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, SPRITE_SIZE),
    []
  );

  // Store loaded sprite images
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Track if sprites are loaded
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Track window resize to force re-render
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track selected fonts for testing
  const [headerFont, setHeaderFont] = useState<string>('DungeonSlant');
  const [dialogFont, setDialogFont] = useState<string>('Habbo');
  const [buttonFont, setButtonFont] = useState<string>('Bitfantasy');

  // Track unit info dialog font size for testing
  const [unitInfoFontSize, setUnitInfoFontSize] = useState<number>(36);

  // Track highlight color for testing
  const [highlightColor, setHighlightColor] = useState<string>('#ccaa00');

  // Update UIConfig when highlight color changes
  useEffect(() => {
    UIConfig.setHighlightColor(highlightColor);
  }, [highlightColor]);

  // Update UIConfig when button font changes
  useEffect(() => {
    UIConfig.setButtonFont(buttonFont);
  }, [buttonFont]);

  // Track if the selected fonts are loaded
  const [fontsLoaded, setFontsLoaded] = useState<boolean>(false);

  // Load the selected fonts using FontAssetLoader
  useEffect(() => {
    setFontsLoaded(false);

    const loadFonts = async () => {
      const result = await fontLoader.loadFonts(headerFont, dialogFont);

      // Always set as loaded (even on error) to prevent blocking
      setFontsLoaded(true);

      if (!result.loaded && result.error) {
        console.warn('Font loading had issues:', result.error);
      }
    };

    loadFonts();
  }, [headerFont, dialogFont, fontLoader]);

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
  useEffect(() => {
    if (spritesLoaded && fontsLoaded && !introCinematicPlayedRef.current) {
      // Calculate message positions
      // Title and waylaid message at very top of screen
      const titleY = CombatConstants.UI.TITLE_Y_POSITION;
      const waylaidMessageY = CombatConstants.UI.WAYLAID_MESSAGE_Y;
      // Deployment instruction: 8px below map bottom
      const mapHeight = combatState.map.height * TILE_SIZE;
      const offsetY = (CANVAS_HEIGHT - mapHeight) / 2;
      const deploymentInstructionY = offsetY + mapHeight + CombatConstants.UI.MESSAGE_SPACING;

      // Run all intro animations in parallel
      const introSequence = new SequenceParallel([
        new MapFadeInSequence(CombatConstants.ANIMATION.MAP_FADE_DURATION),
        new TitleFadeInSequence(
          CombatConstants.TEXT.DEPLOY_TITLE,
          CombatConstants.ANIMATION.TITLE_FADE_DURATION,
          CombatConstants.FONTS.TITLE_SIZE,
          titleY
        ),
        new MessageFadeInSequence(
          CombatConstants.TEXT.DEPLOYMENT_INSTRUCTION,
          CombatConstants.ANIMATION.MESSAGE_FADE_DURATION,
          dialogFont,
          CombatConstants.FONTS.MESSAGE_SIZE,
          deploymentInstructionY
        ),
        new MessageFadeInSequence(
          CombatConstants.TEXT.WAYLAID_MESSAGE,
          CombatConstants.ANIMATION.MESSAGE_FADE_DURATION,
          dialogFont,
          CombatConstants.FONTS.MESSAGE_SIZE,
          waylaidMessageY
        )
      ]);
      cinematicManagerRef.current.play(introSequence, combatState, encounter);
      introCinematicPlayedRef.current = true;
    }
  }, [spritesLoaded, fontsLoaded, combatState, encounter, dialogFont]);

  // Render function - draws one frame to the canvas
  const renderFrame = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas || !spritesLoaded || !fontsLoaded) {
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

    // Calculate map size in pixels
    const mapWidth = combatState.map.width * TILE_SIZE;
    const mapHeight = combatState.map.height * TILE_SIZE;

    // Calculate offset to center the map on the canvas
    const { offsetX, offsetY } = renderer.calculateMapOffset(mapWidth, mapHeight);

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
      headerFont,
      dialogFont,
    });

    // Render deployed units from the manifest (after deployment zones so they appear on top)
    renderer.renderUnits(ctx, combatState.unitManifest, spriteImagesRef.current, offsetX, offsetY);

    // Render phase UI elements (header, dialogs) after units so they appear on top
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
        headerFont,
        dialogFont,
      });
    }

    // Render unit info dialog when hovering over a character in deployment phase
    const phaseHandler = phaseHandlerRef.current;
    if (phaseHandler instanceof DeploymentPhaseHandler) {
      const hoveredCharacterIndex = phaseHandler.getHoveredCharacterIndex();
      if (hoveredCharacterIndex !== null) {
        const partyMembers = PartyMemberRegistry.getAll();
        if (hoveredCharacterIndex >= 0 && hoveredCharacterIndex < partyMembers.length) {
          const hoveredMember = partyMembers[hoveredCharacterIndex];
          const hoveredUnit = createUnitFromPartyMember(hoveredMember);

          const unitInfoDialog = new CombatUnitInfoDialogContent(
            hoveredUnit,
            dialogFont,
            spriteImagesRef.current,
            TILE_SIZE,
            SPRITE_SIZE,
            unitInfoFontSize
          );

          // Calculate dialog size
          const bounds = unitInfoDialog.measure(0);
          const BORDER_INSET = 6 * 4; // Scale of 4
          const PADDING = 6;
          const dialogWidth = (bounds.maxX - bounds.minX) + (PADDING * 2) + (BORDER_INSET * 2);
          const dialogHeight = (bounds.maxY - bounds.minY) + (PADDING * 2) + (BORDER_INSET * 2);

          // Position at right side with 16px margin, vertically centered
          const dialogX = CANVAS_WIDTH - dialogWidth - 16;
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
            4 // Scale
          );
        }
      }
    }

    // Copy buffer to display canvas
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      renderer.displayBuffer(displayCtx, bufferCanvas);
    }
  }, [spritesLoaded, fontsLoaded, combatState, windowSize, headerFont, dialogFont, unitInfoFontSize, encounter, renderer]);

  // Animation loop
  useEffect(() => {
    if (!spritesLoaded || !fontsLoaded) {
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
  }, [spritesLoaded, fontsLoaded, renderFrame, combatState, encounter]);

  // Handle canvas mouse down for button active state
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
      handler.handleButtonMouseDown(canvasX, canvasY);
    }
  }, [combatState.phase]);

  // Handle canvas mouse up for button click
  const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
      handler.handleButtonMouseUp(canvasX, canvasY);
    }
  }, [combatState.phase]);

  // Handle canvas click for deployment zone selection and character selection
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block input during cinematics
    if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

    // Convert mouse coordinates to canvas coordinates
    const coords = inputHandler.getCanvasCoordinates(event);
    if (!coords) return;

    const { x: canvasX, y: canvasY } = coords;

    // Calculate map offset (same as rendering)
    const offsetX = (CANVAS_WIDTH - (combatState.map.width * TILE_SIZE)) / 2;
    const offsetY = (CANVAS_HEIGHT - (combatState.map.height * TILE_SIZE)) / 2;

    // Pass click to phase handler (if deployment phase)
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

            // Check if zone is already occupied
            const existingUnit = combatState.unitManifest.getUnitAtPosition(deploymentZone);

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

            if (existingUnit) {
              console.log(`Replaced ${existingUnit.name} with ${unit.name} at position (${deploymentZone.x}, ${deploymentZone.y})`);
            } else {
              console.log(`Deployed ${unit.name} at position (${deploymentZone.x}, ${deploymentZone.y})`);
            }
          } catch (error) {
            console.error('Failed to create unit:', error);
          }
        }
        return;
      }

      // If no character clicked, check for deployment zone click
      const clicked = handler.handleClick(canvasX, canvasY, TILE_SIZE, offsetX, offsetY, encounter);

      if (clicked) {
        console.log('Deployment zone selected:', handler.getSelectedZoneIndex());
      }
    }
  }, [combatState, encounter, setCombatState, inputHandler]);

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
    }
  }, [combatState.phase, inputHandler]);

  // Available fonts (matching what's in index.css)
  const availableFonts = [
    'OldWizard',
    'Bitfantasy',
    'CelticTime',
    'HelvetiPixel',
    'KingsQuest6',
    'Questgiver',
    'AdventurerSmallCyr',
    'FancyPixels',
    'DOS-V',
    'PixelTimesNewRoman',
    'TimesNewPixel',
    'DeckardsRegularSerif',
    'NewPixelTimes',
    'Sword',
    'WizardsManse',
    'DungeonSlant',
    'Squirrel',
    'Gothbit',
    'IBM_VGA',
    'Royalati',
    'Tiny04b03',
    'TinyJ2',
    'Habbo8',
    'IBM_BIOS',
    'Habbo',
  ];

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
        background: '#000',
        zIndex: 3000,
      }}
    >
      {/* Font Diagnostic Panel */}
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
          <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Font Diagnostics</div>

          {/* Header Font Selector */}
          <label style={{ display: 'block', marginBottom: '4px' }}>
            Header Font:
          </label>
          <select
            value={headerFont}
            onChange={(e) => setHeaderFont(e.target.value)}
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
            {availableFonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <div
            style={{
              marginBottom: '12px',
              padding: '8px',
              background: '#111',
              borderRadius: '3px',
              fontFamily: headerFont,
              fontSize: '16px',
            }}
          >
            Deploy Units
          </div>

          {/* Dialog Font Selector */}
          <label style={{ display: 'block', marginBottom: '4px' }}>
            Dialog Font:
          </label>
          <select
            value={dialogFont}
            onChange={(e) => setDialogFont(e.target.value)}
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
            {availableFonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#111',
              borderRadius: '3px',
              fontFamily: dialogFont,
              fontSize: '16px',
            }}
          >
            Select a Character
          </div>

          {/* Unit Info Font Size Slider */}
          <label style={{ display: 'block', marginTop: '16px', marginBottom: '4px' }}>
            Unit Info Font Size: {unitInfoFontSize}px
          </label>
          <input
            type="range"
            min="8"
            max="32"
            step="1"
            value={unitInfoFontSize}
            onChange={(e) => setUnitInfoFontSize(Number(e.target.value))}
            style={{
              width: '200px',
              cursor: 'pointer',
            }}
          />
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#111',
              borderRadius: '3px',
              fontFamily: dialogFont,
              fontSize: `${unitInfoFontSize}px`,
            }}
          >
            HP: 100/100
          </div>

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
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#111',
              borderRadius: '3px',
              fontFamily: dialogFont,
              fontSize: '16px',
              color: highlightColor,
            }}
          >
            Highlighted Text Preview
          </div>

          {/* Button Font Selector */}
          <label style={{ display: 'block', marginTop: '16px', marginBottom: '4px' }}>
            Button Font:
          </label>
          <select
            value={buttonFont}
            onChange={(e) => setButtonFont(e.target.value)}
            style={{
              width: '200px',
              padding: '4px',
              background: '#222',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {availableFonts.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#111',
              borderRadius: '3px',
              fontFamily: buttonFont,
              fontSize: '18px',
            }}
          >
            Start Combat
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
        <canvas
          ref={displayCanvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
          style={{
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated',
            objectFit: 'contain',
            cursor: combatState.phase === 'deployment' ? 'pointer' : 'default',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

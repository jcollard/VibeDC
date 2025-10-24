import { useState, useRef, useEffect, useCallback } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import type { CombatPhaseHandler } from '../../models/combat/CombatPhaseHandler';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { DeploymentPhaseHandler, createUnitFromPartyMember } from '../../models/combat/DeploymentPhaseHandler';
import { UIConfig } from '../../config/UIConfig';
import { CombatUnitManifest } from '../../models/combat/CombatUnitManifest';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { CinematicManager } from '../../models/combat/CinematicSequence';
import { MapFadeInSequence } from '../../models/combat/MapFadeInSequence';
import { TitleFadeInSequence } from '../../models/combat/TitleFadeInSequence';
import { MessageFadeInSequence } from '../../models/combat/MessageFadeInSequence';
import { SequenceParallel } from '../../models/combat/SequenceParallel';

interface CombatViewProps {
  encounter: CombatEncounter;
}

const SPRITE_SIZE = 12; // Size of each sprite in the sprite sheet (12x12 pixels)
const SCALE = 4; // Scale factor for rendering
const TILE_SIZE = SPRITE_SIZE * SCALE; // Size of each tile when rendered (48x48 pixels)
const CANVAS_SIZE = 960; // Canvas size in pixels (960x960)

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

  // Initialize phase handler based on current phase
  const phaseHandlerRef = useRef<CombatPhaseHandler>(new DeploymentPhaseHandler());

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

  // Store loaded sprite images
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Track if sprites are loaded
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Track window resize to force re-render
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track selected fonts for testing
  const [headerFont, setHeaderFont] = useState<string>('DungeonSlant');
  const [dialogFont, setDialogFont] = useState<string>('Bitfantasy');
  const [buttonFont, setButtonFont] = useState<string>('Bitfantasy');

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

  // Load the selected fonts
  useEffect(() => {
    setFontsLoaded(false);

    // Use the Font Loading API to ensure the fonts are ready
    const loadFonts = async () => {
      try {
        // Load header font at various sizes
        await document.fonts.load(`48px "${headerFont}"`);
        await document.fonts.load(`32px "${headerFont}"`);

        // Load dialog font at various sizes
        await document.fonts.load(`24px "${dialogFont}"`);
        await document.fonts.load(`16px "${dialogFont}"`);

        console.log(`CombatView: Fonts "${headerFont}" and "${dialogFont}" loaded successfully`);
        setFontsLoaded(true);
      } catch (error) {
        console.warn(`CombatView: Failed to load fonts`, error);
        // Still set as loaded to prevent blocking
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, [headerFont, dialogFont]);

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load sprite images
  useEffect(() => {
    const loadSprites = async () => {
      const spritesToLoad = new Set<string>();

      // Collect all sprite IDs from the map
      const allCells = combatState.map.getAllCells();

      for (const { cell } of allCells) {
        if (cell.spriteId) {
          spritesToLoad.add(cell.spriteId);
        }
      }

      // Get phase-specific sprites from the phase handler
      const phaseSprites = phaseHandlerRef.current.getRequiredSprites(combatState, encounter);
      phaseSprites.spriteIds.forEach(id => spritesToLoad.add(id));

      // Load each sprite image
      const loadPromises = Array.from(spritesToLoad).map(async (spriteId) => {
        const spriteDef = SpriteRegistry.getById(spriteId);
        if (!spriteDef) {
          console.warn(`Sprite not found: ${spriteId}`);
          return;
        }

        // Check if we already loaded this sprite sheet
        if (!spriteImagesRef.current.has(spriteDef.spriteSheet)) {
          const img = new Image();
          img.src = spriteDef.spriteSheet;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              spriteImagesRef.current.set(spriteDef.spriteSheet, img);
              resolve();
            };
            img.onerror = (err) => {
              console.error(`CombatView: Failed to load sprite sheet ${spriteDef.spriteSheet}`, err);
              reject(err);
            };
          });
        }
      });

      await Promise.all(loadPromises);
      setSpritesLoaded(true);
    };

    loadSprites().catch(console.error);
  }, [combatState.map, combatState.phase, encounter]);

  // Start the intro cinematic sequence when encounter loads (only once)
  useEffect(() => {
    if (spritesLoaded && fontsLoaded && !introCinematicPlayedRef.current) {
      // Calculate message positions
      // Waylaid message: 8px below Deploy Units title (which has background ending at y=100)
      const waylaidMessageY = 108;
      // Deployment instruction: 8px below map bottom
      const mapHeight = combatState.map.height * TILE_SIZE;
      const offsetY = (CANVAS_SIZE - mapHeight) / 2;
      const deploymentInstructionY = offsetY + mapHeight + 8;

      // Run all intro animations in parallel
      const introSequence = new SequenceParallel([
        new MapFadeInSequence(2.0),
        new TitleFadeInSequence('Deploy Units', 1.0, 48, 20),
        new MessageFadeInSequence('Click [sprite:gradients-7] to deploy a unit.', 1.0, dialogFont, 36, deploymentInstructionY),
        new MessageFadeInSequence('You have been waylaid by enemies and must defend yourself.', 2.0, dialogFont, 36, waylaidMessageY)
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

    // Set canvas sizes to 960x960
    bufferCanvas.width = CANVAS_SIZE;
    bufferCanvas.height = CANVAS_SIZE;
    displayCanvas.width = CANVAS_SIZE;
    displayCanvas.height = CANVAS_SIZE;

    // Calculate map size in pixels
    const mapWidth = combatState.map.width * TILE_SIZE;
    const mapHeight = combatState.map.height * TILE_SIZE;

    // Calculate offset to center the map on the canvas
    const offsetX = (CANVAS_SIZE - mapWidth) / 2;
    const offsetY = (CANVAS_SIZE - mapHeight) / 2;

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) return;

    // Clear the buffer
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Check if a cinematic is playing
    const cinematicPlaying = cinematicManagerRef.current.isPlayingCinematic();

    // If cinematic is playing, render it instead of normal gameplay
    if (cinematicPlaying) {
      cinematicManagerRef.current.render(combatState, encounter, {
        ctx,
        canvasSize: CANVAS_SIZE,
        tileSize: TILE_SIZE,
        spriteSize: SPRITE_SIZE,
        offsetX,
        offsetY,
        spriteImages: spriteImagesRef.current,
      });

      // Copy buffer to display canvas and return early
      const displayCtx = displayCanvas.getContext('2d');
      if (displayCtx) {
        displayCtx.imageSmoothingEnabled = false;
        displayCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        displayCtx.drawImage(bufferCanvas, 0, 0);
      }
      return;
    }

    // Render each cell with offset to center the map
    const allCells = combatState.map.getAllCells();

    for (const { position, cell } of allCells) {
      const x = position.x * TILE_SIZE + offsetX;
      const y = position.y * TILE_SIZE + offsetY;

      if (cell.spriteId) {
        const spriteDef = SpriteRegistry.getById(cell.spriteId);
        if (spriteDef) {
          const spriteImage = spriteImagesRef.current.get(spriteDef.spriteSheet);
          if (spriteImage) {
            // Calculate source rectangle in the sprite sheet (12x12 sprites)
            const srcX = spriteDef.x * SPRITE_SIZE;
            const srcY = spriteDef.y * SPRITE_SIZE;
            const srcWidth = (spriteDef.width || 1) * SPRITE_SIZE;
            const srcHeight = (spriteDef.height || 1) * SPRITE_SIZE;

            // Draw the sprite scaled up 4x
            ctx.drawImage(
              spriteImage,
              srcX, srcY, srcWidth, srcHeight,
              x, y, TILE_SIZE, TILE_SIZE
            );
          } else {
            console.warn(`CombatView: Sprite image not loaded for ${cell.spriteId}`);
          }
        } else {
          console.warn(`CombatView: Sprite definition not found for ${cell.spriteId}`);
        }
      } else {
        // Render a default tile based on terrain type
        ctx.fillStyle = cell.walkable ? '#444444' : '#222222';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Draw grid lines
        ctx.strokeStyle = '#666666';
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    // Render phase-specific overlays using the phase handler (before units so deployment zones appear below)
    phaseHandlerRef.current.render(combatState, encounter, {
      ctx,
      canvasSize: CANVAS_SIZE,
      tileSize: TILE_SIZE,
      spriteSize: SPRITE_SIZE,
      offsetX,
      offsetY,
      spriteImages: spriteImagesRef.current,
      headerFont,
      dialogFont,
    });

    // Render deployed units from the manifest (after deployment zones so they appear on top)
    const allUnits = combatState.unitManifest.getAllUnits();
    for (const { unit, position } of allUnits) {
      const x = position.x * TILE_SIZE + offsetX;
      const y = position.y * TILE_SIZE + offsetY;

      // Get the unit's sprite
      const spriteId = unit.spriteId;
      if (spriteId) {
        const spriteDef = SpriteRegistry.getById(spriteId);
        if (spriteDef) {
          const spriteImage = spriteImagesRef.current.get(spriteDef.spriteSheet);
          if (spriteImage) {
            // Calculate source rectangle in the sprite sheet
            const srcX = spriteDef.x * SPRITE_SIZE;
            const srcY = spriteDef.y * SPRITE_SIZE;
            const srcWidth = (spriteDef.width || 1) * SPRITE_SIZE;
            const srcHeight = (spriteDef.height || 1) * SPRITE_SIZE;

            // Draw the unit sprite
            ctx.drawImage(
              spriteImage,
              srcX, srcY, srcWidth, srcHeight,
              x, y, TILE_SIZE, TILE_SIZE
            );
          }
        }
      }
    }

    // Render phase UI elements (header, dialogs) after units so they appear on top
    if (phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      phaseHandlerRef.current.renderUI(combatState, encounter, {
        ctx,
        canvasSize: CANVAS_SIZE,
        tileSize: TILE_SIZE,
        spriteSize: SPRITE_SIZE,
        offsetX,
        offsetY,
        spriteImages: spriteImagesRef.current,
        headerFont,
        dialogFont,
      });
    }

    // Copy buffer to display canvas
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      displayCtx.imageSmoothingEnabled = false;
      displayCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      displayCtx.drawImage(bufferCanvas, 0, 0);
    }
  }, [spritesLoaded, fontsLoaded, combatState, windowSize, headerFont, dialogFont, encounter]);

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
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
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
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
      handler.handleButtonMouseUp(canvasX, canvasY);
    }
  }, [combatState.phase]);

  // Handle canvas click for deployment zone selection and character selection
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    // Get canvas bounding rect
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor (canvas might be scaled to fit viewport)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    // Get click position relative to canvas
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Calculate map offset (same as rendering)
    const offsetX = (CANVAS_SIZE - (combatState.map.width * TILE_SIZE)) / 2;
    const offsetY = (CANVAS_SIZE - (combatState.map.height * TILE_SIZE)) / 2;

    // Pass click to phase handler (if deployment phase)
    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;

      // First check if clicking on a character in the dialog
      const characterIndex = handler.handleCharacterClick(canvasX, canvasY, 3);
      if (characterIndex !== null) {
        // Character was clicked - create unit and place it
        const partyMembers = PartyMemberRegistry.getAll().slice(0, 3);
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
  }, [combatState, encounter, setCombatState]);

  // Handle canvas mouse move for hover detection
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    // Get canvas bounding rect
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor (canvas might be scaled to fit viewport)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    // Get mouse position relative to canvas
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Pass mouse move to phase handler (if deployment phase)
    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
      handler.handleMouseMove(canvasX, canvasY, 3); // 3 characters in the list
      handler.handleButtonMouseMove(canvasX, canvasY); // Handle button hover
    }
  }, [combatState.phase]);

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
            maxWidth: `${CANVAS_SIZE}px`,
            maxHeight: `${CANVAS_SIZE}px`,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            cursor: combatState.phase === 'deployment' ? 'pointer' : 'default',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

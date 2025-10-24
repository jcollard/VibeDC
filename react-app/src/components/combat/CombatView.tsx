import { useState, useRef, useEffect, useCallback } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import type { CombatPhaseHandler } from '../../models/combat/CombatPhaseHandler';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { DeploymentPhaseHandler } from '../../models/combat/DeploymentPhaseHandler';

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
  const [combatState] = useState<CombatState>({
    turnNumber: 0,
    map: encounter.map,
    tilesetId: encounter.tilesetId || 'default',
    phase: 'deployment', // Start in deployment phase
  });

  // Initialize phase handler based on current phase
  const phaseHandlerRef = useRef<CombatPhaseHandler>(new DeploymentPhaseHandler());

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
      console.log('CombatView: Loading sprites for', allCells.length, 'cells');

      for (const { cell } of allCells) {
        if (cell.spriteId) {
          spritesToLoad.add(cell.spriteId);
        }
      }

      // Get phase-specific sprites from the phase handler
      const phaseSprites = phaseHandlerRef.current.getRequiredSprites(combatState, encounter);
      phaseSprites.spriteIds.forEach(id => spritesToLoad.add(id));

      console.log('CombatView: Sprites to load:', Array.from(spritesToLoad));

      // Load each sprite image
      const loadPromises = Array.from(spritesToLoad).map(async (spriteId) => {
        const spriteDef = SpriteRegistry.getById(spriteId);
        if (!spriteDef) {
          console.warn(`Sprite not found: ${spriteId}`);
          return;
        }

        console.log(`CombatView: Loading sprite ${spriteId} from ${spriteDef.spriteSheet}`);

        // Check if we already loaded this sprite sheet
        if (!spriteImagesRef.current.has(spriteDef.spriteSheet)) {
          const img = new Image();
          img.src = spriteDef.spriteSheet;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              spriteImagesRef.current.set(spriteDef.spriteSheet, img);
              console.log(`CombatView: Loaded sprite sheet ${spriteDef.spriteSheet}`);
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
      console.log('CombatView: All sprites loaded');
      setSpritesLoaded(true);
    };

    loadSprites().catch(console.error);
  }, [combatState.map, combatState.phase, encounter]);

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

    console.log(`CombatView: Canvas size: ${CANVAS_SIZE}x${CANVAS_SIZE}`);
    console.log(`CombatView: Map size: ${mapWidth}x${mapHeight} (${combatState.map.width}x${combatState.map.height} tiles)`);
    console.log(`CombatView: Offset: (${offsetX}, ${offsetY})`);

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) return;

    // Clear the buffer
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Render each cell with offset to center the map
    const allCells = combatState.map.getAllCells();
    let renderedSprites = 0;
    let renderedDefaults = 0;

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
            renderedSprites++;
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
        renderedDefaults++;
      }
    }

    console.log(`CombatView: Rendered ${renderedSprites} sprites, ${renderedDefaults} default tiles`);

    // Render phase-specific overlays using the phase handler
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

      // Update phase handler (for animations)
      if (phaseHandlerRef.current.update) {
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

  // Handle canvas click for deployment zone selection
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
      const clicked = handler.handleClick(canvasX, canvasY, TILE_SIZE, offsetX, offsetY, encounter);

      if (clicked) {
        console.log('Deployment zone selected:', handler.getSelectedZoneIndex());
      }
    }
  }, [combatState.map.width, combatState.map.height, combatState.phase, encounter]);

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

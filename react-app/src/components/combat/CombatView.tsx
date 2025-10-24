import { useState, useRef, useEffect } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

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
    tilesetId: encounter.tilesetId,
  });

  // Canvas refs for double buffering
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store loaded sprite images
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Track if sprites are loaded
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Track window resize to force re-render
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

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
  }, [combatState.map]);

  // Render the map to the canvas
  useEffect(() => {
    if (!spritesLoaded) {
      console.log('CombatView: Sprites not loaded yet, skipping render');
      return;
    }

    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) {
      console.log('CombatView: Display canvas not ready');
      return;
    }

    console.log('CombatView: Starting render');

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

    // Copy buffer to display canvas
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      displayCtx.imageSmoothingEnabled = false;
      displayCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      displayCtx.drawImage(bufferCanvas, 0, 0);
      console.log('CombatView: Copied buffer to display canvas');
    }
  }, [spritesLoaded, combatState, windowSize]);

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
          style={{
            width: '100%',
            height: '100%',
            maxWidth: `${CANVAS_SIZE}px`,
            maxHeight: `${CANVAS_SIZE}px`,
            imageRendering: 'pixelated',
            objectFit: 'contain',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

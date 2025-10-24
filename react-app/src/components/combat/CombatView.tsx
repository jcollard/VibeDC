import { useState, useRef, useEffect } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

interface CombatViewProps {
  encounter: CombatEncounter;
  onExit?: () => void;
}

const SPRITE_SIZE = 12; // Size of each sprite in the sprite sheet (12x12 pixels)
const SCALE = 4; // Scale factor for rendering
const TILE_SIZE = SPRITE_SIZE * SCALE; // Size of each tile when rendered (48x48 pixels)

/**
 * CombatView is the main view for displaying and interacting with combat encounters.
 * This is a placeholder component that will be expanded as the combat system is implemented.
 */
export const CombatView: React.FC<CombatViewProps> = ({ encounter, onExit }) => {
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

    // Set canvas sizes
    const width = combatState.map.width * TILE_SIZE;
    const height = combatState.map.height * TILE_SIZE;

    console.log(`CombatView: Canvas size: ${width}x${height} (${combatState.map.width}x${combatState.map.height} tiles)`);

    bufferCanvas.width = width;
    bufferCanvas.height = height;
    displayCanvas.width = width;
    displayCanvas.height = height;

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) return;

    // Clear the buffer
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Render each cell
    const allCells = combatState.map.getAllCells();
    let renderedSprites = 0;
    let renderedDefaults = 0;

    for (const { position, cell } of allCells) {
      const x = position.x * TILE_SIZE;
      const y = position.y * TILE_SIZE;

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
      displayCtx.clearRect(0, 0, width, height);
      displayCtx.drawImage(bufferCanvas, 0, 0);
      console.log('CombatView: Copied buffer to display canvas');
    }
  }, [spritesLoaded, combatState]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '2px solid #666',
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>
            {encounter.name}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            {encounter.description}
          </div>
        </div>
        {onExit && (
          <button
            onClick={onExit}
            style={{
              padding: '8px 16px',
              background: 'rgba(244, 67, 54, 0.3)',
              border: '1px solid rgba(244, 67, 54, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            Exit Combat
          </button>
        )}
      </div>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflow: 'auto',
        }}
      >
        {/* Combat State Info */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '4px',
            border: '2px solid rgba(33, 150, 243, 0.4)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
            Combat State (Placeholder)
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            <div><strong>Turn Number:</strong> {combatState.turnNumber}</div>
            <div><strong>Encounter ID:</strong> {encounter.id}</div>
            <div><strong>Map Size:</strong> {encounter.map.width} × {encounter.map.height}</div>
            <div><strong>Enemies:</strong> {encounter.enemyCount}</div>
            <div><strong>Deployment Zones:</strong> {encounter.deploymentSlotCount}</div>
          </div>
        </div>

        {/* Combat Map Canvas */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
          }}
        >
          <canvas
            ref={displayCanvasRef}
            style={{
              imageRendering: 'pixelated',
              imageRendering: 'crisp-edges',
              border: '2px solid rgba(33, 150, 243, 0.4)',
              background: '#000',
            }}
          />
        </div>

        {/* Placeholder for action panel */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
            Actions
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            Available actions will appear here (Move, Attack, Use Ability, End Turn, etc.)
          </div>
        </div>
      </div>
    </div>
  );
};

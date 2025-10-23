import { useEffect, useRef } from 'react';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { EnemyRegistry } from '../../utils/EnemyRegistry';

interface EncounterPreviewProps {
  encounter: CombatEncounter;
}

/**
 * EncounterPreview displays a visual preview of the combat encounter map.
 * Shows the map grid with sprites rendered at 2x scale, including enemy sprites.
 */
export const EncounterPreview: React.FC<EncounterPreviewProps> = ({ encounter }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SPRITE_SIZE = 12; // Base sprite size in pixels
    const SCALE = 2; // 2x scale
    const SCALED_SIZE = SPRITE_SIZE * SCALE;

    // Set canvas size based on map dimensions
    canvas.width = encounter.map.width * SCALED_SIZE;
    canvas.height = encounter.map.height * SCALED_SIZE;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Track loaded images to know when all are ready
    const imagesToLoad = new Set<string>();
    const loadedImages = new Map<string, HTMLImageElement>();

    // Collect all unique sprite sheets needed (from map tiles)
    for (let y = 0; y < encounter.map.height; y++) {
      for (let x = 0; x < encounter.map.width; x++) {
        const cell = encounter.map.getCell({ x, y });
        if (cell?.spriteId) {
          const sprite = SpriteRegistry.getById(cell.spriteId);
          if (sprite && !imagesToLoad.has(sprite.spriteSheet)) {
            imagesToLoad.add(sprite.spriteSheet);
          }
        }
      }
    }

    // Collect sprite sheets from enemy placements
    for (const placement of encounter.enemyPlacements) {
      const enemyDef = EnemyRegistry.getById(placement.enemyId);
      if (enemyDef?.spriteId) {
        const sprite = SpriteRegistry.getById(enemyDef.spriteId);
        if (sprite && !imagesToLoad.has(sprite.spriteSheet)) {
          imagesToLoad.add(sprite.spriteSheet);
        }
      }
    }

    // Load all sprite sheets
    let loadedCount = 0;
    imagesToLoad.forEach(spriteSheetUrl => {
      const img = new Image();
      img.src = spriteSheetUrl;
      img.onload = () => {
        loadedImages.set(spriteSheetUrl, img);
        loadedCount++;

        // When all images are loaded, render the map
        if (loadedCount === imagesToLoad.size) {
          renderMap();
        }
      };
      img.onerror = () => {
        console.error(`Failed to load sprite sheet: ${spriteSheetUrl}`);
        loadedCount++;
        if (loadedCount === imagesToLoad.size) {
          renderMap();
        }
      };
    });

    // If no images to load, render immediately
    if (imagesToLoad.size === 0) {
      renderMap();
    }

    function renderMap() {
      if (!ctx) return;

      // Render each cell
      for (let y = 0; y < encounter.map.height; y++) {
        for (let x = 0; x < encounter.map.width; x++) {
          const cell = encounter.map.getCell({ x, y });
          if (!cell) continue;

          const screenX = x * SCALED_SIZE;
          const screenY = y * SCALED_SIZE;

          if (cell.spriteId) {
            const sprite = SpriteRegistry.getById(cell.spriteId);
            if (sprite) {
              const img = loadedImages.get(sprite.spriteSheet);
              if (img) {
                // Draw the sprite from the sprite sheet
                ctx.drawImage(
                  img,
                  sprite.x * SPRITE_SIZE,
                  sprite.y * SPRITE_SIZE,
                  SPRITE_SIZE,
                  SPRITE_SIZE,
                  screenX,
                  screenY,
                  SCALED_SIZE,
                  SCALED_SIZE
                );
              } else {
                // Sprite sheet not loaded, draw placeholder
                drawPlaceholder(screenX, screenY, '#666');
              }
            } else {
              // Sprite not found, draw error placeholder
              drawPlaceholder(screenX, screenY, '#c44');
            }
          } else {
            // No sprite, draw based on terrain type
            const color = getTerrainColor(cell.terrain);
            ctx.fillStyle = color;
            ctx.fillRect(screenX, screenY, SCALED_SIZE, SCALED_SIZE);
          }

          // Draw grid lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, SCALED_SIZE, SCALED_SIZE);
        }
      }

      // Draw enemy placements with sprites
      for (const placement of encounter.enemyPlacements) {
        const screenX = placement.position.x * SCALED_SIZE;
        const screenY = placement.position.y * SCALED_SIZE;

        const enemyDef = EnemyRegistry.getById(placement.enemyId);
        if (enemyDef?.spriteId) {
          const sprite = SpriteRegistry.getById(enemyDef.spriteId);
          if (sprite) {
            const img = loadedImages.get(sprite.spriteSheet);
            if (img) {
              // Draw the enemy sprite
              ctx.drawImage(
                img,
                sprite.x * SPRITE_SIZE,
                sprite.y * SPRITE_SIZE,
                SPRITE_SIZE,
                SPRITE_SIZE,
                screenX,
                screenY,
                SCALED_SIZE,
                SCALED_SIZE
              );
            } else {
              // Sprite sheet not loaded, draw red placeholder with 'E'
              drawEnemyPlaceholder(screenX, screenY);
            }
          } else {
            // Sprite not found, draw red placeholder with 'E'
            drawEnemyPlaceholder(screenX, screenY);
          }
        } else {
          // No sprite defined for enemy, draw red placeholder with 'E'
          drawEnemyPlaceholder(screenX, screenY);
        }

        // Draw red border around enemy position
        ctx.strokeStyle = 'rgba(244, 67, 54, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, SCALED_SIZE, SCALED_SIZE);
      }

      // Draw deployment zones
      for (const zone of encounter.playerDeploymentZones) {
        const screenX = zone.x * SCALED_SIZE;
        const screenY = zone.y * SCALED_SIZE;

        // Draw green overlay
        ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
        ctx.fillRect(screenX, screenY, SCALED_SIZE, SCALED_SIZE);

        // Draw green border
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, SCALED_SIZE, SCALED_SIZE);

        // Draw 'P' marker
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', screenX + SCALED_SIZE / 2, screenY + SCALED_SIZE / 2);
      }
    }

    function drawPlaceholder(x: number, y: number, color: string) {
      if (!ctx) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, SCALED_SIZE, SCALED_SIZE);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + SCALED_SIZE / 2, y + SCALED_SIZE / 2);
    }

    function drawEnemyPlaceholder(x: number, y: number) {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(244, 67, 54, 0.4)';
      ctx.fillRect(x, y, SCALED_SIZE, SCALED_SIZE);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', x + SCALED_SIZE / 2, y + SCALED_SIZE / 2);
    }

    function getTerrainColor(terrain: string): string {
      switch (terrain.toLowerCase()) {
        case 'floor': return '#666';
        case 'wall': return '#333';
        case 'water': return '#36c';
        case 'pit': return '#000';
        case 'lava': return '#c30';
        default: return '#444';
      }
    }
  }, [encounter]);

  return (
    <div
      style={{
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#4fc3f7' }}>
        Map Preview
      </div>
      <div
        style={{
          background: '#000',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '3px',
          padding: '8px',
          display: 'inline-block',
          overflow: 'auto',
          maxWidth: '100%',
          maxHeight: '400px',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            imageRendering: 'pixelated',
            display: 'block',
          } as React.CSSProperties}
        />
      </div>
      <div style={{ fontSize: '9px', color: '#aaa', fontStyle: 'italic' }}>
        <span style={{ color: '#4caf50' }}>■ P</span> = Player deployment zones |{' '}
        <span style={{ color: '#f44336' }}>Red border</span> = Enemy placements (with sprite)
      </div>
    </div>
  );
};

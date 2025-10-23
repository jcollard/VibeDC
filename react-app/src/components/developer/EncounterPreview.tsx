import { useEffect, useRef, useState } from 'react';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { EnemyRegistry } from '../../utils/EnemyRegistry';

interface EncounterPreviewProps {
  encounter: CombatEncounter;
  isEditing?: boolean;
  onEnemyMove?: (enemyIndex: number, newX: number, newY: number) => void;
  onDeploymentZoneMove?: (zoneIndex: number, newX: number, newY: number) => void;
  onEnemyRemove?: (enemyIndex: number) => void;
  onDeploymentZoneRemove?: (zoneIndex: number) => void;
}

/**
 * EncounterPreview displays a visual preview of the combat encounter map.
 * Shows the map grid with sprites rendered at 2x scale, including enemy sprites.
 * In edit mode, allows clicking to select and move enemies.
 */
export const EncounterPreview: React.FC<EncounterPreviewProps> = ({
  encounter,
  isEditing = false,
  onEnemyMove,
  onDeploymentZoneMove,
  onEnemyRemove,
  onDeploymentZoneRemove
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedEnemyIndex, setSelectedEnemyIndex] = useState<number | null>(null);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number | null>(null);

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const SPRITE_SIZE = 12;
    const SCALE = 2;
    const SCALED_SIZE = SPRITE_SIZE * SCALE;

    // Get click position relative to canvas
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Convert to grid coordinates
    const gridX = Math.floor(clickX / SCALED_SIZE);
    const gridY = Math.floor(clickY / SCALED_SIZE);

    // Check if click is within map bounds
    if (gridX < 0 || gridX >= encounter.map.width || gridY < 0 || gridY >= encounter.map.height) {
      return;
    }

    // Check if clicked on an enemy
    const clickedEnemyIndex = encounter.enemyPlacements.findIndex(
      placement => placement.position.x === gridX && placement.position.y === gridY
    );

    // Check if clicked on a deployment zone
    const clickedZoneIndex = encounter.playerDeploymentZones.findIndex(
      zone => zone.x === gridX && zone.y === gridY
    );

    if (clickedEnemyIndex !== -1) {
      // Clicked on an enemy - toggle selection, deselect zone
      setSelectedZoneIndex(null);
      if (selectedEnemyIndex === clickedEnemyIndex) {
        setSelectedEnemyIndex(null); // Deselect
      } else {
        setSelectedEnemyIndex(clickedEnemyIndex); // Select
      }
    } else if (clickedZoneIndex !== -1) {
      // Clicked on a deployment zone - toggle selection, deselect enemy
      setSelectedEnemyIndex(null);
      if (selectedZoneIndex === clickedZoneIndex) {
        setSelectedZoneIndex(null); // Deselect
      } else {
        setSelectedZoneIndex(clickedZoneIndex); // Select
      }
    } else if (selectedEnemyIndex !== null) {
      // Clicked on empty space with an enemy selected - try to move
      const cell = encounter.map.getCell({ x: gridX, y: gridY });

      if (cell?.walkable) {
        // Check if position is already occupied by another enemy
        const isOccupiedByEnemy = encounter.enemyPlacements.some(
          (placement, index) =>
            index !== selectedEnemyIndex &&
            placement.position.x === gridX &&
            placement.position.y === gridY
        );

        // Check if position is occupied by a deployment zone
        const isOccupiedByZone = encounter.playerDeploymentZones.some(
          zone => zone.x === gridX && zone.y === gridY
        );

        if (!isOccupiedByEnemy && !isOccupiedByZone && onEnemyMove) {
          onEnemyMove(selectedEnemyIndex, gridX, gridY);
          setSelectedEnemyIndex(null); // Deselect after moving
        }
      }
    } else if (selectedZoneIndex !== null) {
      // Clicked on empty space with a deployment zone selected - try to move
      const cell = encounter.map.getCell({ x: gridX, y: gridY });

      if (cell?.walkable) {
        // Check if position is already occupied by an enemy
        const isOccupiedByEnemy = encounter.enemyPlacements.some(
          placement => placement.position.x === gridX && placement.position.y === gridY
        );

        // Check if position is occupied by another deployment zone
        const isOccupiedByZone = encounter.playerDeploymentZones.some(
          (zone, index) =>
            index !== selectedZoneIndex &&
            zone.x === gridX &&
            zone.y === gridY
        );

        if (!isOccupiedByEnemy && !isOccupiedByZone && onDeploymentZoneMove) {
          onDeploymentZoneMove(selectedZoneIndex, gridX, gridY);
          setSelectedZoneIndex(null); // Deselect after moving
        }
      }
    }
  };

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
      for (let i = 0; i < encounter.enemyPlacements.length; i++) {
        const placement = encounter.enemyPlacements[i];
        const screenX = placement.position.x * SCALED_SIZE;
        const screenY = placement.position.y * SCALED_SIZE;
        const isSelected = selectedEnemyIndex === i;

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

        // Draw border around enemy position (yellow if selected, red if not)
        if (isSelected) {
          ctx.strokeStyle = 'rgba(255, 193, 7, 1.0)';
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = 'rgba(244, 67, 54, 0.8)';
          ctx.lineWidth = 2;
        }
        ctx.strokeRect(screenX, screenY, SCALED_SIZE, SCALED_SIZE);
      }

      // Draw deployment zones
      for (let i = 0; i < encounter.playerDeploymentZones.length; i++) {
        const zone = encounter.playerDeploymentZones[i];
        const screenX = zone.x * SCALED_SIZE;
        const screenY = zone.y * SCALED_SIZE;
        const isSelected = selectedZoneIndex === i;

        // Draw green overlay
        ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
        ctx.fillRect(screenX, screenY, SCALED_SIZE, SCALED_SIZE);

        // Draw border (cyan if selected, green if not)
        if (isSelected) {
          ctx.strokeStyle = 'rgba(0, 229, 255, 1.0)';
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
          ctx.lineWidth = 2;
        }
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
  }, [encounter, selectedEnemyIndex, selectedZoneIndex]);

  const handleDeleteClick = () => {
    if (selectedEnemyIndex !== null && onEnemyRemove) {
      onEnemyRemove(selectedEnemyIndex);
      setSelectedEnemyIndex(null);
    } else if (selectedZoneIndex !== null && onDeploymentZoneRemove) {
      onDeploymentZoneRemove(selectedZoneIndex);
      setSelectedZoneIndex(null);
    }
  };

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
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
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
            onClick={handleCanvasClick}
            style={{
              imageRendering: 'pixelated',
              display: 'block',
              cursor: isEditing ? 'pointer' : 'default',
            } as React.CSSProperties}
          />
        </div>
        {isEditing && (selectedEnemyIndex !== null || selectedZoneIndex !== null) && (
          <button
            onClick={handleDeleteClick}
            style={{
              padding: '8px 12px',
              background: 'rgba(244, 67, 54, 0.9)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: '1',
              minWidth: '40px',
              height: '40px',
            }}
            title={selectedEnemyIndex !== null ? 'Delete selected enemy' : 'Delete selected deployment zone'}
          >
            🗑️
          </button>
        )}
      </div>
      <div style={{ fontSize: '9px', color: '#aaa', fontStyle: 'italic' }}>
        <span style={{ color: '#4caf50' }}>■ P</span> = Player deployment zones |{' '}
        <span style={{ color: '#f44336' }}>Red border</span> = Enemy placements
        {isEditing && (
          <>
            {' | '}
            <span style={{ color: '#ffc107' }}>Yellow</span> = Selected enemy |{' '}
            <span style={{ color: '#00e5ff' }}>Cyan</span> = Selected zone (click empty walkable tile to move)
          </>
        )}
      </div>
    </div>
  );
};

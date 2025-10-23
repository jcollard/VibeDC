import { useEffect, useRef, useState } from 'react';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { EnemyRegistry } from '../../utils/EnemyRegistry';
import { TilesetRegistry } from '../../utils/TilesetRegistry';

// Helper component to render a sprite on a canvas
const SpriteCanvas: React.FC<{ spriteSheet: string; spriteX: number; spriteY: number; size: number }> = ({
  spriteSheet,
  spriteX,
  spriteY,
  size,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SPRITE_SIZE = 12;
    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(
        img,
        spriteX * SPRITE_SIZE,
        spriteY * SPRITE_SIZE,
        SPRITE_SIZE,
        SPRITE_SIZE,
        0,
        0,
        size,
        size
      );
    };
    img.src = spriteSheet;
  }, [spriteSheet, spriteX, spriteY, size]);

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />;
};

interface EncounterPreviewProps {
  encounter: CombatEncounter;
  isEditing?: boolean;
  onEnemyMove?: (enemyIndex: number, newX: number, newY: number) => void;
  onDeploymentZoneMove?: (zoneIndex: number, newX: number, newY: number) => void;
  onEnemyRemove?: (enemyIndex: number) => void;
  onDeploymentZoneRemove?: (zoneIndex: number) => void;
  onEnemyChange?: (enemyIndex: number, newEnemyId: string) => void;
  onAddEnemy?: () => void;
  onAddZone?: () => void;
  onTilePlacement?: (x: number, y: number, tileTypeIndex: number) => void;
  onBatchTilePlacement?: (tiles: Array<{ x: number; y: number; tileTypeIndex: number }>) => void;
  selectedTileIndex?: number | null;
  onSelectedTileIndexChange?: (index: number | null) => void;
  mapUpdateTrigger?: number;
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
  onDeploymentZoneRemove,
  onEnemyChange,
  onAddEnemy,
  onAddZone,
  onTilePlacement,
  onBatchTilePlacement,
  selectedTileIndex: selectedTileIndexProp,
  onSelectedTileIndexChange,
  mapUpdateTrigger
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedEnemyIndex, setSelectedEnemyIndex] = useState<number | null>(null);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number | null>(null);
  const [hoverGridPos, setHoverGridPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastDragPos, setLastDragPos] = useState<{ x: number; y: number } | null>(null);

  // Use controlled state if provided, otherwise use local state
  const [selectedTileIndexLocal, setSelectedTileIndexLocal] = useState<number | null>(null);
  const selectedTileIndex = selectedTileIndexProp !== undefined ? selectedTileIndexProp : selectedTileIndexLocal;
  const setSelectedTileIndex = onSelectedTileIndexChange || setSelectedTileIndexLocal;

  // Helper function to get all grid cells between two points (Bresenham's line algorithm)
  const getLineBetween = (x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> => {
    const points: Array<{ x: number; y: number }> = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      points.push({ x, y });

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return points;
  };

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

    // Priority 1: If a tile is selected, place it (overrides enemy/zone selection)
    if (selectedTileIndex !== null) {
      // Check if there's an enemy or zone at this position
      const hasEnemy = encounter.enemyPlacements.some(
        placement => placement.position.x === gridX && placement.position.y === gridY
      );
      const hasZone = encounter.playerDeploymentZones.some(
        zone => zone.x === gridX && zone.y === gridY
      );

      // Get the tileset to check if the tile is walkable
      if (encounter.tilesetId) {
        const tileset = TilesetRegistry.getById(encounter.tilesetId);
        if (tileset) {
          const tileType = tileset.tileTypes[selectedTileIndex];

          // Don't allow placing non-walkable tiles where enemies or zones are
          if (!tileType.walkable && (hasEnemy || hasZone)) {
            // Could add visual feedback here (e.g., flash the cell red)
            return; // Don't place the tile
          }
        }
      }

      // Place the tile
      if (onTilePlacement) {
        onTilePlacement(gridX, gridY, selectedTileIndex);
      }
      return; // Don't process enemy/zone clicks
    }

    // Priority 2: Check if clicked on an enemy (only if no tile selected)
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

  // Handle mouse move for tile preview and drag placement
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing || !canvasRef.current || selectedTileIndex === null) {
      setHoverGridPos(null);
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const SPRITE_SIZE = 12;
    const SCALE = 2;
    const SCALED_SIZE = SPRITE_SIZE * SCALE;

    // Get mouse position relative to canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert to grid coordinates
    const gridX = Math.floor(mouseX / SCALED_SIZE);
    const gridY = Math.floor(mouseY / SCALED_SIZE);

    // Check if within map bounds
    if (gridX >= 0 && gridX < encounter.map.width && gridY >= 0 && gridY < encounter.map.height) {
      setHoverGridPos({ x: gridX, y: gridY });

      // If dragging, place tiles along the line from last position to current position
      if (isDragging && (onBatchTilePlacement || onTilePlacement)) {
        const tileset = encounter.tilesetId ? TilesetRegistry.getById(encounter.tilesetId) : null;
        if (tileset) {
          const tileType = tileset.tileTypes[selectedTileIndex];
          if (tileType) {
            // Get all cells between last drag position and current position
            const cellsToFill = lastDragPos
              ? getLineBetween(lastDragPos.x, lastDragPos.y, gridX, gridY)
              : [{ x: gridX, y: gridY }];

            // Collect valid tiles to place
            const tilesToPlace: Array<{ x: number; y: number; tileTypeIndex: number }> = [];
            for (const cell of cellsToFill) {
              const hasEnemy = encounter.enemyPlacements.some(
                p => p.position.x === cell.x && p.position.y === cell.y
              );
              const hasZone = encounter.playerDeploymentZones.some(
                z => z.x === cell.x && z.y === cell.y
              );
              const isValidPlacement = tileType.walkable || (!hasEnemy && !hasZone);

              if (isValidPlacement) {
                tilesToPlace.push({ x: cell.x, y: cell.y, tileTypeIndex: selectedTileIndex });
              }
            }

            // Use batch placement if available (reduces re-renders), otherwise place one by one
            if (tilesToPlace.length > 0) {
              if (onBatchTilePlacement) {
                onBatchTilePlacement(tilesToPlace);
              } else if (onTilePlacement) {
                for (const tile of tilesToPlace) {
                  onTilePlacement(tile.x, tile.y, tile.tileTypeIndex);
                }
              }
            }
          }
        }
        // Update last drag position
        setLastDragPos({ x: gridX, y: gridY });
      }
    } else {
      setHoverGridPos(null);
    }
  };

  // Handle mouse down to start dragging
  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing || selectedTileIndex === null || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const SPRITE_SIZE = 12;
    const SCALE = 2;
    const SCALED_SIZE = SPRITE_SIZE * SCALE;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridX = Math.floor(mouseX / SCALED_SIZE);
    const gridY = Math.floor(mouseY / SCALED_SIZE);

    setIsDragging(true);
    setLastDragPos({ x: gridX, y: gridY });
  };

  // Handle mouse up to stop dragging
  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setLastDragPos(null);
  };

  // Handle mouse leave
  const handleCanvasMouseLeave = () => {
    setHoverGridPos(null);
    setIsDragging(false);
    setLastDragPos(null);
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

    // Collect all unique sprite sheets needed from the current tileset
    if (encounter.tilesetId) {
      const tileset = TilesetRegistry.getById(encounter.tilesetId);
      if (tileset) {
        for (const tileType of tileset.tileTypes) {
          if (tileType.spriteId) {
            const sprite = SpriteRegistry.getById(tileType.spriteId);
            if (sprite && !imagesToLoad.has(sprite.spriteSheet)) {
              imagesToLoad.add(sprite.spriteSheet);
            }
          }
        }
      }
    }

    // Also collect sprite sheets from cell.spriteId (for fallback rendering)
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

          // Check if this cell matches a tile type in the current tileset
          // We match by terrain and walkable only (not spriteId) since different
          // tilesets may use different sprites for the same logical tile
          let cellMatchesTileset = false;
          let tileSprite = null;
          if (encounter.tilesetId) {
            const tileset = TilesetRegistry.getById(encounter.tilesetId);
            if (tileset) {
              // Find a matching tile type by terrain and walkable
              const matchingTileType = tileset.tileTypes.find(tt =>
                tt.terrain === cell.terrain &&
                tt.walkable === cell.walkable
              );
              if (matchingTileType) {
                cellMatchesTileset = true;
                // Use the sprite from the current tileset's tile type
                if (matchingTileType.spriteId) {
                  tileSprite = SpriteRegistry.getById(matchingTileType.spriteId);
                }
              }
            }
          }

          // If cell doesn't match any tile in the tileset, show red error
          if (encounter.tilesetId && !cellMatchesTileset) {
            drawPlaceholder(screenX, screenY, '#c44');
          } else if (tileSprite) {
            // Use sprite from current tileset
            const img = loadedImages.get(tileSprite.spriteSheet);
            if (img) {
              ctx.drawImage(
                img,
                tileSprite.x * SPRITE_SIZE,
                tileSprite.y * SPRITE_SIZE,
                SPRITE_SIZE,
                SPRITE_SIZE,
                screenX,
                screenY,
                SCALED_SIZE,
                SCALED_SIZE
              );
            } else {
              drawPlaceholder(screenX, screenY, '#666');
            }
          } else if (cell.spriteId) {
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

      // Draw hover preview for tile placement
      if (hoverGridPos && selectedTileIndex !== null && encounter.tilesetId) {
        const tileset = TilesetRegistry.getById(encounter.tilesetId);
        if (tileset) {
          const tileType = tileset.tileTypes[selectedTileIndex];
          if (tileType) {
            const screenX = hoverGridPos.x * SCALED_SIZE;
            const screenY = hoverGridPos.y * SCALED_SIZE;

            // Check if placement would be valid (for non-walkable tiles)
            const hasEnemy = encounter.enemyPlacements.some(
              p => p.position.x === hoverGridPos.x && p.position.y === hoverGridPos.y
            );
            const hasZone = encounter.playerDeploymentZones.some(
              z => z.x === hoverGridPos.x && z.y === hoverGridPos.y
            );
            const isValidPlacement = tileType.walkable || (!hasEnemy && !hasZone);

            // Draw preview tile with transparency
            if (tileType.spriteId) {
              const sprite = SpriteRegistry.getById(tileType.spriteId);
              if (sprite) {
                const img = loadedImages.get(sprite.spriteSheet);
                if (img) {
                  ctx.globalAlpha = isValidPlacement ? 0.5 : 0.3;
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
                  ctx.globalAlpha = 1.0;
                }
              }
            }

            // Draw border (green if valid, red if invalid)
            ctx.strokeStyle = isValidPlacement ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, SCALED_SIZE, SCALED_SIZE);
          }
        }
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
  }, [encounter, selectedEnemyIndex, selectedZoneIndex, hoverGridPos, selectedTileIndex, mapUpdateTrigger]);

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

      {/* Canvas - full width */}
      <div
        style={{
          background: '#000',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '3px',
          padding: '8px',
          display: 'inline-block',
          overflow: 'auto',
          maxWidth: '100%',
          maxHeight: '600px',
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          style={{
            imageRendering: 'pixelated',
            display: 'block',
            cursor: isEditing ? 'pointer' : 'default',
          } as React.CSSProperties}
        />
      </div>

      {/* Controls below the map */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {isEditing && selectedEnemyIndex !== null && (
          <div
            style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '4px',
              padding: '12px',
              minWidth: '200px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#ffc107' }}>
              Selected Enemy
            </div>
            <div style={{ fontSize: '11px' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#aaa' }}>Name:</span>{' '}
                <span style={{ color: '#fff' }}>
                  {EnemyRegistry.getById(encounter.enemyPlacements[selectedEnemyIndex].enemyId)?.name || 'Unknown'}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#aaa' }}>ID:</span>{' '}
                <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '10px' }}>
                  {encounter.enemyPlacements[selectedEnemyIndex].enemyId}
                </span>
              </div>
              <div style={{ marginBottom: '4px' }}>
                <label style={{ color: '#aaa', display: 'block', marginBottom: '4px' }}>
                  Change Enemy:
                </label>
                <select
                  value={encounter.enemyPlacements[selectedEnemyIndex].enemyId}
                  onChange={(e) => {
                    if (onEnemyChange) {
                      onEnemyChange(selectedEnemyIndex, e.target.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '3px',
                    fontSize: '11px',
                  }}
                >
                  {EnemyRegistry.getAllIds().map((enemyId) => {
                    const enemy = EnemyRegistry.getById(enemyId);
                    return (
                      <option key={enemyId} value={enemyId}>
                        {enemy?.name || enemyId}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <button
              onClick={handleDeleteClick}
              style={{
                padding: '6px 12px',
                background: 'rgba(244, 67, 54, 0.9)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              🗑️ Delete Enemy
            </button>
          </div>
        )}
        {isEditing && selectedZoneIndex !== null && (
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
            title="Delete selected deployment zone"
          >
            🗑️
          </button>
        )}
        {isEditing && selectedEnemyIndex === null && selectedZoneIndex === null && (onAddEnemy || onAddZone) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {onAddEnemy && (
              <button
                onClick={onAddEnemy}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(244, 67, 54, 0.3)',
                  color: '#fff',
                  border: '1px solid rgba(244, 67, 54, 0.6)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
                title="Add a new enemy to the encounter"
              >
                + Add Enemy
              </button>
            )}
            {onAddZone && (
              <button
                onClick={onAddZone}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(76, 175, 80, 0.3)',
                  color: '#fff',
                  border: '1px solid rgba(76, 175, 80, 0.6)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
                title="Add a new deployment zone to the encounter"
              >
                + Add Zone
              </button>
            )}
          </div>
        )}
        {/* Tile Palette */}
        {isEditing && selectedEnemyIndex === null && selectedZoneIndex === null && (
          <div
            style={{
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: '4px',
              padding: '12px',
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#2196f3' }}>
              Tile Palette
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {(() => {
                if (!encounter.tilesetId) return null;
                const tileset = TilesetRegistry.getById(encounter.tilesetId);
                if (!tileset) return null;

                return tileset.tileTypes.map((tileType, index) => {
                  const sprite = tileType.spriteId ? SpriteRegistry.getById(tileType.spriteId) : null;

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedTileIndex(selectedTileIndex === index ? null : index);
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: selectedTileIndex === index ? '2px solid rgba(33, 150, 243, 1.0)' : '1px solid rgba(255, 255, 255, 0.1)',
                        imageRendering: 'pixelated' as const,
                      }}
                    >
                      {sprite ? (
                        <SpriteCanvas
                          spriteSheet={sprite.spriteSheet}
                          spriteX={sprite.x}
                          spriteY={sprite.y}
                          size={24}
                        />
                      ) : (
                        <span style={{ fontSize: '16px' }}>{tileType.char}</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            {selectedTileIndex !== null && (() => {
              if (!encounter.tilesetId) return null;
              const tileset = TilesetRegistry.getById(encounter.tilesetId);
              const tileType = tileset?.tileTypes[selectedTileIndex];
              if (!tileType) return null;

              return (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '3px',
                  fontSize: '11px',
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2196f3' }}>
                    Selected Tile
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#aaa' }}>Char:</span>{' '}
                    <span style={{ color: '#fff', fontFamily: 'monospace' }}>{tileType.char}</span>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#aaa' }}>Terrain:</span>{' '}
                    <span style={{ color: '#fff' }}>{tileType.terrain}</span>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#aaa' }}>Walkable:</span>{' '}
                    <span style={{ color: tileType.walkable ? '#4caf50' : '#f44336' }}>
                      {tileType.walkable ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {tileType.spriteId && (
                    <div>
                      <span style={{ color: '#aaa' }}>Sprite ID:</span>{' '}
                      <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '10px' }}>
                        {tileType.spriteId}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
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

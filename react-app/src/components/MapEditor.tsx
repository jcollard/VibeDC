import React, { useEffect, useRef, useState } from 'react';
import { getTileTextureMapping } from '../utils/tileTextureConfig';

interface MapEditorProps {
  grid: string[];
  onClose?: () => void;
}

/**
 * Map editor panel for creating and editing maps
 */
export const MapEditor: React.FC<MapEditorProps> = ({ grid, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteSheetRef = useRef<HTMLImageElement | null>(null);

  const CELL_SIZE = 24; // 24x24 pixels per cell
  const SPRITE_SIZE = 12; // Size of each sprite in the spritesheet (12x12 grid)
  const DRAG_THRESHOLD = 5; // Pixels mouse must move before drag starts
  const gridWidth = grid[0]?.length || 0;
  const gridHeight = grid.length;

  // Selection state
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);

  // Load sprite sheet
  useEffect(() => {
    const img = new Image();
    img.src = '/tiles/world-tiles.png';
    img.onload = () => {
      spriteSheetRef.current = img;
      drawMap();
    };
  }, []);

  // Redraw map when grid or selection changes
  useEffect(() => {
    if (spriteSheetRef.current) {
      drawMap();
    }
  }, [grid, selectedCells]);

  const drawMap = () => {
    const canvas = canvasRef.current;
    const spriteSheet = spriteSheetRef.current;
    if (!canvas || !spriteSheet) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Draw each cell
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const tileType = grid[y][x];
        const textureMapping = getTileTextureMapping(tileType);

        // Determine which sprite to use for the map editor
        // Use wallFront for walls/doors, floor for everything else
        const spriteCoord = textureMapping.wallFront || textureMapping.floor;

        if (!spriteCoord) continue; // Skip if no sprite mapping found

        // Calculate source coordinates in the spritesheet
        const sx = spriteCoord.x * SPRITE_SIZE;
        const sy = spriteCoord.y * SPRITE_SIZE;

        // Calculate destination coordinates in the map editor
        const dx = x * CELL_SIZE;
        const dy = y * CELL_SIZE;

        // Draw the sprite
        ctx.drawImage(
          spriteSheet,
          sx, sy, SPRITE_SIZE, SPRITE_SIZE,  // Source position and size
          dx, dy, CELL_SIZE, CELL_SIZE       // Destination position and size
        );

        // Draw selection overlay if cell is selected
        const cellKey = `${x},${y}`;
        if (selectedCells.has(cellKey)) {
          ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Transparent yellow
          ctx.fillRect(dx, dy, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  };

  // Helper to get cell coordinates from mouse event
  const getCellFromMouseEvent = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const x = Math.floor(mouseX / CELL_SIZE);
    const y = Math.floor(mouseY / CELL_SIZE);

    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      return { x, y };
    }
    return null;
  };

  // Handle mouse down - start selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromMouseEvent(e);
    if (!cell) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Store mouse down position for drag threshold
    setMouseDownPos({ x: mouseX, y: mouseY });
    setDragStart(cell);

    const cellKey = `${cell.x},${cell.y}`;

    if (e.shiftKey) {
      // Shift-click: toggle selection
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        return newSet;
      });
    } else {
      // Regular click: start new selection
      setSelectedCells(new Set([cellKey]));
    }
  };

  // Handle mouse move - drag selection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart || !mouseDownPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if mouse has moved beyond threshold
    if (!isDragging) {
      const dx = mouseX - mouseDownPos.x;
      const dy = mouseY - mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < DRAG_THRESHOLD) {
        return; // Haven't moved far enough yet
      }

      // Start dragging
      setIsDragging(true);
    }

    const cell = getCellFromMouseEvent(e);
    if (!cell) return;

    // Calculate rectangle from drag start to current cell
    const minX = Math.min(dragStart.x, cell.x);
    const maxX = Math.max(dragStart.x, cell.x);
    const minY = Math.min(dragStart.y, cell.y);
    const maxY = Math.max(dragStart.y, cell.y);

    const newSelection = new Set<string>();
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        newSelection.add(`${x},${y}`);
      }
    }

    if (e.shiftKey) {
      // Shift-drag: add to existing selection
      setSelectedCells(prev => {
        const combined = new Set(prev);
        newSelection.forEach(cell => combined.add(cell));
        return combined;
      });
    } else {
      // Regular drag: replace selection
      setSelectedCells(newSelection);
    }
  };

  // Handle mouse up - end selection
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setMouseDownPos(null);
  };

  // Handle mouse leave - end selection
  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
    setMouseDownPos(null);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '2px solid #666',
      padding: '10px',
      borderRadius: '4px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '300px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold' }}>Map Editor</div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            title="Close map editor"
          >
            ×
          </button>
        )}
      </div>

      <div style={{
        maxHeight: '70vh',
        overflow: 'auto',
        padding: '10px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px'
      }}>
        <canvas
          ref={canvasRef}
          width={gridWidth * CELL_SIZE}
          height={gridHeight * CELL_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            imageRendering: 'pixelated',
            cursor: 'crosshair'
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

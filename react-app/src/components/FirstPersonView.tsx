import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import type { CardinalDirection } from '../types';
import { Cell } from './Cell';
import './FirstPersonView.css';

interface FirstPersonViewProps {
  playerX: number;
  playerY: number;
  direction: CardinalDirection;
  grid: string[];
  cameraOffset?: number; // Offset in the forward direction (0 = centered, -0.3 = back, 0.3 = forward)
}

/**
 * First-person 3D viewport showing the world from the player's perspective
 */
export const FirstPersonView: React.FC<FirstPersonViewProps> = ({
  playerX,
  playerY,
  direction,
  grid,
  cameraOffset = 0.3 // Default: slightly forward in the tile
}) => {
  // Calculate camera position offset based on direction
  const cameraPosition = useMemo(() => {
    // Camera is offset in the Z direction (forward/backward from player perspective)
    // Positive Z offset = camera is behind center (looking forward more)
    // Negative Z offset = camera is ahead of center (looking backward more)
    return [0, 0, cameraOffset] as [number, number, number];
  }, [cameraOffset]);

  // Calculate visible cells based on player position and direction
  const visibleCells = useMemo(() => {
    const cells: Array<{ x: number; z: number; tileType: string }> = [];
    const viewDistance = 8; // How far ahead to render
    const viewWidth = 6; // How wide the view is

    for (let depth = 0; depth <= viewDistance; depth++) {
      for (let lateral = -viewWidth; lateral <= viewWidth; lateral++) {
        const gridPos = getGridPosition(playerX, playerY, direction, depth, lateral);

        // Check bounds
        if (gridPos.y < 0 || gridPos.y >= grid.length ||
            gridPos.x < 0 || gridPos.x >= grid[gridPos.y].length) {
          // Out of bounds - treat as wall
          cells.push({ x: lateral, z: depth, tileType: '#' });
          continue;
        }

        const tileType = grid[gridPos.y][gridPos.x];
        cells.push({ x: lateral, z: depth, tileType });
      }
    }

    return cells;
  }, [playerX, playerY, direction, grid]);

  return (
    <div className="first-person-view">
      <Canvas>
        {/* Camera offset from tile center based on facing direction */}
        <PerspectiveCamera makeDefault position={cameraPosition} fov={75} />

        {/* Ambient light */}
        <ambientLight intensity={0.4} />

        {/* Directional light from above */}
        <directionalLight position={[0, 5, 2]} intensity={0.8} />

        {/* Point light at camera position for nearby lighting */}
        <pointLight position={cameraPosition} intensity={0.5} distance={5} />

        {/* Render all visible cells */}
        {visibleCells.map((cell, index) => (
          <Cell
            key={`${cell.x}-${cell.z}-${index}`}
            x={cell.x}
            z={cell.z}
            tileType={cell.tileType}
          />
        ))}

        {/* Fog for depth effect */}
        <fog attach="fog" args={['#0a0a0a', 2, 10]} />
      </Canvas>

      {/* Crosshair overlay */}
      <div className="crosshair">
        <div className="crosshair-horizontal"></div>
        <div className="crosshair-vertical"></div>
      </div>
    </div>
  );
};

/**
 * Get grid position based on relative distance and lateral offset
 */
function getGridPosition(
  playerX: number,
  playerY: number,
  direction: CardinalDirection,
  depth: number,
  lateral: number
): { x: number; y: number } {
  let gridX = playerX;
  let gridY = playerY;

  switch (direction) {
    case 'North':
      gridY -= depth;
      gridX += lateral;
      break;
    case 'South':
      gridY += depth;
      gridX -= lateral;
      break;
    case 'East':
      gridX += depth;
      gridY += lateral;
      break;
    case 'West':
      gridX -= depth;
      gridY -= lateral;
      break;
  }

  return { x: gridX, y: gridY };
}

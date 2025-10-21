import React from 'react';
import * as THREE from 'three';

interface CellProps {
  worldX: number; // Absolute world X position
  worldZ: number; // Absolute world Z position
  tileType: string;
  textures?: {
    floor?: THREE.Texture;
    ceiling?: THREE.Texture;
    wallFront?: THREE.Texture;
    wallBack?: THREE.Texture;
    wallLeft?: THREE.Texture;
    wallRight?: THREE.Texture;
  };
}

/**
 * A single cell in the 3D grid
 * Renders 6 planes: floor, ceiling, and 4 walls
 */
export const Cell: React.FC<CellProps> = ({ worldX, worldZ, tileType, textures }) => {
  const cellSize = 1;
  const halfSize = cellSize / 2;

  // Use absolute world positions directly
  const posX = worldX * cellSize;
  const posZ = worldZ * cellSize;

  // Small offset to prevent z-fighting between adjacent floor/ceiling tiles
  const depthOffset = (worldX + worldZ * 0.1) * 0.0001; // Offset based on world position

  // Fallback colors based on tile type (used if no textures provided)
  const isWall = tileType === '#';
  const isDoor = tileType === '+';
  const hasWalls = isWall || isDoor; // Both walls and doors render vertical surfaces

  const wallColor = isWall ? '#444444' : (isDoor ? '#8B4513' : '#666666');
  const floorColor = isWall ? '#222222' : '#333333';
  const ceilingColor = isWall ? '#1a1a1a' : '#2a2a2a';

  // Only render walls for wall and door tiles
  if (!hasWalls) {
    return (
      <group position={[posX, 0, posZ]}>
        {/* Floor */}
        <mesh position={[0, -halfSize + depthOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cellSize, cellSize]} />
          <meshStandardMaterial
            map={textures?.floor}
            color={textures?.floor ? '#ffffff' : floorColor}
            side={THREE.FrontSide}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-(worldZ * 10 + worldX + 1)}
          />
        </mesh>

        {/* Ceiling */}
        <mesh position={[0, halfSize - depthOffset, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cellSize, cellSize]} />
          <meshStandardMaterial
            map={textures?.ceiling}
            color={textures?.ceiling ? '#ffffff' : ceilingColor}
            side={THREE.FrontSide}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-(worldZ * 10 + worldX + 1)}
          />
        </mesh>
      </group>
    );
  }

  // Wall cell - render all 6 sides
  return (
    <group position={[posX, 0, posZ]}>
      {/* Floor */}
      <mesh position={[0, -halfSize + depthOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial
          map={textures?.floor}
          color={textures?.floor ? '#ffffff' : floorColor}
          side={THREE.FrontSide}
          polygonOffset={true}
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-(worldZ * 10 + worldX + 1)}
        />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, halfSize - depthOffset, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial
          map={textures?.ceiling}
          color={textures?.ceiling ? '#ffffff' : ceilingColor}
          side={THREE.FrontSide}
          polygonOffset={true}
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-(worldZ * 10 + worldX + 1)}
        />
      </mesh>

      {/* Front wall (toward player) */}
      <mesh position={[0, 0, halfSize]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial
          map={textures?.wallFront}
          color={textures?.wallFront ? '#ffffff' : wallColor}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Back wall (away from player) */}
      <mesh position={[0, 0, -halfSize]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial
          map={textures?.wallBack}
          color={textures?.wallBack ? '#ffffff' : wallColor}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Left wall */}
      <mesh position={[-halfSize, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial
          map={textures?.wallLeft}
          color={textures?.wallLeft ? '#ffffff' : wallColor}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Right wall */}
      <mesh position={[halfSize, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial
          map={textures?.wallRight}
          color={textures?.wallRight ? '#ffffff' : wallColor}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
};

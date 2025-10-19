import React from 'react';
import * as THREE from 'three';

interface CellProps {
  x: number; // Left/right position
  z: number; // Depth (distance from player)
  tileType: string;
}

/**
 * A single cell in the 3D grid
 * Renders 6 planes: floor, ceiling, and 4 walls
 */
export const Cell: React.FC<CellProps> = ({ x, z, tileType }) => {
  const cellSize = 1;
  const halfSize = cellSize / 2;

  // Position in 3D space
  const posX = x * cellSize;
  const posZ = -z * cellSize; // Negative Z is forward in Three.js

  // Colors based on tile type
  const isWall = tileType === '#';
  const wallColor = isWall ? '#444444' : '#666666';
  const floorColor = isWall ? '#222222' : '#333333';
  const ceilingColor = isWall ? '#1a1a1a' : '#2a2a2a';

  // Only render walls for wall tiles
  if (!isWall) {
    return (
      <group position={[posX, 0, posZ]}>
        {/* Floor */}
        <mesh position={[0, -halfSize, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cellSize, cellSize]} />
          <meshStandardMaterial color={floorColor} side={THREE.DoubleSide} />
        </mesh>

        {/* Ceiling */}
        <mesh position={[0, halfSize, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cellSize, cellSize]} />
          <meshStandardMaterial color={ceilingColor} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  // Wall cell - render all 6 sides
  return (
    <group position={[posX, 0, posZ]}>
      {/* Floor */}
      <mesh position={[0, -halfSize, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial color={floorColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, halfSize, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial color={ceilingColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Front wall (toward player) */}
      <mesh position={[0, 0, halfSize]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Back wall (away from player) */}
      <mesh position={[0, 0, -halfSize]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-halfSize, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall */}
      <mesh position={[halfSize, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[cellSize, cellSize]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

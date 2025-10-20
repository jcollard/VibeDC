import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface AnimatedCameraProps {
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  movementDuration: number; // Duration in seconds
  fov?: number;
}

/**
 * A camera that smoothly animates to target positions and rotations
 */
export const AnimatedCamera: React.FC<AnimatedCameraProps> = ({
  targetPosition,
  targetRotation,
  movementDuration,
  fov = 75
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  // Track current interpolated position and rotation
  const [currentPos, setCurrentPos] = useState<THREE.Vector3>(
    new THREE.Vector3(...targetPosition)
  );
  const [currentRot, setCurrentRot] = useState<THREE.Euler>(
    new THREE.Euler(...targetRotation)
  );

  // Track animation progress (0 to 1)
  const animationProgress = useRef<number>(1); // Start at 1 (complete)
  const startPos = useRef<THREE.Vector3>(new THREE.Vector3(...targetPosition));
  const startRot = useRef<THREE.Euler>(new THREE.Euler(...targetRotation));
  const endPos = useRef<THREE.Vector3>(new THREE.Vector3(...targetPosition));
  const endRot = useRef<THREE.Euler>(new THREE.Euler(...targetRotation));

  // When target changes, start new animation
  useEffect(() => {
    // Store current position as start
    startPos.current.copy(currentPos);
    startRot.current.copy(currentRot);

    // Store new target as end
    endPos.current.set(...targetPosition);
    endRot.current.set(...targetRotation);

    // Reset animation progress
    animationProgress.current = 0;
  }, [targetPosition[0], targetPosition[1], targetPosition[2],
      targetRotation[0], targetRotation[1], targetRotation[2]]);

  // Animate on each frame
  useFrame((state, delta) => {
    if (animationProgress.current < 1) {
      // Increment progress based on time
      animationProgress.current = Math.min(
        1,
        animationProgress.current + delta / movementDuration
      );

      // Linear interpolation
      const t = animationProgress.current;

      // Interpolate position
      const newPos = new THREE.Vector3().lerpVectors(
        startPos.current,
        endPos.current,
        t
      );
      setCurrentPos(newPos);

      // Interpolate rotation (handling angle wrapping for smooth rotation)
      const newRot = new THREE.Euler(
        THREE.MathUtils.lerp(startRot.current.x, endRot.current.x, t),
        lerpAngle(startRot.current.y, endRot.current.y, t),
        THREE.MathUtils.lerp(startRot.current.z, endRot.current.z, t)
      );
      setCurrentRot(newRot);

      // Update camera transform
      if (cameraRef.current) {
        cameraRef.current.position.copy(newPos);
        cameraRef.current.rotation.copy(newRot);
      }
    }
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={currentPos}
      rotation={currentRot}
      fov={fov}
    />
  );
};

/**
 * Lerp between angles, taking the shortest path around the circle
 */
function lerpAngle(start: number, end: number, t: number): number {
  // Normalize angles to [-π, π]
  const normalizeAngle = (angle: number) => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  };

  start = normalizeAngle(start);
  end = normalizeAngle(end);

  // Calculate the shortest difference
  let diff = end - start;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;

  // Interpolate
  return start + diff * t;
}

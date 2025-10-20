import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface AnimatedPerspectiveCameraProps {
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;
  fov?: number;
  children?: React.ReactNode;
}

export interface CameraAnimationHandle {
  updateTarget: (
    target: [number, number, number],
    targetRotation: [number, number, number],
    movementDuration: number,
    rotationDuration: number
  ) => void;
  getCurrentPosition: () => [number, number, number];
  getCurrentRotation: () => [number, number, number];
}

/**
 * Camera component that can be animated between positions
 */
export const AnimatedPerspectiveCamera = React.forwardRef<
  CameraAnimationHandle,
  AnimatedPerspectiveCameraProps
>(({ targetPosition, targetRotation, onAnimationStart, onAnimationComplete, fov = 75 }, ref) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  // Animation state - always animating
  const positionProgress = useRef(1); // 1 = at target, 0 = just started toward new target
  const rotationProgress = useRef(1);
  const startPos = useRef<THREE.Vector3>(new THREE.Vector3(...targetPosition));
  const currentPos = useRef<THREE.Vector3>(new THREE.Vector3(...targetPosition));
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(...targetPosition));
  const startRot = useRef<THREE.Euler>(new THREE.Euler(...targetRotation));
  const currentRot = useRef<THREE.Euler>(new THREE.Euler(...targetRotation));
  const targetRot = useRef<THREE.Euler>(new THREE.Euler(...targetRotation));
  const movementDuration = useRef(0.2);
  const rotationDuration = useRef(0.1);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    updateTarget: (
      target: [number, number, number],
      targetRotation: [number, number, number],
      moveDuration: number,
      rotateDuration: number
    ) => {
      // Store current position as start for new animation
      startPos.current.copy(currentPos.current);
      startRot.current.copy(currentRot.current);

      // Set new target
      targetPos.current.set(...target);
      targetRot.current.set(...targetRotation);
      movementDuration.current = moveDuration;
      rotationDuration.current = rotateDuration;
      positionProgress.current = 0; // Restart position animation
      rotationProgress.current = 0; // Restart rotation animation
      onAnimationStart?.();
    },
    getCurrentPosition: () => {
      return [currentPos.current.x, currentPos.current.y, currentPos.current.z];
    },
    getCurrentRotation: () => {
      return [currentRot.current.x, currentRot.current.y, currentRot.current.z];
    }
  }));

  // Animation loop - always running, smoothly moves toward target
  useFrame((state, delta) => {
    let hasUpdates = false;

    // Animate position
    if (positionProgress.current < 1) {
      positionProgress.current = Math.min(1, positionProgress.current + delta / movementDuration.current);
      const tPos = positionProgress.current;

      // Smoothly interpolate from start position to target
      currentPos.current.lerpVectors(startPos.current, targetPos.current, tPos);
      hasUpdates = true;
    }

    // Animate rotation (independently)
    if (rotationProgress.current < 1) {
      rotationProgress.current = Math.min(1, rotationProgress.current + delta / rotationDuration.current);
      const tRot = rotationProgress.current;

      // Interpolate rotation with angle wrapping from start to target
      currentRot.current.set(
        THREE.MathUtils.lerp(startRot.current.x, targetRot.current.x, tRot),
        lerpAngle(startRot.current.y, targetRot.current.y, tRot),
        THREE.MathUtils.lerp(startRot.current.z, targetRot.current.z, tRot)
      );
      hasUpdates = true;
    }

    // Update camera if anything changed
    if (hasUpdates && cameraRef.current) {
      cameraRef.current.position.copy(currentPos.current);
      cameraRef.current.rotation.copy(currentRot.current);
    }

    // Check if both animations are complete
    if (positionProgress.current >= 1 && rotationProgress.current >= 1) {
      if (hasUpdates) {
        onAnimationComplete?.();
      }
    }
  });

  // Initialize camera position on mount
  useEffect(() => {
    startPos.current.set(...targetPosition);
    currentPos.current.set(...targetPosition);
    targetPos.current.set(...targetPosition);
    startRot.current.set(...targetRotation);
    currentRot.current.set(...targetRotation);
    targetRot.current.set(...targetRotation);
    if (cameraRef.current) {
      cameraRef.current.position.copy(currentPos.current);
      cameraRef.current.rotation.copy(currentRot.current);
    }
  }, []);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={currentPos.current}
      rotation={currentRot.current}
      fov={fov}
    />
  );
});

AnimatedPerspectiveCamera.displayName = 'AnimatedPerspectiveCamera';

/**
 * Lerp between angles, taking the shortest path
 */
function lerpAngle(start: number, end: number, t: number): number {
  const normalizeAngle = (angle: number) => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  };

  start = normalizeAngle(start);
  end = normalizeAngle(end);

  let diff = end - start;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;

  return start + diff * t;
}

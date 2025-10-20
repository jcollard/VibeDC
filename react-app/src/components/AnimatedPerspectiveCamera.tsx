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
  startAnimation: (
    start: [number, number, number],
    startRotation: [number, number, number],
    end: [number, number, number],
    endRotation: [number, number, number],
    duration: number
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

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const animationProgress = useRef(1); // 1 = complete, 0 = just started
  const startPos = useRef<THREE.Vector3>(new THREE.Vector3(...targetPosition));
  const endPos = useRef<THREE.Vector3>(new THREE.Vector3(...targetPosition));
  const startRot = useRef<THREE.Euler>(new THREE.Euler(...targetRotation));
  const endRot = useRef<THREE.Euler>(new THREE.Euler(...targetRotation));
  const duration = useRef(0.2);

  // Current interpolated position
  const [currentPosition, setCurrentPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(...targetPosition)
  );
  const [currentRotation, setCurrentRotation] = useState<THREE.Euler>(
    new THREE.Euler(...targetRotation)
  );

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    startAnimation: (
      start: [number, number, number],
      startRotation: [number, number, number],
      end: [number, number, number],
      endRotation: [number, number, number],
      animDuration: number
    ) => {
      startPos.current.set(...start);
      startRot.current.set(...startRotation);
      endPos.current.set(...end);
      endRot.current.set(...endRotation);
      duration.current = animDuration;
      animationProgress.current = 0;
      setIsAnimating(true);
      onAnimationStart?.();
    },
    getCurrentPosition: () => {
      return [currentPosition.x, currentPosition.y, currentPosition.z];
    },
    getCurrentRotation: () => {
      return [currentRotation.x, currentRotation.y, currentRotation.z];
    }
  }));

  // Animation loop
  useFrame((state, delta) => {
    if (!isAnimating || animationProgress.current >= 1) {
      return;
    }

    // Update progress
    animationProgress.current = Math.min(1, animationProgress.current + delta / duration.current);
    const t = animationProgress.current;

    // Linear interpolation for position
    const newPos = new THREE.Vector3().lerpVectors(startPos.current, endPos.current, t);
    setCurrentPosition(newPos);

    // Interpolation for rotation with angle wrapping
    const newRot = new THREE.Euler(
      THREE.MathUtils.lerp(startRot.current.x, endRot.current.x, t),
      lerpAngle(startRot.current.y, endRot.current.y, t),
      THREE.MathUtils.lerp(startRot.current.z, endRot.current.z, t)
    );
    setCurrentRotation(newRot);

    // Update camera
    if (cameraRef.current) {
      cameraRef.current.position.copy(newPos);
      cameraRef.current.rotation.copy(newRot);
    }

    // Check if animation is complete
    if (animationProgress.current >= 1) {
      setIsAnimating(false);
      onAnimationComplete?.();
    }
  });

  // Snap to target when not animating
  useEffect(() => {
    if (!isAnimating) {
      const pos = new THREE.Vector3(...targetPosition);
      const rot = new THREE.Euler(...targetRotation);
      setCurrentPosition(pos);
      setCurrentRotation(rot);
      if (cameraRef.current) {
        cameraRef.current.position.copy(pos);
        cameraRef.current.rotation.copy(rot);
      }
    }
  }, [targetPosition, targetRotation, isAnimating]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={currentPosition}
      rotation={currentRotation}
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

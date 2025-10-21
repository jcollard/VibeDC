import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraLightsProps {
  lightIntensity: number;
  lightDistance: number;
  lightYOffset: number;
  lightDecay: number;
  lightColor: string;
}

/**
 * Lights that follow the camera's current position
 */
export const CameraLights: React.FC<CameraLightsProps> = ({
  lightIntensity,
  lightDistance,
  lightYOffset,
  lightDecay,
  lightColor
}) => {
  const { camera } = useThree();
  const pointRef = useRef<THREE.PointLight>(null);

  // Update light positions every frame to follow camera
  useFrame(() => {
    const cameraPos = camera.position;

    // Update point light (at camera with Y offset)
    if (pointRef.current) {
      pointRef.current.position.set(
        cameraPos.x,
        cameraPos.y + lightYOffset,
        cameraPos.z
      );
    }
  });

  return (
    <>
      {/* Player's light source - omnidirectional torch effect */}
      <pointLight
        ref={pointRef}
        intensity={lightIntensity}
        distance={lightDistance}
        decay={lightDecay}
        color={lightColor}
      />
    </>
  );
};

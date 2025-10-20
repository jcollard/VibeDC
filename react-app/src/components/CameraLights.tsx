import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraLightsProps {
  lightIntensity: number;
  lightDistance: number;
}

/**
 * Lights that follow the camera's current position
 */
export const CameraLights: React.FC<CameraLightsProps> = ({
  lightIntensity,
  lightDistance
}) => {
  const { camera } = useThree();
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const pointRef = useRef<THREE.PointLight>(null);
  const spotRef = useRef<THREE.SpotLight>(null);

  // Update light positions every frame to follow camera
  useFrame(() => {
    const cameraPos = camera.position;
    const cameraRot = camera.rotation;

    // Update directional light (above camera)
    if (directionalRef.current) {
      directionalRef.current.position.set(
        cameraPos.x,
        cameraPos.y + 5,
        cameraPos.z
      );
    }

    // Update point light (at camera)
    if (pointRef.current) {
      pointRef.current.position.copy(cameraPos);
    }

    // Update spot light (at camera, pointing forward)
    if (spotRef.current) {
      spotRef.current.position.copy(cameraPos);
      spotRef.current.rotation.copy(cameraRot);
    }
  });

  return (
    <>
      {/* Directional light from above - simulates sunlight/general lighting */}
      <directionalLight ref={directionalRef} intensity={0.5} />

      {/* Player's light source - adjustable torch/flashlight effect */}
      <pointLight
        ref={pointRef}
        intensity={lightIntensity}
        distance={lightDistance}
        decay={2}
        color="#ffddaa"
      />

      {/* Additional spot light for focused forward illumination */}
      {lightIntensity > 0 && (
        <spotLight
          ref={spotRef}
          angle={Math.PI / 4}
          penumbra={0.5}
          intensity={lightIntensity * 0.8}
          distance={lightDistance * 1.5}
          decay={2}
          color="#ffddaa"
        />
      )}
    </>
  );
};

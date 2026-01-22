// frontend/src/components/galaxy3d/SystemMarker.tsx
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh } from 'three';

interface SystemMarkerProps {
  system: number;
  position: { x: number; y: number; z: number };
  planetCount: number;
  hasMe: boolean;
  hasCurrentPlanet: boolean;
  hasEnemies: boolean;
  hasDebris: boolean;
  isProtected: boolean;
  onClick: () => void;
}

export default function SystemMarker({
  system,
  position,
  planetCount,
  hasMe,
  hasCurrentPlanet,
  hasEnemies,
  hasDebris,
  isProtected,
  onClick
}: SystemMarkerProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Determine color based on status
  const getColor = () => {
    if (hasCurrentPlanet) return '#06b6d4'; // Cyan - current planet
    if (hasMe) return '#22c55e'; // Green - my planets
    if (hasEnemies) return '#ef4444'; // Red - enemy planets
    if (planetCount > 0) return '#f59e0b'; // Orange - other players
    return '#64748b'; // Gray - empty
  };

  const color = getColor();
  const baseScale = hovered ? 1.5 : 1.0;
  const size = 0.5 + (planetCount / 15) * 0.5; // 0.5-1.0 based on planet count

  // Pulsing animation for current system
  useFrame((state) => {
    if (hasCurrentPlanet && meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      meshRef.current.scale.setScalar(baseScale * pulse);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(baseScale);
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hasCurrentPlanet ? 0.8 : hasMe ? 0.5 : 0.2}
          transparent
          opacity={planetCount === 0 ? 0.3 : 1.0}
        />
      </mesh>

      {/* Protection shield */}
      {isProtected && (
        <mesh>
          <sphereGeometry args={[size * 1.5, 16, 16]} />
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            wireframe
          />
        </mesh>
      )}

      {/* Debris ring indicator */}
      {hasDebris && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.2, size * 1.4, 32]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={10} center>
          <div className="bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-white whitespace-nowrap border border-white/20 shadow-xl">
            <div className="font-bold text-cyan-400">System {system}</div>
            <div className="text-slate-300">{planetCount} planet{planetCount !== 1 ? 's' : ''}</div>
            {hasDebris && <div className="text-yellow-400">• Debris field</div>}
            {isProtected && <div className="text-blue-400">• Protected</div>}
          </div>
        </Html>
      )}
    </group>
  );
}

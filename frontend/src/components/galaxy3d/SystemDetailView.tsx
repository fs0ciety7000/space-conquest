// frontend/src/components/galaxy3d/SystemDetailView.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getPlanetOrbitalPosition } from '@/utils/galaxyCalculations';

interface GalaxySlot {
  position: number;
  planet_id?: string | null;
  planet_name?: string | null;
  owner_name?: string | null;
  owner_id?: string | null;
  debris_metal?: number;
  debris_crystal?: number;
  is_me?: boolean;
  is_my_planet?: boolean;
  protection_until?: string | null;
  total_points?: number;
}

interface SystemDetailViewProps {
  systemNumber: number;
  slots: GalaxySlot[];
  onPlanetClick: (slot: GalaxySlot) => void;
  onColonizeClick?: (position: number) => void;
}

function PlanetMarker({ slot, position, onClick, onColonizeClick }: {
  slot: GalaxySlot;
  position: { x: number; y: number; z: number };
  onClick: () => void;
  onColonizeClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isEmpty = !slot.planet_id;
  const hasDebris = (slot.debris_metal || 0) > 0 || (slot.debris_crystal || 0) > 0;

  const color = slot.is_me ? '#06b6d4' : slot.is_my_planet ? '#22c55e' : slot.planet_id ? '#ef4444' : '#64748b';

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Planet sphere */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (isEmpty && onColonizeClick) {
            onColonizeClick();
          } else {
            onClick();
          }
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
        scale={hovered ? 1.3 : 1}
      >
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isEmpty ? 0.1 : 0.3}
          transparent
          opacity={isEmpty ? 0.4 : 1.0}
        />
      </mesh>

      {/* Debris indicator */}
      {hasDebris && (
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <ringGeometry args={[1, 1.2, 16]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Protection shield */}
      {slot.protection_until && new Date(slot.protection_until) > new Date() && (
        <mesh>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            wireframe
          />
        </mesh>
      )}

      {/* Position number label */}
      <Html distanceFactor={5} position={[0, -1.5, 0]} center>
        <div className="text-[10px] font-mono text-white/60 bg-black/50 px-1.5 py-0.5 rounded">
          {slot.position}
        </div>
      </Html>

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={5} center>
          <div className="bg-black/95 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-white whitespace-nowrap border border-white/20 shadow-xl max-w-[200px]">
            <div className="font-bold text-cyan-400">Position {slot.position}</div>
            {slot.planet_name ? (
              <>
                <div className="text-white">{slot.planet_name}</div>
                <div className="text-slate-400">{slot.owner_name}</div>
                {slot.total_points > 0 && (
                  <div className="text-yellow-400">{slot.total_points.toLocaleString()} pts</div>
                )}
              </>
            ) : (
              <div className="text-slate-400">Empty - Click to colonize</div>
            )}
            {hasDebris && (
              <div className="text-yellow-400 text-[10px] mt-1">
                Debris: {Math.floor(slot.debris_metal || 0).toLocaleString()}M / {Math.floor(slot.debris_crystal || 0).toLocaleString()}C
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

export default function SystemDetailView({
  systemNumber,
  slots,
  onPlanetClick,
  onColonizeClick
}: SystemDetailViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Slow rotation for visual effect
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central sun */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Sun glow effect */}
      <mesh>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Orbital ring guide */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14.5, 15.5, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* System label */}
      <Html position={[0, 5, 0]} center>
        <div className="text-lg font-bold text-cyan-400 bg-black/80 px-4 py-2 rounded-lg border border-cyan-500/30 shadow-lg">
          System {systemNumber}
        </div>
      </Html>

      {/* 15 planet positions */}
      {slots.map((slot) => {
        const pos = getPlanetOrbitalPosition(slot.position);
        return (
          <PlanetMarker
            key={slot.position}
            slot={slot}
            position={pos}
            onClick={() => onPlanetClick(slot)}
            onColonizeClick={onColonizeClick ? () => onColonizeClick(slot.position) : undefined}
          />
        );
      })}
    </group>
  );
}

// Need to import useState at the top
import { useState } from 'react';

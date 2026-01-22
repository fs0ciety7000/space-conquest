// frontend/src/components/galaxy3d/FlightPath.tsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { generateFlightPath, getSystemCoordinates } from '@/utils/galaxyCalculations';

interface FlightPathProps {
  from: { galaxy: number; system: number; position: number };
  to: { galaxy: number; system: number; position: number };
  color?: string;
  animated?: boolean;
}

export default function FlightPath({
  from,
  to,
  color = '#06b6d4',
  animated = true
}: FlightPathProps) {
  const lineRef = useRef<any>(null);

  // Generate path points
  const points = useMemo(() => {
    const fromPos = getSystemCoordinates(from.galaxy, from.system);
    const toPos = getSystemCoordinates(to.galaxy, to.system);
    const path = generateFlightPath(fromPos, toPos, 50);

    return path.map(p => new THREE.Vector3(p.x, p.y, p.z));
  }, [from, to]);

  // Animate the dashed line
  useFrame((state) => {
    if (animated && lineRef.current && lineRef.current.material) {
      lineRef.current.material.dashOffset = -state.clock.elapsedTime * 2;
    }
  });

  return (
    <group>
      {/* Main path line */}
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={2}
        dashed
        dashScale={10}
        dashSize={1}
        gapSize={0.5}
      />

      {/* Start marker */}
      <mesh position={points[0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* End marker */}
      <mesh position={points[points.length - 1]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Direction arrow at midpoint */}
      {points.length > 2 && (
        <mesh position={points[Math.floor(points.length / 2)]}>
          <coneGeometry args={[0.5, 1, 4]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

// frontend/src/components/galaxy3d/SystemCloud.tsx
import { useMemo } from 'react';
import SystemMarker from './SystemMarker';
import { getSystemCoordinates } from '@/utils/galaxyCalculations';

interface SystemData {
  system: number;
  planetCount: number;
  hasMe: boolean;
  hasCurrentPlanet: boolean;
  hasEnemies: boolean;
  hasDebris: boolean;
  isProtected: boolean;
}

interface SystemCloudProps {
  galaxy: number;
  currentPlanet: any;
  systemsData?: Map<number, SystemData>;
  onSystemClick: (system: number) => void;
}

export default function SystemCloud({
  galaxy,
  currentPlanet,
  systemsData = new Map(),
  onSystemClick
}: SystemCloudProps) {
  // Generate all 499 system positions and data
  const systems = useMemo(() => {
    return Array.from({ length: 499 }, (_, i) => {
      const systemNum = i + 1;
      const position = getSystemCoordinates(galaxy, systemNum);
      const data = systemsData.get(systemNum) || {
        system: systemNum,
        planetCount: 0,
        hasMe: false,
        hasCurrentPlanet: false,
        hasEnemies: false,
        hasDebris: false,
        isProtected: false
      };

      return {
        position,
        ...data
      };
    });
  }, [galaxy, systemsData]);

  return (
    <group>
      {systems.map((sys) => (
        <SystemMarker
          key={sys.system}
          {...sys} // Spreading sys which includes system, planetCount, hasMe, etc.
          onClick={() => onSystemClick(sys.system)}
        />
      ))}
    </group>
  );
}

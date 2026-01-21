// frontend/src/components/galaxy3d/Galaxy3DView.tsx
import { useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import SystemCloud from './SystemCloud';
import SystemDetailView from './SystemDetailView';
import FlightPath from './FlightPath';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';
import { Loader2, Home, Target } from 'lucide-react';

interface Galaxy3DViewProps {
  galaxy: number;
  system: number;
  currentPlanet: any;
  onSystemSelect: (system: number) => void;
  onNavigateAttack?: (id: string, name: string, g: number, s: number, p: number) => void;
  onNavigateSpy?: (id: string, name: string, g: number, s: number, p: number) => void;
  onNavigateTransport?: (id: string, name: string, g: number, s: number, p: number) => void;
  onColonizeClick?: (position: number) => void;
}

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
  planet_galaxy?: number;
}

function Scene3D({
  galaxy,
  system,
  selectedSystem,
  systemSlots,
  currentPlanet,
  onSystemClick,
  onPlanetClick,
  onColonizeClick
}: any) {
  // Prepare systems data map (in a real implementation, this would come from fetching all systems)
  const systemsData = new Map();

  // Add current planet's system to the map
  if (currentPlanet) {
    const currentSystem = currentPlanet.system;
    systemsData.set(currentSystem, {
      system: currentSystem,
      planetCount: 1,
      hasMe: true,
      hasCurrentPlanet: currentPlanet.system === system,
      hasEnemies: false,
      hasDebris: false,
      isProtected: false
    });
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" distance={100} />
      <pointLight position={[50, 50, 50]} intensity={0.5} color="#4f46e5" />
      <pointLight position={[-50, -50, -50]} intensity={0.5} color="#06b6d4" />

      {/* Background stars */}
      <Stars radius={300} depth={60} count={8000} factor={5} saturation={0} fade speed={0.5} />

      {/* Galaxy center glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.3} />
      </mesh>

      {/* Main content */}
      {selectedSystem ? (
        // Show detailed view of selected system
        <SystemDetailView
          systemNumber={selectedSystem}
          slots={systemSlots}
          onPlanetClick={onPlanetClick}
          onColonizeClick={onColonizeClick}
        />
      ) : (
        // Show all systems in galaxy
        <SystemCloud
          galaxy={galaxy}
          currentPlanet={currentPlanet}
          systemsData={systemsData}
          onSystemClick={onSystemClick}
        />
      )}

      {/* Flight path if showing system detail */}
      {selectedSystem && currentPlanet && selectedSystem !== currentPlanet.system && (
        <FlightPath
          from={{
            galaxy: currentPlanet.galaxy,
            system: currentPlanet.system,
            position: currentPlanet.position
          }}
          to={{
            galaxy,
            system: selectedSystem,
            position: 1
          }}
        />
      )}
    </>
  );
}

export default function Galaxy3DView({
  galaxy,
  system,
  currentPlanet,
  onSystemSelect,
  onNavigateAttack,
  onNavigateSpy,
  onNavigateTransport,
  onColonizeClick
}: Galaxy3DViewProps) {
  const [selectedSystem, setSelectedSystem] = useState<number | null>(system || null);
  const [systemSlots, setSystemSlots] = useState<GalaxySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 50, 100]);

  // Fetch system details when a system is selected
  const fetchSystemDetails = useCallback(async (systemNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/galaxy/${galaxy}/${systemNum}?current_planet_id=${currentPlanet?.id || ''}`));
      if (res.ok) {
        const data = await res.json();
        setSystemSlots(data);
        setSelectedSystem(systemNum);
        onSystemSelect(systemNum);
        // Animate camera closer for system view
        setCameraPosition([0, 20, 40]);
      } else {
        toast.error('Failed to load system details');
      }
    } catch (e) {
      toast.error('Error loading system');
    } finally {
      setLoading(false);
    }
  }, [galaxy, currentPlanet, onSystemSelect]);

  // Handle system click from 3D scene
  const handleSystemClick = useCallback((systemNum: number) => {
    fetchSystemDetails(systemNum);
  }, [fetchSystemDetails]);

  // Handle planet click
  const handlePlanetClick = useCallback((slot: GalaxySlot) => {
    if (!slot.planet_id) return;

    // Show actions in a toast for now (could be a modal)
    console.log('Planet clicked:', slot);
    toast.info(`Clicked: ${slot.planet_name}`);
  }, []);

  // Reset to galaxy view
  const resetView = useCallback(() => {
    setSelectedSystem(null);
    setSystemSlots([]);
    setCameraPosition([0, 50, 100]);
  }, []);

  // Go to current planet's system
  const goToCurrentSystem = useCallback(() => {
    if (currentPlanet?.system) {
      fetchSystemDetails(currentPlanet.system);
    }
  }, [currentPlanet, fetchSystemDetails]);

  // Load initial system if provided
  useEffect(() => {
    if (system && system !== selectedSystem) {
      fetchSystemDetails(system);
    }
  }, []);

  return (
    <div className="relative w-full h-[800px] bg-gradient-to-b from-slate-950 to-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: cameraPosition, fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={cameraPosition} />

        <Suspense fallback={null}>
          <Scene3D
            galaxy={galaxy}
            system={system}
            selectedSystem={selectedSystem}
            systemSlots={systemSlots}
            currentPlanet={currentPlanet}
            onSystemClick={handleSystemClick}
            onPlanetClick={handlePlanetClick}
            onColonizeClick={onColonizeClick}
          />
        </Suspense>

        {/* Camera controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={200}
          maxPolarAngle={Math.PI / 1.5}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading system...</span>
          </div>
        </div>
      )}

      {/* UI Overlay - Top controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-black/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-500/30 text-white">
          <div className="text-xs text-cyan-400 font-bold">Galaxy {galaxy}</div>
          {selectedSystem && (
            <div className="text-sm">System {selectedSystem}</div>
          )}
        </div>

        <div className="flex gap-2">
          {selectedSystem && (
            <button
              onClick={resetView}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-sm rounded-lg border border-indigo-400/30 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <Home size={16} />
              Galaxy View
            </button>
          )}

          {currentPlanet && (
            <button
              onClick={goToCurrentSystem}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600/90 hover:bg-cyan-500 text-white text-sm rounded-lg border border-cyan-400/30 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <Target size={16} />
              My System
            </button>
          )}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/10 text-xs text-slate-300 space-y-1">
          <div className="text-white font-bold mb-2">Controls</div>
          <div><span className="text-cyan-400">Left Mouse:</span> Rotate</div>
          <div><span className="text-cyan-400">Right Mouse:</span> Pan</div>
          <div><span className="text-cyan-400">Scroll:</span> Zoom</div>
          <div><span className="text-cyan-400">Click System:</span> View Details</div>
        </div>
      </div>

      {/* Stats overlay */}
      {selectedSystem && systemSlots.length > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-black/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/10 text-white space-y-2">
            <div className="text-sm font-bold text-cyan-400">System Stats</div>
            <div className="text-xs space-y-1">
              <div>Planets: {systemSlots.filter(s => s.planet_id).length}/15</div>
              <div>Empty Slots: {systemSlots.filter(s => !s.planet_id).length}</div>
              <div>Debris Fields: {systemSlots.filter(s => (s.debris_metal || 0) > 0).length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

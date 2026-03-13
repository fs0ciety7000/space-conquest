import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { apiUrl } from '@/config/api';

// Interface that matches the backend's planet JSON structure
export interface PlanetData {
  id: string;
  name: string;
  metal_amount: number;
  crystal_amount: number;
  deuterium_amount: number;
  energy_production: number;
  energy_consumption: number;
  energy_ratio: number;
  metal_production: number;
  crystal_production: number;
  deuterium_production: number;
  // Sprint 2 P2-1: server-computed production rates (BAL-001)
  metal_per_second?: number;
  crystal_per_second?: number;
  deuterium_per_second?: number;
  // Sprint 2 P2-1: server-computed storage capacities (FE-11)
  storage_capacity_metal?: number;
  storage_capacity_crystal?: number;
  storage_capacity_deuterium?: number;
  // Sprint 2 P2-1: server-computed fleet capacity (FE-16)
  fleet_capacity?: number;
  // Other fields exist but these are the critical ones for most components
  [key: string]: any;
}

interface PlanetContextType {
  planet: PlanetData | null;
  setPlanet: React.Dispatch<React.SetStateAction<PlanetData | null>>;
  planetId: string | null;
  switchPlanet: (newId: string) => void;
  fetchPlanet: () => Promise<void>;
  currentPlanetIdRef: React.MutableRefObject<string | null>;
}

const PlanetContext = createContext<PlanetContextType | undefined>(undefined);

export function PlanetProvider({ children, initialPlanetId, token }: { children: React.ReactNode, initialPlanetId: string | null, token: string | null }) {
  const [planet, setPlanet] = useState<PlanetData | null>(null);
  const [planetId, setPlanetId] = useState<string | null>(initialPlanetId);
  const currentPlanetIdRef = useRef<string | null>(initialPlanetId);

  const switchPlanet = useCallback((newId: string) => {
    currentPlanetIdRef.current = newId;
    setPlanetId(newId);
    localStorage.setItem('planet_id', newId);
  }, []);

  const fetchPlanet = useCallback(async () => {
    if (!token || !currentPlanetIdRef.current) return;
    try {
      const res = await fetch(apiUrl(`/planets/${currentPlanetIdRef.current}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlanet(data);
      } else {
        console.error("Failed to fetch planet:", await res.text());
        if (res.status === 404) {
          // Planet no longer exists (sold/conquered) — switch to homeworld
          try {
            const myPlanetsRes = await fetch(apiUrl('/my-planets'), {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (myPlanetsRes.ok) {
              const planets = await myPlanetsRes.json();
              if (Array.isArray(planets) && planets.length > 0) {
                const homeworld = planets.find((p: { is_homeworld: boolean }) => p.is_homeworld) ?? planets[0];
                currentPlanetIdRef.current = homeworld.id;
                setPlanetId(homeworld.id);
                localStorage.setItem('planet_id', homeworld.id);
                return; // useEffect will re-trigger fetchPlanet with new id
              }
            }
          } catch { /* ignore */ }
          // No planets left — clear state
          localStorage.removeItem('planet_id');
          setPlanetId(null);
          currentPlanetIdRef.current = null;
          setPlanet(null);
        }
      }
    } catch (e) {
      console.error("Error fetching planet:", e);
    }
  }, [token]);

  // Sync initialPlanetId prop into internal state when it changes (e.g., after login)
  // useState doesn't re-initialize from props — must sync explicitly
  useEffect(() => {
    if (initialPlanetId && initialPlanetId !== currentPlanetIdRef.current) {
      currentPlanetIdRef.current = initialPlanetId;
      setPlanetId(initialPlanetId);
    }
  }, [initialPlanetId]);

  // Initial fetch when ID or token changes
  useEffect(() => {
    if (token && planetId) {
       fetchPlanet();
    }
  }, [token, planetId, fetchPlanet]);

  return (
    <PlanetContext.Provider value={{
      planet,
      setPlanet,
      planetId,
      switchPlanet,
      fetchPlanet,
      currentPlanetIdRef
    }}>
      {children}
    </PlanetContext.Provider>
  );
}

export function usePlanet() {
  const context = useContext(PlanetContext);
  if (context === undefined) {
    throw new Error('usePlanet must be used within a PlanetProvider');
  }
  return context;
}

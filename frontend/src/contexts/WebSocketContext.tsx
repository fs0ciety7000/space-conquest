import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useWebSocket as useGameWebSocket, ConnectionStatus } from '@/hooks/useWebSocket';
import { usePlanet } from './PlanetContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';

export interface WebSocketContextType {
  status: ConnectionStatus;
  isConnected: boolean;
  resources: {
    metal: number;
    crystal: number;
    deuterium: number;
    energy_produced: number;
    energy_consumed: number;
    energy_ratio: number;
  } | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children, token }: { children: React.ReactNode, token: string | null }) {
  const { planetId, setPlanet, currentPlanetIdRef, fetchPlanet } = usePlanet();
  
  // Sound effects dependencies
  const [soundEnabled] = React.useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [musicVolume] = React.useState(() => {
    const saved = localStorage.getItem('musicVolume');
    return saved ? parseFloat(saved) : 0.3;
  });
  
  const [sfxVolume] = React.useState(() => {
    const saved = localStorage.getItem('sfxVolume');
    return saved ? parseFloat(saved) : 0.5;
  });

  const { playSound } = useSoundEffects({
    enabled: soundEnabled,
    musicVolume,
    sfxVolume
  });

  const { 
    status, 
    isConnected,
    resources 
  } = useGameWebSocket(planetId, {
    enabled: !!token && !!planetId,
    onResourcesUpdate: (res) => {
      setPlanet((prev: any) => {
        if (!prev || prev.id !== currentPlanetIdRef.current) return prev;
        if (prev.energy_ratio === res.energy_ratio) return prev;
        return { ...prev, energy_ratio: res.energy_ratio };
      });
    },
    onConstructionComplete: (data) => {
      playSound('build');
      fetchPlanet(); // Refresh planet data immediately
    },
    onShipComplete: (data) => {
      playSound('build');
      fetchPlanet();
    },
    onAttackIncoming: (data) => {
      playSound('alert');
    },
    onCombatResult: (data) => {
      playSound(data.result === 'victory' ? 'success' : 'combat');
    },
    onMessageReceived: (data) => {
      playSound('notification');
      // Dispatch a custom event so other components (like NotificationCenter) can catch it
      window.dispatchEvent(new CustomEvent('new-message-received'));
    },
    onTransportArrived: (data) => {
      playSound('success');
    },
    onSpyAlert: (data) => {
      playSound('error');
    },
    onPlanetStatus: (data) => {
      playSound(data.status === 'conquered' ? 'success' : 'error');
    },
  });

  return (
    <WebSocketContext.Provider value={{status, isConnected, resources}}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { config } from '@/config/api';

// ============================================================================
// TYPES
// ============================================================================

export interface WsResources {
  metal: number;
  crystal: number;
  deuterium: number;
  energy_produced: number;
  energy_consumed: number;
  energy_ratio: number;
}

export interface WsEvent {
  type: string;
  payload?: any;
}

export interface WsResourcesUpdate extends WsEvent {
  type: 'resources_update';
  payload: WsResources;
}

export interface WsConstructionComplete extends WsEvent {
  type: 'construction_complete';
  payload: {
    building_type: string;
    level: number;
  };
}

export interface WsShipComplete extends WsEvent {
  type: 'ship_complete';
  payload: {
    ship_type: string;
    quantity: number;
  };
}

export interface WsAttackIncoming extends WsEvent {
  type: 'attack_incoming';
  payload: {
    attacker_name: string;
    source_coords: string;
    arrival_time: string;
    ships_count: number;
  };
}

export interface WsCombatResult extends WsEvent {
  type: 'combat_result';
  payload: {
    result: 'victory' | 'defeat' | 'draw';
    opponent: string;
  };
}

export interface WsMessageReceived extends WsEvent {
  type: 'message_received';
  payload: {
    from: string;
    preview: string;
  };
}

export interface WsTransportArrived extends WsEvent {
  type: 'transport_arrived';
  payload: {
    from_planet: string;
    metal: number;
    crystal: number;
    deuterium: number;
  };
}

export interface WsSpyAlert extends WsEvent {
  type: 'spy_alert';
  payload: {
    from: string;
  };
}

export interface WsSabotageDetected extends WsEvent {
  type: 'sabotage_detected';
  payload: {
    attacker_name: string;
    planet_name: string;
    effect_type: 'disable_mine' | 'steal_tech';
  };
}

export interface WsCasusBelliGranted extends WsEvent {
  type: 'casus_belli_granted';
  payload: {
    target_name: string;
    reason: string;
  };
}

export interface WsPlanetStatus extends WsEvent {
  type: 'planet_status';
  payload: {
    status: 'conquered' | 'lost';
    planet_name: string;
    opponent: string;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketOptions {
  enabled?: boolean;
  onResourcesUpdate?: (resources: WsResources) => void;
  onConstructionComplete?: (data: { building_type: string; level: number }) => void;
  onShipComplete?: (data: { ship_type: string; quantity: number }) => void;
  onAttackIncoming?: (data: WsAttackIncoming['payload']) => void;
  onCombatResult?: (data: WsCombatResult['payload']) => void;
  onMessageReceived?: (data: WsMessageReceived['payload']) => void;
  onTransportArrived?: (data: WsTransportArrived['payload']) => void;
  onSpyAlert?: (data: WsSpyAlert['payload']) => void;
  onPlanetStatus?: (data: WsPlanetStatus['payload']) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useWebSocket(planetId: string | null, options: UseWebSocketOptions = {}) {
  const {
    enabled = true,
    onResourcesUpdate,
    onConstructionComplete,
    onShipComplete,
    onAttackIncoming,
    onCombatResult,
    onMessageReceived,
    onTransportArrived,
    onSpyAlert,
    onPlanetStatus,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [resources, setResources] = useState<WsResources | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  // Refs pour stocker les callbacks sans causer de re-renders
  const callbacksRef = useRef({
    onResourcesUpdate,
    onConstructionComplete,
    onShipComplete,
    onAttackIncoming,
    onCombatResult,
    onMessageReceived,
    onTransportArrived,
    onSpyAlert,
    onPlanetStatus,
  });

  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    callbacksRef.current = {
      onResourcesUpdate,
      onConstructionComplete,
      onShipComplete,
      onAttackIncoming,
      onCombatResult,
      onMessageReceived,
      onTransportArrived,
      onSpyAlert,
      onPlanetStatus,
    };
  });

  // Construire l'URL WebSocket
  const getWsUrl = useCallback(() => {
    const apiUrl = config.apiUrl;
    // Convertir http(s) en ws(s)
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${wsHost}/ws?planet_id=${planetId}`;
  }, [planetId]);

  // Gérer les messages entrants
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as WsEvent;
      const callbacks = callbacksRef.current;

      switch (data.type) {
        case 'resources_update':
          const resourcesData = (data as WsResourcesUpdate).payload;
          setResources(resourcesData);
          setLastUpdate(new Date());
          callbacks.onResourcesUpdate?.(resourcesData);
          break;

        case 'construction_complete':
          const buildData = (data as WsConstructionComplete).payload;
          callbacks.onConstructionComplete?.(buildData);
          toast.success('🏭 Construction terminée !', {
            description: `${buildData.building_type} niveau ${buildData.level}`,
          });
          // Déclencher l'événement pour rafraîchir
          window.dispatchEvent(new Event('build-complete'));
          break;

        case 'ship_complete':
          const shipData = (data as WsShipComplete).payload;
          callbacks.onShipComplete?.(shipData);
          toast.success('🚀 Production terminée !', {
            description: `${shipData.quantity}x ${shipData.ship_type}`,
          });
          window.dispatchEvent(new Event('build-complete'));
          break;

        case 'attack_incoming':
          const attackData = (data as WsAttackIncoming).payload;
          callbacks.onAttackIncoming?.(attackData);
          toast.error('⚠️ ATTAQUE ENTRANTE !', {
            description: `${attackData.attacker_name} depuis ${attackData.source_coords}`,
            duration: 10000,
          });
          break;

        case 'combat_result':
          const combatData = (data as WsCombatResult).payload;
          callbacks.onCombatResult?.(combatData);
          if (combatData.result === 'victory') {
            toast.success('🏆 VICTOIRE !', {
              description: `Contre ${combatData.opponent}`,
            });
          } else if (combatData.result === 'defeat') {
            toast.error('💀 DÉFAITE', {
              description: `Contre ${combatData.opponent}`,
            });
          }
          break;

        case 'message_received':
          const msgData = (data as WsMessageReceived).payload;
          callbacks.onMessageReceived?.(msgData);
          toast.info('📨 Nouveau message', {
            description: `De ${msgData.from}: ${msgData.preview.substring(0, 50)}...`,
          });
          break;

        case 'transport_arrived':
          const transportData = (data as WsTransportArrived).payload;
          callbacks.onTransportArrived?.(transportData);
          toast.success('📦 Transport arrivé !', {
            description: `De ${transportData.from_planet}`,
          });
          break;

        case 'spy_alert':
          const spyData = (data as WsSpyAlert).payload;
          callbacks.onSpyAlert?.(spyData);
          toast.warning('🕵️ Espionnage détecté !', {
            description: `Depuis ${spyData.from}`,
          });
          break;

        case 'sabotage_detected':
          const sabotageData = (data as WsSabotageDetected).payload;
          const effectLabel = sabotageData.effect_type === 'disable_mine'
            ? 'Mine désactivée'
            : 'Données volées';
          toast.error('🚨 SABOTAGE DÉTECTÉ !', {
            description: `${sabotageData.attacker_name} a tenté de saboter ${sabotageData.planet_name} ! ${effectLabel}. Casus Belli accordé !`,
            duration: 10000,
            important: true,
          });
          window.dispatchEvent(new Event('sabotage-detected'));
          break;

        case 'casus_belli_granted':
          const cbData = (data as WsCasusBelliGranted).payload;
          toast.success('⚔️ CASUS BELLI ACCORDÉ !', {
            description: `Vous pouvez attaquer ${cbData.target_name} sans pénalité ! Raison: ${cbData.reason}`,
            duration: 8000,
            important: true,
          });
          window.dispatchEvent(new Event('casus-belli-granted'));
          break;

        case 'planet_status':
          const statusData = (data as WsPlanetStatus).payload;
          callbacks.onPlanetStatus?.(statusData);
          if (statusData.status === 'conquered') {
            toast.success('🎯 Planète conquise !', {
              description: `${statusData.planet_name} est maintenant vôtre !`,
            });
          } else {
            toast.error('🚨 Planète perdue !', {
              description: `${statusData.planet_name} a été conquise par ${statusData.opponent}`,
            });
          }
          break;

        case 'connected':
          // console.log('✅ WebSocket connecté à la planète:', data.payload?.planet_id);
          break;

        case 'pong':
          // Heartbeat response
          break;

        case 'error':
          console.error('WebSocket error:', data.payload?.message);
          break;

        default:
          // console.log('Unknown WebSocket event:', data);
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  }, []);

  // Connexion WebSocket
  const connect = useCallback(() => {
    if (!planetId || !enabled) return;

    // Fermer la connexion existante
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus('connecting');
    const wsUrl = getWsUrl();
    // console.log('🔌 Connexion WebSocket:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // console.log('✅ WebSocket connecté');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('❌ WebSocket erreur:', error);
        setStatus('error');
      };

      ws.onclose = (event) => {
        // console.log('🔌 WebSocket fermé:', event.code, event.reason);
        setStatus('disconnected');
        wsRef.current = null;

        // Reconnexion automatique si pas fermé volontairement
        if (event.code !== 1000 && enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          // console.log(`🔄 Reconnexion dans ${delay}ms (tentative ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (e) {
      console.error('Erreur création WebSocket:', e);
      setStatus('error');
    }
  }, [planetId, enabled, getWsUrl, handleMessage]);

  // Envoyer un message
  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Ping pour keepalive
  const ping = useCallback(() => {
    send({ type: 'ping' });
  }, [send]);

  // Fermer la connexion
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  // Effet pour gérer la connexion/déconnexion
  useEffect(() => {
    if (enabled && planetId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planetId, enabled]);

  // Heartbeat périodique
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      ping();
    }, 30000); // Ping toutes les 30 secondes

    return () => clearInterval(interval);
  }, [status, ping]);

  return {
    status,
    isConnected: status === 'connected',
    resources,
    lastUpdate,
    send,
    ping,
    disconnect,
    reconnect: connect,
  };
}

// ============================================================================
// HELPER: Indicateur de connexion
// ============================================================================

export function getConnectionStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-yellow-500 animate-pulse';
    case 'disconnected':
      return 'bg-slate-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-slate-500';
  }
}

export function getConnectionStatusText(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Connecté';
    case 'connecting':
      return 'Connexion...';
    case 'disconnected':
      return 'Déconnecté';
    case 'error':
      return 'Erreur';
    default:
      return 'Inconnu';
  }
}

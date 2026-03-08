// ANTIGRAVITY: Hook PVE Server Events — fetch liste active + écoute WS broadcasts
// Expose les événements actifs/incoming, la progression, et helpers de contribution

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiUrl } from '@/config/api';

// ============================================================================
// TYPES
// ============================================================================

export interface ServerEventSummary {
  id: string;
  event_type_key: string;
  name: string;
  icon: string;
  color: string;
  status: string; // "incoming" | "active" | "resolved" | "cancelled"
  hp_current: number;
  hp_max: number;
  progress_percent: number;
  zone: string;
  narrative: string;
  starts_at: string;
  ends_at: string | null;
  participant_count: number;
  my_contribution: number;
}

export interface ServerEventDetail extends ServerEventSummary {
  top_contributors: [string, number][];
}

export interface WsServerEventAnnounced {
  event_id: string;
  event_type: string;
  name: string;
  icon: string;
  color: string;
  zone: string;
  starts_in_seconds: number;
  narrative: string;
}

export interface WsServerEventStarted {
  event_id: string;
  event_type: string;
  name: string;
  icon: string;
  color: string;
  zone: string;
  ends_at: string;
  hp_max: number;
}

export interface WsServerEventProgress {
  event_id: string;
  hp_current: number;
  hp_max: number;
  top_contributors: string[];
  percent: number;
}

export interface WsServerEventResolved {
  event_id: string;
  event_type: string;
  outcome: string;
  rewards_distributed: boolean;
  top_contributors: string[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useServerEvents() {
  const [events, setEvents] = useState<ServerEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef(0);

  const fetchEvents = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 5000) return; // debounce 5s
    lastFetchRef.current = now;

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/server-events'));
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Écoute les custom events WS dispatchés depuis useWebSocket.ts
  useEffect(() => {
    fetchEvents();

    const handleAnnounced = (e: CustomEvent<WsServerEventAnnounced>) => {
      // Ajouter l'événement incoming dans la liste
      const d = e.detail;
      setEvents(prev => {
        if (prev.find(ev => ev.id === d.event_id)) return prev;
        const newEvent: ServerEventSummary = {
          id: d.event_id,
          event_type_key: d.event_type,
          name: d.name,
          icon: d.icon,
          color: d.color,
          status: 'incoming',
          hp_current: 0,
          hp_max: 0,
          progress_percent: 0,
          zone: d.zone,
          narrative: d.narrative,
          starts_at: new Date(Date.now() + d.starts_in_seconds * 1000).toISOString(),
          ends_at: null,
          participant_count: 0,
          my_contribution: 0,
        };
        return [newEvent, ...prev];
      });
    };

    const handleStarted = (e: CustomEvent<WsServerEventStarted>) => {
      const d = e.detail;
      setEvents(prev => prev.map(ev =>
        ev.id === d.event_id
          ? { ...ev, status: 'active', hp_max: d.hp_max, hp_current: d.hp_max, ends_at: d.ends_at }
          : ev
      ));
    };

    const handleProgress = (e: CustomEvent<WsServerEventProgress>) => {
      const d = e.detail;
      setEvents(prev => prev.map(ev =>
        ev.id === d.event_id
          ? { ...ev, hp_current: d.hp_current, hp_max: d.hp_max, progress_percent: d.percent }
          : ev
      ));
    };

    const handleResolved = (e: CustomEvent<WsServerEventResolved>) => {
      const d = e.detail;
      setEvents(prev => prev.map(ev =>
        ev.id === d.event_id
          ? { ...ev, status: d.outcome === 'cancelled' ? 'cancelled' : 'resolved' }
          : ev
      ));
      // Retirer l'événement terminé après 10s
      setTimeout(() => {
        setEvents(prev => prev.filter(ev => ev.id !== d.event_id));
      }, 10000);
    };

    window.addEventListener('server-event-announced', handleAnnounced as EventListener);
    window.addEventListener('server-event-started', handleStarted as EventListener);
    window.addEventListener('server-event-progress', handleProgress as EventListener);
    window.addEventListener('server-event-resolved', handleResolved as EventListener);

    return () => {
      window.removeEventListener('server-event-announced', handleAnnounced as EventListener);
      window.removeEventListener('server-event-started', handleStarted as EventListener);
      window.removeEventListener('server-event-progress', handleProgress as EventListener);
      window.removeEventListener('server-event-resolved', handleResolved as EventListener);
    };
  }, [fetchEvents]);

  // Contribuer à un événement
  const contribute = useCallback(async (
    eventId: string,
    userId: string,
    planetId: string,
    resources?: number,
  ) => {
    const res = await fetch(apiUrl(`/server-events/${eventId}/contribute`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, planet_id: planetId, resources }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erreur contribution');
    }
    return res.json();
  }, []);

  // Helpers dérivés
  const activeEvents = events.filter(e => e.status === 'active');
  const incomingEvents = events.filter(e => e.status === 'incoming');
  const hasActiveEvents = activeEvents.length > 0;

  return {
    events,
    activeEvents,
    incomingEvents,
    hasActiveEvents,
    loading,
    fetchEvents,
    contribute,
  };
}

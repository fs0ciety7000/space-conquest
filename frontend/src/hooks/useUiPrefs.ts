/**
 * Hook pour lire/écrire les préférences UI côté serveur.
 * Remplace le localStorage pour tutorial_completed, onboarding_seen, dismissed_announcements.
 * Fallback sur localStorage si l'utilisateur n'est pas connecté.
 */
import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/config/api';

export interface UiPrefs {
  tutorial_completed?: string;
  onboarding_seen?: boolean;
  dismissed_announcements?: number[];
  [key: string]: unknown;
}

const FALLBACK_KEY = 'ui_prefs_local';

function getLocalPrefs(): UiPrefs {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function useUiPrefs() {
  const userId = localStorage.getItem('user_id');
  const [prefs, setPrefs] = useState<UiPrefs>({});
  const [loaded, setLoaded] = useState(false);

  // Charger au mount
  useEffect(() => {
    if (!userId) {
      setPrefs(getLocalPrefs());
      setLoaded(true);
      return;
    }
    fetch(apiUrl(`/users/${userId}/ui-prefs`), {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
    })
      .then(r => r.ok ? r.json() : {})
      .then((data: UiPrefs) => {
        setPrefs(data);
        setLoaded(true);
      })
      .catch(() => {
        setPrefs(getLocalPrefs());
        setLoaded(true);
      });
  }, [userId]);

  // Mettre à jour une ou plusieurs clés (merge partiel)
  const updatePrefs = useCallback(async (patch: Partial<UiPrefs>) => {
    const merged = { ...prefs, ...patch };
    setPrefs(merged);

    if (!userId) {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(merged));
      return;
    }
    try {
      await fetch(apiUrl(`/users/${userId}/ui-prefs`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
        },
        body: JSON.stringify(patch),
      });
    } catch {
      // Fallback silencieux
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(merged));
    }
  }, [prefs, userId]);

  return { prefs, loaded, updatePrefs };
}

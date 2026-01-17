import { useEffect, useRef } from 'react';

export function useSoundEffects(enabled: boolean) {
  const ambientMusic = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (enabled) {
      // Musique d'ambiance
      ambientMusic.current = new Audio('/sounds/ambient-space.mp3');
      ambientMusic.current.loop = true;
      ambientMusic.current.volume = 0.2;
      
      // Jouer avec gestion des erreurs (autoplay peut être bloqué)
      const playPromise = ambientMusic.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.log('Lecture audio bloquée - interaction utilisateur requise');
        });
      }
    } else {
      // Arrêter la musique si désactivée
      if (ambientMusic.current) {
        ambientMusic.current.pause();
        ambientMusic.current = null;
      }
    }

    return () => {
      if (ambientMusic.current) {
        ambientMusic.current.pause();
        ambientMusic.current = null;
      }
    };
  }, [enabled]);

  const playSound = (type: 'build' | 'attack' | 'success' | 'error' | 'click' | 'notification') => {
    if (!enabled) return;
    
    const sounds: Record<string, string> = {
      build: '/sounds/build.mp3',
      attack: '/sounds/laser.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      click: '/sounds/click.mp3',
      notification: '/sounds/notification.mp3',
    };

    const audio = new Audio(sounds[type]);
    audio.volume = 0.4;
    audio.play().catch(() => {
      // Ignorer les erreurs de lecture silencieusement
    });
  };

  return { playSound };
}

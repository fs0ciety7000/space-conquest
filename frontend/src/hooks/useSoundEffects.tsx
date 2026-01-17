import { useEffect, useRef } from 'react';

export function useSoundEffects(enabled: boolean) {
  const ambientMusic = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (enabled && !ambientMusic.current) {
      ambientMusic.current = new Audio('/sounds/ambient-space.mp3');
      ambientMusic.current.loop = true;
      ambientMusic.current.volume = 0.2;
      ambientMusic.current.play().catch(() => {
        // Autoplay bloqué par le navigateur - nécessite interaction utilisateur
      });
    } else if (!enabled && ambientMusic.current) {
      ambientMusic.current.pause();
      ambientMusic.current = null;
    }

    return () => {
      if (ambientMusic.current) {
        ambientMusic.current.pause();
        ambientMusic.current = null;
      }
    };
  }, [enabled]);

  const playSound = (type: 'build' | 'attack' | 'success' | 'error') => {
    if (!enabled) return;
    
    const sounds: Record<string, string> = {
      build: '/sounds/build.mp3',
      attack: '/sounds/laser.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
    };

    const audio = new Audio(sounds[type]);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  return { playSound };
}

import { useEffect, useRef, useCallback, useState } from 'react';

type SoundType = 'build' | 'attack' | 'success' | 'error' | 'click' | 'notification' | 'combat' | 'expedition' | 'alert';

interface UseSoundEffectsOptions {
  enabled: boolean;
  musicVolume?: number;
  sfxVolume?: number;
}

export function useSoundEffects({ 
  enabled, 
  musicVolume = 0.3, 
  sfxVolume = 0.5 
}: UseSoundEffectsOptions) {
  const ambientMusic = useRef<HTMLAudioElement | null>(null);
  const soundCache = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

  // ✅ CORRECTION : Sons avec extensions .wav et .ogg (utilisant les fichiers existants)
  const SOUND_FILES: Record<SoundType, string> = {
    build: '/sounds/success.ogg',      // Utilise success car build.ogg n'existe pas
    attack: '/sounds/laser.wav',
    success: '/sounds/success.ogg',
    error: '/sounds/error.ogg',
    click: '/sounds/click.wav',
    notification: '/sounds/alert.wav',
    combat: '/sounds/combat.ogg',
    expedition: '/sounds/warp.wav',
    alert: '/sounds/alert.wav',        // Ajout du type 'alert'
  };

  // Précharger les sons
  useEffect(() => {
    if (!enabled) return;

    Object.entries(SOUND_FILES).forEach(([type, path]) => {
      const audio = new Audio(path);
      audio.volume = sfxVolume;
      audio.preload = 'auto';
      
      // ✅ Gérer les erreurs de chargement
      audio.addEventListener('error', () => {
        console.warn(`Impossible de charger le son: ${path}`);
      });
      
      soundCache.current.set(type as SoundType, audio);
    });

    return () => {
      soundCache.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      soundCache.current.clear();
    };
  }, [enabled, sfxVolume]);

  // Musique d'ambiance
  useEffect(() => {
    if (enabled) {
      // ✅ CORRECTION : Musique d'ambiance en .ogg
      ambientMusic.current = new Audio('/sounds/ambient-space.ogg');
      ambientMusic.current.loop = true;
      ambientMusic.current.volume = musicVolume;
      
      // Démarrer avec un petit délai pour éviter l'autoplay bloqué
      const playPromise = ambientMusic.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Autoplay bloqué par le navigateur:', error);
          // Afficher un bouton pour activer le son manuellement
          const event = new CustomEvent('audio-blocked');
          window.dispatchEvent(event);
        });
      }
    } else {
      ambientMusic.current?.pause();
    }

    return () => {
      if (ambientMusic.current) {
        ambientMusic.current.pause();
        ambientMusic.current = null;
      }
    };
  }, [enabled, musicVolume]);

  // Mettre à jour le volume de la musique
  useEffect(() => {
    if (ambientMusic.current) {
      ambientMusic.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Mettre à jour le volume des effets sonores
  useEffect(() => {
    soundCache.current.forEach(audio => {
      audio.volume = sfxVolume;
    });
  }, [sfxVolume]);

  // Fonction pour jouer un son
  const playSound = useCallback((type: SoundType) => {
    if (!enabled) return;

    const audio = soundCache.current.get(type);
    if (audio) {
      // Cloner l'audio pour permettre plusieurs lectures simultanées
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = sfxVolume;
      
      const playPromise = clone.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Erreur lecture son:', error);
        });
      }

      // Nettoyer après lecture
      clone.addEventListener('ended', () => {
        clone.remove();
      });
    }
  }, [enabled, sfxVolume]);

  // Fonction pour jouer/mettre en pause la musique
  const toggleMusic = useCallback(() => {
    if (ambientMusic.current) {
      if (ambientMusic.current.paused) {
        ambientMusic.current.play().catch(console.error);
      } else {
        ambientMusic.current.pause();
      }
    }
  }, []);

  // Fonction pour redémarrer la musique (utile après un blocage autoplay)
  const startMusic = useCallback(() => {
    if (enabled && ambientMusic.current) {
      ambientMusic.current.play().catch(console.error);
    }
  }, [enabled]);

  return { 
    playSound, 
    toggleMusic,
    startMusic,
    isMusicPlaying: ambientMusic.current && !ambientMusic.current.paused 
  };
}

// Composant pour débloquer l'audio si nécessaire
export function AudioUnlockPrompt({ onUnlock }: { onUnlock: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleAudioBlocked = () => setShow(true);
    window.addEventListener('audio-blocked', handleAudioBlocked);
    return () => window.removeEventListener('audio-blocked', handleAudioBlocked);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-xl z-[9999] animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <div className="text-2xl">🔊</div>
        <div>
          <div className="font-bold text-sm">Audio Désactivé</div>
          <div className="text-xs text-indigo-200">Cliquez pour activer le son</div>
        </div>
        <button
          onClick={() => {
            onUnlock();
            setShow(false);
          }}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold transition-colors"
        >
          Activer
        </button>
      </div>
    </div>
  );
}

// Hook pour ajouter des sons automatiques aux actions communes
export function useAutoSounds(soundEnabled: boolean) {
  const { playSound } = useSoundEffects({ enabled: soundEnabled });

  useEffect(() => {
    if (!soundEnabled) return;

    // Sons automatiques sur certains événements
    const handleBuildComplete = () => playSound('success');
    const handleResearchComplete = () => playSound('success');
    const handleAttackLaunched = () => playSound('attack');
    const handleError = () => playSound('error');

    window.addEventListener('build-complete', handleBuildComplete);
    window.addEventListener('research-complete', handleResearchComplete);
    window.addEventListener('attack-launched', handleAttackLaunched);
    window.addEventListener('error-occurred', handleError);

    return () => {
      window.removeEventListener('build-complete', handleBuildComplete);
      window.removeEventListener('research-complete', handleResearchComplete);
      window.removeEventListener('attack-launched', handleAttackLaunched);
      window.removeEventListener('error-occurred', handleError);
    };
  }, [soundEnabled, playSound]);

  return { playSound }; 
}

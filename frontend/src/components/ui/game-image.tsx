// frontend/src/components/ui/game-image.tsx
// Composant réutilisable pour afficher les images du jeu avec fallback

import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface GameImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: 'square' | '16/9' | '4/3';
  loading?: 'lazy' | 'eager';
}

export function GameImage({
  src,
  alt,
  className = '',
  fallbackIcon,
  aspectRatio = 'square',
  loading = 'lazy'
}: GameImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const aspectRatioClass = {
    'square': 'aspect-square',
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
  }[aspectRatio];

  // Si l'image a une erreur, afficher le fallback
  if (error) {
    return (
      <div className={`${aspectRatioClass} ${className} bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center border border-white/10`}>
        {fallbackIcon || <ImageIcon className="w-1/2 h-1/2 text-slate-600" />}
      </div>
    );
  }

  return (
    <div className={`${aspectRatioClass} ${className} relative overflow-hidden rounded-lg bg-slate-900`}>
      {/* Skeleton pendant le chargement */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 to-slate-900"></div>
      )}

      {/* Image */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Overlay gradient subtil */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
    </div>
  );
}

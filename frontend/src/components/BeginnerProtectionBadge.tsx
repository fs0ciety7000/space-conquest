import { Shield, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeginnerProtectionBadgeProps {
  protectionUntil?: string | null;
  galaxy?: number;
  totalPoints?: number;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
}

export default function BeginnerProtectionBadge({
  protectionUntil,
  galaxy,
  totalPoints,
  size = 'md',
  showPoints = false,
}: BeginnerProtectionBadgeProps) {
  const [isProtected, setIsProtected] = useState(false);
  const [isBeginnerZone, setIsBeginnerZone] = useState(false);
  const [remainingTime, setRemainingTime] = useState('');

  useEffect(() => {
    if (protectionUntil) {
      const checkProtection = () => {
        const now = new Date();
        const protectionDate = new Date(protectionUntil);
        const hasProtection = protectionDate > now;
        setIsProtected(hasProtection);

        if (hasProtection) {
          const diff = protectionDate.getTime() - now.getTime();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

          if (days > 0) {
            setRemainingTime(`${days}j ${hours}h`);
          } else if (hours > 0) {
            setRemainingTime(`${hours}h ${minutes}m`);
          } else {
            setRemainingTime(`${minutes}m`);
          }
        }
      };

      checkProtection();
      const interval = setInterval(checkProtection, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [protectionUntil]);

  useEffect(() => {
    // Check if in beginner zone (galaxy 1 by default)
    if (galaxy !== undefined) {
      setIsBeginnerZone(galaxy <= 1);
    }
  }, [galaxy]);

  if (!isProtected && !isBeginnerZone && !showPoints) {
    return null;
  }

  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 10,
    md: 14,
    lg: 18,
  };

  return (
    <div className="flex gap-1 items-center flex-wrap">
      {isProtected && (
        <div
          className={`${sizes[size]} bg-cyan-500/20 border border-cyan-500/50 rounded-md flex items-center gap-1 text-cyan-300 font-semibold animate-pulse`}
          title={`Protection débutant active jusqu'à ${new Date(protectionUntil!).toLocaleDateString()}`}
        >
          <Shield size={iconSizes[size]} className="animate-pulse" />
          <span>{remainingTime}</span>
        </div>
      )}

      {isBeginnerZone && (
        <div
          className={`${sizes[size]} bg-green-500/20 border border-green-500/50 rounded-md flex items-center gap-1 text-green-300 font-semibold`}
          title="Dans la zone débutant - Protection active"
        >
          <MapPin size={iconSizes[size]} />
          <span>Zone Débutant</span>
        </div>
      )}

      {showPoints && totalPoints !== undefined && (
        <div
          className={`${sizes[size]} bg-amber-500/20 border border-amber-500/50 rounded-md flex items-center gap-1 text-amber-300 font-mono font-semibold`}
          title="Total des points"
        >
          <span>{totalPoints.toLocaleString()} pts</span>
        </div>
      )}
    </div>
  );
}

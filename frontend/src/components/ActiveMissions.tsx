import React, { useEffect, useState, useCallback } from 'react';
import { Crosshair, Truck, Shield, Recycle, Telescope, Rocket, ArrowRight, ArrowLeft, Loader2, RefreshCw, Skull, Navigation } from 'lucide-react';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';
import { formatTimeUntil } from '@/lib/utils';

interface ActiveMission {
  id: string;
  mission_type: string;
  source_planet_name?: string;
  target_planet_name?: string;
  target_galaxy?: number;
  target_system?: number;
  target_position?: number;
  arrival_time: string;
  fleet?: Record<string, number>;
  status?: string;
}

interface ActiveMissionsProps {
  planet: any;
  onUpdate?: () => void;
}

const getMissionMeta = (type: string): { label: string; icon: React.ComponentType<any>; color: string; bg: string; border: string } => {
  switch (type) {
    case 'attack':
      return { label: 'Attaque', icon: Crosshair, color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20' };
    case 'transport':
      return { label: 'Transport', icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20' };
    case 'deploy':
      return { label: 'Déploiement', icon: Navigation, color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20' };
    case 'recycle':
      return { label: 'Recyclage', icon: Recycle, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' };
    case 'expedition':
      return { label: 'Expédition', icon: Telescope, color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20' };
    case 'colonize':
      return { label: 'Colonisation', icon: Rocket, color: 'text-cyan-400', bg: 'bg-cyan-500/5', border: 'border-cyan-500/20' };
    case 'spy':
      return { label: 'Espionnage', icon: Telescope, color: 'text-yellow-400', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' };
    case 'piracy':
      return { label: 'Piraterie', icon: Skull, color: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/20' };
    default:
      return { label: type, icon: Truck, color: 'text-slate-400', bg: 'bg-slate-500/5', border: 'border-slate-500/20' };
  }
};

// Composant individuel de mission — mémoïsé pour éviter les re-renders sur tick du timer
const MissionRow = React.memo(function MissionRow({
  mission,
  isIncoming,
  canRecall,
  onRecall,
}: {
  mission: ActiveMission;
  isIncoming: boolean;
  canRecall: boolean;
  onRecall: (id: string) => void;
}) {
  const meta = getMissionMeta(mission.mission_type);
  const Icon = meta.icon;
  const [eta, setEta] = useState(() => formatTimeUntil(mission.arrival_time));

  useEffect(() => {
    const update = () => setEta(formatTimeUntil(mission.arrival_time));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [mission.arrival_time]);

  const totalShips = mission.fleet
    ? Object.values(mission.fleet).reduce((s, c) => s + c, 0)
    : 0;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${meta.bg} ${meta.border} gap-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-lg border ${meta.border} ${meta.bg} shrink-0`}>
          {isIncoming ? (
            <ArrowLeft size={14} className={meta.color} />
          ) : (
            <Icon size={14} className={meta.color} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-widest ${meta.color}`}>
              {isIncoming ? 'Entrant — ' : ''}{meta.label}
            </span>
            {totalShips > 0 && (
              <span className="text-[9px] text-slate-500 font-mono">{totalShips} vso.</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono truncate">
            {mission.mission_type === 'deploy' && !isIncoming ? (
              <>
                <ArrowRight size={9} className="text-blue-400 shrink-0" />
                <span className="truncate text-blue-300">
                  {mission.target_planet_name || 'Destination inconnue'}
                </span>
                {mission.target_galaxy && (
                  <span className="text-slate-600 shrink-0">
                    [{mission.target_galaxy}:{mission.target_system}:{mission.target_position}]
                  </span>
                )}
              </>
            ) : mission.mission_type === 'piracy' && !isIncoming ? (
              <>
                <Skull size={9} className="text-orange-400 shrink-0" />
                <span className="truncate text-orange-300">
                  {mission.target_planet_name || 'Cible inconnue'}
                </span>
                {mission.target_galaxy && (
                  <span className="text-slate-600 shrink-0">
                    [{mission.target_galaxy}:{mission.target_system}:{mission.target_position}]
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="truncate">
                  {isIncoming
                    ? mission.source_planet_name || 'Inconnu'
                    : mission.target_planet_name || 'Inconnu'}
                </span>
                {mission.target_galaxy && !isIncoming && (
                  <span className="text-slate-600 shrink-0">
                    [{mission.target_galaxy}:{mission.target_system}:{mission.target_position}]
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase font-bold">ETA</div>
          <div className={`text-xs font-mono font-bold tabular-nums ${eta === 'Terminé' ? 'text-emerald-400' : 'text-slate-200'}`}>
            {eta}
          </div>
        </div>
        {canRecall && (
          <button
            onClick={() => onRecall(mission.id)}
            className="px-2 py-1 text-[9px] uppercase font-bold border border-slate-600/50 text-slate-500 hover:border-red-500/40 hover:text-red-400 rounded transition-colors"
          >
            Rappeler
          </button>
        )}
      </div>
    </div>
  );
});

// Composant principal — mémoïsé car les props changent peu souvent
const ActiveMissions = React.memo(function ActiveMissions({ planet, onUpdate }: ActiveMissionsProps) {
  const [loading, setLoading] = useState(false);

  // Extraire les missions depuis les données planet (retournées par get_planet backend)
  const incomingMissions: ActiveMission[] = planet?.incoming_missions || [];
  const outgoingMissions: ActiveMission[] = planet?.outgoing_missions || [];

  const handleRecall = useCallback(async (missionId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/fleet/missions/${missionId}/recall`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Flotte rappelée");
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de rappeler la flotte");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  }, [onUpdate]);

  const total = incomingMissions.length + outgoingMissions.length;

  if (total === 0) {
    return (
      <div className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
          <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent shrink-0" />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Flottes en Transit</span>
        </div>
        <p className="text-xs text-slate-600 text-center font-mono py-4">Aucune flotte en déplacement</p>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/10">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent shrink-0" />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">
            Flottes en Transit
          </span>
          <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold">
            {total}
          </span>
        </div>
        {loading && <Loader2 size={12} className="text-cyan-400 animate-spin" />}
      </div>

      <div className="space-y-2">
        {outgoingMissions.map((m) => (
          <MissionRow
            key={m.id}
            mission={m}
            isIncoming={false}
            canRecall={m.mission_type === 'deploy' || m.mission_type === 'piracy'}
            onRecall={handleRecall}
          />
        ))}
        {incomingMissions.map((m) => (
          <MissionRow
            key={m.id}
            mission={m}
            isIncoming={true}
            canRecall={false}
            onRecall={handleRecall}
          />
        ))}
      </div>
    </div>
  );
});

export default ActiveMissions;

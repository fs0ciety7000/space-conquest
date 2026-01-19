import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Stone, Gem, Droplets, Zap, Lock, Unlock, Power, PowerOff, ChevronDown } from "lucide-react";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";

interface ResourceSlot {
  id: number;
  planet_id: string;
  slot_number: number;
  resource_type: string;
  level: number;
  is_locked: boolean;
  is_active: boolean;
}

interface ResourceSlotsProps {
  planetId: string;
  onUpdate?: () => void;
}

const RESOURCE_TYPES = {
  metal: { icon: Stone, label: "Métal", color: "text-orange-400" },
  crystal: { icon: Gem, label: "Cristal", color: "text-cyan-400" },
  deuterium: { icon: Droplets, label: "Deutérium", color: "text-green-400" },
  energy: { icon: Zap, label: "Énergie", color: "text-yellow-400" },
};

export default function ResourceSlots({ planetId, onUpdate }: ResourceSlotsProps) {
  const [slots, setSlots] = useState<ResourceSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = async () => {
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/resource-slots`), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des slots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [planetId]);

  const handleChangeType = async (slotNumber: number, newType: string) => {
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/resource-slots/${slotNumber}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resource_type: newType }),
      });

      if (res.ok) {
        toast.success(`Slot ${slotNumber} modifié`);
        fetchSlots();
        onUpdate?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const handleToggleActive = async (slotNumber: number) => {
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/resource-slots/${slotNumber}/toggle`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (res.ok) {
        toast.success('Slot activé/désactivé');
        fetchSlots();
        onUpdate?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors du changement');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  // Calculer la production totale par type
  const getProductionByType = () => {
    const production: Record<string, number> = {};
    slots.filter(s => s.is_active).forEach(slot => {
      if (!production[slot.resource_type]) production[slot.resource_type] = 0;
      production[slot.resource_type] += slot.level;
    });
    return production;
  };

  const production = getProductionByType();

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-white/10">
        <CardContent className="p-6">
          <p className="text-white text-center">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Production totale */}
      <Card className="bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border-indigo-500/20">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-indigo-300">
            Production Totale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(RESOURCE_TYPES).map(([type, { icon: Icon, label, color }]) => (
              <div key={type} className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className={color} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
                <div className={`text-xl font-bold font-mono ${color}`}>
                  {production[type] || 0}
                </div>
                <div className="text-[10px] text-slate-500">
                  {slots.filter(s => s.is_active && s.resource_type === type).length} slot(s)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grille de slots */}
      <Card className="bg-slate-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-cyan-300">
            Slots de Ressources (8 au total)
          </CardTitle>
          <p className="text-xs text-slate-400 mt-2">
            Les 4 premiers slots sont verrouillés et représentent vos mines de base. Les 4 suivants sont configurables.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slots.map((slot) => {
              const resourceInfo = RESOURCE_TYPES[slot.resource_type as keyof typeof RESOURCE_TYPES];
              const Icon = resourceInfo?.icon || Stone;
              const color = resourceInfo?.color || "text-gray-400";

              return (
                <div
                  key={slot.slot_number}
                  className={`relative rounded-lg border p-4 transition-all ${
                    slot.is_active
                      ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-indigo-500/30'
                      : 'bg-slate-900/30 border-slate-700/50 opacity-60'
                  }`}
                >
                  {/* Header du slot */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        slot.is_locked ? 'bg-slate-700/50' : 'bg-indigo-900/30'
                      }`}>
                        {slot.is_locked ? (
                          <Lock size={14} className="text-slate-400" />
                        ) : (
                          <Unlock size={14} className="text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Slot {slot.slot_number}</div>
                        <div className="text-[10px] text-slate-500">
                          {slot.is_locked ? 'Verrouillé' : 'Configurable'}
                        </div>
                      </div>
                    </div>

                    {!slot.is_locked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(slot.slot_number)}
                        className={`h-8 w-8 p-0 ${
                          slot.is_active
                            ? 'text-green-400 hover:text-green-300'
                            : 'text-red-400 hover:text-red-300'
                        }`}
                      >
                        {slot.is_active ? <Power size={16} /> : <PowerOff size={16} />}
                      </Button>
                    )}
                  </div>

                  {/* Contenu du slot */}
                  <div className="space-y-3">
                    {/* Type de ressource */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Type</label>
                      {slot.is_locked ? (
                        <div className="flex items-center gap-2 p-2 bg-black/20 rounded border border-white/5">
                          <Icon size={16} className={color} />
                          <span className="text-sm font-mono text-white">
                            {resourceInfo?.label}
                          </span>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between bg-black/20 border-white/10 text-white hover:bg-black/30">
                              <div className="flex items-center gap-2">
                                <Icon size={16} className={color} />
                                <span>{resourceInfo?.label}</span>
                              </div>
                              <ChevronDown size={14} className="opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-950 border-slate-800 text-white">
                            {Object.entries(RESOURCE_TYPES).map(([type, { icon: TypeIcon, label, color: typeColor }]) => (
                              <DropdownMenuItem
                                key={type}
                                onClick={() => handleChangeType(slot.slot_number, type)}
                                className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                              >
                                <div className="flex items-center gap-2">
                                  <TypeIcon size={16} className={typeColor} />
                                  <span>{label}</span>
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Niveau */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Niveau</label>
                      <div className="p-2 bg-black/20 rounded border border-white/5">
                        <span className="text-2xl font-bold font-mono text-white">
                          {slot.level}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

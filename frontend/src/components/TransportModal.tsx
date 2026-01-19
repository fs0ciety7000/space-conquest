import { useState, useEffect } from "react";
import { X, Truck, ArrowRight, Package, Clock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { getTransporterCapacity } from '@/lib/gameRules';

interface TransportModalProps {
  currentPlanet: any;
  targetPlanet: { id: string; name: string; galaxy?: number; system?: number; position?: number };
  onClose: () => void;
  onConfirm: () => void;
}

export default function TransportModal({ currentPlanet, targetPlanet, onClose, onConfirm }: TransportModalProps) {
  const [transporters, setTransporters] = useState(1);
  const [metal, setMetal] = useState(0);
  const [crystal, setCrystal] = useState(0);
  const [deuterium, setDeuterium] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [flightTime, setFlightTime] = useState(0);

  const maxShips = currentPlanet.transporter_count || 0;
  const capacity = transporters * getTransporterCapacity(currentPlanet.hangar_level || 0);
  const currentLoad = metal + crystal + deuterium;

  // Calcul du temps de vol basé sur la distance 3D (comme le backend)
  useEffect(() => {
      const g1 = currentPlanet.galaxy || 1;
      const s1 = currentPlanet.system || 1;
      const p1 = currentPlanet.position || 1;
      const g2 = targetPlanet.galaxy || g1;
      const s2 = targetPlanet.system || s1;
      const p2 = targetPlanet.position || p1;
      
      // Calcul distance identique au backend
      let dist = 5.0;
      if (g1 !== g2) {
          dist = Math.abs(g1 - g2) * 20000;
      } else if (s1 !== s2) {
          dist = Math.abs(s1 - s2) * 2000 + 2700;
      } else if (p1 !== p2) {
          dist = Math.abs(p1 - p2) * 5 + 1000;
      }
      
      // Calcul temps identique au backend (avec SPEED_FACTOR = 500)
      const speedFactor = 500; // TODO: récupérer du serveur
      const baseTime = 10 + Math.sqrt(dist) / 2;
      const seconds = Math.max(5, Math.floor((baseTime * 100) / speedFactor));
      setFlightTime(seconds);
  }, [currentPlanet, targetPlanet]);
  
  const handleSend = async () => {
    // --- VALIDATIONS STRICTES ---
    if (maxShips <= 0 || transporters <= 0) {
        toast.error("Impossible : Flotte insuffisante", { description: "Vous devez sélectionner au moins un transporteur." });
        return;
    }
    if (currentLoad <= 0) {
        toast.error("Soute vide", { description: "Sélectionnez des ressources à envoyer." });
        return;
    }
    if (currentLoad > capacity) {
        toast.error("Surcharge", { description: "La cargaison dépasse la capacité des vaisseaux." });
        return;
    }

    setIsSending(true);
    try {
        const res = await fetch(apiUrl(`/transport?current_planet_id=${currentPlanet.id}`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_planet_id: targetPlanet.id,
                transporters,
                metal,
                crystal,
                deuterium
            })
        });
        const data = await res.json();
        if(res.ok) {
            // Extraire le temps réel du message du backend si disponible
            const match = data.message?.match(/(\d+)s/);
            const realFlightTime = match ? parseInt(match[1]) : flightTime;
            toast.success("Flotte logistique lancée !", {
                description: `Livraison estimée dans ${realFlightTime} secondes.`,
                duration: 5000,
                icon: <Truck className="text-green-500" />
            });
            onConfirm();
            onClose();
        } else {
            toast.error("Échec du lancement", {
                description: data.error || "Une erreur inconnue est survenue.",
            });
        }
    } catch(e) { console.error(e); toast.error("Erreur de connexion"); }
    finally { setIsSending(false); }
  };

  const setMax = (type: 'metal' | 'crystal' | 'deuterium') => {
      const remainingSpace = capacity - currentLoad;
      const currentVal = type === 'metal' ? metal : type === 'crystal' ? crystal : deuterium;
      const spaceForThisResource = remainingSpace + currentVal;
      const stock = type === 'metal' ? currentPlanet.metal_amount : type === 'crystal' ? currentPlanet.crystal_amount : currentPlanet.deuterium_amount;
      
      const amount = Math.min(stock, spaceForThisResource);
      
      if(type === 'metal') setMetal(Math.floor(amount));
      if(type === 'crystal') setCrystal(Math.floor(amount));
      if(type === 'deuterium') setDeuterium(Math.floor(amount));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border border-blue-500/30 text-white max-w-md p-0 overflow-hidden sm:rounded-xl">
        <div className="p-4 bg-blue-950/40 border-b border-blue-500/20 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
                <Truck size={20} />
            </div>
            <div className="flex-1">
                <h3 className="font-black uppercase tracking-widest text-sm text-blue-100">Logistique</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span className="text-white">{currentPlanet.name}</span>
                    <ArrowRight size={10} className="text-blue-500" />
                    <span className="text-white">{targetPlanet.name}</span>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
            </button>
        </div>

        <div className="p-6 space-y-6">
            <div className="space-y-3">
                <div className="flex justify-between text-xs uppercase font-bold text-slate-500">
                    <span>Flotte de transport</span>
                    <span className={maxShips > 0 ? "text-blue-400" : "text-red-500"}>{maxShips} Disp.</span>
                </div>
                
                {maxShips > 0 ? (
                    <div className="flex items-center gap-4">
                        <Input 
                            type="number" min="1" max={maxShips} value={transporters} 
                            onChange={e => setTransporters(Math.max(1, Math.min(maxShips, parseInt(e.target.value) || 1)))}
                            className="w-20 bg-black/50 border-blue-500/30 font-mono text-right text-white h-9"
                        />
                        <Slider 
                            value={[transporters]} max={maxShips} min={1} step={1}
                            onValueChange={(v) => setTransporters(v[0])}
                            className="flex-1"
                        />
                    </div>
                ) : (
                    <div className="p-3 bg-red-950/20 border border-red-900/50 rounded text-red-400 text-xs font-mono text-center">
                        Aucun transporteur disponible. Construisez-en au chantier spatial.
                    </div>
                )}

                <div className="flex justify-between items-center text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
                        <Clock size={12} className="text-yellow-500" />
                        <span>VOL: ~{flightTime}s</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Soute :</span>
                        <span className={`ml-1 ${currentLoad > capacity ? "text-red-500 font-bold" : "text-white"}`}>
                            {currentLoad.toLocaleString()}
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-blue-400">{capacity.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
                {[
                    { label: 'Métal', val: metal, set: setMetal, type: 'metal', color: 'text-slate-300' },
                    { label: 'Cristal', val: crystal, set: setCrystal, type: 'crystal', color: 'text-blue-300' },
                    { label: 'Deutérium', val: deuterium, set: setDeuterium, type: 'deuterium', color: 'text-green-300' }
                ].map((res) => (
                    <div key={res.type} className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                            <span className={res.color}>{res.label}</span>
                            <button 
                                onClick={() => setMax(res.type as any)} 
                                className="text-blue-500 hover:text-blue-300 transition-colors"
                            >
                                MAX
                            </button>
                        </div>
                        <Input 
                            type="number" 
                            value={res.val} 
                            onChange={e => res.set(Math.max(0, parseFloat(e.target.value) || 0))} 
                            className="bg-slate-900/50 border-white/10 h-8 font-mono text-xs text-white focus:border-blue-500/50" 
                        />
                    </div>
                ))}
            </div>

            <Button 
                onClick={handleSend} 
                disabled={isSending || currentLoad > capacity || maxShips < 1 || transporters < 1 || currentLoad <= 0} 
                className={`w-full font-black uppercase tracking-widest h-12 transition-all ${
                    isSending 
                    ? 'bg-blue-900/50 text-blue-200' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                }`}
            >
                {isSending ? (
                    <span className="animate-pulse">Transmission...</span>
                ) : (
                    <span className="flex items-center gap-2">
                        <Package size={16} /> Initier le Transfert
                    </span>
                )}
            </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { Rocket, Swords, Timer, Shield, Terminal, Zap, Box, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Définition des vaisseaux avec leurs thèmes de couleurs
const SHIP_TYPES = [
  { 
    id: 'light_hunter', 
    name: 'Chasseur Léger', 
    tier: 'MK I',
    desc: 'Unité d\'interception rapide.',
    m: 3000, c: 1000, time: 20, atk: 50, def: 400,
    color: 'text-orange-400',
    border: 'border-orange-500',
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.5)]',
    bg: 'bg-orange-950/20'
  },
  { 
    id: 'cruiser', 
    name: 'Croiseur', 
    tier: 'MK II',
    desc: 'Vaisseau de ligne lourdement armé.',
    m: 20000, c: 7000, time: 60, atk: 400, def: 2700,
    color: 'text-cyan-400',
    border: 'border-cyan-500',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]',
    bg: 'bg-cyan-950/20'
  },
  { 
    id: 'recycler', 
    name: 'Recycleur', 
    tier: 'Logistique',
    desc: 'Collecteur de débris orbitaux.',
    m: 10000, c: 6000, time: 40, atk: 1, def: 1600,
    color: 'text-purple-400',
    border: 'border-purple-500',
    glow: 'shadow-[0_0_20px_rgba(192,132,252,0.5)]',
    bg: 'bg-purple-950/20'
  },
  { 
    id: 'spy_probe', 
    name: 'Sonde Espion', 
    tier: 'Recon',
    desc: 'Unité furtive pour analyse tactique.',
    m: 0, c: 1000, time: 5, atk: 0, def: 10,
    color: 'text-emerald-400',
    border: 'border-emerald-500',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.5)]',
    bg: 'bg-emerald-950/20'
  }
];

export default function Shipyard({ planet, onBuild }: { planet: any, onBuild: () => void }) {
  const [selected, setSelected] = useState(SHIP_TYPES[0]);
  const [qty, setQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Gestion du compte à rebours
  useEffect(() => {
    if (planet?.shipyard_construction_end) {
      const interval = setInterval(() => {
        const end = new Date(planet.shipyard_construction_end).getTime(); // Retrait du "Z" si format UTC standard
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        
        setTimeLeft(diff);
        if (diff === 0) {
          clearInterval(interval);
          onBuild(); 
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [planet?.shipyard_construction_end, onBuild]);

  const startBuild = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/build-fleet/${selected.id}/${qty}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) onBuild();
    } catch (e) { console.error("Erreur production", e); }
  };

  const totalM = selected.m * qty;
  const totalC = selected.c * qty;
  const metalAvailable = planet.metal_amount ?? 0;
  const crystalAvailable = planet.crystal_amount ?? 0;
  const canAfford = metalAvailable >= totalM && crystalAvailable >= totalC;
  const isBusy = planet.shipyard_construction_end !== null;

  // Helper pour l'icone
  const renderIcon = (id: string, size: number, className: string) => {
    switch(id) {
        case 'cruiser': return <Shield size={size} className={className}/>;
        case 'recycler': return <Box size={size} className={className}/>;
        case 'spy_probe': return <Eye size={size} className={className}/>;
        default: return <Rocket size={size} className={className}/>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 animate-in fade-in duration-500">
      
      {/* ZONE PRINCIPALE (GAUCHE) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* SÉLECTEUR DE VAISSEAUX (CARTES) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SHIP_TYPES.map(s => {
            const isSelected = selected.id === s.id;
            return (
              <button 
                key={s.id} 
                onClick={() => setSelected(s)} 
                className={`relative group overflow-hidden rounded-xl border transition-all duration-300 p-4 text-left h-36 flex flex-col justify-between
                  ${isSelected 
                    ? `${s.bg} ${s.border} ${s.glow} scale-105 z-10` 
                    : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/20'
                  }`}
              >
                 {isSelected && <div className={`absolute inset-0 bg-white/5 opacity-20 pointer-events-none`}></div>}
                 
                 <div>
                   <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? s.color : 'text-slate-500'}`}>{s.tier}</span>
                   <h3 className={`text-sm font-black uppercase ${isSelected ? 'text-white' : 'text-slate-400'}`}>{s.name}</h3>
                 </div>
                 
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-mono text-slate-500">{s.time}s</span>
                    {renderIcon(s.id, 18, isSelected ? s.color : 'text-slate-600')}
                 </div>
              </button>
            );
          })}
        </div>

        {/* PANNEAU DE COMMANDE CENTRAL */}
        <div className={`relative overflow-hidden rounded-3xl border ${selected.border} bg-black/60 backdrop-blur-md p-8 shadow-2xl transition-colors duration-500`}>
          
          {/* Arrière-plan décoratif (Icone géante) */}
          <div className={`absolute -right-10 -top-10 opacity-10 rotate-12 transition-transform duration-700 ${isBusy ? 'animate-pulse' : ''}`}>
             {renderIcon(selected.id, 250, selected.color)}
          </div>

          <div className="relative z-10 space-y-8">
            {/* Header du panneau */}
            <div>
              <div className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 ${selected.color}`}>Ligne de Production</div>
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter mb-1">{selected.name}</h2>
              <p className="text-xs text-slate-400 max-w-md">{selected.desc}</p>
            </div>

            {/* Statistiques */}
            <div className="flex gap-3">
              <div className="bg-black/40 border border-white/5 px-3 py-2 rounded flex items-center gap-2">
                <Swords size={12} className="text-red-500"/>
                <span className="text-[10px] font-bold text-slate-300">ATK <span className="text-white ml-1">{selected.atk}</span></span>
              </div>
              <div className="bg-black/40 border border-white/5 px-3 py-2 rounded flex items-center gap-2">
                <Shield size={12} className="text-blue-500"/>
                <span className="text-[10px] font-bold text-slate-300">DEF <span className="text-white ml-1">{selected.def}</span></span>
              </div>
              <div className="bg-black/40 border border-white/5 px-3 py-2 rounded flex items-center gap-2">
                <Zap size={12} className="text-yellow-500"/>
                <span className="text-[10px] font-bold text-slate-300">NRG <span className="text-white ml-1">-{selected.time}s</span></span>
              </div>
            </div>

            <hr className="border-white/5" />

            {/* Contrôles de production */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ordre de Fabrication (Unités)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      min="1" 
                      value={qty} 
                      onChange={e => setQty(Math.max(1, Number(e.target.value)))} 
                      className={`w-32 bg-transparent border-b-2 ${selected.color.replace('text-', 'border-')} text-4xl font-mono font-black text-white p-2 outline-none focus:bg-white/5 transition-colors`} 
                    />
                    <div className="text-[10px] text-slate-500 font-mono">
                      TEMPS ESTIMÉ<br/>
                      <span className="text-white text-lg">{(selected.time * qty)}s</span>
                    </div>
                  </div>
               </div>

               {/* Coûts totaux */}
               <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                 <div className="flex justify-between text-xs font-mono">
                    <span className={metalAvailable >= totalM ? "text-slate-400" : "text-red-500"}>MÉTAL REQUIS</span>
                    <span className={metalAvailable >= totalM ? "text-white" : "text-red-500"}>{totalM.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-xs font-mono">
                    <span className={crystalAvailable >= totalC ? "text-slate-400" : "text-red-500"}>CRISTAL REQUIS</span>
                    <span className={crystalAvailable >= totalC ? "text-white" : "text-red-500"}>{totalC.toLocaleString()}</span>
                 </div>
               </div>
            </div>

            {/* Bouton d'action */}
            <Button 
              onClick={startBuild} 
              disabled={isBusy || !canAfford} 
              className={`w-full h-16 font-black tracking-[0.2em] uppercase transition-all rounded-xl relative overflow-hidden group
                ${isBusy 
                  ? 'bg-slate-900 border border-white/10 text-slate-500' 
                  : !canAfford 
                    ? 'bg-red-950/20 border border-red-900/50 text-red-500'
                    : `bg-black hover:bg-slate-900 text-white border ${selected.border} ${selected.glow}`
                }`}
            >
              {isBusy ? (
                 <span className="flex items-center gap-3 animate-pulse">
                   <Timer size={20} /> SYSTÈME ENGAGÉ : {timeLeft}s
                 </span>
              ) : !canAfford ? (
                 "RESSOURCES INSUFFISANTES"
              ) : (
                 <span className="flex items-center gap-3 relative z-10">
                   {renderIcon(selected.id, 18, "")} INITIALISER L'ASSEMBLAGE
                 </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* PANNEAU DROIT (TERMINAL & FLOTTE) */}
      <div className="space-y-6">
        
        {/* Terminal Logs */}
        <div className="bg-black/80 border border-white/10 p-6 rounded-2xl font-mono h-48 overflow-hidden relative">
          <div className="absolute inset-0 bg-scanline opacity-10 pointer-events-none"></div>
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
            <Terminal size={12} className="text-green-500"/> SYSTEM_LOGS
          </h4>
          <div className="text-[10px] space-y-2 text-green-500/80">
            <p>&gt; Chantier naval : Connecté.</p>
            <p>&gt; Vérification des stocks... OK.</p>
            {isBusy && (
              <>
                <p className="text-yellow-500">&gt; PROCESSUS ACTIF : {planet.pending_fleet_type}</p>
                <p className="animate-pulse">&gt; Soudure coque externe [{Math.floor(Math.random()*100)}%]</p>
              </>
            )}
            {!isBusy && <p className="text-slate-600">&gt; En attente de commande...</p>}
          </div>
        </div>

        {/* État de la flotte */}
        <Card className="bg-slate-950 border border-white/5 p-6 rounded-3xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Swords size={100} /></div>
           
           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Hangar Orbital</h4>
           
           <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 group hover:bg-orange-500/10 transition-colors">
                 <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-orange-400">Chasseurs</span>
                    <span className="text-[8px] text-slate-500">Classe Légère</span>
                 </div>
                 <span className="text-xl text-white font-mono font-black">{planet.light_hunter_count || 0}</span>
              </div>
              
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 group hover:bg-cyan-500/10 transition-colors">
                 <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-cyan-400">Croiseurs</span>
                    <span className="text-[8px] text-slate-500">Classe Lourde</span>
                 </div>
                 <span className="text-xl text-white font-mono font-black">{planet.cruiser_count || 0}</span>
              </div>

              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 group hover:bg-purple-500/10 transition-colors">
                 <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-purple-400">Recycleurs</span>
                    <span className="text-[8px] text-slate-500">Support</span>
                 </div>
                 <span className="text-xl text-white font-mono font-black">{planet.recycler_count || 0}</span>
              </div>

              {/* Ligne ajoutée pour les Sondes */}
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 group hover:bg-emerald-500/10 transition-colors">
                 <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-emerald-400">Sondes</span>
                    <span className="text-[8px] text-slate-500">Espionnage</span>
                 </div>
                 <span className="text-xl text-white font-mono font-black">{planet.spy_probe_count || 0}</span>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
}
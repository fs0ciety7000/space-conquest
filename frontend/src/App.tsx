import { useEffect, useState, useCallback } from 'react';
import ResourceDisplay from './components/ResourceDisplay';
import Shipyard from './components/Shipyard';
import EmpireBar from './components/EmpireBar';
import TechTree from './components/TechTree';
import ExpeditionZone from './components/ExpeditionZone';
import CombatModal from './components/CombatModal';
import Login from './components/Login';
import { LogOut, BellRing } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [planetId, setPlanetId] = useState<string | null>(localStorage.getItem('planet_id'));
  const [activeTab, setActiveTab] = useState<'resources' | 'fleet' | 'tech' | 'expedition'>('resources');
  const [planet, setPlanet] = useState<any>(null);
  const [report, setReport] = useState<string | null>(null); // État pour le message de retour
  const [lastCombatReport, setLastCombatReport] = useState<any>(null);

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setPlanetId(null);
    setPlanet(null);
  };

  const fetchPlanet = useCallback(async () => {
    if (!planetId || !token) return;
    try {
      const res = await fetch(`http://localhost:8080/planets/${planetId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        
        // --- LOGIQUE DE DÉTECTION DU RETOUR D'EXPÉDITION ---
        // Si la planète actuelle avait une expédition en cours et que la nouvelle n'en a plus
        if (planet?.expedition_end && !data.expedition_end) {
          setReport("TRANSMISSION ENTRANTE : L'expédition est revenue. Butin : +15,000 unités de Métal !");
          // On fait disparaître le message après 8 secondes
          setTimeout(() => setReport(null), 8000);
        }

        const sanitizedPlanet = {
          ...data,
          metal_amount: data.metal_amount ?? 0,
          crystal_amount: data.crystal_amount ?? 0,
          deuterium_amount: data.deuterium_amount ?? 0,
          energy_tech_level: data.energy_tech_level ?? 0,
          metal_mine_level: data.metal_mine_level ?? 0,
          crystal_mine_level: data.crystal_mine_level ?? 0,
          deuterium_mine_level: data.deuterium_mine_level ?? 0,
        };
        setPlanet(sanitizedPlanet);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error("Liaison perdue avec le centre de commande");
    }
    // Note : on ajoute 'planet' aux dépendances pour pouvoir comparer l'ancien état au nouveau
  }, [planetId, token, planet]); 

  useEffect(() => {
    if (token && planetId) {
      fetchPlanet();
      const interval = setInterval(fetchPlanet, 2000);
      return () => clearInterval(interval);
    }
  }, [token, planetId, fetchPlanet]);

  if (!token || !planetId) {
    return <Login onLogin={(t, p) => { 
        localStorage.setItem('token', t); 
        localStorage.setItem('planet_id', p);
        setToken(t); 
        setPlanetId(p); 
    }} />;
  }

  if (!planet) return <div className="min-h-screen bg-black flex items-center justify-center text-indigo-500 font-mono">INITIALISATION...</div>;

  return (
    <div className="min-h-screen bg-black text-white pt-24 p-6 selection:bg-indigo-500">
      <EmpireBar planet={planet} />
      <CombatModal report={lastCombatReport} onClose={() => setLastCombatReport(null)} />

      {/* --- BANDEAU DE RAPPORT D'EXPÉDITION --- */}
      {report && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="bg-indigo-600 text-white px-8 py-4 rounded-2xl border-2 border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.4)] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-4">
            <BellRing className="animate-bounce" size={18} />
            {report}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        <nav className="flex items-center justify-between border-b border-white/5 pb-4 text-white">
          <div className="flex gap-2">
            {(['resources', 'fleet', 'tech', 'expedition'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
              >
                {tab === 'resources' ? 'Économie' : tab === 'fleet' ? 'Flotte' : tab === 'tech' ? 'Recherche' : 'Missions'}
              </button>
            ))}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-500 text-[10px] font-black uppercase"><LogOut size={14}/> Quitter</button>
        </nav>

        <main>
          {activeTab === 'resources' && <ResourceDisplay planet={planet} onUpgrade={fetchPlanet} />}
          {activeTab === 'fleet' && <Shipyard planet={planet} onBuild={fetchPlanet} />}
          {activeTab === 'tech' && <TechTree planet={planet} onUpdate={fetchPlanet} />}
          {activeTab === 'expedition' && <ExpeditionZone planet={planet} onAction={fetchPlanet} />}
        </main>
      </div>
    </div>
  );
}
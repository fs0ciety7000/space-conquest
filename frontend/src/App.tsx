import { useEffect, useState, useCallback, useRef } from 'react';
import ResourceDisplay from './components/ResourceDisplay';
import Shipyard from './components/Shipyard';
import EmpireBar from './components/EmpireBar';
import TechTree from './components/TechTree';
import ExpeditionZone from './components/ExpeditionZone';
import CombatModal from './components/CombatModal';
import Login from './components/Login';
import { LogOut, BellRing } from "lucide-react";

// Types simplifiés (tu peux les déplacer dans un fichier types.ts plus tard)
interface CombatReport {
  winner: string;
  log: string[];
  loot: number;
}

export default function App() {
  // --- ÉTATS GLOBAUX ---
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [planetId, setPlanetId] = useState<string | null>(localStorage.getItem('planet_id'));
  const [activeTab, setActiveTab] = useState<'resources' | 'fleet' | 'tech' | 'expedition'>('resources');
  
  const [planet, setPlanet] = useState<any>(null);
  
  // États pour la Modale de Combat
  const [combatReport, setCombatReport] = useState<CombatReport | null>(null);
  const [showCombatModal, setShowCombatModal] = useState(false);

  // État pour les notifications "Toast" (en bas de l'écran)
  const [report, setReport] = useState<string | null>(null);

  // Utilisation d'une Ref pour détecter les changements passifs (fin de construction, etc.)
  const prevPlanetRef = useRef<any>(null);

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setPlanetId(null);
    setPlanet(null);
  };

  // --- RÉCUPÉRATION DES DONNÉES (POLLING) ---
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
        
        // --- DETECTION FIN DE CONSTRUCTION (POLLING) ---
        // Exemple : notification si une mine vient de finir
        if (prevPlanetRef.current?.construction_end && !data.construction_end) {
            setReport("CONSTRUCTION TERMINÉE : Bâtiment opérationnel.");
            setTimeout(() => setReport(null), 5000);
        }

        // Nettoyage des données
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

        prevPlanetRef.current = sanitizedPlanet;
        setPlanet(sanitizedPlanet);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error("Liaison perdue avec le centre de commande");
    }
  }, [planetId, token]);

  // --- ACTION SPÉCIALE : LANCER EXPÉDITION ---
  // Cette fonction gère le POST et la réception du Rapport de Combat
  const launchExpedition = async () => {
    if (!planetId || !token) return;
    
    try {
        const res = await fetch(`http://localhost:8080/planets/${planetId}/expedition`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}` 
            }
        });

        if (res.ok) {
            const data = await res.json();
            
            // 1. Mise à jour immédiate de la planète (ressources)
            setPlanet(data.planet);
            
            // 2. Gestion du Rapport de Combat
            if (data.report) {
                setCombatReport(data.report);
                setShowCombatModal(true);
            } else {
                // Fallback si pas de rapport (vieux code backend)
                setReport("Expédition terminée. Données mises à jour.");
                setTimeout(() => setReport(null), 4000);
            }
        } else {
            const err = await res.json();
            setReport(`ERREUR MISSION : ${err.error}`);
            setTimeout(() => setReport(null), 4000);
        }
    } catch (e) {
        console.error(e);
    }
  };

  // --- EFFETS ---
  useEffect(() => {
    if (token && planetId) {
      fetchPlanet();
      const interval = setInterval(fetchPlanet, 2000); // Polling toutes les 2s
      return () => clearInterval(interval);
    }
  }, [token, planetId, fetchPlanet]);

  // --- RENDU LOGIN ---
  if (!token || !planetId) {
    return <Login onLogin={(t, p) => { 
        localStorage.setItem('token', t); 
        localStorage.setItem('planet_id', p);
        setToken(t); 
        setPlanetId(p); 
    }} />;
  }

  // --- RENDU LOADING ---
  if (!planet) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-cyan-400 font-mono animate-pulse">
      INITIALISATION DU LIEN NEURAL...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 p-6 selection:bg-cyan-500/30 relative overflow-hidden font-sans">
      
      {/* BACKGROUND */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay bg-cover bg-center fixed"
        style={{ backgroundImage: "url('/assets/background.png')" }}
      ></div>

      <div className="relative z-10">
        <EmpireBar planet={planet} />

        {/* --- MODALE DE COMBAT --- */}
        {showCombatModal && combatReport && (
            <CombatModal 
                report={combatReport} 
                onClose={() => setShowCombatModal(false)} 
            />
        )}

        {/* --- BANDEAU DE NOTIFICATION (TOAST) --- */}
        {report && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="bg-indigo-600/90 backdrop-blur text-white px-8 py-4 rounded-2xl border-2 border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.4)] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-4">
              <BellRing className="animate-bounce" size={18} />
              {report}
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          {/* NAVIGATION */}
          <nav className="flex items-center justify-between border-b border-white/5 pb-4 text-white">
            <div className="flex gap-2">
              {(['resources', 'fleet', 'tech', 'expedition'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab 
                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'resources' ? 'Économie' : tab === 'fleet' ? 'Flotte' : tab === 'tech' ? 'Recherche' : 'Missions'}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-500 text-[10px] font-black uppercase transition-colors">
              <LogOut size={14}/> Quitter
            </button>
          </nav>

          {/* CONTENU PRINCIPAL */}
          <main className="animate-in fade-in duration-500">
            {activeTab === 'resources' && <ResourceDisplay planet={planet} onUpgrade={fetchPlanet} />}
            {activeTab === 'fleet' && <Shipyard planet={planet} onBuild={fetchPlanet} />}
            {activeTab === 'tech' && <TechTree planet={planet} onUpdate={fetchPlanet} />}
            
            {/* IMPORTANT : On passe launchExpedition ici pour gérer le retour JSON complexe */}
            {activeTab === 'expedition' && (
                <ExpeditionZone 
                    planet={planet} 
                    onAction={launchExpedition} 
                />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
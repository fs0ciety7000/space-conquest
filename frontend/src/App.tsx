import { useEffect, useState, useCallback, useRef } from 'react';
import ResourceDisplay from './components/ResourceDisplay';
import Shipyard from './components/Shipyard';
import EmpireBar from './components/EmpireBar';
import TechTree from './components/TechTree';
import ExpeditionZone from './components/ExpeditionZone';
import CombatModal from './components/CombatModal';
import Login from './components/Login';
import Leaderboard from './components/Leaderboard';
import AttackModal from './components/AttackModal'; 
import ReportsTerminal from './components/ReportsTerminal';
import Defenses from './components/Defenses';
import PlanetOverview from './components/PlanetOverview';
import GalaxyView from './components/GalaxyView';
import { 
  LogOut, BellRing, LayoutDashboard, Pickaxe, Hammer, 
  ShieldCheck, FlaskConical, Telescope, Trophy, ScrollText, Globe 
} from "lucide-react";

interface CombatReport {
  winner: string;
  log: string[];
  loot: number;
  losses?: {
    light_hunter: number;
    cruiser: number;
  };
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [planetId, setPlanetId] = useState<string | null>(localStorage.getItem('planet_id'));
  const [activeTab, setActiveTab] = useState<'overview' | 'galaxy' | 'resources' | 'fleet' | 'defenses' | 'tech' | 'expedition' | 'ranking' | 'reports'>('overview');
  const [speedFactor, setSpeedFactor] = useState<number>(1);
  const [planet, setPlanet] = useState<any>(null);
  const [combatReport, setCombatReport] = useState<CombatReport | null>(null);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [targetPlanet, setTargetPlanet] = useState<{id: string, name: string} | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const prevPlanetRef = useRef<any>(null);

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
        
        // --- GESTION ALERTE DÉFENSE (Rapport entrant) ---
        if (data.unread_report) {
            try {
                const reportData = JSON.parse(data.unread_report);
                const isVictory = reportData.winner === 'defender'; 
                
                const formattedReport: CombatReport = {
                    winner: isVictory ? 'player' : 'enemy',
                    log: reportData.log,
                    loot: reportData.loot,
                    losses: reportData.losses
                };

                setCombatReport(formattedReport);
                setShowCombatModal(true);
                
                // Nettoyage de l'alerte
                await fetch(`http://localhost:8080/planets/${planetId}/clear-report`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Erreur lecture rapport défense", err);
            }
        }

        // Notification fin de construction
        if (prevPlanetRef.current?.construction_end && !data.construction_end) {
            setReport("CONSTRUCTION TERMINÉE.");
            setTimeout(() => setReport(null), 4000);
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

        prevPlanetRef.current = sanitizedPlanet;
        setPlanet(sanitizedPlanet);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error("Liaison perdue avec le centre de commande", e);
      setReport("ERREUR DE LIAISON");
    }
  }, [planetId, token]);

  // --- ACTIONS ---

  const launchExpedition = async () => {
    if (!planetId || !token) return;
    try {
        const res = await fetch(`http://localhost:8080/planets/${planetId}/expedition`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            setPlanet(data.planet);
            if (data.report) {
                setCombatReport(data.report);
                setShowCombatModal(true);
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

  const handlePrepareAttack = (targetId: string, targetName: string) => {
    setTargetPlanet({ id: targetId, name: targetName });
  };

  const handleConfirmAttack = async (hunters: number, cruisers: number) => {
    if (!planetId || !token || !targetPlanet) return;
    setTargetPlanet(null);
    setReport("LANCEMENT DES VECTEURS D'ATTAQUE...");

    try {
        const res = await fetch(`http://localhost:8080/attack?current_planet_id=${planetId}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_planet_id: targetPlanet.id,
                hunters: hunters,
                cruisers: cruisers
            })
        });

        const data = await res.json();

        if (res.ok) {
            fetchPlanet();
            const pvpReport = data.report;
            const formattedReport: CombatReport = {
                winner: pvpReport.winner === 'attacker' ? 'player' : 'enemy',
                log: pvpReport.log,
                loot: (pvpReport.loot?.metal || 0) + (pvpReport.loot?.crystal || 0),
                losses: {
                    light_hunter: pvpReport.attacker_losses || 0,
                    cruiser: 0
                }
            };
            
            setCombatReport(formattedReport);
            setShowCombatModal(true);
        } else {
            setReport(`ERREUR ATTAQUE : ${data.error}`);
            setTimeout(() => setReport(null), 5000);
        }
    } catch (e) {
        console.error(e);
        setReport("ÉCHEC TRANSMISSION ORDRE DE TIR.");
        setTimeout(() => setReport(null), 4000);
    }
  };

  const handleSpy = async (targetId: string) => {
    if (!planetId || !token) return;
    
    try {
        const res = await fetch(`http://localhost:8080/spy?current_planet_id=${planetId}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target_planet_id: targetId })
        });

        const data = await res.json();

        if (res.ok) {
            const r = data.report;
            const logs = ["--- RAPPORT D'ESPIONNAGE ---"];
            
            if (r.resources) {
                logs.push(">>> RESSOURCES DÉTECTÉES <<<");
                logs.push(`MÉTAL: ${Math.floor(r.resources.metal).toLocaleString()}`);
                logs.push(`CRISTAL: ${Math.floor(r.resources.crystal).toLocaleString()}`);
                logs.push(`DEUTÉRIUM: ${Math.floor(r.resources.deuterium).toLocaleString()}`);
            } else {
                logs.push(">>> RESSOURCES: INCONNU (Tech trop faible)");
            }

            if (r.fleet) {
                logs.push(">>> FLOTTE STATIONNÉE <<<");
                logs.push(`Chasseurs: ${r.fleet.light_hunter}`);
                logs.push(`Croiseurs: ${r.fleet.cruiser}`);
                logs.push(`Recycleurs: ${r.fleet.recycler}`);
            } else if (r.detection_level === 'resources') {
                 logs.push(">>> FLOTTE: INCONNU (Tech insuffisante)");
            }

            if (r.defense !== null && r.defense !== undefined) {
                 logs.push(">>> DÉFENSES <<<");
                 logs.push(`Batteries Laser: Niv. ${r.defense}`);
            }

            const formattedReport: CombatReport = {
                winner: 'player', 
                log: logs,
                loot: 0,
                losses: { light_hunter: 0, cruiser: 0 } 
            };
            
            setCombatReport(formattedReport);
            setShowCombatModal(true);
            
            fetchPlanet(); 
        } else {
            setReport(`ÉCHEC ESPIONNAGE : ${data.error}`);
            setTimeout(() => setReport(null), 4000);
        }
    } catch (e) {
        console.error(e);
        setReport("ERREUR SYSTEME ESPIONNAGE");
    }
  };

  // --- EFFETS ---
  useEffect(() => {
    fetch('http://localhost:8080/config')
      .then(res => res.json())
      .then(data => {
          console.log("Vitesse du jeu synchronisée:", data.speed_factor);
          setSpeedFactor(data.speed_factor);
      })
      .catch(err => console.error("Impossible de sync la vitesse", err));

    if (token && planetId) {
      fetchPlanet();
      const interval = setInterval(fetchPlanet, 2000);
      return () => clearInterval(interval);
    }
  }, [token, planetId, fetchPlanet]);

  // --- RENDU ---
  
  if (!token || !planetId) {
    return <Login onLogin={(t, p) => { 
        localStorage.setItem('token', t); 
        localStorage.setItem('planet_id', p);
        setToken(t); 
        setPlanetId(p); 
    }} />;
  }

  if (!planet) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-cyan-400 font-mono animate-pulse">
      INITIALISATION DU LIEN NEURAL...
    </div>
  );

  // Configuration du Menu Sidebar
  const MENU_ITEMS = [
    { id: 'overview', label: 'Vue Générale', icon: LayoutDashboard, category: 'COMMANDEMENT' },
    { id: 'galaxy', label: 'Galaxie', icon: Globe, category: 'COMMANDEMENT' },
    { id: 'resources', label: 'Mines', icon: Pickaxe, category: 'DÉVELOPPEMENT' },
    { id: 'tech', label: 'Laboratoire', icon: FlaskConical, category: 'DÉVELOPPEMENT' },
    { id: 'fleet', label: 'Chantier Spatial', icon: Hammer, category: 'MILITAIRE' },
    { id: 'defenses', label: 'Défense', icon: ShieldCheck, category: 'MILITAIRE' },
    { id: 'expedition', label: 'Expéditions', icon: Telescope, category: 'MILITAIRE' },
    { id: 'ranking', label: 'Classement', icon: Trophy, category: 'DONNÉES' },
    { id: 'reports', label: 'Rapports', icon: ScrollText, category: 'DONNÉES' },
  ] as const;

  return (
    <div className="h-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col">
      {/* 1. FOND D'ÉCRAN */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay bg-cover bg-center fixed"
        style={{ backgroundImage: "url('/assets/background.png')" }}
      ></div>

      {/* 2. MODALES (Au-dessus de tout) */}
      <div className="relative z-50">
        {showCombatModal && combatReport && (
            <CombatModal report={combatReport} onClose={() => setShowCombatModal(false)} />
        )}
        {targetPlanet && planet && (
            <AttackModal 
                targetName={targetPlanet.name}
                myFleet={{ hunters: planet.light_hunter_count, cruisers: planet.cruiser_count }}
                onConfirm={handleConfirmAttack}
                onCancel={() => setTargetPlanet(null)}
            />
        )}
        {report && (
          <div className="fixed bottom-10 right-10 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="bg-indigo-600/90 backdrop-blur text-white px-6 py-3 rounded-xl border border-indigo-400 shadow-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3">
              <BellRing className="animate-bounce" size={16} />
              {report}
            </div>
          </div>
        )}
      </div>

      {/* 3. BARRE DU HAUT (EmpireBar) */}
      <div className="relative z-40 shrink-0">
        <EmpireBar planet={planet} />
      </div>

      {/* 4. LAYOUT PRINCIPAL (Sidebar + Contenu) */}
      <div className="flex flex-1 overflow-hidden relative z-30 pt-20">
        
        {/* --- SIDEBAR (Navigation) --- */}
        <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col h-full overflow-y-auto hidden md:flex">
            <div className="p-4 space-y-6">
                {['COMMANDEMENT', 'DÉVELOPPEMENT', 'MILITAIRE', 'DONNÉES'].map(cat => (
                    <div key={cat} className="space-y-2">
                        <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] pl-3">
                            {cat}
                        </h3>
                        <div className="space-y-1">
                            {MENU_ITEMS.filter(item => item.category === cat).map(item => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id as any)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                            isActive 
                                            ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/50' 
                                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <Icon size={16} className={isActive ? "text-white" : "text-slate-500"} />
                                        {item.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bouton Quitter en bas */}
            <div className="mt-auto p-4 border-t border-white/5">
                <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-3 rounded-lg text-xs font-black uppercase transition-colors"
                >
                    <LogOut size={16}/> Déconnexion
                </button>
            </div>
        </aside>

        {/* --- ZONE DE CONTENU PRINCIPAL --- */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-10 scrollbar-thin scrollbar-thumb-indigo-900 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
                {activeTab === 'overview' && <PlanetOverview planet={planet} speedFactor={speedFactor} />}
                {activeTab === 'galaxy' && <GalaxyView planet={planet} onNavigateAttack={handlePrepareAttack} onNavigateSpy={handleSpy} />}
                {activeTab === 'resources' && <ResourceDisplay planet={planet} onUpgrade={fetchPlanet} />}
                {activeTab === 'fleet' && <Shipyard planet={planet} onBuild={fetchPlanet} />}
                {activeTab === 'defenses' && <Defenses planet={planet} onBuild={fetchPlanet} />}
                {activeTab === 'tech' && <TechTree planet={planet} onUpdate={fetchPlanet} />}
                {activeTab === 'expedition' && <ExpeditionZone planet={planet} onAction={launchExpedition} />}
                {activeTab === 'ranking' && <Leaderboard currentPlanetId={planet.id} onAttack={handlePrepareAttack} onSpy={handleSpy} />}
                {activeTab === 'reports' && <ReportsTerminal planetId={planet.id} />}
            </div>
        </main>

        {/* Navigation Mobile (Optionnelle, si besoin pour petits écrans) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 border-t border-white/10 p-4 flex justify-between overflow-x-auto gap-4 z-50">
             {/* Tu pourras ajouter une version simplifiée ici pour le mobile */}
        </nav>

      </div>
    </div>
  );
}
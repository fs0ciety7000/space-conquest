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
import { LogOut, BellRing } from "lucide-react";

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
const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'fleet' | 'defenses' | 'tech' | 'expedition' | 'ranking' | 'reports'>('resources');
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
      console.error("Liaison perdue avec le centre de commande");
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

  // NOUVEAU : GESTION ESPIONNAGE
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
            
            // Formatage du rapport pour la modale
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
                winner: 'player', // Vert car c'est un rapport "réussi"
                log: logs,
                loot: 0,
                losses: { light_hunter: 0, cruiser: 0 } // On ne compte pas la sonde perdue ici
            };
            
            setCombatReport(formattedReport);
            setShowCombatModal(true);
            
            fetchPlanet(); // Mettre à jour le nombre de sondes
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

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 p-6 selection:bg-cyan-500/30 relative overflow-hidden font-sans">
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay bg-cover bg-center fixed"
        style={{ backgroundImage: "url('/assets/background.png')" }}
      ></div>

      <div className="relative z-10">
        <EmpireBar planet={planet} />

        {showCombatModal && combatReport && (
            <CombatModal 
                report={combatReport} 
                onClose={() => setShowCombatModal(false)} 
            />
        )}

        {targetPlanet && planet && (
            <AttackModal 
                targetName={targetPlanet.name}
                myFleet={{
                    hunters: planet.light_hunter_count,
                    cruisers: planet.cruiser_count
                }}
                onConfirm={handleConfirmAttack}
                onCancel={() => setTargetPlanet(null)}
            />
        )}

        {report && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="bg-indigo-600/90 backdrop-blur text-white px-8 py-4 rounded-2xl border-2 border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.4)] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-4">
              <BellRing className="animate-bounce" size={18} />
              {report}
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          <nav className="flex items-center justify-between border-b border-white/5 pb-4 text-white">
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {(['overview', 'resources', 'fleet', 'defenses', 'tech', 'expedition', 'ranking', 'reports'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === tab 
                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {/* LABELS */}
                  {tab === 'overview' ? 'Vue Générale' 
                   : tab === 'resources' ? 'Mines' // J'ai renommé 'Économie' en 'Mines' pour distinguer de la vue générale
                   : tab === 'fleet' ? 'Chantier Spatial' 
                   : tab === 'defenses' ? 'Défense'
                   : tab === 'tech' ? 'Laboratoire' 
                   : tab === 'expedition' ? 'Expéditions' 
                   : tab === 'ranking' ? 'Classement'
                   : 'Rapports'}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-500 text-[10px] font-black uppercase transition-colors ml-4">
              <LogOut size={14}/> <span className="hidden md:inline">Quitter</span>
            </button>
          </nav>

         <main className="animate-in fade-in duration-500">
            {/* 4. AFFICHAGE */}
            {activeTab === 'overview' && <PlanetOverview planet={planet} speedFactor={speedFactor} />}
            
            {activeTab === 'resources' && <ResourceDisplay planet={planet} onUpgrade={fetchPlanet} />}
            {activeTab === 'fleet' && <Shipyard planet={planet} onBuild={fetchPlanet} />}
            {activeTab === 'defenses' && <Defenses planet={planet} onBuild={fetchPlanet} />}
            {activeTab === 'tech' && <TechTree planet={planet} onUpdate={fetchPlanet} />}
            {activeTab === 'expedition' && <ExpeditionZone planet={planet} onAction={launchExpedition} />}
            {activeTab === 'ranking' && <Leaderboard currentPlanetId={planet.id} onAttack={handlePrepareAttack} onSpy={handleSpy} />}
            {activeTab === 'reports' && <ReportsTerminal planetId={planet.id} />}
        </main>
        </div>
      </div>
    </div>
  );
}
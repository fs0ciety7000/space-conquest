import { useEffect, useState, useCallback, useRef } from 'react';
import ResourceDisplay from './components/ResourceDisplay';
import Facilities from './components/Facilities';
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
import Settings from './components/Settings';
import MessagesView from './components/MessagesView';
import TransportModal from './components/TransportModal';
import SpyModal from './components/SpyModal';
import { apiUrl } from '@/config/api';
import { Toaster, toast } from "sonner";
import { 
  LogOut, LayoutDashboard, Pickaxe, Hammer, 
  ShieldCheck, FlaskConical, Telescope, Trophy, ScrollText, Globe, Truck,
  Settings as SettingsIcon, Mail, Factory, Rocket, X
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

type TabType = 'overview' | 'galaxy' | 'resources' | 'facilities' | 'shipyard' | 'defenses' | 'tech' | 'expedition' | 'ranking' | 'reports' | 'settings' | 'messages';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [planetId, setPlanetId] = useState<string | null>(localStorage.getItem('planet_id'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('user_id'));
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [speedFactor, setSpeedFactor] = useState<number>(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [messageRecipient, setMessageRecipient] = useState<string | null>(null);

  const [planet, setPlanet] = useState<any>(null);
  const [combatReport, setCombatReport] = useState<CombatReport | null>(null);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [targetPlanet, setTargetPlanet] = useState<{id: string, name: string} | null>(null);
  const [transportTarget, setTransportTarget] = useState<{id: string, name: string, system: number} | null>(null);
  const [spyReport, setSpyReport] = useState<any>(null);
  const prevPlanetRef = useRef<any>(null);
  const processingReportRef = useRef(false);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const prevUnreadCountRef = useRef<number | null>(null); 

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setPlanetId(null);
    setUserId(null);
    setPlanet(null);
  };

  const switchPlanet = (newId: string) => {
    setPlanetId(newId);
    localStorage.setItem('planet_id', newId);
  };

  const handleOpenMessage = (username: string) => {
      setMessageRecipient(username);
      setActiveTab('messages');
      setSidebarOpen(false);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const fetchPlanet = useCallback(async () => {
    if (!planetId || !token) return;
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        
        const newUnreadCount = data.unread_messages || 0;
        if (prevUnreadCountRef.current !== null && newUnreadCount > prevUnreadCountRef.current) {
            toast.info("Nouvelle transmission reçue !", {
                description: "Ouvrez la messagerie pour décrypter.",
                icon: <Mail className="text-indigo-400" />,
                action: { label: "Lire", onClick: () => setActiveTab('messages') },
                duration: 5000,
            });
        }
        setUnreadMessagesCount(newUnreadCount);
        prevUnreadCountRef.current = newUnreadCount;

        if (data.unread_report && !processingReportRef.current) {
            processingReportRef.current = true;
            try {
                const reportData = JSON.parse(data.unread_report);
                
                if (reportData.type === 'transport_arrival') {
                     toast.success(`Cargaison reçue de : ${reportData.sender_name}`, { 
                        description: `Livraison: M:${Math.floor(reportData.metal)} C:${Math.floor(reportData.crystal)} D:${Math.floor(reportData.deuterium)}`,
                        icon: <Truck className="h-5 w-5 text-green-500" />,
                    });
                } else {
                    const isVictory = reportData.winner === 'defender'; 
                    if(!isVictory && reportData.is_defense) {
                         toast.error("ALERTE : Base Attaquée !", { description: "Consultez le rapport." });
                    }
                    
                    setCombatReport({
                        ...reportData,
                        winner: reportData.winner || (isVictory ? 'player' : 'enemy'), 
                    });
                    
                    setShowCombatModal(true);
                }
                await fetch(apiUrl(`/planets/${planetId}/clear-report`), {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) { console.error(err); } 
            finally { processingReportRef.current = false; }
        }
        
        if (prevPlanetRef.current?.construction_end && !data.construction_end) toast.info("Bâtiment terminé");
        if (prevPlanetRef.current?.shipyard_construction_end && !data.shipyard_construction_end) toast.info("Flotte assemblée");

        setPlanet(data);
        prevPlanetRef.current = data;
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) { console.error(e); }
  }, [planetId, token]);

  const launchExpedition = async () => {
    if (!planetId || !token) return;
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/expedition`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlanet(data.planet); 
        setCombatReport(data.report);
        setShowCombatModal(true);
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur expédition");
      }
    } catch (e) { toast.error("Erreur réseau"); }
  };

  const handlePrepareAttack = (id: string, name: string) => setTargetPlanet({id, name});

  const handlePrepareTransport = (id: string, name: string, system: number) => {
      setTransportTarget({id, name, system});
  };

  const handleSpy = async (targetId: string) => {
    try {
        const res = await fetch(apiUrl(`/spy?current_planet_id=${planetId}`), {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_planet_id: targetId })
        });
        const data = await res.json();
        if(res.ok) {
          setSpyReport(data.report);
          fetchPlanet();
      } else { 
          toast.error(data.error || "Échec de l'espionnage"); 
      }
    } catch(e) { toast.error("Erreur réseau"); }
  };

  const handleConfirmAttack = async (hunters: number, cruisers: number) => {
    if (!planetId || !targetPlanet) return;

    try {
        const res = await fetch(apiUrl(`/attack?current_planet_id=${planetId}`), {
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
            toast.success("ORDRE D'ATTAQUE CONFIRMÉ", {
                description: `Votre flotte atteindra la cible vers ${new Date(data.arrival).toLocaleTimeString()}`,
                icon: <Rocket className="text-red-500" />
            });
            setTargetPlanet(null);
            fetchPlanet();
        } else {
            toast.error(data.error || "Le haut commandement a annulé l'opération");
        }
    } catch (e) {
        toast.error("Échec de la liaison avec la flotte");
    }
  };

  useEffect(() => {
    fetch('/config').then(res => res.json()).then(d => setSpeedFactor(d.speed_factor))
      .catch(console.error);
    if (token && planetId) {
      fetchPlanet();
      const interval = setInterval(fetchPlanet, 2000);
      return () => clearInterval(interval);
    }
  }, [token, planetId, fetchPlanet]);
  
  if (!token || !planetId || !userId) {
    return <Login onLogin={(t, p, u) => { 
        localStorage.setItem('token', t); 
        localStorage.setItem('planet_id', p);
        localStorage.setItem('user_id', u);
        setToken(t); 
        setPlanetId(p); 
        setUserId(u);
    }} />;
  }

  if (!planet) return <div className="min-h-screen bg-black text-cyan-500 flex items-center justify-center font-mono animate-pulse">CONNEXION AU RÉSEAU NEURAL...</div>;

  const MENU_ITEMS = [
    { id: 'overview', label: 'Vue Générale', icon: LayoutDashboard, category: 'COMMANDEMENT' },
    { id: 'galaxy', label: 'Galaxie', icon: Globe, category: 'COMMANDEMENT' },
    { id: 'messages', label: 'Messagerie', icon: Mail, category: 'COMMUNICATION' },
    
    { id: 'resources', label: 'Ressources', icon: Pickaxe, category: 'DÉVELOPPEMENT' },
    { id: 'facilities', label: 'Installations', icon: Factory, category: 'DÉVELOPPEMENT' }, 
    { id: 'tech', label: 'Laboratoire', icon: FlaskConical, category: 'DÉVELOPPEMENT' },
    
    { id: 'shipyard', label: 'Chantier Spatial', icon: Hammer, category: 'MILITAIRE' },
    { id: 'defenses', label: 'Défense', icon: ShieldCheck, category: 'MILITAIRE' },
    { id: 'expedition', label: 'Expéditions', icon: Telescope, category: 'MILITAIRE' },
    
    { id: 'ranking', label: 'Classement', icon: Trophy, category: 'DONNÉES' },
    { id: 'reports', label: 'Rapports', icon: ScrollText, category: 'DONNÉES' },
    { id: 'settings', label: 'Paramètres', icon: SettingsIcon, category: 'SYSTÈME' },
  ] as const;

  return (
    <div className="h-screen w-full bg-slate-950 text-white font-sans overflow-hidden flex flex-col relative">
       <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 pointer-events-none" style={{ backgroundImage: "url('/assets/background.png')" }}></div>
       <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/80 to-slate-900/80 pointer-events-none"></div>

      <div className="relative z-50">
        {showCombatModal && combatReport && <CombatModal report={combatReport} onClose={() => setShowCombatModal(false)} />}
        {targetPlanet && <AttackModal targetName={targetPlanet.name} myFleet={{ hunters: planet.light_hunter_count, cruisers: planet.cruiser_count }} onConfirm={handleConfirmAttack} onCancel={() => setTargetPlanet(null)} />}
     
        {transportTarget && (
            <TransportModal 
                currentPlanet={planet} 
                targetPlanet={transportTarget} 
                onClose={() => setTransportTarget(null)} 
                onConfirm={() => {
                    fetchPlanet(); 
                    setTransportTarget(null);
                }} 
            />
        )}
     
        {spyReport && (
          <SpyModal 
              report={spyReport} 
              onClose={() => setSpyReport(null)} 
          />
        )}
      </div>

      <div className="absolute top-0 left-0 w-full z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md shadow-lg">
          <EmpireBar 
            planet={planet} 
            onSwitchPlanet={switchPlanet} 
            unreadMessages={unreadMessagesCount} 
            onOpenMessages={() => { setActiveTab('messages'); setSidebarOpen(false); }}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
      </div>

      <div className="flex flex-1 w-full h-full overflow-hidden relative z-30 pt-[60px] md:pt-[72px]">
        {/* Sidebar Desktop */}
        <aside className="w-64 bg-slate-950/90 backdrop-blur-xl border-r border-white/5 flex-col h-full overflow-y-auto hidden md:flex scrollbar-thin scrollbar-thumb-slate-800">
             <div className="p-4 space-y-8 mt-4">
                {['COMMANDEMENT', 'COMMUNICATION', 'DÉVELOPPEMENT', 'MILITAIRE', 'DONNÉES', 'SYSTÈME'].map(cat => (
                    <div key={cat} className="space-y-2">
                        <h3 className="text-[10px] font-black text-indigo-500/50 uppercase tracking-[0.2em] pl-3 border-l-2 border-indigo-500/20">{cat}</h3>
                        <div className="space-y-0.5">
                            {MENU_ITEMS.filter(item => item.category === cat).map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => handleTabChange(item.id as any)} 
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase transition-all duration-200 group relative overflow-hidden ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <item.icon size={16} className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} /> 
                                    <span className="relative z-10">{item.label}</span>
                                    {activeTab === item.id && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-white/10 to-indigo-500/0 opacity-20 animate-shimmer"></div>}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
             <div className="mt-auto p-4 border-t border-white/5">
                 <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors text-xs font-bold uppercase border border-red-900/20">
                     <LogOut size={16}/> Déconnexion
                 </button>
             </div>
        </aside>

        {/* Sidebar Mobile */}
        {sidebarOpen && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Drawer */}
            <aside className="fixed top-[60px] left-0 h-[calc(100vh-60px)] w-72 bg-slate-950/95 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-y-auto z-50 md:hidden shadow-2xl animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Menu</h2>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="p-4 space-y-6 mt-2">
                {['COMMANDEMENT', 'COMMUNICATION', 'DÉVELOPPEMENT', 'MILITAIRE', 'DONNÉES', 'SYSTÈME'].map(cat => (
                    <div key={cat} className="space-y-2">
                        <h3 className="text-[10px] font-black text-indigo-500/50 uppercase tracking-[0.2em] pl-3 border-l-2 border-indigo-500/20">{cat}</h3>
                        <div className="space-y-1">
                            {MENU_ITEMS.filter(item => item.category === cat).map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => handleTabChange(item.id as any)} 
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10'}`}
                                >
                                    <item.icon size={18} /> 
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
              </div>

              <div className="mt-auto p-4 border-t border-white/5">
                 <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors text-sm font-bold uppercase border border-red-900/20">
                     <LogOut size={18}/> Déconnexion
                 </button>
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-8 scrollbar-thin scrollbar-thumb-indigo-900/50 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto pb-4 md:pb-0 min-h-full">
                <div className="animate-in fade-in zoom-in-95 duration-300">
                    {activeTab === 'overview' && <PlanetOverview planet={planet} speedFactor={speedFactor} />}
                    {activeTab === 'galaxy' && <GalaxyView planet={planet} onNavigateAttack={handlePrepareAttack} onNavigateSpy={handleSpy} onNavigateTransport={handlePrepareTransport} />}
                    {activeTab === 'messages' && <MessagesView token={token!} userId={userId!} initialRecipient={messageRecipient} />}
                    {activeTab === 'ranking' && <Leaderboard currentPlanetId={planet.id} onAttack={handlePrepareAttack} onSpy={handleSpy} onSendMessage={handleOpenMessage} />}
                    
                    {activeTab === 'resources' && <ResourceDisplay planet={planet} onUpgrade={fetchPlanet} />}
                    {activeTab === 'facilities' && <Facilities planet={planet} onUpgrade={fetchPlanet} />} 
                    {activeTab === 'tech' && <TechTree planet={planet} onUpdate={fetchPlanet} />}
                    
                    {activeTab === 'shipyard' && <Shipyard planet={planet} onUpdate={fetchPlanet} />}
                    {activeTab === 'defenses' && <Defenses planet={planet} onBuild={fetchPlanet} />}
                    {activeTab === 'expedition' && <ExpeditionZone planet={planet} onAction={launchExpedition} />}
                    
                    {activeTab === 'reports' && <ReportsTerminal planetId={planet.id} />}
                    {activeTab === 'settings' && <Settings planet={planet} onUpdate={fetchPlanet} onLogout={handleLogout} />}
                </div>
            </div>
        </main>
      </div>
      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  );
}
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
import AdminPanel from './components/AdminPanel';
import TransportModal from './components/TransportModal';
import SpyModal from './components/SpyModal';
import Marketplace from './components/Marketplace';
import { FloatingResourceGain, useResourceGainAnimation } from './components/FloatingResourceGain';
import { useKeyboardShortcuts, useShortcutFeedback, ShortcutsHelpModal } from './hooks/useKeyboardShortcuts';
import { useSoundEffects, AudioUnlockPrompt } from './hooks/useSoundEffects';
import { BuildQueue } from './components/BuildQueue';
import Tutorial, { useTutorial } from './components/Tutorial';
import { apiUrl } from '@/config/api';
import { Toaster, toast } from "sonner";
import {
  LogOut, LayoutDashboard, Pickaxe, Hammer,
  ShieldCheck, FlaskConical, Telescope, Trophy, ScrollText, Globe, Truck,
  Settings as SettingsIcon, Mail, Factory, Rocket, X, Keyboard, Database, ShoppingCart
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

type TabType = 'overview' | 'galaxy' | 'resources' | 'facilities' | 'shipyard' | 'defenses' | 'tech' | 'expedition' | 'ranking' | 'reports' | 'settings' | 'messages' | 'market' | 'admin';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [planetId, setPlanetId] = useState<string | null>(localStorage.getItem('planet_id'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('user_id'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [speedFactor, setSpeedFactor] = useState<number>(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
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

  // État audio
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved ? JSON.parse(saved) : false;
  });

  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('musicVolume');
    return saved ? parseFloat(saved) : 0.3;
  });

  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem('sfxVolume');
    return saved ? parseFloat(saved) : 0.5;
  });

  // Animations flottantes de ressources
  const { gains, handleAnimationEnd } = useResourceGainAnimation(planet);

  // Effets sonores
  const { playSound, startMusic } = useSoundEffects({
    enabled: soundEnabled,
    musicVolume,
    sfxVolume
  });

  // Fonctions définies AVANT les hooks qui les utilisent
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    playSound('click');
  }, [playSound]);

  // Maintenant on peut utiliser les hooks qui dépendent de handleTabChange
  useKeyboardShortcuts(handleTabChange, true);
  useShortcutFeedback();

  // Tutorial
  const { showTutorial, startTutorial, completeTutorial } = useTutorial();

  // Listener pour afficher l'aide raccourcis
  useEffect(() => {
    const handleShowHelp = () => setShowShortcutsHelp(true);
    window.addEventListener('show-shortcuts-help', handleShowHelp);
    return () => window.removeEventListener('show-shortcuts-help', handleShowHelp);
  }, []);

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('soundEnabled', JSON.stringify(enabled));
    if (enabled) {
      toast.success("🔊 Audio activé", {
        description: "Musique d'ambiance spatiale lancée"
      });
    } else {
      toast.info("🔇 Audio désactivé");
    }
  };

  const handleVolumeChange = (type: 'music' | 'sfx', value: number) => {
    if (type === 'music') {
      setMusicVolume(value);
      localStorage.setItem('musicVolume', value.toString());
    } else {
      setSfxVolume(value);
      localStorage.setItem('sfxVolume', value.toString());
    }
  };

  const handleStartTutorial = () => {
    startTutorial();
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setPlanetId(null);
    setUserId(null);
    setUsername(null);
    setPlanet(null);
  };

  const switchPlanet = (newId: string) => {
    setPlanetId(newId);
    localStorage.setItem('planet_id', newId);
    playSound('click');
  };

  const handleOpenMessage = (username: string) => {
      setMessageRecipient(username);
      setActiveTab('messages');
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
        
      // ✅ CORRECTION : Détection des nouveaux messages
        const newUnreadCount = data.unread_messages || 0;
        
        // Comparer avec la valeur précédente
        if (prevUnreadCountRef.current !== null && newUnreadCount > prevUnreadCountRef.current) {
            const newMessagesCount = newUnreadCount - prevUnreadCountRef.current;
            toast.info(`📨 ${newMessagesCount} nouveau${newMessagesCount > 1 ? 'x' : ''} message${newMessagesCount > 1 ? 's' : ''} !`, {
                description: "Cliquez pour ouvrir la messagerie",
                icon: <Mail className="text-indigo-400 animate-pulse" />,
                action: { 
                    label: "Lire", 
                    onClick: () => setActiveTab('messages') 
                },
                duration: 8000,
            });
            playSound('notification');
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
                    playSound('success');
                } else {
                    const isVictory = reportData.winner === 'defender'; 
                    if(!isVictory && reportData.is_defense) {
                         toast.error("ALERTE : Base Attaquée !", { description: "Consultez le rapport." });
                         playSound('combat');
                    } else {
                         playSound(isVictory ? 'success' : 'combat');
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
        
        if (prevPlanetRef.current?.construction_end && !data.construction_end) {
            toast.success("🏭 Bâtiment terminé !", {
                description: "Nouvelle infrastructure opérationnelle"
            });
            playSound('build');
            window.dispatchEvent(new Event('build-complete'));
        }
        if (prevPlanetRef.current?.shipyard_construction_end && !data.shipyard_construction_end) {
            toast.success("🚀 Flotte assemblée !", {
                description: "Nouveaux vaisseaux prêts au combat"
            });
            playSound('build');
            window.dispatchEvent(new Event('build-complete'));
        }

        setPlanet(data);
        prevPlanetRef.current = data;
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) { 
        console.error(e);
        playSound('error');
    }
  }, [planetId, token, playSound]);

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
        playSound('expedition');
        window.dispatchEvent(new Event('attack-launched'));
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur expédition");
        playSound('error');
        window.dispatchEvent(new Event('error-occurred'));
      }
    } catch (e) { 
        toast.error("Erreur réseau"); 
        playSound('error');
        window.dispatchEvent(new Event('error-occurred'));
    }
  };

  const handlePrepareAttack = (id: string, name: string) => {
    setTargetPlanet({id, name});
    playSound('click');
  };

  const handlePrepareTransport = (id: string, name: string, system: number) => {
      setTransportTarget({id, name, system});
      playSound('click');
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
          playSound('success');
      } else { 
          toast.error(data.error || "Échec de l'espionnage"); 
          playSound('error');
      }
    } catch(e) { 
        toast.error("Erreur réseau"); 
        playSound('error');
    }
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
            toast.success("⚔️ ORDRE D'ATTAQUE CONFIRMÉ", {
                description: `Votre flotte atteindra la cible vers ${new Date(data.arrival).toLocaleTimeString()}`,
                icon: <Rocket className="text-red-500" />
            });
            playSound('attack');
            window.dispatchEvent(new Event('attack-launched'));
            setTargetPlanet(null);
            fetchPlanet();
        } else {
            toast.error(data.error || "Le haut commandement a annulé l'opération");
            playSound('error');
            window.dispatchEvent(new Event('error-occurred'));
        }
    } catch (e) {
        toast.error("Échec de la liaison avec la flotte");
        playSound('error');
        window.dispatchEvent(new Event('error-occurred'));
    }
  };

  // Générer la file de construction
  const buildQueueItems = [];
  if (planet?.construction_end) {
    buildQueueItems.push({
      id: 'construction',
      type: 'building' as const,
      name: planet.construction_type || 'Bâtiment',
      endTime: new Date(planet.construction_end).getTime(),
      level: planet.construction_level || 1,
    });
  }
  if (planet?.shipyard_construction_end) {
    buildQueueItems.push({
      id: 'shipyard',
      type: 'ship' as const,
      name: planet.shipyard_construction_type || 'Vaisseau',
      endTime: new Date(planet.shipyard_construction_end).getTime(),
      quantity: planet.shipyard_construction_count || 1,
    });
  }

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
    return <Login onLogin={(t, p, u, user) => { 
        localStorage.setItem('token', t); 
        localStorage.setItem('planet_id', p);
        localStorage.setItem('user_id', u);
        localStorage.setItem('username', user);
        setToken(t); 
        setPlanetId(p); 
        setUserId(u);
        setUsername(user);
        console.log('👤 Utilisateur connecté:', user); // DEBUG
    }} />;
  }

  if (!planet) return <div className="min-h-screen bg-black text-cyan-500 flex items-center justify-center font-mono animate-pulse">CONNEXION AU RÉSEAU NEURAL...</div>;

  // Vérifier si l'utilisateur est admin
  const isAdmin = username === 'phantomhex';
  console.log('🔑 Admin check:', { username, isAdmin }); // DEBUG

  const MENU_ITEMS = [
    { id: 'overview', label: 'Vue Générale', icon: LayoutDashboard, category: 'COMMANDEMENT' },
    { id: 'galaxy', label: 'Galaxie', icon: Globe, category: 'COMMANDEMENT' },
    { id: 'messages', label: 'Messagerie', icon: Mail, category: 'COMMUNICATION' },
    
    { id: 'resources', label: 'Ressources', icon: Pickaxe, category: 'DÉVELOPPEMENT' },
    { id: 'facilities', label: 'Installations', icon: Factory, category: 'DÉVELOPPEMENT' },
    { id: 'tech', label: 'Laboratoire', icon: FlaskConical, category: 'DÉVELOPPEMENT' },
    { id: 'market', label: 'Marché', icon: ShoppingCart, category: 'ÉCONOMIE' },

    { id: 'shipyard', label: 'Chantier Spatial', icon: Hammer, category: 'MILITAIRE' },
    { id: 'defenses', label: 'Défense', icon: ShieldCheck, category: 'MILITAIRE' },
    { id: 'expedition', label: 'Expéditions', icon: Telescope, category: 'MILITAIRE' },
    
    { id: 'ranking', label: 'Classement', icon: Trophy, category: 'DONNÉES' },
    { id: 'reports', label: 'Rapports', icon: ScrollText, category: 'DONNÉES' },
    { id: 'settings', label: 'Paramètres', icon: SettingsIcon, category: 'SYSTÈME' },
    ...(isAdmin ? [{ id: 'admin' as const, label: 'Admin Panel', icon: Database, category: 'SYSTÈME' }] : []),
  ];

  console.log('📝 Menu items:', MENU_ITEMS.map(i => i.id)); // DEBUG

  return (
    <div className="h-screen w-full bg-slate-950 text-white font-sans overflow-hidden flex flex-col relative">
       <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 pointer-events-none" style={{ backgroundImage: "url('/assets/background.png')" }}></div>
       <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/80 to-slate-900/80 pointer-events-none"></div>

      {/* Animations flottantes de ressources */}
      <FloatingResourceGain gains={gains} onAnimationEnd={handleAnimationEnd} />

      {/* Modals */}
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

        {showShortcutsHelp && (
          <ShortcutsHelpModal onClose={() => setShowShortcutsHelp(false)} />
        )}
      </div>

      {/* Prompt audio unlock si bloqué */}
      <AudioUnlockPrompt onUnlock={startMusic} />

      <div data-tour="empire-bar" className="absolute top-0 left-0 w-full z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md shadow-lg">
          <EmpireBar 
            planet={planet} 
            onSwitchPlanet={switchPlanet} 
            unreadMessages={unreadMessagesCount} 
            onOpenMessages={() => { setActiveTab('messages'); setSidebarOpen(false); }}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onNavigateToGalaxy={() => { setActiveTab('galaxy'); setSidebarOpen(false); }}
            onNavigateToOverview={() => { setActiveTab('overview'); setSidebarOpen(false); }}
            speedFactor={speedFactor}
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
                                    data-tour={item.id}
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

             {/* Bouton aide raccourcis */}
             <div className="px-4 pb-3">
                <button 
                  onClick={() => setShowShortcutsHelp(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-950/30 text-indigo-400 hover:bg-indigo-900/40 hover:text-indigo-300 transition-colors text-xs font-bold uppercase border border-indigo-900/30"
                >
                  <Keyboard size={16}/> Raccourcis (?)
                </button>
             </div>

             <div className="p-4 border-t border-white/5">
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
        data-tour={item.id}
        onClick={() => handleTabChange(item.id as any)} 
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase transition-all duration-200 group relative overflow-hidden ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
        <div className="relative">
            <item.icon size={16} className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            
            {/* ✅ AJOUT : Badge avec pulse si messages non lus */}
            {item.id === 'messages' && unreadMessagesCount > 0 && (
                <>
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                </>
            )}
        </div>
        
        <span className="relative z-10 flex-1 text-left">{item.label}</span>
        
        {/* ✅ Badge avec le nombre de messages */}
        {item.id === 'messages' && unreadMessagesCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {unreadMessagesCount}
            </span>
        )}
        
        {activeTab === item.id && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-white/10 to-indigo-500/0 opacity-20 animate-shimmer"></div>}
    </button>
))}
                        </div>
                    </div>
                ))}
              </div>

              <div className="mt-auto p-4 space-y-3 border-t border-white/5">
                 <button 
                   onClick={() => { setShowShortcutsHelp(true); setSidebarOpen(false); }}
                   className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-950/30 text-indigo-400 hover:bg-indigo-900/40 transition-colors text-sm font-bold uppercase border border-indigo-900/30"
                 >
                   <Keyboard size={18}/> Raccourcis
                 </button>
                 <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors text-sm font-bold uppercase border border-red-900/20">
                     <LogOut size={18}/> Déconnexion
                 </button>
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-8 scrollbar-thin scrollbar-thumb-indigo-900/50 scrollbar-track-transparent">
            {/* BuildQueue en haut si actif */}
            {buildQueueItems.length > 0 && (
              <div className="max-w-7xl mx-auto mb-6">
                <BuildQueue items={buildQueueItems} />
              </div>
            )}

            <div className="max-w-7xl mx-auto pb-4 md:pb-0 min-h-full">
                <div className="animate-in fade-in zoom-in-95 duration-300">
                    {activeTab === 'overview' && <PlanetOverview planet={planet} speedFactor={speedFactor} />}
                    {activeTab === 'galaxy' && <GalaxyView planet={planet} onNavigateAttack={handlePrepareAttack} onNavigateSpy={handleSpy} onNavigateTransport={handlePrepareTransport} />}
                    {activeTab === 'messages' && <MessagesView token={token!} userId={userId!} initialRecipient={messageRecipient} />}
                    {activeTab === 'ranking' && <Leaderboard currentPlanetId={planet.id} onAttack={handlePrepareAttack} onSpy={handleSpy} onSendMessage={handleOpenMessage} />}
                    
                    {activeTab === 'resources' && <ResourceDisplay planet={planet} onUpgrade={fetchPlanet} speedFactor={speedFactor} />}
                    {activeTab === 'facilities' && <Facilities planet={planet} onUpgrade={fetchPlanet} />}
                    {activeTab === 'tech' && <TechTree planet={planet} onUpdate={fetchPlanet} />}
                    {activeTab === 'market' && <Marketplace planet={planet} userId={userId!} onUpdate={fetchPlanet} />}

                    {activeTab === 'shipyard' && <Shipyard planet={planet} onUpdate={fetchPlanet} />}
                    {activeTab === 'defenses' && <Defenses planet={planet} onBuild={fetchPlanet} />}
                    {activeTab === 'expedition' && <ExpeditionZone planet={planet} onAction={launchExpedition} />}
                    
                    {activeTab === 'reports' && <ReportsTerminal planetId={planet.id} />}
                    {activeTab === 'settings' && (
                        <Settings 
                            planet={planet} 
                            onUpdate={fetchPlanet} 
                            onLogout={handleLogout} 
                            soundEnabled={soundEnabled}
                            onToggleSound={handleToggleSound}
                            onStartTutorial={handleStartTutorial}
                            musicVolume={musicVolume}
                            sfxVolume={sfxVolume}
                            onVolumeChange={handleVolumeChange}
                        />
                    )}
                    {activeTab === 'admin' && isAdmin && <AdminPanel />}
                </div>
            </div>
        </main>
      </div>

      {/* Tutorial interactif */}
      <Tutorial run={showTutorial} onComplete={completeTutorial} />

      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  );
}
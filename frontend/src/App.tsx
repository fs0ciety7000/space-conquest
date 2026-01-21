import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShipCount } from './utils/techTreeCompat';
import ResourceDisplay from './components/ResourceDisplay';
import Facilities from './components/Facilities';
import Shipyard from './components/Shipyard';
import EmpireBar from './components/EmpireBar';
import AnnouncementBanner from './components/AnnouncementBanner';
import TechTree from './components/TechTree';
import ExpeditionZone from './components/ExpeditionZone';
import ExpeditionZoneV2 from './components/ExpeditionZoneV2';
import CombatModal from './components/CombatModal';
import Login from './components/Login';
import Leaderboard from './components/Leaderboard';
import AttackModalV2 from './components/AttackModalV2';
import ReportsTerminal from './components/ReportsTerminal';
import Defenses from './components/Defenses';
import PlanetOverview from './components/PlanetOverview';
import GalaxyView from './components/GalaxyView';
import Settings from './components/Settings';
import MessagesView from './components/MessagesView';
import AdminPanel from './components/AdminPanel';
import Changelog from './components/Changelog';
import TransportModal from './components/TransportModal';
import SpyModal from './components/SpyModal';
import MyPlanets from './components/MyPlanets';
import Marketplace from './components/Marketplace';
import ProductionStats from './components/ProductionStats';
import AllianceView from './components/AllianceView';
import MissionsView from './components/MissionsView';
import Officers from './components/Officers';
import { SabotagesDashboard } from './components/SabotagesDashboard';
import { SabotagesSufferedDashboard } from './components/SabotagesSufferedDashboard';
import { CasusBelliList } from './components/CasusBelliList';
import { Sidebar, type MenuItem } from './components/Sidebar';
import MaintenancePage from './components/MaintenancePage';
import { FloatingResourceGain, useResourceGainAnimation } from './components/FloatingResourceGain';
import { useKeyboardShortcuts, useShortcutFeedback, ShortcutsHelpModal } from './hooks/useKeyboardShortcuts';
import { useSoundEffects, AudioUnlockPrompt } from './hooks/useSoundEffects';
import { useWebSocket, ConnectionStatus } from './hooks/useWebSocket';
import { BuildQueue } from './components/BuildQueue';
import Tutorial, { useTutorial } from './components/Tutorial';
import { SpaceBackground, SpaceLoader } from './components/ui/space-background';
import { apiUrl } from '@/config/api';
import { Toaster, toast } from "sonner";
import {
  LayoutDashboard, Pickaxe, Hammer,
  ShieldCheck, FlaskConical, Telescope, Trophy, ScrollText, Globe, Truck,
  Settings as SettingsIcon, Mail, Factory, Rocket, X, Database, ShoppingCart, Keyboard, LogOut, MessageSquarePlus, FileText, Activity, Map, Shield, Users, Eye, Swords, ShieldAlert
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

type TabType = 'overview' | 'galaxy' | 'myplanets' | 'resources' | 'facilities' | 'shipyard' | 'defenses' | 'tech' | 'expedition' | 'ranking' | 'reports' | 'settings' | 'messages' | 'market' | 'admin' | 'changelog' | 'stats' | 'alliance' | 'missions' | 'officers';

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

  // Maintenance status
  const [maintenanceStatus, setMaintenanceStatus] = useState<{
    enabled: boolean;
    title: string;
    description: string[];
    estimatedDuration: string;
    startTime: string;
    autoDisableAt?: string;
  } | null>(null);

  const [planet, setPlanet] = useState<any>(null);
  const [combatReport, setCombatReport] = useState<CombatReport | null>(null);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [targetPlanet, setTargetPlanet] = useState<{id: string, name: string} | null>(null);
  const [transportTarget, setTransportTarget] = useState<{id: string, name: string, galaxy: number, system: number, position: number} | null>(null);
  const [spyReport, setSpyReport] = useState<any>(null);
  const [showSabotagesDashboard, setShowSabotagesDashboard] = useState(false);
  const [showSabotagesSufferedDashboard, setShowSabotagesSufferedDashboard] = useState(false);
  const [showCasusBelliList, setShowCasusBelliList] = useState(false);
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

  // WebSocket pour les mises à jour en temps réel
  const { 
    status: wsStatus, 
    isConnected: wsConnected,
    resources: wsResources 
  } = useWebSocket(planetId, {
    enabled: !!token && !!planetId,
    onResourcesUpdate: (resources) => {
      // Mettre à jour les ressources de la planète en temps réel
      if (planet) {
        setPlanet((prev: any) => ({
          ...prev,
          metal_amount: resources.metal,
          crystal_amount: resources.crystal,
          deuterium_amount: resources.deuterium,
          energy_ratio: resources.energy_ratio,
        }));
      }
    },
    onConstructionComplete: (data) => {
      playSound('build');
      fetchPlanet(); // Refresh planet data immediately
    },
    onShipComplete: (data) => {
      playSound('build');
      fetchPlanet(); // Refresh planet data immediately
    },
    onAttackIncoming: (data) => {
      playSound('alert');
    },
    onCombatResult: (data) => {
      playSound(data.result === 'victory' ? 'success' : 'combat');
    },
    onMessageReceived: (data) => {
      playSound('notification');
      setUnreadMessagesCount(prev => prev + 1);
    },
    onTransportArrived: (data) => {
      playSound('success');
    },
    onSpyAlert: (data) => {
      playSound('error');
    },
    onPlanetStatus: (data) => {
      playSound(data.status === 'conquered' ? 'success' : 'error');
    },
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
    // Ne supprimer que les clés d'authentification, pas les préférences utilisateur
    localStorage.removeItem('token');
    localStorage.removeItem('planet_id');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
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

  const fetchMaintenanceStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/maintenance/status'));
      if (res.ok) {
        const data = await res.json();
        // Map snake_case from API to camelCase for React
        // Format startTime if it exists and is not empty
        let formattedStartTime = 'Non défini';
        if (data.start_time && data.start_time.trim() !== '') {
          try {
            const startDate = new Date(data.start_time);
            // Format in Europe/Brussels timezone
            formattedStartTime = startDate.toLocaleString('fr-FR', {
              timeZone: 'Europe/Brussels',
              dateStyle: 'short',
              timeStyle: 'medium'
            });
          } catch {
            formattedStartTime = data.start_time;
          }
        }

        setMaintenanceStatus({
          enabled: data.enabled,
          title: data.title,
          description: data.description,
          estimatedDuration: data.estimated_duration || '15-30 minutes',
          startTime: formattedStartTime,
          autoDisableAt: data.auto_disable_at,
        });
      }
    } catch (e) {
      console.error('Failed to fetch maintenance status:', e);
    }
  }, []);

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
                } else if (reportData.type === 'spy_alert') {
                     toast.warning("⚠️ ALERTE SÉCURITÉ", {
                        description: reportData.message || "Votre planète a été espionnée !",
                        duration: 5000,
                    });
                    playSound('error');
                } else if (reportData.type === 'planet_lost') {
                    toast.error("🚨 PLANÈTE PERDUE !", {
                        description: reportData.message || "Une de vos planètes a été conquise !",
                        duration: 10000,
                    });
                    playSound('error');
                    setCombatReport({
                        ...reportData,
                        winner: 'enemy',
                    });
                    setShowCombatModal(true);
                } else if (reportData.type === 'planet_conquered') {
                    toast.success("🎯 CONQUÊTE RÉUSSIE !", {
                        description: reportData.message || "Vous avez conquis une planète !",
                        duration: 10000,
                    });
                    playSound('success');
                    setCombatReport({
                        ...reportData,
                        winner: 'player',
                    });
                    setShowCombatModal(true);
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

  const launchExpedition = async (hunters: number, cruisers: number, recyclers: number) => {
    if (!planetId || !token) return;
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/expedition`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hunters, cruisers, recyclers })
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

  const handlePrepareTransport = (id: string, name: string, galaxy: number, system: number, position: number) => {
      setTransportTarget({id, name, galaxy, system, position});
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
          toast.success("📡 Sonde d'espionnage envoyée", {
            description: "Les données ont été collectées avec succès"
          });
      } else {
          toast.error(data.error || "Échec de l'espionnage");
          playSound('error');
      }
    } catch(e) {
        toast.error("Erreur réseau");
        playSound('error');
    }
  };

  const handleSabotage = async (action: 'disable_mine' | 'steal_tech') => {
    if (!spyReport?.target_planet_id) return;

    try {
        const res = await fetch(apiUrl('/sabotage'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              target_planet_id: spyReport.target_planet_id,
              action_type: action
            })
        });

        const data = await res.json();

        if (res.ok) {
          if (data.detected) {
            // Sabotage détecté
            toast.error("🚨 SABOTAGE DÉTECTÉ !", {
              description: data.message + " La cible peut maintenant vous attaquer sans pénalité.",
              duration: 6000
            });
            playSound('error');
          } else {
            // Sabotage réussi
            const actionLabels = {
              'disable_mine': '⚙️ MINE DÉSACTIVÉE',
              'steal_tech': '📖 TECHNOLOGIE VOLÉE'
            };
            toast.success(actionLabels[action], {
              description: data.message,
              duration: 5000
            });
            playSound('success');
          }

          setSpyReport(null); // Fermer le modal
          fetchPlanet(); // Refresh la planète
        } else {
          toast.error(data.error || "Échec du sabotage");
          playSound('error');
        }
    } catch(e) {
        toast.error("Erreur réseau");
        playSound('error');
    }
  };

  const handleConfirmAttack = async (hunters: number, cruisers: number, transporters: number) => {
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
                cruisers: cruisers,
                transporters: transporters
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

  // Check maintenance status on mount and periodically
  useEffect(() => {
    fetchMaintenanceStatus();
    // Check every 5 seconds for quick response to maintenance mode changes
    const interval = setInterval(fetchMaintenanceStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchMaintenanceStatus]);

  useEffect(() => {
    fetch('/config').then(res => res.json()).then(d => setSpeedFactor(d.speed_factor))
      .catch(console.error);
    if (token && planetId) {
      fetchPlanet();
      // Polling réduit si WebSocket connecté (fallback uniquement)
      // WebSocket = 10s polling, pas de WebSocket = 2s polling
      const pollingInterval = wsConnected ? 10000 : 2000;
      const interval = setInterval(fetchPlanet, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [token, planetId, fetchPlanet, wsConnected]);

  // Show maintenance page if maintenance is enabled
  if (maintenanceStatus?.enabled) {
    return <MaintenancePage message={{
      title: maintenanceStatus.title,
      description: maintenanceStatus.description,
      estimatedDuration: maintenanceStatus.estimatedDuration,
      startTime: maintenanceStatus.startTime,
      status: 'in_progress'
    }} />;
  }

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

  if (!planet) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <SpaceBackground showParticles={false} starCount={50} />
      <SpaceLoader size={60} text="CONNEXION AU RÉSEAU NEURAL..." />
    </div>
  );

  // Vérifier si l'utilisateur est admin
  const isAdmin = username === 'phantomhex';

  const MENU_ITEMS: MenuItem[] = [
    { id: 'overview', label: 'Vue Générale', icon: LayoutDashboard, category: 'COMMANDEMENT' },
    { id: 'galaxy', label: 'Galaxie', icon: Globe, category: 'COMMANDEMENT' },
    { id: 'myplanets', label: 'Mes Planètes', icon: Map, category: 'COMMANDEMENT' },
    { id: 'messages', label: 'Messagerie', icon: Mail, category: 'COMMUNICATION' },
    
    { id: 'resources', label: 'Ressources', icon: Pickaxe, category: 'DÉVELOPPEMENT' },
    { id: 'facilities', label: 'Installations', icon: Factory, category: 'DÉVELOPPEMENT' },
    { id: 'tech', label: 'Laboratoire', icon: FlaskConical, category: 'DÉVELOPPEMENT' },
    { id: 'market', label: 'Marché', icon: ShoppingCart, category: 'ÉCONOMIE' },

    { id: 'shipyard', label: 'Chantier Spatial', icon: Hammer, category: 'MILITAIRE' },
    { id: 'defenses', label: 'Défense', icon: ShieldCheck, category: 'MILITAIRE' },
    { id: 'expedition', label: 'Expéditions', icon: Telescope, category: 'MILITAIRE' },

    { id: 'sabotages', label: 'Mes Sabotages', icon: Eye, category: 'ESPIONNAGE', onClick: () => setShowSabotagesDashboard(true) },
    { id: 'sabotages-suffered', label: 'Sabotages Subis', icon: ShieldAlert, category: 'ESPIONNAGE', onClick: () => setShowSabotagesSufferedDashboard(true) },
    { id: 'casus-belli', label: 'Casus Belli', icon: Swords, category: 'ESPIONNAGE', onClick: () => setShowCasusBelliList(true) },

    { id: 'ranking', label: 'Classement', icon: Trophy, category: 'DONNÉES' },
    { id: 'alliance', label: 'Alliance', icon: Shield, category: 'DONNÉES' },
    { id: 'missions', label: 'Missions', icon: Telescope, category: 'DONNÉES' },
    { id: 'officers', label: 'Officiers', icon: Users, category: 'DONNÉES' },
    { id: 'stats', label: 'Statistiques', icon: Activity, category: 'DONNÉES' },
    { id: 'reports', label: 'Rapports', icon: ScrollText, category: 'DONNÉES' },
    { id: 'changelog', label: 'Changelog', icon: FileText, category: 'SYSTÈME' },
    { id: 'settings', label: 'Paramètres', icon: SettingsIcon, category: 'SYSTÈME' },
    ...(isAdmin ? [{ id: 'admin' as const, label: 'Admin Panel', icon: Database, category: 'SYSTÈME' }] : []),
  ];


  return (
    <div className="h-screen w-full bg-slate-950 text-white font-sans overflow-hidden flex flex-col relative">
       {/* Fond spatial animé */}
       <SpaceBackground 
         showStars={true}
         showNebulae={true}
         showParticles={true}
         showScanLine={false}
         showGrid={true}
         starCount={100}
         particleCount={25}
       />

      {/* Animations flottantes de ressources */}
      <FloatingResourceGain gains={gains} onAnimationEnd={handleAnimationEnd} />

      {/* Modals */}
      <div className="relative z-50">
        {showCombatModal && combatReport && <CombatModal report={combatReport} onClose={() => setShowCombatModal(false)} />}
        {targetPlanet && planetId && (
          <AttackModalV2
            planetId={planetId}
            targetPlanetId={targetPlanet.id}
            targetName={targetPlanet.name}
            onSuccess={() => {
              setTargetPlanet(null);
              fetchPlanet();
            }}
            onCancel={() => setTargetPlanet(null)}
          />
        )}
     
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
              targetPlanetId={spyReport.target_planet_id}
              onSabotage={handleSabotage}
          />
        )}

        {showSabotagesDashboard && token && (
          <SabotagesDashboard
            token={token}
            onClose={() => setShowSabotagesDashboard(false)}
          />
        )}

        {showSabotagesSufferedDashboard && token && (
          <SabotagesSufferedDashboard
            token={token}
            onClose={() => setShowSabotagesSufferedDashboard(false)}
          />
        )}

        {showCasusBelliList && token && (
          <CasusBelliList
            token={token}
            onClose={() => setShowCasusBelliList(false)}
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
            wsStatus={wsStatus}
          />
      </div>

      <div className="flex flex-1 w-full h-full overflow-hidden relative z-30 pt-[60px] md:pt-[72px]">
        {/* Sidebar Desktop */}
        <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-indigo-500/10 flex-col h-full overflow-y-auto hidden md:flex scrollbar-thin scrollbar-thumb-indigo-900/50 scrollbar-track-transparent relative">
          {/* Ligne lumineuse décorative */}
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-cyan-500/20 via-purple-500/10 to-transparent"></div>

          <Sidebar
            menuItems={MENU_ITEMS}
            activeTab={activeTab}
            unreadMessagesCount={unreadMessagesCount}
            onTabChange={handleTabChange}
            onShowShortcuts={() => setShowShortcutsHelp(true)}
            playSound={playSound}
            isMobile={false}
          />

          {/* Boutons supplémentaires */}
          <div className="px-4 pb-3">
            <a
              href="https://scissue.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-purple-950/30 text-purple-400 hover:bg-purple-900/40 hover:text-purple-300 transition-colors text-xs font-bold uppercase border border-purple-900/30"
            >
              <MessageSquarePlus size={16} /> Signaler un problème
            </a>
          </div>

          <div className="p-4 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors text-xs font-bold uppercase border border-red-900/20"
            >
              <LogOut size={16} /> Déconnexion
            </button>
          </div>

          {/* Footer */}
          <div className="mt-auto px-4 pb-4 pt-3 border-t border-white/5">
            <div className="text-center space-y-1.5">
              <p className="text-[10px] text-slate-400">
                Développé avec <span className="text-red-500">❤️</span> par{' '}
                <span className="font-bold text-white">Nicolas Dessenius</span>
              </p>
            </div>
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
              <Sidebar
                menuItems={MENU_ITEMS}
                activeTab={activeTab}
                unreadMessagesCount={unreadMessagesCount}
                onTabChange={handleTabChange}
                onShowShortcuts={() => setShowShortcutsHelp(true)}
                playSound={playSound}
                isMobile={true}
                onClose={() => setSidebarOpen(false)}
              />

              <div className="mt-auto p-4 space-y-3 border-t border-white/5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors text-sm font-bold uppercase border border-red-900/20"
                >
                  <LogOut size={18} /> Déconnexion
                </button>
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-900/50 scrollbar-track-transparent">
            {/* TechTree full screen mode - render outside container */}
            {activeTab === 'tech' ? (
              <div className="h-full w-full">
                <TechTree planet={planet} onUpdate={fetchPlanet} />
              </div>
            ) : (
              <>
                {/* Announcement Banner */}
                <AnnouncementBanner />

                <div className="p-3 md:p-4 lg:p-8">
                  {/* BuildQueue en haut si actif */}
                  {buildQueueItems.length > 0 && (
                    <div className="max-w-7xl mx-auto mb-6">
                      <BuildQueue items={buildQueueItems} />
                    </div>
                  )}

                <div className="max-w-7xl mx-auto pb-4 md:pb-0 min-h-full">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        {activeTab === 'overview' && <PlanetOverview planet={planet} speedFactor={speedFactor} />}
                        {activeTab === 'galaxy' && <GalaxyView planet={planet} onNavigateAttack={handlePrepareAttack} onNavigateSpy={handleSpy} onNavigateTransport={handlePrepareTransport} />}
                        {activeTab === 'myplanets' && <MyPlanets currentPlanetId={planet.id} onSelectPlanet={(id) => { switchPlanet(id); setActiveTab('overview'); }} onNavigateTransport={handlePrepareTransport} />}
                        {activeTab === 'messages' && <MessagesView token={token!} userId={userId!} initialRecipient={messageRecipient} />}
                        {activeTab === 'ranking' && <Leaderboard currentPlanetId={planet.id} onAttack={handlePrepareAttack} onSpy={handleSpy} onSendMessage={handleOpenMessage} />}
                        {activeTab === 'alliance' && <AllianceView userId={userId!} token={token!} onOpenMessage={handleOpenMessage} />}
                        {activeTab === 'missions' && <MissionsView userId={userId!} planetId={planetId!} token={token!} />}
                        {activeTab === 'officers' && <Officers />}
                        {activeTab === 'stats' && <ProductionStats planet={planet} speedFactor={speedFactor} />}

                        {activeTab === 'resources' && <ResourceDisplay planet={planet} onUpgrade={fetchPlanet} speedFactor={speedFactor} />}
                        {activeTab === 'facilities' && <Facilities planet={planet} onUpgrade={fetchPlanet} />}
                        {activeTab === 'market' && <Marketplace planet={planet} userId={userId!} onUpdate={fetchPlanet} />}

                        {activeTab === 'shipyard' && <Shipyard planet={planet} onUpdate={fetchPlanet} />}
                        {activeTab === 'defenses' && <Defenses planet={planet} onBuild={fetchPlanet} />}
                        {activeTab === 'expedition' && <ExpeditionZoneV2 planet={planet} onAction={fetchPlanet} />}

                        {activeTab === 'reports' && <ReportsTerminal planetId={planet.id} />}
                        {activeTab === 'changelog' && <Changelog />}
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
                      </motion.div>
                    </AnimatePresence>
                </div>
              </div>
              </>
            )}
        </main>

        
      </div>

      {/* Tutorial interactif */}
      <Tutorial run={showTutorial} onComplete={completeTutorial} />

      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  );
}
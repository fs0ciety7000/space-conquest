import { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShipCount } from './utils/techTreeCompat';
import ResourceDisplay from './components/ResourceDisplay';
import Facilities from './components/Facilities';
import Shipyard from './components/Shipyard';
import EmpireBar from './components/EmpireBar';
import AnnouncementBanner from './components/AnnouncementBanner';
import ServerEventBanner from './components/ServerEventBanner';
import { useServerEvents } from './hooks/useServerEvents';
import CombatModal from './components/CombatModal';
import Login from './components/Login';
import FleetDispatcher from './components/FleetDispatcher';
import Defenses from './components/Defenses';
import PlanetOverview from './components/PlanetOverview';

// Lazy loaded views
const TechTree = lazy(() => import('./components/TechTree'));
const ExpeditionZoneV2 = lazy(() => import('./components/ExpeditionZoneV2'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const ReportsTerminal = lazy(() => import('./components/ReportsTerminal'));
const GalaxyView = lazy(() => import('./components/GalaxyView'));
const Settings = lazy(() => import('./components/Settings'));
const UniversalProfile = lazy(() => import('./components/UniversalProfile'));
const FriendsView = lazy(() => import('./components/FriendsView'));
const FleetPresetsManager = lazy(() => import('./components/FleetPresetsManager'));
const BountyBoard = lazy(() => import('./components/BountyBoard'));
const FlagshipView = lazy(() => import('./components/FlagshipView'));
const MessagesView = lazy(() => import('./components/MessagesView'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Changelog = lazy(() => import('./components/Changelog'));
const MyPlanets = lazy(() => import('./components/MyPlanets'));
const Marketplace = lazy(() => import('./components/Marketplace'));

const AllianceView = lazy(() => import('./components/AllianceView'));
const MissionsView = lazy(() => import('./components/MissionsView'));
const Officers = lazy(() => import('./components/Officers'));
const TradeRoutesView = lazy(() => import('./components/TradeRoutesView'));
const BuildQueueManager = lazy(() => import('./components/BuildQueueManager'));
const UndergroundMarket = lazy(() => import('./components/UndergroundMarket'));
const StatsPage = lazy(() => import('./components/StatsPage'));
const Achievements = lazy(() => import('./components/Achievements'));
const IntelligenceView = lazy(() => import('./components/IntelligenceView'));
const GovernanceView = lazy(() => import('./components/GovernanceView'));
import PirateExtortionModal from './components/PirateExtortionModal';
import { Sidebar, type MenuItem } from './components/Sidebar';
import SpyModal from './components/SpyModal';
import MaintenancePage from './components/MaintenancePage';
import { FloatingResourceGain, useResourceGainAnimation } from './components/FloatingResourceGain';
import GalacticTicker from './components/GalacticTicker';
import OnboardingTour from './components/OnboardingTour';
import { useKeyboardShortcuts, useShortcutFeedback, ShortcutsHelpModal } from './hooks/useKeyboardShortcuts';
import { useSoundEffects, AudioUnlockPrompt } from './hooks/useSoundEffects';
import { useWebSocket, ConnectionStatus } from './hooks/useWebSocket';
import { BuildQueue } from './components/BuildQueue';
import Tutorial, { useTutorial } from './components/Tutorial';
import { SpaceBackground, SpaceLoader } from './components/ui/space-background';
import { apiUrl } from '@/config/api';
import { Toaster, toast } from "sonner";
import WebSocketOverlay from './components/WebSocketOverlay';
import {
  LayoutDashboard, Pickaxe, Hammer, Loader2,
  ShieldCheck, FlaskConical, Telescope, Trophy, ScrollText, Globe, Truck, Layers,
  Settings as SettingsIcon, Mail, Factory, Rocket, X, Database, ShoppingCart, Keyboard, LogOut, MessageSquarePlus, FileText, Activity, Map, Shield, Users, Eye, Swords, ShieldAlert, UserCircle, Heart, Zap, Crosshair, Star, Skull, Award, Scale
} from "lucide-react";
import { PlanetProvider, usePlanet } from './contexts/PlanetContext';
import { WebSocketProvider, useWebSocketContext } from './contexts/WebSocketContext';
import { useGameNotifications } from './hooks/useGameNotifications';

interface CombatReport {
  winner: string;
  log: string[];
  loot: number;
  losses?: {
    light_hunter: number;
    cruiser: number;
  };
}

type TabType = 'overview' | 'galaxy' | 'myplanets' | 'resources' | 'facilities' | 'shipyard' | 'defenses' | 'tech' | 'expedition' | 'ranking' | 'reports' | 'settings' | 'messages' | 'market' | 'admin' | 'changelog' | 'stats' | 'alliance' | 'missions' | 'officers' | 'profile' | 'friends' | 'fleet-presets' | 'bounties' | 'flagship' | 'trade-routes' | 'build-queue' | 'underground' | 'dashboard' | 'achievements' | 'intelligence' | 'governance';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [planetId, setPlanetId] = useState<string | null>(localStorage.getItem('planet_id'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('user_id'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [userRole, setUserRole] = useState<string>(localStorage.getItem('userRole') || 'user');

  return (
    <PlanetProvider initialPlanetId={planetId} token={token}>
      <WebSocketProvider token={token}>
         <AppContent
           token={token} setToken={setToken}
           planetId={planetId} setPlanetId={setPlanetId}
           userId={userId} setUserId={setUserId}
           username={username} setUsername={setUsername}
           userRole={userRole} setUserRole={setUserRole}
         />
      </WebSocketProvider>
    </PlanetProvider>
  );
}

function AppContent({
  token, setToken,
  planetId, setPlanetId,
  userId, setUserId,
  username, setUsername,
  userRole, setUserRole
}: {
  token: string | null; setToken: (t: string | null) => void;
  planetId: string | null; setPlanetId: (p: string | null) => void;
  userId: string | null; setUserId: (u: string | null) => void;
  username: string | null; setUsername: (u: string | null) => void;
  userRole: string; setUserRole: (r: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [speedFactor, setSpeedFactor] = useState<number>(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const [messageRecipient, setMessageRecipient] = useState<string | null>(null);
  const [initialMessageTab, setInitialMessageTab] = useState<'inbox'|'galactic'|'archived'|'notifications'>('inbox');
  const [reportsInitialView, setReportsInitialView] = useState<'combat'|'transport'|'economy'|'pirates'>('combat');

  const [maintenanceStatus, setMaintenanceStatus] = useState<{
    enabled: boolean;
    title: string;
    description: string[];
    estimatedDuration: string;
    startTime: string;
    autoDisableAt?: string;
  } | null>(null);

  const { planet, setPlanet, fetchPlanet, currentPlanetIdRef, switchPlanet } = usePlanet();
  const { status: wsStatus, isConnected: wsConnected } = useWebSocketContext();
  const { events: serverEvents } = useServerEvents();

  const [combatReport, setCombatReport] = useState<CombatReport | null>(null);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [galaxyTarget, setGalaxyTarget] = useState<{galaxy: number, system: number} | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<{id: string, name: string, galaxy?: number, system?: number, position?: number} | null>(null);
  const [dispatchMission, setDispatchMission] = useState<'attack' | 'spy' | 'transport'>('attack');
  const [spyReport, setSpyReport] = useState<any>(null);
  const prevPlanetRef = useRef<any>(null);
  const processingReportRef = useRef(false);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const prevUnreadCountRef = useRef<number | null>(null);
  const [syndicateCredits, setSyndicateCredits] = useState(0);

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

  // Notifications temps réel avancées (Expansion 3.0)
  useGameNotifications();

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
    // Ne supprimer que les clés d'authentification, pas les préférences utilisateur
    localStorage.removeItem('token');
    localStorage.removeItem('planet_id');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    setToken(null);
    setPlanetId(null);
    setUserId(null);
    setUsername(null);
    setUserRole('user');
    setPlanet(null);
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

  const checkMessageAndReports = useCallback(async () => {
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

        // Discard response if user already switched to a different planet
        if (data.id && data.id !== currentPlanetIdRef.current) return;
        prevPlanetRef.current = data;
      } else if (res.status === 401) {
        handleLogout();
      } else if (res.status === 404) {
        // Planet no longer exists (sold/conquered) — switch to another planet
        const myPlanetsRes = await fetch(apiUrl(`/my-planets`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (myPlanetsRes.ok) {
          const planets = await myPlanetsRes.json();
          if (Array.isArray(planets) && planets.length > 0) {
            const homeworld = planets.find((p: { is_homeworld: boolean; id: string }) => p.is_homeworld) ?? planets[0];
            switchPlanet(homeworld.id); // updates PlanetContext + localStorage + triggers fetchPlanet
            setPlanetId(homeworld.id);  // keeps App's own state in sync
          }
        }
      }
    } catch (e) {
        console.error(e);
    }
  }, [planetId, token, playSound, setPlanetId, switchPlanet]);

  // Handle messages when we hear the event emitted by WebSocketContext
  useEffect(() => {
    const onMessage = () => {
       setUnreadMessagesCount(prev => prev + 1);
       checkMessageAndReports();
    };
    window.addEventListener('new-message-received', onMessage);

    const handleOpenMessageTab = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail) {
            setInitialMessageTab(detail);
            setActiveTab('messages');
        }
    };
    window.addEventListener('open-message-tab', handleOpenMessageTab);

    const handleNavigateTab = (e: Event) => {
      const detail = (e as CustomEvent<string | { tab: string; subTab?: string }>).detail;
      if (!detail) return;
      const tab = typeof detail === 'string' ? detail : detail.tab;
      const subTab = typeof detail === 'object' ? detail.subTab : undefined;
      setActiveTab(tab as TabType);
      setSidebarOpen(false);
      if (tab === 'reports' && subTab) setReportsInitialView(subTab as 'combat'|'transport'|'economy'|'pirates');
    };
    window.addEventListener('navigate-tab', handleNavigateTab);

    return () => {
      window.removeEventListener('new-message-received', onMessage);
      window.removeEventListener('open-message-tab', handleOpenMessageTab);
      window.removeEventListener('navigate-tab', handleNavigateTab);
    };
  }, [checkMessageAndReports]);

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

  const handlePrepareAttack = (id: string, name?: string, galaxy?: number, system?: number, position?: number) => {
    setDispatchTarget({id, name: name || "Cible", galaxy, system, position});
    setDispatchMission('attack');
    playSound('click');
  };

  const handlePrepareTransport = (id: string, name?: string, galaxy?: number, system?: number, position?: number) => {
      setDispatchTarget({id, name: name || "Cible", galaxy, system, position});
      setDispatchMission('transport');
      playSound('click');
  };

  const handlePrepareSpy = (id: string, name?: string, galaxy?: number, system?: number, position?: number) => {
      setDispatchTarget({id, name: name || "Cible", galaxy, system, position});
      setDispatchMission('spy');
      playSound('click');
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
      // Kept for backward compatibility if any other component uses it, otherwise unused.
      console.warn("handleConfirmAttack is deprecated, use FleetDispatcher");
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

  // Fetch syndicate credits from user endpoint
  useEffect(() => {
    if (!userId || !token) return;
    const fetchCredits = async () => {
      try {
        const res = await fetch(apiUrl(`/users/${userId}`), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSyndicateCredits(data.syndicate_credits ?? 0);
          if (data.role && data.role !== userRole) {
            setUserRole(data.role);
            localStorage.setItem('userRole', data.role);
          }
        }
      } catch { /* ignore */ }
    };
    fetchCredits();
    const id = setInterval(fetchCredits, 30_000);
    return () => clearInterval(id);
  }, [userId, token]);

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
      checkMessageAndReports();
      // Polling pour les stats annexes / reports
      const pollingInterval = wsConnected ? 5000 : 1000;
      const interval = setInterval(checkMessageAndReports, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [token, planetId, checkMessageAndReports, wsConnected]);

  // Auto-refresh planète toutes les 60s pour résoudre les missions arrivées (recycleurs, transport, etc.)
  useEffect(() => {
    if (!token || !planetId) return;
    const interval = setInterval(fetchPlanet, 60_000);
    return () => clearInterval(interval);
  }, [token, planetId, fetchPlanet]);

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
    return <Login onLogin={(t, p, u, user, _email, role) => {
        localStorage.setItem('token', t);
        localStorage.setItem('planet_id', p);
        localStorage.setItem('user_id', u);
        localStorage.setItem('username', user);
        const resolvedRole = role || 'user';
        localStorage.setItem('userRole', resolvedRole);
        setToken(t);
        setPlanetId(p);
        setUserId(u);
        setUsername(user);
        setUserRole(resolvedRole);
    }} />;
  }

  if (!planet) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <SpaceBackground showParticles={false} starCount={50} />
      <SpaceLoader size={60} text="CONNEXION AU RÉSEAU NEURAL..." />
    </div>
  );

  // Vérifier si l'utilisateur est admin
  const isAdmin = userRole === 'admin';

  const MENU_ITEMS: MenuItem[] = [
    { id: 'overview', label: 'Vue Générale', icon: LayoutDashboard, category: 'COMMANDEMENT' },
    { id: 'galaxy', label: 'Galaxie', icon: Globe, category: 'COMMANDEMENT' },
    { id: 'myplanets', label: 'Mes Planètes', icon: Map, category: 'COMMANDEMENT' },
    { id: 'messages', label: 'Messagerie', icon: Mail, category: 'COMMUNICATION' },
    { id: 'friends', label: 'Amis', icon: Heart, category: 'COMMUNICATION' },
    
    { id: 'resources', label: 'Ressources', icon: Pickaxe, category: 'DÉVELOPPEMENT' },
    { id: 'facilities', label: 'Installations', icon: Factory, category: 'DÉVELOPPEMENT' },
    { id: 'tech', label: 'Laboratoire', icon: FlaskConical, category: 'DÉVELOPPEMENT' },
    { id: 'market', label: 'Marché', icon: ShoppingCart, category: 'ÉCONOMIE' },
    { id: 'trade-routes', label: 'Routes Commerciales', icon: Truck, category: 'ÉCONOMIE' },
    { id: 'build-queue', label: 'File de Construction', icon: Layers, category: 'ÉCONOMIE' },
    { id: 'underground', label: 'Marché Noir', icon: Skull, category: 'ÉCONOMIE' },

    { id: 'shipyard', label: 'Chantier Spatial', icon: Hammer, category: 'MILITAIRE' },
    { id: 'defenses', label: 'Défense', icon: ShieldCheck, category: 'MILITAIRE' },
    { id: 'expedition', label: 'Expéditions', icon: Telescope, category: 'MILITAIRE' },

    { id: 'intelligence', label: 'Intelligence', icon: ShieldAlert, category: 'ESPIONNAGE' },

    { id: 'ranking', label: 'Classement', icon: Trophy, category: 'DONNÉES' },
    { id: 'alliance', label: 'Alliances', icon: Shield, category: 'DONNÉES' },
    { id: 'achievements', label: 'Succès', icon: Award, category: 'DONNÉES' },
    { id: 'missions', label: 'Missions', icon: Telescope, category: 'DONNÉES' },
    { id: 'governance', label: 'Sénat', icon: Scale, category: 'DONNÉES' },
    { id: 'officers', label: 'Officiers', icon: Users, category: 'DONNÉES' },
    { id: 'stats', label: 'Statistiques', icon: Activity, category: 'DONNÉES' },
    { id: 'reports', label: 'Rapports', icon: ScrollText, category: 'DONNÉES' },
    { id: 'fleet-presets', label: 'Presets de Flotte', icon: Zap, category: 'MILITAIRE' },
    { id: 'bounties', label: 'Tableau des Primes', icon: Crosshair, category: 'MILITAIRE' },
    { id: 'flagship', label: 'Vaisseau Amiral', icon: Star, category: 'MILITAIRE' },
    { id: 'profile', label: 'Mon Profil', icon: UserCircle, category: 'SYSTÈME' },
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
         showParticles={false}
         showScanLine={false}
         showGrid={true}
         starCount={60}
       />

      {/* Tutorial First-Time Onboarding */}
      <OnboardingTour />

      {/* Animations flottantes de ressources */}
      <FloatingResourceGain gains={gains} onAnimationEnd={handleAnimationEnd} />

      {/* Modals */}
      <div className="relative z-50">
        {showCombatModal && combatReport && <CombatModal report={combatReport} onClose={() => setShowCombatModal(false)} onNavigateToGalaxy={(g, s) => { setGalaxyTarget({ galaxy: g, system: s }); setActiveTab('galaxy'); setSidebarOpen(false); }} />}
        {dispatchTarget && planetId && (
          <FleetDispatcher
            planetId={planetId}
            currentPlanet={planet}
            targetPlanet={dispatchTarget}
            initialMission={dispatchMission}
            onClose={() => setDispatchTarget(null)}
            onSpySuccess={(report) => {
                setSpyReport(report);
                setDispatchTarget(null);
                fetchPlanet();
                playSound('success');
            }}
            onActionSuccess={() => {
                setDispatchTarget(null);
                fetchPlanet();
                if (dispatchMission === 'attack') {
                    playSound('attack');
                    window.dispatchEvent(new Event('attack-launched'));
                }
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

        {showShortcutsHelp && (
          <ShortcutsHelpModal onClose={() => setShowShortcutsHelp(false)} />
        )}

        {userId && (
          <PirateExtortionModal
            userId={userId}
            syndicateCredits={syndicateCredits}
            onResolved={() => {
              setSyndicateCredits(c => c); // trigger credits refresh on next poll
              fetchPlanet();
            }}
          />
        )}
      </div>

      {/* Prompt audio unlock si bloqué */}
      <AudioUnlockPrompt onUnlock={startMusic} />

      <div data-tour="empire-bar" className="absolute top-0 left-0 w-full z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md shadow-lg">
          <EmpireBar 
            planet={planet} 
            onSwitchPlanet={switchPlanet} 
            unreadMessages={unreadMessagesCount} 
            onOpenMessages={() => { setActiveTab('messages'); setSidebarOpen(false); setUnreadMessagesCount(0); }}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onNavigateToGalaxy={() => { setActiveTab('galaxy'); setSidebarOpen(false); }}
            onNavigateToOverview={() => { setActiveTab('overview'); setSidebarOpen(false); }}
            speedFactor={speedFactor}
            wsStatus={wsStatus}
          />
      </div>

      <div className="flex flex-1 w-full h-full overflow-hidden relative z-30 main-layout">
        {/* Sidebar Desktop */}
        <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-indigo-500/10 flex-col h-full overflow-y-auto hidden md:flex scrollbar-thin scrollbar-thumb-indigo-900/50 scrollbar-track-transparent relative">
          {/* Ligne lumineuse décorative */}
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-cyan-500/20 via-purple-500/10 to-transparent"></div>

          <Sidebar
            menuItems={MENU_ITEMS}
            activeTab={activeTab}
            unreadMessagesCount={unreadMessagesCount}
            onTabChange={handleTabChange as any}
            onShowShortcuts={() => setShowShortcutsHelp(true)}
            playSound={playSound as any}
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
                onTabChange={handleTabChange as any}
                onShowShortcuts={() => setShowShortcutsHelp(true)}
                playSound={playSound as any}
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
                <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>}>
                  <TechTree planet={planet} onUpdate={fetchPlanet} />
                </Suspense>
              </div>
            ) : (
              <>
                {/* Announcement Banner */}
                <AnnouncementBanner />

                {/* PVE Server Events Banner */}
                <ServerEventBanner
                  events={serverEvents}
                  userId={userId ?? undefined}
                  planetId={planetId ?? undefined}
                />

                <div className="p-3 md:p-4 lg:p-8 overflow-x-hidden">
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
                        <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 size={40} className="animate-spin text-indigo-500/50" /></div>}>

                          {activeTab === 'overview' && <PlanetOverview planet={planet} speedFactor={speedFactor} />}
                          {activeTab === 'galaxy' && <GalaxyView planet={planet} onNavigateAttack={handlePrepareAttack} onNavigateSpy={handlePrepareSpy} onNavigateTransport={handlePrepareTransport} initialGalaxy={galaxyTarget?.galaxy} initialSystem={galaxyTarget?.system} key={galaxyTarget ? `${galaxyTarget.galaxy}-${galaxyTarget.system}` : 'default'} />}
                          {activeTab === 'myplanets' && <MyPlanets currentPlanetId={planet.id} onSelectPlanet={(id) => { switchPlanet(id); setActiveTab('overview'); }} onNavigateTransport={handlePrepareTransport} />}
                          {activeTab === 'messages' && <MessagesView token={token!} userId={userId!} initialRecipient={messageRecipient} initialTab={initialMessageTab} />}
                          {activeTab === 'friends' && <FriendsView userId={userId!} onSendMessage={(u) => { setMessageRecipient(u); setActiveTab('messages'); }} />}
                          {activeTab === 'fleet-presets' && <FleetPresetsManager userId={userId!} planetId={planetId!} />}
                          {activeTab === 'bounties' && planet && <BountyBoard userId={userId!} planetId={planetId!} planet={planet} />}
                          {activeTab === 'flagship' && planet && <FlagshipView userId={userId!} planetId={planetId!} planet={planet} />}
                          {activeTab === 'profile' && <UniversalProfile userId={userId!} />}
                          {activeTab === 'ranking' && <Leaderboard currentPlanetId={planet.id} onAttack={handlePrepareAttack} onSpy={handlePrepareSpy} onTransport={handlePrepareTransport} onSendMessage={handleOpenMessage} />}
                          {activeTab === 'alliance' && <AllianceView userId={userId!} token={token!} onOpenMessage={handleOpenMessage} />}
                          {activeTab === 'achievements' && <Achievements userId={userId!} />}
                          {activeTab === 'missions' && <MissionsView userId={userId!} planetId={planetId!} token={token!} />}
                          {activeTab === 'officers' && <Officers />}
                          {activeTab === 'stats' && <StatsPage planet={planet} userId={userId!} speedFactor={speedFactor} />}

                          {activeTab === 'resources' && <ResourceDisplay planet={planet} onUpgrade={fetchPlanet} speedFactor={speedFactor} />}
                          {activeTab === 'facilities' && <Facilities planet={planet} onUpgrade={fetchPlanet} />}
                          {activeTab === 'market' && <Marketplace planet={planet} userId={userId!} onUpdate={fetchPlanet} />}
                          {activeTab === 'trade-routes' && planet && <TradeRoutesView userId={userId!} planetId={planetId!} planet={planet} />}
                          {activeTab === 'build-queue' && planet && <BuildQueueManager planetId={planetId!} planet={planet} />}
                          {activeTab === 'underground' && planet && <UndergroundMarket planet={planet} userId={userId!} />}

                          {activeTab === 'shipyard' && <Shipyard planet={planet} onUpdate={fetchPlanet} />}
                          {activeTab === 'defenses' && <Defenses planet={planet} onBuild={fetchPlanet} />}
                          {activeTab === 'expedition' && <ExpeditionZoneV2 planet={planet} onAction={fetchPlanet} />}

                          {activeTab === 'intelligence' && planet && token && (
                            <IntelligenceView
                              currentPlanet={planet}
                              userPlanets={[]}
                              token={token}
                              onActionSuccess={fetchPlanet}
                              initialTarget={dispatchMission === 'spy' && dispatchTarget ? { id: dispatchTarget.id, name: dispatchTarget.name, galaxy: dispatchTarget.galaxy, system: dispatchTarget.system, position: dispatchTarget.position } : undefined}
                            />
                          )}
                          {activeTab === 'governance' && token && (
                            <GovernanceView token={token} currentPlanet={planet} />
                          )}
                          {activeTab === 'reports' && <ReportsTerminal planetId={planet.id} initialView={reportsInitialView} />}
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
                        </Suspense>
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

      <WebSocketOverlay status={wsStatus} />
      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  );
}
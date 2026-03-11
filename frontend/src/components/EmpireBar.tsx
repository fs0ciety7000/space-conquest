import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import { useRealtimeResources } from '@/hooks/useRealtimeResources';
import { ConnectionStatus, getConnectionStatusColor, getConnectionStatusText } from '@/hooks/useWebSocket';
import { getBuildingLevel } from '@/utils/techTreeCompat';
import {
  Zap,
  Stone,
  Droplets,
  Gem,
  ChevronDown,
  Mail,
  MapPin,
  Menu,
  Search,
  Wifi,
  WifiOff,
  Crown,
  Coins,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GalaxyMiniMap } from "./GalaxyMiniMap";
import NotificationCenter from "./NotificationCenter";

interface EmpireBarProps {
  planet: any;
  onSwitchPlanet: (id: string) => void;
  unreadMessages?: number;
  onOpenMessages?: () => void;
  onToggleSidebar?: () => void;
  onNavigateToGalaxy?: () => void;
  onNavigateToOverview?: () => void;
  speedFactor?: number;
  wsStatus?: ConnectionStatus;
}

interface PlanetSummary {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  is_current: boolean;
}


export default function EmpireBar({ planet, onSwitchPlanet, unreadMessages = 0, onOpenMessages, onToggleSidebar, onNavigateToGalaxy, onNavigateToOverview, speedFactor = 10, wsStatus = 'disconnected' }: EmpireBarProps) {

  const [myPlanets, setMyPlanets] = useState<PlanetSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [config, setConfig] = useState<any>({
    production_metal_base: 30,
    production_crystal_base: 20,
    production_deuterium_base: 10,
    production_metal_growth: 1.1,
    production_crystal_growth: 1.1,
    production_deuterium_growth: 1.05,
    energy_tech_bonus: 0.10,
    mining_speed_multiplier: 1.0
  });
  const [syndicateCredits, setSyndicateCredits] = useState<number>(0);

  const realtimeResources = useRealtimeResources(planet, speedFactor, config);

  useEffect(() => {
    const fetchOnline = () => {
      fetch(apiUrl('/players/online-count'))
        .then(r => r.json())
        .then(d => setOnlineCount(d.count))
        .catch(() => {});
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(apiUrl('/config'));
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
                  }
      } catch (e) {
        console.error("Erreur chargement config", e);
              }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchMyPlanets = async () => {
      const token = localStorage.getItem('token');
      if (!planet?.id || !token) return;
      try {
        const res = await fetch(apiUrl(`/my-planets?current_planet_id=${planet.id}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMyPlanets(data.planets || data);
        }
      } catch (e) {
        console.error("Erreur chargement planètes", e);
      }
    };
    fetchMyPlanets();
  }, [planet?.id]);

  useEffect(() => {
    if (!planet?.owner_id) return;
    const fetchCredits = async () => {
      try {
        const res = await fetch(apiUrl(`/users/${planet.owner_id}`));
        if (res.ok) {
          const data = await res.json();
          if (typeof data.syndicate_credits === 'number') {
            setSyndicateCredits(data.syndicate_credits);
          }
        }
      } catch { /* ignore */ }
    };
    fetchCredits();
    const id = setInterval(fetchCredits, 30_000);
    return () => clearInterval(id);
  }, [planet?.owner_id]);


  const energyRatio = planet.energy_ratio ?? 100;
  const energyProduction = planet.energy_production ?? 0;
  const energyConsumption = planet.energy_consumption ?? 0;

  const prodMetal = planet.metal_production || 0;
  const prodCrystal = planet.crystal_production || 0;
  const prodDeut = planet.deuterium_production || 0;

  const storageLevel = getBuildingLevel(planet, 'resource_storage');
  const storageCapacity = storageLevel === 0 ? 600000 : Math.floor(600000 * Math.pow(1.6, storageLevel));

  const energyColor = energyRatio < 50 ? '#ef4444' : energyRatio < 100 ? '#f97316' : '#22c55e';

  return (
    <div
      className="flex items-center justify-between px-3 md:px-5 py-2 md:py-2.5 w-full z-50 min-h-[56px] md:h-[64px]"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(2,8,20,0.90) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,245,255,0.12)',
        boxShadow: '0 2px 30px rgba(0,0,0,0.7), 0 1px 0 rgba(0,245,255,0.08)',
      }}
    >

      {/* ── Zone Gauche : Menu + Logo + Planète ── */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 hover:bg-cyan-500/10 rounded transition-all"
            aria-label="Toggle menu"
          >
            <Menu size={18} className="text-cyan-400" />
          </button>
        )}

        {/* Logo */}
        <button
          onClick={onNavigateToOverview}
          className="flex items-center gap-2 hover:bg-cyan-500/5 rounded px-2 py-1 transition-all group"
          title="Retour à l'accueil"
        >
          <img
            src="/logo.svg"
            alt="Space Conquest"
            className="h-7 w-7 md:h-9 md:w-9 drop-shadow-[0_0_8px_rgba(0,245,255,0.4)] group-hover:drop-shadow-[0_0_14px_rgba(0,245,255,0.6)] transition-all"
          />
          <div className="hidden lg:block">
            <p className="text-[11px] font-black text-slate-200 uppercase tracking-[0.2em] leading-none group-hover:text-cyan-400 transition-colors font-mono">
              Space Conquest
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="hud-label text-cyan-600">ONLINE</span>
              {onlineCount !== null && (
                <span className="flex items-center gap-1 hud-label text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {onlineCount}
                </span>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      {wsStatus === 'connected' ? (
                        <Wifi size={10} className="text-emerald-400" />
                      ) : wsStatus === 'connecting' ? (
                        <Wifi size={10} className="text-yellow-400 animate-pulse" />
                      ) : (
                        <WifiOff size={10} className="text-slate-600" />
                      )}
                      <span className={`w-1.5 h-1.5 rounded-full ${getConnectionStatusColor(wsStatus)}`} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="border-cyan-500/15 backdrop-blur-[12px]" style={{ background: 'rgba(10,5,32,0.95)' }}>
                    <span className="text-xs text-slate-400">WebSocket: </span>
                    <span className={`text-xs ${wsStatus === 'connected' ? 'text-emerald-400' : wsStatus === 'connecting' ? 'text-yellow-400' : 'text-slate-500'}`}>
                      {getConnectionStatusText(wsStatus)}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </button>

        <div className="h-6 w-px bg-cyan-500/10 hidden sm:block" />

        {/* Sélecteur de planète */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-cyan-500/5 text-left h-auto py-1.5 px-2 md:px-3 border border-transparent hover:border-cyan-500/20 rounded transition-all focus:outline-none"
            >
              <div className="flex flex-col items-start">
                <span className="hud-label text-cyan-700 hidden sm:inline">
                  COORD [{planet.galaxy}:{planet.system}:{planet.position}]
                </span>
                <span className="font-bold text-cyan-400 flex items-center gap-1.5 text-xs md:text-sm font-mono tabular-nums">
                  <span className="truncate max-w-[100px] sm:max-w-none">{planet.name}</span>
                  {myPlanets.length > 1 && (
                    <span className="px-1 py-0.5 bg-cyan-500/10 text-cyan-400 text-[9px] font-mono border border-cyan-500/20">
                      {myPlanets.length}
                    </span>
                  )}
                  <ChevronDown size={11} className="text-slate-600" />
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="border border-cyan-500/15 text-slate-200 shadow-2xl min-w-[280px] max-w-[400px] backdrop-blur-[12px]" style={{ background: 'rgba(10,5,32,0.95)' }}>
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-widest flex items-center justify-between px-4">
              <span>Vos Colonies</span>
              <span className="text-cyan-400 font-mono">{myPlanets.length}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-cyan-500/10" />

            {myPlanets.length > 3 && (
              <div className="px-2 py-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-cyan-500/15 rounded text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
                    style={{ background: 'rgba(16,8,46,0.95)' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
              {myPlanets.length > 0 ? (
                (() => {
                  const filtered = myPlanets.filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    `${p.galaxy}:${p.system}:${p.position}`.includes(searchQuery)
                  );
                  if (filtered.length === 0) {
                    return <div className="px-4 py-6 text-center text-slate-500 text-xs">Aucune planète trouvée</div>;
                  }
                  const grouped = filtered.reduce((acc, p) => {
                    if (!acc[p.galaxy]) acc[p.galaxy] = [];
                    acc[p.galaxy].push(p);
                    return acc;
                  }, {} as Record<number, PlanetSummary[]>);
                  const galaxies = Object.keys(grouped).map(Number).sort((a, b) => a - b);
                  return galaxies.map((galaxyNum) => (
                    <div key={galaxyNum}>
                      {galaxies.length > 1 && (
                        <div className="px-4 py-1 text-[10px] text-slate-500 uppercase tracking-widest font-bold sticky top-0 backdrop-blur-sm border-b border-cyan-500/10" style={{ background: 'rgba(10,5,32,0.97)' }}>
                          Galaxie {galaxyNum}
                        </div>
                      )}
                      {grouped[galaxyNum]
                        .sort((a, b) => {
                          const aIsHome = a.galaxy === 1 && a.system === 1 && a.position === 1;
                          const bIsHome = b.galaxy === 1 && b.system === 1 && b.position === 1;
                          if (aIsHome) return -1;
                          if (bIsHome) return 1;
                          return a.system - b.system || a.position - b.position;
                        })
                        .map((p) => {
                          const isHomePlanet = p.galaxy === 1 && p.system === 1 && p.position === 1;
                          return (
                            <DropdownMenuItem
                              key={p.id}
                              onClick={() => { onSwitchPlanet(p.id); setSearchQuery(""); }}
                              className={`flex justify-between items-center py-2 px-4 cursor-pointer focus:bg-cyan-500/5 transition-all ${
                                isHomePlanet
                                  ? 'bg-yellow-500/10 text-yellow-300 border-l-2 border-yellow-400 hover:bg-yellow-500/15'
                                  : p.is_current
                                    ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500/60'
                                    : 'text-slate-300 hover:bg-cyan-500/5 hover:text-cyan-400 hover:border-l-2 hover:border-cyan-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isHomePlanet ? (
                                  <Crown size={13} className="text-yellow-400 shrink-0 animate-pulse" />
                                ) : (
                                  <MapPin size={13} className={p.is_current ? "text-cyan-400 shrink-0" : "text-slate-500 shrink-0"} />
                                )}
                                <span className="font-bold text-sm truncate">{p.name}</span>
                              </div>
                              <span className="font-mono text-xs opacity-50 ml-2 shrink-0">[{p.galaxy}:{p.system}:{p.position}]</span>
                            </DropdownMenuItem>
                          );
                        })}
                    </div>
                  ));
                })()
              ) : (
                <DropdownMenuItem disabled className="text-slate-500 text-xs">Chargement...</DropdownMenuItem>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mini-map Galaxie (Desktop uniquement) */}
        <div className="hidden xl:block">
          <GalaxyMiniMap
            galaxy={planet.galaxy}
            system={planet.system}
            position={planet.position}
            onClick={onNavigateToGalaxy}
          />
        </div>
      </div>

      {/* ── Zone Droite : Ressources + Actions ── */}
      <div className="flex items-center gap-1.5 md:gap-4 ml-auto">

        {/* Ressources Desktop */}
        <div className="hidden lg:flex items-center gap-2">
          <ResourceItem
            icon={Stone}
            value={realtimeResources?.metal ?? planet.metal_amount}
            label="Métal"
            iconColor="text-orange-400"
            hudClass="hud-value-metal"
            production={prodMetal}
            max={storageCapacity}
          />
          <div className="w-px h-5 bg-cyan-500/10" />
          <ResourceItem
            icon={Gem}
            value={realtimeResources?.crystal ?? planet.crystal_amount}
            label="Cristal"
            iconColor="text-cyan-400"
            hudClass="hud-value-crystal"
            production={prodCrystal}
            max={storageCapacity}
          />
          <div className="w-px h-5 bg-cyan-500/10" />
          <ResourceItem
            icon={Droplets}
            value={realtimeResources?.deuterium ?? planet.deuterium_amount}
            label="Deutérium"
            iconColor="text-emerald-400"
            hudClass="hud-value-deut"
            production={prodDeut}
            max={storageCapacity}
          />

          {/* Crédits Syndicat */}
          <div className="w-px h-5 bg-cyan-500/10" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded cursor-help transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}
                >
                  <Coins size={14} className="text-yellow-500 shrink-0" />
                  <span className="font-mono text-sm font-black text-yellow-400">
                    {syndicateCredits.toFixed(0)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-cyan-500/15 backdrop-blur-[12px]" style={{ background: 'rgba(10,5,32,0.95)' }}>
                <p className="text-yellow-400 font-bold text-xs">Crédits du Syndicat</p>
                <p className="text-slate-400 text-xs">Obtenables via les expéditions.</p>
                <p className="text-slate-400 text-xs">Utilisables au Marché Underground.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Énergie */}
          <div className="w-px h-5 bg-cyan-500/10" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex flex-col gap-1 px-2.5 py-1.5 rounded cursor-help min-w-[88px] transition-all hover:-translate-y-0.5"
                  style={{
                    background: `rgba(${energyRatio < 50 ? '239,68,68' : energyRatio < 100 ? '249,115,22' : '34,197,94'},0.06)`,
                    border: `1px solid ${energyColor}30`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Zap size={13} style={{ color: energyColor }} className={energyRatio < 100 ? 'animate-pulse' : ''} />
                    <span className="font-mono text-xs font-bold" style={{ color: energyColor }}>
                      {energyRatio}%
                    </span>
                  </div>
                  <div className="h-0.5 w-full bg-cyan-500/10 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${Math.min(energyRatio, 100)}%`, background: energyColor }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-cyan-500/15 backdrop-blur-[12px]" style={{ background: 'rgba(10,5,32,0.95)' }}>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Production</span>
                    <span className="text-emerald-400 font-mono font-bold">+{energyProduction.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Consommation</span>
                    <span className="text-red-400 font-mono font-bold">-{energyConsumption.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-cyan-500/10 pt-1.5 flex justify-between gap-4">
                    <span className="text-slate-400">Ratio</span>
                    <span className="font-mono font-bold" style={{ color: energyColor }}>
                      {energyRatio}%{energyRatio < 100 && ' ⚠'}
                    </span>
                  </div>
                  {energyRatio < 100 && (
                    <p className="text-orange-400 text-[10px]">Mines ralenties</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Ressources Mobile compact */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="lg:hidden flex items-center gap-1.5 px-2 py-1.5 hover:bg-cyan-500/5 rounded transition-all">
              <Stone size={14} className="text-orange-400" />
              <span className="text-xs font-mono text-orange-300">{formatCompact(planet.metal_amount)}</span>
              <ChevronDown size={11} className="text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border border-cyan-500/15 text-slate-200 shadow-2xl min-w-[200px] backdrop-blur-[12px]" style={{ background: 'rgba(10,5,32,0.95)' }} align="end">
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">Ressources</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-cyan-500/10" />
            <div className="p-2 space-y-2">
              <MobileResource icon={Stone} label="Métal" value={planet.metal_amount} prod={prodMetal} iconColor="text-orange-400" valueColor="text-orange-300" />
              <MobileResource icon={Gem} label="Cristal" value={planet.crystal_amount} prod={prodCrystal} iconColor="text-cyan-400" valueColor="text-cyan-300" />
              <MobileResource icon={Droplets} label="Deutérium" value={planet.deuterium_amount} prod={prodDeut} iconColor="text-emerald-400" valueColor="text-emerald-300" />
              <div className="pt-2 border-t border-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={13} style={{ color: energyColor }} />
                    <span className="text-xs text-slate-400">Énergie</span>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: energyColor }}>{energyRatio}%</span>
                </div>
                <div className="flex justify-between text-[10px] px-1 mt-1">
                  <span className="text-emerald-400">+{energyProduction.toLocaleString()}</span>
                  <span className="text-red-400">-{energyConsumption.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-cyan-500/10 hidden sm:block" />

        {planet.owner_id && (
          <NotificationCenter userId={planet.owner_id} />
        )}

        <button
          onClick={onOpenMessages}
          className="relative p-2 rounded hover:bg-cyan-500/5 border border-transparent hover:border-cyan-500/15 transition-all group shrink-0"
          title="Messagerie"
        >
          <Mail size={16} className={`transition-colors ${unreadMessages > 0 ? 'text-cyan-300' : 'text-slate-500 group-hover:text-cyan-400'}`} />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center">
              <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative bg-red-500 text-slate-200 text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center border border-cyan-500/10 leading-none">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function ResourceItem({ icon: Icon, value, label, iconColor, hudClass, production, max }: {
  icon: any;
  value: number;
  label: string;
  iconColor: string;
  hudClass: string;
  production: number;
  max: number;
}) {
  const format = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return Math.floor(n).toLocaleString();
  };
  const percentage = max ? (value / max) * 100 : 0;
  const isNearFull = percentage >= 90;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 group cursor-help px-2.5 py-1.5 rounded transition-all hover:-translate-y-0.5 hover:bg-cyan-500/5">
            <Icon
              size={15}
              className={`${iconColor} transition-transform group-hover:scale-110 shrink-0 ${isNearFull ? 'animate-pulse' : ''}`}
            />
            <span className={`${hudClass} text-sm min-w-[52px] text-right font-mono tabular-nums ${isNearFull ? '!text-yellow-400' : ''}`}>
              {format(value)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="border-cyan-500/15 backdrop-blur-[12px]" style={{ background: 'rgba(10,5,32,0.95)' }}>
          <div className="text-xs space-y-1.5">
            <p className="text-slate-400 hud-label">{label}</p>
            <p className="text-emerald-400 font-mono font-bold">+{format(production)}/h</p>
            {max && (
              <>
                <div className="w-full bg-cyan-500/10 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full transition-all ${percentage >= 90 ? 'bg-yellow-400' : percentage >= 75 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <p className="text-slate-500 font-mono text-[10px]">
                  {format(value)} / {format(max)} ({percentage.toFixed(0)}%)
                </p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MobileResource({ icon: Icon, label, value, prod, iconColor, valueColor }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={13} className={iconColor} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-right">
        <div className={`font-mono text-xs font-bold ${valueColor}`}>{formatFull(value)}</div>
        <div className="text-[10px] text-emerald-500">+{formatCompact(prod)}/h</div>
      </div>
    </div>
  );
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return Math.floor(n).toString();
}

function formatFull(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return Math.floor(n).toLocaleString();
}

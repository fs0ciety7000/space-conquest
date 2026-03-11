import { useState, useEffect, useCallback } from 'react';
import {
  Route, Plus, Trash2, Play, Pause, ChevronDown, ChevronUp,
  Package, Clock, AlertTriangle, CheckCircle2, Truck, Info,
  RefreshCw, Warehouse, Navigation, ArrowRight, Pencil, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';
import { formatTimeUntil, formatDuration } from '@/lib/utils';

interface TradeRoute {
  id: string;
  name: string;
  source_planet_id: string;
  target_planet_id: string;
  source_planet_name?: string;
  target_planet_name?: string;
  ship_count: number;
  metal_ratio: number;
  crystal_ratio: number;
  deuterium_ratio: number;
  is_active: boolean;
  schedule_type: 'interval' | 'daily';
  interval_hours: number;
  daily_hour: number | null;
  next_run_at?: string;
  created_at?: string;
  travel_time_seconds?: number;
}

interface RouteLog {
  id: string;
  executed_at?: string;
  metal_transferred: number;
  crystal_transferred: number;
  deuterium_transferred: number;
  status: string;
  piracy_loss_ratio?: number;
  source_planet_name?: string;
  target_planet_name?: string;
}

interface MyPlanet {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  grand_cargo_count?: number;
}

interface HubInfo {
  hub_level: number;
  max_routes: number;
  planet_id: string;
}

interface TradeRoutesViewProps {
  userId: string;
  planetId: string;
  planet: any;
}

const RESOURCE_LABELS: Record<string, string> = {
  metal: 'Métal',
  crystal: 'Cristal',
  deuterium: 'Deutérium',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'text-emerald-400',
  intercepted: 'text-red-400',
  no_resources: 'text-amber-400',
  paused: 'text-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
  success: 'Succès',
  intercepted: 'Intercepté',
  no_resources: 'Aucune ressource',
  paused: 'En pause',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getTransitStatus(route: TradeRoute, now: number, intervalHours: number) {
  if (!route.is_active || !route.next_run_at || !route.travel_time_seconds) return null;
  const arrivalMs = new Date(route.next_run_at).getTime();
  const travelMs = route.travel_time_seconds * 1000;
  const intervalMs = intervalHours * 3600 * 1000;
  const departureMs = arrivalMs - travelMs;
  const nextDepartureMs = arrivalMs + travelMs;

  if (now >= departureMs && now < arrivalMs) {
    const remainingSec = Math.max(0, Math.floor((arrivalMs - now) / 1000));
    const totalSec = route.travel_time_seconds;
    const progress = Math.min(100, ((totalSec - remainingSec) / totalSec) * 100);
    return { phase: 'outbound' as const, remainingSec, progress };
  }
  if (now >= arrivalMs && now < nextDepartureMs) {
    const remainingSec = Math.max(0, Math.floor((nextDepartureMs - now) / 1000));
    const totalSec = route.travel_time_seconds;
    const progress = Math.min(100, ((totalSec - remainingSec) / totalSec) * 100);
    return { phase: 'returning' as const, remainingSec, progress };
  }
  return null;
}

function formatSec(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

export default function TradeRoutesView({ userId, planetId }: TradeRoutesViewProps) {
  const now = useNow();
  const [routes, setRoutes] = useState<TradeRoute[]>([]);
  const [myPlanets, setMyPlanets] = useState<MyPlanet[]>([]);
  const [hubInfo, setHubInfo] = useState<HubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<Record<string, RouteLog[]>>({});
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string; ship_count: number; metal_ratio: number; crystal_ratio: number;
    deuterium_ratio: number; schedule_type: 'interval' | 'daily'; interval_hours: number; daily_hour: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    source_planet_id: planetId,
    target_planet_id: '',
    ship_count: 50,
    metal_ratio: 1.0,
    crystal_ratio: 1.0,
    deuterium_ratio: 0.0,
    schedule_type: 'interval' as 'interval' | 'daily',
    interval_hours: 24,
    daily_hour: 3,
  });
  const [creating, setCreating] = useState(false);

  const fetchGameConfig = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/config'));
      if (res.ok) setGameConfig(await res.json());
    } catch {}
  }, []);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/trade-routes?user_id=${userId}`));
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
      }
    } catch {}
  }, [userId]);

  const fetchHubInfo = useCallback(async (pid: string) => {
    try {
      const res = await fetch(apiUrl(`/trade-routes/hub-info?planet_id=${pid}`));
      if (res.ok) setHubInfo(await res.json());
    } catch {}
  }, []);

  const fetchMyPlanets = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/my-planets?current_planet_id=${planetId}`));
      if (res.ok) {
        const data = await res.json();
        const planets: MyPlanet[] = (data.planets || data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          galaxy: p.galaxy,
          system: p.system,
          position: p.position,
          grand_cargo_count: (p.ships?.grand_cargo?.count ?? p.ships?.grand_cargo ?? 0) as number,
        }));
        setMyPlanets(planets);
      }
    } catch {}
  }, [planetId]);

  useEffect(() => {
    Promise.all([fetchRoutes(), fetchMyPlanets(), fetchGameConfig(), fetchHubInfo(planetId)])
      .finally(() => setLoading(false));
  }, [fetchRoutes, fetchMyPlanets, fetchGameConfig, fetchHubInfo, planetId]);

  useEffect(() => {
    fetchHubInfo(form.source_planet_id);
  }, [form.source_planet_id, fetchHubInfo]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Donnez un nom à la route'); return; }
    if (!form.target_planet_id) { toast.error('Sélectionnez une planète cible'); return; }
    if (form.source_planet_id === form.target_planet_id) { toast.error('Source et destination doivent être différentes'); return; }

    setCreating(true);
    try {
      const res = await fetch(apiUrl('/trade-routes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: userId, ...form }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Route "${form.name}" créée avec succès`);
        setShowCreateForm(false);
        setForm({ name: '', source_planet_id: planetId, target_planet_id: '', ship_count: 50, metal_ratio: 1.0, crystal_ratio: 1.0, deuterium_ratio: 0.0, schedule_type: 'interval', interval_hours: 24, daily_hour: 3 });
        fetchRoutes();
        fetchHubInfo(form.source_planet_id);
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (route: TradeRoute) => {
    try {
      const res = await fetch(apiUrl(`/trade-routes/${route.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !route.is_active }),
      });
      if (res.ok) {
        toast.success(route.is_active ? 'Route suspendue' : 'Route réactivée');
        fetchRoutes();
      }
    } catch {}
  };

  const handleDelete = async (route: TradeRoute) => {
    if (!confirm(`Supprimer la route "${route.name}" ?`)) return;
    try {
      const res = await fetch(apiUrl(`/trade-routes/${route.id}?user_id=${userId}`), { method: 'DELETE' });
      if (res.status === 204 || res.ok) {
        toast.success('Route supprimée');
        fetchRoutes();
      }
    } catch {}
  };

  const startEdit = (route: TradeRoute) => {
    setEditingRouteId(route.id);
    setEditForm({
      name: route.name,
      ship_count: route.ship_count,
      metal_ratio: route.metal_ratio,
      crystal_ratio: route.crystal_ratio,
      deuterium_ratio: route.deuterium_ratio,
      schedule_type: route.schedule_type,
      interval_hours: route.interval_hours ?? 24,
      daily_hour: route.daily_hour ?? 3,
    });
  };

  const handleUpdate = async () => {
    if (!editingRouteId || !editForm) return;
    if (!editForm.name.trim()) { toast.error('Le nom ne peut pas être vide'); return; }
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/trade-routes/${editingRouteId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success('Route mise à jour');
        setEditingRouteId(null);
        setEditForm(null);
        fetchRoutes();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLogs = async (routeId: string) => {
    const newSet = new Set(expandedLogs);
    if (newSet.has(routeId)) {
      newSet.delete(routeId);
    } else {
      newSet.add(routeId);
      if (!logs[routeId]) {
        try {
          const res = await fetch(apiUrl(`/trade-routes/${routeId}/logs`));
          if (res.ok) {
            const data = await res.json();
            setLogs(prev => ({ ...prev, [routeId]: data.logs || [] }));
          }
        } catch {}
      }
    }
    setExpandedLogs(newSet);
  };

  const intervalHours = gameConfig?.trade_route_interval_hours ?? 24;
  const cargoCapacity = gameConfig?.grand_cargo_capacity ?? 1_000_000;

  const sourcePlanet = myPlanets.find(p => p.id === form.source_planet_id);
  const availableCargo = sourcePlanet?.grand_cargo_count ?? 0;
  const routesFromSource = routes.filter(r => r.source_planet_id === form.source_planet_id).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
            <Route className="text-cyan-400" size={28} /> Routes Commerciales
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Automatisez le transfert de ressources entre vos planètes via vos Grands Cargos.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={!hubInfo || hubInfo.max_routes === 0}
          title={!hubInfo || hubInfo.max_routes === 0 ? 'Prérequis non remplis : Hangar 20, Stockage Ressources 15, Tech Industrielle 3' : undefined}
          className="bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 hover:border-cyan-500/30 text-cyan-300 gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus size={16} /> Nouvelle Route
        </Button>
      </div>

      {/* Hub info banner */}
      {hubInfo && (
        <div className="rounded-lg bg-[rgba(10,5,32,0.85)] border border-emerald-500/15 backdrop-blur-[12px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Warehouse className="text-emerald-400" size={20} />
            <div>
              <div className="text-emerald-300 font-semibold text-sm">
                Hub Logistique niveau {hubInfo.hub_level} — planète source sélectionnée
              </div>
              <div className="text-emerald-400/60 text-xs mt-0.5">
                {hubInfo.max_routes === 0
                  ? 'Construisez un Hub Logistique (prérequis: Hangar 20, Stockage 15, Tech Industrielle 3) pour activer les routes.'
                  : `${routes.filter(r => r.source_planet_id === form.source_planet_id).length} / ${hubInfo.max_routes} routes utilisées depuis cette planète`}
              </div>
            </div>
          </div>
          <div className="text-slate-500 text-xs text-right font-mono tabular-nums">
            Cargo: {formatNumber(cargoCapacity)}/vaisseau
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-xl bg-[rgba(16,8,46,0.95)] border border-cyan-500/15 backdrop-blur-[12px] overflow-hidden">
          <div className="p-5 border-b border-cyan-500/10">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-1.5">
                <Plus size={11} /> Créer une Route Commerciale
              </span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="text-slate-400 text-sm font-medium mb-1 block">Nom de la route</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Route métal Andromède→Kepler"
                  className="w-full bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
                />
              </div>

              {/* Source planet */}
              <div>
                <label className="text-slate-400 text-sm font-medium mb-1 block">Planète source</label>
                <select
                  value={form.source_planet_id}
                  onChange={e => setForm(f => ({ ...f, source_planet_id: e.target.value, target_planet_id: '' }))}
                  className="w-full bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
                >
                  {myPlanets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.galaxy}:{p.system}:{p.position}] — {p.grand_cargo_count ?? 0} Grands Cargos
                    </option>
                  ))}
                </select>
                {availableCargo < form.ship_count && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> Seulement {availableCargo} Grands Cargos disponibles sur cette planète
                  </p>
                )}
              </div>

              {/* Target planet */}
              <div>
                <label className="text-slate-400 text-sm font-medium mb-1 block">Planète destination</label>
                <select
                  value={form.target_planet_id}
                  onChange={e => setForm(f => ({ ...f, target_planet_id: e.target.value }))}
                  className="w-full bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
                >
                  <option value="">-- Choisir --</option>
                  {myPlanets
                    .filter(p => p.id !== form.source_planet_id)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.galaxy}:{p.system}:{p.position}]
                      </option>
                    ))}
                </select>
              </div>

              {/* Ship count */}
              <div>
                <label className="text-slate-400 text-sm font-medium mb-1 block">
                  Nombre de Grands Cargos ({form.ship_count})
                </label>
                <input
                  type="range"
                  min={1}
                  max={Math.max(availableCargo, 1)}
                  value={form.ship_count}
                  onChange={e => setForm(f => ({ ...f, ship_count: Number(e.target.value) }))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  <span>1</span>
                  <span className="text-cyan-400">Capacité totale: {formatNumber(form.ship_count * cargoCapacity)}</span>
                  <span>{Math.max(availableCargo, 1)}</span>
                </div>
              </div>

              {/* Ratios */}
              <div className="md:col-span-2 space-y-3">
                <p className="text-slate-400 text-sm font-medium">Ressources à transférer</p>
                {(['metal', 'crystal', 'deuterium'] as const).map(r => {
                  const ratioKey = `${r}_ratio` as 'metal_ratio' | 'crystal_ratio' | 'deuterium_ratio';
                  const val = form[ratioKey];
                  return (
                    <div key={r} className="flex items-center gap-3">
                      <span className="text-slate-400 text-sm w-20">{RESOURCE_LABELS[r]}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={val}
                        onChange={e => setForm(f => ({ ...f, [ratioKey]: Number(e.target.value) }))}
                        className="flex-1 accent-cyan-500"
                      />
                      <span className="text-cyan-300 text-sm w-12 text-right font-mono tabular-nums">{Math.round(val * 100)}%</span>
                    </div>
                  );
                })}
                <p className="text-slate-500 text-xs flex items-center gap-1">
                  <Info size={11} /> 100% = tout le stock disponible (limité par la capacité cargo)
                </p>
              </div>

              {/* Schedule */}
              <div className="md:col-span-2 space-y-3 border-t border-cyan-500/10 pt-4">
                <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400" /> Fréquence d'exécution
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, schedule_type: 'interval' }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      form.schedule_type === 'interval'
                        ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
                        : 'bg-[rgba(10,5,32,0.4)] border-cyan-500/10 text-slate-400 hover:border-cyan-500/20'
                    }`}
                  >
                    Toutes les N heures
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, schedule_type: 'daily' }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      form.schedule_type === 'daily'
                        ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
                        : 'bg-[rgba(10,5,32,0.4)] border-cyan-500/10 text-slate-400 hover:border-cyan-500/20'
                    }`}
                  >
                    Chaque jour à heure fixe
                  </button>
                </div>

                {form.schedule_type === 'interval' ? (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Intervalle :</span>
                    <select
                      value={form.interval_hours}
                      onChange={e => setForm(f => ({ ...f, interval_hours: Number(e.target.value) }))}
                      className="bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
                    >
                      {[1, 2, 4, 6, 8, 12, 24, 48, 72].map(h => (
                        <option key={h} value={h}>{h}h</option>
                      ))}
                    </select>
                    <span className="text-cyan-300/70 text-xs font-mono">
                      → Prochain exécution dans ~{form.interval_hours}h après chaque transfert
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Heure d'exécution (UTC) :</span>
                    <select
                      value={form.daily_hour}
                      onChange={e => setForm(f => ({ ...f, daily_hour: Number(e.target.value) }))}
                      className="bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')}:00 UTC</option>
                      ))}
                    </select>
                    <span className="text-cyan-300/70 text-xs font-mono">→ Une fois par jour à cette heure</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hub limit warnings */}
            {hubInfo && hubInfo.max_routes > 0 && routesFromSource >= hubInfo.max_routes && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/15 border border-red-500/15 rounded-lg p-3">
                <AlertTriangle size={16} />
                Limite atteinte : {hubInfo.max_routes} route(s) max depuis cette planète (Hub Logistique niv. {hubInfo.hub_level}).
                Améliorez votre Hub ou supprimez une route existante.
              </div>
            )}

            {hubInfo && hubInfo.max_routes === 0 && (
              <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-950/15 border border-amber-500/15 rounded-lg p-3">
                <AlertTriangle size={16} />
                Cette planète n'a pas de Hub Logistique. Construisez-en un dans les Installations (prérequis: Hangar 20 + Stockage 15 + Tech Industrielle 3).
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreate}
                disabled={creating || (hubInfo?.max_routes === 0)}
                className="bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 hover:border-cyan-500/30 text-cyan-300 transition-all"
              >
                {creating ? <RefreshCw size={14} className="animate-spin mr-2" /> : null}
                Créer la route
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="border-cyan-500/10 text-slate-400 hover:text-slate-200 hover:border-cyan-500/20 transition-colors"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Routes list */}
      {routes.length === 0 ? (
        <div className="rounded-xl bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] p-12 text-center">
          <Truck className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 text-lg font-medium">Aucune route commerciale</p>
          <p className="text-slate-500 text-sm mt-2">
            Créez votre première route pour automatiser vos transferts de ressources.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map(route => {
            const isExpanded = expandedLogs.has(route.id);
            const routeLogs = logs[route.id] || [];
            const transit = getTransitStatus(route, now, intervalHours);

            return (
              <div
                key={route.id}
                className={`rounded-xl backdrop-blur-[12px] border transition-all duration-200 ${
                  route.is_active
                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/30'
                    : 'bg-amber-500/5 border-amber-500/20 opacity-70'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Route info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${route.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
                        <h3 className="text-slate-200 font-semibold truncate">{route.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          route.is_active
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-900/20 text-amber-400 border border-amber-500/20'
                        }`}>
                          {route.is_active ? 'Active' : 'Suspendue'}
                        </span>
                      </div>

                      {/* Route direction */}
                      <div className="flex items-center gap-2 text-sm text-slate-300 mb-3">
                        <Package size={14} className="text-cyan-400 flex-shrink-0" />
                        <span className="font-medium text-cyan-200">{route.source_planet_name || route.source_planet_id.slice(0, 8)}</span>
                        <span className="text-slate-500">→</span>
                        <span className="font-medium text-slate-300">{route.target_planet_name || route.target_planet_id.slice(0, 8)}</span>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-mono tabular-nums">
                          <Truck size={11} className="text-cyan-400" />
                          {route.ship_count} Grands Cargos
                          <span className="text-slate-500">({formatNumber(route.ship_count * cargoCapacity)} capacité)</span>
                        </span>
                        {route.metal_ratio > 0 && (
                          <span className="font-mono tabular-nums">Métal: {Math.round(route.metal_ratio * 100)}%</span>
                        )}
                        {route.crystal_ratio > 0 && (
                          <span className="font-mono tabular-nums">Cristal: {Math.round(route.crystal_ratio * 100)}%</span>
                        )}
                        {route.deuterium_ratio > 0 && (
                          <span className="font-mono tabular-nums">Deutérium: {Math.round(route.deuterium_ratio * 100)}%</span>
                        )}
                      </div>

                      {/* Schedule + next run */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-mono tabular-nums">
                          <Clock size={11} className="text-cyan-400" />
                          {route.schedule_type === 'daily' && route.daily_hour != null
                            ? `Quotidien à ${String(route.daily_hour).padStart(2, '0')}:00 UTC`
                            : `Toutes les ${intervalHours}h`}
                        </span>
                        {route.travel_time_seconds && (
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            Trajet : <span className="text-cyan-400/70">{formatSec(route.travel_time_seconds)}</span>
                          </span>
                        )}
                        {route.is_active && route.next_run_at && !transit && (
                          <span className="text-xs text-slate-400 font-mono tabular-nums">
                            Collecte : <span className="text-cyan-400 font-medium">{formatTimeUntil(route.next_run_at)}</span>
                          </span>
                        )}
                      </div>

                      {/* Fleet transit bar */}
                      {transit && (
                        <div className="mt-3">
                          <div className={`flex items-center gap-2 mb-1.5 text-xs font-medium ${
                            transit.phase === 'outbound' ? 'text-cyan-300' : 'text-emerald-300'
                          }`}>
                            <Navigation size={12} className="animate-pulse" />
                            {transit.phase === 'outbound'
                              ? <>Flotte en route → <span className="font-semibold">{route.target_planet_name}</span></>
                              : <>Flotte en retour → <span className="font-semibold">{route.source_planet_name}</span></>
                            }
                            <span className="ml-auto text-slate-400 font-normal font-mono tabular-nums">
                              ETA : <span className={transit.phase === 'outbound' ? 'text-cyan-300' : 'text-emerald-300'}>{formatSec(transit.remainingSec)}</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-[rgba(10,5,32,0.6)] rounded-full overflow-hidden border border-cyan-500/10">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                transit.phase === 'outbound'
                                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                                  : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                              }`}
                              style={{ width: `${transit.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleLogs(route.id)}
                        className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[rgba(10,5,32,0.6)] transition-colors"
                        title="Voir l'historique"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        onClick={() => editingRouteId === route.id ? (setEditingRouteId(null), setEditForm(null)) : startEdit(route)}
                        className={`p-1.5 rounded-lg transition-colors ${editingRouteId === route.id ? 'text-cyan-400 bg-cyan-900/20' : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-900/20'}`}
                        title="Modifier"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(route)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          route.is_active
                            ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/20'
                            : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20'
                        }`}
                        title={route.is_active ? 'Suspendre' : 'Réactiver'}
                      >
                        {route.is_active ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(route)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-900/20 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Edit form */}
                  {editingRouteId === route.id && editForm && (
                    <div className="mt-4 border-t border-cyan-500/10 pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                        <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-1.5">
                          <Pencil size={11} /> Modifier la route
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-slate-400 text-xs mb-1 block">Nom</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={e => setEditForm(f => f && ({ ...f, name: e.target.value }))}
                            className="w-full bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 text-xs mb-1 block">Grands Cargos ({editForm.ship_count})</label>
                          <input
                            type="range" min={1} max={200} value={editForm.ship_count}
                            onChange={e => setEditForm(f => f && ({ ...f, ship_count: Number(e.target.value) }))}
                            className="w-full accent-cyan-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-slate-400 text-xs block">Ressources</label>
                          {(['metal', 'crystal', 'deuterium'] as const).map(r => {
                            const k = `${r}_ratio` as 'metal_ratio' | 'crystal_ratio' | 'deuterium_ratio';
                            return (
                              <div key={r} className="flex items-center gap-2">
                                <span className="text-slate-500 text-xs w-16">{RESOURCE_LABELS[r]}</span>
                                <input type="range" min={0} max={1} step={0.05} value={editForm[k]}
                                  onChange={e => setEditForm(f => f && ({ ...f, [k]: Number(e.target.value) }))}
                                  className="flex-1 accent-cyan-500" />
                                <span className="text-cyan-300 text-xs w-8 text-right font-mono tabular-nums">{Math.round(editForm[k] * 100)}%</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-slate-400 text-xs block">Fréquence</label>
                          <div className="flex gap-2">
                            {(['interval', 'daily'] as const).map(st => (
                              <button key={st} type="button"
                                onClick={() => setEditForm(f => f && ({ ...f, schedule_type: st }))}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                                  editForm.schedule_type === st
                                    ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
                                    : 'bg-[rgba(10,5,32,0.4)] border-cyan-500/10 text-slate-400 hover:border-cyan-500/20'
                                }`}>
                                {st === 'interval' ? 'Toutes les N heures' : 'Heure fixe quotidienne'}
                              </button>
                            ))}
                          </div>
                          {editForm.schedule_type === 'interval' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs">Intervalle :</span>
                              <select value={editForm.interval_hours}
                                onChange={e => setEditForm(f => f && ({ ...f, interval_hours: Number(e.target.value) }))}
                                className="bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/30 transition-colors">
                                {[1, 2, 4, 6, 8, 12, 24, 48, 72].map(h => <option key={h} value={h}>{h}h</option>)}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs">Heure UTC :</span>
                              <select value={editForm.daily_hour}
                                onChange={e => setEditForm(f => f && ({ ...f, daily_hour: Number(e.target.value) }))}
                                className="bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/30 transition-colors">
                                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button onClick={handleUpdate} disabled={saving}
                          className="bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 hover:border-cyan-500/30 text-cyan-300 text-xs transition-all">
                          {saving ? <RefreshCw size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
                          Enregistrer
                        </Button>
                        <Button variant="outline" onClick={() => { setEditingRouteId(null); setEditForm(null); }}
                          className="border-cyan-500/10 text-slate-400 hover:text-slate-200 hover:border-cyan-500/20 text-xs transition-colors">
                          <X size={12} className="mr-1" /> Annuler
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Logs accordion */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-cyan-500/10 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                        <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Historique des transferts</span>
                      </div>
                      {routeLogs.length === 0 ? (
                        <p className="text-slate-500 text-sm">Aucun transfert effectué pour l'instant.</p>
                      ) : (
                        <div className="space-y-2">
                          {routeLogs.map(log => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-xs bg-[rgba(10,5,32,0.5)] border border-cyan-500/10 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                {log.status === 'success' && <CheckCircle2 size={12} className="text-emerald-400" />}
                                {log.status === 'intercepted' && <AlertTriangle size={12} className="text-red-400" />}
                                {log.status === 'no_resources' && <AlertTriangle size={12} className="text-amber-400" />}
                                <span className={`font-medium ${STATUS_COLORS[log.status] || 'text-slate-300'}`}>
                                  {STATUS_LABELS[log.status] || log.status}
                                </span>
                                {log.piracy_loss_ratio && log.piracy_loss_ratio > 0 && (
                                  <span className="text-red-400 font-mono tabular-nums">(-{Math.round(log.piracy_loss_ratio * 100)}% piraterie)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-slate-400 font-mono tabular-nums">
                                {log.metal_transferred > 0 && (
                                  <span className="text-orange-300">{formatNumber(log.metal_transferred)} M</span>
                                )}
                                {log.crystal_transferred > 0 && (
                                  <span className="text-cyan-300">{formatNumber(log.crystal_transferred)} C</span>
                                )}
                                {log.deuterium_transferred > 0 && (
                                  <span className="text-blue-300">{formatNumber(log.deuterium_transferred)} D</span>
                                )}
                                {log.executed_at && (
                                  <span className="text-slate-500 ml-1">
                                    {new Date(log.executed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info panel */}
      <div className="rounded-xl bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
          <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-1.5">
            <Info size={11} /> Comment fonctionnent les Routes Commerciales ?
          </span>
        </div>
        <ul className="text-slate-500 text-xs space-y-1.5">
          <li>• Chaque route s'exécute automatiquement selon la fréquence choisie (toutes les N heures ou une fois par jour à heure fixe UTC).</li>
          <li>• Chaque Grand Cargo transporte jusqu'à <strong className="text-slate-400 font-mono tabular-nums">{formatNumber(cargoCapacity)}</strong> unités de ressources.</li>
          <li>• Les ratios (0-100%) définissent quelle fraction du stock disponible est embarquée pour chaque ressource.</li>
          <li>• Une flotte ennemie en embuscade dans le système solaire cible peut <strong className="text-red-400">intercepter</strong> les cargos et voler une partie des ressources.</li>
          <li>• Le nombre de routes disponibles dépend du niveau de votre <strong className="text-cyan-400">Hub Logistique</strong> sur la planète source (niv. 1 → 2 routes, niv. 3 → 6, niv. 5 → 12…).</li>
        </ul>
      </div>
    </div>
  );
}

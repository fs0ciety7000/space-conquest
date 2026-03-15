import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Layers, FlaskConical, Rocket, Shield, Pickaxe, Building2,
  Trash2, RefreshCw, GripVertical, Clock, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';
import { formatDuration } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  category: string;
  item_key: string;
  quantity: number;
  target_level: number | null;
  queue_position: number;
  created_at: string;
}

interface CategoryStatus {
  slots_total: number;
  slots_used: number;
  slots_free: number;
  pending_count: number;
}

interface QueueStatus {
  pending_items: QueueItem[];
  categories: Record<string, CategoryStatus>;
}

interface BuildQueueManagerProps {
  planetId: string;
  planet: any;
}

// ── Category meta ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'research',   label: 'Recherche',     Icon: FlaskConical, color: 'cyan'    },
  { id: 'ships',      label: 'Vaisseaux',     Icon: Rocket,       color: 'sky'     },
  { id: 'defenses',   label: 'Défenses',      Icon: Shield,       color: 'emerald' },
  { id: 'resources',  label: 'Ressources',    Icon: Pickaxe,      color: 'amber'   },
  { id: 'facilities', label: 'Installations', Icon: Building2,    color: 'violet'  },
] as const;

type CategoryId = 'research' | 'ships' | 'defenses' | 'resources' | 'facilities';

// All color palettes now use cyan-500/10 tones to match the design system.
// Individual accent colors are preserved for category differentiation only.
const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    badge: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'      },
  sky:     { bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     text: 'text-sky-400',     badge: 'bg-sky-500/10 border border-sky-500/20 text-sky-400'          },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   badge: 'bg-amber-500/10 border border-amber-500/20 text-amber-400'    },
  violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  text: 'text-violet-400',  badge: 'bg-violet-500/10 border border-violet-500/20 text-violet-400' },
};

function formatItemLabel(category: string, item_key: string, quantity: number, target_level: number | null): string {
  const label = LABELS[item_key] || item_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (category === 'ships')   return `${quantity}× ${label}`;
  if (category === 'defenses') return `${quantity}× ${label}`;
  if (target_level != null)   return `${label} → niv. ${target_level}`;
  return label;
}

// ── Active build helpers ───────────────────────────────────────────────────────

const RESOURCE_KEYS = ['metal_mine', 'crystal_mine', 'deuterium_mine', 'solar_plant', 'fusion_plant'];

const TECH_KEYS = [
  'energy_tech', 'laser_tech', 'ion_tech', 'plasma_tech', 'armour_tech', 'shield_tech',
  'weapons_tech', 'espionage_tech', 'computer_tech', 'astrophysics', 'hyperspace_tech',
  'graviton_tech', 'industrial_tech', 'combustion_drive', 'impulse_drive', 'hyperspace_drive',
];

const LABELS: Record<string, string> = {
  // Resource buildings
  metal_mine: 'Mine de Métal', crystal_mine: 'Mine de Cristal', deuterium_mine: 'Synth. Deutérium',
  solar_plant: 'Centrale Solaire', fusion_plant: 'Centrale à Fusion',
  // Facility buildings
  shipyard: 'Chantier Spatial', research_lab: 'Labo de Recherche',
  hangar: 'Hangar à Vaisseaux', resource_storage: 'Hangar Ressources', nanite_factory: 'Usine Nanite',
  alliance_depot: 'Dépôt Alliance', missile_silo: 'Silo à Missiles',
  terraformer: 'Terraformeur', logistics_hub: 'Hub Logistique',
  // Technologies
  energy_tech: 'Tech. Énergie', laser_tech: 'Tech. Laser', ion_tech: 'Tech. Ions',
  plasma_tech: 'Tech. Plasma', armour_tech: 'Tech. Blindage', shield_tech: 'Tech. Boucliers',
  weapons_tech: 'Tech. Armes', espionage_tech: 'Tech. Espionnage', computer_tech: 'Tech. Ordinateurs',
  astrophysics: 'Astrophysique', hyperspace_tech: 'Tech. Hyperespace', graviton_tech: 'Tech. Graviton',
  industrial_tech: 'Tech. Industrielle',
  // Propulsion
  combustion_drive: 'Propulsion Combustion', impulse_drive: 'Réacteur Impulsion',
  hyperspace_drive: 'Propulsion Hyperespace',
  // Ships
  light_hunter: 'Chasseur Léger', heavy_hunter: 'Chasseur Lourd', cruiser: 'Croiseur',
  battleship: 'Cuirassé', destroyer: 'Destructeur', bomber: 'Bombardier',
  deathstar: 'Étoile de la Mort', death_star: 'Étoile de la Mort',
  colony_ship: 'Vaisseau Colon', transporter: 'Transporteur',
  recycler: 'Recycleur', spy_probe: 'Sonde Espionnage', grand_cargo: 'Grand Cargo',
  // Defenses
  rocket_launcher: 'Lanceur Missiles', light_laser: 'Laser Léger', heavy_laser: 'Laser Lourd',
  gauss_cannon: 'Canon Gauss', ion_cannon: 'Canon Ion', plasma_turret: 'Tourelle Plasma',
  small_shield: 'Bouclier Léger', large_shield: 'Bouclier Lourd',
  anti_missile: 'Missile Anti-Balistique', interplanetary_missile: 'Missile Interplanétaire',
};

function getLabel(key: string) { return LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// UI-05: getTimeLeft utilise l'offset serveur si disponible pour corriger le décalage d'horloge.
// L'offset est stocké dans serverTimeOffsetMsRef (mis à jour à la connexion WS).
function getTimeLeft(endTime: string | null | undefined, serverOffsetMs: number = 0) {
  if (!endTime) return 0;
  const end = new Date(endTime.endsWith('Z') ? endTime : endTime + 'Z').getTime();
  return Math.max(0, Math.floor((end - (Date.now() + serverOffsetMs)) / 1000));
}

interface ActiveBuild {
  key: string;
  name: string;
  endTime: string | null | undefined;
  quantity?: number;
  targetLevel?: number;
  cancelKey: string;
}

function getActiveBuilds(planet: any, category: string): ActiveBuild[] {
  if (!planet) return [];
  switch (category) {
    case 'research': {
      const newPath = (planet.research_queue || []).map((r: any) => ({
        key: r.tech_key,
        name: getLabel(r.tech_key),
        endTime: r.end_time,
        targetLevel: r.target_level,
        cancelKey: r.tech_key,
      }));
      const oldPath = (planet.constructions || [])
        .filter((c: any) => TECH_KEYS.includes(c.building_type))
        .map((c: any) => ({
          key: c.id,
          name: getLabel(c.building_type),
          endTime: c.end_time,
          targetLevel: c.level,
          cancelKey: c.id,
        }));
      return [...newPath, ...oldPath];
    }
    case 'ships':
      return (planet.ship_builds || []).map((s: any) => ({
        key: s.ship_key,
        name: s.name || getLabel(s.ship_key),
        endTime: s.build_end_time,
        quantity: s.building_count,
        cancelKey: s.ship_key,
      }));
    case 'defenses':
      return (planet.defense_builds || []).map((d: any) => ({
        key: d.defense_key,
        name: d.name || getLabel(d.defense_key),
        endTime: d.build_end_time,
        quantity: d.building_count,
        cancelKey: d.defense_key,
      }));
    case 'resources':
      return (planet.constructions || [])
        .filter((c: any) => RESOURCE_KEYS.includes(c.building_type))
        .map((c: any) => ({
          key: c.id,
          name: getLabel(c.building_type),
          endTime: c.end_time,
          targetLevel: c.level,
          cancelKey: c.id,
        }));
    case 'facilities':
      return (planet.constructions || [])
        .filter((c: any) => !RESOURCE_KEYS.includes(c.building_type) && !TECH_KEYS.includes(c.building_type))
        .map((c: any) => ({
          key: c.id,
          name: getLabel(c.building_type),
          endTime: c.end_time,
          targetLevel: c.level,
          cancelKey: c.id,
        }));
    default:
      return [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BuildQueueManager({ planetId, planet }: BuildQueueManagerProps) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('ships');
  const [removing, setRemoving] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [showActive, setShowActive] = useState(true);
  const [, setTick] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemoveItem, setPendingRemoveItem] = useState<QueueItem | null>(null);

  // Drag/drop state
  const dragItemId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  // UI-05: offset entre l'horloge serveur et Date.now() pour les calculs de timer.
  // Mis à jour lors de la réception de l'événement WS 'connected' qui contient server_time.
  const serverTimeOffsetMsRef = useRef<number>(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/build-queue`), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setStatus(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [planetId]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 10_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // UI-05: écouter l'événement WS 'connected' pour synchroniser l'horloge avec le serveur.
  // L'événement est dispatché par useWebSocket.ts avec server_time (timestamp ms UTC).
  useEffect(() => {
    const handleWsConnected = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.server_time === 'number') {
        serverTimeOffsetMsRef.current = detail.server_time - Date.now();
      }
    };
    window.addEventListener('ws-connected', handleWsConnected);
    return () => window.removeEventListener('ws-connected', handleWsConnected);
  }, []);

  // Tick every second to update countdowns
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleCancelActive = async (category: string, build: ActiveBuild) => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    let url = '';
    if (category === 'research') url = apiUrl(`/planets/${planetId}/cancel-research/${build.cancelKey}`);
    else if (category === 'ships')    url = apiUrl(`/planets/${planetId}/cancel-ship-build/${build.cancelKey}`);
    else if (category === 'defenses') url = apiUrl(`/planets/${planetId}/cancel-defense-build/${build.cancelKey}`);
    else url = apiUrl(`/planets/${planetId}/cancel-construction/${build.cancelKey}`);

    setCancelling(build.key);
    try {
      const res = await fetch(url, { method: 'DELETE', headers });
      if (res.ok) {
        const data = await res.json();
        const total = (data.refund_metal || 0) + (data.refund_crystal || 0) + (data.refund_deuterium || 0);
        toast.success('Annulé', {
          description: total > 0 ? `Remboursement: ${Math.floor(total).toLocaleString()} ressources (${Math.round((data.refund_ratio || 0) * 100)}%)` : undefined,
        });
        fetchStatus();
      } else if (res.status === 409) {
        toast.info('Déjà annulée', { description: 'Cette construction a déjà été annulée.' });
        fetchStatus();
      } else {
        toast.error('Impossible d\'annuler');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCancelling(null);
    }
  };

  const handleRemove = (item: QueueItem) => {
    setPendingRemoveItem(item);
    setConfirmOpen(true);
  };

  const doRemove = async (item: QueueItem) => {
    setRemoving(item.id);
    try {
      const res = await fetch(apiUrl(`/build-queue/${item.id}?planet_id=${planetId}`), { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        const r = data.refunded || {};
        const parts = [];
        if (r.metal     > 0) parts.push(`${Math.round(r.metal).toLocaleString()} métal`);
        if (r.crystal   > 0) parts.push(`${Math.round(r.crystal).toLocaleString()} cristal`);
        if (r.deuterium > 0) parts.push(`${Math.round(r.deuterium).toLocaleString()} deutérium`);
        toast.success(`Annulé${parts.length ? ` — Remboursé: ${parts.join(', ')}` : ''}`);
        fetchStatus();
      } else {
        toast.error('Impossible d\'annuler');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setRemoving(null);
    }
  };

  // ── Drag/drop handlers ─────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    dragItemId.current = itemId;
    setDragging(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverId.current = targetId;
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragItemId.current || dragItemId.current === targetId || !status) return;

    const items = status.pending_items
      .filter(i => i.category === activeCategory)
      .sort((a, b) => a.queue_position - b.queue_position);

    const fromIdx = items.findIndex(i => i.id === dragItemId.current);
    const toIdx   = items.findIndex(i => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Protection: same item_key must keep ascending target_level order
    const byKey: Record<string, QueueItem[]> = {};
    for (const item of reordered) {
      if (!byKey[item.item_key]) byKey[item.item_key] = [];
      byKey[item.item_key].push(item);
    }
    for (const group of Object.values(byKey)) {
      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1].target_level;
        const curr = group[i].target_level;
        if (prev != null && curr != null && curr < prev) {
          toast.error('Ordre invalide : impossible de placer un niveau supérieur avant un niveau inférieur pour le même élément.');
          return;
        }
      }
    }

    const orderedIds = reordered.map(i => i.id);

    // UI-04: sauvegarder l'état AVANT la mise à jour optimiste pour pouvoir revenir
    // en arrière si le serveur renvoie une erreur HTTP (pas seulement une erreur réseau).
    const previousStatus = status;

    // Optimistic update
    const updatedItems = status.pending_items.map(item => {
      const pos = orderedIds.indexOf(item.id);
      return pos !== -1 ? { ...item, queue_position: pos } : item;
    });
    setStatus(s => s ? { ...s, pending_items: updatedItems } : s);

    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/build-queue/reorder`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: activeCategory, ordered_ids: orderedIds }),
      });
      // UI-04: revert sur erreur HTTP (pas seulement sur exception réseau)
      if (!res.ok) {
        toast.error('Impossible de réorganiser la file');
        setStatus(previousStatus);
      }
    } catch {
      // UI-04: revert sur erreur réseau
      toast.error('Erreur réseau lors de la réorganisation');
      setStatus(previousStatus);
    }
  };

  const handleDragEnd = () => {
    dragItemId.current = null;
    dragOverId.current = null;
    setDragging(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  const cat = CATEGORIES.find(c => c.id === activeCategory)!;
  const colors = COLOR_CLASSES[cat.color];
  const catStatus: CategoryStatus | undefined = status?.categories[activeCategory];
  const pendingItems = (status?.pending_items || [])
    .filter(i => i.category === activeCategory)
    .sort((a, b) => a.queue_position - b.queue_position);
  const activeBuilds = getActiveBuilds(planet, activeCategory);
  const totalPending = (status?.pending_items || []).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {/* Section header */}
          <div className="flex items-center gap-2 mb-1 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-2">
              <Layers size={14} /> FILE DE CONSTRUCTION
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Gérez vos constructions en attente par catégorie. Glissez-déposez pour prioriser.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          className="border-cyan-500/10 text-slate-400 hover:text-slate-200 hover:border-cyan-500/30 gap-1"
        >
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      {/* Summary row — category tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {CATEGORIES.map(({ id, label, Icon, color }) => {
          const cs = status?.categories[id];
          const cnt = (status?.pending_items || []).filter(i => i.category === id).length;
          const cols = COLOR_CLASSES[color];
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => setActiveCategory(id as CategoryId)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                isActive
                  ? `${cols.bg} ${cols.border} ring-1 ring-offset-1 ring-offset-[rgba(10,5,32,0.85)] ${cols.border.replace('border-', 'ring-')}`
                  : 'bg-[rgba(10,5,32,0.85)] border-cyan-500/10 hover:border-cyan-500/30 hover:bg-cyan-500/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={14} className={isActive ? cols.text : 'text-slate-500'} />
                <span className={`text-xs font-medium ${isActive ? cols.text : 'text-slate-400'}`}>{label}</span>
              </div>
              {cs && (
                <>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: cs.slots_total }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < cs.slots_used ? cols.bg.replace('/10', '/50') : 'bg-cyan-500/5'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-slate-500">
                    {cs.slots_used}/{cs.slots_total} actif{cs.slots_used > 1 ? 's' : ''}
                    {cnt > 0 && <span className={`ml-1 ${cols.text}`}>+{cnt} en attente</span>}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Active builds toggle */}
      <div>
        <button
          onClick={() => setShowActive(!showActive)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-medium mb-2 transition-colors"
        >
          {showActive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Constructions actives — {cat.label}
          {catStatus && (
            <Badge variant="secondary" className={`text-xs ${colors.text}`}>
              {catStatus.slots_used} / {catStatus.slots_total} slot{catStatus.slots_total > 1 ? 's' : ''}
            </Badge>
          )}
        </button>

        {showActive && catStatus && (
          <Card className={`${colors.bg} border ${colors.border} bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px]`}>
            <CardContent className="p-4 space-y-2">
              {activeBuilds.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucune construction active dans cette catégorie.</p>
              ) : (
                activeBuilds.map((build) => {
                  const tl = getTimeLeft(build.endTime, serverTimeOffsetMsRef.current);
                  return (
                    <div key={build.key} className="flex items-center gap-3 bg-[rgba(0,245,255,0.05)] rounded-lg p-2.5 border border-cyan-500/10">
                      <CheckCircle2 size={14} className={`${colors.text} shrink-0 animate-pulse`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 text-sm font-medium truncate">{build.name}</span>
                          {build.targetLevel != null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors.badge}`}>→ niv. {build.targetLevel}</span>
                          )}
                          {build.quantity != null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors.badge}`}>×{build.quantity}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock size={10} className="text-slate-500" />
                          <span className="text-cyan-400 text-xs font-mono tabular-nums">{formatDuration(tl)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelActive(activeCategory, build)}
                        disabled={cancelling === build.key}
                        className="text-red-400/60 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-900/20 transition-colors shrink-0"
                        title="Annuler (remboursement au prorata)"
                      >
                        {cancelling === build.key
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <XCircle size={13} />}
                      </button>
                    </div>
                  );
                })
              )}
              {catStatus.slots_free > 0 && (
                <p className="text-slate-500 text-xs pt-1 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  {catStatus.slots_free} slot{catStatus.slots_free > 1 ? 's' : ''} libre{catStatus.slots_free > 1 ? 's' : ''}
                  {pendingItems.length > 0 ? ' — démarrage automatique en cours…' : ''}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-400 text-sm font-medium flex items-center gap-2">
            <Clock size={14} className={colors.text} />
            File d'attente — {cat.label}
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className={colors.text}>
                {pendingItems.length} élément{pendingItems.length > 1 ? 's' : ''}
              </Badge>
            )}
          </h3>
          <p className="text-slate-500 text-xs">Faites glisser pour réorganiser</p>
        </div>

        {pendingItems.length === 0 ? (
          <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px]">
            <CardContent className="p-8 text-center">
              <cat.Icon className="mx-auto text-slate-700 mb-3" size={36} />
              <p className="text-slate-500 text-sm">
                Aucun élément en attente dans cette catégorie.
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Les éléments s'ajoutent automatiquement depuis les écrans de construction
                quand tous les slots sont occupés.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingItems.map((item, idx) => {
              const isDragged = dragging === item.id;
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragOver={e => handleDragOver(e, item.id)}
                  onDrop={e => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${
                    isDragged
                      ? 'opacity-50 scale-95'
                      : 'bg-[rgba(10,5,32,0.85)] border-cyan-500/10 hover:border-cyan-500/30 hover:bg-cyan-500/5'
                  }`}
                >
                  {/* Drag handle */}
                  <GripVertical size={16} className="text-slate-600 shrink-0" />

                  {/* Position badge */}
                  <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${colors.badge}`}>
                    {idx + 1}
                  </span>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">
                      {formatItemLabel(item.category, item.item_key, item.quantity, item.target_level)}
                    </p>
                    <p className="text-slate-500 text-xs">
                      Ajouté le {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Category icon */}
                  <cat.Icon size={14} className={`${colors.text} shrink-0`} />

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={removing === item.id}
                    className="text-red-400/70 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-900/20 transition-colors shrink-0"
                    title="Annuler et rembourser"
                  >
                    {removing === item.id
                      ? <RefreshCw size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Global summary */}
      {totalPending > 0 && (
        <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px]">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <p className="text-slate-400 text-xs">
              {totalPending} élément{totalPending > 1 ? 's' : ''} en attente au total.
              Les constructions démarrent automatiquement dès qu'un slot se libère dans leur catégorie.
            </p>
          </CardContent>
        </Card>
      )}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Annuler la construction"
        message={pendingRemoveItem
          ? `Annuler "${formatItemLabel(pendingRemoveItem.category, pendingRemoveItem.item_key, pendingRemoveItem.quantity, pendingRemoveItem.target_level)}" ? Les ressources seront remboursées.`
          : 'Confirmer l\'annulation ?'}
        variant="danger"
        confirmLabel="Annuler la construction"
        cancelLabel="Garder"
        onConfirm={() => {
          if (pendingRemoveItem) doRemove(pendingRemoveItem);
          setConfirmOpen(false);
          setPendingRemoveItem(null);
        }}
        onCancel={() => { setConfirmOpen(false); setPendingRemoveItem(null); }}
      />
    </div>
  );
}

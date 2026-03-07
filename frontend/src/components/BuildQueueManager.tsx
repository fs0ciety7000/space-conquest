import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers, FlaskConical, Rocket, Shield, Pickaxe, Building2,
  Trash2, RefreshCw, GripVertical, Clock, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';

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
  { id: 'research',  label: 'Recherche',    Icon: FlaskConical, color: 'indigo' },
  { id: 'ships',     label: 'Vaisseaux',    Icon: Rocket,       color: 'sky'    },
  { id: 'defenses',  label: 'Défenses',     Icon: Shield,       color: 'emerald'},
  { id: 'resources', label: 'Ressources',   Icon: Pickaxe,      color: 'amber'  },
  { id: 'facilities',label: 'Installations',Icon: Building2,    color: 'violet' },
] as const;

type CategoryId = 'research' | 'ships' | 'defenses' | 'resources' | 'facilities';

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  indigo:  { bg: 'bg-indigo-600/20',  border: 'border-indigo-500/50', text: 'text-indigo-300',  badge: 'bg-indigo-900/40 text-indigo-300'  },
  sky:     { bg: 'bg-sky-600/20',     border: 'border-sky-500/50',    text: 'text-sky-300',     badge: 'bg-sky-900/40 text-sky-300'        },
  emerald: { bg: 'bg-emerald-600/20', border: 'border-emerald-500/50',text: 'text-emerald-300', badge: 'bg-emerald-900/40 text-emerald-300'},
  amber:   { bg: 'bg-amber-600/20',   border: 'border-amber-500/50',  text: 'text-amber-300',   badge: 'bg-amber-900/40 text-amber-300'    },
  violet:  { bg: 'bg-violet-600/20',  border: 'border-violet-500/50', text: 'text-violet-300',  badge: 'bg-violet-900/40 text-violet-300'  },
};

function formatItemLabel(category: string, item_key: string, quantity: number, target_level: number | null): string {
  const key = item_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (category === 'ships') return `${quantity}× ${key}`;
  if (category === 'defenses') return `${quantity}× ${key}`;
  if (target_level != null) return `${key} → niv. ${target_level}`;
  return key;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BuildQueueManager({ planetId }: BuildQueueManagerProps) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('ships');
  const [removing, setRemoving] = useState<string | null>(null);
  const [showActive, setShowActive] = useState(true);

  // Drag/drop state
  const dragItemId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/build-queue`));
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

  const handleRemove = async (item: QueueItem) => {
    if (!confirm(`Annuler "${formatItemLabel(item.category, item.item_key, item.quantity, item.target_level)}" ? Les ressources seront remboursées.`)) return;
    setRemoving(item.id);
    try {
      const res = await fetch(apiUrl(`/build-queue/${item.id}?planet_id=${planetId}`), { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        const r = data.refunded || {};
        const parts = [];
        if (r.metal > 0) parts.push(`${Math.round(r.metal).toLocaleString()} métal`);
        if (r.crystal > 0) parts.push(`${Math.round(r.crystal).toLocaleString()} cristal`);
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
    const toIdx = items.findIndex(i => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const orderedIds = reordered.map(i => i.id);

    // Optimistic update
    const updatedItems = status.pending_items.map(item => {
      const pos = orderedIds.indexOf(item.id);
      return pos !== -1 ? { ...item, queue_position: pos } : item;
    });
    setStatus(s => s ? { ...s, pending_items: updatedItems } : s);

    try {
      await fetch(apiUrl(`/planets/${planetId}/build-queue/reorder`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: activeCategory, ordered_ids: orderedIds }),
      });
    } catch {
      fetchStatus(); // revert on error
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
        <RefreshCw className="animate-spin text-indigo-400" size={32} />
      </div>
    );
  }

  const cat = CATEGORIES.find(c => c.id === activeCategory)!;
  const colors = COLOR_CLASSES[cat.color];
  const catStatus: CategoryStatus | undefined = status?.categories[activeCategory];
  const pendingItems = (status?.pending_items || [])
    .filter(i => i.category === activeCategory)
    .sort((a, b) => a.queue_position - b.queue_position);

  const totalPending = (status?.pending_items || []).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="text-indigo-400" size={28} /> File de Construction
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Gérez vos constructions en attente par catégorie. Glissez-déposez pour prioriser.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          className="border-slate-600 text-slate-400 hover:text-white gap-1"
        >
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      {/* Summary row */}
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
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? `${cols.bg} ${cols.border} ring-1 ring-offset-1 ring-offset-slate-950 ${cols.border.replace('border-', 'ring-')}`
                  : 'bg-slate-900/40 border-slate-700/30 hover:border-slate-600/50'
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
                          i < cs.slots_used ? cols.bg.replace('/20', '/60') : 'bg-slate-700/50'
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
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
              {catStatus.slots_used} / {catStatus.slots_total} slot{catStatus.slots_total > 1 ? 's' : ''}
            </span>
          )}
        </button>

        {showActive && catStatus && (
          <Card className={`${colors.bg.replace('/20', '/10')} border ${colors.border.replace('/50', '/20')}`}>
            <CardContent className="p-4">
              {catStatus.slots_used === 0 ? (
                <p className="text-slate-500 text-sm">Aucune construction active dans cette catégorie.</p>
              ) : (
                <div className="space-y-1">
                  {Array.from({ length: catStatus.slots_used }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className={colors.text} />
                      <div className={`h-1.5 w-full rounded-full bg-slate-700/50 overflow-hidden`}>
                        <div className={`h-full ${colors.bg.replace('/20', '/60')} animate-pulse rounded-full`} style={{ width: '60%' }} />
                      </div>
                      <span className="text-slate-400 text-xs whitespace-nowrap">Slot {i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
              {catStatus.slots_free > 0 && (
                <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
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
          <h3 className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Clock size={14} className={colors.text} />
            File d'attente — {cat.label}
            {pendingItems.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                {pendingItems.length} élément{pendingItems.length > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          <p className="text-slate-500 text-xs">Faites glisser pour réorganiser</p>
        </div>

        {pendingItems.length === 0 ? (
          <Card className="bg-slate-900/30 border border-slate-700/20">
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
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                    isDragged
                      ? 'opacity-50 scale-95'
                      : `bg-slate-900/50 border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-900/70`
                  }`}
                >
                  {/* Drag handle */}
                  <GripVertical size={16} className="text-slate-600 flex-shrink-0" />

                  {/* Position badge */}
                  <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${colors.badge}`}>
                    {idx + 1}
                  </span>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {formatItemLabel(item.category, item.item_key, item.quantity, item.target_level)}
                    </p>
                    <p className="text-slate-500 text-xs">
                      Ajouté le {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Category icon */}
                  <cat.Icon size={14} className={`${colors.text} flex-shrink-0`} />

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={removing === item.id}
                    className="text-red-400/70 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-900/20 transition-colors flex-shrink-0"
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
        <Card className="bg-slate-900/20 border border-slate-700/20">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-slate-400 text-xs">
              {totalPending} élément{totalPending > 1 ? 's' : ''} en attente au total.
              Les constructions démarrent automatiquement dès qu'un slot se libère dans leur catégorie.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

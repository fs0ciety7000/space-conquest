import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  MiniMap,
  ReactFlowInstance,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap, Target, Eye, Microscope, Lock, CheckCircle2,
  Clock, Box, Gem, Droplets, Shield, Cpu, Atom,
  Rocket, Gauge, Orbit, Telescope, Loader2, Timer
} from "lucide-react";
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';
import { formatTimeUntil, formatDuration } from '@/lib/utils';
import dagre from '@dagrejs/dagre';

interface TechTreeVisualProps {
  planet: any;
  onUpdate: () => void;
}

interface TechInfo {
  id: number;
  tech_key: string;
  display_name: string;
  description: string | null;
  base_cost_metal: number;
  base_cost_crystal: number;
  base_cost_deuterium: number;
  base_time_seconds: number;
  cost_multiplier: number;
  current_level: number;
  next_level_time_seconds?: number;
  requirements: Array<{
    required_tech_key: string;
    required_tech_name: string;
    required_level: number;
    current_level: number;
    met: boolean;
  }>;
}

// Node dimensions used by dagre for layout computation
const NODE_WIDTH = 240;
const NODE_HEIGHT = 300;

// --------------------------------------------------------------------------
// Dagre layout helper
// --------------------------------------------------------------------------
const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  nodeWidth = NODE_WIDTH,
  nodeHeight = NODE_HEIGHT,
): { nodes: Node[]; edges: Edge[] } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const positioned = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: positioned.x - nodeWidth / 2,
        y: positioned.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --------------------------------------------------------------------------
// Visual configuration per tech key
// --------------------------------------------------------------------------
const getTechConfig = (tech_key: string) => {
  const configs: Record<string, { icon: any; color: string; hexColor: string; border: string; bg: string; category: string }> = {
    energy_tech:      { icon: Zap,        color: 'text-yellow-400',  hexColor: '#facc15', border: 'border-yellow-500/30',  bg: 'bg-yellow-500/5',  category: 'Base' },
    laser_tech:       { icon: Target,     color: 'text-red-400',     hexColor: '#f87171', border: 'border-red-500/20',     bg: 'bg-red-500/5',     category: 'Base' },
    espionage_tech:   { icon: Eye,        color: 'text-emerald-400', hexColor: '#34d399', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', category: 'Base' },
    armour_tech:      { icon: Shield,     color: 'text-slate-300',   hexColor: '#94a3b8', border: 'border-cyan-500/10',    bg: 'bg-cyan-500/5',    category: 'Base' },
    ion_tech:         { icon: Atom,       color: 'text-cyan-400',    hexColor: '#22d3ee', border: 'border-cyan-500/30',    bg: 'bg-cyan-500/5',    category: 'Advanced' },
    plasma_tech:      { icon: Zap,        color: 'text-pink-400',    hexColor: '#f472b6', border: 'border-pink-500/20',    bg: 'bg-pink-500/5',    category: 'Advanced' },
    shield_tech:      { icon: Shield,     color: 'text-blue-400',    hexColor: '#60a5fa', border: 'border-blue-500/20',    bg: 'bg-blue-500/5',    category: 'Advanced' },
    weapons_tech:     { icon: Target,     color: 'text-orange-400',  hexColor: '#fb923c', border: 'border-red-500/20',     bg: 'bg-red-500/5',     category: 'Advanced' },
    computer_tech:    { icon: Cpu,        color: 'text-purple-400',  hexColor: '#c084fc', border: 'border-purple-500/30',  bg: 'bg-purple-500/5',  category: 'Advanced' },
    combustion_drive: { icon: Rocket,     color: 'text-amber-400',   hexColor: '#fbbf24', border: 'border-amber-500/30',   bg: 'bg-amber-500/5',   category: 'Propulsion' },
    impulse_drive:    { icon: Gauge,      color: 'text-purple-400',  hexColor: '#a78bfa', border: 'border-purple-500/30',  bg: 'bg-purple-500/5',  category: 'Propulsion' },
    hyperspace_drive: { icon: Orbit,      color: 'text-violet-400',  hexColor: '#a78bfa', border: 'border-purple-500/30',  bg: 'bg-purple-500/5',  category: 'Propulsion' },
    astrophysics:     { icon: Telescope,  color: 'text-teal-400',    hexColor: '#2dd4bf', border: 'border-cyan-500/30',    bg: 'bg-cyan-500/5',    category: 'Science' },
  };

  return configs[tech_key] || {
    icon: Microscope, color: 'text-slate-400', hexColor: '#94a3b8',
    border: 'border-cyan-500/10', bg: 'bg-cyan-500/5', category: 'Other',
  };
};

const getTechGainPerLevel = (tech_key: string): string => {
  const gains: Record<string, string> = {
    energy_tech:       '+10% production des mines',
    laser_tech:        '+5% attaque / prérequis armes avancées',
    armour_tech:       '+10% points de coque',
    espionage_tech:    '+1 couche de données espionnage',
    ion_tech:          '+3% attaque / prérequis moteurs avancés',
    plasma_tech:       '+1% production ressources/niveau',
    shield_tech:       '+10% bouclier des vaisseaux',
    weapons_tech:      '+10% attaque globale',
    computer_tech:     '+10% cargo transporteurs/niveau',
    combustion_drive:  '+10% vitesse (chasseurs légers)',
    impulse_drive:     '+20% vitesse (croiseurs)',
    hyperspace_drive:  '+30% vitesse (battleships)',
    astrophysics:      '+1 slot de colonie',
    graviton_tech:     'Perturbe les rapports espions adverses',
  };
  return gains[tech_key] || '+1 niveau';
};

const calculateNextLevelCost = (tech: TechInfo) => {
  const level = tech.current_level;
  const multiplier = tech.cost_multiplier;
  return {
    metal:     Math.ceil(tech.base_cost_metal     * Math.pow(multiplier, level)),
    crystal:   Math.ceil(tech.base_cost_crystal   * Math.pow(multiplier, level)),
    deuterium: Math.ceil(tech.base_cost_deuterium * Math.pow(multiplier, level)),
  };
};

// --------------------------------------------------------------------------
// Framer Motion variants
// --------------------------------------------------------------------------
const nodeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  show:   { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
};

// --------------------------------------------------------------------------
// TechNode — custom React Flow node component
// The wrapper div uses `zIndex: 0` so the SVG edges (rendered at z-index 0
// by React Flow) are NOT obscured by the card's opaque background.
// --------------------------------------------------------------------------
const TechNode = ({ data }: { data: any }) => {
  const config = getTechConfig(data.tech_key);
  const Icon = config.icon;
  const isLocked = !data.allRequirementsMet;
  const isResearching = data.isResearching;
  const canAfford = data.canAfford;

  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (isResearching && data.researchEndTime) {
      const updateTimer = () => setTimeRemaining(formatTimeUntil(data.researchEndTime));
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [isResearching, data.researchEndTime]);

  const nodeStateClass = isResearching
    ? 'border-amber-500/40 bg-amber-500/5'
    : isLocked
      ? 'border-slate-700/30 opacity-50'
      : data.current_level > 0
        ? 'border-emerald-500/40 bg-emerald-500/5'
        : `${config.border} bg-cyan-500/5 hover:border-cyan-500/50`;

  return (
    <div style={{ position: 'relative' }}>
      {/* Invisible handles — required for React Flow to draw edges at card boundaries */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, width: 10, height: 10, border: 'none', background: 'transparent' }}
      />
      <motion.div variants={nodeVariants} initial="hidden" animate="show">
        <Card className={`
          relative overflow-hidden w-[220px] min-h-[240px] transition-all duration-300
          bg-[rgba(16,8,46,0.95)] backdrop-blur-[20px]
          border ${nodeStateClass}
          ${!isLocked && !isResearching ? 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer hover:scale-105' : ''}
          ${!isLocked && canAfford ? 'shadow-lg shadow-cyan-500/20' : ''}
          card-depth
        `}>
          {/* Glow layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <div className={`absolute top-0 right-0 w-24 h-24 ${config.bg} blur-3xl`}></div>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </div>

          <CardContent className="p-3 relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.bg} border ${config.border}`}>
                  {isLocked ? (
                    <Lock size={20} className="text-slate-600" />
                  ) : (
                    <Icon size={20} className={config.color} />
                  )}
                </div>
                <div>
                  <div className={`text-sm font-semibold uppercase tracking-wider ${config.color}`}>
                    {data.display_name}
                  </div>
                  <div className="text-[10px] text-slate-500">{config.category}</div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                {data.current_level > 0 ? (
                  <Badge variant="purple">Nv. {data.current_level}</Badge>
                ) : (
                  <Badge variant="secondary">Nv. 0</Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {data.description && (
              <div className="text-[9px] text-slate-400 italic mb-2 line-clamp-2">
                {data.description}
              </div>
            )}

            {/* En cours de recherche */}
            {isResearching && (
              <div className="mb-3 bg-amber-500/5 border border-amber-500/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={12} className="text-amber-400 animate-spin" />
                  <span className="text-[10px] text-amber-400 font-bold">Recherche en cours...</span>
                </div>
                {data.researchEndTime && (
                  <div className="flex items-center gap-2 bg-amber-500/10 rounded px-2 py-1.5">
                    <Timer size={14} className="text-amber-300" />
                    <span className="text-sm font-mono font-bold text-amber-200">{timeRemaining}</span>
                  </div>
                )}
              </div>
            )}

            {/* Prérequis non satisfaits */}
            {isLocked && data.requirements.length > 0 && (
              <div className="mb-3 bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-lg p-2">
                <div className="text-[9px] text-red-400 font-bold mb-1">Prérequis :</div>
                {data.requirements.filter((r: any) => !r.met).map((req: any, idx: number) => (
                  <div key={idx} className="text-[8px] text-slate-400 flex items-center gap-1">
                    <Lock size={8} className="text-red-500" />
                    {req.required_tech_name} Niv. {req.required_level} (actuel: {req.current_level})
                  </div>
                ))}
              </div>
            )}

            {/* Prérequis satisfaits */}
            {!isLocked && data.requirements.length > 0 && (
              <div className="mb-3 bg-[rgba(10,5,32,0.85)] border border-emerald-500/20 rounded-lg p-2">
                <div className="text-[9px] text-emerald-400 font-bold mb-1">Prérequis OK :</div>
                {data.requirements.map((req: any, idx: number) => (
                  <div key={idx} className="text-[8px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 size={8} className="text-emerald-500" />
                    {req.required_tech_name} Niv. {req.required_level}
                  </div>
                ))}
              </div>
            )}

            {/* Coûts */}
            {!isLocked && !isResearching && data.cost && (
              <div className="space-y-1 mb-3">
                {data.cost.metal > 0 && (
                  <div className="flex justify-between items-center text-[10px] bg-[rgba(10,5,32,0.85)] px-2 py-1 rounded border border-cyan-500/10">
                    <span className="text-orange-400 flex items-center gap-1">
                      <Box size={10} /> Métal
                    </span>
                    <span className={`font-mono font-bold tabular-nums text-xs ${data.metal >= data.cost.metal ? 'text-cyan-400' : 'text-red-500'}`}>
                      {data.cost.metal.toLocaleString()}
                    </span>
                  </div>
                )}
                {data.cost.crystal > 0 && (
                  <div className="flex justify-between items-center text-[10px] bg-[rgba(10,5,32,0.85)] px-2 py-1 rounded border border-cyan-500/10">
                    <span className="text-cyan-400 flex items-center gap-1">
                      <Gem size={10} /> Cristal
                    </span>
                    <span className={`font-mono font-bold tabular-nums text-xs ${data.crystal >= data.cost.crystal ? 'text-cyan-400' : 'text-red-500'}`}>
                      {data.cost.crystal.toLocaleString()}
                    </span>
                  </div>
                )}
                {data.cost.deuterium > 0 && (
                  <div className="flex justify-between items-center text-[10px] bg-[rgba(10,5,32,0.85)] px-2 py-1 rounded border border-cyan-500/10">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Droplets size={10} /> Deutérium
                    </span>
                    <span className={`font-mono font-bold tabular-nums text-xs ${data.deuterium >= data.cost.deuterium ? 'text-cyan-400' : 'text-red-500'}`}>
                      {data.cost.deuterium.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Temps de recherche + gain */}
            {!isLocked && !isResearching && (
              <div className="space-y-1 mb-3">
                {data.next_level_time_seconds && (
                  <div className="flex justify-between items-center text-[10px] bg-[rgba(10,5,32,0.85)] px-2 py-1 rounded border border-cyan-500/10">
                    <span className="text-purple-400 flex items-center gap-1">
                      <Clock size={10} /> Durée
                    </span>
                    <span className="font-mono font-bold tabular-nums text-xs text-purple-300">
                      {formatDuration(data.next_level_time_seconds)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[10px] bg-[rgba(10,5,32,0.85)] px-2 py-1 rounded border border-cyan-500/10">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Gain Niv. {data.current_level + 1}
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-300">
                    {getTechGainPerLevel(data.tech_key)}
                  </span>
                </div>
              </div>
            )}

            {/* Barre de progression (en cours) */}
            {isResearching && (
              <Progress variant="default" value={50} className="mb-3" />
            )}

            {/* Bouton d'action */}
            {!isLocked && !isResearching && (
              <Button
                onClick={data.onResearch}
                disabled={!canAfford}
                className={`w-full h-8 text-[10px] font-black uppercase tracking-wider ${
                  !canAfford
                    ? 'bg-[rgba(10,5,32,0.85)] text-slate-500 border border-cyan-500/10'
                    : 'bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30'
                }`}
              >
                {canAfford ? `Rechercher Niv. ${data.current_level + 1}` : 'Ressources Manquantes'}
              </Button>
            )}

            {isLocked && (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Lock size={12} />
                <span>Verrouillé</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      {/* Source handle at bottom — edges leave from here toward child nodes */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, width: 10, height: 10, border: 'none', background: 'transparent' }}
      />
    </div>
  );
};

const nodeTypes = {
  techNode: TechNode,
};

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------
export default function TechTreeVisual({ planet, onUpdate }: TechTreeVisualProps) {
  const [techTree, setTechTree] = useState<TechInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // React Flow instance ref — used to call fitView after layout
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const researchQueue = planet.research_queue || [];
  const metal    = planet.metal_amount    ?? 0;
  const crystal  = planet.crystal_amount  ?? 0;
  const deuterium = planet.deuterium_amount ?? 0;

  // React Flow state — initialise empty, populated by useEffect below
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch tech tree
  useEffect(() => {
    const fetchTechTree = async () => {
      try {
        const res = await fetch(apiUrl(`/planets/${planet.id}/tech-tree`), {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTechTree(data.technologies || []);
        }
      } catch (e) {
        console.error('Error fetching tech tree:', e);
        toast.error("Erreur lors du chargement de l'arbre technologique");
      } finally {
        setLoading(false);
      }
    };
    fetchTechTree();
  }, [planet.id]);

  // Stable research handler — wrapped in useCallback so it doesn't re-trigger
  // the layout effect unnecessarily.
  const handleResearch = useCallback(async (tech_key: string) => {
    const token = localStorage.getItem('token');
    const tech = techTree.find(t => t.tech_key === tech_key);
    const targetLevel = tech ? tech.current_level + 1 : undefined;
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/upgrade/${tech_key}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Recherche lancée !');
        onUpdate();
      } else if (res.status === 409) {
        const qRes = await fetch(apiUrl(`/planets/${planet.id}/build-queue`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'research', item_key: tech_key, target_level: targetLevel }),
        });
        if (qRes.ok) {
          toast.success("Recherche en file d'attente");
          onUpdate();
        } else {
          const data = await qRes.json();
          toast.error(data.error || 'Erreur lors de la mise en file');
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors du lancement de la recherche');
      }
    } catch (e) {
      toast.error('Erreur de connexion');
      console.error(e);
    }
  }, [planet.id, techTree, onUpdate]);

  // Build nodes + edges and run dagre layout whenever the data changes.
  // This avoids the useMemo/useNodesState initialisation timing race.
  useEffect(() => {
    if (!techTree.length) return;

    // --- Build raw nodes (position placeholder, dagre will overwrite) ---
    const rawNodes: Node[] = techTree.map((tech) => {
      const researchingItem = researchQueue.find((r: any) => r.tech_key === tech.tech_key);
      const isResearching   = !!researchingItem;
      const researchEndTime = researchingItem?.end_time ?? null;
      const cost            = calculateNextLevelCost(tech);
      const canAfford       = metal >= cost.metal && crystal >= cost.crystal && deuterium >= cost.deuterium;
      const allRequirementsMet = tech.requirements.every(r => r.met);

      const selectedTech = selectedNodeId ? techTree.find(t => t.tech_key === selectedNodeId) : null;
      const isMissingReqForSelected =
        selectedTech &&
        !selectedTech.requirements.every(r => r.met) &&
        selectedTech.requirements.some(r => r.required_tech_key === tech.tech_key && !r.met);

      return {
        id:        tech.tech_key,
        type:      'techNode',
        position:  { x: 0, y: 0 }, // dagre will set real positions
        className: isMissingReqForSelected
          ? 'animate-pulse ring-4 ring-red-500 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.6)]'
          : '',
        style: { width: NODE_WIDTH },
        data: {
          ...tech,
          isResearching,
          researchEndTime,
          canAfford,
          allRequirementsMet,
          cost,
          metal,
          crystal,
          deuterium,
          onResearch: () => handleResearch(tech.tech_key),
        },
      };
    });

    // --- Build raw edges ---
    const rawEdges: Edge[] = [];
    techTree.forEach(tech => {
      tech.requirements.forEach(req => {
        const sourceLevel     = techTree.find(t => t.tech_key === req.required_tech_key)?.current_level ?? 0;
        const isSourceUnlocked = sourceLevel > 0;
        const isHighlighted   = selectedNodeId === tech.tech_key && !req.met;

        // Color scale: unlocked = green, met (but level 0) = blue, unmet = red
        const edgeColor = isHighlighted
          ? '#ef4444'
          : isSourceUnlocked
            ? '#22c55e'
            : req.met
              ? '#60a5fa'
              : '#ef4444';

        rawEdges.push({
          id:     `edge-${req.required_tech_key}-${tech.tech_key}`,
          source: req.required_tech_key,
          target: tech.tech_key,
          type:   'smoothstep',
          animated: isSourceUnlocked,
          style: {
            stroke:      edgeColor,
            strokeWidth: isHighlighted ? 6 : 3,
            opacity:     isHighlighted ? 1.0 : 0.85,
          },
          markerEnd: {
            type:   MarkerType.ArrowClosed,
            color:  edgeColor,
            width:  16,
            height: 16,
          },
          // Ensure edges render above node backgrounds
          zIndex: 10,
        });
      });
    });

    // --- Apply dagre layout ---
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Call fitView after React has painted the new positions
    setTimeout(() => {
      rfInstanceRef.current?.fitView({ padding: 0.1, duration: 400 });
    }, 50);
  }, [techTree, researchQueue, metal, crystal, deuterium, selectedNodeId, handleResearch]);

  // ------------------------------------------------------------------

  if (loading) {
    return (
      <div className="h-screen bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] overflow-hidden flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Vue liste sur mobile
  if (isMobile) {
    return (
      <div className="p-4 space-y-3 overflow-y-auto h-full">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Arbre Technologique</h2>
        <div className="grid grid-cols-1 gap-3">
          {techTree.map(tech => {
            const meta = getTechConfig(tech.tech_key);
            const Icon = meta.icon;
            const researchingItem = researchQueue.find((r: any) => r.tech_key === tech.tech_key);
            const isResearching   = !!researchingItem;
            const canResearch     = tech.requirements.every(r => r.met) && !isResearching;
            return (
              <button
                key={tech.tech_key}
                onClick={() => handleResearch(tech.tech_key)}
                disabled={!canResearch && !isResearching}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all min-h-[64px]
                  ${isResearching     ? 'border-yellow-500/50 bg-yellow-500/10' : ''}
                  ${canResearch && !isResearching ? 'border-slate-600/50 bg-slate-800/50 hover:border-slate-500' : ''}
                  ${!canResearch && !isResearching ? 'border-slate-700/30 bg-slate-900/30 opacity-60' : ''}
                `}
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${meta.bg} border ${meta.border}`}>
                  <Icon size={18} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 truncate">{tech.display_name}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0">Nv.{tech.current_level}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{getTechGainPerLevel(tech.tech_key)}</p>
                </div>
                {isResearching  && <span className="text-xs text-yellow-400 flex-shrink-0">En cours</span>}
                {canResearch && !isResearching && <span className="text-xs text-slate-400 flex-shrink-0">Rechercher</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[rgba(10,5,32,0.85)] overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        onInit={(instance) => { rfInstanceRef.current = instance; }}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        className="bg-transparent"
        proOptions={{ hideAttribution: true }}
        // elevateEdgesOnSelect ensures edges appear above their default layer
        elevateEdgesOnSelect
      >
        <Controls
          className="bg-[rgba(16,8,46,0.95)] border-purple-500/30 backdrop-blur-[20px] rounded-lg"
          showInteractive={false}
        />

        {/* Pinch-to-zoom hint — touch screens only */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 sm:hidden pointer-events-none">
          <div className="bg-[rgba(16,8,46,0.95)] border border-purple-500/30 rounded-full px-4 py-1.5 text-[10px] text-purple-300 font-bold backdrop-blur-[20px] whitespace-nowrap">
            Pince pour zoomer · Glisser pour naviguer
          </div>
        </div>

        {/* MiniMap — hidden on mobile */}
        <div className="hidden sm:block">
          <MiniMap
            className="bg-[rgba(16,8,46,0.95)] border border-purple-500/30 rounded-lg backdrop-blur-[20px]"
            nodeColor={(node) => {
              const config = getTechConfig(node.id);
              return node.data.allRequirementsMet ? config.hexColor : '#dc2626';
            }}
            maskColor="rgba(10, 5, 32, 0.9)"
            style={{ backgroundColor: 'rgba(10, 5, 32, 0.85)' }}
          />
        </div>
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[rgba(16,8,46,0.95)] backdrop-blur-[20px] border border-cyan-500/10 rounded-lg p-3 text-xs z-10">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
          <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-purple-400 to-transparent flex-shrink-0" />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-purple-500/70">TECHNOLOGIES</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/40"></div>
            <span className="text-slate-200">Technologie débloquée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-cyan-500/30 bg-cyan-500/5"></div>
            <span className="text-slate-200">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-slate-700/30 opacity-50"></div>
            <span className="text-slate-200">Verrouillée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-emerald-500"></div>
            <span className="text-slate-200">Dépendance débloquée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-400"></div>
            <span className="text-slate-200">Dépendance satisfaite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span className="text-slate-200">Dépendance manquante</span>
          </div>
        </div>
      </div>

      {/* Bouton retour mobile */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-full text-sm text-slate-300 shadow-lg"
        >
          ← Retour
        </button>
      </div>
    </div>
  );
}

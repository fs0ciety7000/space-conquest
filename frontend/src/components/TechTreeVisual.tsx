import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  MiniMap,
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
  requirements: Array<{
    required_tech_key: string;
    required_tech_name: string;
    required_level: number;
    current_level: number;
    met: boolean;
  }>;
}

// Configuration visuelle des technologies
const getTechConfig = (tech_key: string) => {
  const configs: Record<string, { icon: any; color: string; hexColor: string; border: string; bg: string; category: string }> = {
    // Base Technologies
    energy_tech: { icon: Zap, color: 'text-yellow-400', hexColor: '#facc15', border: 'border-yellow-500/50', bg: 'bg-yellow-950/30', category: 'Base' },
    laser_tech: { icon: Target, color: 'text-red-400', hexColor: '#f87171', border: 'border-red-500/50', bg: 'bg-red-950/30', category: 'Base' },
    espionage_tech: { icon: Eye, color: 'text-emerald-400', hexColor: '#34d399', border: 'border-emerald-500/50', bg: 'bg-emerald-950/30', category: 'Base' },
    armour_tech: { icon: Shield, color: 'text-slate-400', hexColor: '#94a3b8', border: 'border-slate-500/50', bg: 'bg-slate-950/30', category: 'Base' },

    // Advanced Technologies
    ion_tech: { icon: Atom, color: 'text-cyan-400', hexColor: '#22d3ee', border: 'border-cyan-500/50', bg: 'bg-cyan-950/30', category: 'Advanced' },
    plasma_tech: { icon: Zap, color: 'text-pink-400', hexColor: '#f472b6', border: 'border-pink-500/50', bg: 'bg-pink-950/30', category: 'Advanced' },
    shield_tech: { icon: Shield, color: 'text-blue-400', hexColor: '#60a5fa', border: 'border-blue-500/50', bg: 'bg-blue-950/30', category: 'Advanced' },
    weapons_tech: { icon: Target, color: 'text-orange-400', hexColor: '#fb923c', border: 'border-orange-500/50', bg: 'bg-orange-950/30', category: 'Advanced' },
    computer_tech: { icon: Cpu, color: 'text-purple-400', hexColor: '#c084fc', border: 'border-purple-500/50', bg: 'bg-purple-950/30', category: 'Advanced' },

    // Propulsion
    combustion_drive: { icon: Rocket, color: 'text-amber-400', hexColor: '#fbbf24', border: 'border-amber-500/50', bg: 'bg-amber-950/30', category: 'Propulsion' },
    impulse_drive: { icon: Gauge, color: 'text-indigo-400', hexColor: '#818cf8', border: 'border-indigo-500/50', bg: 'bg-indigo-950/30', category: 'Propulsion' },
    hyperspace_drive: { icon: Orbit, color: 'text-violet-400', hexColor: '#a78bfa', border: 'border-violet-500/50', bg: 'bg-violet-950/30', category: 'Propulsion' },
    astrophysics: { icon: Telescope, color: 'text-teal-400', hexColor: '#2dd4bf', border: 'border-teal-500/50', bg: 'bg-teal-950/30', category: 'Science' },
  };

  return configs[tech_key] || { icon: Microscope, color: 'text-gray-400', hexColor: '#9ca3af', border: 'border-gray-500/50', bg: 'bg-gray-950/30', category: 'Other' };
};

// Calcul du coût pour le prochain niveau
const calculateNextLevelCost = (tech: TechInfo) => {
  const level = tech.current_level;
  const multiplier = tech.cost_multiplier;

  return {
    metal: Math.ceil(tech.base_cost_metal * Math.pow(multiplier, level)),
    crystal: Math.ceil(tech.base_cost_crystal * Math.pow(multiplier, level)),
    deuterium: Math.ceil(tech.base_cost_deuterium * Math.pow(multiplier, level)),
  };
};

// Fonction pour formater le temps restant
const formatTimeRemaining = (endTimeStr: string, now: number): string => {
  const endTime = new Date(endTimeStr).getTime();
  const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

  if (remaining <= 0) return "Terminé";

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};

// Composant personnalisé pour chaque noeud technologique
const TechNode = ({ data }: { data: any }) => {
  const config = getTechConfig(data.tech_key);
  const Icon = config.icon;
  const isLocked = !data.allRequirementsMet;
  const isResearching = data.isResearching;
  const canAfford = data.canAfford;

  // State pour le temps restant avec mise à jour chaque seconde
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (isResearching && data.researchEndTime) {
      const updateTimer = () => {
        setTimeRemaining(formatTimeRemaining(data.researchEndTime, Date.now()));
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [isResearching, data.researchEndTime]);

  return (
    <Card className={`
      relative overflow-hidden w-[280px] min-h-[320px] transition-all duration-300
      ${isLocked
        ? 'bg-red-950/20 border-red-900/50 opacity-70'
        : `bg-slate-950 border ${config.border}`
      }
      ${!isLocked && !isResearching ? 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer hover:scale-105' : ''}
      ${!isLocked && canAfford ? 'shadow-lg shadow-cyan-500/20' : ''}
      card-depth
    `}>
      {/* Effet de glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className={`absolute top-0 right-0 w-24 h-24 ${isLocked ? 'bg-red-900/30' : config.bg} blur-3xl`}></div>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        {isLocked && (
          <div className="absolute inset-0 bg-red-900/10"></div>
        )}
      </div>

      <CardContent className="p-4 relative z-10">
        {/* Header avec icône et niveau */}
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
              <div className={`text-xs font-black uppercase tracking-wider ${config.color}`}>
                {data.display_name}
              </div>
              <div className="text-[10px] text-slate-500">{config.category}</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black font-mono ${config.color}`}>
              {data.current_level}
            </div>
            <div className="text-[8px] text-slate-500 uppercase">Niveau</div>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div className="text-[9px] text-slate-400 italic mb-2 line-clamp-2">
            {data.description}
          </div>
        )}

        {/* Statut avec temps restant */}
        {isResearching && (
          <div className="mb-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 size={12} className="text-indigo-400 animate-spin" />
              <span className="text-[10px] text-indigo-400 font-bold">Recherche en cours...</span>
            </div>
            {data.researchEndTime && (
              <div className="flex items-center gap-2 bg-indigo-900/40 rounded px-2 py-1.5">
                <Timer size={14} className="text-indigo-300" />
                <span className="text-sm font-mono font-bold text-indigo-200">{timeRemaining}</span>
              </div>
            )}
          </div>
        )}

        {/* Prérequis non satisfaits */}
        {isLocked && data.requirements.length > 0 && (
          <div className="mb-3 bg-red-950/20 border border-red-900/30 rounded-lg p-2">
            <div className="text-[9px] text-red-400 font-bold mb-1">Prérequis :</div>
            {data.requirements.filter((r: any) => !r.met).map((req: any, idx: number) => (
              <div key={idx} className="text-[8px] text-slate-400 flex items-center gap-1">
                <Lock size={8} className="text-red-500" />
                {req.required_tech_name} Niv. {req.required_level} (actuel: {req.current_level})
              </div>
            ))}
          </div>
        )}

        {/* Prérequis satisfaits (afficher avec checkmarks) */}
        {!isLocked && data.requirements.length > 0 && (
          <div className="mb-3 bg-green-950/20 border border-green-900/30 rounded-lg p-2">
            <div className="text-[9px] text-green-400 font-bold mb-1">Prérequis OK :</div>
            {data.requirements.map((req: any, idx: number) => (
              <div key={idx} className="text-[8px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 size={8} className="text-green-500" />
                {req.required_tech_name} Niv. {req.required_level}
              </div>
            ))}
          </div>
        )}

        {/* Coûts */}
        {!isLocked && !isResearching && data.cost && (
          <div className="space-y-1 mb-3">
            {data.cost.metal > 0 && (
              <div className="flex justify-between items-center text-[10px] bg-black/40 px-2 py-1 rounded border border-white/5">
                <span className="text-orange-400 flex items-center gap-1">
                  <Box size={10} /> Métal
                </span>
                <span className={`font-mono font-bold ${data.metal >= data.cost.metal ? 'text-white' : 'text-red-500'}`}>
                  {data.cost.metal.toLocaleString()}
                </span>
              </div>
            )}
            {data.cost.crystal > 0 && (
              <div className="flex justify-between items-center text-[10px] bg-black/40 px-2 py-1 rounded border border-white/5">
                <span className="text-cyan-400 flex items-center gap-1">
                  <Gem size={10} /> Cristal
                </span>
                <span className={`font-mono font-bold ${data.crystal >= data.cost.crystal ? 'text-white' : 'text-red-500'}`}>
                  {data.cost.crystal.toLocaleString()}
                </span>
              </div>
            )}
            {data.cost.deuterium > 0 && (
              <div className="flex justify-between items-center text-[10px] bg-black/40 px-2 py-1 rounded border border-white/5">
                <span className="text-emerald-400 flex items-center gap-1">
                  <Droplets size={10} /> Deutérium
                </span>
                <span className={`font-mono font-bold ${data.deuterium >= data.cost.deuterium ? 'text-white' : 'text-red-500'}`}>
                  {data.cost.deuterium.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bouton d'action */}
        {!isLocked && !isResearching && (
          <Button
            onClick={data.onResearch}
            disabled={!canAfford || data.queueFull}
            className={`w-full h-8 text-[10px] font-black uppercase tracking-wider ${
              !canAfford || data.queueFull
                ? 'bg-slate-900 text-slate-500 border border-white/5'
                : `${config.bg} ${config.border} ${config.color} hover:bg-white/10`
            }`}
          >
            {data.queueFull ? 'File Pleine' : canAfford ? `Rechercher Niv. ${data.current_level + 1}` : 'Ressources Manquantes'}
          </Button>
        )}

        {isLocked && (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Lock size={12} />
            <span>Verrouilé</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const nodeTypes = {
  techNode: TechNode,
};

export default function TechTreeVisual({ planet, onUpdate }: TechTreeVisualProps) {
  const [techTree, setTechTree] = useState<TechInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const queue = planet.constructions || [];
  const shipBuilds = planet.ship_builds || [];
  const defenseBuilds = planet.defense_builds || [];
  const researchQueue = planet.research_queue || [];
  const isQueueFull = queue.length + shipBuilds.length + defenseBuilds.length >= 3;

  const metal = planet.metal_amount ?? 0;
  const crystal = planet.crystal_amount ?? 0;
  const deuterium = planet.deuterium_amount ?? 0;

  // Fetch tech tree from API
  useEffect(() => {
    const fetchTechTree = async () => {
      try {
        const res = await fetch(apiUrl(`/planets/${planet.id}/tech-tree`), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTechTree(data.technologies || []);
        }
      } catch (e) {
        console.error('Error fetching tech tree:', e);
        toast.error('Erreur lors du chargement de l\'arbre technologique');
      } finally {
        setLoading(false);
      }
    };

    fetchTechTree();
  }, [planet.id]);

  const handleResearch = async (tech_key: string) => {
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/upgrade/${tech_key}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success('Recherche lancée !');
        onUpdate();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors du lancement de la recherche');
      }
    } catch (e) {
      toast.error('Erreur de connexion');
      console.error(e);
    }
  };

  // Calculer la profondeur (tier/level) de chaque tech dans l'arbre de dépendances
  const calculateTechDepth = (techTree: TechInfo[]) => {
    const depths = new Map<string, number>();
    const visited = new Set<string>();

    // Fonction récursive pour calculer la profondeur
    const getDepth = (tech_key: string): number => {
      if (depths.has(tech_key)) return depths.get(tech_key)!;
      if (visited.has(tech_key)) return 0; // Éviter les cycles

      visited.add(tech_key);

      const tech = techTree.find(t => t.tech_key === tech_key);
      if (!tech || tech.requirements.length === 0) {
        depths.set(tech_key, 0);
        return 0;
      }

      // La profondeur = 1 + max des profondeurs des dépendances
      const maxDepth = Math.max(
        ...tech.requirements.map(req => getDepth(req.required_tech_key))
      );
      const depth = maxDepth + 1;
      depths.set(tech_key, depth);
      return depth;
    };

    // Calculer pour toutes les techs
    techTree.forEach(tech => getDepth(tech.tech_key));
    return depths;
  };

  // Positionner les nodes en arbre vertical hiérarchique
  const getNodePosition = (tech_key: string, techTree: TechInfo[], depths: Map<string, number>) => {
    const depth = depths.get(tech_key) || 0;

    // Grouper les techs par profondeur
    const techsAtDepth = techTree.filter(t => depths.get(t.tech_key) === depth);
    const indexAtDepth = techsAtDepth.findIndex(t => t.tech_key === tech_key);

    // Layout vertical : profondeur = Y, index à cette profondeur = X
    const spacingY = 450; // Espacement vertical entre niveaux (augmenté pour éviter les chevauchements)
    const spacingX = 350; // Espacement horizontal entre techs du même niveau
    const startY = 100;

    // Centrer horizontalement les techs du même niveau
    const totalWidth = techsAtDepth.length * spacingX;
    const startX = (window.innerWidth / 2) - (totalWidth / 2) + (indexAtDepth * spacingX);

    return {
      x: Math.max(50, startX),
      y: startY + (depth * spacingY)
    };
  };

  // Créer les noeuds dynamiquement depuis l'API
  const initialNodes: Node[] = useMemo(() => {
    if (!techTree.length) return [];

    // Calculer les profondeurs pour organiser hiérarchiquement
    const depths = calculateTechDepth(techTree);

    const nodes: Node[] = [];

    techTree.forEach((tech) => {
      // Check research_queue for ongoing research (has tech_key and end_time)
      const researchingItem = researchQueue.find((r: any) => r.tech_key === tech.tech_key);
      const isResearching = !!researchingItem;
      const researchEndTime = researchingItem?.end_time || null;
      const cost = calculateNextLevelCost(tech);
      const canAfford = metal >= cost.metal && crystal >= cost.crystal && deuterium >= cost.deuterium;
      const allRequirementsMet = tech.requirements.every(r => r.met);

      nodes.push({
        id: tech.tech_key,
        type: 'techNode',
        position: getNodePosition(tech.tech_key, techTree, depths),
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
          queueFull: isQueueFull,
          onResearch: () => handleResearch(tech.tech_key),
        },
      });
    });

    return nodes;
  }, [techTree, researchQueue, metal, crystal, deuterium, isQueueFull]);

  // Créer les edges (dépendances) dynamiquement
  const initialEdges: Edge[] = useMemo(() => {
    if (!techTree.length) return [];

    const edges: Edge[] = [];

    techTree.forEach(tech => {
      tech.requirements.forEach(req => {
        const config = getTechConfig(req.required_tech_key);

        // Color coding: satisfied = tech color, unsatisfied = bright RED
        const edgeColor = req.met ? config.hexColor : '#dc2626'; // bright red for unmet
        const edgeOpacity = req.met ? 1.0 : 0.8;

        edges.push({
          id: `${req.required_tech_key}-${tech.tech_key}`,
          source: req.required_tech_key,
          target: tech.tech_key,
          type: ConnectionLineType.SmoothStep,
          animated: req.met,
          style: {
            stroke: edgeColor,
            strokeWidth: req.met ? 4 : 4, // Same width for both, always very visible
            opacity: edgeOpacity,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: 24,
            height: 24,
          },
          label: req.met ? '✓ Débloqué' : `⚠️ Requis Niv. ${req.required_level}`,
          labelStyle: {
            fill: req.met ? '#10b981' : '#dc2626',
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
          },
          labelBgStyle: {
            fill: '#0f172a',
            fillOpacity: 0.95,
            stroke: edgeColor,
            strokeWidth: 2,
            rx: 4,
            ry: 4,
          },
          labelBgPadding: [8, 12],
        });
      });
    });

    return edges;
  }, [techTree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Mettre à jour les noeuds quand les données changent
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 overflow-hidden flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
      >
        {/* Removed Background grid for cleaner skill tree look */}
        <Controls
          className="bg-slate-900/90 border-purple-500/30 backdrop-blur-md rounded-lg"
          showInteractive={false}
        />
        <MiniMap
          className="bg-slate-900/90 border border-purple-500/30 rounded-lg backdrop-blur-md"
          nodeColor={(node) => {
            const config = getTechConfig(node.id);
            // Red for locked nodes, color for unlocked
            return node.data.allRequirementsMet ? config.hexColor : '#dc2626';
          }}
          maskColor="rgba(15, 23, 42, 0.9)"
          style={{
            backgroundColor: '#0f172a',
          }}
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md border border-purple-500/30 rounded-lg p-3 text-xs z-10">
        <div className="font-bold text-purple-400 mb-2">Légende</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
            <span className="text-slate-300">Technologie débloquée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-slate-300">Technologie verrouillée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span className="text-slate-300">Dépendance satisfaite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span className="text-slate-300">Dépendance manquante</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useMemo } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap, Target, Eye, Microscope, Lock, CheckCircle2,
  Clock, Box, Gem, Droplets, TrendingUp, Rocket, Shield
} from "lucide-react";
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';

interface TechTreeVisualProps {
  planet: any;
  onUpdate: () => void;
}

// Configuration des technologies avec leurs icônes et couleurs
const TECH_CONFIG: Record<string, {
  icon: any;
  color: string;
  border: string;
  bg: string;
  label: string;
  description: string;
}> = {
  research: {
    icon: Microscope,
    color: 'text-purple-400',
    border: 'border-purple-500/50',
    bg: 'bg-purple-950/30',
    label: 'Labo de Recherche',
    description: 'Accélère toutes les recherches',
  },
  energy_tech: {
    icon: Zap,
    color: 'text-yellow-400',
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-950/30',
    label: 'Tech. Énergie',
    description: '+5% production mines/niveau',
  },
  laser: {
    icon: Target,
    color: 'text-red-400',
    border: 'border-red-500/50',
    bg: 'bg-red-950/30',
    label: 'Batterie Laser',
    description: '+10% dégâts flotte/niveau',
  },
  espionage: {
    icon: Eye,
    color: 'text-emerald-400',
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-950/30',
    label: 'Espionnage',
    description: 'Scan ennemi détaillé',
  },
};

// Calcul des coûts
const getCost = (type: string, level: number) => {
  const factor = Math.pow(2, level);
  switch(type) {
    case 'research': return { m: 200 * factor, c: 400 * factor, d: 200 * factor };
    case 'energy_tech': return { m: 0, c: 800 * factor, d: 400 * factor };
    case 'laser': return { m: 1500 * factor, c: 500 * factor, d: 100 * factor };
    case 'espionage': return { m: 200 * factor, c: 1000 * factor, d: 200 * factor };
    default: return { m: 0, c: 0, d: 0 };
  }
};

// Composant personnalisé pour chaque noeud technologique
const TechNode = ({ data }: { data: any }) => {
  const config = TECH_CONFIG[data.id];
  const Icon = config.icon;
  const isLocked = data.isLocked;
  const isResearching = data.isResearching;
  const canAfford = data.canAfford;

  return (
    <Card className={`
      relative overflow-hidden w-[280px] transition-all duration-300
      ${isLocked ? 'opacity-50 grayscale' : ''}
      ${!isLocked && !isResearching ? 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer' : ''}
      bg-slate-950 border ${config.border}
      ${!isLocked && canAfford ? 'shadow-lg' : ''}
      card-depth
    `}>
      {/* Effet de glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className={`absolute top-0 right-0 w-24 h-24 ${config.bg} blur-3xl`}></div>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
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
                {config.label}
              </div>
              <div className="text-[10px] text-slate-500">{config.description}</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black font-mono ${config.color}`}>
              {data.level}
            </div>
            <div className="text-[8px] text-slate-500 uppercase">Niveau</div>
          </div>
        </div>

        {/* Statut */}
        {isResearching && (
          <div className="mb-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-2 flex items-center gap-2">
            <Clock size={12} className="text-indigo-400 animate-spin" />
            <span className="text-[10px] text-indigo-400 font-bold">Recherche en cours...</span>
          </div>
        )}

        {/* Coûts */}
        {!isLocked && !isResearching && (
          <div className="space-y-1 mb-3">
            <div className="flex justify-between items-center text-[10px] bg-black/40 px-2 py-1 rounded border border-white/5">
              <span className="text-orange-400 flex items-center gap-1">
                <Box size={10} /> Métal
              </span>
              <span className={`font-mono font-bold ${data.metal >= data.cost.m ? 'text-white' : 'text-red-500'}`}>
                {data.cost.m.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] bg-black/40 px-2 py-1 rounded border border-white/5">
              <span className="text-cyan-400 flex items-center gap-1">
                <Gem size={10} /> Cristal
              </span>
              <span className={`font-mono font-bold ${data.crystal >= data.cost.c ? 'text-white' : 'text-red-500'}`}>
                {data.cost.c.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] bg-black/40 px-2 py-1 rounded border border-white/5">
              <span className="text-emerald-400 flex items-center gap-1">
                <Droplets size={10} /> Deutérium
              </span>
              <span className={`font-mono font-bold ${data.deuterium >= data.cost.d ? 'text-white' : 'text-red-500'}`}>
                {data.cost.d.toLocaleString()}
              </span>
            </div>
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
            {data.queueFull ? 'File Pleine (3/3)' : canAfford ? 'Rechercher' : 'Ressources Manquantes'}
          </Button>
        )}

        {isLocked && (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Lock size={12} />
            <span>Prérequis non satisfaits</span>
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
  const researchLevel = planet.research_lab_level ?? 0;
  const energyLevel = planet.energy_tech_level ?? 0;
  const laserLevel = planet.laser_battery_level ?? 0;
  const espionageLevel = planet.espionage_tech_level ?? 0;

  const queue = planet.constructions || [];
  const isQueueFull = queue.length >= 3;

  const metal = planet.metal_amount ?? 0;
  const crystal = planet.crystal_amount ?? 0;
  const deuterium = planet.deuterium_amount ?? 0;

  const handleResearch = async (type: string) => {
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/upgrade/${type}`), {
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

  // Définir les noeuds avec leurs positions
  const initialNodes: Node[] = useMemo(() => {
    // Vérifier si une recherche est en cours
    const isResearching = (id: string) => queue.some((q: any) => q.building_type === id);

    return [
      {
        id: 'research',
        type: 'techNode',
        position: { x: 250, y: 50 },
        data: {
          id: 'research',
          level: researchLevel,
          isLocked: false,
          isResearching: isResearching('research'),
          canAfford: researchLevel === 0
            ? metal >= 200 && crystal >= 400 && deuterium >= 200
            : metal >= getCost('research', researchLevel).m && crystal >= getCost('research', researchLevel).c && deuterium >= getCost('research', researchLevel).d,
          cost: researchLevel === 0
            ? { m: 200, c: 400, d: 200 }
            : getCost('research', researchLevel),
          metal,
          crystal,
          deuterium,
          queueFull: isQueueFull,
          onResearch: () => handleResearch('research'),
        },
      },
      {
        id: 'energy_tech',
        type: 'techNode',
        position: { x: 50, y: 300 },
        data: {
          id: 'energy_tech',
          level: energyLevel,
          isLocked: researchLevel === 0,
          isResearching: isResearching('energy_tech'),
          canAfford: metal >= getCost('energy_tech', energyLevel).m && crystal >= getCost('energy_tech', energyLevel).c && deuterium >= getCost('energy_tech', energyLevel).d,
          cost: getCost('energy_tech', energyLevel),
          metal,
          crystal,
          deuterium,
          queueFull: isQueueFull,
          onResearch: () => handleResearch('energy_tech'),
        },
      },
      {
        id: 'laser',
        type: 'techNode',
        position: { x: 250, y: 300 },
        data: {
          id: 'laser',
          level: laserLevel,
          isLocked: researchLevel === 0,
          isResearching: isResearching('laser'),
          canAfford: metal >= getCost('laser', laserLevel).m && crystal >= getCost('laser', laserLevel).c && deuterium >= getCost('laser', laserLevel).d,
          cost: getCost('laser', laserLevel),
          metal,
          crystal,
          deuterium,
          queueFull: isQueueFull,
          onResearch: () => handleResearch('laser'),
        },
      },
      {
        id: 'espionage',
        type: 'techNode',
        position: { x: 450, y: 300 },
        data: {
          id: 'espionage',
          level: espionageLevel,
          isLocked: researchLevel === 0,
          isResearching: isResearching('espionage'),
          canAfford: metal >= getCost('espionage', espionageLevel).m && crystal >= getCost('espionage', espionageLevel).c && deuterium >= getCost('espionage', espionageLevel).d,
          cost: getCost('espionage', espionageLevel),
          metal,
          crystal,
          deuterium,
          queueFull: isQueueFull,
          onResearch: () => handleResearch('espionage'),
        },
      },
    ];
  }, [planet, researchLevel, energyLevel, laserLevel, espionageLevel, metal, crystal, deuterium, queue, isQueueFull]);

  // Définir les arêtes (dépendances)
  const initialEdges: Edge[] = useMemo(() => [
    {
      id: 'research-energy',
      source: 'research',
      target: 'energy_tech',
      type: ConnectionLineType.SmoothStep,
      animated: researchLevel > 0,
      style: { stroke: researchLevel > 0 ? '#facc15' : '#475569', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: researchLevel > 0 ? '#facc15' : '#475569',
      },
    },
    {
      id: 'research-laser',
      source: 'research',
      target: 'laser',
      type: ConnectionLineType.SmoothStep,
      animated: researchLevel > 0,
      style: { stroke: researchLevel > 0 ? '#f87171' : '#475569', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: researchLevel > 0 ? '#f87171' : '#475569',
      },
    },
    {
      id: 'research-espionage',
      source: 'research',
      target: 'espionage',
      type: ConnectionLineType.SmoothStep,
      animated: researchLevel > 0,
      style: { stroke: researchLevel > 0 ? '#34d399' : '#475569', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: researchLevel > 0 ? '#34d399' : '#475569',
      },
    },
  ], [researchLevel]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Mettre à jour les noeuds quand planet change
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [planet, initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="h-[600px] bg-slate-950 rounded-lg border border-white/10 overflow-hidden card-depth">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        className="bg-slate-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
          className="bg-slate-950"
        />
        <Controls
          className="bg-slate-900 border-white/10"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}

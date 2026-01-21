import { useState, useEffect } from 'react';
import { getTechLevel, getShipCount } from '@/utils/techTreeCompat';
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Target, Atom, Microscope, Cpu, ArrowUpCircle, Sparkles, Eye, ScanLine, Lock, Loader2, AlertTriangle, ChevronRight, Box, Gem, Droplets, TrendingUp, Network, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";
import { GameImage } from '@/components/ui/game-image';
import { getTechImage } from '@/lib/images';
import TechTreeVisual from './TechTreeVisual';

interface TechRequirement {
  required_tech_key: string;
  required_tech_name: string;
  required_level: number;
  current_level: number;
  met: boolean;
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
  requirements: TechRequirement[];
  next_level_time_seconds?: number;
}
// --- CONFIGURATION VISUELLE (Design Riche) ---
const getTechConfig = (id: string, level: number) => {
  const tier = Math.floor(level / 5) + 1; 
  const configs: any = {
    research: { color: "text-purple-400", border: "border-purple-500/40", glow: "shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]", bg: "bg-purple-950/10", icon: Microscope, tierLabel: "LAB-OS", subIcon: Atom },
    energy_tech: { color: "text-yellow-400", border: "border-yellow-500/40", glow: "shadow-[0_0_20px_-5px_rgba(250,204,21,0.5)]", bg: "bg-yellow-950/10", icon: Zap, tierLabel: "CORE-REACT", subIcon: Sparkles },
    laser: { color: "text-red-400", border: "border-red-500/40", glow: "shadow-[0_0_20px_-5px_rgba(248,113,113,0.5)]", bg: "bg-red-950/10", icon: Target, tierLabel: "WEAPON-SYS", subIcon: Cpu },
    espionage: { color: "text-emerald-400", border: "border-emerald-500/40", glow: "shadow-[0_0_20px_-5px_rgba(52,211,153,0.5)]", bg: "bg-emerald-950/10", icon: Eye, tierLabel: "INTEL-NET", subIcon: ScanLine }
  };
  return { tier: `MK ${tier}`, ...configs[id] };
};

// --- LOGIQUE DES BONUS ---
const getBonusInfo = (id: string, level: number) => {
    const next = level + 1;
    switch(id) {
        case 'research': return { label: "Vitesse R&D", current: `${(1 + level) * 100}%`, next: `${(1 + next) * 100}%`, desc: "Accélère le développement technologique." };
        case 'energy_tech': return { label: "Output Énergie", current: `+${level * 5}%`, next: `+${next * 5}%`, desc: "Augmente la production des mines." };
        case 'laser': return { label: "Puissance Feu", current: `+${level * 10}%`, next: `+${next * 10}%`, desc: "Bonus de dégâts pour toute la flotte." };
        case 'espionage': return { label: "Niveau Scan", current: `Niv. ${level}`, next: `Niv. ${next}`, desc: "Permet de voir les détails ennemis." };
        default: return { label: "Bonus", current: "-", next: "-", desc: "Amélioration standard." };
    }
};

// --- COÛTS DYNAMIQUES ---
const getCost = (tech: TechInfo) => {
    const level = tech.current_level;
    const multiplier = tech.cost_multiplier;
    return {
        m: Math.floor(tech.base_cost_metal * Math.pow(multiplier, level)),
        c: Math.floor(tech.base_cost_crystal * Math.pow(multiplier, level)),
        d: Math.floor(tech.base_cost_deuterium * Math.pow(multiplier, level))
    };
};

export default function TechTree({ planet, onUpdate }: { planet: any, onUpdate: () => void }) {
  // Timer unique pour rafraîchir l'affichage toutes les secondes
  const [now, setNow] = useState(new Date().getTime());
  const [technologies, setTechnologies] = useState<TechInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTechnologies = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(apiUrl(`/planets/${planet.id}/tech-tree`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setTechnologies(data.technologies || []);
        }
      } catch (e) {
        console.error("Failed to fetch technologies:", e);
        toast.error("Erreur lors du chargement des technologies");
      } finally {
        setLoading(false);
      }
    };
    fetchTechnologies();
  }, [planet.id]);

  const handleResearch = async (tech_key: string) => {
    const tech = technologies.find(t => t.tech_key === tech_key);
    if (!tech) return;

    // Check tech requirements
    const hasUnmetRequirements = tech.requirements.some(req => !req.met);
    if (hasUnmetRequirements) {
        toast.error("Prérequis technologiques non satisfaits");
        return;
    }

    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/research/${tech_key}`), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success(`Recherche lancée : ${tech.display_name}`);
        onUpdate();
      } else if (res.status === 403) {
        toast.error("Prérequis non satisfaits");
      } else if (res.status === 400) {
        toast.error("Ressources insuffisantes");
      } else if (res.status === 409) {
        toast.error("Recherche déjà en cours");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la recherche");
    }
  };

  // --- LOGIQUE FILE D'ATTENTE MULTIPLE ---
  const queue = planet.constructions || [];
  const isQueueFull = queue.length >= 3;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400 animate-pulse">Chargement des technologies...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Vue Arbre Interactif en plein écran */}
      <TechTreeVisual planet={planet} onUpdate={onUpdate} />
    </div>
  );
}

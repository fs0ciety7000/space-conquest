import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/config/api";
import { formatTimeUntil } from "@/lib/utils";
import { Zap, Shield, Sword, Telescope, Clock, TrendingUp, FlaskConical } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveItem {
  inventory_id: string;
  effect_type: string;
  expires_at: string | null;
  activated_at: string | null;
}

interface BonusSummaryViewProps {
  planet: any;
  userId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBuildingLevel(planet: any, key: string): number {
  if (planet?.buildings && typeof planet.buildings === "object") {
    return planet.buildings[key] ?? 0;
  }
  return 0;
}

function getTechLevel(planet: any, key: string): number {
  if (planet?.technologies && typeof planet.technologies === "object") {
    return planet.technologies[key] ?? 0;
  }
  return 0;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-cyan-500/10 mb-3">
      <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
      <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-cyan-500/70">{title}</span>
    </div>
  );
}

interface BonusRowProps {
  source: string;
  effect: string;
  value: string;
  valueColor?: string;
}

function BonusRow({ source, effect, value, valueColor = "text-cyan-400" }: BonusRowProps) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
      <span className="text-xs text-slate-400 truncate">{source}</span>
      <span className="text-xs text-slate-500 truncate">{effect}</span>
      <span className={`text-xs font-mono font-bold tabular-nums ${valueColor}`}>{value}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BonusSummaryView({ planet, userId }: BonusSummaryViewProps) {
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const token = localStorage.getItem("token");

  const loadActiveItems = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/black-market/inventory"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const now = Date.now();
        const active = (data.inventory || []).filter(
          (item: any) =>
            item.activated_at &&
            item.expires_at &&
            new Date(item.expires_at).getTime() > now
        );
        setActiveItems(active);
      }
    } catch {
      // ignore
    } finally {
      setLoadingItems(false);
    }
  }, [token]);

  useEffect(() => {
    loadActiveItems();
  }, [loadActiveItems]);

  // Derived building levels
  const metalMineLevel = getBuildingLevel(planet, "metal_mine");
  const crystalMineLevel = getBuildingLevel(planet, "crystal_mine");
  const deutMineLevel = getBuildingLevel(planet, "deuterium_mine");
  const solarPlantLevel = getBuildingLevel(planet, "solar_plant");
  const researchLabLevel = getBuildingLevel(planet, "research_lab") || planet.research_lab_level || 0;
  const shipyardLevel = getBuildingLevel(planet, "shipyard") || planet.shipyard_level || 0;
  const hangarLevel = getBuildingLevel(planet, "hangar");
  const storageLevel = getBuildingLevel(planet, "resource_storage");

  // Derived tech levels
  const weaponsTech = getTechLevel(planet, "weapons_tech");
  const shieldTech = getTechLevel(planet, "shield_tech");
  const armourTech = getTechLevel(planet, "armour_tech");
  const astrophysics = getTechLevel(planet, "astrophysics");
  const computerTech = getTechLevel(planet, "computer_tech");
  const espionageTech = getTechLevel(planet, "espionage_tech") || getTechLevel(planet, "espionage");
  const energyTech = getTechLevel(planet, "energy_tech");
  const hyperspaceLevel = getTechLevel(planet, "hyperspace_tech");
  const laserTech = getTechLevel(planet, "laser_tech");
  const plasmaTech = getTechLevel(planet, "plasma_tech");
  const gravitonTech = getTechLevel(planet, "graviton_tech");

  // Active timed effects
  const resourceBoostActive = activeItems.find(i => i.effect_type === "resource_boost");
  const stealthActive = activeItems.find(i => i.effect_type === "stealth");

  // Biome bonuses
  const biome = planet?.biome;

  // Slot bonuses
  const slotBonuses = planet?.slot_bonuses;

  // Expedition slots: 1 base + 1 per 4 levels of computer_tech (server formula)
  // (lvl 0-3 → 1 slot, lvl 4-7 → 2 slots, lvl 8-11 → 3 slots, lvl 12+ → 4 slots)
  const maxExpeditionSlots = 1 + Math.floor(computerTech / 4);

  // Max colonies = astrophysics level, capped at 10 (server formula: min(astrophysics, 10)).
  const maxColonies = Math.min(astrophysics, 10);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[rgba(10,5,32,0.92)] border border-cyan-500/15 backdrop-blur-[12px] p-6">
        <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none">
          <TrendingUp size={200} className="text-cyan-400" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20">
            <TrendingUp size={26} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-cyan-400">
              Récapitulatif des Bonus
            </h2>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
              Planète active : {planet?.name || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: Planet Bonuses */}
      <div className="rounded-2xl bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] p-6 space-y-4">
        <SectionHeader title={`Bonus Planète — ${planet?.name || "Inconnue"}`} />

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 mb-1">
          <span className="text-[9px] uppercase font-bold text-slate-600">Source</span>
          <span className="text-[9px] uppercase font-bold text-slate-600">Effet</span>
          <span className="text-[9px] uppercase font-bold text-slate-600">Valeur</span>
        </div>

        {/* Buildings */}
        {metalMineLevel > 0 && (
          <BonusRow
            source={`Mine de Métal niv. ${metalMineLevel}`}
            effect="Production métal/h"
            value={`+${planet?.metal_production ?? "—"}`}
            valueColor="text-orange-400"
          />
        )}
        {crystalMineLevel > 0 && (
          <BonusRow
            source={`Mine de Cristal niv. ${crystalMineLevel}`}
            effect="Production cristal/h"
            value={`+${planet?.crystal_production ?? "—"}`}
            valueColor="text-cyan-400"
          />
        )}
        {deutMineLevel > 0 && (
          <BonusRow
            source={`Synth. Deutérium niv. ${deutMineLevel}`}
            effect="Production deutérium/h"
            value={`+${planet?.deuterium_production ?? "—"}`}
            valueColor="text-emerald-400"
          />
        )}
        {solarPlantLevel > 0 && (
          <BonusRow
            source={`Centrale Solaire niv. ${solarPlantLevel}`}
            effect="Production énergie"
            value={`+${planet?.energy_production ?? solarPlantLevel * 40}`}
            valueColor="text-yellow-400"
          />
        )}
        {energyTech > 0 && (
          <BonusRow
            source={`Tech. Énergie niv. ${energyTech}`}
            effect="Bonus production mines"
            value={`+${energyTech}%`}
            valueColor="text-yellow-300"
          />
        )}

        {/* Biome */}
        {biome && (
          <BonusRow
            source={`Biome ${biome.name}`}
            effect="Mult. métal / cristal / deut."
            value={`×${biome.metal_mult ?? 1} / ×${biome.crystal_mult ?? 1} / ×${biome.deuterium_mult ?? 1}`}
            valueColor="text-violet-400"
          />
        )}

        {/* Slot bonuses */}
        {slotBonuses?.metal && slotBonuses.metal !== "+0%" && (
          <BonusRow
            source="Slots Métal"
            effect="Bonus production métal"
            value={slotBonuses.metal}
            valueColor="text-orange-400"
          />
        )}
        {slotBonuses?.crystal && slotBonuses.crystal !== "+0%" && (
          <BonusRow
            source="Slots Cristal"
            effect="Bonus production cristal"
            value={slotBonuses.crystal}
            valueColor="text-cyan-400"
          />
        )}
        {slotBonuses?.deuterium && slotBonuses.deuterium !== "+0%" && (
          <BonusRow
            source="Slots Deutérium"
            effect="Bonus production deutérium"
            value={slotBonuses.deuterium}
            valueColor="text-emerald-400"
          />
        )}

        {/* Hyperspace */}
        {hyperspaceLevel > 0 && (
          <BonusRow
            source={`Tech. Hyperespace niv. ${hyperspaceLevel}`}
            effect="Vitesse de flotte"
            value={`+${Math.round(hyperspaceLevel * 15)}%`}
            valueColor="text-blue-400"
          />
        )}

        {/* Active timed effects */}
        {!loadingItems && resourceBoostActive && resourceBoostActive.expires_at && (
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300 font-bold">Boost Production (actif)</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-mono font-bold text-amber-400">Toutes prod. +50%</span>
              <span className="flex items-center gap-1 text-[9px] text-amber-600 font-mono">
                <Clock size={8} /> {formatTimeUntil(resourceBoostActive.expires_at)}
              </span>
            </div>
          </div>
        )}
        {!loadingItems && stealthActive && stealthActive.expires_at && (
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-slate-300 shrink-0" />
              <span className="text-xs text-slate-200 font-bold">Mode Furtif (actif)</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-mono font-bold text-slate-300">Invisibilité galaxie</span>
              <span className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                <Clock size={8} /> {formatTimeUntil(stealthActive.expires_at)}
              </span>
            </div>
          </div>
        )}

        {/* Buildings that affect gameplay */}
        {researchLabLevel > 0 && (
          <BonusRow
            source={`Labo Recherche niv. ${researchLabLevel}`}
            effect="Vitesse de recherche"
            value={`-${Math.round((1 - 1 / (1 + researchLabLevel)) * 100)}%`}
            valueColor="text-fuchsia-400"
          />
        )}
        {shipyardLevel > 0 && (
          <BonusRow
            source={`Chantier Spatial niv. ${shipyardLevel}`}
            effect="Vitesse de construction"
            value={`-${Math.round((1 - 1 / (1 + shipyardLevel)) * 100)}%`}
            valueColor="text-cyan-400"
          />
        )}
        {hangarLevel > 0 && (
          <BonusRow
            source={`Hangar niv. ${hangarLevel}`}
            effect="Capacité flotte"
            value={`${500 + hangarLevel * 500} vaisseaux`}
            valueColor="text-orange-400"
          />
        )}
        {storageLevel > 0 && (
          <BonusRow
            source={`Stockage niv. ${storageLevel}`}
            effect="Capacité stockage"
            value={`${Math.floor(600000 * Math.pow(1.6, storageLevel) / 1000)}k`}
            valueColor="text-yellow-400"
          />
        )}
      </div>

      {/* SECTION: Research bonuses (per-planet) */}
      <div className="rounded-2xl bg-[rgba(10,5,32,0.85)] border border-fuchsia-500/10 backdrop-blur-[12px] p-6 space-y-4">
        <SectionHeader title={`Recherches de cette planète`} />

        {/* Per-planet note */}
        <p className="text-[10px] text-fuchsia-400/60 italic border border-fuchsia-500/10 rounded-lg px-3 py-2 bg-fuchsia-950/10">
          Les recherches sont propres à chaque planète dans ce jeu. Les niveaux affichés sont ceux de <span className="font-bold text-fuchsia-300/70">{planet?.name || "cette planète"}</span>.
        </p>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 mb-1">
          <span className="text-[9px] uppercase font-bold text-slate-600">Technologie</span>
          <span className="text-[9px] uppercase font-bold text-slate-600">Effet</span>
          <span className="text-[9px] uppercase font-bold text-slate-600">Valeur</span>
        </div>

        {weaponsTech > 0 && (
          <BonusRow
            source={`Tech. Armes niv. ${weaponsTech}`}
            effect="Combat — attaque"
            value={`+${weaponsTech * 10}%`}
            valueColor="text-red-400"
          />
        )}
        {shieldTech > 0 && (
          <BonusRow
            source={`Tech. Boucliers niv. ${shieldTech}`}
            effect="Combat — défense bouclier"
            value={`+${shieldTech * 10}%`}
            valueColor="text-blue-400"
          />
        )}
        {armourTech > 0 && (
          <BonusRow
            source={`Tech. Blindage niv. ${armourTech}`}
            effect="Points de vie vaisseaux"
            value={`+${armourTech * 10}%`}
            valueColor="text-emerald-400"
          />
        )}
        {astrophysics > 0 && (
          <BonusRow
            source={`Astrophysique niv. ${astrophysics}`}
            effect="Colonies max (= niveau, cap 10)"
            value={`${maxColonies}`}
            valueColor="text-violet-400"
          />
        )}
        {computerTech > 0 && (
          <>
            <BonusRow
              source={`Tech. Informatique niv. ${computerTech}`}
              effect="Slots expédition (1 + niv./4, max 4)"
              value={`${Math.min(maxExpeditionSlots, 4)} slots`}
              valueColor="text-cyan-400"
            />
            <BonusRow
              source={`Tech. Informatique niv. ${computerTech}`}
              effect="Capacité cargo transporteur (+10%/niv.)"
              value={`+${computerTech * 10}%`}
              valueColor="text-cyan-300"
            />
          </>
        )}
        {espionageTech > 0 && (
          <BonusRow
            source={`Tech. Espionnage niv. ${espionageTech}`}
            effect="Qualité rapports espionnage"
            value={`niveau ${espionageTech}`}
            valueColor="text-yellow-400"
          />
        )}
        {laserTech > 0 && (
          <BonusRow
            source={`Tech. Laser niv. ${laserTech}`}
            effect="Combat — attaque (alternative weapons)"
            value={`+${laserTech * 10}%`}
            valueColor="text-red-300"
          />
        )}
        {plasmaTech > 0 && (
          <BonusRow
            source={`Tech. Plasma niv. ${plasmaTech}`}
            effect="Débloque tourelles plasma & bombardier"
            value={`niv. ${plasmaTech}`}
            valueColor="text-fuchsia-400"
          />
        )}
        {gravitonTech > 0 && (
          <BonusRow
            source={`Tech. Graviton niv. ${gravitonTech}`}
            effect="Débloque systèmes gravitationnels"
            value={`niv. ${gravitonTech}`}
            valueColor="text-purple-400"
          />
        )}

        {weaponsTech === 0 && shieldTech === 0 && armourTech === 0 &&
         astrophysics === 0 && computerTech === 0 && espionageTech === 0 &&
         laserTech === 0 && plasmaTech === 0 && gravitonTech === 0 && (
          <div className="text-center py-6 text-slate-600 text-[10px] uppercase font-bold italic">
            Aucune technologie recherchée sur cette planète
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {[
          { icon: <Sword size={12} className="text-red-400" />, label: "Combat offensif" },
          { icon: <Shield size={12} className="text-blue-400" />, label: "Combat défensif" },
          { icon: <Zap size={12} className="text-yellow-400" />, label: "Production" },
          { icon: <Telescope size={12} className="text-violet-400" />, label: "Exploration" },
          { icon: <FlaskConical size={12} className="text-fuchsia-400" />, label: "Recherche" },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px] text-slate-600">
            {icon} {label}
          </div>
        ))}
      </div>
    </div>
  );
}

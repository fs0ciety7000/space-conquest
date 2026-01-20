import { X, Eye, ScanEye, Pickaxe, Hexagon, Droplet, Ship, ShieldAlert, Lock, AlertTriangle, Zap, TrendingDown, Clock, Skull } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { apiUrl } from '@/config/api';
interface SpyReport {
  success: boolean;
  tech_difference: number;
  detection_level: 'none' | 'resources' | 'fleet' | 'full';
  resources?: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
  fleet?: Record<string, number>;
  defense?: number;
}

interface SpyModalProps {
  report: SpyReport | null;
  onClose: () => void;
  targetPlanetId?: string;
  onSabotage?: (action: 'disable_mine' | 'steal_tech') => Promise<void>;
}

export default function SpyModal({ report, onClose, targetPlanetId, onSabotage }: SpyModalProps) {
  if (!report) return null;

  // Définition des niveaux d'accès
  const hasResources = report.detection_level !== 'none';
  const hasFleet = ['fleet', 'full'].includes(report.detection_level);
  const hasDefense = report.detection_level === 'full';

  // Couleurs selon le niveau de tech
  const isHighTech = report.tech_difference >= 2;
  const statusColor = report.tech_difference >= 0 ? "text-emerald-400" : "text-amber-500";
  const statusBorder = report.tech_difference >= 0 ? "border-emerald-500/30" : "border-amber-500/30";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border border-slate-800 text-white max-w-lg p-0 overflow-hidden sm:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] card-depth glass-card animate-slide-up">
        
        {/* HEADER */}
        <div className="relative p-6 bg-slate-900/50 border-b border-white/5 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <ScanEye size={120} className="animate-spin-slow" />
            </div>
            
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-400">Renseignement</h3>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-wider text-white">Rapport Sonde</h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                        Cryptage: <span className={statusColor}>{report.tech_difference > 0 ? "DÉCHIFFRÉ" : "PARTIEL"} (Delta Tech: {report.tech_difference})</span>
                    </p>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 hover:scale-110 card-depth hover:shadow-lg text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            
            {/* 1. RESSOURCES */}
            <Section title="Gisements détectés" icon={Pickaxe} isLocked={!hasResources} delay={1}>
                {report.resources && (
                    <div className="grid grid-cols-3 gap-3">
                        <ResourceCard icon={Pickaxe} label="Métal" value={report.resources.metal} color="text-slate-300" />
                        <ResourceCard icon={Hexagon} label="Cristal" value={report.resources.crystal} color="text-blue-300" />
                        <ResourceCard icon={Droplet} label="Deutérium" value={report.resources.deuterium} color="text-emerald-300" />
                    </div>
                )}
            </Section>

            <Separator className="bg-white/5" />

            {/* 2. FLOTTE */}
            <Section title="Flotte en Stationnement" icon={Ship} isLocked={!hasFleet} delay={2}>
                {report.fleet ? (
                    Object.keys(report.fleet).length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(report.fleet).map(([key, count]) => (
                                count > 0 && (
                                    <div key={key} className="flex justify-between items-center p-2 bg-white/5 rounded border border-white/5 hover:-translate-y-0.5 transition-all duration-300 card-depth hover:shadow-lg">
                                        <span className="text-xs uppercase text-slate-400 font-bold">{key.replace('_', ' ')}</span>
                                        <span className="text-sm font-mono text-white">{count.toLocaleString()}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500 italic text-center py-2">Aucun vaisseau détecté en orbite.</div>
                    )
                ) : null}
            </Section>

            <Separator className="bg-white/5" />

            {/* 3. DÉFENSE (Full Scan uniquement) */}
            <Section title="Systèmes Défensifs" icon={ShieldAlert} isLocked={!hasDefense} delay={3}>
                {report.defense !== undefined ? (
                     <div className="flex items-center gap-4 p-3 bg-red-950/20 border border-red-500/20 rounded-lg glass-card hover:-translate-y-0.5 transition-all duration-300 card-depth">
                        <AlertTriangle className="text-red-500 animate-bounce-subtle" size={24} />
                        <div>
                            <div className="text-xs uppercase font-bold text-red-400">Signature Défensive</div>
                            <div className="text-lg font-black text-white">{report.defense > 0 ? `${report.defense} Unités` : "Aucune défense"}</div>
                        </div>
                     </div>
                ) : null}
            </Section>

            {/* 4. ACTIONS DE SABOTAGE */}
            {report.success && onSabotage && (
                <>
                    <Separator className="bg-white/5" />
                    {report.tech_difference >= 1 ? (
                        <Section title="Opérations Clandestines" icon={Zap} isLocked={false} delay={4}>
                            <div className="space-y-3">
                                {/* Avertissement */}
                                <div className="bg-yellow-950/20 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-xs font-bold text-yellow-300 mb-1">Risques Opérationnels</div>
                                        <div className="text-[10px] text-yellow-200/70 leading-relaxed">
                                            Si détecté: sonde détruite + Casus Belli (droit d'attaque sans pénalité)
                                        </div>
                                    </div>
                                </div>

                                {/* Option 1: Désactiver mine */}
                                <button
                                    onClick={() => onSabotage('disable_mine')}
                                    className="w-full bg-orange-950/30 border border-orange-500/30 rounded-lg p-3 hover:bg-orange-950/50 transition-all duration-300 group card-depth hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className="flex items-start gap-3">
                                        <TrendingDown size={20} className="text-orange-400 shrink-0 group-hover:animate-bounce" />
                                        <div className="text-left flex-1">
                                            <div className="text-xs font-bold text-orange-300 mb-1">Saboter Infrastructure</div>
                                            <div className="text-[10px] text-orange-200/70 leading-relaxed">
                                                Désactive temporairement une mine (-50% prod pendant 1h)
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-[9px] text-orange-400/80">
                                                <Clock size={10} />
                                                <span>Durée: 1 heure</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* Option 2: Voler tech */}
                                <button
                                    onClick={() => onSabotage('steal_tech')}
                                    className="w-full bg-purple-950/30 border border-purple-500/30 rounded-lg p-3 hover:bg-purple-950/50 transition-all duration-300 group card-depth hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className="flex items-start gap-3">
                                        <Eye size={20} className="text-purple-400 shrink-0 group-hover:animate-pulse" />
                                        <div className="text-left flex-1">
                                            <div className="text-xs font-bold text-purple-300 mb-1">Espionnage Industriel</div>
                                            <div className="text-[10px] text-purple-200/70 leading-relaxed">
                                                Vole des données techniques (-20% temps recherche suivante)
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-[9px] text-purple-400/80">
                                                <Skull size={10} />
                                                <span>Risque: Élevé</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </Section>
                    ) : (
                        <Section title="Opérations Clandestines" icon={Zap} isLocked={true} delay={4}>
                            <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
                                <Lock size={20} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-xs font-bold text-red-300 mb-1">Avantage Technologique Insuffisant</div>
                                    <div className="text-[10px] text-red-200/70 leading-relaxed">
                                        Votre niveau d'espionnage doit être supérieur d'au moins <span className="font-bold text-red-300">1 niveau</span> à la cible pour effectuer des sabotages.
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-400">
                                        Delta Tech actuel: <span className={report.tech_difference >= 0 ? "text-amber-400" : "text-red-400"}>{report.tech_difference}</span> (minimum requis: +1)
                                    </div>
                                </div>
                            </div>
                        </Section>
                    )}
                </>
            )}
        </div>

        <div className="p-4 bg-slate-900 border-t border-white/5">
            <Button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-widest card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                Fermer le dossier
            </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// --- SOUS-COMPOSANTS ---

function Section({ title, icon: Icon, children, isLocked, delay }: any) {
    if (isLocked) {
        return (
            <div className="opacity-50 grayscale select-none relative overflow-hidden rounded-xl border border-dashed border-slate-700 p-4 bg-slate-900/30">
                <div className="flex items-center gap-2 mb-3 opacity-50">
                    <Icon size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-widest">{title}</h4>
                </div>
                <div className="flex flex-col items-center justify-center py-4 text-slate-500 gap-2">
                    <Lock size={24} />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Données Insuffisantes</span>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${delay * 100}ms` }}>
            <div className="flex items-center gap-2 mb-3 text-slate-400">
                <Icon size={16} className="text-blue-400 animate-bounce-subtle" />
                <h4 className="text-xs font-bold uppercase tracking-widest">{title}</h4>
            </div>
            {children}
        </div>
    );
}

function ResourceCard({ icon: Icon, label, value, color }: any) {
    return (
        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-white/5 flex flex-col items-center text-center gap-1 group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 card-depth">
            <Icon size={14} className={`${color} group-hover:scale-110 transition-transform`} />
            <span className="text-[9px] uppercase font-bold text-slate-500">{label}</span>
            <span className={`text-xs font-mono font-bold ${color}`}>{Math.floor(value).toLocaleString()}</span>
        </div>
    );
}
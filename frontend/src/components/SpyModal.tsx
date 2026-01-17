import { X, Eye, ScanEye, Pickaxe, Hexagon, Droplet, Ship, ShieldAlert, Lock, AlertTriangle } from "lucide-react";
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
}

export default function SpyModal({ report, onClose }: SpyModalProps) {
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
      <DialogContent className="bg-slate-950 border border-slate-800 text-white max-w-lg p-0 overflow-hidden sm:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* HEADER */}
        <div className="relative p-6 bg-slate-900/50 border-b border-white/5 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <ScanEye size={120} />
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
                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
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
                                    <div key={key} className="flex justify-between items-center p-2 bg-white/5 rounded border border-white/5">
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
                     <div className="flex items-center gap-4 p-3 bg-red-950/20 border border-red-500/20 rounded-lg">
                        <AlertTriangle className="text-red-500" size={24} />
                        <div>
                            <div className="text-xs uppercase font-bold text-red-400">Signature Défensive</div>
                            <div className="text-lg font-black text-white">{report.defense > 0 ? `${report.defense} Unités` : "Aucune défense"}</div>
                        </div>
                     </div>
                ) : null}
            </Section>
        </div>

        <div className="p-4 bg-slate-900 border-t border-white/5">
            <Button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-widest">
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
                <Icon size={16} className="text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-widest">{title}</h4>
            </div>
            {children}
        </div>
    );
}

function ResourceCard({ icon: Icon, label, value, color }: any) {
    return (
        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-white/5 flex flex-col items-center text-center gap-1">
            <Icon size={14} className={color} />
            <span className="text-[9px] uppercase font-bold text-slate-500">{label}</span>
            <span className={`text-xs font-mono font-bold ${color}`}>{Math.floor(value).toLocaleString()}</span>
        </div>
    );
}
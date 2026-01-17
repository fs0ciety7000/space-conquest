import { useState } from "react";
import { Save, User, Globe, Shield, Terminal, LogOut, Mail, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
interface SettingsProps {
  planet: any;
  onUpdate: () => void;
  onLogout: () => void;
}

export default function Settings({ planet, onUpdate, onLogout }: SettingsProps) {
  const [planetName, setPlanetName] = useState(planet.name);
  const [loading, setLoading] = useState(false);
  
  const username = localStorage.getItem('username') || "Commandant";
  const email = localStorage.getItem('email') || "Non renseigné";
  
  // Génération d'un avatar stylé basé sur le pseudo
  const avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const handleRename = async () => {
    if (!planetName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/rename`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_name: planetName }),
      });

      if (res.ok) {
        toast.success("Système renommé", { description: `Désignation actuelle : ${planetName}` });
        onUpdate();
      } else {
        const data = await res.json();
        toast.error("Erreur", { description: data.error });
      }
    } catch (error) {
      toast.error("Lien neural rompu avec le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
      
      {/* --- PROFIL COMMANDANT --- */}
      <Card className="bg-slate-950 border-white/10 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-indigo-900 to-purple-900 opacity-50"></div>
        <CardContent className="relative pt-0">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 mb-6">
                <div className="w-32 h-32 rounded-2xl bg-slate-900 border-4 border-slate-950 shadow-2xl overflow-hidden">
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="pb-2 text-center md:text-left">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        {username} <Shield size={20} className="text-indigo-400" />
                    </h2>
                    <p className="text-slate-400 font-mono text-xs flex items-center gap-2 justify-center md:justify-start">
                        <Fingerprint size={12} /> ID-CORE: {planet.owner_id.substring(0, 8)}...
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-6">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <Mail className="text-slate-500" size={18} />
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Canal de communication</p>
                        <p className="text-sm text-white font-mono">{email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <Globe className="text-slate-500" size={18} />
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Planète Capitale</p>
                        <p className="text-sm text-white font-mono">{planet.name}</p>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* --- CONFIGURATION PLANÈTE --- */}
        <Card className="bg-slate-900/50 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
                    <Globe size={16} /> Identifiant Planétaire
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nom de la colonie</label>
                    <div className="flex gap-2">
                        <Input 
                            value={planetName} 
                            onChange={(e) => setPlanetName(e.target.value)} 
                            className="bg-black/40 border-white/10 text-white font-mono focus:border-indigo-500"
                        />
                        <Button 
                            onClick={handleRename} 
                            disabled={loading || planetName === planet.name}
                            className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                        >
                            <Save size={16} />
                        </Button>
                    </div>
                </div>
                <div className="p-3 bg-indigo-500/5 rounded border border-indigo-500/20">
                    <p className="text-[10px] text-indigo-300 leading-relaxed italic">
                        "La désignation officielle de votre planète est transmise aux relais subspatiaux et sera visible par tous les commandants de la galaxie."
                    </p>
                </div>
            </CardContent>
        </Card>

        {/* --- ACTIONS COMPTE --- */}
        <Card className="bg-slate-900/50 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-400">
                    <Terminal size={16} /> Sécurité & Terminal
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    <Button 
                        variant="outline"
                        className="w-full border-white/5 bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center justify-between"
                        onClick={() => toast.info("Module en développement", { description: "Le cryptage de mot de passe est déjà actif." })}
                    >
                        CHANGER LE MOT DE PASSE <ArrowRight size={14} />
                    </Button>
                    
                    <Button 
                        variant="destructive" 
                        className="w-full bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 flex items-center gap-2 justify-center font-bold tracking-widest text-xs"
                        onClick={onLogout}
                    >
                        <LogOut size={16} /> DÉCONNEXION DU TERMINAL
                    </Button>
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}

// Petit helper pour l'icône de flèche manquante
function ArrowRight({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    );
}
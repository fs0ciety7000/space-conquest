import { useState } from 'react';
import { Power, User, ArrowRight, ShieldCheck, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface LoginProps {
  onLogin: (token: string, planetId: string, userId: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

const API = import.meta.env.VITE_API_URL;

const endpoint = isRegistering
  ? `${API}/register`
  : `${API}/login`;
    
    const body = isRegistering 
        ? { username, email, password }
        : { identifier: username, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      if (isRegistering) {
        toast.success("Compte créé avec succès ! Connectez-vous.");
        setIsRegistering(false);
        setPassword('');
      } else {
        toast.success(`Bienvenue, Commandant ${data.username}`);
        onLogin(data.token, data.planet_id, data.user_id);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2048&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>
        </div>

        <Card className="w-full max-w-md bg-slate-950/80 border-slate-800 p-8 backdrop-blur-xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col items-center mb-8">
                <div className="h-16 w-16 bg-indigo-600/20 rounded-full flex items-center justify-center mb-4 border border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                    <Power size={32} className="text-indigo-400" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-widest uppercase">Space Conquest</h1>
                <p className="text-slate-400 text-sm mt-2 font-mono">Terminal d'accès v3.0</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <div className="relative group">
                        <User className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <Input 
                            type="text" 
                            placeholder="Identifiant" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)}
                            className="pl-10 bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500 h-11"
                            required
                        />
                    </div>
                </div>

                {isRegistering && (
                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <Input 
                                type="email" 
                                placeholder="Email Quantique" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500 h-11"
                                required
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <Input 
                            type="password" 
                            placeholder="Code d'accès" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500 h-11"
                            required
                        />
                    </div>
                </div>

                {error && <div className="text-red-400 text-xs font-bold text-center bg-red-950/30 p-2 rounded border border-red-900/50">{error}</div>}

                <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6 mt-4 shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98]">
                    {loading ? (
                        <span className="animate-pulse">Connexion...</span>
                    ) : (
                        <span className="flex items-center gap-2">
                            {isRegistering ? "INITIALISER" : "CONNEXION"} <ArrowRight size={18} />
                        </span>
                    )}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                    className="text-xs text-slate-500 hover:text-indigo-400 transition-colors uppercase font-bold tracking-wider"
                >
                    {isRegistering ? "Déjà un compte ? Se connecter" : "Nouvelle colonie ? S'enregistrer"}
                </button>
            </div>
            
            <div className="absolute bottom-4 right-4 flex items-center gap-1 text-[10px] text-slate-600">
                <ShieldCheck size={12} /> SECURE
            </div>
        </Card>
    </div>
  );
}
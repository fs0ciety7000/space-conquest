import { useState } from 'react';
import { Power, User, ArrowRight, ShieldCheck, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner"; // On garde les toasts pour le succès

interface LoginProps {
  onLogin: (token: string, planetId: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // Nouveau state Email
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegistering ? 'http://localhost:8080/register' : 'http://localhost:8080/login';
    
    // On construit le body selon le mode
    const body = isRegistering 
        ? { username, email, password }
        : { identifier: username, password }; // Le backend attend 'identifier' pour le login

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        if (isRegistering) {
            toast.success("Succès", { description: "Compte créé. Connectez-vous." });
            setIsRegistering(false);
            setPassword(""); // On vide le mot de passe par sécurité
        } else {
            // Sauvegarde des infos locales
            localStorage.setItem('username', data.username);
            if(data.email) localStorage.setItem('email', data.email);
            
            onLogin(data.token, data.planet_id);
        }
      } else {
        setError(data.error || "Une erreur est survenue");
      }
    } catch (err) {
      setError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black"></div>
      
      <Card className="w-full max-w-md bg-black/80 border border-white/10 backdrop-blur-xl p-8 relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/50 animate-pulse">
            <Power className="text-indigo-400" size={32} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            SPACE CONQUEST
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-2">
            {isRegistering ? 'Initialisation Colonie' : 'Identification Requise'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Champ Pseudo */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">
                {isRegistering ? "Identifiant" : "Pseudo ou Email"}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <Input 
                type="text" 
                placeholder="Votre pseudo" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 focus:border-indigo-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Champ Email (Seulement si Inscription) */}
          {isRegistering && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Email Sécurisé</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <Input 
                    type="email" 
                    placeholder="contact@flotte.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>
          )}

          {/* Champ Mot de passe */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 focus:border-indigo-500 transition-all"
                required
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <ShieldCheck size={14} /> {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
          >
            {loading ? 'Traitement...' : (isRegistering ? "Fondation Colonie" : "Connexion")} <ArrowRight size={18} className="ml-2" />
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(null); setUsername(""); setPassword(""); setEmail(""); }}
            className="text-slate-500 hover:text-white text-xs underline underline-offset-4 transition-colors uppercase tracking-wide"
          >
            {isRegistering ? "Retour à la connexion" : "Nouveau ? Créer un compte"}
          </button>
        </div>
      </Card>
    </div>
  );
}
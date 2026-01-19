import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, ShieldCheck, Lock, Mail, AlertCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SpaceBackground, SpaceLoader } from "@/components/ui/space-background";
import { toast } from "sonner";

interface LoginProps {
  onLogin: (token: string, planetId: string, userId: string, username: string, email: string) => void;
}

interface LoginResponse {
  token: string;
  planet_id: string;
  user_id: string;
  username: string;
  email:  string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
}

const getApiUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }
  
  if (!apiUrl) {
    throw new Error('VITE_API_URL manquante en prod');
  }
  
  return apiUrl.replace(/\/$/, '');
};

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Validation locale
  const validateForm = (): boolean => {
    if (!username.trim()) {
      setError("L'identifiant est requis");
      toast.error("L'identifiant est requis");
      return false;
    }

    if (username.length < 3) {
      setError("L'identifiant doit contenir au moins 3 caractères");
      toast.error("L'identifiant doit contenir au moins 3 caractères");
      return false;
    }

    if (!password) {
      setError("Le mot de passe est requis");
      toast.error("Le mot de passe est requis");
      return false;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return false;
    }

    if (isRegistering) {
      if (!email.trim()) {
        setError("L'email est requis");
        toast.error("L'email est requis");
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Format d'email invalide");
        toast.error("Format d'email invalide");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const API_BASE = getApiUrl();
    const endpoint = isRegistering ? `${API_BASE}/register` : `${API_BASE}/login`;
    
    console.log('🔗 URL de l\'API:', endpoint);
    
    const body = isRegistering 
      ? { username, email, password }
      : { identifier: username, password };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      console.log('📤 Envoi de la requête vers:', endpoint);
      console.log('📦 Body:', JSON.stringify(body, null, 2));

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📥 Réponse HTTP:', res.status, res.statusText);

      const contentType = res.headers.get('content-type');
      console.log('📋 Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await res.text();
        console.error('❌ Réponse non-JSON:', textResponse);
        throw new Error('Le serveur a renvoyé une réponse invalide. Vérifiez votre backend.');
      }

      let data: LoginResponse | RegisterResponse | ErrorResponse;
      
      try {
        data = await res.json();
        console.log('✅ Données reçues:', data);
      } catch (jsonError) {
        console.error('❌ Erreur parsing JSON:', jsonError);
        throw new Error('Réponse serveur invalide (JSON malformé)');
      }

      if (!res.ok) {
        const errorData = data as ErrorResponse;
        const errorMessage = errorData.error || errorData.message || 'Une erreur est survenue';
        
        if (res.status === 401) {
          throw new Error('Identifiants incorrects');
        } else if (res.status === 404) {
          throw new Error('Endpoint non trouvé. Vérifiez l\'URL du backend.');
        } else if (res.status === 405) {
          throw new Error('Méthode non autorisée. Le backend ne supporte pas POST sur cette route.');
        } else if (res.status === 409) {
          throw new Error('Ce nom d\'utilisateur ou cet email existe déjà');
        } else if (res.status >= 500) {
          throw new Error('Erreur serveur. Réessayez plus tard.');
        } else {
          throw new Error(errorMessage);
        }
      }

      if (isRegistering) {
        toast.success("✅ Compte créé avec succès ! Connectez-vous maintenant.");
        setIsRegistering(false);
        setPassword('');
        setEmail('');
        setError(null);
      } else {
        const loginData = data as LoginResponse;
        
        if (!loginData.token || !loginData.planet_id || !loginData.user_id) {
          throw new Error('Réponse de connexion invalide (données manquantes)');
        }
        
        toast.success(`🚀 Bienvenue, Commandant ${loginData.username} !`);
        onLogin(loginData.token, loginData.planet_id, loginData.user_id, loginData.username, loginData.email);
      }
    } catch (err: any) {
      console.error('💥 Erreur lors de la requête:', err);
      
      let errorMessage = 'Une erreur inconnue est survenue';
      
      if (err.name === 'AbortError') {
        errorMessage = 'La requête a expiré. Vérifiez votre connexion internet.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est accessible.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError(null);
    setPassword('');
    setEmail('');
  };

  const apiUrlDisplay = getApiUrl();
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
      {/* Fond spatial animé */}
      <SpaceBackground 
        showStars={true}
        showNebulae={true}
        showParticles={true}
        showScanLine={true}
        showGrid={true}
        starCount={150}
        particleCount={30}
      />

      {/* Carte de connexion */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10"
      >
        <Card className="w-full max-w-md glass-card border-cyan-500/20 p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Effet de scan holographique */}
          <motion.div
            className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
            animate={{ top: ['-10%', '110%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Ligne décorative en haut */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          
          {/* Coins décoratifs */}
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-cyan-500/30 rounded-tl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-500/30 rounded-tr" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-cyan-500/30 rounded-bl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-500/30 rounded-br" />
          
          <div className="flex flex-col items-center mb-8 relative">
            {/* Logo avec effet glow */}
            <motion.div
              className="relative"
              animate={{ 
                filter: ['drop-shadow(0 0 20px rgba(0,245,255,0.4))', 'drop-shadow(0 0 40px rgba(0,245,255,0.6))', 'drop-shadow(0 0 20px rgba(0,245,255,0.4))']
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <img src="/logo.svg" alt="Space Conquest" className="h-20 w-20 mb-4" />
              <motion.div
                className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
            
            <motion.h1 
              className="text-3xl font-black text-white tracking-widest uppercase text-glow-cyan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Space Conquest
            </motion.h1>
            
            <motion.p 
              className="text-cyan-400/70 text-sm mt-2 font-mono tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {isRegistering ? '// NOUVEAU COMMANDANT' : '// TERMINAL D\'ACCÈS v3.0'}
            </motion.p>
            
            {isDev && (
              <p className="text-xs text-slate-600 mt-2 font-mono">
                API: {apiUrlDisplay}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div 
              className="space-y-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative group">
                <User className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10" size={18} />
                <Input 
                  type="text" 
                  placeholder="Identifiant (min. 3 caractères)" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11 backdrop-blur-sm placeholder:text-slate-500"
                  required
                  minLength={3}
                  disabled={loading}
                />
                <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none border border-cyan-500/30" />
              </div>
            </motion.div>

            {isRegistering && (
              <motion.div 
                className="space-y-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10" size={18} />
                  <Input 
                    type="email" 
                    placeholder="Email Quantique" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11 backdrop-blur-sm placeholder:text-slate-500"
                    required
                    disabled={loading}
                  />
                </div>
              </motion.div>
            )}

            <motion.div 
              className="space-y-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="relative group">
                <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10" size={18} />
                <Input 
                  type="password" 
                  placeholder="Code d'accès (min. 6 caractères)" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11 backdrop-blur-sm placeholder:text-slate-500"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </motion.div>

            {error && (
              <motion.div 
                className="text-red-400 text-xs font-bold text-center bg-red-950/30 p-3 rounded-lg border border-red-500/30 flex items-center gap-2 justify-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={16} className="animate-pulse" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button 
                type="submit" 
                disabled={loading} 
                variant="neon"
                className="w-full py-6 mt-4 text-base"
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <SpaceLoader size={20} text="" />
                    {isRegistering ? 'INITIALISATION...' : 'CONNEXION...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Rocket size={18} />
                    {isRegistering ? "CRÉER MA COLONIE" : "LANCER LA CONNEXION"}
                    <ArrowRight size={18} />
                  </span>
                )}
              </Button>
            </motion.div>
          </form>

          <motion.div 
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button 
              onClick={toggleMode}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors uppercase font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="group-hover:underline">
                {isRegistering ? "Déjà un compte ? Se connecter" : "Nouvelle colonie ? S'enregistrer"}
              </span>
            </button>
          </motion.div>
          
          {/* Badge de sécurité */}
          <motion.div 
            className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[10px] text-cyan-500/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <ShieldCheck size={12} className="animate-pulse" />
            <span className="font-mono tracking-wider">SECURE CHANNEL</span>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { Power, User, ArrowRight, ShieldCheck, Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';

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
    
    console.log('🔗 URL de l\'API:', endpoint); // Debug
    
    const body = isRegistering 
      ? { username, email, password }
      : { identifier: username, password };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
        const registerData = data as RegisterResponse;
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

  // Afficher l'URL de l'API en mode dev
  const apiUrlDisplay = getApiUrl();
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2048&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>
      </div>

      <Card className="w-full max-w-md bg-slate-950/80 border-slate-800 p-8 backdrop-blur-xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="Space Conquest" className="h-20 w-20 mb-4 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
          <h1 className="text-3xl font-black text-white tracking-widest uppercase">Space Conquest</h1>
          <p className="text-slate-400 text-sm mt-2 font-mono">Terminal d'accès v3.0</p>
          
          {/* Afficher l'API URL en mode dev */}
          {isDev && (
            <p className="text-xs text-slate-600 mt-2 font-mono">
              API: {apiUrlDisplay}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="relative group">
              <User className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <Input 
                type="text" 
                placeholder="Identifiant (min. 3 caractères)" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500 h-11"
                required
                minLength={3}
                disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="relative group">
              <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <Input 
                type="password" 
                placeholder="Code d'accès (min. 6 caractères)" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500 h-11"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs font-bold text-center bg-red-950/30 p-3 rounded border border-red-900/50 flex items-center gap-2 justify-center animate-in slide-in-from-top-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6 mt-4 shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isRegistering ? 'INITIALISATION...' : 'CONNEXION...'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {isRegistering ? "INITIALISER" : "CONNEXION"} <ArrowRight size={18} />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={toggleMode}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-indigo-400 transition-colors uppercase font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
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

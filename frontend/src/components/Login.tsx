import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, ShieldCheck, Lock, Mail, AlertCircle, Rocket, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
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

type View = 'login' | 'register' | 'forgot' | 'reset';

const getApiUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return 'http://localhost:8080';
  if (!apiUrl) throw new Error('VITE_API_URL manquante en prod');
  return apiUrl.replace(/\/$/, '');
};

export default function Login({ onLogin }: LoginProps) {
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Détection du token de reset dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setResetToken(token);
      setView('reset');
      // Nettoyer l'URL sans recharger
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const clearError = () => setError(null);

  const switchView = (v: View) => {
    setView(v);
    clearError();
    setPassword('');
    setEmail('');
    setUsername('');
    setNewPassword('');
    setForgotSent(false);
    setResetDone(false);
  };

  const validateLoginRegister = (): boolean => {
    if (!username.trim() || username.length < 3) {
      const msg = "L'identifiant doit contenir au moins 3 caractères";
      setError(msg); toast.error(msg); return false;
    }
    if (!password || password.length < 6) {
      const msg = "Le mot de passe doit contenir au moins 6 caractères";
      setError(msg); toast.error(msg); return false;
    }
    if (view === 'register') {
      if (!email.trim()) {
        const msg = "L'email est requis"; setError(msg); toast.error(msg); return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const msg = "Format d'email invalide"; setError(msg); toast.error(msg); return false;
      }
    }
    return true;
  };

  const handleLoginRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validateLoginRegister()) return;
    setLoading(true);

    const API_BASE = getApiUrl();
    const endpoint = view === 'register' ? `${API_BASE}/register` : `${API_BASE}/login`;
    const body = view === 'register'
      ? { username, email, password }
      : { identifier: username, password };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Le serveur a renvoyé une réponse invalide.');
      }

      const data: LoginResponse | RegisterResponse | ErrorResponse = await res.json();

      if (!res.ok) {
        const errorData = data as ErrorResponse;
        if (res.status === 401) throw new Error('Identifiants incorrects');
        if (res.status === 409) throw new Error("Ce nom d'utilisateur ou cet email existe déjà");
        if (res.status >= 500) throw new Error('Erreur serveur. Réessayez plus tard.');
        throw new Error(errorData.error || errorData.message || 'Une erreur est survenue');
      }

      if (view === 'register') {
        toast.success("Compte créé avec succès ! Connectez-vous maintenant.");
        switchView('login');
      } else {
        const loginData = data as LoginResponse;
        if (!loginData.token || !loginData.planet_id || !loginData.user_id) {
          throw new Error('Réponse de connexion invalide');
        }
        toast.success(`Bienvenue, Commandant ${loginData.username} !`);
        onLogin(loginData.token, loginData.planet_id, loginData.user_id, loginData.username, loginData.email);
      }
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? 'La requête a expiré.'
        : err.message?.includes('Failed to fetch')
          ? 'Impossible de contacter le serveur.'
          : err.message || 'Erreur inconnue';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const msg = "Email invalide"; setError(msg); toast.error(msg); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Toujours OK côté UX pour ne pas divulguer les emails
      if (res.ok) {
        setForgotSent(true);
      } else {
        throw new Error('Erreur serveur');
      }
    } catch {
      // On affiche quand même le message de succès
      setForgotSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (newPassword.length < 6) {
      const msg = "Le mot de passe doit contenir au moins 6 caractères";
      setError(msg); toast.error(msg); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de réinitialisation');
      setResetDone(true);
      toast.success("Mot de passe mis à jour !");
    } catch (err: any) {
      const msg = err.message || 'Erreur serveur';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const API_BASE = getApiUrl();
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
      <SpaceBackground
        showStars={true}
        showNebulae={true}
        showParticles={true}
        showScanLine={true}
        showGrid={true}
        starCount={150}
        particleCount={30}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10"
      >
        <Card className="w-full max-w-md glass-card border-cyan-500/20 p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Scan holographique */}
          <motion.div
            className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
            animate={{ top: ['-10%', '110%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-cyan-500/30 rounded-tl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-500/30 rounded-tr" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-cyan-500/30 rounded-bl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-500/30 rounded-br" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8 relative">
            <motion.div
              className="relative"
              animate={{ filter: ['drop-shadow(0 0 20px rgba(0,245,255,0.4))', 'drop-shadow(0 0 40px rgba(0,245,255,0.6))', 'drop-shadow(0 0 20px rgba(0,245,255,0.4))'] }}
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
              {view === 'register' ? '// NOUVEAU COMMANDANT' :
               view === 'forgot' ? '// RÉCUPÉRATION D\'ACCÈS' :
               view === 'reset' ? '// NOUVEAU CODE D\'ACCÈS' :
               '// TERMINAL D\'ACCÈS v3.0'}
            </motion.p>
            {isDev && <p className="text-xs text-slate-600 mt-2 font-mono">API: {API_BASE}</p>}
          </div>

          <AnimatePresence mode="wait">
            {/* ===== LOGIN ===== */}
            {(view === 'login' || view === 'register') && (
              <motion.form
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleLoginRegister}
                className="space-y-4"
              >
                <div className="relative group">
                  <User className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10" size={18} />
                  <Input
                    type="text"
                    placeholder="Identifiant (min. 3 caractères)"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11 backdrop-blur-sm placeholder:text-slate-500"
                    required minLength={3} disabled={loading}
                  />
                  <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none border border-cyan-500/30" />
                </div>

                {view === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative group"
                  >
                    <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10" size={18} />
                    <Input
                      type="email"
                      placeholder="Email Quantique"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11 backdrop-blur-sm placeholder:text-slate-500"
                      required disabled={loading}
                    />
                  </motion.div>
                )}

                <div className="relative group">
                  <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10" size={18} />
                  <Input
                    type="password"
                    placeholder="Code d'accès (min. 6 caractères)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11 backdrop-blur-sm placeholder:text-slate-500"
                    required minLength={6} disabled={loading}
                  />
                </div>

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

                <Button type="submit" disabled={loading} variant="neon" className="w-full py-6 mt-4 text-base">
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <SpaceLoader size={20} text="" />
                      {view === 'register' ? 'INITIALISATION...' : 'CONNEXION...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Rocket size={18} />
                      {view === 'register' ? 'CRÉER MA COLONIE' : 'LANCER LA CONNEXION'}
                      <ArrowRight size={18} />
                    </span>
                  )}
                </Button>

                <div className="mt-4 flex flex-col gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => switchView(view === 'register' ? 'login' : 'register')}
                    disabled={loading}
                    className="text-xs text-slate-400 hover:text-cyan-400 transition-colors uppercase font-bold tracking-wider disabled:opacity-50"
                  >
                    {view === 'register' ? "Déjà un compte ? Se connecter" : "Nouvelle colonie ? S'enregistrer"}
                  </button>
                  {view === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      disabled={loading}
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors tracking-wider disabled:opacity-50"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
              </motion.form>
            )}

            {/* ===== FORGOT PASSWORD ===== */}
            {view === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {forgotSent ? (
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="mx-auto text-green-400" size={48} />
                    <p className="text-green-300 text-sm leading-relaxed">
                      Si un compte correspond à cet email, un lien de réinitialisation vous a été envoyé. Vérifiez votre boîte mail (et les spams).
                    </p>
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => switchView('login')}
                    >
                      <ArrowLeft size={16} className="mr-2" />
                      Retour à la connexion
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-slate-400 text-xs mb-4">
                      Entrez l'email de votre compte. Vous recevrez un lien pour définir un nouveau mot de passe.
                    </p>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-amber-400 transition-colors z-10" size={18} />
                      <Input
                        type="email"
                        placeholder="Votre email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-10 bg-slate-900/50 border-slate-700/50 text-white focus:border-amber-500/50 h-11 backdrop-blur-sm placeholder:text-slate-500"
                        required disabled={loading}
                      />
                    </div>

                    {error && (
                      <div className="text-red-400 text-xs font-bold text-center bg-red-950/30 p-3 rounded-lg border border-red-500/30 flex items-center gap-2 justify-center">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white">
                      {loading ? <SpaceLoader size={18} text="Envoi..." /> : (
                        <span className="flex items-center gap-2">
                          <KeyRound size={16} />
                          Envoyer le lien de réinitialisation
                        </span>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => switchView('login')}
                      className="w-full text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1 mt-2"
                    >
                      <ArrowLeft size={12} />
                      Retour à la connexion
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ===== RESET PASSWORD ===== */}
            {view === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {resetDone ? (
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="mx-auto text-green-400" size={48} />
                    <p className="text-green-300 text-sm">
                      Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => switchView('login')}>
                      <ArrowLeft size={16} className="mr-2" />
                      Se connecter
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <p className="text-slate-400 text-xs mb-4">
                      Choisissez votre nouveau mot de passe (au moins 6 caractères).
                    </p>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10" size={18} />
                      <Input
                        type="password"
                        placeholder="Nouveau mot de passe"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="pl-10 bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50 h-11 backdrop-blur-sm placeholder:text-slate-500"
                        required minLength={6} disabled={loading}
                      />
                    </div>

                    {error && (
                      <div className="text-red-400 text-xs font-bold text-center bg-red-950/30 p-3 rounded-lg border border-red-500/30 flex items-center gap-2 justify-center">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button type="submit" disabled={loading} variant="neon" className="w-full py-5">
                      {loading ? <SpaceLoader size={18} text="Mise à jour..." /> : (
                        <span className="flex items-center gap-2">
                          <KeyRound size={16} />
                          Définir le nouveau mot de passe
                          <ArrowRight size={16} />
                        </span>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => switchView('login')}
                      className="w-full text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1 mt-2"
                    >
                      <ArrowLeft size={12} />
                      Retour à la connexion
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Badge sécurité */}
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

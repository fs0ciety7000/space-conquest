import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, ShieldCheck, UserPlus } from "lucide-react";

export default function Login({ onLogin }: { onLogin: (token: string, pId: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const route = isRegister ? 'register' : 'login';
    try {
      const res = await fetch(`http://127.0.0.1:8080/auth/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Identifiants invalides");
      const data = await res.json();
      onLogin(data.token, data.planet_id);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
      <Card className="w-full max-w-md bg-slate-950/80 backdrop-blur-xl border-white/10 p-8 shadow-2xl">
        <div className="text-center mb-10 space-y-2">
          <Rocket className="mx-auto h-12 w-12 text-indigo-500 animate-pulse" />
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Space <span className="text-indigo-500">Conquest</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Système de Commandement Global</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Matricule</label>
            <input 
              className="w-full bg-black border border-white/10 p-3 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 outline-none" 
              placeholder="Username" 
              onChange={e => setForm({...form, username: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Code d'Accès</label>
            <input 
              className="w-full bg-black border border-white/10 p-3 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 outline-none" 
              type="password" 
              placeholder="••••••••" 
              onChange={e => setForm({...form, password: e.target.value})} 
            />
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{error}</p>}

          <Button className="w-full bg-indigo-600 hover:bg-indigo-500 h-12 font-black uppercase tracking-widest transition-all">
            {isRegister ? <><UserPlus className="mr-2 h-4 w-4" /> Initialiser le compte</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Établir la liaison</>}
          </Button>
        </form>

        <button 
          onClick={() => setIsRegister(!isRegister)} 
          className="mt-8 text-[10px] text-slate-500 hover:text-indigo-400 uppercase font-black w-full text-center transition-colors"
        >
          {isRegister ? "Liaison existante ? Connexion" : "Nouveau commandant ? Créer un matricule"}
        </button>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { FileText, Calendar, Code, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/dialog";
import { apiUrl } from '@/config/api';

export default function Changelog() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChangelog();
  }, []);

  const loadChangelog = async () => {
    try {
      const res = await fetch(apiUrl('/changelog'));
      if (res.ok) {
        const text = await res.text();
        setContent(text);
      } else {
        setError('Impossible de charger le changelog');
      }
    } catch (e) {
      setError('Erreur de connexion');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 animate-in fade-in duration-700">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-10">
            <FileText size={200} className="text-indigo-400" />
          </div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="p-4 bg-indigo-500/20 border border-indigo-500/50 rounded-xl">
              <FileText size={48} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-white mb-2">
                Changelog
              </h1>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <Calendar size={14} />
                Historique des mises à jour du jeu
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <Card className="bg-slate-950/50 border border-white/10 shadow-2xl backdrop-blur-sm">
          <div className="p-8">
            <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed overflow-x-auto">
              {content}
            </pre>
          </div>
        </Card>

        {/* Footer Info */}
        <div className="text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Code size={12} />
          <span>Généré automatiquement depuis CHANGELOG.md</span>
        </div>
      </div>
    </div>
  );
}

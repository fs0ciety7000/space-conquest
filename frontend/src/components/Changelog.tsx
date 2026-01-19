import { useState, useEffect } from 'react';
import { FileText, Calendar, Code, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiUrl } from '@/config/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
          <div className="p-8 prose prose-invert prose-sm max-w-none
            prose-headings:text-slate-200 prose-headings:font-bold
            prose-h1:text-3xl prose-h1:border-b prose-h1:border-indigo-500/30 prose-h1:pb-3 prose-h1:mb-6 prose-h1:text-indigo-400
            prose-h2:text-2xl prose-h2:text-purple-400 prose-h2:border-b prose-h2:border-purple-500/20 prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:text-cyan-400 prose-h3:mt-6 prose-h3:mb-3
            prose-h4:text-lg prose-h4:text-orange-400 prose-h4:mt-4 prose-h4:mb-2
            prose-p:text-slate-300 prose-p:leading-relaxed
            prose-strong:text-white prose-strong:font-bold
            prose-code:bg-slate-800 prose-code:text-emerald-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-900/80 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-lg prose-pre:text-sm
            prose-ul:text-slate-300 prose-ol:text-slate-300
            prose-li:my-1 prose-li:marker:text-indigo-400
            prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
            prose-table:text-slate-300
            prose-th:bg-slate-800/50 prose-th:text-slate-200 prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-slate-700
            prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-slate-700
            prose-hr:border-slate-700
            prose-blockquote:border-l-indigo-500 prose-blockquote:bg-slate-900/50 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
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

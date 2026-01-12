import { useState, useEffect } from "react";
import { Mail, Send, Trash2, User, Inbox, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CommunicationCenter({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Charger les messages (Route: /messages/list/:userId)
  useEffect(() => {
    if (!userId || userId === "null" || userId === "") {
      console.warn("CommunicationCenter: ID utilisateur manquant");
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8080/messages/list/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        } else {
          console.error("Erreur lors de la récupération des messages");
        }
      } catch (err) {
        console.error("Erreur réseau:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [userId]);

  // 2. Sélectionner et Marquer comme lu (Route: /messages/read/:id)
  const handleSelectMessage = async (msg: any) => {
    setSelectedMessage(msg);

    if (!msg.is_read) {
      try {
        const res = await fetch(`http://localhost:8080/messages/read/${msg.id}`, { 
          method: 'POST' 
        });
        
        if (res.ok) {
          // Mise à jour locale de la liste pour enlever le point bleu
          setMessages(prev => 
            prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m)
          );
        }
      } catch (e) {
        console.error("Erreur marquage lecture", e);
      }
    }
  };

  // 3. Supprimer un message (Route: /messages/delete/:id)
  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8080/messages/delete/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success("Transmission effacée");
        setMessages(prev => prev.filter(m => m.id !== id));
        setSelectedMessage(null);
      } else {
        toast.error("Échec de la suppression");
      }
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
      {/* LISTE DES MESSAGES */}
      <Card className="md:col-span-1 bg-slate-950 border-white/10 h-[600px] flex flex-col">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Inbox size={16} className="text-indigo-400" /> Boîte de Réception
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-[10px] uppercase font-mono">Scan des fréquences...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-10 text-center text-slate-600 italic text-xs font-mono">
              Aucune transmission détectée dans ce secteur.
            </div>
          ) : (
            messages.map((msg: any) => (
              <div 
                key={msg.id}
                onClick={() => handleSelectMessage(msg)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-all relative ${
                  selectedMessage?.id === msg.id 
                  ? 'bg-indigo-500/10 border-l-2 border-indigo-500' 
                  : 'hover:bg-white/5'
                }`}
              >
                {!msg.is_read && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
                
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Signal Reçu</span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-xs truncate ${!msg.is_read ? 'text-white font-bold' : 'text-slate-400'}`}>
                  {msg.subject}
                </p>
                <p className="text-[10px] text-slate-600 truncate mt-1 font-mono">
                  SRC: {msg.sender_id.substring(0, 8)}...
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* LECTEUR DE MESSAGE */}
      <Card className="md:col-span-2 bg-slate-950 border-white/10 flex flex-col h-[600px] relative overflow-hidden">
        {selectedMessage ? (
          <>
            <CardHeader className="border-b border-white/5 bg-white/5 relative z-10">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black text-white">{selectedMessage.subject}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMessage(selectedMessage.id);
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                  <User size={12} className="text-indigo-400" />
                </div>
                <span className="text-[10px] font-mono text-slate-500">ID-SOURCE: {selectedMessage.sender_id}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-8 font-mono text-sm text-slate-300 leading-relaxed whitespace-pre-wrap overflow-y-auto">
              {selectedMessage.content}
            </CardContent>
            <div className="p-4 border-t border-white/5 bg-black/40">
               <Button 
                onClick={() => toast.info("Ouverture du canal de réponse...")}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black tracking-widest uppercase"
               >
                 <Send size={14} className="mr-2" /> RÉPONDRE AU COMMANDANT
               </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-4">
            <Mail size={48} className="opacity-10" />
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Terminal en attente</p>
                <p className="text-[10px] font-mono mt-2 italic">Sélectionnez une transmission pour décryptage</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
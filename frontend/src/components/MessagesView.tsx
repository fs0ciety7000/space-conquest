import { useEffect, useState } from 'react';
import { Mail, Trash2, Send, RotateCw, Plus, ArrowLeft, User, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from '@/config/api';

interface Conversation {
    id: string;
    other_user_id: string;
    other_user_name: string;
    last_message_preview: string;
    last_message_at: string;
    unread_count: number;
}

interface ThreadMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    is_read: boolean;
    created_at: string;
    is_mine: boolean;
}

interface MessagesViewProps {
    token: string;
    userId: string;
    initialRecipient?: string | null;
}

export default function MessagesView({ token, userId, initialRecipient }: MessagesViewProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [thread, setThread] = useState<ThreadMessage[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Nouveau message
    const [isComposing, setIsComposing] = useState(false);
    const [newRecipient, setNewRecipient] = useState("");
    const [newSubject, setNewSubject] = useState("");
    const [newContent, setNewContent] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Réponse rapide
    const [replyContent, setReplyContent] = useState("");

    useEffect(() => {
        if (initialRecipient) {
            setNewRecipient(initialRecipient);
            setIsComposing(true);
        }
    }, [initialRecipient]);

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/conversations?user_id=${userId}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setConversations(await res.json());
        } catch (e) {
            toast.error("Erreur réseau");
        } finally {
            setLoading(false);
        }
    };

    const fetchThread = async (convId: string) => {
        try {
            const res = await fetch(apiUrl(`/conversations/${convId}/messages?user_id=${userId}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setThread(await res.json());
                // Marquer comme lu
                await fetch(apiUrl(`/conversations/${convId}/mark-read?user_id=${userId}`), {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchConversations(); // Refresh unread count
            }
        } catch (e) {
            toast.error("Erreur chargement thread");
        }
    };

    const handleSelectConv = (conv: Conversation) => {
        setSelectedConv(conv);
        setIsComposing(false);
        fetchThread(conv.id);
    };

    const handleSendNew = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRecipient || !newContent) return toast.error("Remplissez les champs requis");

        setIsSending(true);
        try {
            const res = await fetch(apiUrl(`/conversations/send?user_id=${userId}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    recipient_name: newRecipient, 
                    subject: newSubject || "Nouvelle discussion", 
                    content: newContent 
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("Message envoyé !");
                setNewRecipient("");
                setNewSubject("");
                setNewContent("");
                setIsComposing(false);
                fetchConversations();
                
                // Ouvrir la conversation créée
                const conv = conversations.find(c => c.id === data.conversation_id);
                if (conv) handleSelectConv(conv);
            } else {
                const err = await res.json();
                toast.error(err.error);
            }
        } catch (e) {
            toast.error("Erreur réseau");
        } finally {
            setIsSending(false);
        }
    };

    const handleReply = async () => {
        if (!replyContent || !selectedConv) return;

        try {
            const res = await fetch(apiUrl(`/conversations/send?user_id=${userId}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient_name: selectedConv.other_user_name,
                    content: replyContent
                })
            });

            if (res.ok) {
                setReplyContent("");
                fetchThread(selectedConv.id);
                toast.success("Réponse envoyée");
            }
        } catch (e) {
            toast.error("Erreur envoi");
        }
    };

    useEffect(() => {
        if (userId && token) fetchConversations();
    }, [userId, token]);

    return (
        <div className="flex h-[calc(100vh-200px)] max-w-7xl mx-auto gap-4">
            
            {/* SIDEBAR : LISTE DES CONVERSATIONS */}
            <div className="w-80 flex flex-col bg-slate-900/80 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-slate-950/50 flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest text-sm text-white flex items-center gap-2">
                        <MessageCircle size={18} className="text-indigo-400"/> Conversations
                    </h3>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={fetchConversations} className="h-7 w-7">
                            <RotateCw size={14} className={loading ? "animate-spin" : ""}/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsComposing(true)} className="h-7 w-7 text-indigo-400">
                            <Plus size={16}/>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => handleSelectConv(conv)}
                            className={`w-full p-3 border-b border-white/5 text-left transition-all hover:bg-white/5 ${
                                selectedConv?.id === conv.id ? 'bg-indigo-900/30 border-l-4 border-l-indigo-500' : ''
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-white">{conv.other_user_name}</span>
                                {conv.unread_count > 0 && (
                                    <span className="bg-indigo-500 text-white text-[10px] px-1.5 rounded-full font-bold">
                                        {conv.unread_count}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{conv.last_message_preview}</p>
                            <span className="text-[10px] text-slate-600 font-mono">
                                {new Date(conv.last_message_at).toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ZONE PRINCIPALE */}
            <div className="flex-1 flex flex-col bg-slate-900/40 border border-white/10 rounded-xl overflow-hidden">
                
                {isComposing ? (
                    // FORMULAIRE NOUVEAU MESSAGE
                    <div className="flex-1 flex flex-col">
                        <div className="p-4 border-b border-white/10 bg-slate-950/50 flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => setIsComposing(false)}>
                                <ArrowLeft size={18}/>
                            </Button>
                            <h3 className="font-black uppercase text-sm tracking-widest text-indigo-400">
                                Nouveau Message
                            </h3>
                        </div>
                        
                        <form onSubmit={handleSendNew} className="flex-1 flex flex-col p-6 gap-4">
                            <Input
                                placeholder="Destinataire (pseudo)"
                                value={newRecipient}
                                onChange={e => setNewRecipient(e.target.value)}
                                className="bg-slate-950 border-slate-800"
                            />
                            <Input
                                placeholder="Sujet (optionnel)"
                                value={newSubject}
                                onChange={e => setNewSubject(e.target.value)}
                                className="bg-slate-950 border-slate-800"
                            />
                            <Textarea
                                placeholder="Votre message..."
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                                className="flex-1 bg-slate-950 border-slate-800 resize-none font-mono"
                            />
                            <Button type="submit" disabled={isSending} className="bg-indigo-600 hover:bg-indigo-500 font-bold">
                                {isSending ? "Envoi..." : "Envoyer"}
                            </Button>
                        </form>
                    </div>
                ) : selectedConv ? (
                    // VUE THREAD
                    <>
                        <div className="p-4 border-b border-white/10 bg-slate-950/50 flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedConv(null)} className="lg:hidden">
                                <ArrowLeft size={18}/>
                            </Button>
                            <User size={18} className="text-indigo-400"/>
                            <h3 className="font-bold text-white">{selectedConv.other_user_name}</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {thread.map(msg => (
                                <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-xl ${
                                        msg.is_mine 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'bg-slate-800 text-slate-200'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        <span className="text-[10px] opacity-60 block mt-1">
                                            {new Date(msg.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-white/10 flex gap-2">
                            <Textarea
                                placeholder="Répondre..."
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                className="flex-1 bg-slate-950 border-slate-800 resize-none h-12"
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply();
                                    }
                                }}
                            />
                            <Button onClick={handleReply} className="bg-indigo-600 hover:bg-indigo-500 px-6">
                                <Send size={16}/>
                            </Button>
                        </div>
                    </>
                ) : (
                    // VUE VIDE
                    <div className="flex-1 flex items-center justify-center text-slate-600">
                        <div className="text-center">
                            <Mail size={48} className="mx-auto mb-3 opacity-30"/>
                            <p className="text-sm font-mono uppercase">Sélectionnez une conversation</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

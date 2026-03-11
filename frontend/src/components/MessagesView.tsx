import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, RotateCw, Plus, ArrowLeft, User, MessageCircle, Archive, ArchiveRestore, Inbox, Globe, Users, Bell, ShieldAlert, Coins, Hammer, Rocket } from "lucide-react";
import { toast } from "sonner";
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
    is_archived: boolean;
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

interface GlobalChatMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    created_at: string;
    is_mine: boolean;
}

type ViewMode = 'inbox' | 'archived' | 'galactic' | 'notifications';

interface MessagesViewProps {
    token: string;
    userId: string;
    initialRecipient?: string | null;
    initialTab?: 'inbox' | 'archived' | 'galactic' | 'notifications';
}

export default function MessagesView({ token, userId, initialRecipient, initialTab }: MessagesViewProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [thread, setThread] = useState<ThreadMessage[]>([]);
    const [loading, setLoading] = useState(false);

    const [viewMode, setViewMode] = useState<ViewMode>('inbox');
    const showArchived = viewMode === 'archived';

    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedNotif, setSelectedNotif] = useState<any | null>(null);

    const [globalMessages, setGlobalMessages] = useState<GlobalChatMessage[]>([]);
    const [globalChatInput, setGlobalChatInput] = useState("");
    const [sendingGlobal, setSendingGlobal] = useState(false);
    const globalChatRef = useRef<HTMLDivElement>(null);

    const [isComposing, setIsComposing] = useState(false);
    const [newRecipient, setNewRecipient] = useState("");
    const [newSubject, setNewSubject] = useState("");
    const [newContent, setNewContent] = useState("");
    const [isSending, setIsSending] = useState(false);

    const [replyContent, setReplyContent] = useState("");

    useEffect(() => {
        if (initialRecipient) {
            setNewRecipient(initialRecipient);
            setIsComposing(true);
        }
    }, [initialRecipient]);

    useEffect(() => {
        if (initialTab) {
            setViewMode(initialTab);
        }
    }, [initialTab]);

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const url = showArchived
                ? apiUrl(`/conversations?user_id=${userId}&show_archived=true`)
                : apiUrl(`/conversations?user_id=${userId}`);

            const res = await fetch(url, {
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
                await fetch(apiUrl(`/conversations/${convId}/read?user_id=${userId}`), {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchConversations();
            }
        } catch (e) {
            toast.error("Erreur chargement thread");
        }
    };

    const fetchAllNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/users/${userId}/notifications`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (e) {
            toast.error("Erreur réseau");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleArchive = async (convId: string, currentlyArchived: boolean) => {
        try {
            const res = await fetch(apiUrl(`/conversations/${convId}/archive?user_id=${userId}`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ archived: !currentlyArchived })
            });

            if (res.ok) {
                toast.success(currentlyArchived ? "Conversation restaurée" : "Conversation archivée");
                fetchConversations();
                if (selectedConv?.id === convId && !currentlyArchived) {
                    setSelectedConv(null);
                }
            } else {
                toast.error("Erreur lors de l'archivage");
            }
        } catch (e) {
            toast.error("Erreur réseau");
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
            const res = await fetch(apiUrl(`/send-message-v2?user_id=${userId}`), {
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

                setTimeout(() => {
                    const conv = conversations.find(c => c.id === data.conversation_id);
                    if (conv) handleSelectConv(conv);
                }, 500);
            } else {
                const err = await res.json();
                toast.error(err.error || "Erreur d'envoi");
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
            const res = await fetch(apiUrl(`/send-message-v2?user_id=${userId}`), {
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

    const fetchGlobalChat = async () => {
        try {
            const res = await fetch(apiUrl(`/global-chat?user_id=${userId}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGlobalMessages(data);
                setTimeout(() => {
                    if (globalChatRef.current) {
                        globalChatRef.current.scrollTop = globalChatRef.current.scrollHeight;
                    }
                }, 100);
            }
        } catch (e) {
            console.error("Erreur chargement chat galactique", e);
        }
    };

    const handleSendGlobalChat = async () => {
        if (!globalChatInput.trim() || sendingGlobal) return;

        setSendingGlobal(true);
        try {
            const res = await fetch(apiUrl(`/global-chat?user_id=${userId}`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: globalChatInput.trim() })
            });

            if (res.ok) {
                setGlobalChatInput("");
                fetchGlobalChat();
            } else {
                const err = await res.json();
                toast.error(err.error || "Erreur d'envoi");
            }
        } catch (e) {
            toast.error("Erreur réseau");
        } finally {
            setSendingGlobal(false);
        }
    };

    useEffect(() => {
        if (userId && token) {
            if (viewMode === 'galactic') {
                fetchGlobalChat();
                const interval = setInterval(fetchGlobalChat, 5000);
                return () => clearInterval(interval);
            } else if (viewMode === 'notifications') {
                fetchAllNotifications();
            } else {
                fetchConversations();
            }
        }
    }, [userId, token, viewMode]);

    const activeConversations = conversations.filter(c => !c.is_archived);
    const archivedConversations = conversations.filter(c => c.is_archived);
    const displayedConversations = showArchived ? archivedConversations : activeConversations;

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)] max-w-7xl mx-auto gap-2 lg:gap-4 px-2 lg:px-0">

            {/* SIDEBAR */}
            <div className={`${selectedConv || isComposing ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-col bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-xl overflow-hidden backdrop-blur-[12px] card-depth`}>
                <div className="p-3 lg:p-4 border-b border-cyan-500/10 bg-[rgba(16,8,46,0.95)]">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-black uppercase tracking-widest text-xs lg:text-sm text-slate-200 flex items-center gap-2">
                            <MessageCircle size={16} className="lg:w-[18px] lg:h-[18px] text-cyan-400" />
                            {showArchived ? "Archivées" : "Boîte de réception"}
                        </h3>
                        <div className="flex gap-1 lg:gap-2">
                            <Button variant="ghost" size="icon" onClick={fetchConversations} className="h-6 w-6 lg:h-7 lg:w-7 hover:scale-110 transition-all duration-300">
                                <RotateCw size={12} className={`lg:w-3.5 lg:h-3.5 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setIsComposing(true)} className="h-6 w-6 lg:h-7 lg:w-7 text-cyan-400 hover:scale-110 transition-all duration-300">
                                <Plus size={14} className="lg:w-4 lg:h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* ONGLETS */}
                    <div className="flex gap-1 lg:gap-2">
                        <button
                            onClick={() => { setViewMode('inbox'); setSelectedConv(null); }}
                            className={`flex-1 flex items-center justify-center gap-1 px-1 lg:px-2 py-1.5 lg:py-2 rounded-lg text-[9px] lg:text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${
                                viewMode === 'inbox'
                                    ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            <Inbox size={12} className="lg:w-3.5 lg:h-3.5" />
                            <span className="hidden sm:inline">Inbox</span>
                            {activeConversations.length > 0 && (
                                <span className="bg-cyan-500 text-white text-[9px] lg:text-[10px] px-1 lg:px-1.5 rounded-full">
                                    {activeConversations.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setViewMode('galactic'); setSelectedConv(null); setIsComposing(false); }}
                            className={`flex-1 flex items-center justify-center gap-1 px-1 lg:px-2 py-1.5 lg:py-2 rounded-lg text-[9px] lg:text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${
                                viewMode === 'galactic'
                                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            <Globe size={12} className="lg:w-3.5 lg:h-3.5" />
                            <span className="hidden sm:inline">Galactique</span>
                        </button>
                        <button
                            onClick={() => { setViewMode('archived'); setSelectedConv(null); setSelectedNotif(null); }}
                            className={`flex-1 flex items-center justify-center gap-1 px-1 lg:px-2 py-1.5 lg:py-2 rounded-lg text-[9px] lg:text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${
                                viewMode === 'archived'
                                    ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            <Archive size={12} className="lg:w-3.5 lg:h-3.5" />
                            <span className="hidden sm:inline">Archives</span>
                        </button>
                        <button
                            onClick={() => { setViewMode('notifications'); setSelectedConv(null); setSelectedNotif(null); setIsComposing(false); }}
                            className={`flex-1 flex items-center justify-center gap-1 px-1 lg:px-2 py-1.5 lg:py-2 rounded-lg text-[9px] lg:text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${
                                viewMode === 'notifications'
                                    ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            <Bell size={12} className="lg:w-3.5 lg:h-3.5" />
                            <span className="hidden lg:inline">Alertes</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                    {viewMode === 'galactic' ? (
                        <div className="flex flex-col h-full lg:hidden">
                            <div ref={globalChatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                                {globalMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                        <Globe size={32} className="mb-2 opacity-30 animate-pulse" />
                                        <p className="text-xs font-mono">Aucun message</p>
                                        <p className="text-[10px] text-slate-600 mt-1">Soyez le premier !</p>
                                    </div>
                                ) : (
                                    globalMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-2 rounded-lg ${
                                                msg.is_mine
                                                    ? 'bg-cyan-500/15 border border-cyan-500/20 text-slate-200'
                                                    : 'bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 text-slate-300'
                                            }`}>
                                                {!msg.is_mine && (
                                                    <div className="text-[10px] font-bold text-purple-400 mb-1">{msg.sender_name}</div>
                                                )}
                                                <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                                                <span className="text-slate-600 font-mono text-xs block mt-1">
                                                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-2 border-t border-cyan-500/10 bg-[rgba(5,0,15,0.8)] flex gap-2">
                                <Input
                                    placeholder="Message galactique..."
                                    value={globalChatInput}
                                    onChange={e => setGlobalChatInput(e.target.value)}
                                    className="flex-1 bg-[rgba(5,0,15,0.8)] border-cyan-500/10 text-sm text-slate-200"
                                    maxLength={500}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendGlobalChat();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={handleSendGlobalChat}
                                    disabled={!globalChatInput.trim() || sendingGlobal}
                                    className="bg-purple-600 hover:bg-purple-500 px-3"
                                >
                                    <Send size={14} />
                                </Button>
                            </div>
                        </div>
                    ) : viewMode === 'notifications' ? (
                        notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
                                <Bell size={32} className="mb-2 opacity-30" />
                                <p className="text-xs font-mono">Aucune notification</p>
                            </div>
                        ) : (
                            notifications.map(notif => {
                                const isRead = notif.read;
                                let accentClass = 'border-l-2 border-cyan-500/40';
                                if (notif.type === 'combat') accentClass = 'border-l-2 border-red-500/40';
                                else if (notif.type === 'build') accentClass = 'border-l-2 border-emerald-500/40';
                                else if (notif.type === 'market') accentClass = 'border-l-2 border-amber-500/30';

                                return (
                                    <div
                                        key={notif.id}
                                        className={`group border-b border-cyan-500/10 transition-all duration-300 hover:bg-white/5 ${
                                            selectedNotif?.id === notif.id
                                                ? `bg-cyan-500/5 ${accentClass}`
                                                : isRead
                                                    ? 'bg-transparent border-l-2 border-transparent'
                                                    : `bg-cyan-500/5 ${accentClass}`
                                        }`}
                                    >
                                        <button
                                            onClick={() => { setSelectedNotif(notif); setSelectedConv(null); }}
                                            className="w-full p-2 lg:p-3 text-left flex gap-3"
                                        >
                                            <div className="mt-1">
                                                {notif.type === 'market' ? <Coins size={14} className="text-yellow-400" /> :
                                                 notif.type === 'combat' ? <ShieldAlert size={14} className="text-red-400" /> :
                                                 notif.type === 'build' ? <Hammer size={14} className="text-emerald-400" /> :
                                                 notif.type === 'expedition' ? <Rocket size={14} className="text-purple-400" /> :
                                                 <Bell size={14} className="text-cyan-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`font-bold text-xs lg:text-sm truncate pr-2 ${isRead ? 'text-slate-300' : 'text-slate-200'}`}>{notif.title}</span>
                                                    <span className="text-slate-600 font-mono text-xs whitespace-nowrap">
                                                        {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 line-clamp-2">{notif.message}</p>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })
                        )
                    ) : displayedConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
                            {showArchived ? (
                                <>
                                    <Archive size={32} className="mb-2 opacity-30" />
                                    <p className="text-xs font-mono">Aucune conversation archivée</p>
                                </>
                            ) : (
                                <>
                                    <Inbox size={32} className="mb-2 opacity-30" />
                                    <p className="text-xs font-mono">Aucune conversation</p>
                                </>
                            )}
                        </div>
                    ) : (
                        displayedConversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`group border-b border-cyan-500/10 transition-all duration-300 hover:bg-white/5 ${
                                    selectedConv?.id === conv.id
                                        ? 'bg-cyan-500/5 border-l-2 border-cyan-500/40'
                                        : 'border-l-2 border-transparent'
                                }`}
                            >
                                <button
                                    onClick={() => handleSelectConv(conv)}
                                    className="w-full p-2 lg:p-3 text-left"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-xs lg:text-sm text-slate-200">{conv.other_user_name}</span>
                                        <div className="flex items-center gap-2">
                                            {conv.unread_count > 0 && (
                                                <span className="bg-cyan-500 text-white text-[10px] px-1.5 rounded-full font-bold">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleArchive(conv.id, conv.is_archived);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded transition-all duration-300"
                                                title={conv.is_archived ? "Restaurer" : "Archiver"}
                                            >
                                                {conv.is_archived ? (
                                                    <ArchiveRestore size={14} className="text-green-400" />
                                                ) : (
                                                    <Archive size={14} className="text-slate-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">{conv.last_message_preview}</p>
                                    <span className="text-slate-600 font-mono text-xs">
                                        {new Date(conv.last_message_at).toLocaleString('fr-FR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ZONE PRINCIPALE */}
            <div className={`${!selectedConv && !isComposing ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-xl overflow-hidden backdrop-blur-[12px] card-depth`}>

                {isComposing ? (
                    <div className="flex-1 flex flex-col">
                        <div className="p-4 border-b border-cyan-500/10 bg-[rgba(16,8,46,0.95)] flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => setIsComposing(false)} className="hover:scale-110 transition-all duration-300">
                                <ArrowLeft size={18} />
                            </Button>
                            <div className="flex items-center gap-2">
                                <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Nouveau Message</span>
                            </div>
                        </div>

                        <form onSubmit={handleSendNew} className="flex-1 flex flex-col p-6 gap-4">
                            <Input
                                placeholder="Destinataire (pseudo)"
                                value={newRecipient}
                                onChange={e => setNewRecipient(e.target.value)}
                                className="bg-[rgba(5,0,15,0.8)] border-cyan-500/10 text-slate-200 focus:border-cyan-500/30"
                            />
                            <Input
                                placeholder="Sujet (optionnel)"
                                value={newSubject}
                                onChange={e => setNewSubject(e.target.value)}
                                className="bg-[rgba(5,0,15,0.8)] border-cyan-500/10 text-slate-200 focus:border-cyan-500/30"
                            />
                            <Textarea
                                placeholder="Votre message..."
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                                className="flex-1 bg-[rgba(5,0,15,0.8)] border-cyan-500/10 text-slate-200 resize-none font-mono focus:border-cyan-500/30"
                                rows={10}
                            />
                            <Button type="submit" disabled={isSending} className="bg-cyan-600 hover:bg-cyan-500 font-bold card-depth hover:scale-105 hover:-translate-y-1 transition-all duration-300">
                                {isSending ? "Envoi en cours..." : "Envoyer le message"}
                            </Button>
                        </form>
                    </div>
                ) : selectedConv ? (
                    <>
                        <div className="p-3 lg:p-4 border-b border-cyan-500/10 bg-[rgba(16,8,46,0.95)] flex items-center justify-between">
                            <div className="flex items-center gap-2 lg:gap-3">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedConv(null)} className="h-7 w-7 lg:h-auto lg:w-auto lg:hidden hover:scale-110 transition-all duration-300">
                                    <ArrowLeft size={16} />
                                </Button>
                                <User size={16} className="lg:w-[18px] lg:h-[18px] text-cyan-400" />
                                <h3 className="font-bold text-sm lg:text-base text-slate-200">{selectedConv.other_user_name}</h3>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleArchive(selectedConv.id, selectedConv.is_archived)}
                                className="text-slate-400 hover:text-slate-200 hover:scale-105 transition-all duration-300"
                            >
                                {selectedConv.is_archived ? (
                                    <>
                                        <ArchiveRestore size={16} className="mr-2" />
                                        Restaurer
                                    </>
                                ) : (
                                    <>
                                        <Archive size={16} className="mr-2" />
                                        Archiver
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2 lg:space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
                            <AnimatePresence>
                                {thread.map(msg => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] lg:max-w-[70%] p-2 lg:p-3 rounded-xl hover:-translate-y-0.5 transition-all duration-300 ${
                                            msg.is_mine
                                                ? 'bg-cyan-500/15 border border-cyan-500/20 text-slate-200'
                                                : 'bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 text-slate-300'
                                        }`}>
                                            <p className="text-xs lg:text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            <span className="text-slate-600 font-mono text-xs block mt-1">
                                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        <div className="p-2 lg:p-4 border-t border-cyan-500/10 bg-[rgba(5,0,15,0.8)] flex gap-2">
                            <Textarea
                                placeholder="Répondre..."
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                className="flex-1 bg-[rgba(5,0,15,0.8)] border-cyan-500/10 text-slate-200 resize-none text-sm focus:border-cyan-500/30"
                                rows={2}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleReply}
                                className="bg-cyan-600 hover:bg-cyan-500 px-3 lg:px-6 card-depth hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                                disabled={!replyContent.trim()}
                            >
                                <Send size={14} className="lg:w-4 lg:h-4" />
                            </Button>
                        </div>
                    </>
                ) : viewMode === 'galactic' ? (
                    <div className="flex-1 flex flex-col">
                        <div className="p-4 border-b border-cyan-500/10 bg-[rgba(16,8,46,0.95)] flex items-center gap-3">
                            <Globe size={20} className="text-purple-400 animate-pulse" />
                            <div>
                                <h3 className="font-black uppercase text-sm tracking-widest text-purple-300">
                                    Canal Galactique
                                </h3>
                                <p className="text-[10px] text-purple-400/60">Chat en temps réel • Tous les joueurs</p>
                            </div>
                            <div className="ml-auto flex items-center gap-2 text-[10px] text-purple-400/60">
                                <Users size={12} />
                                <span>Public</span>
                            </div>
                        </div>

                        <div ref={globalChatRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
                            {globalMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <Globe size={48} className="mb-3 opacity-30 animate-pulse" />
                                    <p className="text-sm font-mono">Aucun message dans le chat galactique</p>
                                    <p className="text-xs text-slate-600 mt-2">Soyez le premier à envoyer un message !</p>
                                </div>
                            ) : (
                                globalMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-xl transition-all hover:shadow-lg ${
                                            msg.is_mine
                                                ? 'bg-cyan-500/15 border border-cyan-500/20 text-slate-200'
                                                : 'bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 text-slate-300'
                                        }`}>
                                            {!msg.is_mine && (
                                                <div className="text-[10px] font-bold text-purple-400 mb-1 flex items-center gap-1">
                                                    <User size={10} />
                                                    {msg.sender_name}
                                                </div>
                                            )}
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            <span className="text-slate-600 font-mono text-xs block mt-1">
                                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-cyan-500/10 bg-[rgba(5,0,15,0.8)]">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Envoyer un message à tous les joueurs..."
                                    value={globalChatInput}
                                    onChange={e => setGlobalChatInput(e.target.value)}
                                    className="flex-1 bg-[rgba(5,0,15,0.8)] border-cyan-500/10 text-slate-200 focus:border-cyan-500/30"
                                    maxLength={500}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendGlobalChat();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={handleSendGlobalChat}
                                    disabled={!globalChatInput.trim() || sendingGlobal}
                                    className="bg-purple-600 hover:bg-purple-500 px-6 card-depth hover:scale-105 transition-all"
                                >
                                    <Send size={16} />
                                </Button>
                            </div>
                            <p className="text-[9px] text-slate-600 mt-2 text-center">
                                {globalChatInput.length}/500 caractères • Appuyez sur Entrée pour envoyer
                            </p>
                        </div>
                    </div>
                ) : selectedNotif ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 flex flex-col p-4 md:p-8"
                    >
                        <div className="max-w-3xl w-full mx-auto space-y-6">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedNotif(null)} className="lg:hidden hover:scale-110 transition-all duration-300 mb-4">
                                <ArrowLeft size={18} />
                            </Button>

                            <div className="flex items-center gap-4 border-b border-cyan-500/10 pb-6">
                                <div className="p-3 lg:p-4 rounded-xl border border-cyan-500/10 bg-[rgba(10,5,32,0.85)] shadow-lg">
                                    {selectedNotif.type === 'market' ? <Coins size={24} className="text-yellow-400" /> :
                                     selectedNotif.type === 'combat' ? <ShieldAlert size={24} className="text-red-400" /> :
                                     selectedNotif.type === 'build' ? <Hammer size={24} className="text-emerald-400" /> :
                                     selectedNotif.type === 'expedition' ? <Rocket size={24} className="text-purple-400" /> :
                                     <Bell size={24} className="text-cyan-400" />}
                                </div>
                                <div>
                                    <h2 className="text-xl lg:text-2xl font-black uppercase text-slate-200 tracking-wide">{selectedNotif.title}</h2>
                                    <div className="text-slate-600 font-mono text-xs mt-1 flex items-center gap-4">
                                        <span>Rapport Réglementaire</span>
                                        <span>•</span>
                                        <span>{new Date(selectedNotif.created_at).toLocaleString('fr-FR')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-xl p-6 shadow-inner whitespace-pre-wrap leading-relaxed text-sm lg:text-base text-slate-300">
                                {selectedNotif.message}
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    onClick={() => setSelectedNotif(null)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-cyan-500/10 font-bold uppercase tracking-wider text-xs px-6"
                                >
                                    Fermer
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                        <MessageCircle size={48} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-bold text-slate-400 mb-2">Messagerie Royale</h3>
                        <p className="text-sm max-w-sm">
                            Sélectionnez une conversation, une transmission galactique ou une notification à consulter.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

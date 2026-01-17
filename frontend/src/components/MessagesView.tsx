import { useEffect, useState } from 'react';
import { Mail, Trash2, Send, RotateCw, Plus, Reply, User } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiUrl } from '@/config/api';
interface Message {
    id: string;
    sender_id: string;
    sender_name: string;
    subject: string;
    content: string;
    is_read: boolean;
    created_at: string;
}

interface MessagesViewProps {
    token: string;
    userId: string;
    initialRecipient?: string | null; // <-- Prop ajoutée
}

export default function MessagesView({ token, userId, initialRecipient }: MessagesViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    
    // États pour l'envoi
    const [isSending, setIsSending] = useState(false);
    const [recipientName, setRecipientName] = useState("");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Effet pour ouvrir le modal si un destinataire est passé en prop
    useEffect(() => {
        if (initialRecipient) {
            setRecipientName(initialRecipient);
            setIsModalOpen(true);
        }
    }, [initialRecipient]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/messages?user_id=${userId}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessages(await res.json());
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId && token) fetchMessages();
    }, [userId, token]);

    const handleDelete = async (id: string) => {
        try {
            await fetch(apiUrl(`/messages/${id}`), {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success("Message supprimé");
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (e) {
            toast.error("Erreur suppression");
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
             await fetch(apiUrl(`/messages/${id}/read`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        } catch (e) {}
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!recipientName || !subject || !content) return toast.error("Remplissez tous les champs");

        setIsSending(true);
        try {
            const res = await fetch(apiUrl(`/messages/send?user_id=${userId}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient_name: recipientName, subject, content })
            });

            if (res.ok) {
                toast.success("Message transmis !");
                setIsModalOpen(false);
                setRecipientName("");
                setSubject("");
                setContent("");
            } else {
                const err = await res.json();
                toast.error(err.error || "Commandant introuvable");
            }
        } catch (e) {
            toast.error("Erreur réseau");
        } finally {
            setIsSending(false);
        }
    };

    const handleReply = (msg: Message) => {
        setRecipientName(msg.sender_name);
        setSubject(`RE: ${msg.subject}`);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/80 p-6 rounded-xl border border-white/10 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/20 p-3 rounded-lg border border-indigo-500/30">
                        <Mail className="text-indigo-400" size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase">Messagerie</h2>
                        <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            CANAL SÉCURISÉ
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-3 mt-4 md:mt-0 w-full md:w-auto">
                    <Button variant="outline" size="icon" onClick={fetchMessages} disabled={loading} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300">
                        <RotateCw size={18} className={loading ? "animate-spin" : ""} />
                    </Button>
                    
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 shadow-lg shadow-indigo-900/20 flex-1 md:flex-none uppercase tracking-wide">
                                <Plus size={18} /> Nouveau Message
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl tracking-widest uppercase text-indigo-400">
                                    <Send size={20}/> Transmission
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSend} className="space-y-5 mt-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Destinataire (Pseudo)</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 text-slate-500" size={16}/>
                                        <Input 
                                            value={recipientName} 
                                            onChange={e => setRecipientName(e.target.value)} 
                                            className="bg-slate-900 border-slate-800 text-white pl-10 focus:border-indigo-500"
                                            placeholder="Nom du Commandant..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sujet</Label>
                                    <Input 
                                        value={subject} 
                                        onChange={e => setSubject(e.target.value)} 
                                        className="bg-slate-900 border-slate-800 text-white focus:border-indigo-500"
                                        placeholder="Objet de la transmission..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Message</Label>
                                    <Textarea 
                                        value={content} 
                                        onChange={e => setContent(e.target.value)} 
                                        className="bg-slate-900 border-slate-800 text-white min-h-[150px] focus:border-indigo-500 resize-none font-mono text-sm leading-relaxed"
                                        placeholder="Saisissez votre message crypté..."
                                    />
                                </div>
                                <Button type="submit" disabled={isSending} className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-6 uppercase tracking-widest">
                                    {isSending ? "Envoi..." : "Envoyer"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="space-y-3">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                        <Mail size={40} className="mb-3 opacity-30" />
                        <p className="text-sm font-mono uppercase tracking-wider">Aucune transmission</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <Card 
                            key={msg.id} 
                            onClick={() => !msg.is_read && handleMarkRead(msg.id)}
                            className={`transition-all duration-200 border-slate-800 overflow-hidden group cursor-pointer ${msg.is_read ? 'bg-slate-900/40 opacity-70 hover:opacity-100' : 'bg-slate-900 border-l-4 border-l-indigo-500 shadow-lg shadow-black/50'}`}
                        >
                            <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <CardTitle className={`text-sm ${msg.is_read ? 'font-medium text-slate-400' : 'font-bold text-indigo-300'}`}>
                                            {msg.subject}
                                        </CardTitle>
                                        {!msg.is_read && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase tracking-wider font-bold">New</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                        <span>DE: <span className="text-slate-300 font-bold">{msg.sender_name}</span></span>
                                        <span className="text-slate-700">|</span>
                                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800" title="Répondre" onClick={(e) => { e.stopPropagation(); handleReply(msg); }}>
                                        <Reply size={14} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-900 hover:text-red-400 hover:bg-red-950/30" title="Supprimer" onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}>
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-4 ml-4 border-l border-white/5 font-mono">
                                {msg.content}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
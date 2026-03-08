import { useState, useEffect, useCallback } from "react";
import { Bell, ShieldAlert, Coins, Hammer, ArrowRight, Rocket, Filter, Swords, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/config/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  time: string;
}

interface NotificationCenterProps {
  userId: string;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'military' | 'economy' | 'system'>('all');

  const getCategory = (type: string) => {
    if (['combat', 'spy_alert', 'spy_report', 'sabotage'].includes(type)) return 'military';
    if (['market', 'build', 'planet_sold'].includes(type)) return 'economy';
    return 'system';
  };

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(apiUrl(`/users/${userId}/notifications?limit=30`));
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    const handleNewNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail as { notif_type: string; title: string; message: string } | undefined;
      if (!detail) return;
      const newNotif: Notification = {
        id: crypto.randomUUID(),
        type: detail.notif_type,
        title: detail.title,
        message: detail.message,
        read: false,
        time: "À l'instant",
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 30));
      setUnreadCount(prev => prev + 1);
    };

    window.addEventListener('new-notification', handleNewNotification);
    return () => window.removeEventListener('new-notification', handleNewNotification);
  }, [userId, fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await fetch(apiUrl(`/users/${userId}/notifications/read`), { method: "POST" });
    } catch (e) {
      console.error("Failed to mark notifications as read", e);
    }
    setUnreadCount(0);
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'market': return <Coins size={16} className="text-yellow-400" />;
      case 'combat': return <ShieldAlert size={16} className="text-red-400" />;
      case 'build': return <Hammer size={16} className="text-emerald-400" />;
      case 'expedition': return <Rocket size={16} className="text-purple-400" />;
      default: return <Bell size={16} className="text-indigo-400" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 md:p-2.5 rounded-full hover:bg-white/10 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 card-depth group shrink-0 hover:shadow-lg"
          title="Notifications"
        >
          <Bell size={18} className={`transition-colors ${unreadCount > 0 ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
          {unreadCount > 0 && (
              <>
                  <span className="absolute top-0 right-0 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500 border-2 border-slate-950"></span>
                  </span>
                  <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-slate-950">
                      {unreadCount}
                  </span>
              </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-slate-950/95 backdrop-blur-md border-slate-800 text-white shadow-2xl w-[320px] md:w-[380px] mr-4" align="end">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
            <span className="font-black tracking-widest uppercase text-xs text-indigo-400 flex items-center gap-2">
                <Bell size={14} /> Notifications
            </span>
            {unreadCount > 0 && (
                <button
                  className="text-[10px] text-slate-400 hover:text-white transition-colors"
                  onClick={markAllAsRead}
                >
                    Tout marquer comme lu
                </button>
            )}
        </DropdownMenuLabel>
        
        {/* Filtres */}
        <div className="flex items-center gap-1 px-2 pb-2 border-b border-white/10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab('all')}
            className={`flex-1 h-7 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all ${activeTab === 'all' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Toutes
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab('military')}
            className={`flex-1 h-7 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all ${activeTab === 'military' ? 'bg-red-600/20 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Militaire
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab('economy')}
            className={`flex-1 h-7 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all ${activeTab === 'economy' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Économie
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab('system')}
            className={`flex-1 h-7 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all ${activeTab === 'system' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Système
          </Button>
        </div>

        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            {notifications.filter(n => activeTab === 'all' || getCategory(n.type) === activeTab).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  {notifications.length === 0 ? "Aucune notification" : "Aucune notification dans cette catégorie"}
                </div>
            ) : (
                notifications.filter(n => activeTab === 'all' || getCategory(n.type) === activeTab).map((notif) => (
                    <DropdownMenuItem key={notif.id} className={`flex flex-col items-start p-3 lg:p-4 cursor-pointer focus:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${!notif.read ? 'bg-indigo-900/10' : ''}`}>
                        <div className="flex items-start gap-3 w-full">
                            <div className="mt-0.5 p-1.5 rounded-lg bg-slate-900 border border-white/5 shadow-inner">
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1 w-full">
                                    <span className={`font-bold text-sm truncate ${!notif.read ? 'text-white' : 'text-slate-300'}`}>{notif.title}</span>
                                    <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap ml-2">{notif.time}</span>
                                </div>
                                <p className={`text-xs leading-relaxed ${!notif.read ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {notif.message}
                                </p>
                            </div>
                            {!notif.read && (
                                <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 self-center ml-2 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                            )}
                        </div>
                    </DropdownMenuItem>
                ))
            )}
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="p-2">
            <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-white hover:bg-white/5" onClick={() => {
                window.dispatchEvent(new CustomEvent('open-message-tab', { detail: 'notifications' }));
            }}>
                Afficher l'historique complet <ArrowRight size={14} className="ml-1" />
            </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

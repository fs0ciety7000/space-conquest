import { useState, useEffect } from 'react';
import { X, AlertCircle, Info, Zap, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiUrl } from '@/config/api';
import { useUiPrefs } from '../hooks/useUiPrefs';

interface Announcement {
  id: number;
  title: string;
  content: string;
  announcement_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { prefs, loaded, updatePrefs } = useUiPrefs();

  useEffect(() => {
    fetch(apiUrl('/announcements/active'))
      .then(r => r.ok ? r.json() : [])
      .then(setAnnouncements)
      .catch(() => {});
  }, []);

  const dismissedIds: number[] = loaded ? (prefs.dismissed_announcements ?? []) : [];
  const visible = announcements.filter(a => !dismissedIds.includes(a.id));

  const handleHide = (id: number) => {
    const next = [...dismissedIds, id];
    updatePrefs({ dismissed_announcements: next });
  };

  if (!loaded || visible.length === 0) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle size={20} className="text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,1)]" />;
      case 'danger':
        return <Zap size={20} className="text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse" />;
      default:
        return <Info size={20} className="text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,1)]" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-orange-500 bg-gradient-to-r from-orange-950/90 via-orange-900/70 to-orange-950/90 shadow-[0_0_40px_rgba(251,146,60,0.4)]';
      case 'danger':
        return 'border-red-500 bg-gradient-to-r from-red-950/90 via-red-900/70 to-red-950/90 shadow-[0_0_40px_rgba(239,68,68,0.4)]';
      default:
        return 'border-cyan-500 bg-gradient-to-r from-cyan-950/90 via-cyan-900/70 to-cyan-950/90 shadow-[0_0_40px_rgba(6,182,212,0.4)]';
    }
  };

  const getGlowColor = (type: string) => {
    switch (type) {
      case 'warning': return 'via-orange-400';
      case 'danger': return 'via-red-400';
      default: return 'via-cyan-400';
    }
  };

  return (
    <AnimatePresence>
      {visible.map((announcement) => (
        <motion.div
          key={announcement.id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full overflow-hidden"
        >
          <div className={`relative border-2 ${getTypeColor(announcement.announcement_type)} backdrop-blur-md overflow-hidden`}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${getGlowColor(announcement.announcement_type)} to-transparent animate-pulse`}></div>
              <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${getGlowColor(announcement.announcement_type)} to-transparent animate-pulse`} style={{ animationDelay: '0.5s' }}></div>
            </div>

            <div className="relative z-10 flex items-center gap-4 px-4 py-4">
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 animate-ping opacity-75">{getTypeIcon(announcement.announcement_type)}</div>
                <div className="relative z-10">{getTypeIcon(announcement.announcement_type)}</div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-lg border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <Radio size={14} className="text-cyan-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">FLASH INFO</span>
              </div>

              <div className="flex-1 overflow-hidden relative">
                <motion.div
                  animate={{ x: [0, -2000] }}
                  transition={{ x: { repeat: Infinity, repeatType: 'loop', duration: 30, ease: 'linear' } }}
                  className="flex items-center gap-12 whitespace-nowrap"
                >
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-base font-black uppercase text-white tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{announcement.title}</span>
                      <span className="text-white/30 font-black text-lg">///</span>
                      <span className="text-base text-slate-200 font-semibold">{announcement.content}</span>
                      <span className="text-cyan-400/50 font-black text-xl">◆</span>
                    </div>
                  ))}
                </motion.div>
              </div>

              <button
                onClick={() => handleHide(announcement.id)}
                className="flex-shrink-0 p-2.5 rounded-lg bg-black/60 border border-white/20 hover:border-red-500 hover:bg-red-500/20 transition-all duration-300 group hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] cursor-pointer"
              >
                <X size={18} className="text-slate-300 group-hover:text-red-400 transition-colors" />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden">
              <motion.div
                animate={{ x: [-100, 400] }}
                transition={{ x: { repeat: Infinity, repeatType: 'loop', duration: 2, ease: 'linear' } }}
                className={`h-full w-1/4 bg-gradient-to-r from-transparent ${getGlowColor(announcement.announcement_type)} to-transparent opacity-75`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

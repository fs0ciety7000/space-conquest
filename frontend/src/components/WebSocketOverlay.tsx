import { WifiOff, Loader2 } from "lucide-react";
import { ConnectionStatus } from "@/hooks/useWebSocket";

interface WebSocketOverlayProps {
  status: ConnectionStatus;
}

export default function WebSocketOverlay({ status }: WebSocketOverlayProps) {
  if (status === 'connected') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-fade-in pointer-events-none">
      {status === 'connecting' && (
        <div className="bg-amber-950/90 border border-amber-500/50 text-amber-200 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-md pointer-events-auto">
          <Loader2 className="animate-spin text-amber-400" size={18} />
          <div>
            <div className="font-bold text-sm tracking-wide">Connexion</div>
            <div className="text-[10px] opacity-80 uppercase tracking-wider">Reconnexion radio...</div>
          </div>
        </div>
      )}

      {(status === 'disconnected' || status === 'error') && (
        <div className="bg-red-950/90 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-md animate-pulse pointer-events-auto">
          <WifiOff className="text-red-500" size={18} />
          <div>
            <div className="font-bold text-sm tracking-wide text-white">Lien perdu</div>
            <div className="text-[10px] opacity-80 uppercase tracking-wider text-red-300">Signal avec la base corrompu</div>
          </div>
        </div>
      )}
    </div>
  );
}

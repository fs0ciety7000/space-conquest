import { Activity, Clock, PackageOpen } from "lucide-react";

interface TransactionHistoryProps {
  userId: string;
}

export default function TransactionHistory({ userId }: TransactionHistoryProps) {
  return (
    <div className="relative overflow-hidden border-t-4 border-fuchsia-500/50 bg-gradient-to-b from-slate-950 to-fuchsia-950/20 shadow-2xl rounded-lg group">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
      <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Activity size={150} className="text-fuchsia-400" />
      </div>

      <div className="p-6 relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-lg border border-fuchsia-500/30 bg-black/20 text-fuchsia-400">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wider text-white">Archives Commerciales</h3>
            <p className="text-xs text-slate-400">Historique des transactions</p>
          </div>
        </div>

        <div className="text-center py-16 border border-white/5 rounded-lg bg-black/20">
          <Clock size={56} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 mb-2 font-bold uppercase text-sm">Aucune transaction enregistrée</p>
          <p className="text-xs text-slate-600 mb-4">
            Vos échanges apparaîtront ici
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-700">
            <PackageOpen size={12} />
            <span>DATABASE_EMPTY_::_AWAITING_DATA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

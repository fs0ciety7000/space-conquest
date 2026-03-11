import { Activity, Clock, PackageOpen } from "lucide-react";

interface TransactionHistoryProps {
  userId: string;
}

export default function TransactionHistory({ userId }: TransactionHistoryProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] group">
      <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
        <Activity size={150} className="text-cyan-400" />
      </div>

      <div className="p-6 relative z-10">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-cyan-500/10">
          <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Archives Commerciales</span>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/10 text-cyan-400">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-200">Archives Commerciales</h3>
            <p className="text-xs text-slate-500">Historique des transactions</p>
          </div>
        </div>

        <div className="text-center py-16 border border-cyan-500/10 rounded-lg bg-[rgba(10,5,32,0.5)]">
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

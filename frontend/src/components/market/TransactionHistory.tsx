import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import { Clock, User, Bot, ArrowRight } from "lucide-react";

interface TransactionHistoryProps {
  userId: string;
}

export default function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
    const interval = setInterval(loadTransactions, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/market/transactions?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="bg-slate-900 border border-white/10">
        <CardContent className="p-8 text-center">
          <p className="text-gray-400">Aucune transaction</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map(tx => {
        const isSeller = tx.seller_user_id === userId;
        const isNpc = tx.transaction_type === 'npc';

        return (
          <Card
            key={tx.id}
            className={`bg-slate-900 border ${
              isSeller ? 'border-green-500/30' : 'border-blue-500/30'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left: Type and Date */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${
                    isNpc
                      ? 'border-purple-500/30 bg-purple-900/20 text-purple-400'
                      : isSeller
                      ? 'border-green-500/30 bg-green-900/20 text-green-400'
                      : 'border-blue-500/30 bg-blue-900/20 text-blue-400'
                  }`}>
                    {isNpc ? <Bot size={16} /> : <User size={16} />}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {isNpc ? 'Échange PNJ' : isSeller ? 'Vente' : 'Achat'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={12} />
                      {formatDate(tx.created_at)}
                    </div>
                  </div>
                </div>

                {/* Middle: Trade Details */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {isSeller ? 'Vendu' : 'Acheté'}
                    </p>
                    <p className="text-sm font-semibold text-white capitalize">
                      {tx.quantity_sold.toLocaleString()} {tx.resource_sold}
                    </p>
                  </div>

                  <ArrowRight size={16} className="text-gray-500" />

                  <div>
                    <p className="text-xs text-gray-400">
                      {isSeller ? 'Reçu' : 'Payé'}
                    </p>
                    <p className={`text-sm font-semibold capitalize ${
                      isSeller ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.quantity_paid.toLocaleString()} {tx.resource_paid}
                    </p>
                  </div>
                </div>

                {/* Right: Details */}
                <div className="text-right text-xs space-y-1">
                  <div className="text-gray-400">
                    Prix: <span className="text-white font-mono">{tx.price_per_unit.toFixed(2)}</span>
                  </div>
                  {tx.tax_amount > 0 && (
                    <div className="text-gray-400">
                      Taxe: <span className="text-red-400">{tx.tax_amount.toFixed(0)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

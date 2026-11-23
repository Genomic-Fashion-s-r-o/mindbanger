"use client";
import toast from 'react-hot-toast';
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Check, Clock, User, DollarSign, XCircle, Search } from "lucide-react";

type PayoutRequest = {
  id: string;
  affiliate_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  paypal_email: string;
  created_at: string;
  affiliates: {
    user_id: string;
  };
};

export default function PayoutsManager() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function fetchPayouts() {
    setLoading(true);
    // Skusime nacitat priamo z payout_requests, ak existuje v DB
    const { data, error } = await supabase
      .from('payout_requests')
      .select(`
        *,
        affiliates ( user_id )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPayouts(data as any[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function handleMarkAsPaid(payout: PayoutRequest) {
    if (!confirm(`Potvrdzuješ, že si odoslal ${payout.amount}€ na PayPal účet: ${payout.paypal_email}?`)) return;

    setProcessingId(payout.id);
    
    try {
      const response = await fetch('/api/admin/affiliate/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId: payout.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nastala chyba pri potvrdzovaní výplaty');
      }

      toast.success('Výplata úspešne spracovaná!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      await fetchPayouts();
      setProcessingId(null);
    }
  }

  if (loading) return <div className="text-slate-400">Načítavam žiadosti o výplatu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Žiadosti o Payout</h2>
          <p className="text-slate-400">Spravuj požiadavky na vyplatenie provízií pre partnerov.</p>
        </div>
      </div>

      <div className="bg-slate-900 overflow-hidden rounded-xl border border-white/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="p-4 font-medium">Dátum</th>
              <th className="p-4 font-medium">Affiliate ID</th>
              <th className="p-4 font-medium">PayPal E-mail</th>
              <th className="p-4 font-medium">Suma</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Akcia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300 text-xs md:text-sm">
            {payouts.map((req) => (
              <tr key={req.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-4">
                  {new Date(req.created_at).toLocaleDateString("sk-SK")}
                </td>
                <td className="p-4 font-mono text-[10px] text-slate-500">
                  {req.affiliate_id.slice(0,8)}...
                </td>
                <td className="p-4 font-medium text-white">
                  {req.paypal_email}
                </td>
                <td className="p-4 font-bold text-emerald-400">
                  €{req.amount.toFixed(2)}
                </td>
                <td className="p-4">
                  {req.status === 'pending' && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs">Čaká na spracovanie</span>}
                  {req.status === 'paid' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs">Zaplatené</span>}
                  {req.status === 'rejected' && <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-full text-xs">Zamietnuté</span>}
                </td>
                <td className="p-4 text-right">
                  {req.status === 'pending' && (
                    <button
                      onClick={() => handleMarkAsPaid(req)}
                      disabled={processingId === req.id}
                      className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg flex items-center space-x-2 ml-auto transition-colors disabled:opacity-50"
                    >
                      <Check size={14} />
                      <span>{processingId === req.id ? "Zapisujem..." : "Označiť ako vyplatené"}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Žiadne žiadosti o výplatu neboli nájdené.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

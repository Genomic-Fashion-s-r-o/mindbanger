'use client';

import React, { useState } from 'react';
import { Loader2, DollarSign } from 'lucide-react';

interface Props {
  unpaidBalance: number;
  affiliateId: string;
}

export default function PayoutButton({ unpaidBalance, affiliateId }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayout = async () => {
    if (unpaidBalance < 20) return;
    if (!confirm(`Are you sure you want to request payout for €${unpaidBalance.toFixed(2)}?`)) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/affiliate/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request payout');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm text-center border border-emerald-500/30">
        Payout requested successfully. We will process it within 3-5 business days.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePayout}
        disabled={unpaidBalance < 20.00 || loading}
        className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 font-bold hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <DollarSign size={18} />}
        <span>Request Payout (€{unpaidBalance.toFixed(2)})</span>
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      <p className="text-slate-500 text-xs text-center">Minimum payout is typically €20.00</p>
    </div>
  );
}

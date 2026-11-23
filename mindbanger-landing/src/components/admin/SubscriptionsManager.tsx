"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, User, Globe, Search, Edit2, Check, X, Loader2 } from "lucide-react";

type Subscription = {
  id: string;
  user_id: string;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  created_at: string;
  country: string | null;
  amount_total: number | null;
  currency: string | null;
  customer_email?: string | null;
};

type JoinedSubscription = Subscription & {
  profiles?: {
    full_name: string | null;
    email?: string | null;
  } | null;
  display_email?: string | null;
};

export default function SubscriptionsManager() {
    const [subscriptions, setSubscriptions] = useState<JoinedSubscription[]>([]);
    const [filteredSubscriptions, setFilteredSubscriptions] = useState<JoinedSubscription[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    
    // Inline state for title edit
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);

    // Calculate total revenue
    const revenueByCurrency = subscriptions.reduce((acc, sub) => {
      if (sub.amount_total && sub.currency && (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'completed' || sub.status === 'succeeded')) {
        const curr = sub.currency.toUpperCase();
        acc[curr] = (acc[curr] || 0) + (sub.amount_total / 100);
      }
      return acc;
    }, {} as Record<string, number>);

    useEffect(() => {
      if (!searchTerm) {
        setFilteredSubscriptions(subscriptions);
        return;
      }
      const lower = searchTerm.toLowerCase();
      const filtered = subscriptions.filter(sub => {
        return (sub.profiles?.full_name?.toLowerCase().includes(lower)) ||
               (sub.display_email?.toLowerCase().includes(lower));
      });
      setFilteredSubscriptions(filtered);
    }, [searchTerm, subscriptions]);
  async function handleSaveName(userId: string) {
    if (!editNameValue.trim()) return;
    setIsSavingName(true);
    
    try {
        const res = await fetch("/api/admin/users/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, fullName: editNameValue.trim() })
        });
        
        if (!res.ok) throw new Error("Chyba pri ukladaní mena");
        
        // Optimistic UI update
        const updatedSubs = subscriptions.map(s => {
            if (s.user_id === userId) {
                return {
                    ...s,
                    profiles: {
                        ...s.profiles,
                        full_name: editNameValue.trim()
                    }
                };
            }
            return s;
        });
        setSubscriptions(updatedSubs as any);
        setEditingUserId(null);
    } catch (err) {
        console.error(err);
        alert("Nepodarilo sa upraviť meno odberateľa.");
    } finally {
        setIsSavingName(false);
    }
  }

  async function fetchSubscriptions() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/subscriptions");
      if (!res.ok) throw new Error("Chyba pri načítavaní odberov");

      const joinedList = await res.json();
      setSubscriptions(joinedList || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  if (loading && subscriptions.length === 0) return <div className="p-10 text-slate-400">Načítavam odbery...</div>;

  return (
    <div className="py-6 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-white mb-2">Správa predplatného</h2>
          <p className="text-slate-400">Zoznam aktuálnych odberateľov</p>
          <div className="mt-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Hľadať odberateľa podľa mena alebo emailu..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center">
            <span className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Celkové Tržby</span>
            <div className="flex gap-3">
              {Object.keys(revenueByCurrency).length === 0 ? (
                <span className="text-xl font-medium text-white font-mono">0.00 EUR</span>
              ) : (
                Object.entries(revenueByCurrency).map(([curr, total]) => (
                  <span key={curr} className="text-xl font-medium text-emerald-400 font-mono">
                    {total.toFixed(2)} {curr}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-slate-400 border-b border-white/5">
              <tr>
                <th className="p-4 font-medium">Stav</th>
                <th className="p-4 font-medium">Používateľ / Email</th>
                <th className="p-4 font-medium">Krajina</th>
                <th className="p-4 font-medium">Suma</th>
                <th className="p-4 font-medium">Dátum reg.</th>\n                  <th className="p-4 font-medium">Dátum reg.</th>\n                  <th className="p-4 font-medium">Koniec obdobia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSubscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    {sub.status === 'active' || sub.status === 'trialing' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {sub.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        {sub.status}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white flex items-start gap-2">
                      <User size={14} className="text-slate-500 mt-1" />
                      <div className="flex-1">
                          {editingUserId === sub.user_id ? (
                            <div className="flex items-center gap-2 mb-1">
                              <input 
                                type="text"
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-amber-500"
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveName(sub.user_id);
                                  if (e.key === 'Escape') setEditingUserId(null);
                                }}
                                autoFocus
                              />
                              <button 
                                onClick={() => handleSaveName(sub.user_id)}
                                disabled={isSavingName}
                                className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                              >
                                {isSavingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              </button>
                              <button 
                                onClick={() => setEditingUserId(null)}
                                className="p-1.5 bg-slate-500/20 text-slate-400 rounded hover:bg-slate-500/30 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{sub.profiles?.full_name || "Unknown User"}</span>
                              <button 
                                onClick={() => {
                                  setEditingUserId(sub.user_id);
                                  setEditNameValue(sub.profiles?.full_name || "");
                                }}
                                className="text-slate-500 hover:text-amber-500 transition-colors p-1"
                                title="Upraviť meno"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}
                          <div className="text-xs text-slate-500">{sub.display_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Globe size={14} className="text-slate-500" />
                      <span>{sub.country || '-'}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-emerald-400">
                    {sub.amount_total && sub.currency 
                      ? `${(sub.amount_total / 100).toFixed(2)} ${sub.currency.toUpperCase()}` 
                      : '-'}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Calendar size={14} className="text-slate-500" />
                      <span>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSubscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nenašli sa žiadne odbery.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
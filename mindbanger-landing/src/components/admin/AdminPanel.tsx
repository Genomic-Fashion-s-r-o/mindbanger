"use client";
import React, { useState, useEffect } from "react";
import SignalsManager from "./SignalsManager";
import OnboardingManager from "./OnboardingManager";
import B2BOnboardingManager from "./B2BOnboardingManager";
import SubscriptionsManager from "./SubscriptionsManager";
import ResetsManager from "@/components/admin/ResetsManager";
import AffiliateManager from "./AffiliateManager";
import PayoutsManager from "./PayoutsManager";
import B2BManager from "./B2BManager";
import MessagesManager from "@/components/admin/MessagesManager";
import IndividualRecordingsManager from "@/components/admin/IndividualRecordingsManager";
import { Radio, Users, RefreshCw, Megaphone, DollarSign, Rocket, Briefcase, MessageSquare, Headphones } from "lucide-react";
import HealthCheckWidget from "@/components/admin/HealthCheckWidget";
import { supabase } from "@/lib/supabase";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'signals' | 'onboarding' | 'b2bonboarding' | 'subscriptions' | 'resets' | 'affiliate' | 'payouts' | 'b2b' | 'messages' | 'individual'>('signals');
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('b2b_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin_reply', false)
        .eq('is_read', false);
      if (!error && count !== null) {
        setUnreadMsgCount(count);
      }
    };

    fetchUnreadCount();

    const channel = supabase
      .channel('admin-unread-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'b2b_messages' },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <>
      <HealthCheckWidget />
      <div className="flex border-b border-white/10 mb-6 space-x-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('signals')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'signals' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Radio size={20} />
          <span className="font-medium">Denné Signály</span>
        </button>
        <button
          onClick={() => setActiveTab('b2b')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'b2b'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase size={20} />
          <span className="font-medium">B2B Klienti</span>
        </button>        <button
          onClick={() => setActiveTab('onboarding')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'onboarding'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Rocket size={20} />
          <span className="font-medium">OS - Onboarding</span>
        </button>
        <button
          onClick={() => setActiveTab('b2bonboarding')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'b2bonboarding'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Rocket size={20} />
          <span className="font-medium">B2B - Onboarding</span>
        </button>
        <button
          onClick={() => setActiveTab('resets')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'resets' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <RefreshCw size={20} />
          <span className="font-medium">Manažér Resetov</span>
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'subscriptions' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users size={20} />
          <span className="font-medium">Predplatné & Užívatelia</span>
        </button>
        <button
          onClick={() => setActiveTab('affiliate')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'affiliate'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Megaphone size={20} />
          <span className="font-medium">Affiliate & Promo</span>
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'payouts'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign size={20} />
          <span className="font-medium">Žiadosti o Výplatu</span>
        </button>
        
        <button
          onClick={() => setActiveTab('messages')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap relative ${
            activeTab === 'messages'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
             <MessageSquare size={20} />
             {unreadMsgCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 animate-pulse min-w-[20px] text-center border border-slate-900">
                  {unreadMsgCount}
                </span>
             )}
          </div>
          <span className="font-medium">Správy</span>
        </button>
        <button
          onClick={() => setActiveTab('individual')}
          className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'individual'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Headphones size={20} />
          <span className="font-medium">Individuálne Nahrávky</span>
        </button>
      </div>

      {activeTab === 'signals' && <SignalsManager />}
      {activeTab === 'onboarding' && <OnboardingManager />}        {activeTab === 'b2bonboarding' && <B2BOnboardingManager />}      {activeTab === 'resets' && <ResetsManager />}
      {activeTab === 'subscriptions' && <SubscriptionsManager />}
      {activeTab === 'affiliate' && <AffiliateManager />}
      {activeTab === 'payouts' && <PayoutsManager />}
      {activeTab === 'b2b' && <B2BManager />}
      {activeTab === 'messages' && <MessagesManager />}
      {activeTab === 'individual' && <IndividualRecordingsManager />}
    </>
  );
}

// trigger ts server update

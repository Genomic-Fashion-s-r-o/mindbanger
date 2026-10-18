'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const verifyPremiumAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Ak sa nahodou session stratila pri prepnuti medzi oknami platby,
        // presmerujeme ho na obycajne prihlasenie
        if (!session) {
           router.push('/mindbanger_daily/login');
           return;
        }

        // Skontrolujeme ci uz webhook stihol preklopit usera na premium
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', session.user.id)
          .single();

        if (profile?.subscription_status === 'premium') {
            // Hotovo, posielame ho priamo dnu
            router.push('/mindbanger_daily/app/today');
        } else {
            // Ak webhook este meska, pockame dalsie 2 sekundy a skusime to znova
            timeout = setTimeout(verifyPremiumAccess, 2000);
        }
      } catch (err) {
         console.error('Error verifying access', err);
         router.push('/mindbanger_daily/login');
      }
    };

    // Zacneme hned prvy pokus
    verifyPremiumAccess();

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
          <Sparkles size={40} />
        </div>

        <h1 className="text-3xl font-serif text-white">Platba úspešná!</h1>
        <p className="text-slate-400">
           Generujeme váš osobný členský priestor. Prosím, počkajte sekundu...
        </p>

        <div className="flex justify-center pt-8">
           <Loader2 size={36} className="animate-spin text-amber-500" />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDictionary } from '@/lib/i18n-client';
import { useEffect } from 'react';
import { CookieBanner } from '@/components/CookieBanner';

function CheckoutContent() {
  const { dict, lang, mounted } = useDictionary();
  const t = dict.checkout;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const refMode = searchParams.get('refMode');
  const refCode = searchParams.get('refCode');

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
         // If not logged in, redirect to logic (or join)
         router.push('/mindbanger_daily/login?redirect=/mindbanger_daily/checkout');
         return;
      }
      setUserId(session.user.id);
      setEmail(session.user.email || '');
      setCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
        <p>Checking access...</p>
      </div>
    );
  }

  const handleCheckoutFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!userId) throw new Error("missingData");

      // 2. Start Stripe Checkout
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId, refMode, refCode }),
      });

      const { url, error: stripeError } = await res.json();

      if (stripeError) throw new Error(stripeError);
      if (!url) throw new Error("default");

      // 3. Redirect to Stripe
      window.location.href = url;

    } catch (error: any) {
      console.error(error);
      let errorMsg = t?.errors?.default || 'Something went wrong.';
      if (error.message?.includes('rate limit')) {
        errorMsg = t?.errors?.rateLimit || 'Rate limit exceeded. Please wait.';
      } else if (error.message) {
        errorMsg = error.message.includes('fetch') || error.message.includes('JSON') ? (t?.errors?.default || 'Something went wrong') : error.message;
      }
      setMessage({ type: 'error', text: errorMsg });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-slate-950 to-[#0a0f1c] pointer-events-none" />
      
      {/* Main Content Info */}
      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-8">
         <Link href="/mindbanger_daily" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <span className="font-serif font-bold text-2xl text-slate-50 tracking-wide">Mindbanger <span className="text-amber-500">Daily</span></span>
          <Image src="/logo.png" alt="Mindbanger Daily" width={180} height={45} className="h-10 w-auto object-contain" />
        </Link>
        
        <div className="space-y-4">
           <h1 className="text-4xl md:text-5xl font-serif text-white leading-tight">
             {t.title}
           </h1>
           <p className="text-slate-400 text-lg max-w-lg mx-auto">{t.subtitle}</p>
        </div>

        {/* Pricing Card */}
        <div className="w-full bg-slate-900/80 border border-amber-500/30 rounded-3xl p-8 shadow-[0_0_30px_rgba(234,179,8,0.05)] relative overflow-hidden backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="text-left">
              <h3 className="text-lg font-medium text-amber-500 uppercase tracking-widest mb-1">{t.productInfo}</h3>
              <div className="text-5xl font-bold text-white">
                {t.price}<span className="text-xl text-slate-400 font-medium font-serif normal-case ml-2">{t.perMonth}</span>
              </div>
              {t.vatExcluded && (
                <p className="text-xs text-slate-500 mt-1 font-sans">{t.vatExcluded}</p>
              )}
            </div>
            
            <div className="flex flex-col gap-2 text-left">
               {t.features.map((feat: string, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 text-slate-300 text-sm">
                    <Check size={16} className="text-amber-500 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
               ))}
            </div>
          </div>

          <form onSubmit={handleCheckoutFlow} className="space-y-6 border-t border-slate-800 pt-6">
            {message && (
              <div className={`p-4 rounded-lg text-sm ${
                message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-3 pb-2 text-left bg-slate-950/30 p-4 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    required
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition-colors"
                  />
                </div>
                <span className="text-xs text-slate-400 leading-tight group-hover:text-slate-300 transition-colors">
                  {t.digitalConsent}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    required
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition-colors"
                  />
                </div>
                <span className="text-xs text-slate-400 leading-tight group-hover:text-slate-300 transition-colors">
                  {t.ageConsent}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 text-slate-900 font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  {t.processing}
                </>
              ) : (
                <>
                  {t.cta || 'Upgrade Now'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 font-medium">
              {t.cancelAnytime}
            </p>
          </form>
        </div>
        
        {email && (
           <p className="text-sm text-slate-500">
             Logged in as <span className="text-amber-500">{email}</span>
           </p>
        )}
      </div>

      {dict?.cookieBanner && <CookieBanner dict={dict.cookieBanner} />}
    </div>
  );
}

import { Suspense } from 'react';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

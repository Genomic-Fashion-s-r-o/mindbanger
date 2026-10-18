// src/app/join/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, Loader2, Sparkles, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type JoinLang = 'sk' | 'cs' | 'en';

const translations: Record<JoinLang, Record<string, string>> = {
  sk: {
    startMembership: 'Začni členstvo',
    titleEmail: 'Začni svoje členstvo Mindbanger Daily',
    titleOtp: 'Over svoj email',
    subtitle: 'Vytvor si účet a začni svoj denný mentálny rituál.',
    emailLabel: 'Emailová adresa',
    emailPlaceholder: 'Zadaj svoj email',
    continueBtn: 'Pokračovať na členstvo',
    priceLine: '€7.99 / mesiac. DPH sa môže uplatniť. Zruš kedykoľvek.',
    termsText: 'Súhlasím s',
    termsLink: 'Podmienkami používania',
    privacyText: 'Súhlasím s',
    privacyLink: 'Zásadami ochrany osobných údajov',
    andDataProcessing: 'a spracovaním údajov.',
    checkEmailCode: 'Skontroluj email pre 6-miestny kód.',
    acceptPolicies: 'Pre pokračovanie musíš súhlasiť s Podmienkami a Ochrannou osobných údajov.',
    sendCodeFail: 'Nepodarilo sa odoslať kód.',
    codeLabel: 'Zadaj 6-miestny kód',
    codeSentTo: 'Kód odoslaný na',
    enterApp: 'Vstúpiť do aplikácie',
    changeEmail: 'Zmeniť email',
    codeLengthError: 'Kód musí mať presne 6 číslic.',
    incorrectCode: 'Nesprávny alebo expirovaný kód.',
    alreadyMember: 'Už si člen?',
    logIn: 'Prihlásiť sa',
  },
  cs: {
    startMembership: 'Začni členství',
    titleEmail: 'Začni své členství Mindbanger Daily',
    titleOtp: 'Ověř svůj email',
    subtitle: 'Vytvoř si účet a začni svůj denní mentální rituál.',
    emailLabel: 'Emailová adresa',
    emailPlaceholder: 'Zadej svůj email',
    continueBtn: 'Pokračovat na členství',
    priceLine: '€7.99 / měsíc. DPH může platit. Zruš kdykoliv.',
    termsText: 'Souhlasím s',
    termsLink: 'Podmínkami používání',
    privacyText: 'Souhlasím se',
    privacyLink: 'Zásadami ochrany osobních údajů',
    andDataProcessing: 'a zpracováním údajů.',
    checkEmailCode: 'Zkontroluj email pro 6místný kód.',
    acceptPolicies: 'Pro pokračování musíš souhlasit s Podmínkami a Zásadami ochrany osobních údajů.',
    sendCodeFail: 'Kód se nepodařilo odeslat.',
    codeLabel: 'Zadej 6místný kód',
    codeSentTo: 'Kód odeslán na',
    enterApp: 'Vstoupit do aplikace',
    changeEmail: 'Změnit email',
    codeLengthError: 'Kód musí mít přesně 6 číslic.',
    incorrectCode: 'Nesprávný nebo expirovaný kód.',
    alreadyMember: 'Už jsi člen?',
    logIn: 'Přihlásit se',
  },
  en: {
    startMembership: 'Start Membership',
    titleEmail: 'Start your Mindbanger Daily membership',
    titleOtp: 'Verify Your Email',
    subtitle: 'Create your account to begin your daily mental ritual.',
    emailLabel: 'Email Address',
    emailPlaceholder: 'Enter your email',
    continueBtn: 'Continue to Membership',
    priceLine: '€7.99 / month. VAT may apply. Cancel anytime.',
    termsText: 'I agree to the',
    termsLink: 'Terms of Service',
    privacyText: 'I accept the',
    privacyLink: 'Privacy Policy',
    andDataProcessing: 'and data processing.',
    checkEmailCode: 'Check your email for the 6-digit code.',
    acceptPolicies: 'Please accept the Terms and Privacy Policy to continue.',
    sendCodeFail: 'Failed to send code.',
    codeLabel: 'Enter 6-digit Code',
    codeSentTo: 'Code sent to',
    enterApp: 'Enter App',
    changeEmail: 'Change Email',
    codeLengthError: 'Code must be exactly 6 digits.',
    incorrectCode: 'Incorrect or expired code.',
    alreadyMember: 'Already a member?',
    logIn: 'Log In',
  },
};

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<JoinLang>('en');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  
  // Consents
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [gdprAccepted, setGdprAccepted] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    // Check URL parameters for OTP step (e.g. returning from email app)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      const emailParam = params.get('email');
      if (stepParam === 'otp' && emailParam) {
        setStep('otp');
        setEmail(decodeURIComponent(emailParam));
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/mindbanger_daily/app/today';
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = '/mindbanger_daily/app/today';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cookieMatch = document.cookie.match(/(?:^|; )user-lang=([^;]+)/);
    const cookieLang = cookieMatch?.[1]?.toLowerCase();

    if (cookieLang === 'sk' || cookieLang === 'cs' || cookieLang === 'en') {
      setLang(cookieLang);
      return;
    }

    if (cookieLang === 'cz') {
      setLang('cs');
      return;
    }

    const browserLang = navigator.language.slice(0, 2).toLowerCase();
    setLang(browserLang === 'sk' || browserLang === 'cs' ? browserLang : 'en');
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!termsAccepted || !gdprAccepted) {
        throw new Error(t.acceptPolicies);
      }

      // 1. Send code via our API (handling user creation if new)
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          lang,
          options: {
             data: {
               terms_accepted: termsAccepted,
               privacy_policy_accepted: gdprAccepted,
               consents_timestamp: new Date().toISOString()
             }
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || 'Failed to initialize signup.');
      }

      setStep('otp');
      setMessage({ type: 'success', text: t.checkEmailCode });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t.sendCodeFail });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setMessage({ type: 'error', text: t.codeLengthError });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'magiclink'
      });

      if (error) throw error;
      
      // onAuthStateChange handles redirect
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t.incorrectCode });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-amber-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 space-y-2 flex flex-col items-center">
          <Link href="/mindbanger_daily" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <span className="font-serif font-bold text-2xl text-slate-50 tracking-wide">Mindbanger <span className="text-amber-500">Daily</span></span>
            <Image src="/logo.png" alt="Mindbanger Daily" width={180} height={45} className="h-10 w-auto object-contain" />
          </Link>
          <p className="text-amber-400/80 uppercase tracking-widest text-xs font-bold mt-3">{t.startMembership}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl text-white font-serif mb-2 text-center">
            {step === 'email' ? t.titleEmail : t.titleOtp}
          </h1>
          {step === 'email' && (
            <p className="text-center text-slate-400 text-sm mb-6">
              {t.subtitle}
            </p>
          )}
          
          {message && (
            <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-200 border border-red-500/20' : 'bg-green-500/10 text-green-200 border border-green-500/20'}`}>
              {message.text}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">{t.emailLabel}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    placeholder={t.emailPlaceholder}
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                 <>
                     {t.continueBtn}
                     <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </>
                )}
              </button>
              <p className="text-center text-xs text-slate-500 pt-2">
                {t.priceLine}
              </p>

              <div className="space-y-3 pt-4 border-t border-white/10 mt-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition-colors"
                    />
                  </div>
                  <span className="text-xs text-slate-400 leading-tight group-hover:text-slate-300 transition-colors">
                    {t.termsText} <Link href="/mindbanger_daily/terms" className="text-amber-500 hover:underline" target="_blank">{t.termsLink}</Link>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      type="checkbox"
                      required
                      checked={gdprAccepted}
                      onChange={(e) => setGdprAccepted(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition-colors"
                    />
                  </div>
                  <span className="text-xs text-slate-400 leading-tight group-hover:text-slate-300 transition-colors">
                    {t.privacyText} <Link href="/mindbanger_daily/privacy" className="text-amber-500 hover:underline" target="_blank">{t.privacyLink}</Link> {t.andDataProcessing}
                  </span>
                </label>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">{t.codeLabel}</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input 
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">{t.codeSentTo} {email}</p>
              </div>
              
              <button 
                type="submit" 
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : t.enterApp}
              </button>
              
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-slate-400 text-sm hover:text-white transition-colors"
              >
                {t.changeEmail}
              </button>
            </form>
          )}
        </div>
        
        <p className="mt-8 text-center text-slate-500 text-sm">
          {t.alreadyMember} <Link href="/mindbanger_daily/login" className="text-amber-500 hover:text-amber-400">{t.logIn}</Link>
        </p>
      </div>
    </div>
  );
}
'use client';

import React from 'react';
import { Lock, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LockedDashboardProps {
  title?: string;
  lang?: string;
  firstName?: string;
  isFirstVisit?: boolean;
}

export default function LockedDashboard({ title = "Today's Mindset", lang = 'en', firstName = 'Friend', isFirstVisit = false }: LockedDashboardProps) {
  const router = useRouter();

  const translations = {
    en: {
      title: "Unlock Today's Mindset",
      subtitle: "Join Mindbanger Premium to access daily guided sessions.",
      button: "Unlock Access",
      preview: "This content is exclusive for premium members.",
      welcomeBadge: 'Welcome to Mindbanger Daily',
      welcomeTitle: 'Your mind needs a daily ritual, not random motivation.',
      welcomeIntro: `Hi ${firstName}, I'm Miroslav, founder of Mindbanger. I built this for people who want real focus, calm power, and consistency every day.`,
      founderMessage: 'In 5-8 minutes a day, you train your mind before the world pulls you in 100 directions.',
      howItWorks: 'How Mindbanger Works',
      step1Title: '1. One daily signal',
      step1Text: 'Every morning you get one focused message for your day.',
      step2Title: '2. Guided mental reset',
      step2Text: 'Theme, focus, affirmation, and short audio training.',
      step3Title: '3. Build momentum',
      step3Text: 'Track your consistency and become stronger under pressure.',
      whatYouGain: 'What You Will Gain',
      gain1: 'Sharper focus and less mental noise',
      gain2: 'Higher personal discipline and follow-through',
      gain3: 'Better emotional stability in stressful situations',
      gain4: 'Daily clarity for work and life decisions',
      primaryCta: 'Start My Daily Ritual',
      secondaryCta: 'See Membership',
      ctaHint: 'Activation takes less than 30 seconds.',
      faqTitle: 'Quick Answers',
      faq1Q: 'How much time do I need daily?',
      faq1A: 'Usually 5-8 minutes.',
      faq2Q: 'When will I feel the difference?',
      faq2A: 'Most users notice change within 7-14 days of daily use.',
    },
    sk: {
      title: "Odomkni Dnešný Mindset",
      subtitle: "Pripoj sa k Mindbanger Premium a získaj prístup k denným nahrávkam.",
      button: "Aktivovať Premium",
      preview: "Tento obsah je dostupný len pre členov s aktívnym predplatným.",
      welcomeBadge: 'Vitaj v Mindbanger Daily',
      welcomeTitle: 'Tvoja myseľ potrebuje denný rituál, nie náhodnú motiváciu.',
      welcomeIntro: `Ahoj ${firstName}, som Miroslav, zakladateľ Mindbangeru. Vytvoril som tento systém pre ľudí, ktorí chcú reálny focus, vnútorný pokoj a konzistentný výkon každý deň.`,
      founderMessage: 'Za 5-8 minút denne trénuješ svoju myseľ skôr, než ťa svet stiahne na všetky strany.',
      howItWorks: 'Ako Mindbanger Funguje',
      step1Title: '1. Jeden denný signál',
      step1Text: 'Každé ráno dostaneš presný mentálny impulz pre svoj deň.',
      step2Title: '2. Vedený mentálny reset',
      step2Text: 'Téma, fokus, afirmácia a krátky audio tréning.',
      step3Title: '3. Budovanie momenta',
      step3Text: 'Sleduješ konzistenciu a rastie tvoja odolnosť pod tlakom.',
      whatYouGain: 'Čo Ti To Prinesie',
      gain1: 'Ostrosť focusu a menej mentálneho šumu',
      gain2: 'Vyššiu disciplínu a dotiahnutie vecí do konca',
      gain3: 'Stabilnejšie emócie v náročných situáciách',
      gain4: 'Dennú jasnosť pre prácu aj osobné rozhodnutia',
      primaryCta: 'Spustiť Môj Denný Rituál',
      secondaryCta: 'Pozrieť Členstvo',
      ctaHint: 'Aktivácia trvá menej ako 30 sekúnd.',
      faqTitle: 'Rýchle Odpovede',
      faq1Q: 'Koľko času denne potrebujem?',
      faq1A: 'Zvyčajne 5-8 minút.',
      faq2Q: 'Kedy pocítim zmenu?',
      faq2A: 'Väčšina ľudí cíti rozdiel po 7-14 dňoch denného používania.',
    },
    cs: {
      title: "Odemkni Dnešní Mindset",
      subtitle: "Připoj se k Mindbanger Premium a získej přístup k denním nahrávkám.",
      button: "Aktivovat Premium",
      preview: "Tento obsah je dostupný pouze pro členy s aktivním předplatným.",
      welcomeBadge: 'Vítej v Mindbanger Daily',
      welcomeTitle: 'Tvoje mysl potřebuje denní rituál, ne náhodnou motivaci.',
      welcomeIntro: `Ahoj ${firstName}, jsem Miroslav, zakladatel Mindbangeru. Vytvořil jsem tento systém pro lidi, kteří chtějí reálný fokus, vnitřní klid a konzistentní výkon každý den.`,
      founderMessage: 'Za 5-8 minut denně trénuješ svoji mysl dřív, než tě svět stáhne na všechny strany.',
      howItWorks: 'Jak Mindbanger Funguje',
      step1Title: '1. Jeden denní signál',
      step1Text: 'Každé ráno dostaneš přesný mentální impuls pro svůj den.',
      step2Title: '2. Vedený mentální reset',
      step2Text: 'Téma, fokus, afirmace a krátký audio trénink.',
      step3Title: '3. Budování momenta',
      step3Text: 'Sleduješ konzistenci a roste tvoje odolnost pod tlakem.',
      whatYouGain: 'Co Ti To Přinese',
      gain1: 'Ostřejší fokus a méně mentálního šumu',
      gain2: 'Vyšší disciplínu a dotahování věcí do konce',
      gain3: 'Stabilnější emoce v náročných situacích',
      gain4: 'Denní jasnost pro práci i osobní rozhodnutí',
      primaryCta: 'Spustit Můj Denní Rituál',
      secondaryCta: 'Zobrazit Členství',
      ctaHint: 'Aktivace trvá méně než 30 sekund.',
      faqTitle: 'Rychlé Odpovědi',
      faq1Q: 'Kolik času denně potřebuji?',
      faq1A: 'Obvykle 5-8 minut.',
      faq2Q: 'Kdy pocítím změnu?',
      faq2A: 'Většina lidí cítí rozdíl po 7-14 dnech denního používání.',
    }
  };

  const t = translations[lang as keyof typeof translations] || translations['en'];

  if (isFirstVisit) {
    return (
      <div className="space-y-6">
        <div className="border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 md:p-8 shadow-xl overflow-hidden relative">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-widest text-amber-400 mb-4">
              {t.welcomeBadge}
            </span>
            <h2 className="text-2xl md:text-4xl font-serif text-white leading-tight mb-4">{t.welcomeTitle}</h2>
            <p className="text-slate-200 mb-3">{t.welcomeIntro}</p>
            <p className="text-slate-400">{t.founderMessage}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-2">{t.step1Title}</h3>
            <p className="text-slate-400 text-sm">{t.step1Text}</p>
          </div>
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-2">{t.step2Title}</h3>
            <p className="text-slate-400 text-sm">{t.step2Text}</p>
          </div>
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-2">{t.step3Title}</h3>
            <p className="text-slate-400 text-sm">{t.step3Text}</p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-serif text-2xl mb-4">{t.whatYouGain}</h3>
          <ul className="space-y-2 text-slate-300">
            <li>- {t.gain1}</li>
            <li>- {t.gain2}</li>
            <li>- {t.gain3}</li>
            <li>- {t.gain4}</li>
          </ul>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-6 text-center">
          <h3 className="text-white text-xl font-semibold mb-4">{t.howItWorks}</h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/mindbanger_daily/checkout')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-full px-8 py-3 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all"
            >
              {t.primaryCta}
            </button>
            <button
              onClick={() => router.push('/mindbanger_daily/checkout')}
              className="bg-slate-900 hover:bg-slate-800 border border-white/15 text-white font-semibold rounded-full px-8 py-3 transition-all"
            >
              {t.secondaryCta}
            </button>
          </div>
          <p className="text-xs text-amber-200/80 mt-3">{t.ctaHint}</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-3">{t.faqTitle}</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-200">{t.faq1Q}</p>
              <p className="text-slate-400">{t.faq1A}</p>
            </div>
            <div>
              <p className="text-slate-200">{t.faq2Q}</p>
              <p className="text-slate-400">{t.faq2A}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Blurred / Locked Card */}
      <div className="border border-amber-500/20 bg-slate-900 status-locked relative overflow-hidden rounded-xl shadow-lg">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-amber-500/10 p-4 rounded-full mb-4 ring-1 ring-amber-500/20">
                <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-serif text-white mb-2">{t.title}</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">{t.subtitle}</p>
            <button
                onClick={() => router.push('/mindbanger_daily/checkout')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-full px-8 py-3 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-105 inline-flex items-center justify-center"
            >
                <CreditCard className="w-4 h-4 mr-2" />
                {t.button}
            </button>
        </div>

        {/* Content Placeholder (Blurred) */}
        <div className="p-6">
          <div className="text-2xl font-serif text-white/30 blur-sm select-none mb-2">
             {title}
          </div>
          <div className="text-sm text-slate-500 blur-sm select-none mb-6">Based on your focus for today</div>
          <div className="space-y-4 blur-sm select-none opacity-50">
             <div className="h-4 bg-slate-800 rounded w-3/4"></div>
             <div className="h-4 bg-slate-800 rounded w-full"></div>
             <div className="h-4 bg-slate-800 rounded w-5/6"></div>
             <div className="h-32 bg-slate-900 rounded-lg border border-white/5 mt-4"></div>
          </div>
        </div>
      </div>

      {/* Additional Teaser Elements */}
      <div className="grid grid-cols-2 gap-4 opacity-50 pointer-events-none blur-[1px]">
         <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 h-32"></div>
         <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 h-32"></div>
      </div>
    </div>
  );
}

// src/components/PricingSection.tsx
'use client';
import { useDictionary } from './LanguageProvider';

import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const features = [
  'Daily mind signal',
  'Daily focus',
  'Daily affirmation',
  'Audio reset',
  'Archive access',
  'Bonus resets',
];

export default function PricingSection() {
  const { dict } = useDictionary();
  return (
    <section className="py-24 px-6 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

      <div className="max-w-xl mx-auto text-center space-y-12 relative z-10">
        <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
          {dict?.landing?.pricing?.title1 || 'Simple daily support.'}<br /> {dict?.landing?.pricing?.title2 || 'One monthly plan.'}
        </h2>

        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(234,179,8,0.1)] relative overflow-hidden group hover:border-amber-400/50 transition-colors duration-300">

          <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-colors" />

          <h3 className="text-xl font-medium text-amber-500 uppercase tracking-widest mb-4">{dict?.landing?.pricing?.planName || 'Mindbanger Daily'}</h3>

          <div className="text-5xl md:text-6xl font-bold text-white mb-2">
            {dict?.landing?.pricing?.price || '€7.99'}
            <span className="text-xl md:text-2xl text-slate-400 font-medium font-serif normal-case ml-2">{dict?.landing?.pricing?.period || '/ month'}</span>
          </div>

          {dict?.landing?.pricing?.vatExcluded && (
             <p className="text-xs text-slate-500 mb-4">{dict.landing.pricing.vatExcluded}</p>
          )}

          {dict?.landing?.pricing?.priceNote && (
            <p className="text-slate-300 text-sm font-medium mb-2">{dict.landing.pricing.priceNote}</p>
          )}

          <p className="text-slate-400 text-sm mb-8">{dict?.landing?.pricing?.subtitle || 'Less than a cup of coffee per week.'}</p>

          <div className="space-y-4 mb-8 text-left max-w-sm mx-auto">
            {(dict?.landing?.pricing?.features || features).map((feat: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-3 text-slate-300">
                <Check size={18} className="text-amber-500 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 px-0 md:px-8">
            <Link
              href="/mindbanger_daily/join"
              className="w-full py-4 px-8 rounded-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 text-slate-900 font-bold flex items-center justify-center transition-all hover:scale-105 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
            >
              {dict?.landing?.pricing?.cta || 'Start Mindbanger Daily'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-500 font-medium">{dict?.landing?.pricing?.cancelText || 'Cancel anytime. No questions asked.'}</p>
        </div>
      </div>
    </section>
  );
}

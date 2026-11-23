// src/components/BenefitsSection.tsx
'use client';

import React from 'react';
import { useDictionary } from './LanguageProvider';
import { Check } from 'lucide-react';

const benefits = [
  'Start your mornings with more clarity',
  'Reduce inner noise and overthinking',
  'Feel calmer and more focused',
  'Strengthen your mindset daily',
  'Reconnect with yourself',
  'Move through the day with more direction',
];

export default function BenefitsSection() {
  const { dict } = useDictionary();
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 px-6 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        <h2 className="text-3xl md:text-5xl font-serif text-white text-center leading-tight">
          {dict?.landing?.benefits?.title || 'Mindbanger Daily is for you if you want to...'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => (
            <div 
              key={idx}
              className="flex items-start space-x-4 p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-amber-500/20 transition-all duration-300 group"
            >
              <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Check size={14} strokeWidth={3} />
              </div>
              <p className="text-lg text-slate-200 font-light group-hover:text-white transition-colors leading-relaxed">
                {dict?.landing?.benefits?.items?.[idx] || benefit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

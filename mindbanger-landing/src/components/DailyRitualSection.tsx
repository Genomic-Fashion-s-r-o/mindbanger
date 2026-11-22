// src/components/DailyRitualSection.tsx
'use client';

import React from 'react';
import { useDictionary } from './LanguageProvider';
import { LayoutTemplate, Radio, Target, Sparkles, Headphones } from 'lucide-react';

const features = [
  {
    icon: <LayoutTemplate size={24} />,
    title: 'Theme of the Day',
    desc: 'Set your daily direction.',
  },
  {
    icon: <Radio size={24} />,
    title: 'Daily Mind Signal',
    desc: 'Guided message for your mindset.',
  },
  {
    icon: <Target size={24} />,
    title: 'Today’s Focus',
    desc: 'One practical shift for the day.',
  },
  {
    icon: <Sparkles size={24} />,
    title: 'Affirmation',
    desc: 'A powerful reinforcing statement.',
  },
  {
    icon: <Headphones size={24} />,
    title: 'Audio Reset',
    desc: 'A short calming voice reset.',
  },
];

export default function DailyRitualSection() {
  const { dict } = useDictionary();
  return (
    <section className="py-24 bg-slate-950 px-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-slate-900 via-slate-900/50 to-slate-950 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto text-center space-y-12 relative z-10">
        <h2 className="text-3xl md:text-5xl font-serif text-white leading-tight">
          {dict?.landing?.dailyRitual?.title || 'Every day inside Mindbanger Daily:'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
          {features.map((feature, idx) => (
            <div 
              key={idx}
              className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 hover:border-amber-500/30 hover:bg-slate-800/60 transition-all duration-300 group shadow-lg shadow-black/40"
            >
              <div className="p-4 bg-slate-950 rounded-full border border-white/10 group-hover:border-amber-500/50 group-hover:bg-amber-500/10 transition-colors">
                <div className="text-slate-200 group-hover:text-amber-400 transition-colors">
                  {feature.icon}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{dict?.landing?.dailyRitual?.features?.[idx]?.title || feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-light">{dict?.landing?.dailyRitual?.features?.[idx]?.desc || feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

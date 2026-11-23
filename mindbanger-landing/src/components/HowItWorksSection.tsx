// src/components/HowItWorksSection.tsx
'use client';

import React from 'react';
import { useDictionary } from './LanguageProvider';
import { UserPlus, Bell, BrainCircuit } from 'lucide-react';

const steps = [
  {
    icon: <UserPlus size={28} />,
    title: 'Join',
    desc: 'Start your membership in less than a minute.',
  },
  {
    icon: <Bell size={28} />,
    title: 'Receive your daily signal',
    desc: 'Get a fresh message, focus, affirmation and audio reset.',
  },
  {
    icon: <BrainCircuit size={28} />,
    title: 'Build a stronger mind daily',
    desc: 'Create more clarity, emotional stability and direction over time.',
  },
];

export default function HowItWorksSection() {
  const { dict } = useDictionary();
  return (
    <section className="py-24 px-6 bg-slate-950 relative">
      <div className="max-w-6xl mx-auto space-y-16">
        <h2 className="text-3xl md:text-5xl font-serif text-white text-center leading-tight">{dict?.landing?.howItWorks?.title || 'How it works'}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-0" />

          {steps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-700 hover:border-blue-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-300 group">
                <div className="text-slate-400 group-hover:text-blue-400 transition-colors duration-300">
                  {step.icon}
                </div>
              </div>
              
              <div className="space-y-2 max-w-xs">
                <h3 className="text-xl font-bold text-white">{dict?.landing?.howItWorks?.steps?.[idx]?.title || step.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  {dict?.landing?.howItWorks?.steps?.[idx]?.desc || step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

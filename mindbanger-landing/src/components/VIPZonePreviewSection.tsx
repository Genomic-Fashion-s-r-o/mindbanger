// src/components/VIPZonePreviewSection.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useDictionary } from './LanguageProvider';
import { Calendar, Save, Radio, BatteryCharging } from 'lucide-react';

const cards = [
  {
    icon: <Calendar size={28} />,
    title: 'Today',
    desc: 'Your daily signal, focus, affirmation and audio.',
  },
  {
    icon: <Save size={28} />,
    title: 'Archive',
    desc: 'Access previous daily signals anytime.',
  },
  {
    icon: <BatteryCharging size={28} />,
    title: 'Quick Resets',
    desc: 'Calm Reset, Focus Reset, Sleep Reset and more.',
  },
  {
    icon: <Radio size={28} />,
    title: 'Start Here',
    desc: 'Simple guidance on how to use the ritual for best results.',
  },
];

export default function VIPZonePreviewSection() {
  const { dict, lang } = useDictionary();
  return (
    <section className="py-24 bg-slate-950 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 via-slate-950 to-indigo-900/10 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto text-center space-y-12 relative z-10">
        <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
          {dict?.landing?.vipZone?.title || 'Inside the VIP Zone'}
        </h2>

        {/* Mobile App Screenshots Mockup */}
        <div className="relative mx-auto mt-20 max-w-5xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 lg:gap-8 z-10 px-4">
          
          {/* Decorative background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

          {/* Left Mobile (Hidden on very small screens, visible on md+) */}
          <div className="relative w-64 lg:w-[280px] aspect-[9/19] rounded-[2.5rem] border-[6px] border-slate-800 bg-slate-950 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] transform md:rotate-[-6deg] md:translate-y-12 transition-transform hover:scale-105 duration-500 hidden md:block">
            {/* The notch / dynamic island mock */}
            <div className="absolute top-0 inset-x-0 h-7 w-32 bg-slate-800 mx-auto rounded-b-2xl z-20"></div>
            {/* Placeholder Image (replace src later) */}
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-700 border border-slate-800/50 rounded-[2.2rem] m-1 overflow-hidden">
               <Image src={`/mockups/screen-affiliate-${lang}.jpg`} alt="Affiliate App Preview" fill className="object-cover" />
            </div>
          </div>

          {/* Center Mobile (Main, slightly scaled up) */}
          <div className="relative w-72 lg:w-[320px] aspect-[9/19] rounded-[3rem] border-[8px] border-slate-800 bg-slate-950 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-20 transform transition-transform hover:scale-105 hover:-translate-y-2 duration-500">
            {/* The notch / dynamic island mock */}
            <div className="absolute top-0 inset-x-0 h-8 w-36 bg-slate-800 mx-auto rounded-b-3xl z-20"></div>
            {/* Placeholder Image (replace src later) */}
            <div className="absolute inset-0 bg-[#0f172a] flex flex-col items-center justify-center text-slate-700 border border-slate-800/50 rounded-[2.5rem] m-1.5 overflow-hidden">
               <Image src={`/mockups/screen-main-${lang}.jpg`} alt="Main Dashboard Preview" fill className="object-cover" priority />
            </div>
          </div>

          {/* Right Mobile */}
          <div className="relative w-64 lg:w-[280px] aspect-[9/19] rounded-[2.5rem] border-[6px] border-slate-800 bg-slate-950 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] transform md:rotate-[6deg] md:translate-y-12 transition-transform hover:scale-105 duration-500 hidden md:block">
            {/* The notch / dynamic island mock */}
            <div className="absolute top-0 inset-x-0 h-7 w-32 bg-slate-800 mx-auto rounded-b-2xl z-20"></div>
            {/* Placeholder Image (replace src later) */}
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-700 border border-slate-800/50 rounded-[2.2rem] m-1 overflow-hidden">
               <Image src={`/mockups/screen-archive-${lang}.jpg`} alt="Archive Preview" fill className="object-cover" />
            </div>
          </div>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 mt-8 relative z-20">
          {cards.map((card, idx) => (
            <div 
              key={idx}
              className="group p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/5 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-300 transform hover:-translate-y-1 shadow-lg shadow-black/20"
            >
              <div className="w-12 h-12 mb-6 mx-auto rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-all duration-300">
                {card.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{dict?.landing?.vipZone?.cards?.[idx]?.title || card.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors">
                {dict?.landing?.vipZone?.cards?.[idx]?.desc || card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

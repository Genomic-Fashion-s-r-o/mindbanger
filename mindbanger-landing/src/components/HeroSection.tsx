// src/components/HeroSection.tsx
'use client';
import { useDictionary } from './LanguageProvider';

import React from 'react';
import { ArrowRight, Play, Sun, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  const { dict } = useDictionary();
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden bg-gradient-to-b from-slate-950 via-[#0f172a] to-[#1e1b4b]">
      {/* Background Effects */}
      <div className="absolute top-0 inset-x-0 h-[500px] w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900/0 to-transparent pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[20%] left-[10%] w-[250px] h-[250px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

        {/* Left Column: Text */}
        <div className="text-center md:text-left space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse box-shadow-[0_0_8px_2px_rgba(251,191,36,0.5)]"></span>
            <span className="text-xs font-medium text-amber-100 tracking-wider uppercase">{dict?.landing?.hero?.badge || 'Mindbanger Daily'}</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            {dict?.landing?.hero?.titlePart1 || 'Set yourself up for '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600">{dict?.landing?.hero?.titleHighlight || 'success'}</span>{dict?.landing?.hero?.titlePart2 || ' every day'}
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-md mx-auto md:mx-0 leading-relaxed font-light">
            {dict?.landing?.hero?.subtitleDesc || 'Daily mind signals for clarity, calm & focus.'}
            <br className="hidden md:block" />
            {dict?.landing?.hero?.subtitleAuthor || 'Created by a Life Coach & Hypnotherapist.'}
          </p>

<p className="italic text-slate-300 text-lg md:text-xl font-serif leading-relaxed border-l-4 border-indigo-500/60 pl-5 py-2 mt-4 mb-2 shadow-sm relative before:absolute before:-left-1 before:top-0 before:w-1 before:h-full before:bg-indigo-400 before:blur-sm">
            {dict?.landing?.hero?.quote || '"The way your mind is set begins to shape your reality."'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-4 w-full">
            <Link
              href="/mindbanger_daily/join"
              className="w-full sm:w-auto py-4 px-8 rounded-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 text-slate-900 font-bold flex items-center justify-center transition-all hover:scale-105 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
            >
              {dict?.landing?.hero?.cta || 'Start Mindbanger Daily'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>

        {/* Right Column: Visual Mockup */}
        <div className="relative flex justify-center perspective-1000 animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">

          {/* Phone Mockup Container */}
          <div className="relative w-[300px] md:w-[340px] h-[600px] border-[8px] border-slate-800 rounded-[3rem] bg-slate-950 shadow-2xl overflow-hidden ring-1 ring-white/10 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-black z-20 flex justify-center">
              <div className="w-24 h-5 bg-black rounded-b-xl" />
            </div>

            {/* Screen Content */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 to-slate-900 flex flex-col p-6 pt-12 space-y-6">

              {/* Card Title */}
              <div className="flex justify-between items-center text-white/50 text-xs tracking-widest uppercase">
                <span>{dict?.landing?.hero?.widgetTitle || "Today's Signal"}</span>
                <span>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
              </div>

              {/* Today's Card */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full blur-xl pointer-events-none" />

                <div className="flex items-center space-x-2 mb-4">
                  <span className="p-2 bg-amber-500/20 rounded-full text-amber-400">
                    <Sun size={18} />
                  </span>
                  <span className="text-amber-200 text-sm font-semibold uppercase tracking-wider">{dict?.landing?.hero?.widgetBadge || 'Clarity'}</span>
                </div>

                  <h3 className="text-2xl font-serif text-white mb-2 leading-tight">{dict?.landing?.hero?.widgetHeadline || 'Simplify one thing today.'}</h3>
                  <p className="text-indigo-200/80 text-sm font-light italic mb-6">
                    {dict?.landing?.hero?.widgetQuote || '"You do not need to solve everything. You need one clear next step."'}
                  </p>

                  <div className="w-full flex flex-col space-y-3">
                    <div className="bg-slate-900/60 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between shadow-indigo-500/10 shadow-lg">
                      <button className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center hover:scale-105 transition-all flex-shrink-0 shadow-md">
                        <Play size={16} className="ml-1 animate-pulse" fill="currentColor" />
                      </button>
                      <div className="flex-1 mx-3 flex flex-col justify-center">
                        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 w-0 md:w-1/3 rounded-full relative">
                            <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400 font-medium">
                          <span>0:00</span>
                          <span>0:45</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-[11px] uppercase tracking-wider font-semibold text-indigo-300">
                      {dict?.landing?.hero?.widgetBtn || "Play Today's Audio Preview"}
                    </p>
                  </div>
                </div>

              {/* Small detail below */}
              <div className="text-center space-y-2 pt-2">
                <div className="h-0.5 w-12 bg-white/10 mx-auto rounded-full" />
                <p
                  className="text-xs text-slate-400/80 font-medium"
                  dangerouslySetInnerHTML={{ __html: dict?.landing?.hero?.widgetFooter || 'A new signal every day. <br/> A stronger inner direction over time.' }}
                />
              </div>

              {/* Fake list items below to simulate feed */}
              <div className="space-y-3 opacity-60 pointer-events-none blur-[1px]">
                  <div className="h-16 w-full bg-white/5 rounded-xl border border-white/5" />
                  <div className="h-16 w-full bg-white/5 rounded-xl border border-white/5" />
              </div>
            </div>
          </div>

          {/* Decorative Elements behind phone */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[600px] bg-gradient-to-tr from-amber-500/20 to-purple-600/20 blur-[60px] rounded-full" />
        </div>
      </div>
    </section>
  );
}

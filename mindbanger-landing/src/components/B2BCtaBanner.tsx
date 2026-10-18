'use client';
import React from 'react';
import Link from 'next/link';
import { useDictionary } from './LanguageProvider';
import { Building2, ArrowRight } from 'lucide-react';

export default function B2BCtaBanner() {
  const { dict } = useDictionary();
  const cta = dict?.landing?.b2bCta;

  if (!cta) return null;

  return (
    <section className="py-16 md:py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500 rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900/80 border border-white/5 rounded-3xl p-8 md:p-12 text-center flex flex-col items-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-white mb-4 tracking-wide">
            {cta.title}
          </h2>
          
          <p className="text-slate-400 md:text-lg max-w-2xl mx-auto mb-8">
            {cta.desc}
          </p>
          
          <Link 
            href="/mindbanger_daily/b2b"
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-white text-slate-950 font-bold text-lg hover:bg-amber-100 transition-all transform hover:scale-105"
          >
            {cta.btn}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

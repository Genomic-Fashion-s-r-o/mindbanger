// src/components/AboutTrustSection.tsx
'use client';

import React from 'react';
import { User } from 'lucide-react';
import { useDictionary } from './LanguageProvider';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutTrustSection() {
  const { dict } = useDictionary();
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 px-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-indigo-900/10 via-slate-900/10 to-transparent pointer-events-none" />
      
      <div className="max-w-4xl mx-auto space-y-12 relative z-10 text-center">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-slate-800/50 border border-white/5 shadow-2xl overflow-hidden hover:scale-105 transition-transform duration-300">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-slate-700/50">
             <Image 
               src="/miro-profile.jpg" 
               alt="Miroslav Jobus" 
               fill
               className="object-cover"
             />
             {/* Fallback visual if image fails to load */}
             <div className="absolute inset-0 bg-slate-700/50 flex items-center justify-center text-slate-300 -z-10">
                <User size={64} strokeWidth={1} />
             </div>
          </div>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          <p className="text-amber-500 font-medium tracking-wide text-sm uppercase">{dict?.landing?.about?.badge}</p>
          <Link href="/mindbanger_daily/about" className="block w-fit mx-auto group">
            <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight group-hover:text-amber-500 transition-colors duration-300">
              Mgr. Miroslav Jobus
            </h2>
            <div className="h-0.5 bg-amber-500 w-0 group-hover:w-full transition-all duration-300 mx-auto mt-1" />
          </Link>
          <p className="text-lg md:text-xl text-slate-400 font-light italic">
            {dict?.landing?.about?.role}
          </p>
        </div>

        <div className="max-w-3xl mx-auto p-8 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm relative">
          <p className="text-slate-300 leading-relaxed text-lg md:text-xl font-light">
            {dict?.landing?.about?.quote1} <span className="text-white font-medium">{dict?.landing?.about?.span1}</span> {dict?.landing?.about?.quote2}
          </p>
        </div>

        {/* Certifications Section */}
        <div className="pt-10 flex flex-wrap justify-center items-center gap-8 sm:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
           <Image src="/certifications/CMA_Logo.png" alt="CMA Certified" width={180} height={90} className="object-contain h-16 sm:h-24 w-auto" />
           <Image src="/certifications/cpd-logo.png" alt="CPD Certified" width={180} height={90} className="object-contain h-16 sm:h-24 w-auto" />
           <Image src="/certifications/ICAHP%20logo.png" alt="ICAHP Certified" width={180} height={90} className="object-contain h-16 sm:h-24 w-auto bg-white/10 rounded p-1.5" />
           <Image src="/certifications/iphm-final-01.800x0.png" alt="IPHM Certified" width={180} height={90} className="object-contain h-16 sm:h-24 w-auto" />
           <Image src="/certifications/NCCAP.LOGOtrp.png" alt="NCCAP Certified" width={180} height={90} className="object-contain h-16 sm:h-24 w-auto bg-white/10 rounded p-1.5" />
        </div>
      </div>
    </section>
  );
}

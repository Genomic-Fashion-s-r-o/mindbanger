'use client';

import React from 'react';
import { useDictionary } from './LanguageProvider';
import Link from 'next/link';
import { ArrowLeft, User, Instagram, Facebook, Linkedin } from 'lucide-react';
import Image from 'next/image';

export default function AboutContent() {
  const { dict } = useDictionary();
  const t = dict?.aboutPage || dict?.landing?.aboutPage;

  if (!t) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/mindbanger_daily" className="text-2xl font-serif text-white tracking-tight hover:opacity-80 transition-opacity">
              Mindbanger <span className="text-amber-500">Daily</span>
            </Link>
            <Link href="/mindbanger_daily" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
               <ArrowLeft size={16} className="mr-2" /> {t.back}
            </Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-16 relative z-10">
           
           {/* Header */}
           <header className="text-center space-y-6">
              <div className="relative inline-flex items-center justify-center w-36 h-36 rounded-full bg-slate-900 border border-white/10 text-slate-400 mb-4 shadow-2xl overflow-hidden">
                 <Image 
                   src="/miro-profile.jpg" 
                   alt="Miroslav Jobus" 
                   fill
                   className="object-cover"
                   priority
                 />
                 {/* Fallback if image fails to load or during dev */}
                 <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center bg-slate-800 -z-10">
                    <User size={64} strokeWidth={1} />
                 </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif text-white">{t.title}</h1>
              <p className="text-xl text-amber-500/90 font-medium tracking-wide uppercase">{t.role}</p>

              {/* Social Links */}
              <div className="flex justify-center items-center space-x-5 pt-2">
                <a href="https://instagram.com/miroslav777" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-500 transition-colors">
                  <Instagram size={22} />
                </a>
                <a href="https://www.facebook.com/jobusm" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-500 transition-colors">
                  <Facebook size={22} />
                </a>
                <a href="https://www.linkedin.com/in/miroslav-jobus/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-500 transition-colors">
                  <Linkedin size={22} />
                </a>
                <a href="https://tiktok.com/@mjobus" target="_blank" rel="noopener noreferrer" title="TikTok" className="text-slate-400 hover:text-amber-500 transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                </a>
              </div>
           </header>

           {/* Intro Section */}
           {(t.introTitle || t.introText) && (
             <div className="text-center max-w-3xl mx-auto mt-8 mb-16 space-y-6">
                {t.introTitle && <h2 className="text-2xl md:text-3xl font-serif text-amber-500">{t.introTitle}</h2>}
                {t.introText && <p className="text-xl md:text-2xl text-white font-light leading-relaxed">{t.introText}</p>}
             </div>
           )}

           {/* Content */}
           <div className="prose prose-invert prose-lg max-w-none space-y-8 leading-relaxed text-slate-300 font-light">
              <p className="first-letter:text-5xl first-letter:font-serif first-letter:text-white first-letter:mr-3 first-letter:float-left">
                {t.p1}
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 my-12 items-stretch">
                 <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/5 hover:border-amber-500/20 transition-colors">
                    <h3 className="text-xl font-serif text-white mb-4">{t.h1}</h3>
                    <p className="text-base">{t.p2}</p>
                 </div>
                 <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/5 hover:border-amber-500/20 transition-colors">
                   <h3 className="text-xl font-serif text-white mb-4">{t.h2}</h3>
                   <p className="text-base">{t.p3}</p>
                 </div>
              </div>

              <p>
                {t.p4}
              </p>
              
              <blockquote className="border-l-4 border-amber-500 pl-6 py-2 my-8 text-xl font-serif text-white italic bg-gradient-to-r from-amber-500/10 to-transparent rounded-r-lg">
                „{t.quote}“
              </blockquote>

              {t.p5 && (
                 <p className="text-lg text-slate-300">
                    {t.p5}
                 </p>
              )}

              {/* Certifications Section */}
              <div className="pt-16 pb-8 border-t border-white/5 mt-16 flex flex-wrap justify-center items-center gap-10 sm:gap-16 opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
                 <Image src="/certifications/CMA_Logo.png" alt="CMA Certified" width={200} height={100} className="object-contain h-20 sm:h-28 w-auto" />
                 <Image src="/certifications/cpd-logo.png" alt="CPD Certified" width={200} height={100} className="object-contain h-20 sm:h-28 w-auto" />
                 <Image src="/certifications/ICAHP%20logo.png" alt="ICAHP Certified" width={200} height={100} className="object-contain h-20 sm:h-28 w-auto bg-white/5 rounded p-2" />
                 <Image src="/certifications/iphm-final-01.800x0.png" alt="IPHM Certified" width={200} height={100} className="object-contain h-20 sm:h-28 w-auto" />
                 <Image src="/certifications/NCCAP.LOGOtrp.png" alt="NCCAP Certified" width={200} height={100} className="object-contain h-20 sm:h-28 w-auto bg-white/5 rounded p-2" />
              </div>
           </div>

           {/* CTA */}
           <div className="text-center pt-12 border-t border-white/10">
              <Link href="/mindbanger_daily" className="inline-flex items-center justify-center px-8 py-4 bg-white text-black font-medium rounded-full hover:bg-slate-200 transition-colors shadow-lg hover:shadow-white/20">
                {t.back}
              </Link>
           </div>
           
           {/* Footer */}
           <footer className="text-center text-slate-500 text-sm py-12">
             &copy; {new Date().getFullYear()} Miroslav Jobus & Mindbanger. All rights reserved.
           </footer>

        </div>
      </main>
    </div>
  );
}

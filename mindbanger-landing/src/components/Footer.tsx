// src/components/Footer.tsx
'use client';
import { useDictionary } from './LanguageProvider';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Instagram } from 'lucide-react';

export default function Footer() {
  const { dict } = useDictionary();
  const year = new Date().getFullYear();

  return (
    <footer className="py-12 bg-slate-950 border-t border-white/5 relative">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start space-y-2">
          <Link href="/mindbanger_daily" className="flex items-center gap-3 transition-opacity hover:opacity-80 opacity-50">
            <span className="font-serif font-bold text-xl text-slate-50 tracking-wide">Mindbanger <span className="text-amber-500">Daily</span></span>
            <Image src="/logo.png" alt="Mindbanger Daily" width={140} height={35} className="h-8 w-auto object-contain" />
          </Link>
          <p className="text-xs text-slate-500 max-w-xs text-center md:text-left">
            {dict?.landing?.footer?.tagline || 'Daily signals for clarity, calm & focus.'}
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center md:items-center space-x-6 text-sm text-slate-400 gap-y-2">
          <Link href="/mindbanger_daily/b2b" className="hover:text-white transition-colors">{dict?.landing?.footer?.b2b || 'For Teams'}</Link>
          <Link href="/mindbanger_daily/login" className="hover:text-white transition-colors">{dict?.landing?.footer?.login || 'Login'}</Link>
          <Link href="/mindbanger_daily/join" className="hover:text-white transition-colors">{dict?.landing?.navbar?.join || 'Start Membership'}</Link>
          <Link href="/mindbanger_daily/privacy" className="hover:text-white transition-colors">{dict?.landing?.footer?.privacy || 'Privacy'}</Link>
          <Link href="/mindbanger_daily/terms" className="hover:text-white transition-colors">{dict?.landing?.footer?.terms || 'Terms'}</Link>
          <Link href="/mindbanger_daily/affiliate-terms" className="hover:text-white transition-colors">{dict?.landing?.footer?.affiliateTerms || 'Affiliate Terms'}</Link>
        </div>

        {/* Social & Copyright */}
        <div className="flex flex-col items-center md:items-end space-y-4">
          <div className="flex space-x-4">
            <a href="https://www.instagram.com/mindbangerdaily" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-500 transition-colors" title="Instagram">
              <Instagram size={20} />
            </a>
          </div>
          <div className="text-xs text-slate-600">
            &copy; {year} Mindbanger Daily.
          </div>
        </div>
      </div>
    </footer>
  );
}

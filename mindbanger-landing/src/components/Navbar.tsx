'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useDictionary } from './LanguageProvider';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { dict } = useDictionary();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-900/80 backdrop-blur-md border-b border-white/5 py-4'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link
          href="/mindbanger_daily"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <span className="font-serif font-bold text-2xl text-slate-50 tracking-wide">Mindbanger <span className="text-amber-500">Daily</span></span>
          <Image src="/logo.png" alt="Mindbanger" width={180} height={45} className="h-10 w-auto object-contain" />
        </Link>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center space-x-6">
          <LanguageSwitcher />
          <Link href="/mindbanger_daily/b2b" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
            {dict?.landing?.navbar?.b2b || 'For Teams'}
          </Link>
          <Link href="/mindbanger_daily/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
            {dict?.landing?.navbar?.login || 'Login'}
          </Link>
          <Link 
            href="/mindbanger_daily/join"
            className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-slate-900 font-bold text-sm hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] transition-all transform hover:scale-105"
          >
            {dict?.landing?.navbar?.join || 'Start Membership'}
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-4 flex flex-col space-y-4 animate-in slide-in-from-top-2">
          <div className="flex justify-center border-b border-white/10 pb-4">
            <LanguageSwitcher />
          </div>
          <Link
            href="/mindbanger_daily/b2b"
            className="text-amber-400 hover:text-amber-300 py-2 text-center font-medium"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {dict?.landing?.navbar?.b2b || 'For Teams'}
          </Link>
          <Link
            href="/mindbanger_daily/login"
            className="text-gray-300 hover:text-white py-2 text-center"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {dict?.landing?.navbar?.login || 'Login'}
          </Link>
          <Link
            href="/mindbanger_daily/join"
            className="w-full py-3 rounded-full bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-slate-900 font-bold text-center"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {dict?.landing?.navbar?.join || 'Start Membership'}
          </Link>
        </div>
      )}
    </nav>
  );
}

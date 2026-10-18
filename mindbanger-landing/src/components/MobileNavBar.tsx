'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Headphones, Settings, Link as LinkIcon, Building2, MicVocal } from 'lucide-react';
import { useDictionary } from '@/lib/i18n-client';
import { supabase } from '@/lib/supabase';

export default function MobileNavBar() {
  const pathname = usePathname();
  const { dict } = useDictionary();
  const t = dict.nav || { today: 'Today', archive: 'Archive', resets: 'Resets', account: 'Account', affiliate: 'Affiliate' };

  const [isB2BAdmin, setIsB2BAdmin] = useState(false);

  const checkB2BStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['owner', 'admin'])
      .eq('status', 'active')
      .single();

    if (data) {
      setIsB2BAdmin(true);
    }
  };

  useEffect(() => {
    checkB2BStatus();
  }, []);

  const navItems = [
    { name: t.today, icon: Home, href: '/mindbanger_daily/app/today' },
    { name: t.archive, icon: Library, href: '/mindbanger_daily/app/archive' },
    { name: t.resets, icon: Headphones, href: '/mindbanger_daily/app/resets' },
    { name: 'Moje audio', icon: MicVocal, href: '/mindbanger_daily/app/my-audio' },
  ];

  // Insert B2B Dashboard if admin
  if (isB2BAdmin) {
    navItems.push({ name: 'Company', icon: Building2, href: '/mindbanger_daily/app/organization' });
  } else {
    // Only show Affiliate if NOT B2B admin (optional, or show both)
    navItems.push({ name: t.affiliate, icon: LinkIcon, href: '/mindbanger_daily/app/affiliate' });
  }

  // Always show Account last
  navItems.push({ name: t.account, icon: Settings, href: '/mindbanger_daily/app/settings' });

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-lg border-t border-white/10 z-50 rounded-t-2xl pb-safe">
        <ul className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.name} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center space-y-1 w-full transition-colors ${
                    isActive ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[10px] font-medium tracking-wide">
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop Side/Top Navigation Shell (Optional fallback for PC viewers) */}
      <nav className="hidden md:flex fixed top-0 left-0 w-full h-16 bg-slate-900 border-b border-white/5 px-8 items-center justify-between z-50">
        <div className="font-serif font-bold text-xl text-amber-500 tracking-wide">
          MINDBANGER
        </div>
        <ul className="flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-2 transition-colors ${
                      isActive ? 'text-amber-500' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </>
  );
}

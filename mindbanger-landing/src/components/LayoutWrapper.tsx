'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide = pathname?.startsWith('/mindbanger_daily/app/organization');

  return (
    <main
      className={`flex-1 w-full mx-auto p-4 md:px-8 md:py-10 animate-in fade-in duration-500 ${
        isWide ? 'max-w-6xl' : 'max-w-lg'
      }`}
    >
      {children}
    </main>
  );
}
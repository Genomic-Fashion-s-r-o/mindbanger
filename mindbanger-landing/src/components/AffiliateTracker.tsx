'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function AffiliateTracker() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const productPaths = ['/mindbanger_daily', '/mindbanger_daily/app', '/mindbanger_daily/join', '/mindbanger_daily/login', '/mindbanger_daily/checkout', '/mindbanger_daily/b2b'];
    if (!productPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return;
    // Ak URL obsahuje parametre refMode a refCode uložíme ich
    const refMode = searchParams?.get('refMode');
    const refCode = searchParams?.get('refCode');
    
    // Fallback na starý systém
    const oldRef = searchParams?.get('ref');

    if (refMode && refCode) {
      // Ukladáme referrer do localStorage
      localStorage.setItem('mb_refMode', refMode);
      localStorage.setItem('mb_refCode', refCode);
      console.log('Affiliate referer saved:', { refMode, refCode });
    } else if (oldRef) {
      localStorage.setItem('mindbanger_ref', oldRef);
    }
  }, [searchParams, pathname]);

  return null; // Komponenta nič nevizualizuje
}

'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CONSENT_KEY, marketingPage, readAttributionConsent } from '@/lib/marketing';
import { ATTRIBUTION_VERSION } from '@/lib/marketing-attribution';

export default function BookingAttribution() {
  const path = usePathname();
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const candidate = useRef<string | null>(null);
  useEffect(() => {
    let last = '';
    const sync = () => {
      let granted = false;
      try { granted = readAttributionConsent(localStorage.getItem(CONSENT_KEY)) === true; } catch { /* No consent. */ }
      const incoming = marketingPage(path) ? new URLSearchParams(location.search).get('mbc') : null;
      if (incoming && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(incoming)) candidate.current = incoming;
      // Keep only the public link's opaque ID in this mounted page, without
      // writing storage or sending it before consent.
      const campaign = candidate.current;
      const valid = !!campaign;
      const action = granted ? (valid ? 'touch:' + campaign : '') : 'withdraw';
      if (!action || action === last) return;
      last = action;
      // Serialize grant/withdraw so a late touch response cannot restore a
      // cookie after withdrawal in this tab. The DB also tombstones revocations.
      queue.current = queue.current.catch(() => {}).then(async () => {
        if (action.startsWith('touch:')) {
          let stillGranted = false;
          try { stillGranted = readAttributionConsent(localStorage.getItem(CONSENT_KEY)) === true; } catch { /* No consent. */ }
          if (!stillGranted) return;
        }
        const response = await fetch('/api/marketing/attribution', action === 'withdraw'
          ? { method:'DELETE', keepalive:true }
          : { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({campaign,version:ATTRIBUTION_VERSION,consent:true}), keepalive:true });
        if (!response.ok) last = '';
      }).catch(() => { last = ''; });
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('mindbanger-consent-change', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('mindbanger-consent-change', sync);
      window.removeEventListener('focus', sync);
    };
  }, [path]);
  return null;
}

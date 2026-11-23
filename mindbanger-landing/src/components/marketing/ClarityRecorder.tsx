'use client';

import {useEffect} from 'react';
import {CLARITY_PROJECT_ID, clarityPageAllowed, clarityReferrerAllowed} from '@/lib/clarity-consent';

type ClarityCall = ((...args: unknown[]) => void) & {q?: unknown[][]};
declare global { interface Window { clarity?: ClarityCall } }
let usedInDocument = false;

function clearCookies() {
  for (const name of ['_clck', '_clsk']) for (const domain of ['', location.hostname, '.mindbanger.com']) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? '; Domain='+domain : ''}`;
  }
}

export default function ClarityRecorder({allowed}: {allowed: boolean}) {
  useEffect(() => {
    if (!allowed || !clarityPageAllowed(new URL(location.href)) || !clarityReferrerAllowed(document.referrer)) return;
    // A fresh document prevents an earlier recorder resuming after private routes.
    if (usedInDocument) { location.reload(); return; }
    usedInDocument = true;
    let stopped = false;
    const queue: ClarityCall = (...args) => { queue.q!.push(args); };
    queue.q = [];
    window.clarity = queue;
    queue('consentv2', {analytics_Storage:'granted', ad_Storage:'denied'});
    const stop = () => {
      if (stopped) return;
      stopped = true;
      window.clarity?.('consentv2', {analytics_Storage:'denied', ad_Storage:'denied'});
      window.clarity?.('stop');
      clearCookies();
    };
    // Leave the recorded document before Next can render another page's content.
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && (url.pathname !== location.pathname || !clarityPageAllowed(url))) {
        event.preventDefault(); event.stopImmediatePropagation(); stop(); location.assign(url.href);
      }
    };
    const pop = () => { stop(); location.reload(); };
    const push = history.pushState, replace = history.replaceState;
    function guard(original: History['pushState']): History['pushState'] {
      return function(data, unused, url) {
        if (url && !clarityPageAllowed(new URL(String(url), location.href))) stop();
        return original.call(history, data, unused, url);
      };
    }
    const guardedPush = guard(push), guardedReplace = guard(replace);
    history.pushState = guardedPush; history.replaceState = guardedReplace;
    window.addEventListener('click', click, true);
    window.addEventListener('popstate', pop, true);
    window.addEventListener('pagehide', stop);
    const script = document.createElement('script');
    script.id = 'mindbanger-clarity'; script.async = true;
    script.referrerPolicy = 'origin';
    script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    document.head.appendChild(script);
    return () => {
      stop(); script.remove();
      window.removeEventListener('click', click, true);
      window.removeEventListener('popstate', pop, true);
      window.removeEventListener('pagehide', stop);
      if (history.pushState === guardedPush) history.pushState = push;
      if (history.replaceState === guardedReplace) history.replaceState = replace;
    };
  }, [allowed]);
  return null;
}

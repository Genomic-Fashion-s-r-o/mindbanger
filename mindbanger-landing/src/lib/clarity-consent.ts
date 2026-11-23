export const CLARITY_PROJECT_ID = 'z47djgwifo';
export const CLARITY_CONSENT_KEY = 'mindbanger-clarity-consent-v1';
export const CLARITY_SUPPORT_CONSENT_KEY = 'mindbanger-clarity-support-consent-v1';
export function clarityConsentKeyForPage(id: string | undefined): string {
  return id === 's03' ? CLARITY_SUPPORT_CONSENT_KEY : CLARITY_CONSENT_KEY;
}
const MAX_AGE = 180 * 86400000;

export function clarityChoiceForAction(eligible: boolean, requested: boolean | undefined, draft: boolean): boolean | null {
  // Reject-all revokes Clarity everywhere; other pages cannot grant it silently.
  return eligible ? requested ?? draft : requested === false ? false : null;
}

export function readClarityConsent(raw: string | null, now = Date.now()): boolean | null {
  try {
    const value = JSON.parse(raw || 'null');
    return value?.version === 1 && typeof value.allowed === 'boolean' &&
      typeof value.at === 'number' && value.at <= now && now - value.at <= MAX_AGE
      ? value.allowed : null;
  } catch { return null; }
}

export function clarityPageAllowed(url: URL): boolean {
  if (!['www.mindbanger.com', 'mindbanger.com'].includes(url.hostname)) return false;
  if (!['/produkty/chut-na-sladke', '/cz/produkty/chut-na-sladke', '/sluzby/opora-pocas-liecby', '/cz/sluzby/opora-pocas-liecby'].includes(url.pathname)) return false;
  // Do not record pages opened with unknown query parameters or private links.
  for (const [key, value] of url.searchParams) {
    if (!/^(utm_(source|medium|campaign|id|content|term)|fbclid|gclid)$/.test(key) ||
      !/^[a-zA-Z0-9_. -]{0,500}$/.test(value)) return false;
  }
  return !url.hash || ['#obsah', '#spoznavas-sa', '#obsah-programu', '#registracia', '#registracny-formular', '#co-ziskas', '#prve-stretnutie', '#odborne-zdroje', '#priebeh'].includes(url.hash);
}

export function clarityReferrerAllowed(raw: string): boolean {
  if (!raw) return true;
  try {
    const url = new URL(raw);
    if (url.search || url.hash) return false;
    if (!['www.mindbanger.com','mindbanger.com'].includes(url.hostname)) return url.protocol === 'https:';
    return ['/', '/cz', '/cz/', '/cookies', '/cz/cookies', '/ochrana-udajov', '/cz/ochrana-udajov',
      '/produkty/chut-na-sladke', '/cz/produkty/chut-na-sladke', '/sluzby/opora-pocas-liecby', '/cz/sluzby/opora-pocas-liecby'].includes(url.pathname);
  } catch { return false; }
}

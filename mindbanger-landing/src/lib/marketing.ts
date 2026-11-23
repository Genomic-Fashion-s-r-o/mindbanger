export const ANALYTICS_ID = 'G-Y1G3N57531';
export const META_PIXEL_ID = '29504221602516931';
export const CONSENT_KEY = 'mindbanger-consent-v1';
export const CONSENT_DAYS = 180;
export const ANALYTICS_CONSENT_VERSION = 4;
export { analyticsPage as marketingPage } from './analytics-schema';

// Explicit public routes only. Queries, hashes, service names and private paths
// never become analytics payloads.
export function readAnalyticsConsent(raw:string|null,now=Date.now()):boolean|null {
 if(readConsent(raw,now)===null)return null;
 try{const v=JSON.parse(raw!);return v.version===ANALYTICS_CONSENT_VERSION?v.analytics:null;}catch{return null;}
}

export function readConsent(raw: string | null, now = Date.now()): boolean | null {
  try {
    const value = JSON.parse(raw || 'null');
    if (![1, 2, 3, 4].includes(value?.version) || typeof value.analytics !== 'boolean' ||
        typeof value.at !== 'number' || value.at > now ||
        now - value.at > CONSENT_DAYS * 86400000) return null;
    return value.analytics;
  } catch { return null; }
}

// An earlier Analytics choice never grants permission to send data to Meta.
export function readMarketingConsent(raw: string | null, now = Date.now()): boolean | null {
  if (readConsent(raw, now) === null) return null;
  try {
    const value = JSON.parse(raw!);
    return [2, 3, 4].includes(value.version) && typeof value.marketing === 'boolean' ? value.marketing : null;
  } catch { return null; }
}

export function readAttributionConsent(raw: string | null, now = Date.now()): boolean | null {
  if (readConsent(raw, now) === null) return null;
  try {
    const value = JSON.parse(raw!);
    return [3,4].includes(value.version) && typeof value.attribution === 'boolean' ? value.attribution : null;
  } catch { return null; }
}

export function currentBookingAttributionConsent(): 'booking-attribution-v1' | null {
  try { return readAttributionConsent(localStorage.getItem(CONSENT_KEY)) === true ? 'booking-attribution-v1' : null; }
  catch { return null; }
}

export function marketingCampaign(query: string) {
  const params = new URLSearchParams(query);
  const result: Record<string, string> = {};
  for (const [key, output] of [['utm_source', 'campaign_source'], ['utm_medium', 'campaign_medium'], ['utm_campaign', 'campaign_name'], ['utm_id', 'campaign_id'],['utm_content','campaign_content'],['utm_term','campaign_term']] as const) {
    const value = params.get(key);
    if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) result[output] = value;
  }
  return result;
}

export function marketingReferrer(raw: string) {
  try {
    const url = new URL(raw);
    if (/(^|\.)(google\.[a-z.]+|facebook\.com|instagram\.com|bing\.com|t\.co)$/.test(url.hostname)) return url.origin;
  } catch { /* No raw referrer is forwarded. */ }
  return '';
}

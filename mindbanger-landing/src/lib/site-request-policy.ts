// Server request counters only: never pass query strings, headers or visitor IDs to storage.
export const countedPublicPaths = [
  '/', '/cookies', '/ochrana-udajov', '/podmienky', '/podmienky-uctu',
  '/produkty/chut-na-sladke',
  ...['rychly-rozhovor', 'vypni-hlavu', 'zvladaj-stres', 'znovu-si-ver',
    'individualny-coaching', 'teenager-pod-tlakom', 'mentalny-trening', 'relaxacia',
    'opora-pocas-liecby', 'premiovy-mentalny-koucing'].map(id => '/sluzby/' + id),
] as const;
const paths = new Set<string>(countedPublicPaths);
const bots = /bot\b|crawler|spider|slurp|facebookexternalhit|facebot|meta-external|preview|headless|lighthouse|pagespeed|monitor|vercel|uptime|curl|wget|python|node-fetch/i;

export function publicRequestPath(request: { method: string; url: string; headers: Headers }): string | null {
  if (request.method !== 'GET') return null;
  const h = request.headers;
  if (!h.get('accept')?.includes('text/html')) return null;
  if (h.has('rsc') || h.has('next-router-prefetch') || h.has('next-router-segment-prefetch') ||
      /prefetch|prerender/i.test((h.get('purpose') || '') + (h.get('sec-purpose') || ''))) return null;
  if (h.has('sec-fetch-dest') && h.get('sec-fetch-dest') !== 'document') return null;
  const ua = h.get('user-agent') || '';
  if (!ua || bots.test(ua)) return null;
  const url = new URL(request.url);
  if (!['www.mindbanger.com', 'mindbanger.com'].includes(url.hostname)) return null;
  const path = url.pathname;
  const bare = path === '/cz' ? '/' : path.startsWith('/cz/') ? path.slice(3) : path;
  return paths.has(bare) ? path : null;
}

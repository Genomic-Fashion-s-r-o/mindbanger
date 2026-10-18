import path from 'node:path';
import { fileURLToPath } from 'node:url';
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // Keep saved links and external callbacks working after moving Daily.
  async redirects() {
    const pages = ['app', 'admin', 'about', 'terms', 'privacy', 'affiliate-terms', 'join', 'login', 'b2b', 'checkout', 'success', 'cancel', 'auth'];
    return [
      { source: '/mindbanger_daily/app/settings', destination: '/ucet/profil', permanent: false },
      { source: '/mindbanger_daily/app/my-audio', destination: '/ucet/materialy', permanent: false },
      ...['', '/app/:path*', '/checkout/:path*', '/b2b/:path*', '/success', '/cancel'].map(p => ({ source: `/mindbanger_daily${p}`, destination: '/ucet', permanent: false })),
      ...['/login', '/mindbanger_daily/login', '/mindbanger_daily/auth/verify'].map(source => ({ source, destination: '/prihlasenie', permanent: false })),
      ...['/join', '/mindbanger_daily/join'].map(source => ({ source, destination: '/registracia', permanent: false })),
      { source: '/mindbanger/:path*', destination: '/mindbanger_daily/:path*', permanent: true },
      { source: '/manifest.webmanifest', destination: '/mindbanger_daily/manifest.webmanifest', permanent: true },
      ...pages.map(p => ({ source: `/${p}/:path*`, destination: `/mindbanger_daily/${p}/:path*`, permanent: true })),
      ...['refMode', 'refCode', 'ref'].map(key => ({ source: '/', has: [{ type: 'query', key }], destination: '/mindbanger_daily', permanent: false })),
    ];
  },
  async rewrites() {
    // Existing webhook/cron integrations retain /api; prefixed clients work too.
    return [{ source: '/mindbanger_daily/api/:path*', destination: '/api/:path*' }];
  },
  async headers() {
    const hidden = ['ucet', 'dokoncit-ucet', 'prihlasenie', 'registracia','mindbanger_daily', 'mindbanger', 'app', 'admin', 'about', 'terms', 'privacy', 'affiliate-terms', 'join', 'login', 'b2b', 'checkout', 'success', 'cancel', 'auth'];
    return [
      ...['ucet', 'api/client', 'produkty', 'dokoncit-ucet', 'prihlasenie', 'registracia'].map(p => ({ source: `/${p}/:path*`, headers: [{ key: 'Cache-Control', value: 'private, no-store' }] })),
      ...hidden.map(p => ({ source: `/${p}/:path*`, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
      { source: '/rezervacia/sprava/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Cache-Control', value: 'no-store' }] },
      { source: '/api/appointments/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;

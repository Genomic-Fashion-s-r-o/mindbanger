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
      { source: '/mindbanger/:path*', destination: '/mindbanger_daily/:path*', permanent: true },
      { source: '/manifest.webmanifest', destination: '/mindbanger_daily/manifest.webmanifest', permanent: true },
      { source: '/mindbanger_daily/auth/verify', destination: '/mindbanger_daily/login', permanent: false },
      { source: '/mindbanger_daily/b2b/success', destination: '/mindbanger_daily/app/organization', permanent: false },
      ...pages.map(p => ({ source: `/${p}/:path*`, destination: `/mindbanger_daily/${p}/:path*`, permanent: true })),
      ...['refMode', 'refCode', 'ref'].map(key => ({ source: '/', has: [{ type: 'query', key }], destination: '/mindbanger_daily', permanent: false })),
    ];
  },
  async rewrites() {
    // Existing webhook/cron integrations retain /api; prefixed clients work too.
    return [{ source: '/mindbanger_daily/api/:path*', destination: '/api/:path*' }];
  },
  async headers() {
    const hidden = ['mindbanger_daily', 'mindbanger', 'app', 'admin', 'about', 'terms', 'privacy', 'affiliate-terms', 'join', 'login', 'b2b', 'checkout', 'success', 'cancel', 'auth'];
    return [
      ...hidden.map(p => ({ source: `/${p}/:path*`, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
      { source: '/rezervacia/sprava/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Cache-Control', value: 'no-store' }] },
      { source: '/api/appointments/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;

import type { MetadataRoute } from 'next'

function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mindbanger Daily',
    short_name: 'Mindbanger',
    description: 'Daily mental clarity & focus signals.',
    start_url: '/mindbanger_daily/app/today',
    scope: '/mindbanger_daily/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}

export const dynamic = 'force-static';
export function GET() { return Response.json(manifest(), { headers: { 'Content-Type': 'application/manifest+json' } }); }

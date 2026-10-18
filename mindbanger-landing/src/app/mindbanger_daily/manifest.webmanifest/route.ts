import type { MetadataRoute } from 'next'

function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mindbanger',
    short_name: 'Mindbanger',
    description: 'Váš klientsky účet pre online služby a programy.',
    start_url: '/ucet',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f6f0',
    theme_color: '#f7f6f0',
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

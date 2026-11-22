import { coachingServices } from '@/lib/coaching-services';
import { SERVICE_CATALOG } from '@/lib/booking/catalog';
import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindbanger.com';
  const paths=[...new Set(['', '/moj-pristup', '/rezervacia', '/produkty/chut-na-sladke', '/podmienky', '/ochrana-udajov', '/cookies', ...coachingServices.map(s => '/sluzby/' + s.slug), ...SERVICE_CATALOG.map(s => '/sluzby/' + s.id)])];
  const entries = paths.flatMap(path => ([
    { url: `${base}${path}`, changeFrequency: 'monthly' as const, priority: path === '' ? 1 : 0.5, alternates:{languages:{sk:`${base}${path}`,'cs-CZ':`${base}/cz${path}`,'x-default':`${base}${path}`}} },
    { url: `${base}/cz${path}`, changeFrequency: 'monthly' as const, priority: path === '' ? .9 : .5, alternates:{languages:{sk:`${base}${path}`,'cs-CZ':`${base}/cz${path}`,'x-default':`${base}${path}`}} },
  ]));
  return [{url: `${base}/the-soul-that-met-itself`,changeFrequency: 'monthly',priority: .7}, ...entries];
}

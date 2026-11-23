import { coachingServices } from '@/lib/coaching-services';
import { SERVICE_CATALOG } from '@/lib/booking/catalog';
import type { MetadataRoute } from 'next';
import { bookLanguages,bookPath } from '@/lib/readers/book-languages';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindbanger.com';
  const paths=[...new Set(['', '/moj-pristup', '/rezervacia', '/produkty/chut-na-sladke', '/podmienky', '/ochrana-udajov', '/cookies', ...coachingServices.map(s => '/sluzby/' + s.slug), ...SERVICE_CATALOG.map(s => '/sluzby/' + s.id)])];
  const entries = paths.flatMap(path => ([
    { url: `${base}${path}`, changeFrequency: 'monthly' as const, priority: path === '' ? 1 : 0.5, alternates:{languages:{sk:`${base}${path}`,'cs-CZ':`${base}/cz${path}`,en:`${base}/en${path}`,'x-default':`${base}/en${path}`}} },
    { url: `${base}/cz${path}`, changeFrequency: 'monthly' as const, priority: path === '' ? .9 : .5, alternates:{languages:{sk:`${base}${path}`,'cs-CZ':`${base}/cz${path}`,en:`${base}/en${path}`,'x-default':`${base}/en${path}`}} },
    { url: `${base}/en${path}`, changeFrequency: 'monthly' as const, priority: path === '' ? .9 : .5, alternates:{languages:{sk:`${base}${path}`,'cs-CZ':`${base}/cz${path}`,en:`${base}/en${path}`,'x-default':`${base}/en${path}`}} },
  ]));
  const languages=Object.fromEntries(bookLanguages.map(l=>[l.code,`${base}${bookPath(l.code)}`]));
  return [...bookLanguages.map(l=>({url:`${base}${bookPath(l.code)}`,changeFrequency:'monthly' as const,priority:.7,alternates:{languages:{...languages,'x-default':`${base}/the-soul-that-met-itself`}}})), ...entries];
}

import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindbanger.com';
  return { rules: { userAgent: '*', allow: '/', disallow: ['/mindbanger_daily/admin/', '/mindbanger_daily/api/', '/api/', '/rezervacia/sprava/'] }, sitemap: `${base}/sitemap.xml` };
}

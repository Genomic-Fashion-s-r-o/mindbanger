import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindbanger.com';
  return ['', '/rezervacia', '/podmienky', '/ochrana-udajov', '/cookies'].map(path => ({ url: `${base}${path}`, changeFrequency: 'monthly', priority: path === '' ? 1 : 0.5 }));
}

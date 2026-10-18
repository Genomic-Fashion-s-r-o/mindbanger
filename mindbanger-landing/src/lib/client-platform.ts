export const DAILY_ENABLED = false;
export const CLIENT_TERMS_VERSION = '2026-10-18-portal-v1';
export const PROGRAM_SLUG = 'chut-na-sladke';
export function safeClientReturn(value: unknown) {
  if (typeof value !== 'string' || value.length > 1000 || /[\\\u0000-\u0020]/.test(value) || !value.startsWith('/') || value.startsWith('//')) return '/ucet';
  try {
    const url = new URL(value, 'https://mindbanger.invalid');
    if (url.origin !== 'https://mindbanger.invalid' || !/^\/(?:ucet(?:\/|$)|produkty\/chut-na-sladke(?:\/|$)|rezervacia(?:\/|$))/.test(url.pathname)) return '/ucet';
    return url.pathname + url.search + url.hash;
  } catch { return '/ucet'; }
}

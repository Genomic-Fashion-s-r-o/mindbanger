import { SOUL_BOOK_PATH, LEGACY_SOUL_BOOK_PATH } from './book-source';

export const bookLanguages = [
  { code: 'en', name: 'English', og: 'en_US' },
  { code: 'cs', name: 'Čeština', og: 'cs_CZ' },
  { code: 'sk', name: 'Slovenčina', og: 'sk_SK' },
  { code: 'es', name: 'Español', og: 'es_ES' },
  { code: 'fr', name: 'Français', og: 'fr_FR' },
  { code: 'de', name: 'Deutsch', og: 'de_DE' },
  { code: 'it', name: 'Italiano', og: 'it_IT' },
  { code: 'pl', name: 'Polski', og: 'pl_PL' },
] as const;
export type BookLocale = typeof bookLanguages[number]['code'];
export const BOOK_LANGUAGE_COOKIE = 'mindbanger-book-lang';
export function asBookLocale(value: unknown): BookLocale | null {
  if (typeof value !== 'string') return null;
  const tag = value.trim().toLowerCase().replaceAll('_', '-').split('-')[0];
  const code = tag === 'cz' ? 'cs' : tag;
  return bookLanguages.some(l => l.code === code) ? code as BookLocale : null;
}
export const bookPath = (locale: BookLocale) => SOUL_BOOK_PATH + '/' + locale;
export const mainHomePath = (locale: string) => locale === 'sk' ? '/?lang=sk' : locale === 'cs' ? '/cz' : '/en';

export function browserBookLocale(header?: string | null): BookLocale | null {
  const preferences = (header || '').split(',').map((part, index) => {
    const [tag, ...parameters] = part.trim().split(';');
    const quality = parameters.find(p => p.trim().startsWith('q='))?.trim().slice(2);
    const q = quality === undefined ? 1 : Number(quality);
    return { locale: asBookLocale(tag), q, index };
  }).filter(p => p.locale && Number.isFinite(p.q) && p.q > 0 && p.q <= 1).sort((a, b) => b.q - a.q || a.index - b.index);
  return preferences[0]?.locale || null;
}

// Country-level defaults complement browser preferences; no precise location is stored.
const countryGroups: Partial<Record<BookLocale, readonly string[]>> = {
  sk: ['SK'], cs: ['CZ'],
  es: ['ES', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'PR', 'CO', 'VE', 'EC', 'PE', 'BO', 'PY', 'CL', 'AR', 'UY', 'GQ'],
  fr: ['FR', 'MC', 'BE', 'LU', 'SN', 'CI', 'BF', 'ML', 'NE', 'BJ', 'TG', 'GN', 'CD', 'CG', 'GA', 'CM', 'CF', 'TD', 'DJ', 'MG', 'KM', 'HT', 'GP', 'MQ', 'GF', 'RE', 'YT', 'PF', 'NC', 'WF', 'PM', 'MF', 'BL'],
  de: ['DE', 'AT', 'LI', 'CH'], it: ['IT', 'SM', 'VA'], pl: ['PL'],
};
export function countryBookLocale(country?: string | null): BookLocale {
  const code = country?.trim().toUpperCase();
  return bookLanguages.find(l => countryGroups[l.code]?.includes(code || ''))?.code || 'en';
}
export function resolveBookLocale(input: { explicit?: unknown; requested?: unknown; cookie?: unknown; browser?: string | null; country?: string | null }): BookLocale {
  return asBookLocale(input.requested) || asBookLocale(input.explicit) || asBookLocale(input.cookie) || browserBookLocale(input.browser) || countryBookLocale(input.country);
}

export function bookRoute(path: string): { locale: BookLocale | null; legacy: boolean; invalid: boolean } | null {
  path = path.replace(/\/+$/, '') || '/';
  for (const base of [SOUL_BOOK_PATH, LEGACY_SOUL_BOOK_PATH]) {
    if (path === base || path.startsWith(base + '/')) {
      const suffix = path.slice(base.length).replace(/^\//, '');
      const locale = suffix ? asBookLocale(suffix) : null;
      return { locale, legacy: base === LEGACY_SOUL_BOOK_PATH, invalid: !!suffix && (!locale || suffix.includes('/')) };
    }
    const match = path.match(/^\/([a-zA-Z-]+)(\/.*)$/);
    if (match?.[2] === base) { const locale = asBookLocale(match[1]); if (locale) return { locale, legacy: true, invalid: false }; }
  }
  return null;
}

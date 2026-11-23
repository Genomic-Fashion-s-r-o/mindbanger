import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { bookLanguages, bookPath, resolveBookLocale, browserBookLocale, bookRoute, mainHomePath, BOOK_LANGUAGE_COOKIE } from '../src/lib/readers/book-languages';
import { bookDictionaries } from '../src/lib/readers/book-text';
import { bookRouting } from '../src/lib/readers/book-routing';
import { resolvePortalLocale } from '../src/lib/portal-locale';
import { readerText } from '../src/lib/readers/locale';

function shape(value: unknown): unknown { if (Array.isArray(value)) return value.map(shape); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, shape(entry)])); assert.equal(typeof value, 'string'); assert.ok(String(value).trim()); return 'string'; }
test('all eight complete book and registration translations match the shared content structure', () => {
  assert.deepEqual(bookLanguages.map(l => l.code), ['en', 'cs', 'sk', 'es', 'fr', 'de', 'it', 'pl']); const expected = shape(bookDictionaries.en);
  for (const language of bookLanguages) { const copy = bookDictionaries[language.code]; assert.deepEqual(shape(copy), expected, language.code); assert.equal(copy.parts.length, 4); assert.equal(copy.modelTitle.length, 3); assert.ok(copy.modelParagraphs[0].includes('MIRIEC')); assert.ok(copy.registration.source.includes('{book}')); assert.ok(copy.quoteCredit.includes('{book}')); assert.equal(readerText(language.code).email.length > 0, true); }
  assert.equal(mainHomePath('sk'), '/?lang=sk'); assert.equal(mainHomePath('cs'), '/cz'); for (const locale of ['en', 'es', 'fr', 'de', 'it', 'pl']) assert.equal(mainHomePath(locale), '/en');
});

test('book language negotiation honours explicit choice and browser quality with worldwide country fallback', () => {
  assert.equal(resolveBookLocale({ requested: 'fr', explicit: 'de', cookie: 'sk', country: 'US' }), 'fr');
  assert.equal(resolveBookLocale({ explicit: 'de', cookie: 'sk', browser: 'fr', country: 'US' }), 'de');
  assert.equal(resolveBookLocale({ cookie: 'pl', browser: 'en', country: 'MX' }), 'pl');
  assert.equal(browserBookLocale('es-MX;q=0.3,fr-CA;q=0.9,en;q=0.8'), 'fr');
  assert.equal(browserBookLocale('de;q=0,xx;q=1,pl-PL;q=0.7'), 'pl');
  assert.equal(browserBookLocale('fr;q=invalid,*;q=0.5'), null);
  for (const [country, locale] of [['SK', 'sk'], ['CZ', 'cs'], ['MX', 'es'], ['AR', 'es'], ['FR', 'fr'], ['SN', 'fr'], ['DE', 'de'], ['AT', 'de'], ['IT', 'it'], ['PL', 'pl'], ['US', 'en'], ['JP', 'en'], ['BR', 'en'], ['AU', 'en']]) assert.equal(resolveBookLocale({ country }), locale, country);
  assert.equal(resolveBookLocale({ browser: 'fr-CA,fr;q=0.9', country: 'CA' }), 'fr'); assert.equal(resolveBookLocale({ browser: 'es', country: 'US' }), 'es'); assert.equal(resolveBookLocale({ browser: 'it-CH', country: 'CH' }), 'it');
});

test('book redirects preserve seller attribution, isolate language cookies and do not cache geo decisions', () => {
  const request = (path: string, headers: Record<string, string> = {}) => new NextRequest('https://www.mindbanger.com' + path, { headers });
  const base = bookRouting(request('/the-soul-that-met-itself?from=kindle&utm_source=amazon', { 'x-vercel-ip-country': 'MX', cookie: 'user-lang=sk' }))!;
  assert.equal(base.status, 307); const url = new URL(base.headers.get('location')!); assert.equal(url.pathname, bookPath('es')); assert.equal(url.searchParams.get('from'), 'kindle'); assert.equal(url.searchParams.get('utm_source'), 'amazon'); assert.match(base.headers.get('cache-control')!, /no-store/); assert.match(base.headers.get('vary')!, /X-Vercel-IP-Country/i); assert.equal(base.cookies.get('user-lang'), undefined);
  const selected = bookRouting(request('/the-soul-that-met-itself/es?from=kindle&lang=de'))!; assert.equal(new URL(selected.headers.get('location')!).pathname, bookPath('de')); assert.equal(new URL(selected.headers.get('location')!).search, '?from=kindle'); assert.equal(selected.cookies.get(BOOK_LANGUAGE_COOKIE)?.value, 'de');
  const explicit = bookRouting(request(bookPath('fr'), { 'x-vercel-ip-country': 'SK', 'accept-language': 'sk' }))!; assert.equal(explicit.status, 200); assert.equal(explicit.headers.get('x-middleware-request-x-reader-locale'), 'fr'); assert.equal(explicit.headers.get('x-middleware-request-x-site-locale'), 'en');
  const legacy = bookRouting(request('/one_soul-in-two-lives?from=kindle'))!; assert.equal(legacy.status, 308); assert.equal(new URL(legacy.headers.get('location')!).pathname, '/the-soul-that-met-itself');
  for (const [alias, locale] of [['/en/the-soul-that-met-itself', 'en'], ['/cz/one_soul-in-two-lives', 'cs'], ['/fr/the-soul-that-met-itself', 'fr']]) { const r = bookRouting(request(alias + '?from=bookshop'))!; assert.equal(r.status, 308); assert.equal(new URL(r.headers.get('location')!).pathname, '/the-soul-that-met-itself/' + locale); assert.equal(new URL(r.headers.get('location')!).search, '?from=bookshop'); }
  const registration = bookRouting(request('/readers/register?source=soul-amazon-kindle', { 'accept-language': 'pl-PL' }))!; assert.equal(new URL(registration.headers.get('location')!).pathname, '/readers/pl/register'); assert.equal(new URL(registration.headers.get('location')!).search, '?source=soul-amazon-kindle');
  assert.equal(bookRouting(request('/api/readers/auth')), null); assert.equal(bookRouting(request('/')), null); assert.equal(bookRoute('/the-soul-that-met-itself/not-a-locale')?.invalid, true);
});

test('main website has only SK/CZ/EN country defaults with explicit preferences and Slovak administration', () => {
  assert.equal(resolvePortalLocale('/', null, null, 'SK', 'en'), 'sk'); assert.equal(resolvePortalLocale('/', null, null, 'CZ', 'en'), 'cs');
  for (const country of ['US', 'GB', 'DE', 'FR', 'ES', 'PL', 'IT', 'JP', 'BR', 'CA']) assert.equal(resolvePortalLocale('/', null, null, country, 'sk'), 'en');
  assert.equal(resolvePortalLocale('/', 'sk', null, 'DE', 'de'), 'sk'); assert.equal(resolvePortalLocale('/en', 'sk', null, 'SK'), 'en'); assert.equal(resolvePortalLocale('/', null, 'cs', 'US'), 'cs'); assert.equal(resolvePortalLocale('/', null, null, null, 'sk-SK'), 'sk'); assert.equal(resolvePortalLocale('/', null, null, null, 'fr'), 'en');
  assert.equal(resolvePortalLocale('/mindbanger_daily/admin/citatelia', 'en', 'en', 'US'), 'sk');
});

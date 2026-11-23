import { NextResponse, type NextRequest } from 'next/server';
import { asBookLocale, BOOK_LANGUAGE_COOKIE, bookPath, bookRoute, resolveBookLocale } from './book-languages';
import { SOUL_BOOK_PATH } from './book-source';

function noSharedCache(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie, Accept-Language, X-Vercel-IP-Country');
  return response;
}
function remember(request: NextRequest, response: NextResponse) {
  const requested = asBookLocale(request.nextUrl.searchParams.get('lang'));
  if (requested) response.cookies.set(BOOK_LANGUAGE_COOKIE, requested, { path: '/', maxAge: 31536000, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' });
  return noSharedCache(response);
}

export function bookRouting(request: NextRequest): NextResponse | null {
  const route = bookRoute(request.nextUrl.pathname);
  const requested = request.nextUrl.searchParams.get('lang');
  const resolved = (explicit?: string | null) => resolveBookLocale({ explicit, requested, cookie: request.cookies.get(BOOK_LANGUAGE_COOKIE)?.value, browser: request.headers.get('accept-language'), country: request.headers.get('x-vercel-ip-country') });
  if (route) {
    const locale = resolved(route.locale);
    if (route.invalid) { const h = new Headers(request.headers); h.set('x-reader-locale', 'en'); h.set('x-site-locale', 'en'); return noSharedCache(NextResponse.next({ request: { headers: h } })); }
    if (route.legacy && !route.locale && requested === null) { const url = request.nextUrl.clone(); url.pathname = SOUL_BOOK_PATH; return noSharedCache(NextResponse.redirect(url, 308)); }
    const target = bookPath(locale);
    if (request.nextUrl.pathname !== target || requested !== null) {
      const url = request.nextUrl.clone(); url.pathname = target; url.searchParams.delete('lang');
      // Automatic language negotiation is temporary; aliases to explicit languages are permanent.
      return remember(request, NextResponse.redirect(url, requested !== null || !route.locale ? 307 : 308));
    }
    const h = new Headers(request.headers); h.set('x-reader-locale', locale); h.set('x-site-locale', locale === 'sk' || locale === 'cs' ? locale : 'en');
    return noSharedCache(NextResponse.next({ request: { headers: h } }));
  }
  const generic = request.nextUrl.pathname.match(/^\/readers(?:\/(register|login))?\/?$/);
  if (generic) { const url = request.nextUrl.clone(); url.pathname = '/readers/' + resolved() + (generic[1] ? '/' + generic[1] : ''); url.searchParams.delete('lang'); return remember(request, NextResponse.redirect(url, 307)); }
  const registration = request.nextUrl.pathname.match(/^\/readers\/([^/]+)\/register\/?$/);
  if (registration && asBookLocale(registration[1]) && requested !== null) {
    const url = request.nextUrl.clone(); url.pathname = '/readers/' + resolved(registration[1]) + '/register'; url.searchParams.delete('lang'); return remember(request, NextResponse.redirect(url, 307));
  }
  return null;
}

import { SOUL_BOOK_PATH, LEGACY_SOUL_BOOK_PATH } from '@/lib/readers/book-source';
import { readerProxy } from '@/lib/readers/proxy';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { publicRequestPath } from '@/lib/site-request-policy';
import { countSiteRequest } from '@/lib/site-request-counter';
import { stripLocalePrefix } from '@/lib/site-locale';
import {normalizeLocale,portalPath,resolvePortalLocale} from '@/lib/portal-locale';

const AUTH_FREE = ['/moj-pristup', '/dotaznik', '/', '/rezervacia', '/rezervacia/sprava', '/podmienky', '/podmienky-uctu', '/ochrana-udajov', '/cookies'];
const NO_LOCALE_REDIRECT = ['/robots.txt', '/sitemap.xml'];

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const originalPath = request.nextUrl.pathname;
  if ([SOUL_BOOK_PATH, LEGACY_SOUL_BOOK_PATH].includes(stripLocalePrefix(originalPath))) {
    if (originalPath !== SOUL_BOOK_PATH) { const url=request.nextUrl.clone();url.pathname=SOUL_BOOK_PATH;return NextResponse.redirect(url,308); }
    const headers=new Headers(request.headers);headers.set('x-site-locale','en');headers.set('x-reader-locale','en');
    return NextResponse.next({request:{headers}});
  }
  if (/^\/(readers|books|b)(?:\/|$)/.test(originalPath)) return readerProxy(request);
  const bare=stripLocalePrefix(originalPath),admin=bare.startsWith('/mindbanger_daily/admin');
  const explicit=originalPath==='/cz'||originalPath.startsWith('/cz/')?'cs':originalPath==='/en'||originalPath.startsWith('/en/')?'en':null;
  const requested=request.nextUrl.searchParams.get('lang');
  const stored=request.cookies.get('user-lang')?.value;
  const country=(request.headers.get('x-vercel-ip-country')||'').toUpperCase();
  const locale=resolvePortalLocale(originalPath,stored,requested,country,request.headers.get('accept-language'));
  if(admin&&explicit){const url=request.nextUrl.clone();url.pathname=bare;return NextResponse.redirect(url,307);}
  if(!admin&&!explicit&&locale!=='sk'&&!NO_LOCALE_REDIRECT.includes(originalPath)&&['GET','HEAD'].includes(request.method)){
    const url=request.nextUrl.clone();url.pathname=portalPath(originalPath,locale);const response=NextResponse.redirect(url,307);
    response.cookies.set('user-lang',locale,{path:'/',maxAge:31536000,sameSite:'lax'});return response;
  }
  const countedPath = publicRequestPath(request);
  if (countedPath) event.waitUntil(countSiteRequest(countedPath));
  const upstreamPath = explicit ? bare : originalPath;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-site-locale', locale);
  requestHeaders.set('x-user-lang', locale);
  requestHeaders.set('x-client-return', originalPath + request.nextUrl.search);

  const makeResponse = () => {
    if (explicit) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = upstreamPath;
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  let response = makeResponse();
  if(!admin)response.cookies.set('user-lang', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });

  if (AUTH_FREE.includes(upstreamPath) || upstreamPath.startsWith('/sluzby/') || upstreamPath.startsWith('/produkty/')) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = makeResponse();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          if(!admin)response.cookies.set('user-lang', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!api|mindbanger_daily/api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

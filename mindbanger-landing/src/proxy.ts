import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Mapped supported languages
const SUPPORTED_LANGUAGES = ['en', 'sk', 'cs']
const DEFAULT_LANGUAGE = 'en'

// Mapping countries to languages
const COUNTRY_TO_LANG: Record<string, string> = {
  SK: 'sk',
  CZ: 'cs',
}

export async function proxy(request: NextRequest) {
  // The personal site has no login or language cookie and does not depend on Auth.
  if (['/', '/rezervacia', '/rezervacia/sprava', '/podmienky', '/ochrana-udajov', '/cookies', '/robots.txt', '/sitemap.xml'].includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  // 1. Initialize response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Refresh Supabase Session (Critical for persistent login)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshes the session if expired
  await supabase.auth.getUser()

  // 3. Language Detection Logic
  let language = request.cookies.get('user-lang')?.value

  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    // If no cookie, detect IP country from Vercel's headers
    const country = request.headers.get('x-vercel-ip-country') || ''
    
    // Default to 'en' if the country is not mapped
    language = COUNTRY_TO_LANG[country.toUpperCase()] || DEFAULT_LANGUAGE
    
    // Save the detected language into cookies for subsequent requests
    response.cookies.set('user-lang', language, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })
  }

  // Inject the language directly into headers so server components can access it easily
  response.headers.set('x-user-lang', language)

  return response
}

export const config = {
  matcher: [
    // Avoid running middleware on static files and API endpoints (unless api endpoints need it, but we can read cookies there)
    '/((?!api|mindbanger_daily/api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

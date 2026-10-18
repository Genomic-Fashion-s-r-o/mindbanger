'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // Inicializujeme klienta, čím sa automaticky spracuje hash (#access_token=...)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Detencia chyboveho stavu v URL (napr. error=Invalid_Token)
    if (window.location.search.includes('error=')) {
      setErrorMsg('This login link is no longer valid or has expired. Please request a new one.')
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Callback Auth Event:', event)
      if (session) {
        // Počkáme malinkú chvíľu, kým sa cookies reálne uložia do prehliadača
        setTimeout(() => {
          router.replace('/mindbanger_daily/app/today')
        }, 500)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      {errorMsg ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </div>
          <h2 className="text-xl text-slate-100 font-serif mb-2">Login Error</h2>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">{errorMsg}</p>
          <button 
            onClick={() => router.replace('/mindbanger_daily/login')}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            Späť na prihlásenie
          </button>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4 mx-auto"></div>
          <h2 className="text-xl text-slate-100 font-serif mb-2">Overujem váš prístup...</h2>
          <p className="text-slate-400 text-sm">Prosím čakajte, nepripájajte sa znova.</p>
        </div>
      )}
    </div>
  )
}
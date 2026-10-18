'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeClientReturn } from '@/lib/client-platform';
export default function AuthCallbackPage() {
 const [error,setError]=useState(false);
 useEffect(()=>{let active=true; (async()=>{const p=new URLSearchParams(window.location.search); if(p.has('error')){if(active)setError(true);return;} if(p.get('code')){const {error}=await supabase.auth.exchangeCodeForSession(p.get('code')!);if(error){if(active)setError(true);return;}} const {data:{user}}=await supabase.auth.getUser(); if(!active)return; if(user)window.location.replace(safeClientReturn(p.get('next')));else setError(true);})().catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 return <div className="client-site client-onboarding"><main className="client-card"><h1>{error?'Prihlásenie sa nepodarilo.':'Overujem váš prístup…'}</h1><p>{error?'Odkaz mohol vypršať. Vyžiadajte si nový prihlasovací kód.':'Prosím, chvíľu počkajte.'}</p>{error&&<Link className="client-button" href="/prihlasenie">Späť na prihlásenie</Link>}</main></div>;
}

'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeClientReturn } from '@/lib/client-platform';
export default function ClientLogin({ registration = false }: { registration?: boolean }) {
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [next, setNext] = useState('/ucet'), [retryAt, setRetryAt] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search), target = safeClientReturn(params.get('next') || params.get('redirect'));
    setNext(target); setEmail(params.get('email') || '');
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) window.location.replace(target); });
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (step === 'email') {
        if (Date.now() < retryAt) throw new Error('Pred ďalšou žiadosťou chvíľu počkajte.');
        const response = await fetch('/api/auth/magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), lang: 'sk' }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error);
        setRetryAt(Date.now() + 60000); setStep('code');
      } else {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email' });
        if (error) throw new Error('Kód nie je platný alebo už vypršal. Skontrolujte ho alebo požiadajte o nový.');
        window.location.replace(next);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Prihlásenie sa nepodarilo.'); }
    finally { setBusy(false); }
  }
  return <div className="client-site client-auth"><header><Link className="client-brand" href="/">mindbanger<span>PRIESTOR PRE VÁS</span></Link><Link href="/" className="client-text-link">Späť na web ↗</Link></header><main className="client-auth-grid"><section className="client-auth-intro"><p className="client-eyebrow">VŠETKO DÔLEŽITÉ NA JEDNOM MIESTE</p><h1>Priestor<br /><em>pre váš posun.</em></h1><p>Váš účet pre online stretnutia, vlastné materiály a pripravované programy. Bez povinného členstva a pravidelného predplatného.</p><div className="client-auth-points"><span>01 · Online služby</span><span>02 · Vaše rezervácie</span><span>03 · Pripravované programy</span></div></section><section className="client-card client-auth-card"><span className="client-badge">Bezplatný klientsky účet</span><h2>{step === 'code' ? 'Pozrite sa do emailu.' : registration ? 'Vitajte v Mindbanger.' : 'Vitajte späť.'}</h2><p>{step === 'code' ? `Na ${email} sme odoslali prihlasovací kód. Zadajte ho nižšie.` : 'Na váš email pošleme jednorazový kód. Heslo si nemusíte pamätať.'}</p><form className="client-form" onSubmit={submit}>{step === 'email' ? <label htmlFor="login-email">Email<input id="login-email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label> : <label htmlFor="login-code">Prihlasovací kód<input id="login-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,8}" minLength={6} maxLength={8} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus /></label>}{error && <p className="client-error" role="alert">{error}</p>}<button className="client-button" disabled={busy}>{busy ? 'Prosím čakajte…' : step === 'email' ? 'Poslať prihlasovací kód' : 'Prihlásiť sa'} <span aria-hidden="true">↗</span></button>{step === 'code' && <button className="client-text-link" type="button" disabled={busy} onClick={() => { setStep('email'); setCode(''); setError(''); }}>Zmeniť email alebo požiadať o nový kód</button>}</form><p className="client-auth-note">Ak ešte nemáte účet, po overení emailu vás prevedieme jeho dokončením. Žiadna platba sa nevykoná.</p><div className="client-footer-links"><Link href="/podmienky-uctu">Podmienky účtu</Link><Link href="/ochrana-udajov">Ochrana údajov</Link></div></section></main></div>;
}

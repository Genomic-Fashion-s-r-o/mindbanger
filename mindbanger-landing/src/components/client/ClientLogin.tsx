'use client';
import PortalElement from '@/components/client/PortalElement';
import ClientLanguageSwitcher from './ClientLanguageSwitcher';
import BrandLogo from '@/components/BrandLogo';
import Link from '@/components/client/PortalLink';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeClientReturn } from '@/lib/client-platform';
import './client-auth.css';
export default function ClientLogin({ registration = false, next: destination = '/ucet', initialEmail = '', linkMode = false, locale = 'sk' }: {
    registration?: boolean;
    next?: string;
    initialEmail?: string;
    linkMode?: boolean;
    locale?: 'sk' | 'cs' | 'en';
}) {
    const cs = locale === 'cs', c = (sk: string, cz: string) => cs ? cz : sk;
    const [email, setEmail] = useState(initialEmail), [password, setPassword] = useState(''), [method, setMethod] = useState<'password' | 'link'>(registration || linkMode ? 'link' : 'password');
    const [busy, setBusy] = useState(false), [redirecting, setRedirecting] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState('');
    const next = safeClientReturn(destination), bookingReturn = next.replace(/^\/(cz|en)(?=\/)/, '').startsWith('/ucet/rezervovat');
    function switchMethod(value: 'password' | 'link') { setMethod(value); setError(''); setSent(false); setPassword(''); }
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError('');
        try {
            if (method === 'password') {
                const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
                if (error) {
                    setError(c('Email alebo heslo nesedí. Skús to znova alebo použi prihlasovací odkaz z emailu.', 'E-mail nebo heslo nesouhlasí. Zkus to znovu nebo použij přihlašovací odkaz z e-mailu.'));
                    setBusy(false);
                    return;
                }
                setPassword('');
                setRedirecting(true);
                window.location.replace(next);
                return;
            }
            const r = await fetch('/api/auth/magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), lang: locale, next }) });
            const data = await r.json();
            if (!r.ok) {
                setError(r.status === 429 ? c('Odkaz si si už vyžiadal viackrát. Chvíľu počkaj a skús to znova.', 'Odkaz sis už vyžádal vícekrát. Chvíli počkej a zkus to znovu.') : c('Prihlasovací email sa teraz nepodarilo odoslať. Skús to o chvíľu znova.', 'Přihlašovací e-mail se teď nepodařilo odeslat. Zkus to za chvíli znovu.'));
                setBusy(false);
                return;
            }
            if (!data.success)
                throw Error('send_failed');
            setSent(true);
            setBusy(false);
        }
        catch {
            setError(c('Spojenie sa nepodarilo. Skontroluj internet a skús to znova.', 'Připojení se nezdařilo. Zkontroluj internet a zkus to znovu.'));
            setBusy(false);
        }
    }
    return <PortalElement as="div" className="client-site client-auth"><PortalElement as="header"><ClientLanguageSwitcher/><BrandLogo className="client-brand" href={cs ? '/cz' : '/'}/><Link href={cs ? '/cz' : '/'} className="client-text-link">{c('Späť na web', 'Zpět na web')} ↗</Link></PortalElement><PortalElement as="main" className="client-auth-grid"><PortalElement as="section" className="client-auth-intro"><PortalElement as="p" className="client-eyebrow">{c('VŠETKO DÔLEŽITÉ NA JEDNOM MIESTE', 'VŠE DŮLEŽITÉ NA JEDNOM MÍSTĚ')}</PortalElement><PortalElement as="h1">{c('Priestor', 'Prostor')}<PortalElement as="br"/><PortalElement as="em">{c('pre tvoj posun.', 'pro tvůj posun.')}</PortalElement></PortalElement><PortalElement as="p">{c('Tvoj účet pre online stretnutia, rezervácie a zakúpené balíčky. Bez povinného členstva a pravidelného predplatného.', 'Tvůj účet pro online setkání, rezervace a zakoupené balíčky. Bez povinného členství a pravidelného předplatného.')}</PortalElement><PortalElement as="div" className="client-auth-points"><PortalElement as="span">01 · Online {c('služby', 'služby')}</PortalElement><PortalElement as="span">02 · {c('Tvoje rezervácie', 'Tvé rezervace')}</PortalElement><PortalElement as="span">03 · {c('Tvoje balíčky', 'Tvé balíčky')}</PortalElement></PortalElement></PortalElement><PortalElement as="section" className="client-card client-auth-card"><PortalElement as="span" className="client-badge">{c('Bezplatný klientsky účet', 'Bezplatný klientský účet')}</PortalElement>
 {redirecting ? <PortalElement as="div" role="status" aria-live="polite"><PortalElement as="h2">{c('Otváram tvoj účet.', 'Otevírám tvůj účet.')}</PortalElement><PortalElement as="p">{c('Prihlásenie prebehlo úspešne. Ešte chvíľku…', 'Přihlášení proběhlo úspěšně. Ještě chvilku…')}</PortalElement></PortalElement> : sent ? <PortalElement as="div" className="auth-email-sent" role="status"><PortalElement as="h2">{c('Pozri sa do emailu.', 'Podívej se do e-mailu.')}</PortalElement><PortalElement as="p">{c('Na', 'Na')} <PortalElement as="strong">{email.trim()}</PortalElement> {c('sme poslali tlačidlo', 'jsme poslali tlačítko')} <PortalElement as="strong">{c('Prihlásiť sa do Mindbanger', 'Přihlásit se do Mindbanger')}</PortalElement>. {c('Kliknutím otvoríš svoj účet.', 'Kliknutím otevřeš svůj účet.')}</PortalElement><PortalElement as="p">{bookingReturn ? c('Tvoj výber stretnutia, témy a termínu zostal zachovaný.', 'Tvůj výběr setkání, tématu a termínu zůstal zachován.') : c('Odkaz môžeš otvoriť aj na inom zariadení.', 'Odkaz můžeš otevřít i na jiném zařízení.')} {c('Odkaz je jednorazový a má obmedzenú platnosť.', 'Odkaz je jednorázový a má omezenou platnost.')}</PortalElement><PortalElement as="p">{c('Ak email nevidíš, pozri aj priečinok Spam. Staršie odkazy už po vyžiadaní nového nemusia fungovať.', 'Pokud e-mail nevidíš, podívej se i do složky Spam. Starší odkazy už po vyžádání nového nemusí fungovat.')}</PortalElement><PortalElement as="button" type="button" className="client-text-link" onClick={() => { setSent(false); setError(''); }}>{c('Zmeniť email alebo požiadať o nový odkaz', 'Změnit e-mail nebo požádat o nový odkaz')}</PortalElement><PortalElement as="button" type="button" className="client-text-link" onClick={() => switchMethod('password')}>{c('Použiť email a heslo', 'Použít e-mail a heslo')}</PortalElement></PortalElement> : <><PortalElement as="h2">{registration ? c('Vitaj v Mindbanger.', 'Vítej v Mindbanger.') : c('Vitaj späť.', 'Vítej zpět.')}</PortalElement><PortalElement as="div" className="auth-methods" role="group" aria-label={c('Spôsob prihlásenia', 'Způsob přihlášení')}><PortalElement as="button" type="button" aria-pressed={method === 'password'} disabled={busy} onClick={() => switchMethod('password')}>{c('Email a heslo', 'E-mail a heslo')}</PortalElement><PortalElement as="button" type="button" aria-pressed={method === 'link'} disabled={busy} onClick={() => switchMethod('link')}>{c('Odkaz do emailu', 'Odkaz do e-mailu')}</PortalElement></PortalElement><PortalElement as="p">{method === 'password' ? c('Použi heslo, ktoré si si nastavil v účte.', 'Použij heslo, které sis nastavil v účtu.') : c('Pošleme ti email s prihlasovacím tlačidlom. Heslo nepotrebuješ.', 'Pošleme ti e-mail s přihlašovacím tlačítkem. Heslo nepotřebuješ.')}</PortalElement>{bookingReturn && <PortalElement as="p" className="client-notice">{c('Tvoj výber stretnutia, témy a termínu sa po prihlásení zachová. Dostupnosť času ešte overíme.', 'Tvůj výběr setkání, tématu a termínu se po přihlášení zachová. Dostupnost času ještě ověříme.')}</PortalElement>}<PortalElement as="form" className="client-form" aria-busy={busy} onSubmit={submit}><PortalElement as="label" htmlFor="login-email">{c('Email', 'E-mail')}<PortalElement as="input" id="login-email" type="email" autoComplete="username" maxLength={254} required disabled={busy} value={email} onChange={e => setEmail(e.target.value)}/></PortalElement>{method === 'password' && <PortalElement as="label" htmlFor="login-password">{c('Heslo', 'Heslo')}<PortalElement as="input" id="login-password" type="password" autoComplete="current-password" maxLength={128} required disabled={busy} value={password} onChange={e => setPassword(e.target.value)}/></PortalElement>}{error && <PortalElement as="p" className="client-error" role="alert">{error}</PortalElement>}<PortalElement as="button" className="client-button" disabled={busy}>{busy ? (method === 'link' ? c('Odosielam email…', 'Odesílám e-mail…') : c('Prihlasujem…', 'Přihlašuji…')) : method === 'link' ? c('Poslať prihlasovací odkaz', 'Poslat přihlašovací odkaz') : c('Prihlásiť sa', 'Přihlásit se')} ↗</PortalElement></PortalElement>{method === 'password' && <PortalElement as="button" className="client-text-link auth-recovery" type="button" disabled={busy} onClick={() => switchMethod('link')}>{c('Nemám alebo som zabudol heslo', 'Nemám nebo jsem zapomněl heslo')}</PortalElement>}<PortalElement as="p" className="client-auth-note">{c('Pri prvom prihlásení použi odkaz do emailu. Heslo si potom môžeš nastaviť v časti Môj účet. Žiadna platba sa prihlásením nevykoná.', 'Při prvním přihlášení použij odkaz do e-mailu. Heslo si potom můžeš nastavit v části Můj účet. Přihlášením se neprovede žádná platba.')}</PortalElement></>}<PortalElement as="div" className="client-footer-links"><Link href={cs ? '/cz/podmienky-uctu' : '/podmienky-uctu'}>{c('Podmienky účtu', 'Podmínky účtu')}</Link><Link href={cs ? '/cz/ochrana-udajov' : '/ochrana-udajov'}>{c('Ochrana údajov', 'Ochrana osobních údajů')}</Link></PortalElement></PortalElement></PortalElement></PortalElement>;
}

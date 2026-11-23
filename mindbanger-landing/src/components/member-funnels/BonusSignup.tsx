'use client';
import PortalElement from '@/components/client/PortalElement';
import ClientLanguageSwitcher from '@/components/client/ClientLanguageSwitcher';
import { useState, useEffect, useRef } from 'react';
import Link from '@/components/client/PortalLink';
import { CLIENT_TERMS_VERSION } from '@/lib/client-platform';
import '@/components/programs/online-programs.css';
export function BonusSignup({ slug, title, description, signedInEmail, contentFallback=false }: {
    slug: string;
    title: string;
    description: string;
    signedInEmail?: string;
    contentFallback?:boolean;
}) {
    return <BonusEntry slug={slug} title={title} description={description} signedInEmail={signedInEmail} contentFallback={contentFallback}/>;
}
function BonusEntry({ slug, title, description, signedInEmail, contentFallback=false }: {
    slug: string;
    title: string;
    description: string;
    signedInEmail?: string;
    contentFallback?:boolean;
}) {
    const [email, setEmail] = useState(signedInEmail || ''), [step, setStep] = useState<'email' | 'password'>('email'), [mode, setMode] = useState<'create' | 'login'>('create');
    const [entryId, setEntryId] = useState('');
    const [password, setPassword] = useState(''), [birthYear, setBirthYear] = useState(''), [show, setShow] = useState(false), [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState('');
    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const endpoint = signedInEmail ? 'claim' : step === 'email' ? 'start' : 'password';
            const body = signedInEmail ? { slug, accepted, termsVersion: CLIENT_TERMS_VERSION } : step === 'email' ? { slug, email } : { entryId, mode, password, ...(mode === 'create' ? { birthYear: Number(birthYear) } : {}), accepted, termsVersion: CLIENT_TERMS_VERSION };
            const response = await fetch('/api/member-funnels/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await response.json();
            if (!response.ok) {
                if (data.code === 'account_exists') {
                    setMode('login');
                    setPassword('');
                }
                throw new Error(data.error);
            }
            if (data.redirect) {
                setPassword('');
                window.location.assign(data.redirect);
                return;
            }
            setEntryId(data.entryId);
            setStep('password');
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Spojenie sa nepodarilo.');
        }
        finally {
            setBusy(false);
        }
    }
    async function emailLink() {
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/member-funnels/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, email, accepted, termsVersion: CLIENT_TERMS_VERSION }) });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error);
            setPassword('');
            setSent(true);
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Email sa nepodarilo odoslať.');
        }
        finally {
            setBusy(false);
        }
    }
    return <PortalElement as="div" className="op op-stack op-entry"><PortalElement as="header"><ClientLanguageSwitcher /><PortalElement as="p" className="client-eyebrow">TVÔJ BONUS Z MINDBANGERU</PortalElement><PortalElement as="h1">{title}</PortalElement><PortalElement as="p" className="op-text">{description}</PortalElement></PortalElement><PortalElement as="section" className="op-panel op-stack">{sent ? <PortalElement as="div" role="status"><PortalElement as="h2">Pozri sa do emailu.</PortalElement><PortalElement as="p">Poslali sme ti bezpečný prihlasovací odkaz. Kliknutím otvoríš svoj účet a odomkneš bonus.</PortalElement></PortalElement> : <PortalElement as="form" className="op-stack" onSubmit={submit} aria-busy={busy}>
 <PortalElement as="h2">{signedInEmail ? 'Odomkni si bonus' : step === 'email' ? 'Začni svojím emailom' : mode === 'create' ? 'Nastav si prístup do Mindbangeru' : 'Prihlás sa do svojho účtu'}</PortalElement>
 <PortalElement as="label">Email<PortalElement as="input" type="email" autoComplete="username" required value={email} maxLength={254} readOnly={!!signedInEmail || step === 'password'} disabled={busy} onChange={e => setEmail(e.target.value)}/></PortalElement>
 {step === 'password' && !signedInEmail && <><PortalElement as="button" type="button" className="op-entry-link" disabled={busy} onClick={() => { setStep('email'); setPassword(''); setError(''); }}>Zmeniť email</PortalElement>
 <PortalElement as="label">{mode === 'create' ? 'Vytvor si heslo' : 'Tvoje heslo'}<PortalElement as="input" type={show ? 'text' : 'password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required minLength={mode === 'create' ? 12 : 1} maxLength={128} value={password} disabled={busy} onChange={e => setPassword(e.target.value)}/></PortalElement><PortalElement as="button" type="button" className="op-entry-link" aria-pressed={show} onClick={() => setShow(v => !v)}>{show ? 'Skryť heslo' : 'Zobraziť heslo'}</PortalElement>
 {mode === 'create' && <><PortalElement as="p" className="op-subtle">Aspoň 12 znakov. Týmto heslom sa nabudúce prihlásiš.</PortalElement><PortalElement as="label">Rok narodenia<PortalElement as="input" type="number" inputMode="numeric" autoComplete="bday-year" required min={1900} max={new Date().getFullYear() - 18} value={birthYear} disabled={busy} onChange={e => setBirthYear(e.target.value)}/></PortalElement><PortalElement as="p" className="op-subtle">Rok narodenia nám pomáha porozumieť vekovým skupinám členov a ich záujmu o programy. Neslúži na obnovu hesla.</PortalElement></>}
 </>}
 {(signedInEmail || step === 'password') && <><PortalElement as="label" className="op-check"><PortalElement as="input" type="checkbox" checked={accepted} required disabled={busy} onChange={e => setAccepted(e.target.checked)}/><PortalElement as="span">Potvrdzujem, že mám aspoň 18 rokov, súhlasím s <Link href="/podmienky-uctu" target="_blank" rel="noopener noreferrer">podmienkami bezplatného účtu</Link> a oboznámil/a som sa s <Link href="/ochrana-udajov" target="_blank" rel="noopener noreferrer">ochranou údajov</Link>.</PortalElement></PortalElement><PortalElement as="p" className="op-subtle">Účet aj bonus sú zdarma. Nevzniká nákup ani predplatné.</PortalElement></>}
 <PortalElement as="div"><PortalElement as="button" className="op-primary" disabled={busy || ((!!signedInEmail || step === 'password') && !accepted)}>{busy ? 'Otváram…' : signedInEmail ? 'Získať bonus zdarma' : step === 'email' ? 'Pokračovať →' : mode === 'create' ? 'Vytvoriť účet a pokračovať →' : 'Prihlásiť sa a pokračovať →'}</PortalElement></PortalElement>
 {step === 'password' && !signedInEmail && <PortalElement as="div" className="op-stack op-tight"><PortalElement as="button" type="button" className="op-entry-link" disabled={busy} onClick={() => { setMode(v => v === 'create' ? 'login' : 'create'); setPassword(''); setError(''); }}>{mode === 'create' ? 'Už mám účet — prihlásiť sa' : 'Som tu prvýkrát — vytvoriť účet'}</PortalElement><PortalElement as="button" type="button" className="op-entry-link" disabled={busy || !accepted} onClick={() => void emailLink()}>Radšej použiť odkaz do emailu / zabudnuté heslo</PortalElement></PortalElement>}
 </PortalElement>}{error && <PortalElement as="p" className="op-error" role="alert">{error}</PortalElement>}</PortalElement></PortalElement>;
}
export function ClaimBonus({ ticket }: {
    ticket: string;
}) {
    const started = useRef(false), [error, setError] = useState('');
    useEffect(() => { if (started.current)
        return; started.current = true; void (async () => { try {
        const response = await fetch('/api/member-funnels/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }) });
        const data = await response.json();
        if (!response.ok)
            throw new Error(data.error);
        window.location.replace(data.redirect);
    }
    catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Bonus sa nepodarilo otvoriť.');
    } })(); }, [ticket]);
    return <PortalElement as="div" className="op op-panel"><PortalElement as="h1">{error ? 'Bonus sa nepodarilo otvoriť' : 'Odomykám tvoj bonus…'}</PortalElement>{error ? <><PortalElement as="p" className="op-error" role="alert">{error}</PortalElement><Link href="/ucet/materialy">Moje materiály</Link></> : <PortalElement as="p" role="status">Prihlásenie je overené. Ešte chvíľku…</PortalElement>}</PortalElement>;
}

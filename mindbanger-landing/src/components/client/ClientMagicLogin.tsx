'use client';
import PortalElement from '@/components/client/PortalElement';
import BrandLogo from '@/components/BrandLogo';
import Link from '@/components/client/PortalLink';
import { useEffect, useRef, useState } from 'react';
import {useDictionary}from '@/components/LanguageProvider';
import {normalizeLocale,portalPath}from '@/lib/portal-locale';
import { safeClientReturn } from '@/lib/client-platform';
import './client-auth.css';
export default function ClientMagicLogin() {
    const language=normalizeLocale(useDictionary().lang);
    const started = useRef(false), [error, setError] = useState(''), [next, setNext] = useState('/ucet');
    useEffect(() => {
        if (started.current)
            return;
        started.current = true;
        const params = new URLSearchParams(window.location.hash.slice(1)), token = params.get('token_hash') || '', target = safeClientReturn(params.get('next'));
        window.history.replaceState(null, '', window.location.pathname);
        setNext(target);
        if (!/^[A-Za-z0-9_-]{20,256}$/.test(token)) {
            setError('Tento prihlasovací odkaz nie je úplný. Vyžiadaj si nový email.');
            return;
        }
        void fetch('/api/auth/email-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokenHash: token }) }).then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Tento odkaz už vypršal alebo bol použitý. Vyžiadaj si nový prihlasovací email.');
                return;
            }
            window.location.replace(portalPath(target,language));
        }).catch(() => setError('Prihlásenie sa nepodarilo dokončiť. Skontroluj internet a vyžiadaj si nový email.'));
    }, []);
    return <PortalElement as="main" className="client-site auth-callback"><PortalElement as="section" className="client-card"><BrandLogo className="client-brand" href="/"/>{error ? <><PortalElement as="h1">Prihlásme ťa znova.</PortalElement><PortalElement as="p" className="client-error" role="alert">{error}</PortalElement><Link className="client-button" href={'/prihlasenie?metoda=odkaz&next=' + encodeURIComponent(next)}>Poslať nový prihlasovací odkaz ↗</Link></> : <PortalElement as="div" role="status" aria-live="polite"><PortalElement as="h1">Prihlasujem ťa.</PortalElement><PortalElement as="p">Otváram tvoj účet. Ešte chvíľku…</PortalElement></PortalElement>}</PortalElement></PortalElement>;
}

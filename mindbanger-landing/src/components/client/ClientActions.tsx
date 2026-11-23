'use client';
import PortalElement from '@/components/client/PortalElement';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
export default function ClientActions({ locale = 'sk' }: {
    locale?: 'sk' | 'cs' | 'en';
}) {
    const cs = locale === 'cs';
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function logout() {
        setBusy(true);
        setError('');
        const { error } = await supabase.auth.signOut();
        if (error) {
            setError(cs ? 'Odhlášení se nezdařilo. Zkuste to znovu.' : 'Odhlásenie sa nepodarilo. Skúste to znova.');
            setBusy(false);
            return;
        }
        window.location.assign(locale==='en'?'/en/prihlasenie':cs?'/cz/prihlasenie':'/prihlasenie');
    }
    return <PortalElement as="div" className="client-logout"><PortalElement as="button" type="button" onClick={logout} disabled={busy}>{busy ? (cs ? 'Odhlašuji…' : 'Odhlasujem…') : (cs ? 'Odhlásit se' : 'Odhlásiť sa')}</PortalElement>{error && <PortalElement as="p" role="alert">{error}</PortalElement>}</PortalElement>;
}

'use client';
import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import './client-auth.css';
export default function ClientPasswordForm() {
    const [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false), [reauth, setReauth] = useState(false);
    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy)
            return;
        setError('');
        setSaved(false);
        setReauth(false);
        if (password.length < 12) {
            setError('Použi heslo s aspoň 12 znakmi.');
            return;
        }
        if (password !== confirm) {
            setError('Heslá sa nezhodujú. Skontroluj ich.');
            return;
        }
        setBusy(true);
        try {
            const { data: { user }, error: identityError } = await supabase.auth.getUser();
            if (identityError || !user) {
                setReauth(true);
                setError('Najprv sa znova prihlás emailovým odkazom. Potom si tu nastav heslo.');
                return;
            }
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                if (error.code === 'reauthentication_needed' || error.status === 401) {
                    setReauth(true);
                    setError('Pre bezpečné nastavenie hesla sa znova prihlás emailovým odkazom.');
                }
                else if (error.code === 'same_password')
                    setError('Toto heslo už používaš. Vyber si iné.');
                else if (error.code === 'weak_password')
                    setError('Vyber si silnejšie heslo s aspoň 12 znakmi.');
                else
                    setError('Heslo sa nepodarilo uložiť. Skús to neskôr.');
                return;
            }
            setPassword('');
            setConfirm('');
            setSaved(true);
        }
        catch {
            setError('Spojenie sa nepodarilo. Skús to znova.');
        }
        finally {
            setBusy(false);
        }
    }
    return <PortalElement as="section" className="client-card client-password-card" aria-labelledby="password-heading"><PortalElement as="h2" id="password-heading">Prihlasovanie heslom</PortalElement><PortalElement as="p">Heslo je voliteľné. Môžeš sa ďalej prihlasovať aj tlačidlom v emaile. Pre nastavenie či zmenu hesla ho zadaj dvakrát.</PortalElement><PortalElement as="form" className="client-form" aria-busy={busy} onSubmit={save}><PortalElement as="label" htmlFor="account-password">Nové heslo<PortalElement as="input" id="account-password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} value={password} onChange={e => { setPassword(e.target.value); setSaved(false); }}/><PortalElement as="small">Aspoň 12 znakov. Najlepšie dlhá fráza, ktorú nepoužívaš inde.</PortalElement></PortalElement><PortalElement as="label" htmlFor="account-password-confirm">Zopakuj nové heslo<PortalElement as="input" id="account-password-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} value={confirm} onChange={e => setConfirm(e.target.value)}/></PortalElement><PortalElement as="label" className="client-check"><PortalElement as="input" type="checkbox" checked={show} onChange={e => setShow(e.target.checked)}/><PortalElement as="span">Zobraziť heslá</PortalElement></PortalElement>{error && <PortalElement as="p" className="client-error" role="alert">{error}</PortalElement>}{reauth && <Link className="client-text-link" href="/prihlasenie?metoda=odkaz&znova=1&next=%2Fucet%2Fprofil">Prihlásiť sa emailovým odkazom ↗</Link>}{saved && <PortalElement as="p" className="client-success" role="status">Heslo je uložené. Nabudúce sa môžeš prihlásiť emailom a heslom.</PortalElement>}<PortalElement as="button" className="client-button" disabled={busy}>{busy ? 'Ukladám heslo…' : 'Uložiť heslo'} ↗</PortalElement></PortalElement></PortalElement>;
}

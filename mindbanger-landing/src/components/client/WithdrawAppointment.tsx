'use client';
import PortalElement from '@/components/client/PortalElement';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function WithdrawAppointment({ id, name, email, service, date }: {
    id: string;
    name: string;
    email: string;
    service: string;
    date: string;
}) {
    const router = useRouter();
    const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function send() { setBusy(true); setError(''); try {
        const r = await fetch('/api/client/appointments/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        const data = await r.json();
        if (!r.ok)
            throw new Error(data.error);
        setConfirm(false);
        router.refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Oznámenie sa nepodarilo odoslať.');
    }
    finally {
        setBusy(false);
    } }
    return <PortalElement as="div">{confirm ? <><PortalElement as="p">Oznamujem odstúpenie od zmluvy: {service}, {date}. Číslo rezervácie: {id}. Meno: {name}. Potvrdenie doručiť na {email}.</PortalElement><PortalElement as="p">Budúci termín sa zruší. O prijatí dostaneš email; prípadnú refundáciu poskytovateľ vysporiada podľa podmienok a zákonných práv.</PortalElement><PortalElement as="button" className="client-button" disabled={busy} onClick={send}>{busy ? 'Odosielam…' : 'Potvrdiť odstúpenie od zmluvy'}</PortalElement><PortalElement as="button" className="client-text-link" disabled={busy} onClick={() => setConfirm(false)}>Späť</PortalElement></> : <PortalElement as="button" className="client-text-link" onClick={() => setConfirm(true)}>Odstúpiť od zmluvy</PortalElement>}{error && <PortalElement as="p" role="alert" className="client-error">{error}</PortalElement>}</PortalElement>;
}

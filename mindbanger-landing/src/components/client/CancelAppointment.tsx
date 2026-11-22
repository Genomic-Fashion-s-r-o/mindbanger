'use client';
import PortalElement from '@/components/client/PortalElement';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifyCalendarAvailability } from '@/lib/booking/calendar-refresh';
export default function CancelAppointment({ id }: {
    id: string;
}) {
    const router = useRouter();
    const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function cancel() { setBusy(true); setError(''); try {
        const response = await fetch('/api/client/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'cancel' }) });
        const result = await response.json();
        if (!response.ok)
            throw new Error(result.error);
        notifyCalendarAvailability();
        setConfirm(false);
        router.refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Zrušenie sa nepodarilo.');
    }
    finally {
        setBusy(false);
    } }
    return <PortalElement as="div" className="client-cancel">{confirm ? <><PortalElement as="p">Zrušiť tento termín? Nevznikne automatický storno poplatok. Už uhradenú platbu vysporiada poskytovateľ podľa podmienok tejto rezervácie.</PortalElement><PortalElement as="div" className="client-cancel-actions"><PortalElement as="button" className="client-button" disabled={busy} onClick={cancel}>{busy ? 'Ruším…' : 'Áno, zrušiť termín'}</PortalElement><PortalElement as="button" className="client-text-link" disabled={busy} onClick={() => setConfirm(false)}>Ponechať termín</PortalElement></PortalElement></> : <PortalElement as="button" className="client-text-link" onClick={() => setConfirm(true)}>Zrušiť rezerváciu</PortalElement>}{error && <PortalElement as="p" className="client-error" role="alert">{error}</PortalElement>}</PortalElement>;
}

'use client';
import PortalElement from '@/components/client/PortalElement';
import { useState } from 'react';
type Document = {
    id: string;
    number: string;
    kind: string;
    ready: boolean;
};
export default function CoachingDocuments({ id }: {
    id: string;
}) {
    const [documents, setDocuments] = useState<Document[] | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
    async function load() { setLoading(true); setError(''); try {
        const r = await fetch(`/api/client/appointments/documents?id=${id}`, { cache: 'no-store' });
        const data = await r.json();
        if (!r.ok)
            throw Error(data.error);
        setDocuments(data.documents);
    }
    catch {
        setError('Doklady sa nepodarilo načítať.');
    }
    finally {
        setLoading(false);
    } }
    return <PortalElement as="details" onToggle={e => { if (e.currentTarget.open && documents === null && !loading)
        void load(); }}><PortalElement as="summary">Doklady za Coaching</PortalElement>{loading ? <PortalElement as="p" role="status">Načítavam doklady…</PortalElement> : error ? <PortalElement as="p" role="alert">{error} <PortalElement as="button" type="button" onClick={() => void load()}>Skúsiť znova</PortalElement></PortalElement> : documents?.length ? <PortalElement as="ul">{documents.map(d => <PortalElement as="li" key={d.id}>{d.ready ? <PortalElement as="a" href={`/api/client/appointments/documents?id=${id}&document=${d.id}`}>{d.kind === 'credit' ? 'Opravný doklad' : 'Faktúra'} {d.number} · PDF ↓</PortalElement> : <PortalElement as="span">Doklad {d.number} sa pripravuje.</PortalElement>}</PortalElement>)}</PortalElement> : <PortalElement as="p">Doklad vystavíme automaticky po úspešnom strhnutí platby a pošleme aj emailom.</PortalElement>}</PortalElement>;
}

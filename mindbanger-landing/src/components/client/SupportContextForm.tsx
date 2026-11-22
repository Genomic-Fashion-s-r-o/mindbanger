'use client';
import PortalElement from '@/components/client/PortalElement';
import { useEffect, useState } from 'react';
import Link from '@/components/client/PortalLink';
import { SUPPORT_CONTEXT_CONSENT, SUPPORT_CONTEXT_MAX } from '@/lib/booking/support-context-policy';
import './support-context.css';
export default function SupportContextForm({ id }: {
    id: string;
}) {
    const [text, setText] = useState(''), [consent, setConsent] = useState(false), [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [closed, setClosed] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
    useEffect(() => { let active = true; const controller = new AbortController(); fetch('/api/client/appointments/support-context?id=' + encodeURIComponent(id), { cache: 'no-store', signal: controller.signal }).then(async (r) => { const b = await r.json(); if (!r.ok)
        throw Error(b.error); if (active) {
        setText(b.context?.text || '');
        setSaved(!!b.context);
        setClosed(!!b.closed);
    } }).catch(e => { if (active)
        setError(e instanceof Error ? e.message : 'Opis nie je dostupný.'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; controller.abort(); }; }, [id]);
    async function save(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); setMessage(''); try {
        const r = await fetch('/api/client/appointments/support-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, text, consent, consentVersion: SUPPORT_CONTEXT_CONSENT }) });
        const b = await r.json();
        if (!r.ok)
            throw Error(b.error);
        setSaved(true);
        setConsent(false);
        setMessage('Dôverný opis je bezpečne uložený.');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Opis sa nepodarilo uložiť.');
    }
    finally {
        setBusy(false);
    } }
    async function remove() { setBusy(true); setError(''); setMessage(''); try {
        const r = await fetch('/api/client/appointments/support-context?id=' + encodeURIComponent(id), { method: 'DELETE' });
        const b = await r.json();
        if (!r.ok)
            throw Error(b.error);
        setText('');
        setSaved(false);
        setConsent(false);
        setMessage('Opis je vymazaný a súhlas s jeho ďalším spracúvaním je odvolaný.');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Opis sa nepodarilo vymazať.');
    }
    finally {
        setBusy(false);
    } }
    return <PortalElement as="details" className="support-context"><PortalElement as="summary">Nepovinný dôverný opis pre kouča</PortalElement><PortalElement as="p">Ak chceš, vlastnými slovami stručne opíš svoju zdravotnú situáciu a to, s čím potrebuješ oporu. Nemusíš uvádzať diagnózu. Nenahrávaj zdravotné správy, rodné číslo ani informácie o ďalších osobách.</PortalElement><PortalElement as="p">Opis je oddelený od rezervácie a uložený šifrovane. Dostupný je tebe a Miroslavovi Jobusovi cez overený administrátorský prístup. Neposiela sa do Stripe, kalendára ani emailov. Vymaže sa najneskôr 30 dní po stretnutí, najviac 90 dní od uloženia; vymazať ho môžeš aj hneď.</PortalElement>{loading ? <PortalElement as="p" role="status">Načítavam dôverný opis…</PortalElement> : closed ? <PortalElement as="p">Tento termín už neumožňuje doplniť dôverný opis.</PortalElement> : <PortalElement as="form" onSubmit={save} autoComplete="off"><PortalElement as="label" htmlFor={'support-context-' + id}>Čo potrebuješ, aby som pred rozhovorom vedel? (nepovinné)<PortalElement as="textarea" id={'support-context-' + id} value={text} maxLength={SUPPORT_CONTEXT_MAX} rows={5} disabled={busy} onChange={e => { setText(e.target.value); setConsent(false); setMessage(''); }} autoComplete="off" spellCheck={false}/></PortalElement><PortalElement as="p">{text.length} / {SUPPORT_CONTEXT_MAX} znakov</PortalElement><PortalElement as="label" className="client-check"><PortalElement as="input" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required disabled={busy}/><PortalElement as="span">Výslovne súhlasím, aby Milkam s. r. o. spracúvala mnou dobrovoľne uvedené údaje o zdraví na prípravu a poskytnutie koučingu Opora počas liečby. Viem, že opis nemusím vyplniť a jeho vymazaním môžem súhlas odvolať bez vplyvu na rezerváciu. <Link href="/ochrana-udajov#opora-pocas-liecby" target="_blank" rel="noopener noreferrer">Podrobnosti ochrany údajov ↗</Link></PortalElement></PortalElement><PortalElement as="div" className="support-context-actions"><PortalElement as="button" className="client-button" disabled={busy || !consent || !text.trim()}>{busy ? 'Ukladám…' : saved ? 'Uložiť upravený opis' : 'Bezpečne uložiť opis'}</PortalElement>{saved && <PortalElement as="button" type="button" onClick={remove} disabled={busy}>Vymazať opis a odvolať súhlas</PortalElement>}</PortalElement></PortalElement>}{message && <PortalElement as="p" role="status">{message}</PortalElement>}{error && <PortalElement as="p" role="alert">{error}</PortalElement>}</PortalElement>;
}

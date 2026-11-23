'use client';
import PortalElement from '@/components/client/PortalElement';
import { useEffect, useRef, useState } from 'react';
import Link from '@/components/client/PortalLink';
import { timeWindows } from '@/lib/time-request-model';
import { localizedPath, type SiteLocale } from '@/lib/site-locale';
import './time-requests.css';
type Props = {
    locale: SiteLocale;
    name?: string;
    email?: string;
    serviceId?: string;
    services: {
        id: string;
        name: string;
    }[];
};
export default function TimeRequestForm({ locale, name = '', email = '', serviceId = '', services }: Props) {
    const cs = locale === 'cs', c = (sk: string, cz: string) => cs ? cz : sk;
    const [state, setState] = useState<'idle' | 'saving' | 'success'>('idle'), [error, setError] = useState(''), [note, setNote] = useState('');
    const requestId = useRef('');
    const successRef = useRef<HTMLElement>(null);
    useEffect(() => { if (state === 'success') {
        successRef.current?.scrollIntoView({ block: 'start' });
        successRef.current?.focus({ preventScroll: true });
    } }, [state]);
    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (state === 'saving')
            return;
        const form = new FormData(e.currentTarget), windows = form.getAll('windows');
        if (!windows.length) {
            setError(c('Označ aspoň jedno časové pásmo.', 'Označ alespoň jedno časové pásmo.'));
            return;
        }
        requestId.current ||= crypto.randomUUID();
        setState('saving');
        setError('');
        try {
            const r = await fetch('/api/availability-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                    requestId: requestId.current, firstName: form.get('firstName'), lastName: form.get('lastName'), email: form.get('email'), phone: form.get('phone'),
                    windows, note, serviceId: form.get('serviceId'), locale, website: form.get('website') || '',
                }) });
            if (!r.ok) {
                const b = await r.json();
                throw Error(cs ? c('', 'Požadavek se nepodařilo uložit. Zkontroluj údaje nebo to zkus za chvíli.') : b.error);
            }
            setState('success');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : c('Odoslanie sa nepodarilo. Skús to znova.', 'Odeslání se nepodařilo. Zkus to znovu.'));
            setState('idle');
        }
    }
    if (state === 'success')
        return <PortalElement as="section" ref={successRef} tabIndex={-1} className="time-request-success" role="status"><PortalElement as="h2">{c('Ďakujem, požiadavku som prijal.', 'Děkuji, požadavek jsem přijal.')}</PortalElement><PortalElement as="p">{c('Ozvem sa ti osobne na uvedený email alebo telefón a spoločne skúsime nájsť vhodný termín.', 'Ozvu se ti osobně na uvedený e-mail nebo telefon a společně zkusíme najít vhodný termín.')}</PortalElement><PortalElement as="p">{c('Zatiaľ nejde o potvrdenú rezerváciu a nič neplatíš. Termín si najprv dohodneme.', 'Zatím nejde o potvrzenou rezervaci a nic neplatíš. Termín si nejprve domluvíme.')}</PortalElement><Link href={localizedPath('/rezervacia', locale)}>{c('Späť do kalendára', 'Zpět do kalendáře')} ↗</Link></PortalElement>;
    return <PortalElement as="form" className="time-request-form" onSubmit={submit}>
    <PortalElement as="fieldset" disabled={state === 'saving'}><PortalElement as="legend">{c('Ako ťa môžem kontaktovať', 'Jak tě mohu kontaktovat')}</PortalElement>
      <PortalElement as="div" className="time-request-fields"><PortalElement as="label">{c('Meno', 'Jméno')}<PortalElement as="input" name="firstName" autoComplete="given-name" required maxLength={80} defaultValue={name.trim().split(/\s+/)[0] || ''}/></PortalElement><PortalElement as="label">{c('Priezvisko', 'Příjmení')}<PortalElement as="input" name="lastName" autoComplete="family-name" required maxLength={80} defaultValue={name.trim().split(/\s+/).slice(1).join(' ')}/></PortalElement><PortalElement as="label">Email<PortalElement as="input" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={email}/></PortalElement><PortalElement as="label">{c('Telefón', 'Telefon')}<PortalElement as="input" name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={40} placeholder="+421…"/></PortalElement></PortalElement>
      <PortalElement as="label">{c('Služba, o ktorú máš záujem', 'Služba, o kterou máš zájem')}<PortalElement as="select" name="serviceId" defaultValue={services.some(s => s.id === serviceId) ? serviceId : ''}><PortalElement as="option" value="">{c('Zatiaľ nemám vybrané', 'Zatím nemám vybráno')}</PortalElement>{services.map(s => <PortalElement as="option" value={s.id} key={s.id}>{s.name}</PortalElement>)}</PortalElement></PortalElement>
    </PortalElement>
    <PortalElement as="fieldset" disabled={state === 'saving'}><PortalElement as="legend">{c('Kedy by ti stretnutie vyhovovalo?', 'Kdy by ti setkání vyhovovalo?')}</PortalElement><PortalElement as="p" id="time-window-hint">{c('Označ jednu alebo viac možností — pokojne aj všetky tri. Časy platia pre Bratislavu.', 'Označ jednu nebo více možností — klidně i všechny tři. Časy platí pro Bratislavu.')}</PortalElement><PortalElement as="div" className="time-request-windows">{timeWindows.map(w => <PortalElement as="label" key={w.id}><PortalElement as="input" name="windows" type="checkbox" value={w.id} onChange={() => setError('')} aria-describedby="time-window-hint"/><PortalElement as="span"><PortalElement as="strong">{cs ? w.cs : w.sk}</PortalElement><PortalElement as="span">{w.hours}</PortalElement></PortalElement></PortalElement>)}</PortalElement><PortalElement as="p" className="time-request-help">{c('Pásma označujú možné začiatky stretnutia. Podvečer začíname najneskôr o 19:00, aby hodinové stretnutie skončilo do 20:00.', 'Pásma označují možné začátky setkání. Podvečer začínáme nejpozději v 19:00, aby hodinové setkání skončilo do 20:00.')}</PortalElement></PortalElement>
    <PortalElement as="label">{c('Upresni svoje časové možnosti (nepovinné)', 'Upřesni své časové možnosti (nepovinné)')}<PortalElement as="textarea" name="note" rows={5} value={note} onChange={e => setNote(e.target.value)} maxLength={1500} disabled={state === 'saving'} placeholder={c('Napr. utorok alebo štvrtok po 17:00, ideálne budúci týždeň…', 'Např. úterý nebo čtvrtek po 17:00, ideálně příští týden…')} aria-describedby="time-request-note-hint"/></PortalElement><PortalElement as="p" className="time-request-help" id="time-request-note-hint">{c('Neuvádzaj zdravotné ani iné citlivé údaje. Stačia dni, obdobie a časové obmedzenia.', 'Neuváděj zdravotní ani jiné citlivé údaje. Stačí dny, období a časová omezení.')} {note.length}/1500</PortalElement>
    <PortalElement as="div" className="time-request-honeypot" aria-hidden="true"><PortalElement as="label">Web<PortalElement as="input" name="website" tabIndex={-1} autoComplete="off"/></PortalElement></PortalElement>
    <PortalElement as="p" className="time-request-help">{c('Údaje použije Milkam s. r. o. iba na vybavenie tvojej požiadavky a osobné dohodnutie termínu, najdlhšie 90 dní. Nejde o prihlásenie na marketing.', 'Údaje použije Milkam s. r. o. pouze k vyřízení tvého požadavku a osobní domluvě termínu, nejdéle 90 dní. Nejde o přihlášení k marketingu.')} <Link href={localizedPath('/ochrana-udajov', locale)}>{c('Ochrana údajov', 'Ochrana údajů')}</Link>.</PortalElement>
    {error && <PortalElement as="p" className="time-request-error" role="alert">{error}</PortalElement>}
    <PortalElement as="button" disabled={state === 'saving'}>{state === 'saving' ? c('Odosielam…', 'Odesílám…') : c('Odoslať požiadavku na termín', 'Odeslat požadavek na termín')} ↗</PortalElement>
    <PortalElement as="p" className="time-request-help">{c('Nezáväzne · bez platby · termín dohodneme osobne', 'Nezávazně · bez platby · termín domluvíme osobně')}</PortalElement>
  </PortalElement>;
}

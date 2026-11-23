'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { useEffect, useRef, useState } from 'react';
import Link from '@/components/client/PortalLink';
import { durationLabel } from '@/lib/booking/catalog';
import { BookingSettings, LEGAL_VERSION, TIME_ZONE, localDate, money, dateLabel } from '@/lib/booking/model';
export default function BookingForm({ settings, initialService, admin = false, onCreated }: {
    settings: BookingSettings;
    initialService?: string;
    admin?: boolean;
    onCreated?: () => void;
}) {
    const portalLanguage = usePortalLocale();
    const services = settings.services.filter(s => s.active);
    const [service, setService] = useState(services.find(s => s.id === initialService)?.id || services[0]?.id || '');
    const [day, setDay] = useState(localDate(new Date(Date.now() + settings.leadHours * 3600000)));
    const [slots, setSlots] = useState<string[]>([]), [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(false), [sending, setSending] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
    const [refresh, setRefresh] = useState(0);
    const requestId = useRef('');
    const chosen = services.find(s => s.id === service);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setSlots([]);
        setSelected('');
        setError('');
        requestId.current = '';
        fetch(`/api/appointments?service=${encodeURIComponent(service)}&day=${day}`, { signal: controller.signal, cache: 'no-store' }).then(async (r) => {
            const result = await r.json();
            if (!r.ok)
                throw new Error(result.error);
            setSlots(result.slots);
        }).catch(e => {
            if (e.name !== 'AbortError')
                setError(e.message || 'Kalendár sa nepodarilo načítať.');
        }).finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [service, day, refresh]);
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (sending || !selected)
            return;
        const form = new FormData(event.currentTarget);
        setSending(true);
        setError('');
        requestId.current ||= crypto.randomUUID();
        const booking = { serviceId: service, startsAt: selected, name: form.get('name'), email: form.get('email'), phone: form.get('phone') || '', adult: form.get('adult') === 'on', accepted: form.get('accepted') === 'on', website: form.get('website') || '', requestId: requestId.current, legalVersion: LEGAL_VERSION };
        try {
            const response = await fetch(admin ? '/api/admin/appointments' : '/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(admin ? { action: 'create', booking } : booking) });
            const result = await response.json();
            if (!response.ok) {
                if (response.status === 409)
                    setRefresh(x => x + 1);
                throw new Error(result.error);
            }
            setSuccess(result.message || 'Žiadosť je uložená. Termín môžete potvrdiť v prehľade rezervácií.');
            onCreated?.();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Žiadosť sa nepodarilo odoslať.');
        }
        finally {
            setSending(false);
        }
    }
    if (success)
        return <PortalElement as="div" className="personal-form"><PortalElement as="div" className="personal-success" role="status"><PortalElement as="h2">Ďakujem za vašu dôveru.</PortalElement><PortalElement as="p">{success}</PortalElement><PortalElement as="p">Ak email nenájdete, skontrolujte spam. Pri nedoručení kontaktujte prevádzkovateľa; neposielajte tú istú žiadosť znova.</PortalElement></PortalElement><Link href={admin ? '/mindbanger_daily/admin/rezervacie' : '/'} className="personal-text-link">{admin ? 'Späť do kalendára' : 'Späť na úvod'}</Link></PortalElement>;
    return <PortalElement as="div" className="personal-form-columns"><PortalElement as="form" className="personal-form" onSubmit={submit}>
    <PortalElement as="label">Služba<PortalElement as="select" value={service} onChange={e => setService(e.target.value)} disabled={sending}>{services.map(s => <PortalElement as="option" key={s.id} value={s.id}>{s.name} · {durationLabel(s.minutes)} · {money(s.price, undefined, portalLanguage)}</PortalElement>)}</PortalElement></PortalElement>
    <PortalElement as="label">Dátum<PortalElement as="input" type="date" value={day} onChange={e => setDay(e.target.value)} min={localDate(new Date())} max={localDate(new Date(Date.now() + settings.horizonDays * 86400000))} required disabled={sending}/></PortalElement>
    <PortalElement as="fieldset" disabled={sending}><PortalElement as="legend">Dostupné začiatky · čas v Bratislave</PortalElement>{loading ? <PortalElement as="p" role="status">Načítavam dostupnosť…</PortalElement> : <PortalElement as="div" className="personal-slots">{slots.map(s => <PortalElement as="button" key={s} type="button" className="personal-slot" aria-pressed={selected === s} onClick={() => { setSelected(s); requestId.current = ''; }}>{new Intl.DateTimeFormat(localeTag(portalLanguage), { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(s))}</PortalElement>)}</PortalElement>}{!loading && !error && !slots.length && <PortalElement as="p">V tento deň nie je voľný termín. Vyberte iný dátum.</PortalElement>}</PortalElement>
    <PortalElement as="label">Meno a priezvisko<PortalElement as="input" name="name" autoComplete="name" required minLength={2} maxLength={100} disabled={sending}/></PortalElement>
    <PortalElement as="label">Email<PortalElement as="input" name="email" type="email" autoComplete="email" required maxLength={254} disabled={sending}/></PortalElement>
    <PortalElement as="label">Telefón <PortalElement as="span">(nepovinný)</PortalElement><PortalElement as="input" name="phone" type="tel" autoComplete="tel" maxLength={40} disabled={sending}/></PortalElement>
    <PortalElement as="div" className="personal-honeypot" aria-hidden="true"><PortalElement as="label">Web<PortalElement as="input" name="website" tabIndex={-1} autoComplete="off"/></PortalElement></PortalElement>
    <PortalElement as="label" className="personal-checkbox"><PortalElement as="input" type="checkbox" name="adult" required disabled={sending}/><PortalElement as="span">{admin ? 'Klient potvrdil plnoletosť.' : 'Mám aspoň 18 rokov a žiadam o termín pre seba.'}</PortalElement></PortalElement>
    <PortalElement as="label" className="personal-checkbox"><PortalElement as="input" type="checkbox" name="accepted" required disabled={sending}/><PortalElement as="span">{admin ? 'Klient bol oboznámený s podmienkami a nezdravotníckym rozsahom služby.' : <>Rozumiem nezdravotníckemu charakteru služby a súhlasím s <Link href="/podmienky" target="_blank">podmienkami rezervácie</Link>. Bol/a som oboznámený/á s <Link href="/ochrana-udajov" target="_blank">ochranou osobných údajov</Link>.</>}</PortalElement></PortalElement>
    {error && <PortalElement as="div" className="personal-error" role="alert">{error}<PortalElement as="button" className="personal-text-link" type="button" onClick={() => setRefresh(x => x + 1)} style={{ marginLeft: 12 }}>Obnoviť kalendár</PortalElement></PortalElement>}
    <PortalElement as="button" className="personal-button" disabled={sending || loading || !selected} type="submit">{sending ? 'Ukladám žiadosť…' : admin ? 'Pridať žiadosť klienta' : 'Odoslať bezplatnú žiadosť'} <PortalElement as="span" aria-hidden="true">↗</PortalElement></PortalElement><PortalElement as="p" style={{ fontSize: 12 }}>Odoslaním nevzniká povinnosť platiť. Termín platí až po osobnom potvrdení. Spôsob online stretnutia a podmienky služby dohodneme pred jej začiatkom.</PortalElement>
  </PortalElement><PortalElement as="aside" className="personal-booking-aside"><PortalElement as="p" className="personal-eyebrow">VAŠE STRETNUTIE</PortalElement><PortalElement as="h2">{chosen?.name}</PortalElement><PortalElement as="p">{chosen?.description}</PortalElement><PortalElement as="p">{chosen?.minutes} min · {chosen && money(chosen.price, undefined, portalLanguage)}</PortalElement>{selected && <PortalElement as="p"><PortalElement as="strong">{dateLabel(selected, portalLanguage)}</PortalElement></PortalElement>}<PortalElement as="p">{settings.address}</PortalElement><PortalElement as="hr"/><PortalElement as="p" style={{ marginTop: 20 }}>Medzi sedeniami nechávam priestor na prípravu na ďalšie online stretnutie. Prosím, do rezervácie neposielajte zdravotné ani citlivé údaje.</PortalElement><PortalElement as="p">Otázky? <PortalElement as="a" href={`mailto:${settings.email}`}>{settings.email}</PortalElement></PortalElement></PortalElement></PortalElement>;
}

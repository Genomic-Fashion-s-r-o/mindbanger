'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { canUseCredit, creditMinutes, creditTime, packageFits } from '@/lib/booking/package-credit';
import { notifyCalendarAvailability } from '@/lib/booking/calendar-refresh';
import { trackAnalytics } from '@/lib/analytics-client';
import { serviceAnalyticsCodes } from '@/lib/analytics-schema';
import TimeRequestCallout from '@/components/booking/TimeRequestCallout';
import { currentBookingAttributionConsent } from '@/lib/marketing';
import Link from '@/components/client/PortalLink';
import { useEffect, useRef, useState } from 'react';
import { BookingSettings, LEGAL_VERSION, TIME_ZONE, dateLabel, money, type Appointment } from '@/lib/booking/model';
import { COACHING, COACHING_TOPICS, isCoachingTopic, topicLabel, withBookingTopic } from '@/lib/booking/offer';
import { localizedPath } from '@/lib/site-locale';
import { serviceUrl, slotDuration, durationLabel, sessionTimingNotice } from '@/lib/booking/catalog';
import type { OwnedPackage } from './PackageBalance';
import WeeklyBookingSlots from './WeeklyBookingSlots';
import PayAppointment from './PayAppointment';
import BookingHold from './BookingHold';
import { bookingServiceCopy } from '@/lib/booking/service-copy';
type Props = {
    settings: BookingSettings;
    name?: string;
    email?: string;
    initialService?: string;
    initialTopic?: string;
    initialStart?: string;
    initialPackage?: string;
    initialCredit?: string;
    initialDuration?: number;
    authenticated?: boolean;
};
type Created = {
    hold_until: string | null;
    status: string;
    paid: boolean;
    payment_state?: string;
    id: string;
    funding_type?: string;
    payment_flow: Appointment['payment_flow'];
    payment_terms: NonNullable<Appointment['payment_terms']>;
    starts_at: string;
    price: number;
};
export default function ClientBookingCalendar({ settings, name = '', email = '', initialService = '', initialTopic = '', initialStart = '', initialPackage = '', initialCredit = '', initialDuration = 0, authenticated = true }: Props) {
    const portalLanguage = usePortalLocale();
    const cs = settings.locale === 'cs', c = (sk: string, cz: string) => cs ? cz : sk, fmt = (value: number) => money(value, settings.currency, portalLanguage), formatDate = (value: string) => dateLabel(value, portalLanguage);
    const services = settings.services.filter(s => s.active), initialOffer = settings.packages.find(p => p.id === initialPackage && p.active);
    const [serviceId, setService] = useState(services.find(s => s.id === initialService && (!initialOffer || packageFits(initialOffer, s)))?.id || initialOffer?.serviceId || COACHING.id), [packageId, setPackage] = useState(initialOffer?.id || ''), [creditId, setCredit] = useState(initialCredit);
    const [owned, setOwned] = useState<OwnedPackage[]>([]), [minor, setMinor] = useState(false), [child, setChild] = useState(''), [age, setAge] = useState(0);
    const [selected, setSelected] = useState(() => { const time = Date.parse(initialStart); return Number.isFinite(time) && time > Date.now() && time < Date.now() + (settings.horizonDays + 1) * 86400000 ? new Date(time).toISOString() : ''; }), [note, setNote] = useState(''), [sending, setSending] = useState(false), [error, setError] = useState(''), [review, setReview] = useState(false), [created, setCreated] = useState<Created | null>(null), [refresh, setRefresh] = useState(0);
    const [clock] = useState(() => Date.now()), requestId = useRef(''), detailsRef = useRef<HTMLElement>(null), errorRef = useRef<HTMLParagraphElement>(null);
    const baseService = services.find(s => s.id === serviceId);
    const rawOffer = settings.packages.find(p => p.id === packageId && p.active), rawCredit = owned.find(p => p.id === creditId);
    const [chosenDuration, setDuration] = useState(initialDuration);
    const bankMinutes = rawOffer?.creditMinutes ?? rawCredit?.remaining_minutes ?? 0;
    const flexible = !!baseService && bankMinutes >= 30 && !!(rawOffer?.creditMinutes || rawCredit?.total_minutes);
    const requestedDuration = chosenDuration >= 30 && chosenDuration % 30 === 0 ? chosenDuration : baseService ? creditMinutes(baseService) : 60;
    const selectedDuration = flexible ? Math.min(requestedDuration, bankMinutes) : baseService ? creditMinutes(baseService) : 60;
    const service = baseService ? { ...baseService, ...(flexible ? { minutes: selectedDuration === 30 ? 25 : selectedDuration - 10, slotMinutes: selectedDuration } : {}) } : undefined, offer = settings.packages.find(p => p.id === packageId && p.active && !!service && packageFits(p, service)), credit = owned.find(p => p.id === creditId && !!service && canUseCredit(p, service));
    const price = credit ? 0 : offer?.price || service?.price || 0;
    const [topic, setTopic] = useState(() => isCoachingTopic(initialTopic) ? initialTopic : 'zatial-neviem');
    useEffect(() => {
        if (!authenticated)
            return;
        const controller = new AbortController();
        fetch('/api/client/packages', { cache: 'no-store', signal: controller.signal }).then(async (r) => {
            const d = await r.json();
            if (!r.ok)
                throw Error(d.error);
            setOwned(d.packages);
            const p = (d.packages as OwnedPackage[]).find(p => p.id === initialCredit);
            if (p) {
                if (p.total_minutes == null || p.snapshot.participantAge)
                    setService(p.service_id);
                if (p.snapshot.participantAge) {
                    setDuration(60);
                    setMinor(true);
                    setChild(p.snapshot.participantName || '');
                    setAge(p.snapshot.participantAge);
                }
            }
        }).catch(() => {
            if (!controller.signal.aborted && initialCredit)
                setError(c('Balíček sa nepodarilo overiť. Obnov stránku.', 'Balíček se nepodařilo ověřit. Obnov stránku.'));
        });
        return () => controller.abort();
    }, [authenticated, initialCredit, cs]);
    function reset() { setSelected(''); setReview(false); setError(''); requestId.current = ''; }
    function changeService(id: string) {
        trackAnalytics('booking_service_select', { service_code: serviceAnalyticsCodes[id] });
        setService(id);
        const next = services.find(s => s.id === id)!;
        if (!offer || !packageFits(offer, next))
            setPackage('');
        const keep = credit?.total_minutes != null && canUseCredit(credit, next) && !credit.snapshot.participantAge;
        if (!keep) {
            setCredit('');
            setMinor(false);
            setChild('');
        }
        reset();
    }
    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (sending || !selected || !service)
            return;
        if (credit?.total_minutes != null && credit.expires_at && Date.parse(selected) + selectedDuration * 60000 > Date.parse(credit.expires_at)) {
            setError(c('Vyber termín v platnosti svojho balíka.', 'Vyber termín v platnosti svého balíčku.'));
            return;
        }
        if (creditId && !credit) {
            setError(c('Balíček nie je dostupný alebo už nemá voľné sedenia.', 'Balíček není dostupný nebo už nemá volná setkání.'));
            return;
        }
        if (!review) {
            trackAnalytics('booking_review', { service_code: serviceAnalyticsCodes[serviceId] });
            setReview(true);
            return;
        }
        trackAnalytics('booking_submit', { service_code: serviceAnalyticsCodes[serviceId] });
        setSending(true);
        setError('');
        const form = new FormData(e.currentTarget);
        requestId.current ||= crypto.randomUUID();
        try {
            const r = await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(flexible ? { reservationMinutes: selectedDuration } : {}), attributionConsent: currentBookingAttributionConsent(), serviceId, startsAt: selected, topic, topicNote: note, phone: form.get('phone') || '', firstName: form.get('firstName') || '', lastName: form.get('lastName') || '', city: form.get('city') || '', country: form.get('country') || '', adult: form.get('adult') === 'on', accepted: form.get('accepted') === 'on', requestId: requestId.current, legalVersion: LEGAL_VERSION, packageId: offer?.id || '', entitlementId: credit?.id || '', participantName: minor ? child : '', participantAge: minor ? age : 0, guardianConsent: minor && form.get('guardian') === 'on' }) });
            const data = await r.json();
            if (!r.ok) {
                trackAnalytics('booking_error', { error_kind: r.status === 409 ? 'unavailable' : r.status < 500 ? 'validation' : 'server' });
                if (r.status === 409) {
                    reset();
                    setRefresh(v => v + 1);
                }
                throw Error(data.error);
            }
            notifyCalendarAvailability();
            setCreated(data.booking);
            if (data.booking?.id)
                trackAnalytics('booking_created', { service_code: serviceAnalyticsCodes[serviceId] }, data.booking.id);
        }
        catch (e) {
            if (e instanceof TypeError)
                trackAnalytics('booking_error', { error_kind: 'network' });
            setError(e instanceof Error ? e.message : c('Rezervácia sa nepodarila.', 'Rezervace se nepodařila.'));
        }
        finally {
            setSending(false);
        }
    }
    useEffect(() => {
        if (created)
            detailsRef.current?.scrollIntoView({ block: 'start' });
    }, [created]);
    useEffect(() => {
        if (error) {
            errorRef.current?.focus({ preventScroll: true });
            errorRef.current?.scrollIntoView({ block: 'center' });
        }
    }, [error]);
    if (!service)
        return <><TimeRequestCallout locale={settings.locale}/><PortalElement as="p">{c('Vybraná služba momentálne nie je v ponuke.', 'Vybraná služba momentálně není v nabídce.')}</PortalElement></>;
    const balanceText = credit?.total_minutes != null ? creditTime(credit.remaining_minutes ?? 0) : String(credit?.remaining ?? 0);
    const offerText = offer?.creditMinutes ? creditTime(offer.creditMinutes) : offer ? offer.sessions + ' × ' + durationLabel(service.minutes) : durationLabel(service.minutes);
    const creditDescription = credit?.total_minutes != null ? c('Čerpanie: ', 'Čerpání: ') + creditTime(selectedDuration) + c('. Po tejto rezervácii zostane ', '. Po této rezervaci zbude ') + creditTime((credit.remaining_minutes ?? 0) - selectedDuration) + '.' : balanceText + ' ' + c('sedení', 'setkání');
    const description = cs ? undefined : bookingServiceCopy[serviceId];
    const reservedMinutes = slotDuration(service, settings.bufferMinutes);
    const durationUrl = serviceUrl(serviceId, packageId, selected, creditId) + (flexible ? '&dlzka=' + selectedDuration : '');
    const continueUrl = localizedPath(withBookingTopic(durationUrl.replace('/rezervacia?', '/ucet/rezervovat?'), topic), settings.locale);
    function goToDetails() { trackAnalytics('booking_start'); detailsRef.current?.scrollIntoView({ block: 'start' }); detailsRef.current?.querySelector<HTMLInputElement>('input:not([disabled])')?.focus({ preventScroll: true }); }
    const summary = <><PortalElement as="h2">{offer?.name || service.name}</PortalElement><PortalElement as="p" className="booking-selected-topic">{c('Téma rozhovoru:', 'Téma rozhovoru:')} <PortalElement as="strong">{topicLabel(topic, settings.locale)}</PortalElement></PortalElement><PortalElement as="p"><PortalElement as="strong">{offerText} · {credit ? c('zo zakúpeného balíčka', 'ze zakoupeného balíčku') : fmt(price)} · Online</PortalElement></PortalElement><PortalElement as="p">{sessionTimingNotice(service, settings.bufferMinutes, settings.locale)}</PortalElement>{offer && <PortalElement as="p">{offer.creditMinutes ? c('Časový kredit na postupné rezervácie. Platnosť 12 mesiacov od úhrady.', 'Časový kredit na postupné rezervace. Platnost 12 měsíců od zaplacení.') : <>{offer.sessions} {c('samostatných sedení po', 'samostatných setkání po')} {durationLabel(service.minutes)}.</>} {offer.extras && <>{c('V cene navyše', 'V ceně navíc')}: {offer.extras}.</>}</PortalElement>}{credit && <PortalElement as="p">{credit.snapshot.name} · {c('zostáva', 'zbývá')} {balanceText}. {creditDescription} {c('Za tento termín sa karta znovu neúčtuje.', 'Za tento termín se karta znovu neúčtuje.')}</PortalElement>}{minor && <PortalElement as="p">{c('Účastník', 'Účastník')}: {child || c('doplň meno', 'doplň jméno')} · {age ? `${age} ${c('rokov', 'let')}` : c('doplň vek', 'doplň věk')}. {c('Kontakt a platba: zákonný zástupca.', 'Kontakt a platba: zákonný zástupce.')}</PortalElement>}{selected ? <PortalElement as="p"><PortalElement as="strong">{formatDate(selected)}</PortalElement><PortalElement as="br"/>{TIME_ZONE}</PortalElement> : <PortalElement as="p">{c('Vyber si voľný termín v týždennom kalendári.', 'Vyber si volný termín v týdenním kalendáři.')}</PortalElement>}<PortalElement as="p">{credit ? c('Termín osobne potvrdí poskytovateľ.', 'Termín osobně potvrdí poskytovatel.') : settings.paymentMode === 'authorize_confirm' ? c(`Cez Stripe sa najprv zablokuje ${fmt(price)}. Suma sa strhne po potvrdení termínu.`, `Přes Stripe se nejprve zablokuje ${fmt(price)}. Částka se strhne po potvrzení termínu.`) : c('Platba cez Stripe sa sprístupní po potvrdení termínu.', 'Platba přes Stripe se zpřístupní po potvrzení termínu.')}</PortalElement></>;
    if (created)
        return <PortalElement as="section" ref={detailsRef} className="client-card booking-details-card" role="status"><PortalElement as="h2">{created.funding_type === 'package' ? c('Žiadosť zo zakúpeného balíčka je uložená', 'Žádost ze zakoupeného balíčku je uložena') : c('Dokonči rezerváciu kartou', 'Dokonči rezervaci kartou')}</PortalElement>{summary}<BookingHold status={created.status} holdUntil={created.hold_until} paid={created.paid} fundingType={created.funding_type} paymentState={created.payment_state} serviceId={serviceId} locale={settings.locale}>{created.funding_type !== 'package' && <PayAppointment id={created.id} price={Number(created.price)} earlyRequired={Date.parse(created.starts_at) < clock + 22 * 86400000} policy={created.payment_terms}/>}</BookingHold><PortalElement as="p"><Link className="client-button" href={"/ucet/rezervacie#rezervacia-" + created.id}>{c('Moje rezervácie', 'Moje rezervace')} ↗</Link></PortalElement></PortalElement>;
    return <><TimeRequestCallout locale={settings.locale} serviceId={serviceId}/><PortalElement as="form" className="client-booking-grid booking-experience" onSubmit={submit} onInvalidCapture={() => trackAnalytics('booking_error', { error_kind: 'validation' })}><PortalElement as="div" className="client-booking-main"><PortalElement as="section" className="client-card client-form booking-choice-card"><PortalElement as="h2" className="booking-step-heading"><PortalElement as="span">1</PortalElement> {c('Vyber si stretnutie', 'Vyber si setkání')}</PortalElement><PortalElement as="label">{c('Stretnutie', 'Setkání')}<PortalElement as="select" aria-label={c('Stretnutie', 'Setkání')} value={serviceId} disabled={sending || review} onChange={e => changeService(e.target.value)}>{services.filter(s => ['rychly-rozhovor', 'individualny-coaching', 'premiovy-mentalny-koucing', 'relaxacia'].includes(s.id) || s.id === serviceId).map(s => <PortalElement as="option" value={s.id} key={s.id}>{s.id === 'individualny-coaching' ? c('Individuálny koučing', 'Individuální koučink') : s.name}{!flexible && <> · {durationLabel(s.minutes)} · {fmt(s.price)}</>}</PortalElement>)}</PortalElement></PortalElement><PortalElement as="label">{c('Téma rozhovoru', 'Téma rozhovoru')}<PortalElement as="select" aria-label={c('Téma rozhovoru', 'Téma rozhovoru')} value={topic} disabled={sending || review} onChange={e => { setTopic(e.target.value); requestId.current = ''; }}>{COACHING_TOPICS.map(t => <PortalElement as="option" key={t.id} value={t.id}>{topicLabel(t.id, settings.locale)}</PortalElement>)}</PortalElement><PortalElement as="small">{c('Tému si môžeš upraviť. Nemusíš mať všetko presne pomenované.', 'Téma si můžeš upravit. Nemusíš mít vše přesně pojmenované.')}</PortalElement></PortalElement>{serviceId === 'rychly-rozhovor' && topic === 'teenager-pod-tlakom' && <PortalElement as="p">{c('Tento Rýchly rozhovor je určený dospelému rodičovi.', 'Tento Rychlý rozhovor je určen dospělému rodiči.')}</PortalElement>}<PortalElement as="label">{c('Spôsob objednania', 'Způsob objednání')}<PortalElement as="select" aria-label={c('Spôsob objednania', 'Způsob objednání')} value={creditId ? 'credit:' + creditId : packageId} disabled={sending || review} onChange={e => {
            const v = e.target.value;
            setCredit(v.startsWith('credit:') ? v.slice(7) : '');
            setPackage(v.startsWith('credit:') ? '' : v);
            const p = owned.find(p => 'credit:' + p.id === v);
            if (p?.snapshot.participantAge) {
                setMinor(true);
                setChild(p.snapshot.participantName || '');
                setAge(p.snapshot.participantAge);
            }
            reset();
        }}><PortalElement as="option" value="">{c('Jedno stretnutie', 'Jedno setkání')} · {fmt(service.price)}</PortalElement>{settings.packages.filter(p => p.active && packageFits(p, service)).map(p => <PortalElement as="option" key={p.id} value={p.id}>{p.name} · {p.creditMinutes ? creditTime(p.creditMinutes) : p.sessions + ' ' + c('sedení', 'setkání')} · {fmt(p.price)}</PortalElement>)}{owned.filter(p => canUseCredit(p, service) && (!p.snapshot.participantAge || p.service_id === serviceId)).map(p => <PortalElement as="option" key={p.id} value={'credit:' + p.id}>{c('Čerpať z balíka:', 'Čerpat z balíčku:')} {p.snapshot.name} · {c('zostáva', 'zbývá')} {p.total_minutes != null ? creditTime(p.remaining_minutes ?? 0) : p.remaining}</PortalElement>)}</PortalElement></PortalElement>{flexible && <PortalElement as="label">{c('Rezervačný čas stretnutia', 'Rezervační čas setkání')}<PortalElement as="select" aria-label={c('Rezervačný čas stretnutia', 'Rezervační čas setkání')} value={selectedDuration} disabled={sending || review} onChange={e => { setDuration(Number(e.target.value)); reset(); }}>{Array.from({ length: Math.floor(bankMinutes / 30) }, (_, i) => (i + 1) * 30).map(n => <PortalElement as="option" key={n} value={n}>{creditTime(n)}</PortalElement>)}</PortalElement><PortalElement as="small">{c('Po 30 minútach podľa súvislého voľného času v kalendári. Dlhšie stretnutie si vopred dohodneme a osobne potvrdím.', 'Po 30 minutách podle souvislého volného času v kalendáři. Delší setkání si předem domluvíme a osobně potvrdím.')}</PortalElement></PortalElement>}<PortalElement as="p" className="booking-choice-facts"><PortalElement as="strong">{offer?.name || service.name}</PortalElement><PortalElement as="span">{credit ? c('Zo zakúpeného balíčka', 'Ze zakoupeného balíčku') : fmt(price)} · {offerText} · Online</PortalElement></PortalElement></PortalElement><PortalElement as="section" className="client-card booking-calendar-card"><PortalElement as="h2" className="booking-step-heading"><PortalElement as="span">2</PortalElement> {c('Vyber si termín', 'Vyber si termín')}</PortalElement><WeeklyBookingSlots locale={settings.locale} serviceId={serviceId} minutes={service.minutes} slotMinutes={reservedMinutes} price={price} packageId={packageId} entitlementId={creditId} enabled={settings.enabled && settings.stripeEnabled} selected={selected} initialStart={selected} onSelectionUnavailable={() => { reset(); setError(c('Vybraný termín už nie je voľný. Vyber si, prosím, nový čas.', 'Vybraný termín už není volný. Vyber si prosím nový čas.')); }} horizonDays={settings.horizonDays} refresh={refresh} selectionDisabled={sending || review} onSelect={s => {
            if (!sending && !review) {
                if (!selected)
                    trackAnalytics('booking_start');
                trackAnalytics('booking_slot_select');
                setSelected(s);
                setError('');
                requestId.current = '';
            }
        }}/></PortalElement>
 {error && <PortalElement as="p" ref={errorRef} className="client-error" role="alert" tabIndex={-1}>{error}</PortalElement>}{!authenticated ? null : <PortalElement as="section" id="booking-details" ref={detailsRef} className="client-card client-form booking-details-card"><PortalElement as="h2" className="booking-step-heading"><PortalElement as="span">3</PortalElement> {minor ? c('Kontaktné údaje rodiča', 'Kontaktní údaje rodiče') : c('Tvoje údaje a kontrola', 'Tvé údaje a kontrola')}</PortalElement><PortalElement as="p">{c('Email účtu', 'E-mail účtu')}: <PortalElement as="strong">{email}</PortalElement>. {c('Na tento email pošleme potvrdenie a Odkaz na videohovor.', 'Na tento e-mail pošleme potvrzení a odkaz na Meet.')}</PortalElement><PortalElement as="div" className="client-form-row"><PortalElement as="label">{c('Meno', 'Jméno')}<PortalElement as="input" name="firstName" autoComplete="given-name" defaultValue={name.trim().split(/\s+/)[0] || ''} maxLength={60} required readOnly={review} disabled={sending}/></PortalElement><PortalElement as="label">{c('Priezvisko', 'Příjmení')}<PortalElement as="input" name="lastName" autoComplete="family-name" defaultValue={name.trim().split(/\s+/).slice(1).join(' ')} maxLength={60} required readOnly={review} disabled={sending}/></PortalElement></PortalElement>{service.guardian && <><PortalElement as="p">{c('Teenage koučing je pre vek 13–19 rokov. Od 18 rokov rezervuješ samostatne; pri neplnoletom rezervuje zákonný zástupca.', 'Teenage koučink je pro věk 13–19 let. Od 18 let rezervuješ samostatně; u nezletilého rezervuje zákonný zástupce.')}</PortalElement><PortalElement as="label">{c('Pre koho je termín?', 'Pro koho je termín?')}<PortalElement as="select" value={minor ? 'minor' : 'self'} disabled={sending || review || !!credit} onChange={e => { setMinor(e.target.value === 'minor'); requestId.current = ''; }}><PortalElement as="option" value="self">{c('Pre mňa, mám aspoň 18 rokov', 'Pro mě, je mi alespoň 18 let')}</PortalElement><PortalElement as="option" value="minor">{c('Pre neplnoletého teenagera od 13 rokov; som zákonný zástupca', 'Pro nezletilého teenagera od 13 let; jsem zákonný zástupce')}</PortalElement></PortalElement></PortalElement>{minor && <><PortalElement as="label">{c('Meno a priezvisko teenagera', 'Jméno a příjmení teenagera')}<PortalElement as="input" value={child} minLength={2} maxLength={100} required readOnly={review || !!credit} disabled={sending} onChange={e => { setChild(e.target.value); requestId.current = ''; }}/></PortalElement><PortalElement as="label">{c('Vek teenagera', 'Věk teenagera')}<PortalElement as="input" type="number" min={13} max={17} required value={age || ''} readOnly={review || !!credit} disabled={sending} onChange={e => { setAge(Number(e.target.value)); requestId.current = ''; }}/></PortalElement><PortalElement as="label" className="client-check"><PortalElement as="input" name="guardian" type="checkbox" required disabled={sending}/><PortalElement as="span">{c('Som zákonný zástupca uvedeného teenagera a súhlasím s jeho účasťou na tomto nezdravotníckom stretnutí. Potvrdzujem, že sa chce zúčastniť dobrovoľne.', 'Jsem zákonný zástupce uvedeného teenagera a souhlasím s jeho účastí na tomto nezdravotnickém setkání. Potvrzuji, že se chce zúčastnit dobrovolně.')}</PortalElement></PortalElement></>}</>}<PortalElement as="label">{minor ? c('Telefón rodiča', 'Telefon rodiče') : c('Telefón', 'Telefon')}<PortalElement as="input" name="phone" type="tel" autoComplete="tel" minLength={6} maxLength={40} required readOnly={review} disabled={sending}/></PortalElement><PortalElement as="div" className="client-form-row"><PortalElement as="label">{c('Mesto', 'Město')}<PortalElement as="input" name="city" autoComplete="address-level2" minLength={2} maxLength={100} required readOnly={review} disabled={sending}/></PortalElement><PortalElement as="label">{c('Štát', 'Stát')}<PortalElement as="input" name="country" autoComplete="country-name" placeholder={c('SR, ČR alebo iný štát', 'ČR, SR nebo jiný stát')} minLength={2} maxLength={60} required readOnly={review} disabled={sending}/></PortalElement></PortalElement><PortalElement as="label">{c('Čomu sa chceš venovať? (nepovinné)', 'Čemu se chceš věnovat? (nepovinné)')}<PortalElement as="textarea" maxLength={500} value={note} readOnly={review} disabled={sending} onChange={e => { setNote(e.target.value); requestId.current = ''; }}/><PortalElement as="small">{service.id === 'opora-pocas-liecby' ? c('Zdravotné súvislosti sem nepíš. Po vytvorení rezervácie môžeš v účte dobrovoľne vyplniť oddelený dôverný opis so samostatným súhlasom.', 'Zdravotní souvislosti sem nepiš. Po vytvoření rezervace můžeš v účtu dobrovolně vyplnit oddělený důvěrný popis se samostatným souhlasem.') : c('Neposielaj diagnózy ani zdravotnú anamnézu.', 'Neposílej diagnózy ani zdravotní anamnézu.')}</PortalElement></PortalElement><PortalElement as="label" className="client-check"><PortalElement as="input" type="checkbox" name="adult" required disabled={sending}/><PortalElement as="span">{c('Mám aspoň 18 rokov a', 'Je mi alespoň 18 let a')} {minor ? c('objednávam ako zákonný zástupca.', 'objednávám jako zákonný zástupce.') : c('objednávam pre seba.', 'objednávám pro sebe.')}</PortalElement></PortalElement><PortalElement as="label" className="client-check"><PortalElement as="input" type="checkbox" name="accepted" required disabled={sending}/><PortalElement as="span">{c('Súhlasím s', 'Souhlasím s')} <Link href={cs ? '/cz/podmienky' : '/podmienky'} target="_blank">{c('podmienkami rezervácie', 'podmínkami rezervace')}</Link> {c('a oboznámil/a som sa s', 'a seznámil/a jsem se s')} <Link href={cs ? '/cz/ochrana-udajov' : '/ochrana-udajov'} target="_blank">{c('ochranou údajov', 'ochranou osobních údajů')}</Link>.</PortalElement></PortalElement>{offer && <PortalElement as="p">{c('Zakúpením balíčka rezervuješ prvé sedenie. Ostatné termíny vyberieš samostatne v účte. Včas zrušený termín vráti sedenie do balíčka; neskoré storno sa rieši individuálne.', 'Zakoupením balíčku rezervuješ první setkání. Ostatní termíny vybereš samostatně v účtu. Včas zrušený termín vrátí setkání do balíčku; pozdní storno se řeší individuálně.')}</PortalElement>}{review && <PortalElement as="div" className="client-notice"><PortalElement as="h3">{c('Skontroluj objednávku', 'Zkontroluj objednávku')}</PortalElement>{summary}<PortalElement as="button" type="button" onClick={() => setReview(false)}>{c('Upraviť výber', 'Upravit výběr')}</PortalElement></PortalElement>}<PortalElement as="button" className="client-button" disabled={sending || !selected}>{sending ? c('Ukladám…', 'Ukládám…') : review ? credit ? c('Odoslať žiadosť zo zakúpeného balíčka', 'Odeslat žádost ze zakoupeného balíčku') : c('Pokračovať ku karte', 'Pokračovat ke kartě') : c('Skontrolovať rezerváciu', 'Zkontrolovat rezervaci')} ↗</PortalElement></PortalElement>}</PortalElement><PortalElement as="aside" id="booking-summary" className="client-card client-booking-summary booking-service-summary" aria-label={c('Vybraná služba a ďalší krok', 'Vybraná služba a další krok')}>
 <PortalElement as="p" className="client-eyebrow">{c('TVOJA REZERVÁCIA', 'TVÁ REZERVACE')}</PortalElement><PortalElement as="h2">{offer?.name || service.name}</PortalElement><PortalElement as="p" className="booking-selected-topic">{c('Téma rozhovoru:', 'Téma rozhovoru:')} <PortalElement as="strong">{topicLabel(topic, settings.locale)}</PortalElement></PortalElement>
 <PortalElement as="p" className="booking-service-intro">{description?.intro || service.description}</PortalElement>
 {description && <PortalElement as="ul" className="booking-service-topics">{description.topics.map(text => <PortalElement as="li" key={text}>{text}</PortalElement>)}</PortalElement>}
 <PortalElement as="p" className="booking-summary-price"><PortalElement as="strong">{credit ? c('Zo zakúpeného balíčka', 'Ze zakoupeného balíčku') : fmt(price)}</PortalElement><PortalElement as="span">{offerText} · Online</PortalElement></PortalElement>
 {offer && <PortalElement as="p" className="booking-summary-note">{offer.creditMinutes ? <>{creditTime(offer.creditMinutes)} {c('rezervačného času. Čerpáš po 30 minútach aj na dlhší rozhovor po dohode. Platnosť 12 mesiacov od úhrady.', 'rezervačního času. Čerpáš po 30 minutách i na delší rozhovor po domluvě. Platnost 12 měsíců od zaplacení.')}</> : <>{offer.sessions} {c('individuálnych stretnutí po', 'individuálních setkání po')} {durationLabel(service.minutes)}.</>} {c('Teraz vyberáš prvý termín; ostatné si rezervuješ v účte.', 'Teď vybíráš první termín; ostatní si rezervuješ v účtu.')}{offer.extras && ' ' + c('V cene navyše: ', 'V ceně navíc: ') + offer.extras + '.'}</PortalElement>}
 {credit && <PortalElement as="p" className="booking-summary-note">{c('Zostáva', 'Zbývá')} {balanceText}. {creditDescription} {c('Za tento termín znovu neplatíš.', 'Za tento termín znovu neplatíš.')}</PortalElement>}
 <PortalElement as="div" className="booking-next-step"><PortalElement as="div" className={'booking-selected-time' + (selected ? ' has-selection' : '')} role="status" aria-live="polite">{selected ? <><PortalElement as="span">{c('VYBRANÝ TERMÍN', 'VYBRANÝ TERMÍN')}</PortalElement><PortalElement as="strong">{formatDate(selected)}</PortalElement><PortalElement as="small">{c('Rezervačný slot', 'Rezervační slot')}: {durationLabel(service.minutes)}<PortalElement as="br"/>{c('Časové pásmo', 'Časové pásmo')}: Bratislava</PortalElement></> : <><PortalElement as="span">{c('TVOJ TERMÍN', 'TVŮJ TERMÍN')}</PortalElement><PortalElement as="p">{c('Vyber si deň a čas, ktorý ti vyhovuje.', 'Vyber si den a čas, který ti vyhovuje.')}</PortalElement></>}</PortalElement>
 {selected ? (!authenticated ? <Link className="client-button booking-summary-continue" href={continueUrl}>{c('Pokračovať k rezervácii', 'Pokračovat k rezervaci')} →</Link> : review ? <PortalElement as="button" type="submit" className="client-button booking-summary-continue" disabled={sending}>{sending ? c('Ukladám…', 'Ukládám…') : credit ? c('Odoslať žiadosť', 'Odeslat žádost') + ' →' : c('Pokračovať ku karte', 'Pokračovat ke kartě') + ' →'}</PortalElement> : <PortalElement as="button" type="button" className="client-button booking-summary-continue" onClick={goToDetails}>{c('Pokračovať k údajom', 'Pokračovat k údajům')} →</PortalElement>) : <PortalElement as="button" type="button" className="client-button booking-summary-continue" disabled>{c('Najprv vyber termín', 'Nejprve vyber termín')}</PortalElement>}</PortalElement>
 <PortalElement as="details" className="booking-summary-note"><PortalElement as="summary">{c('Ako dlho trvá stretnutie?', 'Jak dlouho trvá setkání?')}</PortalElement><PortalElement as="p">{sessionTimingNotice(service, settings.bufferMinutes, settings.locale)}</PortalElement></PortalElement>
 <PortalElement as="p" className="booking-summary-note">{credit ? c('Termín osobne potvrdí poskytovateľ.', 'Termín osobně potvrdí poskytovatel.') : settings.paymentMode === 'authorize_confirm' ? c('Na karte sa suma najprv zablokuje. Strhne sa až po osobnom potvrdení termínu.', 'Na kartě se částka nejprve zablokuje. Strhne se až po osobním potvrzení termínu.') : c('Platíš cez Stripe až po osobnom potvrdení termínu.', 'Platíš přes Stripe až po osobním potvrzení termínu.')} {c('Po potvrdení a úhrade dostaneš odkaz na videohovor emailom aj do účtu.', 'Po potvrzení a platbě dostaneš odkaz na videohovor e-mailem i do účtu.')}</PortalElement>
 </PortalElement></PortalElement></>;
}

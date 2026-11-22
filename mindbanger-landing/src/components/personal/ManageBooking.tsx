'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { paymentStateLabel } from '@/lib/booking/payment-state';
import MeetingLink from '@/components/client/MeetingLink';
import BookingHold from '@/components/client/BookingHold';
import { topicLabel } from '@/lib/booking/offer';
import { useEffect, useState } from 'react';
import { Appointment, statusLabels, dateLabel, money } from '@/lib/booking/model';
import type { SiteLocale } from '@/lib/site-locale';
type Summary = Pick<Appointment, 'service_id' | 'id' | 'status' | 'starts_at' | 'ends_at' | 'service_name' | 'price' | 'currency' | 'location' | 'hold_until' | 'paid' | 'topic' | 'payment_review' | 'payment_flow' | 'payment_state' | 'funding_type' | 'authorization_expires_at' | 'meeting_url'>;
const statusCs: Record<Appointment['status'], string> = { pending: 'Čeká na potvrzení', confirmed: 'Potvrzená', cancelled: 'Zrušená', expired: 'Vypršela', completed: 'Absolvovaná', no_show: 'Klient nepřišel', blocked: 'Blokovaný čas' };
export default function ManageBooking({ locale = 'sk' }: {
    locale?: SiteLocale;
}) {
    const portalLanguage = usePortalLocale();
    const cs = locale === 'cs', c = (sk: string, cz: string) => cs ? cz : sk;
    const [now] = useState(() => Date.now());
    const [booking, setBooking] = useState<Summary | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [confirm, setConfirm] = useState(false);
    async function request(action: 'view' | 'cancel') {
        setLoading(true);
        setError('');
        try {
            const token = window.location.hash.slice(1);
            if (!/^[a-f0-9]{64}$/.test(token))
                throw new Error(c('Otvorte súkromný odkaz z emailu.', 'Otevřete soukromý odkaz z e-mailu.'));
            const response = await fetch('/api/appointments/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action }), cache: 'no-store' });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error);
            setBooking(result.booking);
            setConfirm(false);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : c('Rezerváciu sa nepodarilo načítať.', 'Rezervaci se nepodařilo načíst.'));
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { void request('view'); }, []);
    return <PortalElement as="div" className="personal-manage">{loading && <PortalElement as="p" role="status">{c('Načítavam rezerváciu…', 'Načítám rezervaci…')}</PortalElement>}{error && <PortalElement as="p" className="personal-notice" role="alert">{error}<PortalElement as="button" className="personal-text-link" onClick={() => request('view')} style={{ marginLeft: 12 }}>{c('Skúsiť znova', 'Zkusit znovu')}</PortalElement></PortalElement>}{booking && <><PortalElement as="p" className="personal-notice" role="status">{cs ? statusCs[booking.status] : statusLabels[booking.status]}</PortalElement>{booking.topic && <PortalElement as="p">{c('Téma', 'Téma')}: {topicLabel(booking.topic)}</PortalElement>}<PortalElement as="p">{Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)} {c('minút', 'minut')} · Europe/Bratislava</PortalElement><PortalElement as="p">{c('Úhrada', 'Platba')}: {cs ? c('Stav platby je uvedený v klientskom účte.', 'Stav platby najdeš v klientském účtu.') : paymentStateLabel(booking)}</PortalElement>{booking.status === 'confirmed' && booking.paid && booking.meeting_url && <MeetingLink url={booking.meeting_url}/>}<PortalElement as="dl"><PortalElement as="div"><PortalElement as="dt">{c('Stretnutie', 'Setkání')}</PortalElement><PortalElement as="dd">{booking.service_name}</PortalElement></PortalElement><PortalElement as="div"><PortalElement as="dt">{c('Termín', 'Termín')}</PortalElement><PortalElement as="dd">{dateLabel(booking.starts_at, locale)}</PortalElement></PortalElement><PortalElement as="div"><PortalElement as="dt">{c('Miesto', 'Místo')}</PortalElement><PortalElement as="dd">{booking.location}</PortalElement></PortalElement><PortalElement as="div"><PortalElement as="dt">{c('Cena služby', 'Cena služby')}</PortalElement><PortalElement as="dd">{money(Number(booking.price), booking.currency, portalLanguage)}</PortalElement></PortalElement></PortalElement><BookingHold status={booking.status} holdUntil={booking.hold_until} paid={booking.paid} fundingType={booking.funding_type} paymentState={booking.payment_state} serviceId={booking.service_id} locale={locale}>{['pending', 'confirmed'].includes(booking.status) && Date.parse(booking.starts_at) > now && (confirm ? <PortalElement as="div"><PortalElement as="p">{c('Naozaj chcete zrušiť tento termín? Zrušenie je bezplatné.', 'Opravdu chcete zrušit tento termín? Zrušení je bezplatné.')}</PortalElement><PortalElement as="div" className="personal-actions"><PortalElement as="button" disabled={loading} className="personal-button" onClick={() => request('cancel')}>{c('Áno, zrušiť termín', 'Ano, zrušit termín')}</PortalElement><PortalElement as="button" disabled={loading} className="personal-text-link" onClick={() => setConfirm(false)}>{c('Ponechať termín', 'Ponechat termín')}</PortalElement></PortalElement></PortalElement> : <PortalElement as="button" disabled={loading} className="personal-text-link" onClick={() => setConfirm(true)}>{c('Zrušiť žiadosť alebo termín', 'Zrušit žádost nebo termín')}</PortalElement>)}</BookingHold><PortalElement as="p">{c('Ak potrebujete zmenu termínu, kontaktujte prevádzkovateľa. Tento súkromný odkaz nepreposielajte.', 'Pokud potřebujete změnit termín, kontaktujte provozovatele. Tento soukromý odkaz nepřeposílejte.')}</PortalElement></>}</PortalElement>;
}

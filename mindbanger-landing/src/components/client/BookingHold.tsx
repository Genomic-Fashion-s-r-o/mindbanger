'use client';
import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { useEffect, useState, type ReactNode } from 'react';
import { dateLabel } from '@/lib/booking/model';
type Props = {
    status?: string;
    holdUntil?: string | null;
    paid?: boolean;
    fundingType?: string;
    paymentState?: string;
    serviceId?: string;
    locale?: 'sk' | 'cs' | 'en';
    children?: ReactNode;
};
// A deadline only describes an unfinished checkout, never a paid booking or a package credit.
export default function BookingHold({ status = 'pending', holdUntil, paid = false, fundingType, paymentState, serviceId, locale = 'sk', children }: Props) {
    const cs = locale === 'cs', c = (sk: string, cz: string) => cs ? cz : sk;
    const deadline = holdUntil ? Date.parse(holdUntil) : NaN;
    const eligible = !paid && fundingType !== 'package' && fundingType !== 'manual' && !['authorized', 'capturing', 'captured'].includes(paymentState || '');
    const [clock, setClock] = useState(() => Date.now());
    const expired = eligible && (status === 'expired' || (status === 'pending' && Number.isFinite(deadline) && clock >= deadline));
    const closed = eligible && status === 'cancelled' && paymentState === 'released';
    const active = eligible && status === 'pending' && Number.isFinite(deadline) && !expired;
    useEffect(() => {
        if (!active)
            return;
        const update = () => setClock(Date.now());
        const timer = setTimeout(update, Math.min(Math.max(deadline - Date.now(), 0) + 50, 2147483647));
        window.addEventListener('focus', update);
        document.addEventListener('visibilitychange', update);
        return () => { clearTimeout(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
    }, [active, deadline, clock]);
    const href = '/ucet/rezervovat' + (serviceId ? '?' + new URLSearchParams({ sluzba: serviceId }) : '');
    if (expired || closed)
        return <PortalElement as="section" className="client-notice" role="status" aria-live="polite"><PortalElement as="h3">{closed ? c('Táto rezervácia už nie je aktívna.', 'Tato rezervace už není aktivní.') : c('Lehota na dokončenie rezervácie uplynula.', 'Lhůta pro dokončení rezervace uplynula.')}</PortalElement><PortalElement as="p">{c('Pôvodnú objednávku už nedokončuj. Vyber si znova z aktuálne dostupných termínov.', 'Původní objednávku už nedokončuj. Vyber si znovu z aktuálně dostupných termínů.')}</PortalElement><PortalElement as="p">{c('Ak si platbu práve dokončil/a, najprv si over jej stav v účte.', 'Pokud jsi platbu právě dokončil/a, nejprve si ověř její stav v účtu.')}</PortalElement><Link className="client-button" href={href}>{c('Vybrať termín znova', 'Vybrat termín znovu')} ↗</Link><PortalElement as="p"><Link href="/ucet/rezervacie">{c('Overiť stav mojich rezervácií', 'Ověřit stav mých rezervací')} ↗</Link></PortalElement></PortalElement>;
    return <>{active && <PortalElement as="section" className="client-notice" role="status"><PortalElement as="h3">{c('Termín je pre teba dočasne blokovaný', 'Termín je pro tebe dočasně blokovaný')}</PortalElement><PortalElement as="p">{c('Dokonči rezerváciu do', 'Dokonči rezervaci do')} <PortalElement as="strong"><PortalElement as="time" dateTime={holdUntil!}>{dateLabel(holdUntil!, locale)}</PortalElement></PortalElement> ({c('čas v Bratislave', 'čas v Bratislavě')}).</PortalElement><PortalElement as="p">{c('Ak ju nedokončíš včas, blokácia vyprší a bude potrebné vybrať termín znova.', 'Pokud ji nedokončíš včas, blokace vyprší a bude potřeba vybrat termín znovu.')}</PortalElement></PortalElement>}{children}</>;
}

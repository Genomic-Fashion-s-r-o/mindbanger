'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { creditTime } from '@/lib/booking/package-credit';
import { useEffect, useState } from 'react';
import Link from '@/components/client/PortalLink';
import { serviceUrl } from '@/lib/booking/catalog';
export type OwnedPackage = {
    id: string;
    service_id: string;
    total: number;
    used: number;
    reserved: number;
    review: number;
    remaining: number;
    state: string;
    total_minutes?: number | null;
    expires_at?: string | null;
    remaining_minutes?: number | null;
    used_minutes?: number;
    reserved_minutes?: number;
    review_minutes?: number;
    expired?: boolean;
    snapshot: {
        name: string;
        participantName?: string;
        participantAge?: number;
        extras?: string;
    };
};
export default function PackageBalance({ title = 'Moje balíčky' }: {
    title?: string;
}) {
    const portalLanguage = usePortalLocale();
    const [items, setItems] = useState<OwnedPackage[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
    useEffect(() => {
        const c = new AbortController();
        setLoading(true);
        setError('');
        fetch('/api/client/packages', { cache: 'no-store', signal: c.signal }).then(async (r) => {
            const d = await r.json();
            if (!r.ok)
                throw Error();
            if (!c.signal.aborted)
                setItems(d.packages);
        }).catch(() => {
            if (!c.signal.aborted)
                setError('Balíčky sa nepodarilo načítať.');
        }).finally(() => {
            if (!c.signal.aborted)
                setLoading(false);
        });
        return () => c.abort();
    }, [retry]);
    return <PortalElement as="section" id="balicky" className="client-section account-packages" aria-busy={loading}><PortalElement as="div" className="client-section-heading"><PortalElement as="div"><PortalElement as="p" className="client-eyebrow">ZAKÚPENÉ STRETNUTIA</PortalElement><PortalElement as="h2">{title}</PortalElement><PortalElement as="p">Tu nájdeš dostupný, rezervovaný a využitý čas z uhradených balíkov. Ďalší termín si vyberieš, keď ho potrebuješ.</PortalElement></PortalElement></PortalElement>{loading ? <PortalElement as="p" className="account-package-message" role="status">Načítavam tvoje balíčky…</PortalElement> : error ? <PortalElement as="div" className="account-package-message" role="alert"><PortalElement as="p">{error}</PortalElement><PortalElement as="button" type="button" className="client-button secondary" onClick={() => setRetry(v => v + 1)}>Skúsiť znova</PortalElement></PortalElement> : items.length ? <PortalElement as="div" className="account-package-grid">{items.map(p => <PortalElement as="article" className="client-card account-package-card" key={p.id}><PortalElement as="div" className="account-package-top"><PortalElement as="span" className="client-badge">{p.state === 'suspended' ? 'Pozastavený' : p.expired ? 'Po platnosti' : (p.total_minutes != null ? (p.remaining_minutes ?? 0) > 0 : p.remaining > 0) ? 'Aktívny' : 'Vyčerpaný'}</PortalElement><PortalElement as="h3">{p.snapshot.name}</PortalElement></PortalElement><PortalElement as="div" className="account-package-remaining"><PortalElement as="strong">{p.total_minutes != null ? creditTime(p.remaining_minutes ?? 0) : p.remaining}</PortalElement><PortalElement as="span">{p.total_minutes != null ? <>dostupný čas<PortalElement as="br"/>z {creditTime(p.total_minutes)}</> : <>voľných sedení<PortalElement as="br"/>z {p.total} zakúpených</>}</PortalElement></PortalElement><PortalElement as="dl" className="account-package-stats"><PortalElement as="div"><PortalElement as="dt">Absolvované</PortalElement><PortalElement as="dd">{p.total_minutes != null ? creditTime(p.used_minutes ?? 0) : p.used}</PortalElement></PortalElement><PortalElement as="div"><PortalElement as="dt">Rezervované</PortalElement><PortalElement as="dd">{p.total_minutes != null ? creditTime(p.reserved_minutes ?? 0) : p.reserved}</PortalElement></PortalElement>{p.review > 0 && <PortalElement as="div"><PortalElement as="dt">Na posúdenie</PortalElement><PortalElement as="dd">{p.total_minutes != null ? creditTime(p.review_minutes ?? 0) : p.review}</PortalElement></PortalElement>}</PortalElement>{p.expires_at && <PortalElement as="p" className="account-package-note">Platnosť do {new Intl.DateTimeFormat(localeTag(portalLanguage), { dateStyle: 'medium', timeZone: 'Europe/Bratislava' }).format(new Date(p.expires_at))}. Stretnutie musí prebehnúť v platnosti balíka.</PortalElement>}{p.review > 0 && <PortalElement as="p" className="account-package-note">{p.total_minutes != null ? creditTime(p.review_minutes ?? 0) : p.review + ' sedení'} čaká na individuálne vysporiadanie neskorého storna.</PortalElement>}{p.state === 'suspended' ? <PortalElement as="p" className="account-package-note">Balíček je pozastavený po refundácii. Pre ďalší postup kontaktuj poskytovateľa.</PortalElement> : (p.total_minutes != null ? (p.remaining_minutes ?? 0) > 0 : p.remaining > 0) && p.state === 'active' ? <Link className="client-button" href={serviceUrl(p.service_id, '', '', p.id).replace('/rezervacia?', '/ucet/rezervovat?')}>Vybrať termín z balíčka ↗</Link> : <PortalElement as="p" className="account-package-note">V tomto balíku už nie je dostupný kredit. Rezervované termíny nájdeš v rezerváciách.</PortalElement>}</PortalElement>)}</PortalElement> : <PortalElement as="div" className="account-package-message"><PortalElement as="h3">Zatiaľ nemáš zakúpený balíček.</PortalElement><PortalElement as="p">Po úhrade sa tu zobrazí tvoj časový kredit aj jeho platnosť. Začať môžeš aj jedným stretnutím.</PortalElement><Link className="client-text-link" href="/ucet/sluzby">Pozrieť služby a balíčky ↗</Link></PortalElement>}</PortalElement>;
}

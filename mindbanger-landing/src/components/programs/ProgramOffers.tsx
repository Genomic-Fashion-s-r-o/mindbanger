'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { listClientPrograms } from '@/lib/online-programs/store';
import { PROGRAM_TERMS_VERSION } from '@/lib/online-programs/model';
import { effectiveQuote, euro } from '@/lib/member-funnels/model';
type Offer = Awaited<ReturnType<typeof listClientPrograms>>['offers'][number];
export function ProgramOffer({ offer }: {
    offer: Offer;
}) {
    const portalLanguage = usePortalLocale();
    const [cohortId, setCohortId] = useState(offer.cohorts[0]?.id || ''), [terms, setTerms] = useState(false), [performance, setPerformance] = useState(false), [adult, setAdult] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const owned = offer.ownedCohorts.includes(offer.mode === 'cohort' ? cohortId : null);
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        setNow(Date.now());
        if (!offer.quote.deadline)
            return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [offer.quote.deadline]);
    const price = now === null ? { price: offer.price, tier: offer.quote.tier, seconds: 0 } : effectiveQuote(offer.quote, now);
    useEffect(() => { setTerms(false); setPerformance(false); setAdult(false); }, [price.tier]);
    async function buy() {
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/client/online-programs/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId: offer.id, cohortId: offer.mode === 'cohort' ? cohortId || null : null, displayedPrice: price.price, termsAccepted: terms, performanceRequested: performance, adultConfirmed: adult, termsVersion: PROGRAM_TERMS_VERSION }) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error || 'Platbu sa nepodarilo začať.');
            const url = new URL(result.url);
            if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com')
                throw new Error('Platobná stránka nie je dostupná.');
            window.location.assign(url.href);
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Platbu sa nepodarilo začať.');
            setBusy(false);
        }
    }
    return <PortalElement as="article" className="op-panel op-stack"><PortalElement as="header"><PortalElement as="h2">{offer.title}</PortalElement><PortalElement as="p">{offer.description}</PortalElement><PortalElement as="p"><PortalElement as="strong">{euro(price.price, portalLanguage)}</PortalElement> · {price.tier === 'intro' ? 'úvodná cena' : price.tier === 'member' ? 'členská cena' : 'jednorazová platba'}</PortalElement>{price.tier === 'intro' && <PortalElement as="p" className="op-notice">{now === null ? 'Načítavam čas ponuky…' : <>Na dokončenie platby zostáva <PortalElement as="strong">{Math.floor(price.seconds / 60)}:{String(price.seconds % 60).padStart(2, '0')}</PortalElement>.</>} Potom bude platiť členská cena {euro(offer.quote.memberPrice ?? offer.price, portalLanguage)}.</PortalElement>}</PortalElement>
    {offer.mode === 'cohort' && <PortalElement as="label">Vyber turnus<PortalElement as="select" value={cohortId} onChange={e => { setCohortId(e.target.value); setTerms(false); setPerformance(false); setAdult(false); }}><PortalElement as="option" value="">Vyber termín</PortalElement>{offer.cohorts.map(c => <PortalElement as="option" key={c.id} value={c.id}>{c.name} · od {c.date}</PortalElement>)}</PortalElement></PortalElement>}
    {owned ? <PortalElement as="p" className="op-notice">K tomuto programu už máš prístup. Nájdeš ho medzi svojimi programami.</PortalElement> : offer.mode === 'cohort' && !offer.cohorts.length ? <PortalElement as="p" className="op-notice">Momentálne nie je otvorený žiadny turnus.</PortalElement> : <><PortalElement as="details"><PortalElement as="summary">Podmienky nákupu a prístupu</PortalElement><PortalElement as="p" className="op-text">{offer.mode === 'cohort' ? offer.cohorts.find(c => c.id === cohortId)?.terms : offer.terms}</PortalElement></PortalElement><PortalElement as="div" className="op-stack op-tight"><PortalElement as="label" className="op-check"><PortalElement as="input" type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)}/><PortalElement as="span">Prečítal/a som si podmienky nákupu a súhlasím s nimi.</PortalElement></PortalElement><PortalElement as="label" className="op-check"><PortalElement as="input" type="checkbox" checked={performance} onChange={e => setPerformance(e.target.checked)}/><PortalElement as="span">Žiadam sprístupniť digitálny obsah hneď po potvrdení platby, aj pred uplynutím 14 dní. Beriem na vedomie, že začatím poskytovania digitálneho obsahu strácam právo odstúpiť od zmluvy v tejto lehote.</PortalElement></PortalElement><PortalElement as="label" className="op-check"><PortalElement as="input" type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)}/><PortalElement as="span">Potvrdzujem, že mám aspoň 18 rokov.</PortalElement></PortalElement></PortalElement><PortalElement as="div"><PortalElement as="button" type="button" className="op-primary" onClick={() => void buy()} disabled={busy || !terms || !performance || !adult || (price.tier === 'intro' && now === null) || (offer.mode === 'cohort' && !cohortId)}>{busy ? 'Otváram platbu…' : 'Kúpiť program za ' + euro(price.price, portalLanguage)}</PortalElement></PortalElement></>}
    {error && <PortalElement as="p" className="op-error" role="alert">{error}</PortalElement>}
  </PortalElement>;
}
export function ProgramPaymentStatus({ orderId }: {
    orderId: string;
}) {
    const router = useRouter(), [status, setStatus] = useState('pending'), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let stopped = false, timer: ReturnType<typeof setTimeout> | undefined;
        async function check(count: number) {
            try {
                const response = await fetch('/api/client/online-programs?order=' + encodeURIComponent(orderId), { cache: 'no-store' });
                const data = await response.json();
                if (!response.ok)
                    throw new Error(data.error || 'Stav platby je nedostupný.');
                if (stopped)
                    return;
                setStatus(data.status);
                setError('');
                if (data.status === 'paid')
                    router.refresh();
                else if (data.status === 'pending' && count < 12)
                    timer = setTimeout(() => void check(count + 1), 5000);
            }
            catch (failure) {
                if (!stopped)
                    setError(failure instanceof Error ? failure.message : 'Stav platby je nedostupný.');
            }
        }
        void check(0);
        return () => {
            stopped = true;
            if (timer)
                clearTimeout(timer);
        };
    }, [orderId, router, attempt]);
    return <PortalElement as="div" className="op-notice op-stack op-tight"><PortalElement as="p" role="status" aria-live="polite">{error || (status === 'paid' ? 'Platba je potvrdená. Program nájdeš nižšie medzi svojimi programami.' : status === 'refunded' ? 'Platba bola vrátená.' : status === 'offer_expired' ? 'Čas úvodnej ponuky vypršal pred potvrdením platby. Úvodná cena nebola zaúčtovaná a prípadnú blokáciu na karte uvoľňujeme. Môžeš pokračovať novým nákupom za členskú cenu.' : status === 'expired' ? 'Táto objednávka vypršala. Ak si zaplatil/a, chvíľu počkaj na potvrdenie platby.' : 'Čakáme na potvrdenie platby. Prístup sa aktivuje automaticky po jej overení.')}</PortalElement>{status !== 'paid' && <PortalElement as="div"><PortalElement as="button" type="button" onClick={() => setAttempt(n => n + 1)}>Overiť stav znova</PortalElement></PortalElement>}</PortalElement>;
}

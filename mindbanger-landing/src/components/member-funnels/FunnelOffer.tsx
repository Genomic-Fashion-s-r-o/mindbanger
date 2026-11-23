'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { useEffect, useRef, useState } from 'react';
import Link from '@/components/client/PortalLink';
import type { FunnelView } from '@/lib/member-funnels/store';
import { euro } from '@/lib/member-funnels/model';
import { ProgramOffer } from '@/components/programs/ProgramOffers';
import '@/components/programs/online-programs.css';
export default function FunnelOffer({ initial }: {
    initial: FunnelView;
}) {
    const portalLanguage = usePortalLocale();
    const [view, setView] = useState(initial), [error, setError] = useState(''), [ready, setReady] = useState(false), started = useRef(false);
    useEffect(() => {
        if (started.current)
            return;
        started.current = true;
        void (async () => {
            try {
                const response = await fetch('/api/client/member-funnels/' + initial.access.id, { method: 'POST' });
                const data = await response.json();
                if (!response.ok)
                    throw new Error(data.error);
                setView(data);
                setReady(true);
            }
            catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Ponuku sa nepodarilo načítať.');
            }
        })();
    }, [initial.access.id]);
    const bonus = '/ucet/materialy/' + view.access.id;
    return <PortalElement as="div" className="op op-stack"><PortalElement as="header"><PortalElement as="p" className="client-eyebrow">TVÔJ BONUS JE PRIPRAVENÝ</PortalElement><PortalElement as="h1">Teší ma tvoj záujem o {view.access.title}.</PortalElement><PortalElement as="p">Materiál zdarma už máš uložený vo svojom účte.</PortalElement></PortalElement>{view.selling && view.offer ? <><PortalElement as="section" className="op-panel op-stack"><PortalElement as="p" className="op-badge">Špeciálna ponuka pre člena</PortalElement><PortalElement as="h2">{view.funnel.title}</PortalElement><PortalElement as="p" className="op-text">{view.funnel.body}</PortalElement>{view.access.value > 0 && <PortalElement as="p">Hodnota obsahu: {euro(view.access.value, portalLanguage)}</PortalElement>}<PortalElement as="p">Štandardná cena: {euro(view.access.standardPrice, portalLanguage)} · členská cena: {euro(view.access.memberPrice, portalLanguage)}</PortalElement></PortalElement>{ready ? <ProgramOffer offer={view.offer}/> : <PortalElement as="p" role="status">Pripravujem tvoju ponuku…</PortalElement>}</> : <PortalElement as="section" className="op-panel"><PortalElement as="h2">Tvoj priestor je otvorený.</PortalElement><PortalElement as="p">Bonus si môžeš kedykoľvek znovu otvoriť v časti Moje materiály.</PortalElement></PortalElement>}
 <PortalElement as="div" className="op-row"><Link className="op-button" href={bonus}>Pokračovať na môj bonus zdarma →</Link><Link href="/ucet">Môj účet</Link></PortalElement><PortalElement as="p" className="op-subtle">Bonus zdarma máš aj bez kúpy programu.</PortalElement>{error && <PortalElement as="p" className="op-error" role="alert">{error}</PortalElement>}</PortalElement>;
}

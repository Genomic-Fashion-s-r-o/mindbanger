'use client';
import PortalElement from '@/components/client/PortalElement';
import { useState } from 'react';
import Link from '@/components/client/PortalLink';
type Program = {
    id: string;
    title: string;
    active: boolean;
    cohort: string | null;
    expiresAt: string | null;
};
export default function MyPrograms({ programs }: {
    programs: Program[];
}) {
    const [search, setSearch] = useState('');
    const filtered = programs.filter(p => (p.title + ' ' + (p.cohort || '')).toLocaleLowerCase('sk').includes(search.trim().toLocaleLowerCase('sk')));
    return <PortalElement as="section" className="op-stack"><PortalElement as="div" className="op-row op-between"><PortalElement as="h2">Moje programy</PortalElement><PortalElement as="label">Vyhľadať program<PortalElement as="input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Názov alebo turnus"/></PortalElement></PortalElement><PortalElement as="div" className="op-program-cards" role="region" aria-label="Moje zakúpené a sprístupnené programy" tabIndex={0}>{filtered.map((p, i) => <PortalElement as="article" className="op-panel op-program-card" key={p.id}><PortalElement as="div" className={'op-program-art op-program-art-' + i % 3} aria-hidden="true"><PortalElement as="span">MINDBANGER</PortalElement><PortalElement as="strong">{p.title}</PortalElement></PortalElement><PortalElement as="div" className="op-stack"><PortalElement as="h3">{p.title}</PortalElement><PortalElement as="p" className="op-subtle">{p.active ? 'Aktívny prístup' : 'Prístup sa skončil'}{p.cohort ? ' · ' + p.cohort : ''}</PortalElement>{p.active && <Link prefetch={false} className="op-button op-primary" href={'/ucet/programy/' + p.id}>Otvoriť program →</Link>}</PortalElement></PortalElement>)}</PortalElement>{!filtered.length && <PortalElement as="p" role="status">Takýto program medzi svojimi produktmi zatiaľ nemáš.</PortalElement>}</PortalElement>;
}

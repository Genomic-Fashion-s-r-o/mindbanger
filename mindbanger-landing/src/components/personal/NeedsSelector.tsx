'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Service } from '@/lib/booking/model';
import { money } from '@/lib/booking/model';
import { durationLabel, serviceUrl } from '@/lib/booking/catalog';
import { homeServiceCopy } from './home-service-copy';
import { localizedPath, type SiteCurrency, type SiteLocale } from '@/lib/site-locale';

export function NeedsSelector({ services, locale, currency }: { services: Service[]; locale: SiteLocale; currency: SiteCurrency }) {
  const cs = locale === 'cs';
  const c = (sk: string, cz: string) => cs ? cz : sk;
  const p = (path: string) => localizedPath(path, locale);
  const [selected, setSelected] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  const available = services.filter(s => s.active && homeServiceCopy[s.id]);
  const service = available.find(s => s.id === selected);
  useEffect(() => {
    if (selected && window.matchMedia('(max-width: 760px)').matches) {
      resultRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [selected]);
  return <section id="tvoj-priestor" className="personal-section home-needs" aria-labelledby="home-needs-title">
    <div className="home-section-heading"><div><p className="personal-eyebrow">{c('1 / ZAČNI SVOJOU SITUÁCIOU','1 / ZAČNI SVOU SITUACÍ')}</p><h2 id="home-needs-title">{c('Čo práve potrebuješ?','Co právě potřebuješ?')}<br/><em>{c('Nájdime tvoj priestor.','Najděme tvůj prostor.')}</em></h2></div><p>{c('Nemusíš poznať názov služby. Vyber vetu, ktorá ti je najbližšia, a ukážem ti, kde môžeme začať.','Nemusíš znát název služby. Vyber větu, která je ti nejbližší, a ukážu ti, kde můžeme začít.')}</p></div>
    <div className="home-needs-grid"><div className="needs-options" role="group" aria-label={c('Čomu sa chceš venovať','Čemu se chceš věnovat')}>{available.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} aria-controls="needs-result" onClick={() => setSelected(item.id)}>{cs?homeServiceCopy[item.id].needCs:homeServiceCopy[item.id].need}<span aria-hidden="true">↗</span></button>)}</div>
      <div ref={resultRef} id="needs-result" className={'needs-result'+(service?' has-selection':'')} aria-live="polite" aria-atomic="true">{service ? <><p className="personal-eyebrow">{c('TU MÔŽEME ZAČAŤ','TADY MŮŽEME ZAČÍT')}</p><h3>{service.name}</h3><p>{cs?homeServiceCopy[service.id].summaryCs:homeServiceCopy[service.id].summary}</p><p className="home-match-price"><strong>{durationLabel(service.minutes)} · {money(service.price,currency)}</strong> · Online</p>{service.guardian&&<p className="home-small">{c('Koučing je určený mladým vo veku 13–19 rokov. Do 18 rokov rezervuje a platí zákonný zástupca zo svojho účtu a potvrdí súhlas s účasťou. Od 18 rokov si termín rezervuješ a platíš samostatne.','Koučink je určen mladým ve věku 13–19 let. Do 18 let rezervuje a platí zákonný zástupce ze svého účtu a potvrdí souhlas s účastí. Od 18 let si termín rezervuješ a platíš samostatně.')}</p>}<a className="personal-button" href={p(serviceUrl(service.id))}>{c('Vybrať si termín','Vybrat si termín')} ↗</a><Link className="personal-text-link" href={p('/sluzby/'+service.id)}>{c('Najprv spoznať službu','Nejprve poznat službu')} ↗</Link></> : <><p className="personal-eyebrow">{c('NEMUSÍŠ MAŤ VŠETKO VYRIEŠENÉ','NEMUSÍŠ MÍT VŠECHNO VYŘEŠENÉ')}</p><h3>{c('Stačí vedieť,','Stačí vědět,')}<br/><em>{c('čo teraz prežívaš.','co právě prožíváš.')}</em></h3><p>{c('Vyber svoju situáciu. Tu nájdeš službu, jej cenu a priamu cestu k termínu.','Vyber svou situaci. Tady najdeš službu, její cenu a přímou cestu k termínu.')}</p><a className="personal-text-link" href="#sluzby">{c('Radšej si pozriem celú ponuku','Raději si prohlédnu celou nabídku')} ↓</a></>}</div>
    </div>
  </section>;
}

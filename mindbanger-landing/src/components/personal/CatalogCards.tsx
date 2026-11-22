import {localeTag} from '@/lib/portal-locale';
import {portalLocale} from '@/lib/portal-locale-server';
import PortalElement from '@/components/client/PortalElement';
import TimeCreditOffers from './TimeCreditOffers';
import { homeServiceCopy } from './home-service-copy';
import Image from 'next/image';
import Link from '@/components/client/PortalLink';
import type { BookingSettings } from '@/lib/booking/model';
import { money } from '@/lib/booking/model';
import { durationLabel, serviceUrl } from '@/lib/booking/catalog';
import { servicePhoto as photo } from './service-photos';
import '@/components/client/coaching-topic-cards.css';
import './catalog.css';
import { localizedPath } from '@/lib/site-locale';
type Props = {
    settings: BookingSettings;
    account?: boolean;
    compact?: boolean;
    section?: 'all' | 'services' | 'packages';
    bookingFirst?: boolean;
    showPrice?: boolean;
    topicsOnly?: boolean;
};
export default async function CatalogCards({ settings, account = false, compact = false, section = 'all', bookingFirst = false, showPrice = true, topicsOnly = false }: Props) {
    const portalLanguage = await portalLocale();
    const cs = settings.locale === 'cs', c = (sk: string, cz: string) => cs ? cz : sk, p = (path: string) => localizedPath(path, settings.locale);
    const href = (id: string, pack = '') => p(account ? serviceUrl(id, pack).replace('/rezervacia?', '/ucet/rezervovat?') : serviceUrl(id, pack));
    return <>
  {section !== 'packages' && <><PortalElement as="div" className={'client-services client-topic-grid' + (compact ? ' home-service-grid' : '')}>{settings.services.filter(s => s.active && (!topicsOnly || !['rychly-rozhovor', 'premiovy-mentalny-koucing'].includes(s.id))).map(s => <PortalElement as="article" className="client-card client-service client-topic-card" key={s.id}>
   {photo(s.id) && <Link className="client-topic-photo" href={p(`/sluzby/${s.id}`)}><Image src={`/services/${photo(s.id).image}.webp`} alt={photo(s.id).imageAlt} width={720} height={405} sizes={compact ? '(max-width:700px) 100vw, (max-width:1000px) 50vw,33vw' : '(max-width:700px) 100vw, (max-width:1199px) 50vw,25vw'}/></Link>}
   <PortalElement as="div" className="client-topic-body"><PortalElement as="h3"><Link href={p(`/sluzby/${s.id}`)}>{s.name}</Link></PortalElement>{!topicsOnly && <PortalElement as="p" className="home-service-facts"><PortalElement as="strong">{durationLabel(s.minutes)} · {showPrice && <>{money(s.price, settings.currency, portalLanguage)} · </>}Online</PortalElement></PortalElement>}<PortalElement as="p">{compact ? (cs ? homeServiceCopy[s.id]?.summaryCs : homeServiceCopy[s.id]?.summary) || s.description : s.id === 'znovu-si-ver' ? c('Tvoj hlas má váhu. Spolu nájdeme, o čo sa môžeš oprieť, a pripravíme krok, na ktorý si trúfneš.', 'Tvůj hlas má váhu. Společně najdeme, o co se můžeš opřít, a připravíme krok, na který si troufneš.') : s.description}</PortalElement><PortalElement as="p" className="home-service-action"><Link className="client-button" href={account || bookingFirst ? href(s.id) : p(`/sluzby/${s.id}`)} aria-label={`${account || bookingFirst ? c('Vybrať termín', 'Vybrat termín') : (topicsOnly ? c('Preskúmať tému', 'Prozkoumat téma') : c('Spoznať službu', 'Poznat službu'))}: ${s.name}`}>{account || bookingFirst ? c('Vybrať termín ↗', 'Vybrat termín ↗') : (topicsOnly ? c('Preskúmať tému ↗', 'Prozkoumat téma ↗') : c('Spoznať službu ↗', 'Poznat službu ↗'))}</Link></PortalElement>{!topicsOnly && <Link href={account || bookingFirst ? p(`/sluzby/${s.id}`) : href(s.id)} aria-label={`${account || bookingFirst ? c('Podrobnosti služby', 'Podrobnosti služby') : c('Vybrať termín', 'Vybrat termín')}: ${s.name}`}>{account ? c('Podrobnosti služby ↗', 'Podrobnosti služby ↗') : bookingFirst ? c('Spoznať službu ↗', 'Poznat službu ↗') : c('Vybrať termín ↗', 'Vybrat termín ↗')}</Link>}</PortalElement>
  </PortalElement>)}</PortalElement>{compact && !topicsOnly && <PortalElement as="p" className="home-duration-note">{c('Uvedené trvanie označuje rezervačný slot. Podrobnosti nájdeš v pokynoch k priebehu stretnutia.', 'Uvedená délka označuje rezervační blok. Podrobnosti najdeš v pokynech k průběhu setkání.')}</PortalElement>}</>}
  {section !== 'services' && <>{section === 'all' && <PortalElement as="h2">{c('Časové balíky koučingu', 'Časové balíčky koučinku')}</PortalElement>}<TimeCreditOffers settings={settings} account={account}/></>}
 </>;
}

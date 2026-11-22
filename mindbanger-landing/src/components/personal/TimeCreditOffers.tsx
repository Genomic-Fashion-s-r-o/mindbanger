import {localeTag} from '@/lib/portal-locale';
import {portalLocale} from '@/lib/portal-locale-server';
import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { money, type BookingSettings } from '@/lib/booking/model';
import { serviceUrl } from '@/lib/booking/catalog';
import { creditTime } from '@/lib/booking/package-credit';
import { localizedPath } from '@/lib/site-locale';
import './catalog.css';
export default async function TimeCreditOffers({ settings, account = false }: {
    settings: BookingSettings;
    account?: boolean;
}) {
    const portalLanguage = await portalLocale();
    const cs = settings.locale === 'cs', c = (sk: string, cz: string) => cs ? cz : sk;
    const packs = settings.packages.filter(p => p.active && p.creditMinutes), hour = settings.services.find(s => s.id === 'individualny-coaching')?.price ?? 49;
    if (!packs.length)
        return null;
    return <PortalElement as="div" className="time-credit-offers">
  <PortalElement as="div" className="client-services catalog-package-grid">{packs.map(pack => {
            const hours = pack.creditMinutes! / 60, href = serviceUrl('individualny-coaching', pack.id), saving = hours * hour - pack.price;
            return <PortalElement as="article" className="client-card time-credit-card" key={pack.id}>
   <PortalElement as="p" className="personal-eyebrow">{c('ČAS PRE TEBA', 'ČAS PRO TEBE')}</PortalElement><PortalElement as="h3">{pack.name}</PortalElement>
   <PortalElement as="p" className="time-credit-price" style={{ fontSize: 42, lineHeight: 1.2, margin: 0 }}>{money(pack.price, settings.currency, portalLanguage)}</PortalElement>
   <PortalElement as="p"><PortalElement as="strong">{money(pack.price / hours, settings.currency, portalLanguage)} / {c('rezervačnú hodinu', 'rezervační hodinu')}</PortalElement>{saving > 0 && <><PortalElement as="br"/>{c('Ušetríš', 'Ušetříš')} {money(saving, settings.currency, portalLanguage)} {c('oproti samostatným hodinám.', 'oproti samostatným hodinám.')}</>}</PortalElement>
   <PortalElement as="p">{pack.description}</PortalElement><PortalElement as="ul"><PortalElement as="li">{creditTime(pack.creditMinutes!)} {c('na postupné čerpanie', 'k postupnému čerpání')}</PortalElement><PortalElement as="li">{c('Od 30 min po dlhšie stretnutia podľa dohody', 'Od 30 min po delší setkání podle domluvy')}</PortalElement><PortalElement as="li">{c('Platnosť 12 mesiacov od úhrady', 'Platnost 12 měsíců od zaplacení')}</PortalElement><PortalElement as="li">{c('Zostatok času vo svojom účte', 'Zůstatek času ve svém účtu')}</PortalElement></PortalElement>
   <Link className="client-button" href={localizedPath(account ? href.replace('/rezervacia?', '/ucet/rezervovat?') : href, settings.locale)}>{c('Vybrať balík a prvý termín', 'Vybrat balíček a první termín')} ↗</Link>
  </PortalElement>;
        })}</PortalElement>
  <PortalElement as="div" className="time-credit-how"><PortalElement as="h3">{c('Ako čas z balíka využiješ?', 'Jak čas z balíčku využiješ?')}</PortalElement><PortalElement as="p">{c('Pri kúpe si vyberieš prvý termín. Celý balík sa uhradí po jeho potvrdení. Ďalšie stretnutia si rezervuješ postupne podľa potreby a dostupných termínov — všetky dátumy nemusíš poznať dopredu. V účte zvolíš „Čerpať z balíka“ a za ďalší termín už neplatíš.', 'Při nákupu si vybereš první termín. Celý balíček se uhradí po jeho potvrzení. Další setkání si rezervuješ postupně podle potřeby a dostupných termínů — všechna data nemusíš znát dopředu. V účtu zvolíš „Čerpat z balíčku“ a za další termín už neplatíš.')}</PortalElement><PortalElement as="p">{c('Za 30-minútový termín sa odpočíta 30 min, za hodinový 1 h a za 1,5-hodinový 1,5 h. Napríklad z 5 h po rezervácii 1,5 h zostáva 3,5 h. Tému môžeš pri ďalšom rozhovore zmeniť.', 'Za 30minutový termín se odečte 30 min, za hodinový 1 h a za 1,5hodinový 1,5 h. Například z 5 h po rezervaci 1,5 h zbývá 3,5 h. Téma můžeš při dalším rozhovoru změnit.')}</PortalElement><PortalElement as="p" className="home-duration-note">{c('Balík obsahuje rezervačný čas vrátane prestávok medzi klientmi. Presný čas rozhovoru vysvetľujeme pri kalendári. Platí pre koučing, nie pre samostatnú riadenú relaxáciu a hypnózu. Teenage koučing je pre vek 13–19 rokov. Do 18 rokov rezervuje zákonný zástupca; od 18 rokov klient samostatne. Kredit zostáva viazaný na toho istého účastníka.', 'Balíček obsahuje rezervační čas včetně přestávek mezi klienty. Přesný čas rozhovoru vysvětlujeme u kalendáře. Platí pro koučink, nikoli pro samostatnou řízenou relaxaci a hypnózu. Teenage koučink je pro věk 13–19 let. Do 18 let rezervuje zákonný zástupce; od 18 let klient samostatně. Kredit zůstává vázaný na stejného účastníka.')}</PortalElement></PortalElement>
 </PortalElement>;
}

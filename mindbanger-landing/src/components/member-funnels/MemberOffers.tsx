import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { listClientPrograms } from '@/lib/online-programs/store';
import { ProgramOffer } from '@/components/programs/ProgramOffers';
export default async function MemberOffers({ userId }: {
    userId: string;
}) {
    const catalog = await listClientPrograms(userId), offers = catalog.offers.filter(o => o.quote.accessId && o.ownedCohorts.length === 0).slice(0, 3);
    if (!offers.length)
        return null;
    return <PortalElement as="section" className="op op-stack" style={{ margin: '32px 0' }}><PortalElement as="header"><PortalElement as="p" className="client-eyebrow">TVOJA ČLENSKÁ PONUKA</PortalElement><PortalElement as="h2">Pokračuj vo svojom tréningu.</PortalElement><PortalElement as="p">Výhodná cena aj tvoje bonusy zostávajú na jednom mieste.</PortalElement></PortalElement>{offers.map(offer => <ProgramOffer key={offer.id} offer={offer}/>)}<Link href="/ucet/materialy">Otvoriť moje bonusy zdarma →</Link></PortalElement>;
}

import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { z } from 'zod';
import { ProgramCard } from '@/components/client/ClientCards';
import { requireClient } from '@/lib/client-context';
import { listClientPrograms } from '@/lib/online-programs/store';
import { ProgramOffer, ProgramPaymentStatus } from '@/components/programs/ProgramOffers';
import '@/components/programs/online-programs.css';
import MyPrograms from '@/components/member-funnels/MyPrograms';
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        objednavka?: string;
    }>;
}) {
    const context = await requireClient(), { objednavka } = await searchParams;
    const data = await listClientPrograms(context.user.id);
    return <PortalElement as="div" className="op op-stack"><PortalElement as="header"><PortalElement as="p" className="client-eyebrow">VAŠE ONLINE PROGRAMY</PortalElement><PortalElement as="h1">Priestor pre nové návyky.</PortalElement><PortalElement as="p">Programy a materiály, ku ktorým sa môžeš vracať vlastným tempom.</PortalElement></PortalElement>
    {objednavka && z.uuid().safeParse(objednavka).success && <ProgramPaymentStatus orderId={objednavka}/>}
    {data.mine.length > 0 && <MyPrograms programs={data.mine}/>}
    {data.offers.length > 0 ? <PortalElement as="section" className="op-stack"><PortalElement as="h2">Dostupné programy</PortalElement>{data.offers.map(offer => <ProgramOffer key={offer.id} offer={offer}/>)}</PortalElement> : !data.mine.length && <><ProgramCard /><PortalElement as="p" className="op-notice">Pripravujeme prvý turnus. Po aktivácii prístupu tu nájdeš svoj program.</PortalElement></>}
  </PortalElement>;
}

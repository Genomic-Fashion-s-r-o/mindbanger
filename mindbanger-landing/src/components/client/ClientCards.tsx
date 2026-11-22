import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import type { BookingSettings } from '@/lib/booking/model';
import CatalogCards from '@/components/personal/CatalogCards';
export function ProgramCard() {
    return <PortalElement as="article" className="client-program"><PortalElement as="div" className="client-program-art" aria-hidden="true"><PortalElement as="span" className="client-orbit"/><PortalElement as="span" className="client-orbit second"/><PortalElement as="span" className="client-program-symbol">◒</PortalElement><PortalElement as="span">MALÉ KROKY. VLASTNÉ TEMPO.</PortalElement></PortalElement><PortalElement as="div" className="client-program-body"><PortalElement as="span" className="client-badge">November 2026 · približne 10 dní</PortalElement><PortalElement as="h3">Chuť na sladké<PortalElement as="br"/><PortalElement as="em">pod kontrolou.</PortalElement></PortalElement><PortalElement as="p">Približne 10-dňový program pre vedomejšiu prácu s návykmi a chuťou na sladké. Nezáväzný záujem o prvý novembrový turnus.</PortalElement><Link className="client-text-link" href="/produkty/chut-na-sladke">Spoznať program <PortalElement as="span" aria-hidden="true">↗</PortalElement></Link></PortalElement></PortalElement>;
}
export function ServiceCards({ settings }: {
    settings: BookingSettings;
    compact?: boolean;
}) {
    return <CatalogCards settings={settings} account/>;
}
export function EmptyAppointment({ enabled = false }: {
    enabled?: boolean;
}) {
    return <PortalElement as="section" className="client-next"><PortalElement as="div" className="client-calendar-icon" aria-hidden="true">▦</PortalElement><PortalElement as="div"><PortalElement as="p" className="client-eyebrow">TVOJE NAJBLIŽŠIE STRETNUTIE</PortalElement><PortalElement as="h2">Tvoj priestor<PortalElement as="br"/><PortalElement as="em">na chvíľu pre seba.</PortalElement></PortalElement><PortalElement as="p">Zatiaľ nemáš naplánované stretnutie. Vyber si z ponuky online služieb. {enabled ? 'Voľné termíny nájdete v kalendári.' : 'Novú dostupnosť otvoríme čoskoro.'}</PortalElement><Link className="client-button" href="/ucet/rezervovat">Vybrať službu a termín <PortalElement as="span" aria-hidden="true">↗</PortalElement></Link></PortalElement><PortalElement as="div" className="client-next-decoration" aria-hidden="true">◎</PortalElement></PortalElement>;
}

import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import PackageBalance from '@/components/client/PackageBalance';
export default function Page() { return <><PortalElement as="header" className="client-page-heading account-heading"><PortalElement as="div"><PortalElement as="p" className="client-eyebrow">TVOJE ZAKÚPENÉ STRETNUTIA</PortalElement><PortalElement as="h1">Moje <PortalElement as="em">balíčky.</PortalElement></PortalElement><PortalElement as="p">Zostatky sedení, rezervované termíny a priestor na ďalšiu spoluprácu.</PortalElement></PortalElement><Link className="client-button" href="/ucet/rezervacie">Moje rezervácie ↗</Link></PortalElement><PackageBalance title="Zostatky sedení"/></>; }

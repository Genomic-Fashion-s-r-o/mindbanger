'use client';
import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
export default function ErrorPage({ reset }: {
    reset: () => void;
}) {
    return <PortalElement as="section" className="client-card client-empty"><PortalElement as="h1">Účet sa nepodarilo načítať.</PortalElement><PortalElement as="p">Skúste stránku načítať znova. Ak problém pretrváva, prihláste sa opäť.</PortalElement><PortalElement as="button" className="client-button" onClick={reset}>Skúsiť znova</PortalElement><PortalElement as="p"><Link href="/prihlasenie">Späť na prihlásenie</Link></PortalElement></PortalElement>;
}

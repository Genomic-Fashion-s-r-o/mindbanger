import PortalElement from '@/components/client/PortalElement';
import Image from 'next/image';
import Link from '@/components/client/PortalLink';
import type { BookingSettings } from '@/lib/booking/model';
import { orderedServices } from '@/lib/booking/catalog';
import { localizedPath } from '@/lib/site-locale';
import { servicePhoto } from './service-photos';
import './related-services.css';
export default function RelatedServices({ settings, currentServiceId }: {
    settings: BookingSettings;
    currentServiceId: string;
}) {
    const cs = settings.locale === 'cs';
    const services = orderedServices(settings.services).filter(service => service.active && service.id !== currentServiceId && !['rychly-rozhovor', 'premiovy-mentalny-koucing'].includes(service.id));
    if (!services.length)
        return null;
    return <PortalElement as="section" className="related-services" aria-labelledby="related-services-title">
    <PortalElement as="div" className="related-services-heading">
      <PortalElement as="h2" id="related-services-title">{cs ? 'Prozkoumej i další témata' : 'Preskúmaj aj ďalšie témy'}</PortalElement>
      <PortalElement as="p">{cs ? 'Najdi téma, které je ti právě nejbližší.' : 'Nájdi tému, ktorá ti je práve najbližšia.'}</PortalElement>
    </PortalElement>
    <PortalElement as="ul" className="related-services-grid">
      {services.map(service => <PortalElement as="li" key={service.id}>
        <Link className="related-service" href={localizedPath(`/sluzby/${service.id}`, settings.locale)} prefetch={false}>
          <Image src={`/services/${servicePhoto(service.id).image}.webp`} alt="" width={80} height={80} sizes="80px"/>
          <PortalElement as="span" className="related-service-copy"><PortalElement as="span" className="related-service-name">{service.name}</PortalElement>
            <PortalElement as="span" className="related-service-more">{cs ? 'Zjistit více' : 'Zisti viac'} <PortalElement as="span" aria-hidden="true">↗</PortalElement></PortalElement>
          </PortalElement>
        </Link>
      </PortalElement>)}
    </PortalElement>
  </PortalElement>;
}

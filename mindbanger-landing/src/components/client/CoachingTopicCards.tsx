import {localeTag} from '@/lib/portal-locale';
import {portalLocale} from '@/lib/portal-locale-server';
import PortalElement from '@/components/client/PortalElement';
import { durationLabel } from '@/lib/booking/catalog';
import Image from 'next/image';
import Link from '@/components/client/PortalLink';
import type { BookingSettings } from '@/lib/booking/model';
import { money } from '@/lib/booking/model';
import { COACHING, COACHING_TOPICS } from '@/lib/booking/offer';
import { coachingServices } from '@/lib/coaching-services';
import { serviceDetails } from '@/lib/service-details';
import './coaching-topic-cards.css';
export default async function CoachingTopicCards({ settings }: {
    settings: BookingSettings;
}) {
    const portalLanguage = await portalLocale();
    const service = settings.services.find(s => s.id === COACHING.id && s.active);
    if (!service)
        return <PortalElement as="div" className="client-notice">Online coaching momentálne nie je v ponuke. Nové možnosti stretnutí zverejníme v tomto účte.</PortalElement>;
    const topics = COACHING_TOPICS.filter(t => t.id !== 'zatial-neviem');
    return <PortalElement as="div" className="client-services client-topic-grid">{topics.map((topic, i) => {
            const content = coachingServices.find(s => s.slug === topic.id);
            const detail = serviceDetails[topic.id];
            const href = '/ucet/rezervovat?' + new URLSearchParams({ sluzba: service.id, tema: topic.id }).toString();
            return <PortalElement as="article" className="client-card client-service client-topic-card" key={topic.id}>
      {detail && <Link className="client-topic-photo" href={href} aria-label={`Vybrať tému ${topic.name}`}><Image src={`/services/${detail.image}.webp`} alt={detail.imageAlt} width={720} height={405} sizes="(max-width:700px) 100vw,(max-width:1199px) 50vw,25vw"/></Link>}
      <PortalElement as="div" className="client-topic-body"><PortalElement as="div" className="client-service-meta"><PortalElement as="span">0{i + 1} · TÉMA COACHINGU</PortalElement><PortalElement as="span">{durationLabel(service.minutes)}</PortalElement></PortalElement><PortalElement as="h3">{topic.name}</PortalElement><PortalElement as="p">{content?.description || service.description}</PortalElement><PortalElement as="div" className="client-service-bottom"><PortalElement as="strong">{money(service.price, undefined, portalLanguage)} <PortalElement as="span">· online</PortalElement></PortalElement><Link href={href} aria-label={`Vybrať termín: ${topic.name}`}>Vybrať termín ↗</Link></PortalElement></PortalElement>
    </PortalElement>;
        })}</PortalElement>;
}

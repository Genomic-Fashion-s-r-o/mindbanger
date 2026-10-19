import Image from 'next/image';
import Link from 'next/link';
import type { BookingSettings } from '@/lib/booking/model';
import { money } from '@/lib/booking/model';
import { COACHING, COACHING_TOPICS } from '@/lib/booking/offer';
import { coachingServices } from '@/lib/coaching-services';
import { serviceDetails } from '@/lib/service-details';
import './coaching-topic-cards.css';

export default function CoachingTopicCards({ settings }: { settings: BookingSettings }) {
  const service = settings.services.find(s => s.id === COACHING.id && s.active);
  if (!service) return <div className="client-notice">Online coaching momentálne nie je v ponuke. Nové možnosti stretnutí zverejníme v tomto účte.</div>;
  const topics = COACHING_TOPICS.filter(t => t.id !== 'zatial-neviem');
  return <div className="client-services client-topic-grid">{topics.map((topic, i) => {
    const content = coachingServices.find(s => s.slug === topic.id);
    const detail = serviceDetails[topic.id];
    const href = '/ucet/rezervovat?' + new URLSearchParams({ sluzba: service.id, tema: topic.id }).toString();
    return <article className="client-card client-service client-topic-card" key={topic.id}>
      {detail && <Link className="client-topic-photo" href={href} aria-label={`Vybrať tému ${topic.name}`}><Image src={`/services/${detail.image}.webp`} alt={detail.imageAlt} width={720} height={405} sizes="(max-width:700px) 100vw,(max-width:1199px) 50vw,25vw" /></Link>}
      <div className="client-topic-body"><div className="client-service-meta"><span>0{i + 1} · TÉMA COACHINGU</span><span>{service.minutes} min</span></div><h3>{topic.name}</h3><p>{content?.description || service.description}</p><div className="client-service-bottom"><strong>{money(service.price)} <span>· online</span></strong><Link href={href} aria-label={`Vybrať termín: ${topic.name}`}>Vybrať termín ↗</Link></div></div>
    </article>;
  })}</div>;
}

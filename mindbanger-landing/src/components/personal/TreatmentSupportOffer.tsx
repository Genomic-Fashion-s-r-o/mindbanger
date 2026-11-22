import Link from 'next/link';
import type { BookingSettings } from '@/lib/booking/model';
import { money } from '@/lib/booking/model';
import { serviceUrl, slotDuration } from '@/lib/booking/catalog';
import { withBookingTopic } from '@/lib/booking/offer';
import { localizedPath } from '@/lib/site-locale';

export default function TreatmentSupportOffer({settings}:{settings:BookingSettings}) {
  const c=(sk:string,cs:string)=>settings.locale==='cs'?cs:sk;
  const quickConversation=settings.services.find(s=>s.active&&s.id==='rychly-rozhovor');
  const choices=[
    {id:'rychly-rozhovor',title:c('Rýchly rozhovor','Rychlý rozhovor'),description:c('Na prvé zoznámenie alebo jednu aktuálnu tému.','Na první seznámení nebo jedno aktuální téma.')},
    {id:'individualny-coaching',title:c('Individuálny koučing','Individuální koučink'),description:c('Na hlbší rozhovor, uvoľnenie a hľadanie ďalšieho kroku.','Na hlubší rozhovor, uvolnění a hledání dalšího kroku.')},
  ];
  return <section id="prve-stretnutie" className="belief-section support-first-talk" aria-labelledby="sales-offer-title">
    <h2 id="sales-offer-title">{c('Vyber si priestor','Vyber si prostor')} <em>{c('pre prvý rozhovor.','pro první rozhovor.')}</em></h2>
    <p>{c('Obe možnosti sú osobným rozhovorom so mnou. Vyber si podľa toho, čo práve potrebuješ.','Obě možnosti jsou osobním rozhovorem se mnou. Vyber si podle toho, co právě potřebuješ.')}</p>
    {quickConversation&&<p className="support-entry-note">{c('Začať môžeš aj krátkym rozhovorom za','Začít můžeš také krátkým rozhovorem za')} <strong>{money(quickConversation.price,settings.currency)}</strong>.</p>}
    <div className="support-talk-grid">{choices.map(choice=>{
      const service=settings.services.find(s=>s.active&&s.id===choice.id);
      if(!service)return null;
      const slot=slotDuration(service,settings.bufferMinutes);
      return <article className="support-talk-card" key={service.id}>
        <h3>{choice.title}</h3>
        <p className="support-talk-price">{money(service.price,settings.currency)}</p>
        <p className="support-talk-timing"><strong>{c(`${slot}-minútový rezervačný slot`,`${slot}minutový rezervační blok`)}</strong><br/>{c(`Samotný rozhovor trvá približne ${service.minutes} minút.`,`Samotný rozhovor trvá přibližně ${service.minutes} minut.`)}</p>
        <p>{choice.description}</p>
        <Link className="personal-button" href={localizedPath(withBookingTopic(serviceUrl(service.id),'opora-pocas-liecby'),settings.locale)} aria-label={`${c('Vybrať termín','Vybrat termín')}: ${choice.title}`}>{c('Vybrať termín','Vybrat termín')} ↗</Link>
      </article>;
    })}</div>
    <p className="support-talk-note">{c('Online cez Zoom. Jednorazová platba, bez predplatného a bez záväzku pokračovať.','Online přes Zoom. Jednorázová platba, bez předplatného a bez závazku pokračovat.')}</p>
  </section>;
}

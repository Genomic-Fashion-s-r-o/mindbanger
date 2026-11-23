import {withBookingTopic} from '@/lib/booking/offer';
import {TopicContext,TopicBookingActions,TopicBookingOffer} from './TopicBooking';
import type {ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AboutApproach from './AboutApproach';
import type { BookingSettings, Service } from '@/lib/booking/model';
import { money } from '@/lib/booking/model';
import { durationLabel, serviceUrl, sessionTimingNotice } from '@/lib/booking/catalog';
import type { ServiceSalesCopy } from './service-sales-copy';
import {localizedPath} from '@/lib/site-locale';
import {czechServiceSalesCopy} from './service-sales-copy-cs';
import './service-detail.css';
import './confidence-sales.css';

type Props = { service: Service; settings: BookingSettings; copy: ServiceSalesCopy; research?: ReactNode; guide?: ReactNode; guideAfterSituations?: boolean; firstMeeting?: ReactNode; faq?: ReactNode; benefits?: ReactNode; compactFlow?: boolean };
function Headline({ text }: { text: [string, string] }) { return <>{text[0]}<br/><em>{text[1]}</em></>; }

export default function ServiceSalesPage({ service, settings, copy:sourceCopy, research, guide, guideAfterSituations = false, firstMeeting, faq, benefits, compactFlow = false }: Props) {
  const cs=settings.locale==='cs',c=(sk:string,cz:string)=>cs?cz:sk,p=(path:string)=>localizedPath(path,settings.locale);
  const copy=cs?czechServiceSalesCopy(service.id,sourceCopy):sourceCopy;
  const support=service.id==='opora-pocas-liecby';
  const isTopic=!['relaxacia','premiovy-mentalny-koucing'].includes(service.id);
  const booking = p(withBookingTopic(serviceUrl(isTopic?'individualny-coaching':service.id),service.id));
  const packages = settings.packages.filter(p => p.active && !p.creditMinutes && p.serviceId === service.id);
  const contact = settings.email ? 'mailto:' + settings.email + '?subject=' + encodeURIComponent(service.name + c(' – otázka pred stretnutím',' – dotaz před setkáním')) : p('/#kontakt');
  const payment = settings.paymentMode === 'authorize_confirm'
    ? c('Pri rezervácii zadáš kartu cez Stripe. Suma sa najprv zablokuje a strhne sa až po mojom osobnom potvrdení termínu.','Při rezervaci zadáš kartu přes Stripe. Částka se nejprve zablokuje a strhne se až po mém osobním potvrzení termínu.')
    : c('Termín najprv osobne potvrdím. Následne zaplatíš jednorazovo cez Stripe vo svojom účte.','Termín nejprve osobně potvrdím. Následně zaplatíš jednorázově přes Stripe ve svém účtu.');
  const guideSection=guide??(<section className="belief-section belief-guide" aria-labelledby="sales-guide-title"><div className="belief-guide-card"><Image src="/miro-profile.jpg" alt="Mgr. Miroslav Jobus" width={200} height={200} sizes="(max-width: 760px) 96px, 144px"/><p className="personal-eyebrow">{c('TVOJ SPRIEVODCA','TVŮJ PRŮVODCE')}</p><h3>Mgr. Miroslav Jobus</h3><p>{c('Osobne. S rešpektom.','Osobně. S respektem.')}<br/>{c('V tvojom tempe.','Ve tvém tempu.')}</p><Link className="personal-text-link" href={p('/#certifikacie')}>{c('Moja odbornosť a členstvá','Moje odbornost a členství')} ↗</Link></div>
      <div><p className="personal-eyebrow">{c('MÁŠ SA O KOHO OPRIEŤ','MÁŠ SE O KOHO OPŘÍT')}</p><h2 id="sales-guide-title"><Headline text={copy.guide}/></h2><p>{copy.guideIntro}</p><blockquote>„{copy.quote}“</blockquote><details className="belief-about-details"><summary>{c('Viac o mojich skúsenostiach a prístupe','Více o mých zkušenostech a přístupu')}</summary><AboutApproach locale={settings.locale}/><Link className="personal-text-link" href={p('/#o-mne')}>{c('Spoznaj ma bližšie','Poznej mě blíže')} ↗</Link></details></div>
    </section>);
  return <main id="obsah" className="service-landing confidence-sales" data-service={service.id}>
    <nav className="service-breadcrumb" aria-label={c('Späť na ponuku','Zpět na nabídku')}><Link href={p('/#sluzby')}>← {c('Všetky témy na rozhovor','Všechna témata k rozhovoru')}</Link></nav>
    <section className="belief-hero" aria-labelledby="sales-title"><div className="belief-hero-copy">
      <p className="personal-eyebrow">{isTopic?c('TÉMA INDIVIDUÁLNEHO KOUČINGU','TÉMA INDIVIDUÁLNÍHO KOUČINKU')+' · '+service.name:copy.eyebrow}</p><h1 id="sales-title"><Headline text={copy.headline}/></h1>
      {support?<p>{c('Keď ti liečba mení bežný deň, nemusíš všetko niesť sám. Môžeš sa so mnou porozprávať o tom, čo práve prežívaš, a hľadať oporu pre najbližšie dni. Ukážem ti, ako môžeš nájsť viac pokoja aj v neistote.','Když ti léčba mění běžný den, nemusíš všechno nést sám. Můžeš si se mnou promluvit o tom, co právě prožíváš, a hledat oporu pro nejbližší dny. Ukážu ti, jak můžeš najít více klidu i v nejistotě.')}</p>:<><p className="belief-lead">{copy.lead}</p><p>{copy.intro}</p><TopicContext settings={settings} topicId={service.id}/></>}
      <div className="personal-actions">{isTopic?<TopicBookingActions settings={settings} topicId={service.id}/>:<Link className="personal-button" href={booking}>{copy.cta}</Link>}<a className="personal-text-link" href="#co-ziskas">{c('Čo mi stretnutie prinesie','Co mi setkání přinese')} ↓</a>{research&&!compactFlow&&<a className="personal-text-link" href="#odborne-zdroje">{c('Čo ukazujú výskumy','Co ukazují výzkumy')} ↓</a>}</div>
      {support?<p className="belief-facts">Online {c('cez','přes')} Zoom</p>:<p className="belief-facts"><strong>{durationLabel(service.minutes)}</strong><span aria-hidden="true">·</span><strong>{money(service.price,settings.currency)}</strong><span aria-hidden="true">·</span>Online {c('cez','přes')} Zoom</p>}
      <p className="belief-small">{c('Jedno stretnutie. Bez predplatného a bez záväzku pokračovať.','Jedno setkání. Bez předplatného a bez závazku pokračovat.')}</p>
    </div><figure className="belief-hero-visual"><Image src={'/services/' + copy.image + '.webp'} alt={copy.imageAlt} width={1440} height={810} sizes="(max-width: 760px) 100vw, 46vw" preload/><figcaption><span>{copy.imageCaption[0]}</span><strong>{copy.imageCaption[1]}</strong><small>{c('Ilustračný obrázok','Ilustrační obrázek')}</small></figcaption></figure></section>
    <div className="belief-route" aria-label={c('Naša spoločná cesta','Naše společná cesta')}>{copy.route.map((text,i)=><span key={text}><b aria-hidden="true">0{i+1}</b>{text}</span>)}</div>

    <section className="belief-section" aria-labelledby="sales-situations-title"><div className="belief-section-heading"><div><p className="personal-eyebrow">{c('SPOZNÁVAŠ SA V TOM?','POZNÁVÁŠ SE V TOM?')}</p><h2 id="sales-situations-title"><Headline text={copy.situationsHeading}/></h2></div><p>{copy.situationsIntro}</p></div>
      <div className="belief-situations">{copy.situations.map(([title,body],i)=><article key={title}><span className="belief-number" aria-hidden="true">0{i+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    </section>
    {guideAfterSituations&&guideSection}
    {benefits??(<section id="co-ziskas" className="belief-section belief-benefits" aria-labelledby="sales-benefits-title"><div className="belief-section-heading"><div><p className="personal-eyebrow">{c('NA ČOM BUDEME SPOLU PRACOVAŤ','NA ČEM BUDEME SPOLEČNĚ PRACOVAT')}</p><h2 id="sales-benefits-title"><Headline text={copy.benefitsHeading}/></h2></div><p>{copy.benefitsIntro}</p></div>
      <div className="belief-benefit-grid">{copy.benefits.map(([label,title,body],i)=><article key={title}><span className="belief-number">0{i+1} / {label}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="belief-inline-action"><p><strong>{copy.action[0]}</strong>{copy.action[1]}</p><Link className="personal-button" href={support?'#prve-stretnutie':booking}>{support?c('Vybrať si prvý rozhovor','Vybrat si první rozhovor'):isTopic?c('Vybrať hodinový koučing ↗','Vybrat hodinový koučink ↗'):copy.cta}</Link></div>
    </section>)}
    {!guideAfterSituations&&guideSection}
    {!compactFlow&&research}
    {!compactFlow&&(<section id="priebeh" className="belief-section" aria-labelledby="sales-process-title"><div className="belief-section-heading"><div><p className="personal-eyebrow">{c('OD PRVÉHO ROZHOVORU K TVOJEJ SKÚSENOSTI','OD PRVNÍHO ROZHOVORU K TVÉ ZKUŠENOSTI')}</p><h2 id="sales-process-title">{c('Takto na tom','Takto na tom')} <em>{c('budeme pracovať.','budeme pracovat.')}</em></h2></div><p>{c('Nemusíš mať pripravené otázky ani odpovede. Začneme tam, kde práve si.','Nemusíš mít připravené otázky ani odpovědi. Začneme tam, kde právě jsi.')}</p></div>
      <ol className="belief-process">{copy.steps.map(([title,body],i)=><li key={title}><span className="belief-number" aria-hidden="true">0{i+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
      <div className="belief-outcome"><span className="personal-eyebrow">{c('S ČÍM CHCEM, ABY SI ODCHÁDZAL','S ČÍM CHCI, ABYS ODCHÁZEL')}</span><p>{copy.outcome}</p></div>
    </section>)}
    {firstMeeting??(<section id="prve-stretnutie" className="belief-section belief-offer" aria-labelledby="sales-offer-title"><div><p className="personal-eyebrow">{c('TVOJ PRVÝ KROK','TVŮJ PRVNÍ KROK')}</p><h2 id="sales-offer-title"><Headline text={copy.offer}/></h2><p>{copy.offerIntro}</p><ul className="belief-offer-list">{copy.included.map(text=><li key={text}>{text}</li>)}</ul></div>
      {isTopic?<TopicBookingOffer settings={settings} topicId={service.id}/>:(<div className="belief-price-card"><span className="personal-eyebrow">{service.name}</span><p className="belief-price">{money(service.price,settings.currency)}</p><p><strong>{durationLabel(service.minutes)} · Online {c('cez','přes')} Zoom</strong></p>{isTopic?<TopicBookingActions settings={settings} topicId={service.id}/>:<Link className="personal-button" href={booking}>{copy.cta}</Link>}<p className="belief-small">{c('Jednorazová platba. Bez predplatného.','Jednorázová platba. Bez předplatného.')}<br/>{c('O pokračovaní rozhodneš ty.','O pokračování rozhodneš ty.')}</p><a className="personal-text-link" href={contact}>{c('Chcem sa najprv niečo opýtať','Chci se nejprve na něco zeptat')} ↗</a></div>)}
      {!isTopic&&<div className="topic-offer-wide"><TopicBookingOffer settings={settings} topicId={service.id}/></div>}
      {packages.length>0&&<div className="belief-packages">{packages.map(pack=><article key={pack.id}><p className="personal-eyebrow">{c('PRIESTOR POKRAČOVAŤ','PROSTOR POKRAČOVAT')}</p><h3>{pack.name}</h3><p><strong>{money(pack.price,settings.currency)}</strong> · {c('počet stretnutí','počet setkání')}: {pack.sessions} · {durationLabel(service.minutes)} {c('na každý termín','na každý termín')}</p><p>{pack.description}</p>{pack.extras&&<p>{c('V programe navyše','V programu navíc')}: {pack.extras}.</p>}<p>{c('Každé stretnutie má vlastný termín. Zostatok balíčka nájdeš vo svojom účte.','Každé setkání má vlastní termín. Zůstatek balíčku najdeš ve svém účtu.')}</p><Link className="personal-button" href={p(withBookingTopic(serviceUrl(service.id,pack.id),service.id))}>{c('Vybrať prvý termín balíčka','Vybrat první termín balíčku')} ↗</Link></article>)}</div>}
    </section>)}
    {compactFlow&&research}
    {faq??(<section className="belief-section belief-faq" aria-labelledby="sales-faq-title"><div><p className="personal-eyebrow">{c('DOBRÉ VEDIEŤ PRED REZERVÁCIOU','DOBRÉ VĚDĚT PŘED REZERVACÍ')}</p><h2 id="sales-faq-title">{c('Ešte','Ještě')} <em>{c('váhaš?','váháš?')}</em></h2><p>{c('Ak tu svoju odpoveď nenájdeš,','Pokud zde svou odpověď nenajdeš,')} <a href={contact}>{c('napíš mi','napiš mi')}</a>.</p></div><div>
      {copy.faq.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
      <details><summary>{c('Musím sa rozhodnúť pre viac stretnutí?','Musím se rozhodnout pro více setkání?')}</summary><p>{c('Nie. Začať môžeš jedným stretnutím. Na konci si spolu zhrnieme, čo bolo užitočné a čomu sa chceš prípadne venovať nabudúce. O pokračovaní rozhodneš ty.','Ne. Začít můžeš jedním setkáním. Na konci si společně shrneme, co bylo užitečné a čemu se chceš případně věnovat příště. O pokračování rozhodneš ty.')}</p></details>
      <details><summary>{c('Ako prebieha rezervácia a platba?','Jak probíhá rezervace a platba?')}</summary><p>{c('Vyberieš si termín, overíš email a dokončíš údaje účtu a objednávky.','Vybereš si termín, ověříš e-mail a dokončíš údaje účtu a objednávky.')} {payment} {c('Po potvrdení a úhrade dostaneš Zoom odkaz emailom aj do účtu.','Po potvrzení a platbě dostaneš odkaz na Zoom e-mailem i do účtu.')}</p></details>
      <details><summary>{c('Koľko času si mám vyhradiť?','Kolik času si mám vyhradit?')}</summary><p>{cs?`${durationLabel(service.minutes)} je rezervační blok. Samotné setkání trvá přibližně ${service.minutes} minut.`:sessionTimingNotice(service,settings.bufferMinutes)} {c('Priprav si pokojné súkromné miesto a pripojenie na videohovor.','Připrav si klidné soukromé místo a připojení k videohovoru.')}</p></details>
      <details><summary>{c('Čo ak potrebujem zmeniť termín?','Co když potřebuji změnit termín?')}</summary><p>{c('Rezerváciu spravuješ vo svojom účte. Všetko je o komunikácii; kontakt môžeš využiť práve pri zmene termínu a spolu nájdeme riešenie.','Rezervaci spravuješ ve svém účtu. Vše je o komunikaci; kontakt můžeš využít právě při změně termínu a společně najdeme řešení.')}</p></details>
    </div></section>)}
    <section className="belief-final"><p className="personal-eyebrow">{c('DOPRAJ SI SVOJ ĎALŠÍ KROK','DOPŘEJ SI SVŮJ DALŠÍ KROK')}</p><h2><Headline text={copy.final}/></h2><p>{copy.finalIntro}</p>{isTopic?<TopicBookingActions settings={settings} topicId={service.id}/>:<Link className="personal-button" href={booking}>{copy.cta}</Link>}<p className="belief-small">{support?c('Online cez Zoom · Bez predplatného · Bez záväzku pokračovať','Online přes Zoom · Bez předplatného · Bez závazku pokračovat'):<>{durationLabel(service.minutes)} · {money(service.price,settings.currency)} · Online · {c('Bez záväzku pokračovať','Bez závazku pokračovat')}</>}</p></section>
  </main>;
}

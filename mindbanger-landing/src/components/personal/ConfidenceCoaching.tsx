import {withBookingTopic} from '@/lib/booking/offer';
import {TopicBookingActions,TopicBookingOffer} from './TopicBooking';
import AboutApproach from './AboutApproach';
import Image from 'next/image';
import Link from 'next/link';
import type { BookingSettings, Service } from '@/lib/booking/model';
import { money } from '@/lib/booking/model';
import { serviceUrl, durationLabel, sessionTimingNotice } from '@/lib/booking/catalog';
import './service-detail.css';
import './confidence-sales.css';
import ServiceSalesPage from './ServiceSalesPage';
import {serviceSalesCopy} from './service-sales-copy';

export const confidenceDescription = 'Znovu si ver. Individuálny online koučing s Miroslavom Jobusom: pomenuj svoje silné stránky, priprav dôležitý rozhovor a nájdi odvahu pre vlastný krok. Máš sa o koho oprieť.';

const situations = [
  ['Svoj názor si necháš pre seba.', 'Vieš, čo chceš povedať. Potom ustúpiš, aby bol pokoj.'],
  ['Jedna chyba ti vezme istotu.', 'To, čo sa nepodarilo, zatieni všetko, čo už dokážeš.'],
  ['U druhých hľadáš potvrdenie.', 'Rozhodnutie je tvoje, ale potrebuješ počuť, že je správne.'],
  ['Svoj krok stále odkladáš.', 'Čakáš, kým si budeš veriť viac. A tvoje plány čakajú s tebou.'],
];
const steps = [
  ['Povieš, čo ťa brzdí.', 'Vypočujem ťa. Spolu vyberieme jednu situáciu, v ktorej chceš zmenu.'],
  ['Nájdeme tvoje pevné body.', 'Pomenujeme tvoje schopnosti, skúsenosti a to, na čom ti záleží.'],
  ['Pripravíme tvoju odpoveď.', 'Vyskúšame si, ako povedať svoj názor, nastaviť hranicu alebo sa rozhodnúť.'],
  ['Dohodneme konkrétny krok.', 'Vyberieme, čo chceš urobiť, kedy začneš a o čo sa pri tom oprieš.'],
];

export default function ConfidenceCoaching({ service, settings }: { service: Service; settings: BookingSettings }) {
  if(settings.locale==='cs')return <ServiceSalesPage service={service} settings={settings} copy={serviceSalesCopy['individualny-coaching']}/>;
  const booking = withBookingTopic(serviceUrl('individualny-coaching'),service.id);
  const payment = settings.paymentMode === 'authorize_confirm'
    ? 'Pri rezervácii zadáš kartu cez Stripe. Suma sa najprv zablokuje a strhne sa až po mojom osobnom potvrdení termínu.'
    : 'Termín najprv osobne potvrdím. Následne zaplatíš jednorazovo cez Stripe vo svojom účte.';
  const packages = settings.packages.filter(p => p.active && p.serviceId === service.id);
  const contact = settings.email ? 'mailto:' + settings.email + '?subject=' + encodeURIComponent('Znovu si ver – otázka pred stretnutím') : '/#kontakt';

  return <main id="obsah" className="service-landing confidence-sales">
    <nav className="service-breadcrumb" aria-label="Späť na ponuku"><Link href="/#sluzby">← Všetky témy na rozhovor</Link></nav>
    <section className="belief-hero" aria-labelledby="confidence-title">
      <div className="belief-hero-copy">
        <p className="personal-eyebrow">TÉMA INDIVIDUÁLNEHO KOUČINGU · ZNOVU SI VER</p>
        <h1 id="confidence-title">Tvoj hlas má váhu.<br/><em>Začni mu veriť.</em></h1>
        <p className="belief-lead">Viac istoty v rozhodnutiach. Viac odvahy byť sám sebou.</p>
        <p>Možno pochybuješ o svojich rozhodnutiach alebo svoj názor radšej nepovieš nahlas. Spolu budeme hľadať, o čo sa môžeš v sebe oprieť a aký ďalší krok dáva zmysel práve tebe.</p>
        <div className="personal-actions"><a className="personal-button" href="#prve-stretnutie">Chcem sa o tom porozprávať <span aria-hidden="true">↓</span></a></div>
        <p className="belief-small">Online cez Zoom · V tvojom tempe · Bez záväzku pokračovať.</p>
      </div>
      <figure className="belief-hero-visual">
        <Image src="/services/rozhovor-podpora.webp" alt="Dve kreslá v svetlom, pokojnom priestore na rozhovor" width={1440} height={960} sizes="(max-width: 760px) 100vw, 46vw" preload/>
        <figcaption><span>Priestor pre teba.</span><strong>Tu nemusíš nič dokazovať.</strong><small>Ilustračný obrázok</small></figcaption>
      </figure>
    </section>
    <div className="belief-route" aria-label="Naša spoločná cesta"><span><b>01</b> Pochopiť, čo ťa brzdí</span><span><b>02</b> Oprieť sa o svoje silné stránky</span><span><b>03</b> Urobiť vlastný krok</span></div>

    <section className="belief-section" aria-labelledby="belief-situations-title">
      <div className="belief-section-heading"><div><p className="personal-eyebrow">SPOZNÁVAŠ SA V TOM?</p><h2 id="belief-situations-title">Toľko toho zvládaš.<br/><em>A stále o sebe pochybuješ.</em></h2></div><p>V práci, vo vzťahoch aj pri rozhodnutiach.<br/>Začnime tým, čo ťa obmedzuje práve teraz.</p></div>
      <div className="belief-situations">{situations.map(([title, body], i) => <article key={title}><span className="belief-number">0{i + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    </section>

    <section id="co-ziskas" className="belief-section belief-benefits" aria-labelledby="belief-benefits-title">
      <div className="belief-section-heading"><div><p className="personal-eyebrow">OD POCHYBNOSTÍ K VLASTNEJ OPORE</p><h2 id="belief-benefits-title">Neostaneš pri „čo ak“.<br/>Pomôžem ti <em>pripraviť si „takto začnem“.</em></h2></div><p>Na rozhovore budeme pracovať na troch veciach, ktoré využiješ v bežnom živote.</p></div>
      <div className="belief-benefit-grid">
        <article><span className="belief-number">01 / TVOJE SILNÉ STRÁNKY</span><h3>Viem, o čo sa oprieť.</h3><p>Pomenujeme tvoje schopnosti a zvládnuté situácie. Konkrétne dôvody veriť si, ku ktorým sa vieš vrátiť.</p></article>
        <article><span className="belief-number">02 / TVOJ HLAS</span><h3>Viem povedať, čo potrebujem.</h3><p>Pripravíme slová pre dôležitý rozhovor, vlastný názor alebo hranicu. Tak, aby si sa s nimi vedel stotožniť.</p></article>
        <article><span className="belief-number">03 / TVOJ ĎALŠÍ KROK</span><h3>Viem, čím začnem.</h3><p>Pripravíme spolu zvládnuteľný krok, s ktorým ty sa sám vieš stotožniť. Taký, pri ktorom môžeš začať zbierať vlastnú skúsenosť a budeš si istý, že: &quot;Toto dokážem!&quot;</p></article>
      </div>
      <div className="belief-inline-action"><p><strong>Nemusíš si veriť vo všetkom.</strong> Vyber jednu situáciu. Na nej začneme.</p><TopicBookingActions settings={settings} topicId={service.id}/></div>
    </section>

    <section className="belief-section belief-guide" aria-labelledby="belief-guide-title">
      <div className="belief-guide-card"><Image src="/miro-profile.jpg" alt="Mgr. Miroslav Jobus" width={200} height={200} sizes="(max-width: 760px) 96px, 144px"/><p className="personal-eyebrow">TVOJ SPRIEVODCA</p><h3>Mgr. Miroslav Jobus</h3><p>Osobne. S rešpektom.<br/>V tvojom tempe.</p><Link className="personal-text-link" href="/#certifikacie">Moja odbornosť a členstvá ↗</Link></div>
      <div><p className="personal-eyebrow">MÁŠ SA O KOHO OPRIEŤ</p><h2 id="belief-guide-title">Ty prinesieš svoju tému.<br/><em>Ja budem stáť pri tebe.</em></h2><p>Vypočujem ťa a pomôžem ti všimnúť si schopnosti, ktoré pochybnosti často zatienia. Spolu pripravíme slová pre dôležitý rozhovor, tvoju hranicu alebo rozhodnutie. Na stretnutí si ich môžeš vyskúšať s mojou oporou.</p><blockquote>„Spolu budeme hľadať riešenia, ktorým budeš veriť ty.“</blockquote><details className="belief-about-details"><summary>Viac o mojich skúsenostiach a prístupe</summary><AboutApproach/><Link className="personal-text-link" href="/#o-mne">Spoznaj ma bližšie ↗</Link></details></div>
    </section>

    <section id="priebeh" className="belief-section" aria-labelledby="belief-process-title">
      <div className="belief-section-heading"><div><p className="personal-eyebrow">JEDEN ROZHOVOR. KONKRÉTNY ĎALŠÍ KROK.</p><h2 id="belief-process-title">Takto na tom <em>budeme pracovať.</em></h2></div><p>Nemusíš mať pripravené otázky ani odpovede. Začneme tam, kde práve si.</p></div>
      <ol className="belief-process">{steps.map(([title, body], i) => <li key={title}><span className="belief-number">0{i + 1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
      <div className="belief-outcome"><span className="personal-eyebrow">S ČÍM CHCEM, ABY SI ODCHÁDZAL</span><p>Následne z rozhovoru odídeš s jasnou predstavou, verím, že plný energie a presvedčenia vo vlastnú schopnosť veci riešiť a meniť s odhodlaním a maximálnou silou.</p></div>
    </section>

    <section id="prve-stretnutie" className="belief-section belief-offer" aria-labelledby="belief-offer-title">
      <div><p className="personal-eyebrow">TVOJ PRVÝ KROK</p><h2 id="belief-offer-title">Daj priestor sebe.<br/><em>Začnime jedným stretnutím.</em></h2><p>Vyber si čas, ktorý ti vyhovuje. Tvoju tému, tempo aj ďalší postup dohodneme spolu.</p><ul className="belief-offer-list"><li>Individuálny rozhovor len pre tvoju situáciu</li><li>Moja plná pozornosť a spoločné hľadanie riešení</li><li>Konkrétny krok, ktorý si pripravíme spolu</li></ul></div>
      <TopicBookingOffer settings={settings} topicId={service.id}/>
      {packages.length > 0 && <div className="belief-packages">{packages.map(p => <article key={p.id}><h3>{p.name}</h3><p>{p.sessions} stretnutí · {durationLabel(service.minutes)} na každý termín · {money(p.price)}</p><p>{p.description}</p><Link className="personal-text-link" href={withBookingTopic(serviceUrl(service.id, p.id),service.id)}>Vybrať balíček ↗</Link></article>)}</div>}
    </section>

    <section className="belief-section belief-faq" aria-labelledby="belief-faq-title"><div><p className="personal-eyebrow">DOBRÉ VEDIEŤ PRED REZERVÁCIOU</p><h2 id="belief-faq-title">Ešte <em>váhaš?</em></h2><p>Ak tu svoju odpoveď nenájdeš, <a href={contact}>napíš mi</a>.</p></div><div>
      <details><summary>Čo ak neviem, ako začať?</summary><p>Stačí povedať „neviem, kde začať“. Pomôžem ti otázkami. Nemusíš si nič nacvičiť a ty rozhoduješ, čo chceš zdieľať.</p></details>
      <details><summary>Musím sa rozhodnúť pre viac stretnutí?</summary><p>Nie. Začneme jedným rozhovorom nad konkrétnou situáciou. Na konci si spolu zhrnieme, o čo sa môžeš oprieť a čo chceš vyskúšať. O prípadnom pokračovaní rozhodneš ty.</p></details>
      <details><summary>Ako prebieha rezervácia a platba?</summary><p>Vyberieš si termín, overíš email a dokončíš údaje účtu a objednávky. {payment} Po potvrdení a úhrade dostaneš Zoom odkaz emailom aj do účtu.</p></details>
      <details><summary>Koľko času si mám vyhradiť?</summary><p>{sessionTimingNotice(service, settings.bufferMinutes)} Priprav si pokojné miesto a pripojenie na videohovor.</p></details>
      <details><summary>Čo ak potrebujem zmeniť termín?</summary><p>Rezerváciu spravuješ vo svojom účte. Všetko je o komunikácií, všade je uvedený na mňa kontakt, ktorý práve na zmenu termínu vieš využiť a spolu nájdeme riešenie.</p></details>
    </div></section>

    <section className="belief-final"><p className="personal-eyebrow">TVÔJ ĎALŠÍ KROK NEMUSÍ ČAKAŤ</p><h2>Koľkokrát si podržal druhých?<br/><em>Teraz dopraj oporu sebe.</em></h2><p>Vyber si jednu situáciu, v ktorej si chceš viac veriť.<br/>Spolu nájdeme, ako začať.</p><TopicBookingActions settings={settings} topicId={service.id}/><p className="belief-small">{durationLabel(service.minutes)} · {money(service.price)} · Online · Bez záväzku pokračovať</p></section>
  </main>;
}

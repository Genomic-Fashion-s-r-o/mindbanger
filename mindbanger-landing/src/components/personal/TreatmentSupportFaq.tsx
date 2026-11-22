import Link from 'next/link';
import type { BookingSettings } from '@/lib/booking/model';
import { localizedPath } from '@/lib/site-locale';

export default function TreatmentSupportFaq({settings}:{settings:BookingSettings}) {
  const c=(sk:string,cs:string)=>settings.locale==='cs'?cs:sk;
  const p=(path:string)=>localizedPath(path,settings.locale);
  const contact=settings.email?`mailto:${settings.email}`:p('/#kontakt');
  const payment=settings.paymentMode==='authorize_confirm'
    ?c('Pri rezervácii sa suma na karte zablokuje a strhne sa až po mojom potvrdení termínu.','Při rezervaci se částka na kartě zablokuje a strhne se až po mém potvrzení termínu.')
    :c('Termín najprv potvrdím, potom zaplatíš cez Stripe vo svojom účte.','Termín nejprve potvrdím, potom zaplatíš přes Stripe ve svém účtu.');
  return <section className="belief-section belief-faq support-faq" aria-labelledby="sales-faq-title">
    <div><p className="personal-eyebrow">{c('PRED PRVÝM ROZHOVOROM','PŘED PRVNÍM ROZHOVOREM')}</p><h2 id="sales-faq-title">{c('Ešte','Ještě')} <em>{c('váhaš?','váháš?')}</em></h2></div>
    <div className="support-faq-answers">
      <details><summary>{c('Čo ak mám málo energie alebo nechcem relaxáciu?','Co když mám málo energie nebo nechci relaxaci?')}</summary><p>{c('Tempo prispôsobíme tvojim silám. Môžeš si dať prestávku, odmietnuť relaxáciu alebo ju kedykoľvek zastaviť. Pri zdravotných obmedzeniach sa riadime odporúčaním tvojho lekára.','Tempo přizpůsobíme tvým silám. Můžeš si dát přestávku, odmítnout relaxaci nebo ji kdykoli zastavit. Při zdravotních omezeních se řídíme doporučením tvého lékaře.')}</p></details>
      <details><summary>{c('Musím uvádzať diagnózu?','Musím uvádět diagnózu?')}</summary><p>{c('Nie. Dôverný opis je nepovinný; po rezervácii ho môžeš doplniť v účte so samostatným súhlasom a kedykoľvek vymazať. Zdravotnú dokumentáciu neposielaj.','Ne. Důvěrný popis je nepovinný; po rezervaci ho můžeš doplnit v účtu se samostatným souhlasem a kdykoli vymazat. Zdravotní dokumentaci neposílej.')}</p></details>
      <details><summary>{c('Ako prebieha platba a pripojenie?','Jak probíhá platba a připojení?')}</summary><p>{payment} {c('Po potvrdení a úhrade dostaneš Zoom odkaz emailom aj do účtu.','Po potvrzení a platbě dostaneš odkaz na Zoom e-mailem i do účtu.')}</p></details>
      <details><summary>{c('Čo ak potrebujem zmeniť termín?','Co když potřebuji změnit termín?')}</summary><p>{c('Termín spravuješ vo svojom účte. Pri zmene mi napíš; platia','Termín spravuješ ve svém účtu. Při změně mi napiš; platí')} <Link href={p('/podmienky')}>{c('podmienky zmeny a storna','podmínky změny a storna')}</Link>.</p></details>
      <p className="support-faq-contact">{c('Máš inú otázku?','Máš jinou otázku?')} <a href={contact}>{c('Napíš mi.','Napiš mi.')}</a></p>
    </div>
    <aside className="support-faq-warning" aria-labelledby="support-faq-warning-title">
      <h3 id="support-faq-warning-title">{c('Zdravotné upozornenie','Zdravotní upozornění')}</h3>
      <p>{c('Ide o nezdravotnícky koučing, ktorý nenahrádza lekársku ani psychologickú starostlivosť. Nie je určený na naliehavú pomoc. Pri náhlom ohrození zdravia alebo života volaj','Jde o nezdravotnický koučink, který nenahrazuje lékařskou ani psychologickou péči. Není určen pro naléhavou pomoc. Při náhlém ohrožení zdraví nebo života volej')} <a href="tel:155">155</a> {c('alebo','nebo')} <a href="tel:112">112</a>.</p>
    </aside>
  </section>;
}

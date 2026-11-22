import Image from 'next/image';
import Link from 'next/link';
import { localizedPath, type SiteLocale } from '@/lib/site-locale';

export default function TreatmentSupportGuide({locale='sk'}:{locale?:SiteLocale}) {
  const c=(sk:string,cs:string)=>locale==='cs'?cs:sk;
  return <section className="belief-section belief-guide support-personal-guide" aria-labelledby="sales-guide-title">
    <figure className="support-guide-photo"><Image src="/miro-profile.jpg" alt="Miroslav Jobus" width={200} height={200} sizes="(max-width: 760px) 96px, 144px"/></figure>
    <div className="support-guide-copy">
      <h2 id="sales-guide-title">{c('Tvoj príbeh nebudem zľahčovať.','Tvůj příběh nebudu zlehčovat.')}</h2>
      <p><strong>{c('Volám sa Miroslav Jobus a budem ti osobne k dispozícii ako mentálny kouč.','Jmenuji se Miroslav Jobus a budu ti osobně k dispozici jako mentální kouč.')}</strong></p>
      <p>{c('Keď človek prechádza liečbou, nemusí vždy potrebovať ďalšie rady. Niekedy potrebuje predovšetkým niekoho, kto ho pozorne vypočuje, pomôže mu usporiadať myšlienky a nájsť trochu viac pokoja v každodennom živote.','Když člověk prochází léčbou, nemusí vždy potřebovat další rady. Někdy potřebuje především někoho, kdo ho pozorně vyslechne, pomůže mu uspořádat myšlenky a najít trochu více klidu v každodenním životě.')}</p>
      <p>{c('Pri našom stretnutí dostaneš priestor hovoriť aj o strachu, neistote či únave. Bez posudzovania a bez očakávania, že musíš byť neustále silný.','Při našem setkání dostaneš prostor mluvit také o strachu, nejistotě či únavě. Bez posuzování a bez očekávání, že musíš být neustále silný.')}</p>
      <p><strong>{c('Nie som lekár ani psychoterapeut. Som tu ako sprievodca pri hľadaní psychickej opory popri tvojej odbornej liečbe.','Nejsem lékař ani psychoterapeut. Jsem tu jako průvodce při hledání psychické opory vedle tvé odborné léčby.')}</strong></p>
      <Link className="personal-text-link" href={localizedPath('/moj-pristup',locale)}>{c('Viac o mojom prístupe a skúsenostiach','Více o mém přístupu a zkušenostech')} ↗</Link>
    </div>
  </section>;
}

import {withBookingTopic} from '@/lib/booking/offer';
import Link from 'next/link';
import type {BookingSettings} from '@/lib/booking/model';
import {money} from '@/lib/booking/model';
import {serviceUrl} from '@/lib/booking/catalog';
import {localizedPath} from '@/lib/site-locale';
import './topic-booking.css';

type Props={settings:BookingSettings;topicId:string};
function choices({settings,topicId}:Props){
 const cs=settings.locale==='cs',c=(sk:string,cz:string)=>cs?cz:sk;
 const teen=topicId==='teenager-pod-tlakom';
 const hour=settings.services.find(s=>s.active&&s.id===(teen?'teenager-pod-tlakom':'individualny-coaching'));
 const quick=settings.services.find(s=>s.active&&s.id==='rychly-rozhovor');
 return {c,teen,offers:[
  ...(hour?[{id:hour.id,title:teen?c('Koučing pre tínedžera','Koučink pro teenagera'):c('Individuálny koučing','Individuální koučink'),duration:'1 h',price:money(hour.price,settings.currency),description:teen?c('Hodinový priestor pre tému mladého človeka. Koučing je určený mladým vo veku 13–19 rokov. Do 18 rokov rezervuje a platí zákonný zástupca zo svojho účtu a potvrdí súhlas s účasťou. Od 18 rokov si termín rezervuješ a platíš samostatne.','Hodinový prostor pro téma mladého člověka. Koučink je určen mladým ve věku 13–19 let. Do 18 let rezervuje a platí zákonný zástupce ze svého účtu a potvrdí souhlas s účastí. Od 18 let si termín rezervuješ a platíš samostatně.'):c('Priestor preskúmať tvoju situáciu, možnosti a vlastný ďalší krok. Tému aj tempo si dohodneme spolu.','Prostor prozkoumat tvou situaci, možnosti a vlastní další krok. Téma i tempo si dohodneme společně.'),href:localizedPath(withBookingTopic(serviceUrl(hour.id),topicId),settings.locale)}]:[]),
  ...(quick?[{id:quick.id,title:teen?c('Rýchly rozhovor','Rychlý rozhovor'):c('Rýchly rozhovor','Rychlý rozhovor'),duration:'30 min',price:money(quick.price,settings.currency),description:teen?c('Úvodný rozhovor pre rodiča o potrebách dieťaťa alebo priamo pre plnoletého tínedžera vo veku 18–19 rokov.','Úvodní rozhovor pro rodiče o potřebách dítěte nebo přímo pro plnoletého teenagera ve věku 18–19 let.'):c('Spoznaj môj prístup, ujasni si, či je koučing pre teba, alebo preber jednu aktuálnu situáciu. Bez záväzku pokračovať.','Poznej můj přístup, ujasni si, zda je koučink pro tebe, nebo prober jednu aktuální situaci. Bez závazku pokračovat.'),href:localizedPath(withBookingTopic(serviceUrl(quick.id),topicId),settings.locale)}]:[]),
 ]};
}

export function TopicContext({settings,topicId}:Props){
 const c=(sk:string,cz:string)=>settings.locale==='cs'?cz:sk;
 const text=topicId==='relaxacia'
  ?c('Pri tomto stretnutí ťa sprevádzam riadenou relaxáciou a hypnózou. Ak chceš svoju situáciu najprv prebrať v rozhovore, môžeš si vybrať hodinový koučing alebo Rýchly rozhovor.','Při tomto setkání tě provázím řízenou relaxací a hypnózou. Pokud chceš svou situaci nejprve probrat v rozhovoru, můžeš si vybrat hodinový koučink nebo Rychlý rozhovor.')
  :topicId==='premiovy-mentalny-koucing'
  ?c('Individuálny koučing s väčším časovým priestorom. Začať môžeš aj hodinovým koučingom alebo krátkym úvodným rozhovorom.','Individuální koučink s větším časovým prostorem. Začít můžeš také hodinovým koučinkem nebo krátkým úvodním rozhovorem.')
  :topicId==='teenager-pod-tlakom'
  ?c('Téma individuálneho koučingu pre tínedžerov vo veku 13–19 rokov. Rozhovor prispôsobíme tomu, čo mladý človek práve potrebuje. Rodič môže začať krátkym úvodným rozhovorom o spolupráci.','Téma individuálního koučinku pro teenagery ve věku 13–19 let. Rozhovor přizpůsobíme tomu, co mladý člověk právě potřebuje. Rodič může začít krátkým úvodním rozhovorem o spolupráci.')
  :c('Jedna z tém individuálneho koučingu. Tému aj tempo rozhovoru prispôsobíme tomu, čo práve potrebuješ.','Jedno z témat individuálního koučinku. Téma i tempo rozhovoru přizpůsobíme tomu, co právě potřebuješ.');
 return <p className="topic-context">{text}</p>;
}

export function TopicBookingActions(props:Props){
 if(props.topicId==='opora-pocas-liecby')return <div className="topic-booking-actions"><a className="personal-button" href="#prve-stretnutie">{props.settings.locale==='cs'?'Vybrat si první rozhovor':'Vybrať si prvý rozhovor'}</a></div>;
 const {offers,c,teen}=choices(props);
 return <div className="topic-booking-actions">{offers.map((offer,i)=><Link key={offer.id} className={i===0?'personal-button':'personal-button topic-button-outline'} href={offer.href} aria-label={`${c('Rezervovať','Rezervovat')}: ${offer.title} · ${offer.duration} · ${offer.price}`}>{i===0&&!teen?c('Koučing','Koučink'):offer.title} · {offer.duration} · {offer.price} <span aria-hidden="true">↗</span></Link>)}</div>;
}

export function TopicBookingOffer(props:Props){
 const {offers,c,teen}=choices(props);
 return <div className="topic-booking-offer"><h3>{c('Ako chceš začať?','Jak chceš začít?')}</h3><div className="topic-booking-grid">{offers.map(offer=><article key={offer.id}><h4>{offer.title}</h4><p className="topic-booking-price">{offer.duration} · {offer.price}</p><p>{offer.description}</p><Link className="personal-button" href={offer.href} aria-label={`${c('Rezervovať','Rezervovat')}: ${offer.title} · ${offer.duration}`}>{c('Vybrať termín','Vybrat termín')} <span aria-hidden="true">↗</span></Link></article>)}</div><p className="topic-booking-note">{teen?c('Pre vek 13–19 rokov. Do 18 rokov rezervuje zákonný zástupca; od 18 rokov klient samostatne. Rýchly rozhovor je pre rodiča alebo plnoletého tínedžera.','Pro věk 13–19 let. Do 18 let rezervuje zákonný zástupce; od 18 let klient samostatně. Rychlý rozhovor je pro rodiče nebo plnoletého teenagera.'):c('Online cez Zoom. Jedno stretnutie bez predplatného. Čas rozhovoru je vysvetlený pri rezervačnom kalendári.','Online přes Zoom. Jedno setkání bez předplatného. Čas rozhovoru je vysvětlen u rezervačního kalendáře.')}</p></div>;
}

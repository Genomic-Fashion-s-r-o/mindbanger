import type {Metadata} from 'next';
import Image from 'next/image';
import {BookOpen, Brain, CalendarDays, MessagesSquare, Video} from 'lucide-react';
import PageShare from '@/components/personal/PageShare';
import ProgramInterestForm from '@/components/personal/ProgramInterestForm';
import {ProgramSales,publicProgramOffer} from '@/components/programs/ProgramSales';
import {PersonalShell} from '@/components/personal/PersonalShell';
import {getLocalizedBookingSettings} from '@/lib/booking/store';
import {siteLocale} from '@/lib/site-locale-server';
import './sugar-program.css';

export const dynamic='force-dynamic';

export async function generateMetadata():Promise<Metadata>{
  const cs=(await siteLocale())==='cs',path=cs?'/cz/produkty/chut-na-sladke':'/produkty/chut-na-sladke';
  return {title:cs?'Chuť na sladké pod kontrolou – listopad 2026 | Mindbanger':'Chuť na sladké pod kontrolou – November 2026 | Mindbanger',description:cs?'Přibližně 10denní online skupinový program práce s návyky a chutí na sladké. Nezávazná registrace zájmu o listopadový běh.':'Približne 10-dňový online skupinový program práce s návykmi a chuťou na sladké. Nezáväzná registrácia záujmu o novembrový turnus.',alternates:{canonical:path,languages:{sk:'/produkty/chut-na-sladke','cs-CZ':'/cz/produkty/chut-na-sladke','x-default':'/produkty/chut-na-sladke'}},openGraph:{images:[cs?'/programs/chut-na-sladke-banner-cs-20261024.webp':'/programs/chut-na-sladke-banner-sk-20261024.webp']}};
}

export default async function Page(){
  const paidOffer=await publicProgramOffer('chut-na-sladke');
  if(paidOffer)return <ProgramSales offer={paidOffer}/>;
  const {settings,locale}=await getLocalizedBookingSettings(),cs=locale==='cs',c=(sk:string,cz:string)=>cs?cz:sk;
  const situations=cs?[
    ['Po náročném dni','Sladké je rychlá pauza nebo odměna. Až později si uvědomíš, jak automaticky jsi po něm sáhl.'],
    ['Když přijde napětí nebo nuda','Chceš lépe poznat situace, které tvoji chuť spouštějí, a vytvořit si prostor pro jinou volbu?'],
    ['Když se chuť na sladké stále vrací','Možná už jsi zkoušel omezit sladkosti nebo držet dietu. Chvíli to fungovalo, ale pak přišel stres, únava či oslavy a staré návyky se vrátily.']
  ]:[
    ['Po náročnom dni','Sladké je rýchla pauza alebo odmena. Až neskôr si uvedomíš, ako automaticky si po ňom siahol.'],
    ['Keď príde napätie či nuda','Chceš lepšie spoznať situácie, ktoré tvoju chuť spúšťajú, a vytvoriť si priestor na inú voľbu?'],
    ['Keď sa chuť na sladké stále vracia','Možno si už skúšal obmedziť sladkosti alebo držať diétu. Chvíľu to fungovalo, ale potom prišiel stres, únava či oslavy a staré návyky sa vrátili.']
  ];
  const programContents=[
    {icon:CalendarDays,title:c('10 dní vedeného programu','10 dní vedeného programu'),description:c('Každý deň nová lekcia a praktická úloha. Programom prechádzaš postupne.','Každý den nová lekce a praktický úkol. Programem procházíš postupně.')},
    {icon:Video,title:c('2 živé skupinové videohovory','2 živé skupinové videohovory'),description:c('Spoločné stretnutia, odpovede na otázky a podpora pri zavádzaní zmien.','Společná setkání, odpovědi na otázky a podpora při zavádění změn.')},
    {icon:MessagesSquare,title:c('Skupinový chat','Skupinový chat'),description:c('Priestor na otázky, zdieľanie skúseností a priebežné odpovede.','Prostor pro otázky, sdílení zkušeností a průběžné odpovědi.')},
    {icon:Brain,title:c('Mentálne a relaxačné cvičenia','Mentální a relaxační cvičení'),description:c('Techniky na vedomejšiu prácu s chuťami, stresom a návykmi.','Techniky pro vědomější práci s chutěmi, stresem a návyky.')},
    {icon:BookOpen,title:c('Praktické bonusy a recepty','Praktické bonusy a recepty'),description:c('Inšpirácia, ktorú môžeš využiť aj po skončení programu.','Inspirace, kterou můžeš využít i po skončení programu.')}
  ];
  const faqs=cs?[
    ['Jak dlouho program trvá?','Přibližně 10 dní. První běh plánujeme na listopad 2026. Přesný začátek a průběh oznámíme potvrzeným zájemcům e-mailem.'],
    ['Je registrace placená nebo závazná?','Ne. Nyní se zapisuješ pouze do seznamu zájemců. Nevzniká objednávka ani povinnost platby. Před přihlášením dostaneš informace o ceně a všechny další podrobnosti.'],
    ['Znamená program, že už nikdy nebudu chtít sladké?','Takový výsledek neslibuji. Zaměříme se na porozumění návykům a vědomější práci s chutí na sladké. Program posílí tvoji osobní volbu při rozhodování, zda si sladké v danou chvíli dát, a v jaké formě.'],
    ['Jak mohu svůj zájem zrušit?','Pomocí odkazu v e-mailu s informacemi o programu nebo zprávou na miroslav@mindbanger.com. Přihlášení k účtu není potřeba.']
  ]:[
    ['Ako dlho program trvá?','Približne 10 dní. Prvý turnus plánujeme na november 2026. Presný začiatok a priebeh oznámime potvrdeným záujemcom emailom.'],
    ['Je registrácia platená alebo záväzná?','Nie. Teraz sa zapisuješ iba do zoznamu záujemcov. Nevzniká objednávka ani povinnosť platby. Pred prihlásením do turnusu dostaneš podrobné informácie o cene a všetky ostatné podrobnosti.'],
    ['Znamená program, že už nikdy nebudem chcieť sladké?','Taký výsledok nesľubujem. Zameriame sa na porozumenie návykom a vedomejšiu prácu s chuťou na sladké. Program výrazne posilní tvoju osobnú voľbu pri rozhodovaní, či si sladké v danom okamihu dať, a v akej forme.'],
    ['Ako môžem svoj záujem zrušiť?','Cez odkaz v emaile s informáciami o programe alebo správou na miroslav@mindbanger.com. Nie je potrebné prihlásenie do účtu.']
  ];
  return <PersonalShell settings={settings}><main id="obsah" className="sugar-program">
    <section className="sugar-hero">
      <div>
        <p className="personal-eyebrow">{c('10-DŇOVÝ ONLINE PROGRAM · NOVEMBER 2026','10DENNÍ ONLINE PROGRAM · LISTOPAD 2026')}</p>
        <h1>{c('Nebuď otrokom','Nebuď otrokem')}<br/><em>cukru.</em></h1>
        <h2 className="sugar-hero-subtitle">{c('Získaj väčšiu kontrolu nad chuťou na sladké.','Získej větší kontrolu nad chutí na sladké.')}</h2>
        <div className="sugar-mobile-share"><p>{c('Poznáš niekoho, koho by to zaujímalo?','Znáš někoho, koho by to zajímalo?')}</p><PageShare compact compactLabel={c('Zdieľať','Sdílet')}/></div>
        <p className="sugar-hero-description">{c('Sladké po obede, večerné maškrtenie alebo neustála chuť na niečo dobré? Počas 10 dní ťa prevediem praktickým programom, v ktorom sa naučíš lepšie rozumieť svojim chutiam, rozpoznávať ich spúšťače a budovať nové návyky bez extrémnych zákazov.','Sladké po obědě, večerní mlsání nebo neustálá chuť na něco dobrého? Během 10 dní tě provedu praktickým programem, ve kterém se naučíš lépe rozumět svým chutím, rozpoznávat jejich spouštěče a budovat nové návyky bez extrémních zákazů.')}</p>
        <a className="personal-button sugar-hero-cta" href="#registracny-formular">{c('Chcem prednostné miesto','Chci přednostní místo')}</a>
        <p className="sugar-registration-note">{c('Prvý turnus pripravujeme na november 2026. Registrácia záujmu je bezplatná a nezáväzná.','První běh připravujeme na listopad 2026. Registrace zájmu je bezplatná a nezávazná.')}</p>
      </div>
      <figure><video controls playsInline preload="none" width={1280} height={720} poster={cs?'/programs/chut-na-sladke-banner-cs-20261024.webp':'/programs/chut-na-sladke-banner-sk-20261024.webp'} aria-label={c('Miroslav Jobus predstavuje program Chuť na sladké pod kontrolou','Miroslav Jobus představuje program Chuť na sladké pod kontrolou')}><source src="/programs/chut-na-sladke-uvod-20261022.mp4" type="video/mp4"/>{c('Tvoj prehliadač nepodporuje prehrávanie videa.','Tvůj prohlížeč nepodporuje přehrávání videa.')} <a href="/programs/chut-na-sladke-uvod-20261022.mp4">{c('Otvoriť video','Otevřít video')}</a>.</video><figcaption>{c('Malými krokmi začneš ovládať svoju chuť na sladké.','Malými kroky začneš ovládat svou chuť na sladké.')}</figcaption><a className="personal-button sugar-video-cta" href="#registracny-formular">{c('Chcem prednostné miesto','Chci přednostní místo')} ↓</a><div className="sugar-mobile-actions sugar-video-share"><PageShare compact compactLabel={c('Zdieľať','Sdílet')}/></div></figure>
    </section>
    <section id="spoznavas-sa" className="sugar-section">
      <p className="personal-eyebrow">{c('SPOZNÁVAŠ SA V TOM?','POZNÁVÁŠ SE V TOM?')}</p>
      <h2>{c('Nie vždy ide','Ne vždy jde')} <em>{c('iba o sladké.','jen o sladké.')}</em></h2>
      <div className="sugar-grid">{situations.map(([title,body],i)=><article key={title}><span>0{i+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      <p className="sugar-situations-summary">{c('Naučíš sa lepšie rozpoznávať, čo tvoju chuť spúšťa, a postupne získavať väčšiu slobodu v rozhodovaní.','Naučíš se lépe rozpoznávat, co tvoji chuť spouští, a postupně získávat větší svobodu v rozhodování.')}</p>
      <div className="sugar-mobile-actions"><a className="personal-button" href="#registracny-formular">{c('Chcem prednostné miesto','Chci přednostní místo')} ↓</a><PageShare compact compactLabel={c('Zdieľať','Sdílet')}/></div>
    </section>
    <section id="obsah-programu" className="sugar-section sugar-contents" aria-labelledby="sugar-contents-title">
      <div className="sugar-contents-panel">
        <h2 id="sugar-contents-title">{c('Čo ťa čaká','Co tě čeká')} <em>{c('počas 10 dní?','během 10 dní?')}</em></h2>
        <ul className="sugar-contents-list">
          {programContents.map(({icon:Icon,title,description})=><li key={title}>
            <span className="sugar-contents-icon"><Icon size={24} strokeWidth={1.6} aria-hidden="true"/></span>
            <div><h3>{title}</h3><p>{description}</p></div>
          </li>)}
        </ul>
      </div>
    </section>
    <section id="registracia" className="sugar-registration" aria-labelledby="sugar-registration-title"><div><p className="personal-eyebrow">{c('BUĎ PRI PRVOM TURNUSE','BUĎ U PRVNÍHO BĚHU')}</p><h2 id="sugar-registration-title">{c('Buď medzi prvými, ktorí získajú kontrolu nad chuťou na sladké.','Buď mezi prvními, kteří získají kontrolu nad chutí na sladké.')}</h2><p>{c('Pripravujem prvý turnus 10-dňového vedeného programu','Připravuji první běh 10denního vedeného programu')} <strong>{c('Nebuď otrokom cukru!','Nebuď otrokem cukru!')}</strong></p><p>{c('Zanechaj svoj e-mail a získaj prednostné informácie o spustení programu, termíne a','Zanech svůj e-mail a získej přednostní informace o spuštění programu, termínu a')} <strong>{c('špeciálnej uvádzacej ponuke pre prvých účastníkov.','speciální zaváděcí nabídce pro první účastníky.')}</strong></p><p><em>{c('Registrácia záujmu je bezplatná a nezáväzná. Nejde o objednávku ani rezerváciu miesta. Presný termín, konečnú cenu a podmienky účasti dostaneš pred otvorením predaja.','Registrace zájmu je bezplatná a nezávazná. Nejde o objednávku ani rezervaci místa. Přesný termín, konečnou cenu a podmínky účasti dostaneš před otevřením prodeje.')}</em></p></div><div id="registracny-formular" className="sugar-form-card" data-clarity-mask="true"><p className="sugar-form-badge">{c('NEZÁVÄZNE A BEZ PLATBY','NEZÁVAZNĚ A BEZ PLATBY')}</p><h3>{c('Chcem prednostné miesto','Chci přednostní místo')}</h3><p className="sugar-no-obligation">{c('Zadaj email a podrobnosti o prvom turnuse ti pošlem medzi prvými. Teraz nič neplatíš a miesto si ešte záväzne nerezervuješ.','Zadej e-mail a podrobnosti o prvním běhu ti pošlu mezi prvními. Nyní nic neplatíš a místo si ještě závazně nerezervuješ.')}</p><ProgramInterestForm locale={locale}/></div></section>
    <section className="sugar-section sugar-guide"><Image src="/miro-profile.jpg" alt="Mgr. Miroslav Jobus" width={120} height={120}/><div><p className="personal-eyebrow">{c('PROGRAMOM ŤA BUDEM SPREVÁDZAŤ OSOBNE','PROGRAMEM TĚ BUDU PROVÁZET OSOBNĚ')}</p><h2>Mgr. Miroslav <em>Jobus.</em></h2><p>{c('Každý deň ťa prevediem novým návykom a uvedomením, ako ťa potraviny ovplyvňujú, čo ti prinášajú a čo naopak berú.','Každý den tě provedu novým návykem a uvědoměním, jak tě potraviny ovlivňují, co ti přinášejí a co ti naopak berou.')}</p><p>{c('Naučíš sa lepšie vnímať vlastné telo a pochopiť, ako ovládať chute v každodennom živote spojenom s radosťou aj bežnými kritickými životnými situáciami.','Naučíš se lépe vnímat vlastní tělo a pochopit, jak ovládat chutě v každodenním životě spojeném s radostí i náročnými životními situacemi.')}</p><p>{c('Verím, že to bude 10 dní plných výziev aj zábavy pri živých komunitných videohovoroch.','Věřím, že to bude 10 dní plných výzev i zábavy při živých komunitních videohovorech.')}</p></div></section>
    <section className="sugar-section sugar-faq"><h2>{c('Možno sa','Možná se')} <em>{c('pýtaš.','ptáš.')}</em></h2>{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}<p className="sugar-small">{c('Program má vzdelávací a koučovací charakter. Využíva poznatky z oblasti výživy, psychológie a tvorby návykov. Nenahrádza individuálnu zdravotnú ani nutričnú starostlivosť.','Program má vzdělávací a koučovací charakter. Využívá poznatky z oblasti výživy, psychologie a tvorby návyků. Nenahrazuje individuální zdravotní ani nutriční péči.')}</p></section>
    <div className="sugar-mobile-final-cta"><a className="personal-button" href="#registracny-formular">{c('Chcem prednostné miesto','Chci přednostní místo')} ↑</a></div>
  </main></PersonalShell>;
}

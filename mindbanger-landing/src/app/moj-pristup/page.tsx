import type { Metadata } from 'next';
import Link from 'next/link';
import { PersonalShell } from '@/components/personal/PersonalShell';
import ApproachDetails from '@/components/personal/ApproachDetails';
import { getLocalizedBookingSettings } from '@/lib/booking/store';
import { localizedPath } from '@/lib/site-locale';
import { siteLocale } from '@/lib/site-locale-server';
import './approach.css';

export async function generateMetadata(): Promise<Metadata> {
  const cs = (await siteLocale()) === 'cs';
  const path = cs ? '/cz/moj-pristup' : '/moj-pristup';
  const title = cs ? 'Můj přístup, zkušenosti a metody | MINDBANGER' : 'Môj prístup, skúsenosti a metódy | MINDBANGER';
  const description = cs ? 'Poznej zkušenosti Miroslava Jobuse a jeho přístup ke koučinku, práci s myšlenkami, hodnotami a dobrovolnými technikami.' : 'Spoznaj skúsenosti Miroslava Jobusa a jeho prístup ku koučingu, práci s myšlienkami, hodnotami a dobrovoľnými technikami.';
  return { title, description, alternates: { canonical: path, languages: { sk: '/moj-pristup', 'cs-CZ': '/cz/moj-pristup', 'x-default': '/moj-pristup' } }, openGraph: { title, description, url: path, locale: cs ? 'cs_CZ' : 'sk_SK', type: 'website' } };
}

export default async function ApproachPage() {
  const { settings, locale } = await getLocalizedBookingSettings();
  const c = (sk: string, cs: string) => locale === 'cs' ? cs : sk;
  const p = (path: string) => localizedPath(path, locale);
  return <PersonalShell settings={settings}><main id="obsah" className="approach-page">
    <header className="approach-hero">
      <Link className="personal-text-link" href={p('/#o-mne')}>← {c('Späť na úvodnú stránku', 'Zpět na úvodní stránku')}</Link>
      <p className="personal-eyebrow">{c('MÔJ PRÍSTUP · MGR. MIROSLAV JOBUS', 'MŮJ PŘÍSTUP · MGR. MIROSLAV JOBUS')}</p>
      <h1>{c('Každý človek má vlastný príbeh.', 'Každý člověk má vlastní příběh.')}<br/><em>{c('A každá cesta môže byť iná.', 'A každá cesta může být jiná.')}</em></h1>
      <p className="approach-lead">{c('Na našich stretnutiach spoločne preskúmame tvoju situáciu, pomenujeme, na čom ti záleží, a budeme hľadať praktické kroky, ktoré dávajú zmysel práve tebe.', 'Na našich setkáních společně prozkoumáme tvou situaci, pojmenujeme, na čem ti záleží, a budeme hledat praktické kroky, které dávají smysl právě tobě.')}</p>
    </header>
    <ApproachDetails locale={locale}/>
    <section className="approach-methods" aria-labelledby="approach-methods-title">
      <h2 id="approach-methods-title">{c('Ako s metódami pracujeme', 'Jak s metodami pracujeme')}</h2>
      <p>{c('Základom je rozhovor, otázky a práca s tvojimi hodnotami a myšlienkami. Podľa situácie a tvojho záujmu môžeme zapojiť aj meditačné či duchovné techniky a cvičenia. Vopred si vysvetlíme ich zmysel a priebeh; ty sa rozhodneš, či ich chceš vyskúšať.', 'Základem je rozhovor, otázky a práce s tvými hodnotami a myšlenkami. Podle situace a tvého zájmu můžeme zapojit také meditační či duchovní techniky a cvičení. Předem si vysvětlíme jejich smysl a průběh; ty se rozhodneš, zda je chceš vyzkoušet.')}</p>
      <p>{c('Samostatné stretnutie riadenej relaxácie a hypnózy má vlastný priebeh, ktorý si pred začiatkom vysvetlíme.', 'Samostatné setkání řízené relaxace a hypnózy má vlastní průběh, který si před začátkem vysvětlíme.')} <Link className="personal-text-link" href={p('/sluzby/relaxacia')}>{c('Viac o relaxácii a hypnóze', 'Více o relaxaci a hypnóze')} ↗</Link></p>
    </section>
    <div className="approach-actions"><Link className="personal-button" href={p('/#rezervacny-kalendar')}>{c('Rezervovať stretnutie', 'Rezervovat setkání')}</Link><Link className="personal-text-link" href={p('/#certifikacie')}>{c('Vzdelávanie a certifikácie', 'Vzdělávání a certifikace')} ↗</Link></div>
  </main></PersonalShell>;
}

import Image from 'next/image';
import Link from 'next/link';
import { localizedPath } from '@/lib/site-locale';
import './about-coach.css';

export default function AboutCoach({ locale = 'sk' }: { locale?: 'sk' | 'cs' | 'en' }) {
  const cs = locale === 'cs';
  return <section id="o-mne" className="personal-section home-about-coach" aria-labelledby="about-coach-title">
    <div className="home-about-portrait">
      <p className="personal-eyebrow">{cs?'TVŮJ PRŮVODCE ROZHOVOREM':'TVOJ SPRIEVODCA ROZHOVOROM'}</p>
      <h2 id="about-coach-title">Mgr. Miroslav <em>Jobus.</em></h2>
      <figure>
        <Image src="/coaching-zuzka.webp" alt={cs?'Miroslav Jobus během klidného rozhovoru v příjemném prostředí zaměřeném na osobní rozvoj a mentální koučink.':'Miroslav Jobus počas pokojného rozhovoru v príjemnom prostredí zameranom na osobný rozvoj a mentálny koučing.'} width={1440} height={1080} sizes="(max-width:760px) 100vw, (max-width:1000px) 48vw, 540px"/>
      </figure>
      <p className="home-about-motto">{cs?'„Podívej se na svůj život z jiného úhlu.“':'„Pozri sa na svoj život z iného uhla.“'}</p>
    </div>
    <div className="home-about-story home-about-summary">
      <h3>{cs?'Každý člověk má vlastní příběh. A každá cesta může být jiná.':'Každý človek má vlastný príbeh. A každá cesta môže byť iná.'}</h3>
      <p>{cs?'Na našich setkáních společně prozkoumáme tvou situaci, pojmenujeme, na čem ti záleží, a budeme hledat praktické kroky, které dávají smysl právě tobě.':'Na našich stretnutiach spoločne preskúmame tvoju situáciu, pomenujeme, na čom ti záleží, a budeme hľadať praktické kroky, ktoré dávajú zmysel práve tebe.'}</p>
      <Link className="personal-text-link" href={localizedPath('/moj-pristup',locale)}>{cs?'Více o mém přístupu, zkušenostech a metodách':'Viac o mojom prístupe, skúsenostiach a metódach'} ↗</Link>
    </div>
  </section>;
}

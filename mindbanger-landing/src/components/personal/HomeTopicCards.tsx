import Image from 'next/image';
import Link from 'next/link';
import type { BookingSettings } from '@/lib/booking/model';
import { localizedPath } from '@/lib/site-locale';
import { servicePhoto } from './service-photos';
import '@/components/client/coaching-topic-cards.css';
import './catalog.css';

type LocalizedText = readonly [sk: string, cs: string];
type TopicVoice = { headline: LocalizedText; paragraphs: readonly LocalizedText[] };

const topicVoices: Record<string, TopicVoice> = {
  'znovu-si-ver': {
    headline: ['Chcem si viac veriť a menej o sebe pochybovať.', 'Chci si více věřit a méně o sobě pochybovat.'],
    paragraphs: [['Vieš podržať druhých, ale pri sebe váhaš? Môžeme sa porozprávať o tom, čo ti berie istotu a o čo sa môžeš v sebe oprieť.', 'Umíš podržet druhé, ale u sebe váháš? Můžeme si popovídat o tom, co ti bere jistotu a o co se můžeš v sobě opřít.']],
  },
  'teenager-pod-tlakom': {
    headline: ['Chcem, aby ma niekto naozaj počúval.', 'Chci, aby mě někdo opravdu poslouchal.'],
    paragraphs: [
      ['Ako učiteľ, ktorého študenti často nazývajú „iný“, poznám tlak aj neistotu, ktoré mladí ľudia prežívajú. Môžeš prísť so svojím príbehom.', 'Jako učitel, kterého studenti často nazývají „jiný“, znám tlak i nejistotu, které mladí lidé prožívají. Můžeš přijít se svým příběhem.'],
      ['Ak si rodič, rozumiem ti aj ako rodič, ktorý si podobnými situáciami už viackrát prešiel. Vďaka skúsenostiam s problémami mladých ľudí vo veku 13–19 rokov sa viem na situáciu pozrieť aj očami tvojho dieťaťa. Spolu môžeme hľadať cestu k lepšiemu porozumeniu.', 'Pokud jsi rodič, rozumím ti i jako rodič, který si podobnými situacemi už několikrát prošel. Díky zkušenostem s problémy mladých lidí ve věku 13–19 let se dokážu na situaci podívat i očima tvého dítěte. Společně můžeme hledat cestu k lepšímu porozumění.'],
    ],
  },
  'opora-pocas-liecby': {
    headline: ['Aj ja teraz potrebujem niekoho, o koho sa opriem.', 'I já teď potřebuji někoho, o koho se opřu.'],
    paragraphs: [['Počas liečby môže byť veľa pozornosti venovanej tomu, čo treba zvládnuť. So mnou môžeš hovoriť aj o tom, ako sa v tom cítiš ty — o obavách, vzťahoch aj o tom, čo ti pomáha niesť bežný deň.', 'Během léčby může být hodně pozornosti věnováno tomu, co je potřeba zvládnout. Se mnou můžeš mluvit i o tom, jak se v tom cítíš ty — o obavách, vztazích i o tom, co ti pomáhá zvládat běžný den.']],
  },
  'vypni-hlavu': {
    headline: ['V hlave mi ide stále to isté.', 'V hlavě mi běží pořád to samé.'],
    paragraphs: [['Vraciaš sa k rovnakým myšlienkam a ťažko sa od nich odpútavaš? Dajme im priestor v rozhovore. Možno práve pri ich vyslovení uvidíš niečo, čo ti doteraz unikalo.', 'Vracíš se ke stejným myšlenkám a těžko se od nich odpoutáváš? Dejme jim prostor v rozhovoru. Možná právě při jejich vyslovení uvidíš něco, co ti dosud unikalo.']],
  },
  'mentalny-trening': {
    headline: ['Viem, čo dokážem. Pod tlakom sa mi to však stráca.', 'Vím, co dokážu. Pod tlakem se mi to ale ztrácí.'],
    paragraphs: [['Na tréningu, pri výkone alebo v dôležitej chvíli. Porozprávajme sa o tom, čo sa vtedy v tebe deje a čo by ti pomohlo viac sa oprieť o svoje schopnosti.', 'Na tréninku, při výkonu nebo v důležité chvíli. Popovídejme si o tom, co se v tobě tehdy děje a co by ti pomohlo více se opřít o své schopnosti.']],
  },
  'relaxacia': {
    headline: ['Chcem na chvíľu povoliť a vydýchnuť si.', 'Chci na chvíli povolit a vydechnout si.'],
    paragraphs: [['Cítiš, že potrebuješ priestor na uvoľnenie? Pri tomto stretnutí ťa budem sprevádzať riadenou relaxáciou a hypnózou. Jej priebeh si najprv spolu vysvetlíme.', 'Cítíš, že potřebuješ prostor pro uvolnění? Při tomto setkání tě budu provázet řízenou relaxací a hypnózou. Její průběh si nejprve společně vysvětlíme.']],
  },
  'individualny-coaching': {
    headline: ['Takto už pokračovať nechcem. Ale ako inak?', 'Takhle už pokračovat nechci. Ale jak jinak?'],
    paragraphs: [['Rozhodnutie, zmena alebo pocit, že stojíš na mieste. Povedz mi, čo sa v tvojom živote deje. Môžeme spolu hľadať cestu, ktorá bude dávať zmysel tebe.', 'Rozhodnutí, změna nebo pocit, že stojíš na místě. Řekni mi, co se ve tvém životě děje. Můžeme společně hledat cestu, která bude dávat smysl tobě.']],
  },
  'zvladaj-stres': {
    headline: ['Je toho na mňa priveľa.', 'Je toho na mě příliš.'],
    paragraphs: [['Povinnosti pribúdajú a na seba ti zostáva čoraz menej priestoru? Poďme sa porozprávať o tom, čo nesieš, čo potrebuješ a kde môžeš začať niečo meniť.', 'Povinnosti přibývají a na sebe ti zbývá stále méně prostoru? Pojďme si popovídat o tom, co neseš, co potřebuješ a kde můžeš začít něco měnit.']],
  },
};

export default function HomeTopicCards({ settings }: { settings: BookingSettings }) {
  const locale = settings.locale;
  const text = (value: LocalizedText) => value[locale === 'cs' ? 1 : 0];
  const more = text(['Viac o tejto téme', 'Více o tomto tématu']);

  return <div className="client-services client-topic-grid home-service-grid home-topic-cards">
    {settings.services.map(service => {
      const voice = topicVoices[service.id];
      if (!service.active || !voice) return null;
      const href = localizedPath(`/sluzby/${service.id}`, locale);
      const photo = servicePhoto(service.id);
      return <article className="client-card client-topic-card" key={service.id}>
        {photo && <Link className="client-topic-photo" href={href} aria-label={`${more}: ${service.name}`}><Image src={`/services/${photo.image}.webp`} alt={photo.imageAlt} width={720} height={405} sizes="(max-width:760px) 100vw, 50vw" /></Link>}
        <div className="client-topic-body">
          <p className="home-topic-name">{service.name}</p>
          <h3><Link href={href}>„{text(voice.headline)}“</Link></h3>
          {voice.paragraphs.map((paragraph, index) => <p key={`${service.id}-${index}`}>{text(paragraph)}</p>)}
          <p className="home-service-action"><Link className="personal-text-link" href={href} aria-label={`${more}: ${service.name}`}>{more} <span aria-hidden="true">↗</span></Link></p>
        </div>
      </article>;
    })}
  </div>;
}
